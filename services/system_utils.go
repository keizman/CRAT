package services

import (
	"crat/config"
	"crat/models"
)

// SystemUtils 提供系统相关的工具方法
type SystemUtils struct{}

// NewSystemUtils 创建系统工具实例
func NewSystemUtils() *SystemUtils {
	return &SystemUtils{}
}

// GetSystemSettings 获取系统设置
func (s *SystemUtils) GetSystemSettings() (map[string]string, error) {
	var settings []models.SystemSetting
	err := config.DB.Find(&settings).Error
	if err != nil {
		return nil, err
	}

	result := make(map[string]string)
	for _, setting := range settings {
		result[setting.Key] = setting.Value
	}

	return result, nil
}
