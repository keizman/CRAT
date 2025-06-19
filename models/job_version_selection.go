package models

import (
	"time"
)

// JobVersionSelection 工作版本选择模型
type JobVersionSelection struct {
	ID              uint      `json:"id" gorm:"primaryKey"`
	JobName         string    `json:"job_name" gorm:"uniqueIndex;not null"`
	SelectedBuildID *uint     `json:"selected_build_id" gorm:"index"`
	SelectedBuild   BuildInfo `json:"selected_build,omitempty" gorm:"foreignKey:SelectedBuildID;constraint:OnDelete:SET NULL"`
	AutoSyncEnabled bool      `json:"auto_sync_enabled" gorm:"default:true"`
	LastSyncTime    *time.Time `json:"last_sync_time"`
	UpdatedAt       time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

// TableName 指定表名
func (JobVersionSelection) TableName() string {
	return "job_version_selections"
}

// JobVersionSelectionRequest 版本选择请求
type JobVersionSelectionRequest struct {
	JobName   string `json:"job_name" binding:"required"`
	BuildID   uint   `json:"build_id" binding:"required"`
	AutoSync  *bool  `json:"auto_sync,omitempty"`
}

// JobVersionSelectionResponse 版本选择响应
type JobVersionSelectionResponse struct {
	ID              uint      `json:"id"`
	JobName         string    `json:"job_name"`
	SelectedBuild   *BuildInfo `json:"selected_build"`
	AutoSyncEnabled bool      `json:"auto_sync_enabled"`
	LastSyncTime    *time.Time `json:"last_sync_time"`
	UpdatedAt       time.Time `json:"updated_at"`
}