package controllers

import (
	"net/http"
	"runtime"

	"crat/config"

	"github.com/gin-gonic/gin"
)

type VersionController struct{}

func NewVersionController() *VersionController {
	return &VersionController{}
}

// GetVersion 获取系统版本信息
func (v *VersionController) GetVersion(c *gin.Context) {
	versionInfo := gin.H{
		"app_name":    config.AppName,
		"app_version": config.AppVersion,
		"go_version":  runtime.Version(),
		"build_time":  "", // 可以在编译时注入
		"commit_hash": "", // 可以在编译时注入
	}

	c.JSON(http.StatusOK, gin.H{
		"data": versionInfo,
	})
}
