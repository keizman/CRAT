package models

import (
	"time"
)

type UserSession struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	Email        string    `gorm:"index;not null" json:"email"`
	SessionToken string    `gorm:"uniqueIndex;not null" json:"session_token"`
	IsAdmin      bool      `gorm:"default:false" json:"is_admin"`
	CreatedAt    time.Time `gorm:"autoCreateTime" json:"created_at"`
	ExpiresAt    time.Time `gorm:"not null" json:"expires_at"`
}
