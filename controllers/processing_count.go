package controllers

import (
	"net/http"

	"crat/config"
	"crat/models"

	"github.com/gin-gonic/gin"
)

type ProcessingCountController struct{}

func NewProcessingCountController() *ProcessingCountController {
	return &ProcessingCountController{}
}

// GetProcessingCount 获取当前正在处理的测试数量
func (p *ProcessingCountController) GetProcessingCount(c *gin.Context) {
	var count int64

	// 统计处于运行中状态的测试数量
	runningStates := []string{"PENDING", "DOWNLOADING", "DEPLOYING", "TESTING", "MONITORING"}

	if err := config.DB.Model(&models.DeployTestRun{}).
		Where("status IN ?", runningStates).
		Count(&count).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"count": count,
		},
	})
}
