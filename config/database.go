package config

import (
	"log"
	"time"

	"crat/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDatabase() {
	var err error

	if AppConfig.Database.DSN == "" {
		log.Fatalf("Database DSN is required")
	}

	DB, err = gorm.Open(postgres.Open(AppConfig.Database.DSN), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	sqlDB, err := DB.DB()
	if err != nil {
		log.Fatalf("Failed to get database instance: %v", err)
	}

	// 设置连接池参数
	sqlDB.SetMaxIdleConns(AppConfig.Database.MaxIdleConn)
	sqlDB.SetMaxOpenConns(AppConfig.Database.MaxOpenConn)
	sqlDB.SetConnMaxLifetime(time.Duration(AppConfig.Database.MaxLifetime) * time.Minute)

	// 自动迁移数据库结构
	err = DB.AutoMigrate(
		&models.BuildInfo{},
		&models.TestItem{},
		&models.SystemSetting{},
		&models.UserSession{},
		&models.ParameterSet{},
		&models.DeployTestRun{},
		&models.JobVersionSelection{}, // 新增的模型
	)
	if err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	log.Println("Database connected and migrated successfully")
}

func CloseDatabase() {
	if DB != nil {
		sqlDB, err := DB.DB()
		if err == nil {
			sqlDB.Close()
		}
	}
}
