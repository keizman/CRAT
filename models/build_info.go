package models

import (
	"time"
	"encoding/json"
)

type BuildInfo struct {
	ID          uint            `gorm:"primaryKey" json:"id"`
	JobName     string          `gorm:"index;not null" json:"job_name"`
	BuildNumber int             `gorm:"not null" json:"build_number"`
	PackagePath string          `gorm:"not null" json:"package_path"`
	BuildUser   string          `gorm:"default:None" json:"build_user"`
	CreatedAt   time.Time       `gorm:"autoCreateTime;index" json:"created_at"`
	RawData     json.RawMessage `gorm:"type:jsonb" json:"raw_data,omitempty"`
}

// TableName 指定表名
func (BuildInfo) TableName() string {
	return "build_info"
}
