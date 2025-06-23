package services

import (
	"encoding/json"
	"fmt"
	"strconv"
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
	var buildNumber int
	if buildNumberFloat, ok := data["BUILD_NUMBER"].(float64); ok {
		buildNumber = int(buildNumberFloat)
	} else if buildNumberStr, ok := data["BUILD_NUMBER"].(string); ok {
		var err error
		buildNumber, err = strconv.Atoi(buildNumberStr)
		if err != nil {
			return fmt.Errorf("invalid BUILD_NUMBER format: %v", err)
		}
	} else {
		return fmt.Errorf("BUILD_NUMBER is required")
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
		BuildNumber: buildNumber,
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
		Order("job_name ASC").
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

// AddJobName 添加Job名称（这个方法主要是为了前端的一致性，实际上Job名称是通过构建信息自动添加的）
func (s *BuildService) AddJobName(jobName string) error {
	// 由于Job名称是通过构建信息自动获取的，这里我们只做验证
	// 实际上，Job名称会在有真实构建信息时自动出现在列表中

	// 检查Job名称是否已存在
	var count int64
	err := config.DB.Model(&models.BuildInfo{}).
		Where("job_name = ?", jobName).
		Count(&count).Error

	if err != nil {
		return fmt.Errorf("failed to check job name existence: %v", err)
	}

	// 如果Job名称已经存在构建信息，返回成功
	if count > 0 {
		return nil
	}

	// 如果不存在，创建一个临时记录来标记这个Job名称
	// 注意：这个记录可能在后续有真实构建信息时被更新
	buildInfo := &models.BuildInfo{
		JobName:     jobName,
		BuildNumber: 0, // 使用0表示这是一个占位记录
		PackagePath: "",
		BuildUser:   "System",
		CreatedAt:   time.Now(),
		RawData:     []byte("{}"),
	}

	return config.DB.Create(buildInfo).Error
}

// DeleteJobName 删除Job名称及其所有相关构建信息
func (s *BuildService) DeleteJobName(jobName string) error {
	// 开启事务
	tx := config.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 首先删除相关的部署测试运行记录
	if err := tx.Where("build_info_id IN (SELECT id FROM build_infos WHERE job_name = ?)", jobName).
		Delete(&models.DeployTestRun{}).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to delete related deploy test runs: %v", err)
	}

	// 然后删除构建信息
	if err := tx.Where("job_name = ?", jobName).
		Delete(&models.BuildInfo{}).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to delete build infos: %v", err)
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		return fmt.Errorf("failed to commit transaction: %v", err)
	}

	return nil
}
