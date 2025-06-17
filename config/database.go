package config

import (
	"log"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDatabase() {
	var err error

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

	log.Println("Database connected successfully")
}

func CloseDatabase() {
	if DB != nil {
		sqlDB, err := DB.DB()
		if err == nil {
			sqlDB.Close()
		}
	}
}
