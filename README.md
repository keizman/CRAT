# CRAT - CDN 自动化测试触发平台

一个接收 CI 系统（如 Jenkins）构建信息的 Web 平台，允许用户管理构建版本、配置并触发自动化部署测试，同时监控测试结果并发送通知。

## 核心功能

- **构建信息管理**: 接收并存储来自Jenkins的构建信息
- **部署测试**: 完整的自动化部署测试流程，包括下载、部署、测试和监控
- **用户认证**: 基于JWT的用户认证系统
- **系统管理**: 灵活的系统设置管理
- **实时监控**: 部署测试步骤级别的状态追踪
- **通知系统**: 邮件通知测试结果

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
│   ├── deploy_test_run.go               # 部署测试运行模型
│   ├── system_setting.go               # 系统设置模型
│   └── user_session.go                  # 用户会话模型
│
├── controllers/                         # 控制器
│   ├── auth.go                          # 认证相关
│   ├── build_info.go                    # 构建信息接口
│   ├── test_item.go                     # 测试项接口
│   └── system_setting.go               # 系统设置接口
│
├── services/                            # 业务逻辑服务
│   ├── build_service.go                 # 构建信息服务
│   ├── deploy_test_service.go           # 部署测试服务 (核心服务)
│   ├── notification_service.go          # 通知服务
│   ├── http_client.go                   # HTTP客户端服务
│   └── system_utils.go                  # 系统工具服务
│
├── middleware/                          # 中间件
│   ├── auth.go                          # 认证中间件
│   ├── cors.go                          # CORS 中间件
│   └── logger.go                        # 日志中间件
│
├── database/                            # 数据库相关
│   ├── schema.sql                       # 数据库表结构
│   └── migration_remove_old_tables.sql # 数据库迁移脚本
│
├── web/                                 # 前端 Web 资源
│   ├── index.html                       # 主页面
│   ├── login.html                       # 登录页面
│   └── assets/                          # 静态资源
│       ├── css/
│       │   └── main.css                 # 主样式文件
│       └── js/
│           ├── main.js                  # 主逻辑
│           ├── auth.js                  # 认证相关
│           ├── api.js                   # API 调用
│           └── components/              # UI 组件
│               ├── build-info.js        # 构建信息组件
│               ├── test-trigger.js      # 测试触发组件
│               └── settings.js          # 设置组件
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

## 快速开始

### 1. 克隆项目
```bash
git clone <repository-url>
cd crat2
```

### 2. 后端启动
```bash
# 安装Go依赖
go mod tidy

# 配置环境变量文件
cp .env.example .env
# 编辑 .env 文件，配置数据库连接等信息

# 运行后端服务 (端口6000)
go run main.go
```

### 3. 前端开发
```bash
# 进入前端目录
cd web

# 安装前端依赖
npm install

# 启动前端开发服务器 (端口3000，带热重载)
npm run dev

# 或构建生产版本
npm run build
```

### 4. 访问应用
- 开发环境: http://localhost:3000 (前端开发服务器)
- 生产环境: http://localhost:6000 (后端直接提供静态文件)

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

### 4.4 触发部署测试
```
POST /api/v1/test-items/{id}/deploy-test  # 触发部署测试
```

请求示例:
```json
{
  "build_info_id": 123
}
```

### 4.5 获取部署测试历史
```
GET /api/v1/test-items/{id}/deploy-runs    # 获取部署测试运行历史
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

### 2. 部署测试流程 (新架构)
1. 用户登录 CRAT 平台
2. 在"触发执行"页面选择测试项
3. 选择要测试的构建版本
4. 点击"触发测试"按钮
5. 系统异步执行完整的部署测试流程:
   - **下载阶段**: 根据测试项名称自动构建下载URL，下载包文件到本地
   - **部署测试阶段**: 发送请求到外部测试服务器的 `/api/deploy_and_test` 接口
   - **监控阶段**: 持续查询测试进度，支持步骤级别的状态追踪
   - **通知阶段**: 发送邮件通知测试结果

## 数据库表说明

### build_info (构建信息表)
- 存储从 Jenkins 发送的构建信息
- 按 job_name 和创建时间建立索引

### test_items (测试项表) 
- 定义可触发的测试项目
- 关联到特定的 Jenkins Job
- 移除了对请求模板的依赖

### deploy_test_runs (部署测试运行表)
- 记录部署测试的完整生命周期
- 包含下载、部署、测试、监控各个步骤的详细状态
- 支持步骤级别的错误追踪和时间记录

### system_settings (系统设置表)
- 存储平台全局配置
- 支持动态修改

### user_sessions (用户会话表)
- 简单的用户认证系统

## 认证系统架构分析

### user_sessions 表的设计理念

本项目采用了 **JWT + Session Store 的混合认证机制**，`user_sessions` 表是这一设计的核心组件。

#### 表结构
```sql
CREATE TABLE user_sessions (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,  -- 存储JWT令牌
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);
```

#### 认证流程
```
用户登录 → 生成JWT → 存储到user_sessions表 → 后续请求验证JWT + 数据库记录
```

### 设计优势 ✅

1. **安全性增强**
   - 结合了JWT无状态特性和Session可控性
   - 支持主动撤销令牌，即使JWT被盗用也能通过删除数据库记录使其失效
   - 防止令牌重放攻击

2. **会话控制**
   - 实现单点登录：用户登录时删除旧session，确保只能在一处登录
   - 管理员可以强制用户下线
   - 支持并发登录控制

3. **审计友好**
   - 记录用户登录历史和会话时长
   - 便于追踪用户行为和安全审计

4. **灵活的权限管理**
   - 支持管理员和普通用户角色区分
   - 便于扩展更复杂的权限系统

### 设计权衡 ⚠️

1. **性能考量**
   - 每次API请求都需要查询数据库验证session
   - 对于内部系统和中等用户量，性能影响可接受
   - 如果并发量增长，可考虑Redis缓存优化

2. **复杂性平衡**
   - 相比纯JWT，增加了数据库依赖
   - 但获得了会话控制和安全性提升
   - 对于需要强制下线功能的系统，这种复杂性是值得的

3. **扩展性考虑**
   - 分布式环境需要共享数据库
   - 当前设计适合单体应用或小规模分布式系统

### 替代方案对比

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| **当前设计 (JWT + DB Session)** | 安全性高、可控性强、支持撤销 | 每次请求查库、存储冗余 | 内部系统、安全要求高 |
| **纯JWT** | 无状态、高性能、易扩展 | 无法主动撤销、安全性相对较低 | 高并发、大用户量系统 |
| **Redis Session Store** | 高性能缓存、支持TTL、分布式友好 | 需要额外Redis服务 | 高并发系统 |
| **JWT + 黑名单** | 保持无状态、仅撤销时查询 | 仍需存储层、实现复杂 | 需要撤销但希望减少查询 |
| **短期JWT + Refresh Token** | 安全性和性能兼顾 | 实现复杂度高 | 高安全性要求的系统 |

### 针对本项目的评估

**为什么当前设计是合适的：**

1. **项目特点匹配**
   - 自动化测试触发平台，内部使用
   - 用户规模有限，性能压力不大
   - 有管理员权限区分，安全性要求较高

2. **功能需求满足**
   - 需要强制下线功能（管理员管理）
   - 需要防止并发登录
   - 需要会话审计

3. **维护成本合理**
   - 实现相对简单
   - 不需要额外的缓存服务
   - 便于问题排查和监控

### 改进建议

1. **添加清理机制**
   ```go
   // 建议添加定期清理过期session的任务
   func CleanExpiredSessions() {
       config.DB.Where("expires_at < ?", time.Now()).Delete(&models.UserSession{})
   }
   ```

2. **考虑性能优化**
   - 如果并发量增长，可添加Redis缓存层
   - 实现session续期功能，提升用户体验

3. **监控和告警**
   - 监控session数量和数据库查询性能
   - 设置异常登录告警

4. **安全加固**
   - 考虑添加IP地址绑定
   - 实现登录失败次数限制

### 总结

对于CRAT这样的内部自动化测试平台，当前的 `user_sessions` 表设计在**安全性、功能性和实现复杂度**之间取得了良好平衡。它提供了必要的会话控制功能，同时保持了实现的简洁性。

随着系统发展，如果用户量大幅增长或对性能有更高要求，可以考虑迁移到Redis Session Store或其他高性能方案，但当前设计完全满足项目需求。

## 功能特性

### 部署测试 (核心功能)
部署测试是一个完整的自动化流程，包含以下步骤：

1. **下载阶段 (DOWNLOADING)**
   - 根据 test_items.name (如 cds) 自动构建下载URL
   - 使用 curl 方式获取目录列表，匹配对应的包文件
   - 下载包文件到本地 /tmp 目录
   - 验证文件完整性

2. **部署测试阶段 (TESTING)**
   - 发送请求到外部测试服务器的 `/api/deploy_and_test` 接口
   - 传递服务名称、包路径、安装目录等参数
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
- `TESTING`: 正在执行测试
- `MONITORING`: 正在监控测试进度
- `COMPLETED`: 测试完成
- `FAILED`: 测试失败

### 步骤级追踪
每个部署测试运行都会记录详细的步骤信息：
- 步骤名称、状态、开始时间、结束时间
- 步骤详情和错误信息
- 支持前端查看详细的执行过程

## 系统配置

系统支持以下可配置参数：
- `package_download_base_url`: 包下载基础URL
- `external_test_server_url`: 外部测试服务器URL
- `project_name`: 项目名称

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

## 架构更新说明

### 简化后的架构
在最新版本中，我们简化了系统架构，移除了复杂的请求模板机制，采用内置的部署测试逻辑：

**移除的组件：**
- `test_service.go` - 旧的基于模板的测试服务
- `request_template.go` - 请求模板模型
- `test_run.go` - 旧的测试运行记录模型
- 相关的API路由和前端功能

**保留并增强的组件：**
- `deploy_test_service.go` - 核心的部署测试服务
- `deploy_test_run.go` - 部署测试运行记录
- 统一的前端"触发测试"按钮（现在调用部署测试API）

### 用户体验改进
- **一致的界面**: 用户仍然看到"触发测试"按钮，无需了解底层架构变化
- **更强大的功能**: 所有测试都使用完整的部署测试流程
- **更好的监控**: 步骤级别的状态追踪和详细的错误信息
- **简化的配置**: 无需配置复杂的请求模板

### 数据库迁移
如果您正在从旧版本升级，请执行以下迁移脚本：
```sql
-- 执行 database/migration_remove_old_tables.sql
-- 这将删除旧的表结构并更新测试项配置
```

### 开发建议
- 新的部署测试是异步执行的，确保外部测试服务器能够处理长时间运行的任务
- 监控配置是可调的，可以根据实际测试时长调整参数
- 所有测试状态和步骤都有详细记录，便于问题排查

---

## 版本历史

### v2.0.0 (当前版本)
- 🔄 架构重构：移除请求模板，统一使用部署测试
- 🚀 功能增强：完整的下载-部署-测试-监控流程
- 📊 监控改进：步骤级别的状态追踪
- 🎯 用户体验：简化的界面，保持一致的操作方式
- 🗄️ 数据库优化：移除冗余表，简化数据结构

### v1.x.x (已弃用)
- 基于请求模板的测试触发机制
- 分离的普通测试和部署测试功能

---

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

**注意**: 首次部署时记得修改 `.env` 文件中的数据库连接字符串和其他敏感配置信息。新版本的架构更加简洁高效，推荐升级到最新版本。
