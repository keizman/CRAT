-- 删除旧的表和字段的迁移脚本
-- 执行前请备份数据库

-- 1. 删除 test_items 表中的 associated_request_id 字段
ALTER TABLE test_items DROP COLUMN IF EXISTS associated_request_id;

-- 2. 删除 test_runs 表
DROP TABLE IF EXISTS test_runs;

-- 3. 删除 request_templates 表
DROP TABLE IF EXISTS request_templates;

-- 4. 更新示例数据，移除 associated_request_id 字段
DELETE FROM test_items WHERE id IN (1, 2);

-- 重新插入更新的测试项数据
INSERT INTO test_items (name, description, associated_job_name, notification_enabled) VALUES
('cds', 'CDS服务自动化测试', 'CDN_CORE', true),
('uat-test', 'UAT环境测试', 'CDN_SsgAgent', true)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    associated_job_name = EXCLUDED.associated_job_name,
    notification_enabled = EXCLUDED.notification_enabled;
