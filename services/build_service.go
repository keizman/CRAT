package services

import (
	"encoding/json"
	"fmt"
	"time"

	"crat/config"
	"crat/models"

	"gorm.io/gorm"
)

type BuildService struct{}

func NewBuildService() *BuildService {
	return &BuildService{}
}

// CreateBuildInfo 创建构建信息
func (s *BuildService) CreateBuildInfo(buildInfo *models.BuildInfo) error {
	return config.DB.Create(buildInfo).Error
}

// GetBuildInfoList 获取构建信息列表
func (s *BuildService) GetBuildInfoList(jobName string, limit, offset int) ([]models.BuildInfo, int64, error) {
	var builds []models.BuildInfo
	var total int64

	query := config.DB.Model(&models.BuildInfo{})

	if jobName != "" {
		query = query.Where("job_name = ?", jobName)
	}

	// 获取总数
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 获取分页数据
	err := query.Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&builds).Error

	return builds, total, err
}

// GetBuildInfoByJobName 根据Job名称获取构建信息列表
func (s *BuildService) GetBuildInfoByJobName(jobName string) ([]models.BuildInfo, error) {
	var builds []models.BuildInfo
	err := config.DB.Where("job_name = ?", jobName).
		Order("created_at DESC").
		Find(&builds).Error
	return builds, err
}

// GetBuildInfoByID 根据ID获取构建信息
func (s *BuildService) GetBuildInfoByID(id uint) (*models.BuildInfo, error) {
	var build models.BuildInfo
	err := config.DB.First(&build, id).Error
	if err != nil {
		return nil, err
	}
	return &build, nil
}

// ProcessJenkinsWebhook 处理Jenkins Webhook数据
func (s *BuildService) ProcessJenkinsWebhook(data map[string]interface{}) error {
	// 提取必要字段
	jobName, ok := data["JOB_NAME"].(string)
	if !ok || jobName == "" {
		return fmt.Errorf("JOB_NAME is required")
	}
	buildNumberFloat, ok := data["BUILD_NUMBER"].(float64)
	if !ok {
		// 尝试字符串类型
		if _, ok := data["BUILD_NUMBER"].(string); !ok {
			return fmt.Errorf("BUILD_NUMBER is required")
		}
		// 这里可以添加字符串到数字的转换逻辑
		buildNumberFloat = 0 // 临时处理
	}

	packagePath, ok := data["PACKAGE_PATH"].(string)
	if !ok || packagePath == "" {
		return fmt.Errorf("PACKAGE_PATH is required")
	}

	buildUser, _ := data["BUILD_USER"].(string)
	if buildUser == "" {
		buildUser = "None"
	}

	// 将原始数据序列化为JSON
	rawDataBytes, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal raw data: %v", err)
	}

	// 创建构建信息记录
	buildInfo := &models.BuildInfo{
		JobName:     jobName,
		BuildNumber: int(buildNumberFloat),
		PackagePath: packagePath,
		BuildUser:   buildUser,
		CreatedAt:   time.Now(),
		RawData:     rawDataBytes,
	}

	return s.CreateBuildInfo(buildInfo)
}

// GetJobNames 获取所有Job名称列表
func (s *BuildService) GetJobNames() ([]string, error) {
	var jobNames []string
	err := config.DB.Model(&models.BuildInfo{}).
		Distinct("job_name").
		Pluck("job_name", &jobNames).Error
	return jobNames, err
}

// GetLatestBuildByJobName 获取指定Job的最新构建
func (s *BuildService) GetLatestBuildByJobName(jobName string) (*models.BuildInfo, error) {
	var build models.BuildInfo
	err := config.DB.Where("job_name = ?", jobName).
		Order("created_at DESC").
		First(&build).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &build, nil
}
