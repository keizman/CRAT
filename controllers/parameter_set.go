package controllers

import (
	"net/http"
	"strconv"

	"crat/config"
	"crat/models"

	"github.com/gin-gonic/gin"
)

type ParameterSetController struct{}

func NewParameterSetController() *ParameterSetController {
	return &ParameterSetController{}
}

// CreateParameterSet 创建参数集
func (p *ParameterSetController) CreateParameterSet(c *gin.Context) {
	var req struct {
		Name        string                   `json:"name" binding:"required"`
		Description string                   `json:"description"`
		Parameters  *models.TestParameters   `json:"parameters" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	parameterSet := &models.ParameterSet{
		Name:        req.Name,
		Description: req.Description,
	}

	if err := parameterSet.SetParameters(req.Parameters); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid parameters format"})
		return
	}

	if err := config.DB.Create(parameterSet).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Parameter set created successfully",
		"data":    parameterSet,
	})
}

// GetParameterSets 获取参数集列表
func (p *ParameterSetController) GetParameterSets(c *gin.Context) {
	var parameterSets []models.ParameterSet
	err := config.DB.Find(&parameterSets).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": parameterSets})
}

// GetParameterSet 根据ID获取参数集
func (p *ParameterSetController) GetParameterSet(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid parameter set ID"})
		return
	}

	var parameterSet models.ParameterSet
	err = config.DB.First(&parameterSet, id).Error
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Parameter set not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": parameterSet})
}

// UpdateParameterSet 更新参数集
func (p *ParameterSetController) UpdateParameterSet(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid parameter set ID"})
		return
	}

	var req struct {
		Name        string                   `json:"name"`
		Description string                   `json:"description"`
		Parameters  *models.TestParameters   `json:"parameters"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var parameterSet models.ParameterSet
	if err := config.DB.First(&parameterSet, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Parameter set not found"})
		return
	}

	updates := make(map[string]interface{})
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if req.Parameters != nil {
		if err := parameterSet.SetParameters(req.Parameters); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid parameters format"})
			return
		}
		updates["parameters"] = parameterSet.Parameters
	}

	if err := config.DB.Model(&parameterSet).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Parameter set updated successfully"})
}

// DeleteParameterSet 删除参数集
func (p *ParameterSetController) DeleteParameterSet(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid parameter set ID"})
		return
	}

	// 检查是否为默认参数集
	var parameterSet models.ParameterSet
	if err := config.DB.First(&parameterSet, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Parameter set not found"})
		return
	}

	if parameterSet.Name == "default" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete default parameter set"})
		return
	}

	if err := config.DB.Delete(&models.ParameterSet{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Parameter set deleted successfully"})
}