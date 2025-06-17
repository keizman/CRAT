package controllers

import (
	"net/http"
	"strconv"

	"crat/services"

	"github.com/gin-gonic/gin"
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
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
