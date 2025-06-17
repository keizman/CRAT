package models

import (
	"time"
)

type TestItem struct {
	ID                  uint      `gorm:"primaryKey" json:"id"`
	Name                string    `gorm:"uniqueIndex;not null" json:"name"`
	Description         string    `json:"description"`
	AssociatedJobName   string    `gorm:"index" json:"associated_job_name"`
	NotificationEnabled bool      `gorm:"default:false" json:"notification_enabled"`
	CreatedAt           time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt           time.Time `gorm:"autoUpdateTime" json:"updated_at"`

	// 关联的部署测试执行历史
	DeployTestRuns []DeployTestRun `gorm:"foreignKey:TestItemID" json:"deploy_test_runs,omitempty"`
}

// TableName 指定表名
func (TestItem) TableName() string {
	return "test_items"
}
