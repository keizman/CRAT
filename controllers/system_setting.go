package controllers

import (
	"errors"
	"net/http"

	"crat/config"
	"crat/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type SystemSettingController struct{}

func NewSystemSettingController() *SystemSettingController {
	return &SystemSettingController{}
}

// GetSettings 获取系统设置
func (s *SystemSettingController) GetSettings(c *gin.Context) {
	var settings []models.SystemSetting
	if err := config.DB.Find(&settings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 转换为map格式方便前端使用
	settingsMap := make(map[string]interface{})
	for _, setting := range settings {
		settingsMap[setting.Key] = map[string]interface{}{
			"value":       setting.Value,
			"description": setting.Description,
			"updated_at":  setting.UpdatedAt,
		}
	}

	c.JSON(http.StatusOK, gin.H{"data": settingsMap})
}

// UpdateSettings 更新系统设置
func (s *SystemSettingController) UpdateSettings(c *gin.Context) {
	var req map[string]string
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 批量更新设置
	for key, value := range req {
		var setting models.SystemSetting
		if err := config.DB.Where("key = ?", key).First(&setting).Error; err != nil {
			// 如果设置不存在，创建新的
			if errors.Is(err, gorm.ErrRecordNotFound) {
				setting = models.SystemSetting{
					Key:   key,
					Value: value,
				}
				if err := config.DB.Create(&setting).Error; err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
					return
				}
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
		} else {
			// 更新现有设置
			setting.Value = value
			if err := config.DB.Save(&setting).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Settings updated successfully"})
}

// GetSetting 获取单个系统设置
func (s *SystemSettingController) GetSetting(c *gin.Context) {
	key := c.Param("key")
	if key == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "key is required"})
		return
	}

	var setting models.SystemSetting
	if err := config.DB.Where("key = ?", key).First(&setting).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Setting not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": setting})
}

// UpdateSetting 更新单个系统设置
func (s *SystemSettingController) UpdateSetting(c *gin.Context) {
	key := c.Param("key")
	if key == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "key is required"})
		return
	}

	var req struct {
		Value       string `json:"value" binding:"required"`
		Description string `json:"description"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var setting models.SystemSetting
	if err := config.DB.Where("key = ?", key).First(&setting).Error; err != nil {
		// 如果设置不存在，创建新的
		if errors.Is(err, gorm.ErrRecordNotFound) {
			setting = models.SystemSetting{
				Key:         key,
				Value:       req.Value,
				Description: req.Description,
			}
			if err := config.DB.Create(&setting).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	} else {
		// 更新现有设置
		setting.Value = req.Value
		if req.Description != "" {
			setting.Description = req.Description
		}
		if err := config.DB.Save(&setting).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Setting updated successfully",
		"data":    setting,
	})
}
