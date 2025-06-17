package controllers

import (
	"net/http"
	"time"

	"crat/config"
	"crat/middleware"
	"crat/models"

	"github.com/gin-gonic/gin"
)

type AuthController struct{}

func NewAuthController() *AuthController {
	return &AuthController{}
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token   string `json:"token"`
	IsAdmin bool   `json:"is_admin"`
	Email   string `json:"email"`
}

// Login 用户登录
func (a *AuthController) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 检查是否为管理员登录
	isAdmin := false
	if req.Email == "admin" && req.Password == config.AppConfig.Auth.AdminPassword {
		isAdmin = true
	} else if req.Password == config.AppConfig.Auth.AdminPassword {
		isAdmin = true
	} else if req.Password != "" {
		// 如果提供了密码但不是管理员密码，则认证失败
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// 对于非admin用户，验证邮箱格式
	if !isAdmin && req.Email != "admin" {
		// 简单的邮箱格式验证
		if !isValidEmail(req.Email) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid email format"})
			return
		}
	}

	// 生成JWT令牌
	token, err := middleware.GenerateToken(req.Email, isAdmin)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	// 创建或更新用户会话
	session := models.UserSession{
		Email:        req.Email,
		SessionToken: token,
		IsAdmin:      isAdmin,
		CreatedAt:    time.Now(),
		ExpiresAt:    time.Now().Add(24 * time.Hour),
	}

	// 删除该用户的旧会话
	config.DB.Where("email = ?", req.Email).Delete(&models.UserSession{})

	// 创建新会话
	if err := config.DB.Create(&session).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create session"})
		return
	}

	c.JSON(http.StatusOK, LoginResponse{
		Token:   token,
		IsAdmin: isAdmin,
		Email:   req.Email,
	})
}

// Logout 用户登出
func (a *AuthController) Logout(c *gin.Context) {
	token, exists := c.Get("session_token")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No active session"})
		return
	}

	// 删除会话
	config.DB.Where("session_token = ?", token).Delete(&models.UserSession{})

	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

// GetCurrentUser 获取当前用户信息
func (a *AuthController) GetCurrentUser(c *gin.Context) {
	email, _ := c.Get("user_email")
	isAdmin, _ := c.Get("is_admin")

	c.JSON(http.StatusOK, gin.H{
		"email":    email,
		"is_admin": isAdmin,
	})
}

// RefreshToken 刷新令牌
func (a *AuthController) RefreshToken(c *gin.Context) {
	email, _ := c.Get("user_email")
	isAdmin, _ := c.Get("is_admin")
	oldToken, _ := c.Get("session_token")

	// 生成新令牌
	newToken, err := middleware.GenerateToken(email.(string), isAdmin.(bool))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	// 更新会话记录
	config.DB.Model(&models.UserSession{}).
		Where("session_token = ?", oldToken).
		Updates(map[string]interface{}{
			"session_token": newToken,
			"expires_at":    time.Now().Add(24 * time.Hour),
		})

	c.JSON(http.StatusOK, gin.H{
		"token": newToken,
	})
}

// isValidEmail 简单的邮箱格式验证
func isValidEmail(email string) bool {
	// 基本邮箱格式检查：包含 @ 和 .
	atIndex := -1
	dotIndex := -1

	for i, char := range email {
		if char == '@' {
			if atIndex != -1 {
				return false // 多个@符号
			}
			atIndex = i
		} else if char == '.' && atIndex != -1 {
			dotIndex = i
		}
	}

	// 检查基本格式：有@符号，@后面有.，且不是开头或结尾
	return atIndex > 0 && dotIndex > atIndex+1 && dotIndex < len(email)-1
}
