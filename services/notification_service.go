package services

import (
	"fmt"

	"crat/config"

	"gopkg.in/gomail.v2"
)

type NotificationService struct{}

func NewNotificationService() *NotificationService {
	return &NotificationService{}
}

// SendEmailNotification 发送邮件通知
func (n *NotificationService) SendEmailNotification(to, subject, body string) error {
	m := gomail.NewMessage()
	m.SetHeader("From", config.AppConfig.Email.Username)
	m.SetHeader("To", to)
	m.SetHeader("Subject", subject)
	m.SetBody("text/html", body)

	d := gomail.NewDialer(
		config.AppConfig.Email.Server,
		config.AppConfig.Email.Port,
		config.AppConfig.Email.Username,
		config.AppConfig.Email.Password,
	)

	return d.DialAndSend(m)
}

// SendTestSuccessNotification 发送测试成功通知
func (n *NotificationService) SendTestSuccessNotification(email, testName, buildInfo, reportURL string) error {
	subject := fmt.Sprintf("✅ 测试成功 - %s", testName)

	body := fmt.Sprintf(`
		<html>
		<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
			<div style="max-width: 600px; margin: 0 auto; padding: 20px;">
				<h2 style="color: #28a745;">🎉 测试执行成功</h2>
				<div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
					<p><strong>测试项目:</strong> %s</p>
					<p><strong>构建信息:</strong> %s</p>
					<p><strong>执行时间:</strong> %s</p>
				</div>
				%s
				<hr style="margin: 20px 0;">
				<p style="color: #6c757d; font-size: 12px;">
					本邮件由 CRAT 自动化测试平台自动发送，请勿回复。
				</p>
			</div>
		</body>
		</html>
	`, testName, buildInfo, "刚刚", getReportLink(reportURL))

	return n.SendEmailNotification(email, subject, body)
}

// SendTestFailureNotification 发送测试失败通知
func (n *NotificationService) SendTestFailureNotification(email, testName, buildInfo, errorMsg string) error {
	subject := fmt.Sprintf("❌ 测试失败 - %s", testName)

	body := fmt.Sprintf(`
		<html>
		<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
			<div style="max-width: 600px; margin: 0 auto; padding: 20px;">
				<h2 style="color: #dc3545;">❌ 测试执行失败</h2>
				<div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
					<p><strong>测试项目:</strong> %s</p>
					<p><strong>构建信息:</strong> %s</p>
					<p><strong>执行时间:</strong> %s</p>
				</div>
				<div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #dc3545;">
					<p><strong>错误信息:</strong></p>
					<pre style="white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 14px;">%s</pre>
				</div>
				<hr style="margin: 20px 0;">
				<p style="color: #6c757d; font-size: 12px;">
					本邮件由 CRAT 自动化测试平台自动发送，请勿回复。
				</p>
			</div>
		</body>
		</html>
	`, testName, buildInfo, "刚刚", errorMsg)

	return n.SendEmailNotification(email, subject, body)
}

func getReportLink(reportURL string) string {
	if reportURL != "" {
		return fmt.Sprintf(`
			<div style="text-align: center; margin: 20px 0;">
				<a href="%s" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
					查看测试报告
				</a>
			</div>
		`, reportURL)
	}
	return ""
}
