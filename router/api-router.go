package router

import (
	"net/http"

	"crat/controllers"
	"crat/middleware"

	"github.com/gin-gonic/gin"
)

// SetupAPIRoutes 设置所有API路由
func SetupAPIRoutes(router *gin.Engine) {
	// 初始化控制器
	authController := controllers.NewAuthController()
	buildInfoController := controllers.NewBuildInfoController()
	testItemController := controllers.NewTestItemController()
	systemSettingController := controllers.NewSystemSettingController()
	parameterSetController := controllers.NewParameterSetController()
	processingCountController := controllers.NewProcessingCountController()
	versionController := controllers.NewVersionController()

	// API路由组
	api := router.Group("/api/v1")

	// 认证相关路由 (无需认证)
	api.POST("/auth/login", authController.Login)

	// Jenkins Webhook (无需认证)
	api.POST("/builds", buildInfoController.CreateBuildInfo)

	// 版本信息 (无需认证)
	api.GET("/version", versionController.GetVersion)

	// 需要认证的路由
	authenticated := api.Group("/")
	authenticated.Use(middleware.AuthMiddleware())
	{
		// 认证相关
		authenticated.POST("/auth/logout", authController.Logout)
		authenticated.GET("/auth/me", authController.GetCurrentUser)
		authenticated.POST("/auth/refresh", authController.RefreshToken)

		// 构建信息相关
		authenticated.GET("/builds", buildInfoController.GetBuildInfoList)
		authenticated.GET("/builds/job-names", buildInfoController.GetJobNames)
		authenticated.GET("/builds/job/:job_name", buildInfoController.GetBuildsByJobName)
		authenticated.GET("/builds/job/:job_name/latest", buildInfoController.GetLatestBuildByJobName)

		// Job版本选择相关
		authenticated.GET("/job-versions", controllers.GetAllJobVersions)
		authenticated.GET("/job-versions/:job_name", controllers.GetJobVersion)
		authenticated.PUT("/job-versions", controllers.SetJobVersion)
		authenticated.POST("/job-versions/:job_name/sync", controllers.SyncJobVersion)
		authenticated.POST("/job-versions/auto-sync", controllers.AutoSyncJobVersions)

		// 测试项相关
		authenticated.GET("/test-items", testItemController.GetTestItems)
		authenticated.GET("/test-items/:id", testItemController.GetTestItem)
		authenticated.POST("/test-items/:id/deploy-test", testItemController.TriggerDeployTest)
		authenticated.GET("/test-items/:id/deploy-runs", testItemController.GetDeployTestRuns)
		authenticated.GET("/deploy-test-runs/:deploy_run_id", testItemController.GetDeployTestRun)

		// 系统设置读取（所有认证用户可访问）
		authenticated.GET("/settings", systemSettingController.GetSettings)
		authenticated.GET("/settings/:key", systemSettingController.GetSetting)

		// 参数集读取（所有认证用户可访问）
		authenticated.GET("/parameter-sets", parameterSetController.GetParameterSets)
		authenticated.GET("/parameter-sets/:id", parameterSetController.GetParameterSet)

		// 处理计数（所有认证用户可访问）
		authenticated.GET("/processing-count", processingCountController.GetProcessingCount)

		// 需要管理员权限的路由
		admin := authenticated.Group("/")
		admin.Use(middleware.AdminRequired())
		{
			// 构建信息管理
			admin.DELETE("/builds/:id", buildInfoController.DeleteBuildInfo)
			admin.POST("/builds/job-names", buildInfoController.AddJobName)
			admin.DELETE("/builds/job-names/:job_name", buildInfoController.DeleteJobName)

			// Job版本选择管理（仅管理员可删除）
			admin.DELETE("/job-versions/:job_name", controllers.DeleteJobVersion)

			// 测试项管理
			admin.POST("/test-items", testItemController.CreateTestItem)
			admin.PUT("/test-items/:id", testItemController.UpdateTestItem)
			admin.DELETE("/test-items/:id", testItemController.DeleteTestItem)
			admin.DELETE("/test-items/:id/deploy-history", testItemController.ClearDeployTestHistory)

			// 系统设置修改（仅管理员可访问）
			admin.PUT("/settings", systemSettingController.UpdateSettings)
			admin.PUT("/settings/:key", systemSettingController.UpdateSetting)

			// 参数集管理（仅管理员可访问）
			admin.POST("/parameter-sets", parameterSetController.CreateParameterSet)
			admin.PUT("/parameter-sets/:id", parameterSetController.UpdateParameterSet)
			admin.DELETE("/parameter-sets/:id", parameterSetController.DeleteParameterSet)
		}
	}

	// 健康检查
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"service": "crat",
		})
	})
}

// SetupStaticRoutes 设置静态文件路由
func SetupStaticRoutes(router *gin.Engine) {
	// 静态文件服务
	router.Static("/assets", "./web/dist/assets")
	router.StaticFile("/", "./web/dist/index.html")
	router.StaticFile("/login", "./web/dist/login.html")

	// 路由到不同的页面sections - 都serve同一个index.html，前端根据URL处理
	router.StaticFile("/builds", "./web/dist/index.html")
	router.StaticFile("/tests", "./web/dist/index.html")
	router.StaticFile("/settings", "./web/dist/index.html")
	router.StaticFile("/settings/smtp", "./web/dist/index.html")
	router.StaticFile("/parameter-sets", "./web/dist/index.html")

	// 缓存控制中间件
	router.Use(func(c *gin.Context) {
		path := c.Request.URL.Path
		if path == "/" || path == "/login" || path == "/builds" || path == "/tests" || path == "/settings" || path == "/settings/smtp" || path == "/parameter-sets" {
			// HTML文件不缓存，确保获取最新版本
			c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
			c.Header("Pragma", "no-cache")
			c.Header("Expires", "0")
		} else if len(path) >= 8 && path[:8] == "/assets/" {
			// 静态资源长期缓存（带hash的文件名）
			c.Header("Cache-Control", "public, max-age=31536000, immutable")
		}
		c.Next()
	})
}
