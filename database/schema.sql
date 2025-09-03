-- crat 数据库表结构

-- 1. 构建信息表
CREATE TABLE build_info (
    id BIGSERIAL PRIMARY KEY,
    job_name VARCHAR(255) NOT NULL,
    build_number INTEGER NOT NULL,
    package_path TEXT NOT NULL,
    build_user VARCHAR(255) DEFAULT 'None',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    raw_data JSONB
);

-- 创建索引
CREATE INDEX idx_build_info_job_name ON build_info(job_name);
CREATE INDEX idx_build_info_created_at ON build_info(created_at DESC);

-- 2. 测试项表
CREATE TABLE test_items (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    associated_job_name VARCHAR(255),
    notification_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    associated_parameter_set_id BIGINT REFERENCES parameter_sets(id) ON DELETE SET NULL
);

-- 创建索引
CREATE INDEX idx_test_items_job_name ON test_items(associated_job_name);

-- 3. 系统设置表
CREATE TABLE system_settings (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入默认系统设置
INSERT INTO system_settings (key, value, description) VALUES
('project_name', 'Autotest Platform', '项目名称'),
('package_build_info_base_url', 'http://127.0.0.1:8080/job/', 'Jenkins构建信息基础URL'),
('package_download_base_url', 'http://127.0.0.1/build/', '包下载基础URL'),
('external_test_server_url', 'http://10.8.24.59:8000', '外部测试服务器URL');

-- 4. 用户会话表 (简单认证)
CREATE TABLE user_sessions (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- 创建索引
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_email ON user_sessions(email);

-- 5. 参数集合表
CREATE TABLE parameter_sets (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    parameters JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_parameter_sets_name ON parameter_sets(name);

-- 6. 部署测试运行表
CREATE TABLE deploy_test_runs (
    id BIGSERIAL PRIMARY KEY,
    test_item_id BIGINT REFERENCES test_items(id) ON DELETE CASCADE,
    build_info_id BIGINT REFERENCES build_info(id) ON DELETE CASCADE,
    triggered_by VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    download_url TEXT,
    download_path TEXT,
    task_id VARCHAR(255),
    report_url TEXT,
    steps JSONB DEFAULT '[]',
    max_query_hours INTEGER DEFAULT 3,
    query_interval INTEGER DEFAULT 60,
    query_timeout INTEGER DEFAULT 30,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    error_message TEXT,
    response_raw_data JSONB,
    parameter_set_id BIGINT REFERENCES parameter_sets(id) ON DELETE SET NULL
);

-- 创建索引
CREATE INDEX idx_deploy_test_runs_test_item_id ON deploy_test_runs(test_item_id);
CREATE INDEX idx_deploy_test_runs_build_info_id ON deploy_test_runs(build_info_id);
CREATE INDEX idx_deploy_test_runs_status ON deploy_test_runs(status);
CREATE INDEX idx_deploy_test_runs_started_at ON deploy_test_runs(started_at DESC);

-- 7. Job版本选择表
CREATE TABLE IF NOT EXISTS job_version_selections (
    id BIGSERIAL PRIMARY KEY,
    job_name VARCHAR(255) UNIQUE NOT NULL,
    selected_build_id BIGINT REFERENCES build_info(id) ON DELETE SET NULL,
    auto_sync_enabled BOOLEAN DEFAULT true,
    last_sync_time TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_job_version_selections_job_name ON job_version_selections(job_name);

-- 插入示例数据

-- 示例构建信息
INSERT INTO build_info (job_name, build_number, package_path, build_user) VALUES
('CDN_CORE', 101, '/builds/CDN_CORE/101/cdn_core_v1.2.3.tar.gz', 'JenkinsUser'),
('CDN_SsgAgent', 55, '/builds/CDN_SsgAgent/55/ssgagent_v2.0.0.tar.gz', 'CI');

-- 插入默认参数集合
INSERT INTO parameter_sets (name, description, parameters) VALUES 
(
    'default', 
    'Default test parameters',
    '{
        "service_name": "",
        "install_dir": "",
        "upgrade_type": "full",
        "test_path": "",
        "base_url": "http://10.8.24.59:59996",
        "report_keyword": ""
    }'
);

-- 示例测试项
INSERT INTO test_items (name, description, associated_job_name, notification_enabled) VALUES
('cds', 'CDS服务自动化测试', 'CDN_CORE', true),
('uat-test', 'UAT环境测试', 'CDN_SsgAgent', true)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    associated_job_name = EXCLUDED.associated_job_name,
    notification_enabled = EXCLUDED.notification_enabled;

-- 初始化job版本选择（选择每个job的最新构建）
INSERT INTO job_version_selections (job_name, selected_build_id, last_sync_time)
SELECT 
    bi.job_name,
    bi.id as selected_build_id,
    NOW() as last_sync_time
FROM (
    SELECT DISTINCT job_name,
           FIRST_VALUE(id) OVER (PARTITION BY job_name ORDER BY created_at DESC) as id
    FROM build_info
) bi
ON CONFLICT (job_name) DO NOTHING;