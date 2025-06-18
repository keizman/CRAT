package services

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"crat/config"
	"crat/models"

	"gopkg.in/gomail.v2"
)

type NotificationService struct{}

// SummaryData represents the test report summary data
type SummaryData struct {
	ReportName string `json:"reportName"`
	Statistic  struct {
		Failed  int `json:"failed"`
		Broken  int `json:"broken"`
		Skipped int `json:"skipped"`
		Passed  int `json:"passed"`
		Unknown int `json:"unknown"`
		Total   int `json:"total"`
	} `json:"statistic"`
	Time struct {
		Start       int64 `json:"start"`
		Stop        int64 `json:"stop"`
		Duration    int64 `json:"duration"`
		MinDuration int64 `json:"minDuration"`
		MaxDuration int64 `json:"maxDuration"`
		SumDuration int64 `json:"sumDuration"`
	} `json:"time"`
}

func NewNotificationService() *NotificationService {
	return &NotificationService{}
}

// SendEmailNotification 发送邮件通知
func (n *NotificationService) SendEmailNotification(to, subject, body string) error {
	m := gomail.NewMessage()
	m.SetHeader("From", config.AppConfig.Email.Username)
	m.SetHeader("To", to)
	m.SetHeader("Subject", subject)
	m.SetBody("text/html", body)

	d := gomail.NewDialer(
		config.AppConfig.Email.Server,
		config.AppConfig.Email.Port,
		config.AppConfig.Email.Username,
		config.AppConfig.Email.Password,
	)

	return d.DialAndSend(m)
}

// SendTestSuccessNotification 发送测试成功通知
func (n *NotificationService) SendTestSuccessNotification(email, testName string, buildInfo *models.BuildInfo, reportURL string) error {
	subject := fmt.Sprintf("✅ 测试成功 - %s", testName)

	// 获取项目名称
	projectName := n.getProjectName()

	// 构建路径
	var buildPath string
	var setting models.SystemSetting
	if err := config.DB.Where("key = ?", "package_build_info_base_url").First(&setting).Error; err == nil && setting.Value != "" {
		buildPath = fmt.Sprintf("%s%s/%d", setting.Value, buildInfo.JobName, buildInfo.BuildNumber)
	} else {
		buildPath = fmt.Sprintf("http://192.168.1.199:8080/job/%s/%d", buildInfo.JobName, buildInfo.BuildNumber)
	}

	// 当前时间
	currentTime := time.Now().Format("2006-01-02 15:04:05")

	// 尝试获取summary数据
	var summaryHTML string
	if reportURL != "" {
		if summaryData, err := n.fetchSummaryData(reportURL); err == nil {
			summaryHTML = n.generateSummaryHTML(summaryData)
		} else {
			// 如果获取失败，记录错误但不影响邮件发送
			fmt.Printf("Warning: Failed to fetch summary data: %v\n", err)
		}
	}

	body := fmt.Sprintf(`
		<html>
		<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
			<div style="max-width: 600px; margin: 0 auto; padding: 20px;">
				<h2 style="color: #28a745;">🎉 测试执行成功</h2>
				<div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
					<p><strong>测试项目:</strong> %s</p>
					<p><strong>构建路径:</strong> <a href="%s" target="_blank" style="color: #007bff;">%s</a></p>
					<p><strong>执行时间:</strong> %s</p>
				</div>
				%s
				%s
				<hr style="margin: 20px 0;">
				<p style="color: #6c757d; font-size: 12px;">
					本邮件由 %s 自动发送，请勿回复。
				</p>
			</div>
		</body>
		</html>
	`, testName, buildPath, buildPath, currentTime, summaryHTML, getReportLink(reportURL), projectName)

	return n.SendEmailNotification(email, subject, body)
}

// SendTestFailureNotification 发送测试失败通知
func (n *NotificationService) SendTestFailureNotification(email, testName, buildInfo, errorMsg string) error {
	subject := fmt.Sprintf("❌ 测试失败 - %s", testName)

	body := fmt.Sprintf(`
		<html>
		<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
			<div style="max-width: 600px; margin: 0 auto; padding: 20px;">
				<h2 style="color: #dc3545;">❌ 测试执行失败</h2>
				<div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
					<p><strong>测试项目:</strong> %s</p>
					<p><strong>构建信息:</strong> %s</p>
					<p><strong>执行时间:</strong> %s</p>
				</div>
				<div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #dc3545;">
					<p><strong>错误信息:</strong></p>
					<pre style="white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 14px;">%s</pre>
				</div>
				<hr style="margin: 20px 0;">
				<p style="color: #6c757d; font-size: 12px;">
					本邮件由 CRAT 自动化测试平台自动发送，请勿回复。
				</p>
			</div>
		</body>
		</html>
	`, testName, buildInfo, "刚刚", errorMsg)

	return n.SendEmailNotification(email, subject, body)
}

func getReportLink(reportURL string) string {
	if reportURL != "" {
		return fmt.Sprintf(`
			<div style="text-align: center; margin: 20px 0;">
				<a href="%s" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
					查看完整测试报告
				</a>
			</div>
		`, reportURL)
	}
	return ""
}

// getProjectName 从系统设置获取项目名称
func (n *NotificationService) getProjectName() string {
	var setting models.SystemSetting
	if err := config.DB.Where("key = ?", "project_name").First(&setting).Error; err != nil {
		return "CRAT 自动化测试平台"
	}
	if setting.Value == "" {
		return "CRAT 自动化测试平台"
	}
	return setting.Value
}

// fetchSummaryData 从报告URL获取summary数据
func (n *NotificationService) fetchSummaryData(reportURL string) (*SummaryData, error) {
	if reportURL == "" {
		return nil, fmt.Errorf("report URL is empty")
	}

	// 构建summary.json的URL
	summaryURL := reportURL
	if !strings.HasSuffix(summaryURL, "/") {
		summaryURL += "/"
	}
	summaryURL += "widgets/summary.json"

	// 发送HTTP请求
	resp, err := http.Get(summaryURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch summary data: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP %d when fetching summary data", resp.StatusCode)
	}

	// 解析JSON数据
	var summaryData SummaryData
	if err := json.NewDecoder(resp.Body).Decode(&summaryData); err != nil {
		return nil, fmt.Errorf("failed to decode summary data: %v", err)
	}

	return &summaryData, nil
}

// generateSummaryHTML 生成summary数据的HTML展示
func (n *NotificationService) generateSummaryHTML(summaryData *SummaryData) string {
	if summaryData == nil {
		return ""
	}

	// 计算通过率
	passRate := 0.0
	if summaryData.Statistic.Total > 0 {
		passRate = float64(summaryData.Statistic.Passed) / float64(summaryData.Statistic.Total) * 100
	}

	// 格式化时间
	startTime := time.Unix(summaryData.Time.Start/1000, 0).Format("2006-01-02 15:04:05")
	stopTime := time.Unix(summaryData.Time.Stop/1000, 0).Format("2006-01-02 15:04:05")
	duration := formatDuration(summaryData.Time.Duration)

	return fmt.Sprintf(`
		<div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
			<h3 style="color: #28a745; margin-bottom: 15px;">📊 测试报告摘要</h3>
			
			<!-- 总体统计 -->
			<div style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 15px;">
				<div style="background: #d4edda; padding: 10px; border-radius: 5px; text-align: center; flex: 1; min-width: 80px;">
					<div style="font-size: 18px; font-weight: bold; color: #155724;">%d</div>
					<div style="font-size: 12px; color: #155724;">✅ 通过</div>
				</div>
				<div style="background: #f8d7da; padding: 10px; border-radius: 5px; text-align: center; flex: 1; min-width: 80px;">
					<div style="font-size: 18px; font-weight: bold; color: #721c24;">%d</div>
					<div style="font-size: 12px; color: #721c24;">❌ 失败</div>
				</div>
				<div style="background: #ffeaa7; padding: 10px; border-radius: 5px; text-align: center; flex: 1; min-width: 80px;">
					<div style="font-size: 18px; font-weight: bold; color: #856404;">%d</div>
					<div style="font-size: 12px; color: #856404;">⏭️ 跳过</div>
				</div>
				<div style="background: #fff3cd; padding: 10px; border-radius: 5px; text-align: center; flex: 1; min-width: 80px;">
					<div style="font-size: 18px; font-weight: bold; color: #856404;">%d</div>
					<div style="font-size: 12px; color: #856404;">⚠️ 中断</div>
				</div>
			</div>
			
			<!-- 汇总信息 -->
			<div style="background: #e7f3ff; padding: 15px; border-radius: 5px;">
				<div style="margin-bottom: 8px;"><strong>📈 通过率:</strong> %.1f%% (%d/%d)</div>
				<div style="margin-bottom: 8px;"><strong>⏰ 开始时间:</strong> %s</div>
				<div style="margin-bottom: 8px;"><strong>🏁 结束时间:</strong> %s</div>
				<div><strong>⏱️ 执行耗时:</strong> %s</div>
			</div>
		</div>
	`,
		summaryData.Statistic.Passed,
		summaryData.Statistic.Failed,
		summaryData.Statistic.Skipped,
		summaryData.Statistic.Broken,
		passRate,
		summaryData.Statistic.Passed,
		summaryData.Statistic.Total,
		startTime,
		stopTime,
		duration,
	)
}

// formatDuration 格式化毫秒为可读的时间格式
func formatDuration(ms int64) string {
	if ms < 1000 {
		return fmt.Sprintf("%dms", ms)
	}
	if ms < 60000 {
		return fmt.Sprintf("%.1fs", float64(ms)/1000)
	}
	if ms < 3600000 {
		return fmt.Sprintf("%.1fm", float64(ms)/60000)
	}
	return fmt.Sprintf("%.1fh", float64(ms)/3600000)
}
