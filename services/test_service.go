package services

import (
	"crat/config"
	"crat/models"
)

type TestService struct {
	buildService        *BuildService
	httpClient          *HTTPClient
	notificationService *NotificationService
	systemUtils         *SystemUtils
}

func NewTestService() *TestService {
	return &TestService{
		buildService:        NewBuildService(),
		httpClient:          NewHTTPClient(),
		notificationService: NewNotificationService(),
		systemUtils:         NewSystemUtils(),
	}
}

// CreateTestItem 创建测试项
func (s *TestService) CreateTestItem(testItem *models.TestItem) error {
	return config.DB.Create(testItem).Error
}

// GetTestItems 获取测试项列表
func (s *TestService) GetTestItems() ([]models.TestItem, error) {
	var testItems []models.TestItem
	err := config.DB.Find(&testItems).Error
	return testItems, err
}

// GetTestItemByID 根据ID获取测试项
func (s *TestService) GetTestItemByID(id uint) (*models.TestItem, error) {
	var testItem models.TestItem
	err := config.DB.First(&testItem, id).Error
	if err != nil {
		return nil, err
	}
	return &testItem, nil
}

// UpdateTestItem 更新测试项
func (s *TestService) UpdateTestItem(id uint, updates map[string]interface{}) error {
	return config.DB.Model(&models.TestItem{}).Where("id = ?", id).Updates(updates).Error
}

// DeleteTestItem 删除测试项
func (s *TestService) DeleteTestItem(id uint) error {
	return config.DB.Delete(&models.TestItem{}, id).Error
}

// TriggerTest 触发测试 - 重定向到部署测试服务
func (s *TestService) TriggerTest(testItemID, buildInfoID uint, triggeredBy string) (*models.DeployTestRun, error) {
	// 使用部署测试服务来处理测试触发
	deployTestService := NewDeployTestService()
	return deployTestService.TriggerDeployTest(testItemID, buildInfoID, triggeredBy)
}

// GetTestRuns 获取测试运行历史 - 重定向到部署测试运行
func (s *TestService) GetTestRuns(testItemID uint, limit, offset int) ([]models.DeployTestRun, int64, error) {
	var runs []models.DeployTestRun
	var total int64

	query := config.DB.Model(&models.DeployTestRun{}).
		Preload("BuildInfo").
		Where("test_item_id = ?", testItemID)

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

// GetTestRunByID 根据ID获取测试运行 - 重定向到部署测试运行
func (s *TestService) GetTestRunByID(id uint) (*models.DeployTestRun, error) {
	var run models.DeployTestRun
	err := config.DB.Preload("TestItem").Preload("BuildInfo").First(&run, id).Error
	if err != nil {
		return nil, err
	}
	return &run, nil
}
