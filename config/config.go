package config

import (
	"log"

	"github.com/spf13/viper"
)

// 系统版本信息
const (
	AppVersion = "1.2"
	AppName    = "CRAT"
)

type Config struct {
	Server   ServerConfig   `mapstructure:"server"`
	Database DatabaseConfig `mapstructure:"database"`
	Auth     AuthConfig     `mapstructure:"auth"`
	Email    EmailConfig    `mapstructure:"email"`
	External ExternalConfig `mapstructure:"external"`
}

type ServerConfig struct {
	Port  string `mapstructure:"port"`
	Debug bool   `mapstructure:"debug"`
}

type DatabaseConfig struct {
	DSN         string `mapstructure:"dsn"`
	MaxIdleConn int    `mapstructure:"max_idle_conn"`
	MaxOpenConn int    `mapstructure:"max_open_conn"`
	MaxLifetime int    `mapstructure:"max_lifetime"`
}

type AuthConfig struct {
	AdminPassword string `mapstructure:"admin_password"`
}

type EmailConfig struct {
	Username string `mapstructure:"username"`
	Password string `mapstructure:"password"`
	Server   string `mapstructure:"server"`
	Port     int    `mapstructure:"port"`
}

type ExternalConfig struct {
	TestServerURL       string `mapstructure:"test_server_url"`
	TestBlockingEnabled bool   `mapstructure:"test_blocking_enabled"`
}

var AppConfig *Config

func LoadConfig() {
	viper.SetConfigFile(".env")
	viper.AutomaticEnv()

	// 设置默认值
	viper.SetDefault("PORT", "8000")
	viper.SetDefault("DEBUG", false)
	viper.SetDefault("ADMIN_PASSWD", "123456")
	viper.SetDefault("SQL_MAX_IDLE_CONNS", 100)
	viper.SetDefault("SQL_MAX_OPEN_CONNS", 1000)
	viper.SetDefault("SQL_MAX_LIFETIME", 60)
	viper.SetDefault("EMAIL_SEND_SERVER_PORT", 465)
	viper.SetDefault("TEST_BLOCKING_ENABLED", false)

	if err := viper.ReadInConfig(); err != nil {
		log.Printf("Warning: Could not read config file: %v", err)
	}

	AppConfig = &Config{
		Server: ServerConfig{
			Port:  viper.GetString("PORT"),
			Debug: viper.GetBool("DEBUG"),
		},
		Database: DatabaseConfig{
			DSN:         viper.GetString("SQL_DSN"),
			MaxIdleConn: viper.GetInt("SQL_MAX_IDLE_CONNS"),
			MaxOpenConn: viper.GetInt("SQL_MAX_OPEN_CONNS"),
			MaxLifetime: viper.GetInt("SQL_MAX_LIFETIME"),
		},
		Auth: AuthConfig{
			AdminPassword: viper.GetString("ADMIN_PASSWD"),
		},
		Email: EmailConfig{
			Username: viper.GetString("EMAIL_SEND_USERNAME"),
			Password: viper.GetString("EMAIL_SEND_PASSWORD"),
			Server:   viper.GetString("EMAIL_SEND_SERVER"),
			Port:     viper.GetInt("EMAIL_SEND_SERVER_PORT"),
		},
		External: ExternalConfig{
			TestServerURL:       viper.GetString("EXTERNAL_TEST_SERVER_URL"),
			TestBlockingEnabled: viper.GetBool("TEST_BLOCKING_ENABLED"),
		},
	}

	log.Println("Configuration loaded successfully")
}
