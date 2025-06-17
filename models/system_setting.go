package models

import (
	"time"
)

type SystemSetting struct {
	Key         string    `gorm:"primaryKey" json:"key"`
	Value       string    `gorm:"not null" json:"value"`
	Description string    `json:"description"`
	UpdatedAt   time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

// TableName 指定表名
func (SystemSetting) TableName() string {
	return "system_settings"
}
