# CRAT - CDN 自动化测试触发平台

一个接收 CI 系统（如 Jenkins）构建信息的 Web 平台，允许用户管理构建版本、配置并触发对指定版本的自动化测试，同时监控测试结果并发送通知。

## 项目结构

```
crat/
├── main.go                              # Go 应用入口
├── .env                                 # 环境配置文件
├── go.mod                               # Go 模块文件
├── go.sum                               # Go 依赖版本锁定
├── README.md                            # 项目说明文档
├── 
├── config/                              # 配置相关
│   ├── config.go                        # 配置加载和管理
│   └── database.go                      # 数据库连接配置
│
├── models/                              # 数据模型
│   ├── build_info.go                    # 构建信息模型
│   ├── test_item.go                     # 测试项模型
│   ├── test_run.go                      # 测试执行历史模型
│   ├── deploy_test_run.go               # 部署测试运行模型
│   ├── request_template.go              # 请求模板模型
│   ├── system_setting.go               # 系统设置模型
│   └── user_session.go                  # 用户会话模型
│
├── controllers/                         # 控制器
│   ├── auth.go                          # 认证相关
│   ├── build_info.go                    # 构建信息接口
│   ├── test_item.go                     # 测试项接口
│   ├── system_setting.go               # 系统设置接口
│   └── webhook.go                       # Jenkins Webhook接口
│
├── services/                            # 业务逻辑服务
│   ├── build_service.go                 # 构建信息服务
│   ├── test_service.go                  # 测试执行服务
│   ├── deploy_test_service.go           # 部署测试服务
│   ├── notification_service.go          # 通知服务
│   └── http_client.go                   # HTTP客户端服务
│
├── middleware/                          # 中间件
│   ├── auth.go                          # 认证中间件
│   ├── cors.go                          # CORS 中间件
│   └── logger.go                        # 日志中间件
│
├── database/                            # 数据库相关
│   ├── schema.sql                       # 数据库表结构
│   ├── migrations/                      # 数据库迁移文件
│   └── seed.sql                         # 初始数据
│
├── web/                                 # 前端 Web 资源
│   ├── index.html                       # 主页面
│   ├── login.html                       # 登录页面
│   ├── assets/                          # 静态资源
│   │   ├── css/
│   │   │   ├── main.css                 # 主样式文件
│   │   │   └── components.css           # 组件样式
│   │   ├── js/
│   │   │   ├── main.js                  # 主逻辑
│   │   │   ├── auth.js                  # 认证相关
│   │   │   ├── api.js                   # API 调用
│   │   │   ├── components/              # UI 组件
│   │   │   │   ├── build-info.js        # 构建信息组件
│   │   │   │   ├── test-trigger.js      # 测试触发组件
│   │   │   │   └── settings.js          # 设置组件
│   │   │   └── utils/
│   │   │       ├── utils.js             # 工具函数
│   │   │       └── animation.js         # 动画效果
│   │   └── images/                      # 图片资源
│   └── components/                      # 可复用的前端组件模板
│
├── logs/                                # 日志文件目录
│   └── app.log
│
└── not_in_porject_trigger_server.py     # 外部测试服务器 (参考)
```

## 技术栈

### 后端
- **语言**: Go 1.21+
- **Web框架**: Gin
- **ORM**: GORM
- **配置管理**: Viper
- **数据库**: PostgreSQL 13+
- **认证**: JWT Token

### 前端
- **基础**: HTML5 + CSS3 + JavaScript (ES6+)
- **CSS框架**: TailwindCSS 3.0+ (CDN)
- **动画**: Framer Motion (CDN)
- **图标**: Font Awesome (CDN)
- **图表**: Chart.js (CDN)

### 数据库
- **主数据库**: PostgreSQL
- **连接池**: GORM 内置

## 安装和部署

### 1. 环境准备

#### 1.1 数据库设置
```sql
-- 创建数据库
CREATE DATABASE crat;

-- 创建用户（可选）
CREATE USER crat_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE crat TO crat_user;
```

#### 1.2 导入数据库表结构
```bash
psql -h 192.168.1.117 -U postgres -d crat -f database/schema.sql
```

### 2. 配置文件

创建 `.env` 文件:

```env
# Server
PORT=6000
DEBUG=false

# Auth
ADMIN_PASSWD=123456

# Database (PostgreSQL)
SQL_DSN=postgres://postgres:098lkj.@192.168.1.117:5432/crat
SQL_MAX_IDLE_CONNS=100
SQL_MAX_OPEN_CONNS=1000
SQL_MAX_LIFETIME=60

# Email Notification (SMTP)
EMAIL_SEND_USERNAME=user@example.com
EMAIL_SEND_PASSWORD=your_password
EMAIL_SEND_SERVER=smtp.exmail.qq.com
EMAIL_SEND_SERVER_PORT=465

# External Services
EXTERNAL_TEST_SERVER_URL=http://192.168.1.118:59996
```

### 3. 编译和运行

```bash
# 初始化 Go 模块
go mod init crat

# 下载依赖
go mod tidy

# 编译
go build -o crat main.go

# 运行
./crat
```

或者直接运行:
```bash
go run main.go
```

### 4. 验证部署

访问 `http://localhost:6000` 应该能看到登录页面。

## API 接口

### 4.1 构建信息接口 (Jenkins Webhook)
```
POST /api/v1/builds
```
接收 Jenkins 构建信息，示例请求:
```json
{
  "BUILD_USER": "JenkinsUser",
  "JOB_NAME": "CDN_CORE",
  "PACKAGE_PATH": "/builds/CDN_CORE/101/cdn_core_v1.2.3.tar.gz",
  "BUILD_NUMBER": "101"
}
```

### 4.2 获取构建信息列表
```
GET /api/v1/builds?job_name=CDN_CORE&limit=10
```

### 4.3 测试项管理
```
GET /api/v1/test-items         # 获取测试项列表
POST /api/v1/test-items        # 创建测试项
PUT /api/v1/test-items/{id}    # 更新测试项
DELETE /api/v1/test-items/{id} # 删除测试项
```

### 4.4 触发测试
```
POST /api/v1/test-items/{id}/trigger  # 触发普通测试
POST /api/v1/test-items/{id}/deploy-test  # 触发部署测试
```

请求示例:
```json
{
  "build_info_id": 123
}
```

### 4.5 获取测试历史
```
GET /api/v1/test-items/{id}/runs           # 获取普通测试运行历史
GET /api/v1/test-items/{id}/deploy-runs    # 获取部署测试运行历史
GET /api/v1/test-runs/{run_id}             # 获取普通测试运行详情
GET /api/v1/deploy-test-runs/{run_id}      # 获取部署测试运行详情
```

### 4.6 系统设置
```
GET /api/v1/settings           # 获取系统设置
PUT /api/v1/settings           # 更新系统设置
```

## Jenkins 配置

### 在 Jenkins Job 中添加 Post-build Actions

1. 选择 "HTTP Request" 或使用 curl 命令
2. 配置如下:

**使用 HTTP Request Plugin:**
- URL: `http://your-crat-server:6000/api/v1/builds`
- HTTP Mode: POST
- Content Type: application/json
- Request Body:
```json
{
  "BUILD_USER": "${BUILD_USER}",
  "JOB_NAME": "${JOB_NAME}",
  "PACKAGE_PATH": "${PACKAGE_PATH}",
  "BUILD_NUMBER": "${BUILD_NUMBER}"
}
```

**使用 Shell 命令:**
```bash
curl -X POST -H "Content-Type: application/json" \
     -d "{
           \"BUILD_USER\": \"${BUILD_USER}\",
           \"JOB_NAME\": \"${JOB_NAME}\",
           \"PACKAGE_PATH\": \"${PACKAGE_PATH}\",
           \"BUILD_NUMBER\": \"${BUILD_NUMBER}\"
         }" \
     "http://your-crat-server:6000/api/v1/builds"
```

## 用户角色

### 管理员 (Admin)
- 邮箱: 任意
- 密码: 在 `.env` 文件中配置的 `ADMIN_PASSWD`
- 权限: 所有功能，包括系统设置、用户管理、测试配置等

### 普通用户 (User)
- 邮箱: 任意有效邮箱
- 密码: 留空（无需密码验证）
- 权限: 查看构建信息、测试历史，触发已配置的测试

## 工作流程

### 1. Jenkins 构建流程
1. Jenkins 执行构建任务
2. 构建完成后，通过 Webhook 发送构建信息到 CRAT 平台
3. CRAT 平台接收信息并存储到 `build_info` 表

### 2. 测试触发流程
1. 用户登录 CRAT 平台
2. 在"触发执行"页面选择测试项
3. 选择要测试的构建版本
4. 点击"触发测试"按钮
5. 系统异步执行以下步骤:
   - 创建 `test_runs` 记录，状态为 PENDING
   - 从模板构建 HTTP 请求，替换变量
   - 发送请求到外部测试服务器
   - 监控测试执行状态
   - 更新测试结果和状态
   - 发送邮件通知（如果启用）

## 数据库表说明

### build_info (构建信息表)
- 存储从 Jenkins 发送的构建信息
- 按 job_name 和创建时间建立索引

### test_items (测试项表) 
- 定义可触发的测试项目
- 关联到特定的 Jenkins Job 和请求模板

### request_templates (请求模板表)
- 定义向外部测试服务发送的 HTTP 请求模板
- 支持变量替换（如 {JOB_NAME}, {BUILD_NUMBER}）

### test_runs (测试执行历史表)
- 记录每次测试触发的详细历史
- 包含状态、结果、报告链接等

### deploy_test_runs (部署测试运行表)
- 记录部署测试的完整生命周期
- 包含下载、部署、测试、监控各个步骤的详细状态
- 支持步骤级别的错误追踪和时间记录

### system_settings (系统设置表)
- 存储平台全局配置
- 支持动态修改

## 功能特性

### 普通测试
- 直接调用外部测试服务器的 API
- 适用于简单的测试场景
- 快速响应，无需本地资源

### 部署测试 (新增功能)
部署测试是一个完整的自动化流程，包含以下步骤：

1. **下载阶段 (DOWNLOADING)**
   - 根据 test_items.name (如 cds) 自动构建下载URL
   - 使用 curl 方式获取目录列表，匹配对应的包文件
   - 下载包文件到本地 /tmp 目录
   - 验证文件完整性

2. **部署测试阶段 (TESTING)**
   - 发送请求到外部测试服务器的 `/api/deploy_and_test` 接口
   - 获取返回的 task_id

3. **监控阶段 (MONITORING)**
   - 持续查询 `/api/tasks/{task_id}` 接口
   - 查询间隔：1分钟 (可配置)
   - 超时时间：30秒 (可配置)
   - 最大监控时长：3小时 (可配置)
   - 等待状态变为 `completed` 时提取 `report_url`

4. **通知阶段 (NOTIFY)**
   - 根据测试结果发送成功或失败通知
   - 包含报告链接和详细错误信息

### 状态追踪
部署测试支持以下状态：
- `PENDING`: 等待开始
- `DOWNLOADING`: 正在下载包文件
- `DOWNLOADED`: 包文件下载完成
- `DEPLOYING`: 正在部署
- `TESTING`: 正在执行测试
- `MONITORING`: 正在监控测试进度
- `COMPLETED`: 测试完成
- `FAILED`: 测试失败

### 步骤级追踪
每个部署测试运行都会记录详细的步骤信息：
- 步骤名称、状态、开始时间、结束时间
- 步骤详情和错误信息
- 支持前端查看详细的执行过程

## 变量替换

在请求模板中支持以下变量:
- `{JOB_NAME}`: Jenkins Job 名称
- `{BUILD_NUMBER}`: 构建号
- `{PACKAGE_PATH}`: 包路径
- `{BUILD_USER}`: 构建用户
- `{PACKAGE_DOWNLOAD_URL}`: 完整包下载 URL
- `{PACKAGE_BUILD_INFO_URL}`: 构建信息 URL
- `{EXTERNAL_TEST_SERVER_URL}`: 外部测试服务器 URL

## 通知配置

目前支持 SMTP 邮件通知:
- 测试成功时发送通知到触发用户邮箱
- 需要在 `.env` 文件中配置 SMTP 服务器信息

## 开发说明

### 开发环境启动
```bash
# 启动开发模式（自动重载）
go run main.go

# 或者使用 air (需要先安装)
air
```

### 前端开发
前端使用原生 JavaScript + TailwindCSS，无需复杂的构建过程。
直接修改 `web/` 目录下的文件即可。

### 数据库迁移
如需修改数据库结构，请:
1. 在 `database/migrations/` 目录下创建新的迁移文件
2. 按照版本号命名：`001_initial.sql`, `002_add_new_table.sql` 等

## 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查 `.env` 文件中的数据库配置
   - 确认 PostgreSQL 服务正在运行
   - 检查网络连接和防火墙设置

2. **Jenkins Webhook 不工作**
   - 检查 CRAT 服务是否在运行
   - 确认网络连接
   - 查看 Jenkins 的 Post-build Actions 日志

3. **测试触发失败**
   - 检查外部测试服务器是否可访问
   - 确认请求模板配置正确
   - 查看应用日志了解详细错误信息

4. **邮件通知不工作**
   - 检查 SMTP 配置
   - 确认邮箱服务器允许应用登录
   - 可能需要使用应用专用密码

### 日志查看
```bash
# 查看应用日志
tail -f logs/app.log

# 查看实时日志（如果使用 systemd）
journalctl -f -u crat
```

## 许可证

MIT License

## 贡献

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 联系方式

如有问题或建议，请通过以下方式联系:
- 创建 GitHub Issue
- 发送邮件到: admin@example.com

---

**注意**: 首次部署时记得修改 `.env` 文件中的数据库连接字符串和其他敏感配置信息。
