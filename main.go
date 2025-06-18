package main

import (
	"log"

	"crat/config"
	"crat/middleware"
	"crat/router"

	"github.com/gin-gonic/gin"
)

func main() {
	// 加载配置
	config.LoadConfig()

	// 初始化数据库
	config.InitDatabase()
	defer config.CloseDatabase()

	// 设置Gin模式
	if !config.AppConfig.Server.Debug {
		gin.SetMode(gin.ReleaseMode)
	}

	// 创建路由
	router := setupRouter()

	// 启动服务器
	port := config.AppConfig.Server.Port
	if port == "" {
		port = "6000" // 默认端口
	}
	log.Printf("Server starting on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func setupRouter() *gin.Engine {
	r := gin.New()

	// 中间件
	r.Use(middleware.LoggerMiddleware())
	r.Use(gin.Recovery())
	r.Use(middleware.CORSMiddleware())

	// 设置静态文件路由
	router.SetupStaticRoutes(r)

	// 设置API路由
	router.SetupAPIRoutes(r)

	return r
}
