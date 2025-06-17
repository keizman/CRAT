package models

import (
	"encoding/json"
	"time"
)

// DeployTestRun 记录完整的部署测试生命周期
type DeployTestRun struct {
	ID          uint       `gorm:"primaryKey" json:"id"`
	TestItemID  uint       `gorm:"index;not null" json:"test_item_id"`
	TestItem    *TestItem  `gorm:"foreignKey:TestItemID" json:"test_item,omitempty"`
	BuildInfoID uint       `gorm:"not null" json:"build_info_id"`
	BuildInfo   *BuildInfo `gorm:"foreignKey:BuildInfoID" json:"build_info,omitempty"`
	TriggeredBy string     `gorm:"not null" json:"triggered_by"`

	// 状态字段
	Status string `gorm:"default:PENDING;index" json:"status"` // PENDING, DOWNLOADING, DOWNLOADED, DEPLOYING, TESTING, MONITORING, COMPLETED, FAILED

	// 下载相关
	DownloadURL  string `json:"download_url"`
	DownloadPath string `json:"download_path"`

	// 外部测试服务器相关
	TaskID    string `json:"task_id"`    // 外部测试服务器返回的task_id
	ReportURL string `json:"report_url"` // 最终的测试报告URL

	// 步骤详情 - JSON格式存储各个步骤的详细信息
	Steps json.RawMessage `gorm:"type:jsonb" json:"steps,omitempty"`

	// 配置信息
	MaxQueryHours int `gorm:"default:3" json:"max_query_hours"` // 最大查询时间（小时）
	QueryInterval int `gorm:"default:60" json:"query_interval"` // 查询间隔（秒）
	QueryTimeout  int `gorm:"default:30" json:"query_timeout"`  // 查询超时（秒）

	// 时间记录
	StartedAt  time.Time  `gorm:"autoCreateTime;index" json:"started_at"`
	FinishedAt *time.Time `json:"finished_at"`

	// 错误信息
	ErrorMessage string `json:"error_message"`
}

// TableName 指定表名
func (DeployTestRun) TableName() string {
	return "deploy_test_runs"
}

// DeployTestStep 记录每个步骤的详细信息
type DeployTestStep struct {
	Name      string     `json:"name"`
	Status    string     `json:"status"`
	StartTime time.Time  `json:"start_time"`
	EndTime   *time.Time `json:"end_time,omitempty"`
	Details   string     `json:"details,omitempty"`
	Error     string     `json:"error,omitempty"`
}

// 常量定义
const (
	// 状态常量
	DeployTestStatusPending     = "PENDING"
	DeployTestStatusDownloading = "DOWNLOADING"
	DeployTestStatusDownloaded  = "DOWNLOADED"
	DeployTestStatusDeploying   = "DEPLOYING"
	DeployTestStatusTesting     = "TESTING"
	DeployTestStatusMonitoring  = "MONITORING"
	DeployTestStatusCompleted   = "COMPLETED"
	DeployTestStatusFailed      = "FAILED"

	// 步骤名称常量
	StepDownload = "download"
	StepDeploy   = "deploy"
	StepTest     = "test"
	StepMonitor  = "monitor"
	StepNotify   = "notify"
)
