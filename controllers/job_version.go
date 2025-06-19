package controllers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"crat/config"
	"crat/models"
)

// SetJobVersion 设置指定job的版本选择
func SetJobVersion(c *gin.Context) {
	var req models.JobVersionSelectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	db := config.DB

	// 验证构建是否存在且属于指定job
	var buildInfo models.BuildInfo
	if err := db.Where("id = ? AND job_name = ?", req.BuildID, req.JobName).First(&buildInfo).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Build不存在或不属于指定job"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "查询构建信息失败"})
		}
		return
	}

	// 创建或更新版本选择记录
	var selection models.JobVersionSelection
	now := time.Now()
	
	err := db.Where("job_name = ?", req.JobName).First(&selection).Error
	if err == gorm.ErrRecordNotFound {
		// 创建新记录
		selection = models.JobVersionSelection{
			JobName:         req.JobName,
			SelectedBuildID: &req.BuildID,
			AutoSyncEnabled: true,
			LastSyncTime:    &now,
			UpdatedAt:       now,
		}
		if req.AutoSync != nil {
			selection.AutoSyncEnabled = *req.AutoSync
		}
		
		if err := db.Create(&selection).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "创建版本选择记录失败"})
			return
		}
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查询版本选择记录失败"})
		return
	} else {
		// 更新现有记录
		updates := map[string]interface{}{
			"selected_build_id": req.BuildID,
			"updated_at":        now,
		}
		if req.AutoSync != nil {
			updates["auto_sync_enabled"] = *req.AutoSync
		}
		
		if err := db.Model(&selection).Updates(updates).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "更新版本选择记录失败"})
			return
		}
		selection.SelectedBuildID = &req.BuildID
		selection.UpdatedAt = now
		if req.AutoSync != nil {
			selection.AutoSyncEnabled = *req.AutoSync
		}
	}

	// 预加载构建信息
	if err := db.Preload("SelectedBuild").First(&selection, selection.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "加载版本选择信息失败"})
		return
	}

	// 构建响应
	response := models.JobVersionSelectionResponse{
		ID:              selection.ID,
		JobName:         selection.JobName,
		SelectedBuild:   &selection.SelectedBuild,
		AutoSyncEnabled: selection.AutoSyncEnabled,
		LastSyncTime:    selection.LastSyncTime,
		UpdatedAt:       selection.UpdatedAt,
	}

	c.JSON(http.StatusOK, response)
}

// GetJobVersion 获取指定job的版本选择
func GetJobVersion(c *gin.Context) {
	jobName := c.Param("job_name")
	if jobName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "job_name不能为空"})
		return
	}

	db := config.DB
	
	var selection models.JobVersionSelection
	err := db.Preload("SelectedBuild").Where("job_name = ?", jobName).First(&selection).Error
	if err == gorm.ErrRecordNotFound {
		c.JSON(http.StatusNotFound, gin.H{"error": "未找到该job的版本选择记录"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查询版本选择记录失败"})
		return
	}

	// 构建响应
	response := models.JobVersionSelectionResponse{
		ID:              selection.ID,
		JobName:         selection.JobName,
		AutoSyncEnabled: selection.AutoSyncEnabled,
		LastSyncTime:    selection.LastSyncTime,
		UpdatedAt:       selection.UpdatedAt,
	}
	
	if selection.SelectedBuildID != nil {
		response.SelectedBuild = &selection.SelectedBuild
	}

	c.JSON(http.StatusOK, response)
}

// GetAllJobVersions 获取所有job的版本选择
func GetAllJobVersions(c *gin.Context) {
	db := config.DB
	
	var selections []models.JobVersionSelection
	if err := db.Preload("SelectedBuild").Find(&selections).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查询版本选择记录失败"})
		return
	}

	// 构建响应
	var responses []models.JobVersionSelectionResponse
	for _, selection := range selections {
		response := models.JobVersionSelectionResponse{
			ID:              selection.ID,
			JobName:         selection.JobName,
			AutoSyncEnabled: selection.AutoSyncEnabled,
			LastSyncTime:    selection.LastSyncTime,
			UpdatedAt:       selection.UpdatedAt,
		}
		
		if selection.SelectedBuildID != nil {
			response.SelectedBuild = &selection.SelectedBuild
		}
		
		responses = append(responses, response)
	}

	c.JSON(http.StatusOK, responses)
}

// SyncJobVersion 同步指定job的版本到最新构建
func SyncJobVersion(c *gin.Context) {
	jobName := c.Param("job_name")
	if jobName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "job_name不能为空"})
		return
	}

	db := config.DB

	// 获取该job的最新构建
	var latestBuild models.BuildInfo
	if err := db.Where("job_name = ?", jobName).Order("created_at DESC").First(&latestBuild).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "该job没有构建记录"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "查询最新构建失败"})
		}
		return
	}

	// 创建或更新版本选择记录
	var selection models.JobVersionSelection
	now := time.Now()
	
	err := db.Where("job_name = ?", jobName).First(&selection).Error
	if err == gorm.ErrRecordNotFound {
		// 创建新记录
		selection = models.JobVersionSelection{
			JobName:         jobName,
			SelectedBuildID: &latestBuild.ID,
			AutoSyncEnabled: true,
			LastSyncTime:    &now,
			UpdatedAt:       now,
		}
		
		if err := db.Create(&selection).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "创建版本选择记录失败"})
			return
		}
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查询版本选择记录失败"})
		return
	} else {
		// 更新现有记录
		if err := db.Model(&selection).Updates(map[string]interface{}{
			"selected_build_id": latestBuild.ID,
			"last_sync_time":    now,
			"updated_at":        now,
		}).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "更新版本选择记录失败"})
			return
		}
		selection.SelectedBuildID = &latestBuild.ID
		selection.LastSyncTime = &now
		selection.UpdatedAt = now
	}

	// 预加载构建信息
	if err := db.Preload("SelectedBuild").First(&selection, selection.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "加载版本选择信息失败"})
		return
	}

	// 构建响应
	response := models.JobVersionSelectionResponse{
		ID:              selection.ID,
		JobName:         selection.JobName,
		SelectedBuild:   &selection.SelectedBuild,
		AutoSyncEnabled: selection.AutoSyncEnabled,
		LastSyncTime:    selection.LastSyncTime,
		UpdatedAt:       selection.UpdatedAt,
	}

	c.JSON(http.StatusOK, response)
}

// DeleteJobVersion 删除指定job的版本选择
func DeleteJobVersion(c *gin.Context) {
	jobName := c.Param("job_name")
	if jobName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "job_name不能为空"})
		return
	}

	db := config.DB
	
	if err := db.Where("job_name = ?", jobName).Delete(&models.JobVersionSelection{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "删除版本选择记录失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "版本选择记录删除成功"})
}

// AutoSyncJobVersions 自动同步所有启用自动同步的job版本
func AutoSyncJobVersions(c *gin.Context) {
	db := config.DB
	
	// 获取所有启用自动同步的记录
	var selections []models.JobVersionSelection
	if err := db.Where("auto_sync_enabled = ?", true).Find(&selections).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查询自动同步记录失败"})
		return
	}

	syncCount := 0
	now := time.Now()
	
	for _, selection := range selections {
		// 检查是否需要同步（24小时间隔）
		if selection.LastSyncTime != nil && now.Sub(*selection.LastSyncTime) < 24*time.Hour {
			continue
		}

		// 获取该job的最新构建
		var latestBuild models.BuildInfo
		if err := db.Where("job_name = ?", selection.JobName).Order("created_at DESC").First(&latestBuild).Error; err != nil {
			continue // 跳过没有构建记录的job
		}

		// 更新版本选择
		if err := db.Model(&selection).Updates(map[string]interface{}{
			"selected_build_id": latestBuild.ID,
			"last_sync_time":    now,
			"updated_at":        now,
		}).Error; err != nil {
			continue // 跳过更新失败的记录
		}
		
		syncCount++
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "自动同步完成",
		"sync_count": syncCount,
	})
}