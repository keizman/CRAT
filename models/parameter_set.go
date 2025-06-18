package models

import (
	"encoding/json"
	"time"
)

// ParameterSet 存储测试参数配置
type ParameterSet struct {
	ID          uint            `gorm:"primaryKey" json:"id"`
	Name        string          `gorm:"uniqueIndex;not null" json:"name"`
	Description string          `json:"description"`
	Parameters  json.RawMessage `gorm:"type:jsonb;not null;default:'{}'" json:"parameters"`
	CreatedAt   time.Time       `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time       `gorm:"autoUpdateTime" json:"updated_at"`
}

// TableName 指定表名
func (ParameterSet) TableName() string {
	return "parameter_sets"
}

// TestParameters 测试参数结构
type TestParameters struct {
	ServiceName   string `json:"service_name"`
	InstallDir    string `json:"install_dir"`
	UpgradeType   string `json:"upgrade_type"`
	TestPath      string `json:"test_path"`
	BaseURL       string `json:"base_url"`
	ReportKeyword string `json:"report_keyword"`
}

// GetParameters 获取解析后的参数
func (p *ParameterSet) GetParameters() (*TestParameters, error) {
	var params TestParameters
	if err := json.Unmarshal(p.Parameters, &params); err != nil {
		return nil, err
	}
	return &params, nil
}

// SetParameters 设置参数
func (p *ParameterSet) SetParameters(params *TestParameters) error {
	data, err := json.Marshal(params)
	if err != nil {
		return err
	}
	p.Parameters = data
	return nil
}