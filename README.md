[TOC]

# CRAT - CDN 自动化测试触发平台

一个接收 CI 系统（如 Jenkins）构建信息的 Web 平台，允许用户管理构建版本、配置并触发自动化部署测试，同时监控测试结果并发送通知。

## 这个项目想解决什么问题
在开发人员自测版本情况下， 希望能由自动化测试来保障基本功能正常， 但在频繁的版本发布环境中，开发人员面临着自动化测试执行门槛过高的问题

**传统命令行方式的痛点：**
- 需要记忆复杂的命令参数和执行步骤
- 长时间不使用后容易遗忘操作方法
- 环境配置繁琐，增加了执行成本
- **结果导致开发人员因某些因素很少执行自动化测试, 面临着测试自动化无用的局面**

**Web界面解决方案：**
- 提供简洁直观的可视化操作界面
- 一键触发测试，无需记忆复杂命令
- 自动化参数配置，降低使用门槛


**步骤**
- 1.jenkins 构建版本成功后到 /builds 页面确认版本已同步（需在主界面通过已有的邮箱进行登录-无需密码）
- 2./tests  页面确认选中的是刚刚构建的版本，点击 触发测试按钮
- 3.等待收到邮箱信息后查看统计结果
有任何问题随时反馈

## 这个项目的设计路径是什么
> **项目简称**：以下将此平台简称为 **CRAT** (CDN Regression Automation Trigger)

### 演进路线
#### V1 原型方案
- **核心思路**：在 Jenkins 构建页面直接集成测试选项

希望直接在 jenkins build page 添加一个单选项， 以此让开发在构建时直接勾选即可测试。 但依旧需要又收集测试报告， 通知构建人且无论如何不能影响构建时长和构建结果。 这些问题的解决可能需要一个新的 server 端来实现

#### V2 最终方案
v2：解决 v1 的问题依旧需要一个平台， 那何不直接全部都由平台触发，jenkins 只充当一个通知的作用（通过 http 请求附带构建包信息参数）， 虽然开发/测试执行人员依旧需要移步新平台，但好处明显，新平台与 jenkins 平台完全解耦

> **平台原理示意图**详见 [工作流程](#工作流程) 章节，**Jenkins 集成配置**请参见 [Jenkins 配置](#jenkins-配置) 章节

## 核心功能

- **构建信息管理**: 接收并存储来自Jenkins的构建信息
- **版本管理**: 独立的作业版本选择和自动同步机制
- **参数配置**: 灵活的测试参数集管理系统
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
│   ├── user_session.go                  # 用户会话模型
│   ├── job_version_selection.go         # 作业版本选择模型
│   └── parameter_set.go                 # 参数集模型
│
├── controllers/                         # 控制器
│   ├── auth.go                          # 认证相关
│   ├── build_info.go                    # 构建信息接口
│   ├── test_item.go                     # 测试项接口
│   ├── system_setting.go               # 系统设置接口
│   ├── job_version.go                   # 作业版本管理接口
│   └── parameter_set.go                 # 参数集管理接口
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
│               ├── settings.js          # 设置组件
│               └── parameter-sets.js   # 参数集管理组件
│

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
- **构建工具**: Vite 5.0+ (现代化构建系统)
- **CSS框架**: TailwindCSS 3.3.6+ 集成PostCSS和Autoprefixer
- **动画**: Framer Motion 11.0+
- **图表**: Chart.js 4.4.0+
- **包管理**: npm with ES6 modules
- **代码优化**: Terser压缩，支持Legacy浏览器兼容

### 数据库
- **主数据库**: PostgreSQL
- **连接池**: GORM 内置

## 快速开始

### 1. 克隆项目
```bash
git clone <repository-url>

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
- 生产环境: http://localhost:8000 (后端直接提供静态文件)

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
psql -h 10.8.24.117 -U postgres -d crat -f database/schema.sql
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
SQL_DSN=postgres://postgres:098lkj.@10.8.24.117:5432/crat
SQL_MAX_IDLE_CONNS=100
SQL_MAX_OPEN_CONNS=1000
SQL_MAX_LIFETIME=60

# Email Notification (SMTP)
EMAIL_SEND_USERNAME=user@example.com
EMAIL_SEND_PASSWORD=your_password
EMAIL_SEND_SERVER=smtp.exmail.qq.com
EMAIL_SEND_SERVER_PORT=465

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

访问 `http://localhost:8000` 看到登录页面。

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
  "PACKAGE_PATH": "CDN/pass/20250613-master-27580974441fd35aa299d78a392aa4b59b018c27/el7", //is a nginx path
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

### 4.7 作业版本管理
```
GET /api/v1/job-versions                    # 获取所有作业版本选择
GET /api/v1/job-versions/{job_name}         # 获取指定作业的版本选择
PUT /api/v1/job-versions                    # 设置作业版本选择
POST /api/v1/job-versions/{job_name}/sync   # 同步作业到最新版本
DELETE /api/v1/job-versions/{job_name}      # 删除作业版本选择
POST /api/v1/job-versions/auto-sync         # 自动同步所有启用的作业版本
```

设置版本选择示例:
```json
{
  "job_name": "CDN_CORE",
  "build_id": 123,
  "auto_sync": true
}
```

### 4.8 参数集管理
```
GET /api/v1/parameter-sets      # 获取参数集列表
POST /api/v1/parameter-sets     # 创建参数集
GET /api/v1/parameter-sets/{id} # 获取参数集详情
PUT /api/v1/parameter-sets/{id} # 更新参数集
DELETE /api/v1/parameter-sets/{id} # 删除参数集
```



## Jenkins 配置

### 在 Jenkins Job 中添加 Post-build Actions/excute shell 来实现发送请求数据

1. 选择 "HTTP Request" 或使用 curl 命令
2. 配置如下:

**使用 HTTP Request Plugin:**
- URL: `http://your-crat-server:8000/api/v1/builds`
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
     "http://your-crat-server:8000/api/v1/builds"
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

## 系统界面展示

以下是 CRAT 平台的主要界面截图，展示了完整的功能操作流程：

### 1. 用户登录界面
![登录页面](image/login.png)

支持两种用户角色登录：
- **管理员**: 使用邮箱 + 密码方式登录，拥有完整系统管理权限
- **普通用户**: 仅使用邮箱登录（无需密码），可查看和触发测试

### 2. 构建信息管理
![构建信息页面](image/build_info.png)

构建信息页面显示：
- Jenkins 自动同步的构建版本信息
- 构建用户、作业名称、构建号等详细信息
- 支持按作业名称筛选和分页浏览
- 实时同步最新的 CI/CD 构建结果

### 3. 测试触发执行
![测试触发页面](image/trigger_test.png)

测试触发页面功能：
- 选择要测试的服务项目
- 关联已配置的参数集进行自动化测试
- 一键触发部署测试流程
- 实时查看测试执行状态和历史记录

### 4. HTTP参数配置
![参数配置页面](image/set_http_parameter.png)

参数集管理功能：
- 创建和管理可重用的测试参数模板
- 支持服务名称、安装目录、升级类型等配置
- JSON格式灵活存储各种测试参数
- 参数集与测试项关联，实现配置复用

### 5. 系统设置管理
![系统设置页面](image/settings.png)

系统设置页面包含：
- 项目基础信息配置（项目名称、描述等）
- 包下载服务器地址配置
- 外部测试服务器URL设置
- 邮件通知相关配置
- 支持动态修改，无需重启服务


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

### job_version_selections (作业版本选择表)
- 管理每个作业的独立版本选择
- 支持自动同步功能，24小时间隔自动选择最新构建
- 替代全局版本选择，实现多作业环境下的版本冲突解决

### parameter_sets (参数集表)
- 存储可重用的测试参数配置
- 使用JSONB格式存储灵活的参数结构
- 支持测试项关联特定参数集进行部署测试

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
   - 划分管理员和普通用户角色
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

### 作业版本管理 (新功能)
独立的作业版本选择和管理系统，解决多作业环境下的版本冲突问题：

1. **独立版本选择**
   - 每个Jenkins作业可以独立选择测试版本
   - 不再受其他作业版本选择影响
   - 支持手动选择特定构建版本

2. **自动同步机制**
   - 可配置的24小时自动同步间隔
   - 自动选择作业的最新构建版本
   - 支持启用/禁用自动同步

3. **版本状态追踪**
   - 记录最后同步时间
   - 显示当前选择的构建信息
   - 支持版本选择历史查询

### 参数集管理 (新功能)
灵活的测试参数配置管理系统：

1. **参数模板化**
   - 创建可重用的参数集模板
   - 支持JSON格式的灵活参数结构
   - 包含服务名称、安装目录、升级类型等配置

2. **参数继承**
   - 测试项可以关联特定参数集
   - 触发测试时自动应用参数集配置
   - 支持参数集的动态切换

3. **参数验证**
   - 内置参数格式验证
   - 防止删除默认参数集
   - 支持参数集的版本化管理

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

### 增强的邮件通知系统
支持丰富的HTML格式邮件通知，包含详细的测试报告信息：

1. **测试成功通知**
   - 包含项目名称和构建路径信息
   - 自动获取并展示测试报告摘要
   - 多彩饼图式的测试统计可视化
   - 通过率、执行时间等关键指标展示
   - 直接链接到完整测试报告

2. **测试失败通知**
   - 详细的错误信息和堆栈跟踪
   - 格式化的错误展示
   - 包含构建信息和执行时间

3. **报告数据集成**
   - 自动从测试报告URL获取summary.json数据
   - 支持Allure报告格式的数据解析
   - 实时统计信息（通过/失败/跳过/中断）
   - 执行时间和性能数据

4. **配置要求**
   - 需要在 `.env` 文件中配置 SMTP 服务器信息
   - 支持动态项目名称配置
   - 可配置的构建路径基础URL


### 前端开发
前端使用原生 JavaScript + TailwindCSS，无需复杂的构建过程。
直接修改 `web/` 目录下的文件即可。

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

------------


# mermaid 


```
  flowchart TD
      %% Jenkins 构建触发
      Jenkins[Jenkins CI系统] -->|POST /api/v1/builds| BuildWebhook[构建信息Webhook]
      BuildWebhook --> BuildController[BuildInfo Controller]
      BuildController --> BuildDB[(构建信息数据库)]

      %% 用户登录和认证
      User[用户] -->|邮箱登录| AuthController[认证控制器]
      AuthController --> UserSession[(用户会话表)]
      AuthController -->|JWT Token| Frontend[前端界面]

      %% 版本管理
      Frontend -->|选择构建版本| JobVersionController[作业版本控制器]
      JobVersionController --> JobVersionDB[(作业版本选择表)]
      JobVersionController -->|自动同步| BuildDB

      %% 参数集管理
      Frontend -->|配置测试参数| ParameterController[参数集控制器]
      ParameterController --> ParameterDB[(参数集表)]

      %% 测试项管理
      Frontend -->|管理测试项| TestItemController[测试项控制器]
      TestItemController --> TestItemDB[(测试项表)]
      TestItemDB -->|关联| ParameterDB
      TestItemDB -->|关联| JobVersionDB

      %% 触发部署测试
      Frontend -->|触发测试| DeployTestTrigger[部署测试触发]
      DeployTestTrigger --> DeployTestService[部署测试服务]
      DeployTestService --> DeployTestRunDB[(部署测试运行表)]

      %% 部署测试流程
      DeployTestService -->|1. 下载包| PackageDownload[包文件下载]
      PackageDownload -->|下载URL| PackageServer[包文件服务器]

      DeployTestService -->|2. 部署测试| ExternalAPI[外部测试服务器API]
      ExternalAPI -->|/api/deploy_and_test| PythonServer[Python FastAPI服务器]

      DeployTestService -->|3. 监控状态| StatusMonitor[状态监控]
      StatusMonitor -->|/api/tasks/task_id| PythonServer

      DeployTestService -->|4. 发送通知| NotificationService[通知服务]
      NotificationService -->|SMTP邮件| EmailServer[邮件服务器]

      %% 系统设置
      SystemSettings[(系统设置表)] --> DeployTestService
      SystemSettings --> NotificationService

      %% 前端界面展示
      Frontend -->|构建信息页面| BuildInfo[构建版本管理]
      Frontend -->|测试页面| TestTrigger[测试触发界面]
      Frontend -->|设置页面| Settings[系统设置]
      Frontend -->|参数集页面| ParameterSets[参数集管理]

      %% 数据库连接
      BuildDB -.-> PostgreSQLDB[(PostgreSQL数据库)]
      UserSession -.-> PostgreSQLDB
      JobVersionDB -.-> PostgreSQLDB
      ParameterDB -.-> PostgreSQLDB
      TestItemDB -.-> PostgreSQLDB
      DeployTestRunDB -.-> PostgreSQLDB
      SystemSettings -.-> PostgreSQLDB

      %% 样式
      classDef userInterface fill:#e1f5fe
      classDef controller fill:#f3e5f5
      classDef service fill:#e8f5e8
      classDef database fill:#fff3e0
      classDef external fill:#ffebee

      class User,Frontend,BuildInfo,TestTrigger,Settings,ParameterSets userInterface
      class AuthController,BuildController,JobVersionController,ParameterController,TestItemController controller
      class DeployTestService,NotificationService service
      class BuildDB,UserSession,JobVersionDB,ParameterDB,TestItemDB,DeployTestRunDB,SystemSettings,PostgreSQLDB database
      class Jenkins,PackageServer,PythonServer,EmailServer,ExternalAPI external
```


```
  flowchart TD
      %% 用户触发测试
      User[用户点击触发测试] -->|选择构建版本和参数集| Frontend[CRAT前端界面]
      Frontend -->|POST /api/v1/test-items/id/deploy-test| GoAPI[Go后端API]

      %% Go服务处理
      GoAPI --> TriggerDeployTest[TriggerDeployTest方法]
      TriggerDeployTest --> CreateRecord[创建DeployTestRun记录]
      CreateRecord --> PostgresDB[(PostgreSQL数据库)]
      TriggerDeployTest -->|异步执行| ExecuteDeployTest[executeDeployTest协程]

      %% 步骤1: 下载包文件
      ExecuteDeployTest -->|步骤1| DownloadStep[downloadPackage]
      DownloadStep -->|构建下载URL| PackageServer[包文件服务器<br/>10.8.24.117]
      PackageServer -->|下载tar.gz包| LocalFile[本地/tmp目录]
      DownloadStep -->|更新状态为DOWNLOADED| PostgresDB

      %% 步骤2: 触发外部测试
      ExecuteDeployTest -->|步骤2| TriggerExternalTest[triggerExternalTest]
      TriggerExternalTest -->|POST /api/deploy_and_test_mock| PythonServer[Python FastAPI服务器<br/>10.8.24.59:59996]

      %% Python服务器处理
      PythonServer --> ReceiveRequest[接收部署测试请求]
      ReceiveRequest --> CreateTaskID[生成UUID task_id]
      CreateTaskID -->|返回task_id| TriggerExternalTest
      TriggerExternalTest -->|保存task_id| PostgresDB

      %% Python异步执行部署和测试
      CreateTaskID -->|异步执行| CombinedTask[combined_task协程]
      CombinedTask -->|阶段1| DeployPhase[部署阶段 running:deploy]

      %% 部署阶段详细流程
      DeployPhase --> ServiceType判断服务类型
      ServiceType -->|CDS/SDS| CServiceDeploy[C服务部署<br/>upgrade_c_service]
      ServiceType -->|SSGAGENT/SLS| OpenRestyDeploy[OpenResty服务部署<br/>upgrade_openresty_service_full/update]

      %% C服务部署流程
      CServiceDeploy --> ExtractPackage[解压tar.gz包]
      ExtractPackage --> StopService[停止服务 stop.sh]
      StopService --> BackupBinary[备份现有二进制文件]
      BackupBinary --> CopyNewBinary[复制新二进制文件]
      CopyNewBinary --> CopyConfig[复制配置文件]
      CopyConfig --> SetPermissions[设置可执行权限]

      %% OpenResty服务部署流程
      OpenRestyDeploy --> ExtractPackage2[解压tar.gz包]
      ExtractPackage2 --> StopService2[停止服务 scripts/stop.sh]
      StopService2 --> BackupDir[备份整个安装目录]
      BackupDir --> MoveNewContent[移动新内容到安装目录]
      MoveNewContent --> CopyConfig2[复制配置文件]

      %% 测试阶段
      SetPermissions --> TestPhase[测试阶段 running:test]
      CopyConfig2 --> TestPhase
      TestPhase --> ExecutePytest[执行pytest测试]

      %% pytest执行流程
      ExecutePytest --> RunPytestScript[run_pytest.sh脚本]
      RunPytestScript --> PytestExecution[pytest命令执行]
      PytestExecution --> AllureResults[生成Allure结果]
      AllureResults --> GenerateReport[生成Allure HTML报告]
      GenerateReport --> NginxServer[Nginx服务器<br/>10.8.24.59:59996]
      NginxServer --> ReportURL[返回报告URL]

      %% 任务完成
      ReportURL -->|设置completed状态| TaskComplete[任务状态completed]
      TaskComplete -->|包含report_url| TaskResult[任务结果]

      %% 步骤3: Go服务监控状态
      ExecuteDeployTest -->|步骤3| MonitorProgress[monitorTestProgress]
      MonitorProgress -->|每60秒查询| StatusQuery[GET /api/tasks/task_id]
      StatusQuery --> PythonServer
      PythonServer -->|返回状态| StatusResponse[状态响应]

      %% 状态检查循环
      StatusResponse --> StatusCheck检查状态
      StatusCheck -->|pending/running| WaitAndRetry[等待60秒后重试]
      WaitAndRetry --> StatusQuery
      StatusCheck -->|completed| ExtractReportURL[提取report_url]
      StatusCheck -->|failed| HandleFailure[处理失败]
      StatusCheck -->|超时3小时| TimeoutError[超时错误]

      %% 步骤4: 发送通知
      ExtractReportURL -->|步骤4| SendNotification[sendNotification]
      SendNotification --> FetchSummary[获取测试报告摘要]
      FetchSummary -->|GET report_url/widgets/summary.json| ReportSummary[解析summary.json]
      ReportSummary --> GenerateEmail[生成HTML邮件]
      GenerateEmail -->|包含统计图表和报告链接| SMTPServer[SMTP邮件服务器]
      SMTPServer -->|发送给触发用户| UserEmail[用户邮箱]

      %% 最终状态更新
      SendNotification -->|更新最终状态| FinalUpdate[最终状态更新]
      FinalUpdate --> PostgresDB

      %% 样式定义
      classDef userAction fill:#e3f2fd
      classDef goService fill:#e8f5e8
      classDef pythonService fill:#fff3e0
      classDef database fill:#fce4ec
      classDef external fill:#f3e5f5
      classDef deployment fill:#e0f2f1
      classDef testing fill:#fff8e1

      class User,Frontend userAction
      class GoAPI,TriggerDeployTest,ExecuteDeployTest,DownloadStep,TriggerExternalTest,MonitorProgress,SendNotification goService
      class PythonServer,ReceiveRequest,CombinedTask,DeployPhase,TestPhase pythonService
      class PostgresDB database
      class PackageServer,NginxServer,SMTPServer,UserEmail external
      class ServiceType,CServiceDeploy,OpenRestyDeploy,ExtractPackage,StopService,BackupBinary,CopyNewBinary deployment
      class ExecutePytest,RunPytestScript,PytestExecution,AllureResults,GenerateReport testing
```


-----

V1.2

添加 processing 状态, 添加同时运行阻塞, 限制只能同时运行一个
``` 可能遇到默认由两个在运行的, 使用这个 sql 强制刷新状态
-- 先查看要清理的记录
SELECT 
    id, 
    status, 
    started_at, 
    EXTRACT(EPOCH FROM (NOW() - started_at))/3600 as hours 
FROM deploy_test_runs 
WHERE status IN ('PENDING', 'DOWNLOADING', 'DEPLOYING', 'TESTING', 'MONITORING')
    AND EXTRACT(EPOCH FROM (NOW() - started_at))/3600 > 3;

-- 如果确认要清理，执行更新
UPDATE deploy_test_runs 
SET status = 'FAILED', 
    error_message = 'Test timeout - automatically failed by cleanup',
    finished_at = NOW()
WHERE status IN ('PENDING', 'DOWNLOADING', 'DEPLOYING', 'TESTING', 'MONITORING')
    AND EXTRACT(EPOCH FROM (NOW() - started_at))/3600 > 3;
```