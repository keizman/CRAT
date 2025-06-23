package services

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"crat/config"
	"crat/models"
)

type DeployTestService struct {
	buildService        *BuildService
	httpClient          *HTTPClient
	notificationService *NotificationService
	systemUtils         *SystemUtils
}

func NewDeployTestService() *DeployTestService {
	return &DeployTestService{
		buildService:        NewBuildService(),
		httpClient:          NewHTTPClient(),
		notificationService: NewNotificationService(),
		systemUtils:         NewSystemUtils(),
	}
}

// TriggerDeployTest 触发部署测试
func (s *DeployTestService) TriggerDeployTest(testItemID, buildInfoID uint, triggeredBy string, parameterSetID *uint) (*models.DeployTestRun, error) {
	// 获取测试项和构建信息
	var testItem models.TestItem
	if err := config.DB.First(&testItem, testItemID).Error; err != nil {
		return nil, fmt.Errorf("failed to get test item: %v", err)
	}

	buildInfo, err := s.buildService.GetBuildInfoByID(buildInfoID)
	if err != nil {
		return nil, fmt.Errorf("failed to get build info: %v", err)
	}

	// 创建部署测试运行记录
	deployTestRun := &models.DeployTestRun{
		TestItemID:     testItemID,
		BuildInfoID:    buildInfoID,
		TriggeredBy:    triggeredBy,
		ParameterSetID: parameterSetID,
		Status:         models.DeployTestStatusPending,
		MaxQueryHours:  3,  // 默认3小时
		QueryInterval:  60, // 默认60秒
		QueryTimeout:   30, // 默认30秒
		StartedAt:      time.Now(),
		Steps:          json.RawMessage("[]"),
	}

	if err := config.DB.Create(deployTestRun).Error; err != nil {
		return nil, fmt.Errorf("failed to create deploy test run: %v", err)
	}
	// 异步执行部署测试流程
	go s.executeDeployTest(deployTestRun, &testItem, buildInfo)

	return deployTestRun, nil
}

// executeDeployTest 执行完整的部署测试流程
func (s *DeployTestService) executeDeployTest(deployTestRun *models.DeployTestRun, testItem *models.TestItem, buildInfo *models.BuildInfo) {
	log.Printf("Starting deploy test execution for run ID %d", deployTestRun.ID)

	defer func() {
		if r := recover(); r != nil {
			log.Printf("Deploy test execution panic: %v", r)
			s.updateDeployTestStatus(deployTestRun.ID, models.DeployTestStatusFailed, fmt.Sprintf("Panic occurred: %v", r))
		}
	}()

	// 步骤1: 下载文件
	if err := s.downloadPackage(deployTestRun, testItem, buildInfo); err != nil {
		log.Printf("Download failed for run ID %d: %v", deployTestRun.ID, err)
		s.updateDeployTestStatus(deployTestRun.ID, models.DeployTestStatusFailed, fmt.Sprintf("Download failed: %v", err))
		return
	}

	// 步骤2: 发送部署测试请求
	if err := s.triggerExternalTest(deployTestRun, testItem, buildInfo); err != nil {
		log.Printf("Trigger test failed for run ID %d: %v", deployTestRun.ID, err)
		s.updateDeployTestStatus(deployTestRun.ID, models.DeployTestStatusFailed, fmt.Sprintf("Trigger test failed: %v", err))
		return
	}

	// 步骤3: 监控测试状态
	if err := s.monitorTestProgress(deployTestRun); err != nil {
		s.updateDeployTestStatus(deployTestRun.ID, models.DeployTestStatusFailed, fmt.Sprintf("Monitor failed: %v", err))
		return
	}

	// 步骤4: 发送通知
	s.sendNotification(deployTestRun, testItem, buildInfo)

	log.Printf("Deploy test execution completed for run ID %d", deployTestRun.ID)
}

// downloadPackage 下载包文件到本地
func (s *DeployTestService) downloadPackage(deployTestRun *models.DeployTestRun, testItem *models.TestItem, buildInfo *models.BuildInfo) error {
	s.updateDeployTestStatus(deployTestRun.ID, models.DeployTestStatusDownloading, "")
	s.addStep(deployTestRun.ID, models.StepDownload, "RUNNING", "Starting package download", "")
	// 获取系统设置
	settings, err := s.systemUtils.GetSystemSettings()
	if err != nil {
		s.addStep(deployTestRun.ID, models.StepDownload, "FAILED", "", fmt.Sprintf("Failed to get system settings: %v", err))
		return err
	}

	// 构建下载URL
	downloadBaseURL := settings["package_download_base_url"]
	if !strings.HasSuffix(downloadBaseURL, "/") {
		downloadBaseURL += "/"
	}

	// 从 package_path 构建完整的下载URL
	// 例如: package_path = "CDN/Core/20240626-story_container-c54239edb10ebf9266c4b97df0418e3b181e6fd6/"
	packageDirURL := downloadBaseURL + buildInfo.PackagePath

	// 获取目录下的文件列表，找到对应的包文件
	packageFileName, err := s.findPackageFile(packageDirURL, testItem.Name)
	if err != nil {
		s.addStep(deployTestRun.ID, models.StepDownload, "FAILED", "", fmt.Sprintf("Failed to find package file: %v", err))
		return err
	}

	downloadURL := packageDirURL + packageFileName

	// 设置本地下载路径
	downloadDir := "/tmp"
	if _, err := os.Stat(downloadDir); os.IsNotExist(err) {
		if err := os.MkdirAll(downloadDir, 0755); err != nil {
			s.addStep(deployTestRun.ID, models.StepDownload, "FAILED", "", fmt.Sprintf("Failed to create download directory: %v", err))
			return err
		}
	}

	downloadPath := filepath.Join(downloadDir, packageFileName)

	// 记录下载开始
	log.Printf("Starting download for run ID %d:", deployTestRun.ID)
	log.Printf("  Download URL: %s", downloadURL)
	log.Printf("  Download Path: %s", downloadPath)

	// 下载文件
	if err := s.downloadFile(downloadURL, downloadPath); err != nil {
		log.Printf("Download failed for run ID %d: %v", deployTestRun.ID, err)
		s.addStep(deployTestRun.ID, models.StepDownload, "FAILED", "", fmt.Sprintf("Failed to download file: %v", err))
		return err
	}

	// 验证文件存在且有内容
	fileInfo, err := os.Stat(downloadPath)
	if os.IsNotExist(err) {
		log.Printf("Downloaded file not found for run ID %d: %s", deployTestRun.ID, downloadPath)
		s.addStep(deployTestRun.ID, models.StepDownload, "FAILED", "", "Downloaded file not found")
		return fmt.Errorf("downloaded file not found: %s", downloadPath)
	}
	if err != nil {
		log.Printf("Error checking downloaded file for run ID %d: %v", deployTestRun.ID, err)
		s.addStep(deployTestRun.ID, models.StepDownload, "FAILED", "", fmt.Sprintf("Error checking downloaded file: %v", err))
		return err
	}

	// 验证文件大小不为零
	if fileInfo.Size() == 0 {
		log.Printf("Downloaded file is empty for run ID %d: %s", deployTestRun.ID, downloadPath)
		s.addStep(deployTestRun.ID, models.StepDownload, "FAILED", "", "Downloaded file is empty")
		return fmt.Errorf("downloaded file is empty: %s", downloadPath)
	}

	log.Printf("Download successful for run ID %d: %s (size: %d bytes)", deployTestRun.ID, downloadPath, fileInfo.Size())

	// 更新记录
	config.DB.Model(&models.DeployTestRun{}).Where("id = ?", deployTestRun.ID).Updates(map[string]interface{}{
		"download_url":  downloadURL,
		"download_path": downloadPath,
		"status":        models.DeployTestStatusDownloaded,
	})

	s.addStep(deployTestRun.ID, models.StepDownload, "COMPLETED", fmt.Sprintf("Package downloaded to %s", downloadPath), "")
	return nil
}

// findPackageFile 从目录URL中找到对应的包文件
func (s *DeployTestService) findPackageFile(dirURL, testItemName string) (string, error) {
	// 发送HTTP请求获取目录列表
	resp, err := http.Get(dirURL)
	if err != nil {
		return "", fmt.Errorf("failed to get directory listing: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read directory listing: %v", err)
	}

	content := string(body)

	// 根据需求实现新的包文件查找逻辑
	// 使用正则表达式匹配包含测试项名称的href链接
	testItemLower := strings.ToLower(testItemName)
	pattern := fmt.Sprintf(`href="([^"]*%s[^"]*)"`, testItemLower)
	re := regexp.MustCompile(pattern)
	matches := re.FindAllStringSubmatch(content, -1)

	var candidates []string
	for _, match := range matches {
		if len(match) > 1 {
			candidates = append(candidates, match[1])
		}
	}

	if len(candidates) == 0 {
		return "", fmt.Errorf("no package files found for test item: %s", testItemName)
	}

	// 如果找到多个候选文件，优先选择包含"release"的文件
	var selectedFile string
	for _, candidate := range candidates {
		if strings.Contains(strings.ToLower(candidate), "release") {
			selectedFile = candidate
			break
		}
	}

	// 如果没有找到包含"release"的文件，选择第一个候选文件
	if selectedFile == "" {
		selectedFile = candidates[0]
	}

	// 验证文件是否以.tar.gz或.tgz结尾
	selectedFileLower := strings.ToLower(selectedFile)
	if !strings.HasSuffix(selectedFileLower, ".tar.gz") && !strings.HasSuffix(selectedFileLower, ".tgz") {
		return "", fmt.Errorf("selected file is not a tar.gz or tgz file: %s", selectedFile)
	}

	return selectedFile, nil
}

// downloadFile 下载文件到本地
func (s *DeployTestService) downloadFile(url, filepath string) error {
	// 创建HTTP客户端，设置超时
	client := &http.Client{
		Timeout: 10 * time.Minute, // 10分钟超时
	}

	resp, err := client.Get(url)
	if err != nil {
		return fmt.Errorf("HTTP request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to download file, status code: %d, status: %s", resp.StatusCode, resp.Status)
	}

	// 检查Content-Length
	if resp.ContentLength == 0 {
		return fmt.Errorf("server returned empty content (Content-Length: 0)")
	}

	out, err := os.Create(filepath)
	if err != nil {
		return fmt.Errorf("failed to create file: %v", err)
	}
	defer out.Close()

	// 复制内容并检查写入的字节数
	written, err := io.Copy(out, resp.Body)
	if err != nil {
		return fmt.Errorf("failed to write file content: %v", err)
	}

	if written == 0 {
		return fmt.Errorf("no data written to file")
	}

	// 确保文件内容被写入磁盘
	if err := out.Sync(); err != nil {
		return fmt.Errorf("failed to sync file to disk: %v", err)
	}

	return nil
}

// triggerExternalTest 触发外部测试服务器的测试
func (s *DeployTestService) triggerExternalTest(deployTestRun *models.DeployTestRun, testItem *models.TestItem, buildInfo *models.BuildInfo) error {
	s.updateDeployTestStatus(deployTestRun.ID, models.DeployTestStatusTesting, "")
	s.addStep(deployTestRun.ID, models.StepTest, "RUNNING", "Triggering external test", "")

	// 从数据库重新加载最新数据以获取下载路径
	if err := config.DB.First(deployTestRun, deployTestRun.ID).Error; err != nil {
		s.addStep(deployTestRun.ID, models.StepTest, "FAILED", "", fmt.Sprintf("Failed to reload deploy test run: %v", err))
		return err
	}

	// 验证下载路径不为空
	if deployTestRun.DownloadPath == "" {
		err := fmt.Errorf("download path is empty, package download failed")
		s.addStep(deployTestRun.ID, models.StepTest, "FAILED", "", err.Error())
		return err
	}

	// 验证下载的文件确实存在
	if _, err := os.Stat(deployTestRun.DownloadPath); os.IsNotExist(err) {
		err := fmt.Errorf("downloaded package file not found at path: %s", deployTestRun.DownloadPath)
		s.addStep(deployTestRun.ID, models.StepTest, "FAILED", "", err.Error())
		return err
	}

	// 获取系统设置
	settings, err := s.systemUtils.GetSystemSettings()
	if err != nil {
		s.addStep(deployTestRun.ID, models.StepTest, "FAILED", "", fmt.Sprintf("Failed to get system settings: %v", err))
		return err
	}

	// 获取参数配置
	params, err := s.getTestParameters(deployTestRun.ParameterSetID, testItem)
	if err != nil {
		s.addStep(deployTestRun.ID, models.StepTest, "FAILED", "", fmt.Sprintf("Failed to get test parameters: %v", err))
		return err
	}

	// 构建请求URL
	testServerURL := settings["external_test_server_url"]
	if !strings.HasSuffix(testServerURL, "/") {
		testServerURL += "/"
	}
	// requestURL := testServerURL + "api/deploy_and_test_mock"
	requestURL := testServerURL + "api/deploy_and_test"

	// 构建请求体
	requestBody := map[string]interface{}{
		"service_name":   params.ServiceName,
		"package_path":   deployTestRun.DownloadPath,
		"install_dir":    params.InstallDir,
		"upgrade_type":   params.UpgradeType,
		"test_path":      params.TestPath,
		"base_url":       params.BaseURL,
		"report_keyword": params.ReportKeyword,
	}

	// 记录发送的请求体
	log.Printf("Sending test request for run ID %d:", deployTestRun.ID)
	log.Printf("  service_name: %s", params.ServiceName)
	log.Printf("  package_path: %s", deployTestRun.DownloadPath)
	log.Printf("  install_dir: %s", params.InstallDir)

	// 发送请求
	response, err := s.httpClient.SendRequest("POST", requestURL, map[string]string{
		"Content-Type": "application/json",
	}, requestBody, 300)

	if err != nil {
		s.addStep(deployTestRun.ID, models.StepTest, "FAILED", "", fmt.Sprintf("HTTP request failed: %v", err))
		return err
	}

	if response.StatusCode != 200 {
		s.addStep(deployTestRun.ID, models.StepTest, "FAILED", "", fmt.Sprintf("HTTP status code: %d, body: %s", response.StatusCode, response.Body))
		return fmt.Errorf("unexpected status code: %d", response.StatusCode)
	}

	// 解析响应获取task_id
	var respData map[string]interface{}
	if err := json.Unmarshal([]byte(response.Body), &respData); err != nil {
		s.addStep(deployTestRun.ID, models.StepTest, "FAILED", "", fmt.Sprintf("Failed to parse response: %v", err))
		return err
	}

	taskID, ok := respData["task_id"].(string)
	if !ok {
		s.addStep(deployTestRun.ID, models.StepTest, "FAILED", "", "No task_id in response")
		return fmt.Errorf("no task_id in response")
	}

	// 更新记录
	config.DB.Model(&models.DeployTestRun{}).Where("id = ?", deployTestRun.ID).Update("task_id", taskID)

	s.addStep(deployTestRun.ID, models.StepTest, "COMPLETED", fmt.Sprintf("Test triggered, task_id: %s", taskID), "")
	return nil
}

// monitorTestProgress 监控测试进度
func (s *DeployTestService) monitorTestProgress(deployTestRun *models.DeployTestRun) error {
	s.updateDeployTestStatus(deployTestRun.ID, models.DeployTestStatusMonitoring, "")
	s.addStep(deployTestRun.ID, models.StepMonitor, "RUNNING", "Monitoring test progress", "")

	// 从数据库重新加载以获取最新的task_id
	if err := config.DB.First(deployTestRun, deployTestRun.ID).Error; err != nil {
		return err
	}

	if deployTestRun.TaskID == "" {
		err := fmt.Errorf("no task_id available")
		s.addStep(deployTestRun.ID, models.StepMonitor, "FAILED", "", err.Error())
		return err
	}

	// 获取测试项信息以检查test_path
	var testItem models.TestItem
	if err := config.DB.First(&testItem, deployTestRun.TestItemID).Error; err != nil {
		return err
	}

	// 获取测试参数以检查test_path
	params, err := s.getTestParameters(deployTestRun.ParameterSetID, &testItem)
	if err != nil {
		s.addStep(deployTestRun.ID, models.StepMonitor, "FAILED", "", fmt.Sprintf("Failed to get test parameters: %v", err))
		return err
	}
	// 获取系统设置
	settings, err := s.systemUtils.GetSystemSettings()
	if err != nil {
		s.addStep(deployTestRun.ID, models.StepMonitor, "FAILED", "", fmt.Sprintf("Failed to get system settings: %v", err))
		return err
	}

	testServerURL := settings["external_test_server_url"]
	if !strings.HasSuffix(testServerURL, "/") {
		testServerURL += "/"
	}
	statusURL := fmt.Sprintf("%sapi/tasks/%s", testServerURL, deployTestRun.TaskID)

	// 设置监控参数
	maxDuration := time.Duration(deployTestRun.MaxQueryHours) * time.Hour
	queryInterval := time.Duration(deployTestRun.QueryInterval) * time.Second
	queryTimeout := deployTestRun.QueryTimeout

	startTime := time.Now()

	for {
		// 检查是否超时
		if time.Since(startTime) > maxDuration {
			err := fmt.Errorf("monitoring timeout after %d hours", deployTestRun.MaxQueryHours)
			s.addStep(deployTestRun.ID, models.StepMonitor, "FAILED", "", err.Error())
			return err
		}

		// 查询任务状态
		response, err := s.httpClient.SendRequest("GET", statusURL, nil, nil, queryTimeout)
		if err != nil {
			log.Printf("Failed to query task status: %v", err)
			time.Sleep(queryInterval)
			continue
		}

		if response.StatusCode != 200 {
			log.Printf("Unexpected status code when querying task: %d", response.StatusCode)
			time.Sleep(queryInterval)
			continue
		}

		// 解析响应
		var taskStatus map[string]interface{}
		if err := json.Unmarshal([]byte(response.Body), &taskStatus); err != nil {
			log.Printf("Failed to parse task status response: %v", err)
			time.Sleep(queryInterval)
			continue
		}

		status, _ := taskStatus["status"].(string)
		log.Printf("Task %s status: %s", deployTestRun.TaskID, status)

		switch status {
		case "completed":
			// 检查是否为仅部署模式 (test_path == "deploy")
			isDeployOnly := params.TestPath == "deploy"
			
			var reportURL string
			if result, ok := taskStatus["result"].(map[string]interface{}); ok {
				if testResult, ok := result["test"].(map[string]interface{}); ok {
					if url, ok := testResult["report_url"].(string); ok && url != "None" {
						reportURL = url
					}
				}
			}

			// 存储原始响应数据
			responseRawData, _ := json.Marshal(taskStatus)

			// 根据是否为仅部署模式选择不同的状态
			var finalStatus string
			var stepMessage string
			if isDeployOnly {
				finalStatus = models.DeployTestStatusDeployComplete
				stepMessage = "Deploy completed successfully"
			} else {
				finalStatus = models.DeployTestStatusCompleted
				stepMessage = fmt.Sprintf("Test completed, report URL: %s", reportURL)
			}

			// 更新记录
			updates := map[string]interface{}{
				"status":            finalStatus,
				"report_url":        reportURL,
				"response_raw_data": responseRawData,
				"finished_at":       time.Now(),
			}
			config.DB.Model(&models.DeployTestRun{}).Where("id = ?", deployTestRun.ID).Updates(updates)

			s.addStep(deployTestRun.ID, models.StepMonitor, "COMPLETED", stepMessage, "")
			return nil

		case "failed":
			errorMsg := ""
			if errField, ok := taskStatus["error"].(string); ok {
				errorMsg = errField
			}

			updates := map[string]interface{}{
				"status":        models.DeployTestStatusFailed,
				"error_message": errorMsg,
				"finished_at":   time.Now(),
			}
			config.DB.Model(&models.DeployTestRun{}).Where("id = ?", deployTestRun.ID).Updates(updates)

			err := fmt.Errorf("external test failed: %s", errorMsg)
			s.addStep(deployTestRun.ID, models.StepMonitor, "FAILED", "", err.Error())
			return err

		case "pending", "running":
			// 继续等待
			time.Sleep(queryInterval)

		default:
			log.Printf("Unknown task status: %s", status)
			time.Sleep(queryInterval)
		}
	}
}

// sendNotification 发送通知
func (s *DeployTestService) sendNotification(deployTestRun *models.DeployTestRun, testItem *models.TestItem, buildInfo *models.BuildInfo) {
	s.addStep(deployTestRun.ID, models.StepNotify, "RUNNING", "Sending notification", "")

	// 从数据库重新加载以获取最新状态
	if err := config.DB.First(deployTestRun, deployTestRun.ID).Error; err != nil {
		s.addStep(deployTestRun.ID, models.StepNotify, "FAILED", "", fmt.Sprintf("Failed to reload deploy test run: %v", err))
		return
	}

	// 检查是否为仅部署模式，仅部署模式不发送邮件通知
	if deployTestRun.Status == models.DeployTestStatusDeployComplete {
		s.addStep(deployTestRun.ID, models.StepNotify, "COMPLETED", "Deploy complete - no notification required", "")
		return
	}

	if !testItem.NotificationEnabled {
		s.addStep(deployTestRun.ID, models.StepNotify, "COMPLETED", "Notification disabled for this test item", "")
		return
	}

	if deployTestRun.Status == models.DeployTestStatusCompleted {
		if err := s.notificationService.SendTestSuccessNotification(deployTestRun.TriggeredBy, testItem.Name, buildInfo, deployTestRun.ReportURL); err != nil {
			s.addStep(deployTestRun.ID, models.StepNotify, "FAILED", "", fmt.Sprintf("Failed to send success notification: %v", err))
		} else {
			s.addStep(deployTestRun.ID, models.StepNotify, "COMPLETED", "Success notification sent", "")
		}
	} else {
		buildInfoStr := fmt.Sprintf("%s #%d", buildInfo.JobName, buildInfo.BuildNumber)
		if err := s.notificationService.SendTestFailureNotification(deployTestRun.TriggeredBy, testItem.Name, buildInfoStr, deployTestRun.ErrorMessage); err != nil {
			s.addStep(deployTestRun.ID, models.StepNotify, "FAILED", "", fmt.Sprintf("Failed to send failure notification: %v", err))
		} else {
			s.addStep(deployTestRun.ID, models.StepNotify, "COMPLETED", "Failure notification sent", "")
		}
	}
}

// getTestParameters 获取测试参数配置
func (s *DeployTestService) getTestParameters(parameterSetID *uint, testItem *models.TestItem) (*models.TestParameters, error) {
	var parameterSet models.ParameterSet

	if parameterSetID != nil {
		// 使用指定的参数集
		if err := config.DB.First(&parameterSet, *parameterSetID).Error; err != nil {
			return nil, fmt.Errorf("failed to get parameter set: %v", err)
		}
	} else if testItem.AssociatedParameterSetID != nil {
		// 使用测试项关联的参数集
		if err := config.DB.First(&parameterSet, *testItem.AssociatedParameterSetID).Error; err != nil {
			return nil, fmt.Errorf("failed to get associated parameter set: %v", err)
		}
	} else {
		// 使用默认参数集
		if err := config.DB.Where("name = ?", "default").First(&parameterSet).Error; err != nil {
			return nil, fmt.Errorf("failed to get default parameter set: %v", err)
		}
	}

	params, err := parameterSet.GetParameters()
	if err != nil {
		return nil, fmt.Errorf("failed to parse parameters: %v", err)
	}

	// 如果参数中的service_name为空，使用测试项名称
	if params.ServiceName == "" {
		params.ServiceName = testItem.Name
	}

	// 如果report_keyword为空，使用测试项名称
	if params.ReportKeyword == "" {
		params.ReportKeyword = testItem.Name
	}

	return params, nil
}

// getInstallDir 根据服务名称获取安装目录
func (s *DeployTestService) getInstallDir(serviceName string) string {
	serviceName = strings.ToUpper(serviceName)
	switch serviceName {
	case "CDS":
		return "/opt/wisecloud/cdn/vod_cds/"
	case "SDS":
		return "/opt/wisecloud/cdn/live_cds/"
	case "SSGAGENT":
		return "/opt/wisecloud/cdn/ssgagent_autotest"
	case "SLS":
		return "/opt/wisecloud/cdn/sls_autotest"
	default:
		return "/opt/wisecloud/cdn/" + strings.ToLower(serviceName)
	}
}

// updateDeployTestStatus 更新部署测试状态
func (s *DeployTestService) updateDeployTestStatus(runID uint, status, errorMsg string) {
	updates := map[string]interface{}{
		"status": status,
	}

	if status == models.DeployTestStatusCompleted || status == models.DeployTestStatusFailed {
		now := time.Now()
		updates["finished_at"] = &now
	}

	if errorMsg != "" {
		updates["error_message"] = errorMsg
	}

	config.DB.Model(&models.DeployTestRun{}).Where("id = ?", runID).Updates(updates)
}

// addStep 添加步骤记录
func (s *DeployTestService) addStep(runID uint, stepName, status, details, errorMsg string) {
	var deployTestRun models.DeployTestRun
	if err := config.DB.First(&deployTestRun, runID).Error; err != nil {
		log.Printf("Failed to load deploy test run: %v", err)
		return
	}

	var steps []models.DeployTestStep
	if len(deployTestRun.Steps) > 0 {
		if err := json.Unmarshal(deployTestRun.Steps, &steps); err != nil {
			log.Printf("Failed to unmarshal steps: %v", err)
			steps = []models.DeployTestStep{}
		}
	}

	// 查找现有步骤或创建新步骤
	var step *models.DeployTestStep
	for i := range steps {
		if steps[i].Name == stepName {
			step = &steps[i]
			break
		}
	}

	if step == nil {
		// 创建新步骤
		newStep := models.DeployTestStep{
			Name:      stepName,
			Status:    status,
			StartTime: time.Now(),
		}
		if status == "COMPLETED" || status == "FAILED" {
			now := time.Now()
			newStep.EndTime = &now
		}
		if details != "" {
			newStep.Details = details
		}
		if errorMsg != "" {
			newStep.Error = errorMsg
		}
		steps = append(steps, newStep)
	} else {
		// 更新现有步骤
		step.Status = status
		if status == "COMPLETED" || status == "FAILED" {
			now := time.Now()
			step.EndTime = &now
		}
		if details != "" {
			step.Details = details
		}
		if errorMsg != "" {
			step.Error = errorMsg
		}
	}

	// 保存更新后的步骤
	stepsJSON, err := json.Marshal(steps)
	if err != nil {
		log.Printf("Failed to marshal steps: %v", err)
		return
	}

	config.DB.Model(&models.DeployTestRun{}).Where("id = ?", runID).Update("steps", stepsJSON)
}

// GetDeployTestRuns 获取部署测试运行列表
func (s *DeployTestService) GetDeployTestRuns(testItemID uint, limit, offset int) ([]models.DeployTestRun, int64, error) {
	var runs []models.DeployTestRun
	var total int64

	query := config.DB.Model(&models.DeployTestRun{}).
		Preload("TestItem").
		Preload("BuildInfo")

	if testItemID > 0 {
		query = query.Where("test_item_id = ?", testItemID)
	}

	// 获取总数
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 获取分页数据
	err := query.Order("started_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&runs).Error

	return runs, total, err
}

// GetDeployTestRunByID 根据ID获取部署测试运行
func (s *DeployTestService) GetDeployTestRunByID(id uint) (*models.DeployTestRun, error) {
	var run models.DeployTestRun
	err := config.DB.Preload("TestItem").Preload("BuildInfo").First(&run, id).Error
	if err != nil {
		return nil, err
	}
	return &run, nil
}

// ClearDeployTestHistory 清理指定测试项的部署测试历史
func (s *DeployTestService) ClearDeployTestHistory(testItemID uint) (int64, error) {
	log.Printf("Clearing deploy test history for test item ID: %d", testItemID)

	// 检查测试项是否存在
	var testItem models.TestItem
	if err := config.DB.First(&testItem, testItemID).Error; err != nil {
		return 0, fmt.Errorf("test item not found: %v", err)
	}

	// 统计将要删除的记录数
	var count int64
	if err := config.DB.Model(&models.DeployTestRun{}).Where("test_item_id = ?", testItemID).Count(&count).Error; err != nil {
		return 0, fmt.Errorf("failed to count deploy test runs: %v", err)
	}

	if count == 0 {
		log.Printf("No deploy test runs found for test item ID: %d", testItemID)
		return 0, nil
	}

	// 删除所有相关的部署测试运行记录
	result := config.DB.Where("test_item_id = ?", testItemID).Delete(&models.DeployTestRun{})
	if result.Error != nil {
		return 0, fmt.Errorf("failed to clear deploy test history: %v", result.Error)
	}

	deletedCount := result.RowsAffected
	log.Printf("Successfully cleared %d deploy test runs for test item '%s' (ID: %d)", deletedCount, testItem.Name, testItemID)

	return deletedCount, nil
}
