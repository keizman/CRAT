package controllers

import (
	"errors"
	"log"
	"net/http"
	"strconv"

	"crat/config"
	"crat/models"
	"crat/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type BuildInfoController struct {
	buildService *services.BuildService
}

func NewBuildInfoController() *BuildInfoController {
	return &BuildInfoController{
		buildService: services.NewBuildService(),
	}
}

// CreateBuildInfo 创建构建信息 (Jenkins Webhook)
func (b *BuildInfoController) CreateBuildInfo(c *gin.Context) {
	var data map[string]interface{}
	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := b.buildService.ProcessJenkinsWebhook(data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Build info created successfully"})
}

// GetBuildInfoList 获取构建信息列表
func (b *BuildInfoController) GetBuildInfoList(c *gin.Context) {
	jobName := c.Query("job_name")
	
	limitStr := c.DefaultQuery("limit", "20")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 || limit > 100 {
		limit = 20
	}

	offsetStr := c.DefaultQuery("offset", "0")
	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	builds, total, err := b.buildService.GetBuildInfoList(jobName, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  builds,
		"total": total,
		"limit": limit,
		"offset": offset,
	})
}

// GetJobNames 获取所有Job名称
func (b *BuildInfoController) GetJobNames(c *gin.Context) {
	jobNames, err := b.buildService.GetJobNames()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": jobNames})
}

// GetBuildsByJobName 根据Job名称获取构建列表
func (b *BuildInfoController) GetBuildsByJobName(c *gin.Context) {
	jobName := c.Param("job_name")
	if jobName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "job_name is required"})
		return
	}

	builds, err := b.buildService.GetBuildInfoByJobName(jobName)
	if err != nil {
		// 记录详细错误信息
		c.Header("Content-Type", "application/json")
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 如果没有找到构建信息，返回空数组而不是错误
	if builds == nil {
		builds = []models.BuildInfo{}
	}

	c.JSON(http.StatusOK, gin.H{"data": builds})
}

// GetLatestBuildByJobName 获取Job的最新构建
func (b *BuildInfoController) GetLatestBuildByJobName(c *gin.Context) {
	jobName := c.Param("job_name")
	if jobName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "job_name is required"})
		return
	}

	build, err := b.buildService.GetLatestBuildByJobName(jobName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if build == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No build found for this job"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": build})
}

// DeleteBuildInfo 删除构建信息
func (b *BuildInfoController) DeleteBuildInfo(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid build ID"})
		return
	}

	// 获取用户信息用于日志记录
	userEmail, _ := c.Get("user_email")
	
	// 检查构建信息是否存在
	var buildInfo models.BuildInfo
	if err := config.DB.First(&buildInfo, uint(id)).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Build info not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 开启事务删除，确保数据一致性
	tx := config.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 删除构建信息（级联删除相关的 deploy_test_runs 记录）
	if err := tx.Delete(&buildInfo).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	// 记录删除操作日志
	log.Printf("Build info deleted successfully - ID: %d, Job: %s, Build: %d, Deleted by: %v", 
		id, buildInfo.JobName, buildInfo.BuildNumber, userEmail)

	c.JSON(http.StatusOK, gin.H{
		"message": "Build info deleted successfully",
		"deleted_build": gin.H{
			"id": buildInfo.ID,
			"job_name": buildInfo.JobName,
			"build_number": buildInfo.BuildNumber,
		},
	})
}
