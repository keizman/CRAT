package controllers

import (
	"net/http"
	"strconv"

	"crat/config"
	"crat/models"
	"crat/services"

	"github.com/gin-gonic/gin"
)

type TestItemController struct {
	deployTestService *services.DeployTestService
}

func NewTestItemController() *TestItemController {
	return &TestItemController{
		deployTestService: services.NewDeployTestService(),
	}
}

// CreateTestItem 创建测试项
func (t *TestItemController) CreateTestItem(c *gin.Context) {
	var testItem models.TestItem
	if err := c.ShouldBindJSON(&testItem); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := config.DB.Create(&testItem).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Test item created successfully",
		"data":    testItem,
	})
}

// GetTestItems 获取测试项列表
func (t *TestItemController) GetTestItems(c *gin.Context) {
	var testItems []models.TestItem
	err := config.DB.Find(&testItems).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": testItems})
}

// GetTestItem 根据ID获取测试项
func (t *TestItemController) GetTestItem(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid test item ID"})
		return
	}

	var testItem models.TestItem
	err = config.DB.First(&testItem, id).Error
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Test item not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": testItem})
}

// UpdateTestItem 更新测试项
func (t *TestItemController) UpdateTestItem(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid test item ID"})
		return
	}

	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := config.DB.Model(&models.TestItem{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Test item updated successfully"})
}

// DeleteTestItem 删除测试项
func (t *TestItemController) DeleteTestItem(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid test item ID"})
		return
	}

	if err := config.DB.Delete(&models.TestItem{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Test item deleted successfully"})
}

// TriggerDeployTest 触发部署测试
func (t *TestItemController) TriggerDeployTest(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid test item ID"})
		return
	}

	var req struct {
		BuildInfoID uint `json:"build_info_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 获取当前用户邮箱
	userEmail, exists := c.Get("user_email")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	deployTestRun, err := t.deployTestService.TriggerDeployTest(uint(id), req.BuildInfoID, userEmail.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Deploy test triggered successfully",
		"data":    deployTestRun,
	})
}

// GetDeployTestRuns 获取部署测试运行历史
func (t *TestItemController) GetDeployTestRuns(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid test item ID"})
		return
	}

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

	runs, total, err := t.deployTestService.GetDeployTestRuns(uint(id), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":   runs,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// GetDeployTestRun 获取单个部署测试运行详情
func (t *TestItemController) GetDeployTestRun(c *gin.Context) {
	runIdStr := c.Param("deploy_run_id")
	runId, err := strconv.ParseUint(runIdStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid deploy test run ID"})
		return
	}

	deployTestRun, err := t.deployTestService.GetDeployTestRunByID(uint(runId))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Deploy test run not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": deployTestRun})
}

// ClearDeployTestHistory 清理部署测试历史
func (t *TestItemController) ClearDeployTestHistory(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid test item ID"})
		return
	}

	// 获取当前用户邮箱用于日志记录
	userEmail, _ := c.Get("user_email")
	
	deletedCount, err := t.deployTestService.ClearDeployTestHistory(uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Deploy test history cleared successfully",
		"deleted_count": deletedCount,
		"test_item_id": id,
		"cleared_by": userEmail,
	})
}
