创建一个 project 我会提供给你设计文档, 
- 这个项目当前只有一个文件 , 是其它项目的 server py 文件, not_in_porject_trigger_server 作用是给你参考接口的参数以及 endpoint 测试时的接口对接这个里边的接口
- 最后给我一个 README 文件, 包含这个项目需要的 SQL, 以及其它配置等信息
- 结构化项目， 将 web 相关写到 web 目录下方， 将除 main 外的 go 文件都放到对应的 folder 中让项目更具结构化. 请先在 readme 中梳理好你计划的 目录结构后 再开始 code
web 页面设计遵从以下内容
web design guidlines
1. 使用 Bento Grid Grid 风格的视觉设计,主要颜色为白底, 可以有蓝紫色等流线感
2. 强调超大字体或数字突出核心要点,画面中有超大视觉元素强调重点,与小元素的比例形成反差
4. 简洁的勾线图形化作为数据可视化或者配图元素
5. 运用高亮色自身透明度渐变制造科技感,但是不同高亮色不要互相渐变
6. 模仿 apple 官网的动效,向下滚动鼠标配合动效
7. 数据可以引用在线的图表组件,样式需要跟跟主题一致
8. 使用 Framer Motion (通过CDN引入)
9. 使用 HTML5、TailwindCSS 3.0+(通过CDN引入)和必要的JavaScript
10. 使用专业图标库例如 Font Awesome或Material Icons(通过CDN引入)
11. 避免使用emoji作为主要图标
12. 不要省略内容要点
----- 

CDN 自动化测试触发平台 (crat) 设计文档
1. 项目概述
项目名称: crat (Crazy Tester for automation test platform)
一句话描述: 一个接收 CI 系统（如 Jenkins）构建信息的 Web 平台，允许用户管理构建版本、配置并触发对指定版本的自动化测试，同时监控测试结果并发送通知。
核心解决的问题:
将 Jenkins 的构建信息与自动化测试执行解耦，并集中管理。
触发不便: 提供一个统一的 UI 界面来触发特定版本的测试，而不是依赖手动执行脚本。
流程自动化: 允许配置定时检查和触发机制，实现无人干预的回归测试。
用户角色:
管理员 (Admin): 拥有所有权限，包括系统配置、用户管理、测试配置等。通过 .env 文件设置初始密码。
普通用户 (User): 可以查看构建信息、测试历史，并触发已配置好的测试。通过邮箱登录，无需密码验证，主要用于身份标识和接收通知。
2. 技术栈
后端: Go
Web 框架: Gin (推荐，性能高且路由简洁)
ORM: GORM (推荐，简化数据库操作)
配置管理: Viper (推荐，轻松读取 .env 文件)
前端: React + TypeScript
UI 库: Ant Design (推荐，提供丰富的企业级组件)
状态管理: Zustand 或 Redux Toolkit (推荐，根据项目复杂度选择)
数据库: PostgreSQL
CI/CD: Jenkins (现只作为构建信息来源)
3. 数据库设计 (crat 数据库)
为了支持平台功能，我们需要设计更完善的表结构来存储关联关系。
3.1. build_info (构建信息表)
存储从 Jenkins 发送来的原始构建数据。


字段名
类型
约束/说明
id
bigserial
主键, 自增
job_name
varchar(255)
索引. Jenkins 的 Job 名称
build_number
integer
构建号
package_path
text
包的相对路径
build_user
varchar(255)
构建触发者, 可为空
created_at
timestamptz
记录创建时间
raw_data
jsonb
(可选) 存储 Jenkins 发送的完整 JSON 数据

3.2. test_items (测试项表)
定义一个可触发的测试，例如 "CDN_CORE_功能测试"。
字段名
类型
约束/说明
id
bigserial
主键, 自增
name
varchar(255)
唯一. 测试项名称，如 "CDN_CORE_功能测试"
description
text
(可选) 描述信息
associated_job_name
varchar(255)
外键关联 build_info.job_name. 关联的构建 Job
associated_request_id
bigint
外键关联 request_templates.id. 关联的 HTTP 请求模板
created_at
timestamptz
记录创建时间
updated_at
timestamptz
记录更新时间

3.4. test_runs (测试执行历史表)
记录每一次测试触发的详细历史。
字段名
类型
约束/说明
id
bigserial
主键, 自增
test_item_id
bigint
外键关联 test_items.id
build_info_id
bigint
外键关联 build_info.id
triggered_by
varchar(255)
触发者邮箱
status
varchar(50)
PENDING, RUNNING, SUCCESS, FAILED, TIMEOUT
response_data
jsonb
(可选) 外部服务返回的完整响应
report_url
text
(可选) 外部测试平台生成的报告地址
started_at
timestamptz
触发时间
finished_at
timestamptz
结束时间

4. API 接口定义 (Go Backend)
API 前缀: /api/v1
4.1. 构建信息接口
POST /builds: 接收 Jenkins Webhook。
GET /builds: 获取构建信息列表。
4.2. 测试项接口
POST /test-items: 创建新的测试项。
GET /test-items: 获取所有测试项列表。
PUT /test-items/{id}: 更新测试项。
DELETE /test-items/{id}: 删除测试项。
POST /test-items/{id}/trigger: 触发测试。
GET /test-items/{id}/runs: 获取某个测试项的执行历史。
4.4. 系统设置接口
GET /settings: 获取当前系统设置。
PUT /settings: 更新系统设置。
5. 前端架构 (React + TS)
采用基于页面和功能划分的组件结构。
pages/: 顶层页面组件
LoginPage.tsx
CoreLayout.tsx
SettingsLayout.tsx
components/: 可复用的 UI 组件
BuildInfoList.tsx
TestItemCard.tsx
RunHistoryTable.tsx
6. Web 页面设计 (UI Mockups)
本节使用 ASCII 艺术来展示核心页面的布局和交互。
6.1. 登录页
用户通过输入邮箱进行登录，密码框为可选，主要用于管理员。
+-------------------------------------------------+
|                                                 |
|          Welcome to crat Test Platform          |
|                                                 |
|   Email: [ user@example.com           ]         |
|                                                 |
|   Password: [ 123456      ]         |
|                                                 |
|                   +---------+                   |
|                   |  Login  |                   |
|                   +---------+                   |
|                                                 |
+-------------------------------------------------+


6.2. 主界面布局
登录后进入主界面，包含顶部导航、左侧边栏和主内容区。
+--------------------------------------------------------------------------+
| crat Platform                            [Core] [Setting] | user@ex.com  |
+--------------------------------------------------------------------------+
| Sidebar        |                                                         |
|----------------|                 Content Area                            |
| [Build Info]   |                                                         |
| [Trigger Test] |                                                         |

|                |                                                         |
|                |                                                         |
|                |                                                         |
|                |                                                         |
|                |                                                         |
+--------------------------------------------------------------------------+


6.3. 核心 > 构建信息管理 (core_tab1)
展示按 Job 名称分组的构建列表。
+--------------------------------------------------------------------------+
| crat Platform                            [Core] [Setting] | user@ex.com  |
+--------------------------------------------------------------------------+
| Sidebar        |  构建信息管理 (Build Info)                               |
|----------------|  +-----------------------------+ +-----+                |
|>[Build Info]   |  | Add Job Name:  Add |                |
| [Trigger Test] |  +-----------------------------+ +-----+                |

|                |  ▼ CDN_CORE                                             |
|                |    - 构建日期: 2024-10-01 10:30, 构建人: JenkinsUser, ... |
|                |      构建路径: http://.../CDN_CORE/101, 包下载: http://... |
|                |                                                         |
|                |  ▼ CDN_SsgAgent                                         |
|                |    - 构建日期: 2024-10-01 09:15, 构建人: CI, 包下载地址... |
|                |                                                         |
+--------------------------------------------------------------------------+


6.4. 核心 > 触发执行 (core_tab2)
管理和触发测试项。
+--------------------------------------------------------------------------+
| crat Platform                            [Core] [Setting] | user@ex.com  |
+--------------------------------------------------------------------------+
| Sidebar        |  触发执行 (Trigger Execute)                              |
|----------------|  +-----------------------------+ +-----+                |
| [Build Info]   |  | Add Test Name: Add |                |
|>[Trigger Test] |  +-----------------------------+ +-----+                |

|                |  ▶ cds   Version: [1.2.3_b101 ▼] [触发测试] [关联构建] [关联通知] -delete | 
|                |                                                         |
|                |  ▼ uat-test Version: [2.0.0_b55 ▼] [触发测试] [关联构建] [关联通知] -delete |
|                |    └─ Excute History:  B: clean history                                  |
|                |       - 2024-10-01 11:00, user1@ex.com, SUCCESS, [Report] |
|                |       - 2024-09-30 15:20, admin@ex.com, FAILED, [Report]  |
+--------------------------------------------------------------------------+

6.6. 设置 > 系统设置
配置平台级的全局变量。
+--------------------------------------------------------------------------+
| crat Platform                             [Core] [Setting] | user@ex.com |
+--------------------------------------------------------------------------+
| Sidebar        |  系统设置 (System Settings)                             |
|----------------|                                                         |
| [System]       | Project Name: [Autotest Platform        ]               |
| [SMTP]         |                                                         |
|                | jenkins job build 地址 base url:                            |
|                | [http://127.0.0.1:8080/job/                 ]            |
|                |                                                         |
|                | 包下载地址 base url:                              |
|                | [http://127.0.0.1/build/                    ]            |
|                |                                                         |
|                |                          +--------+                     |
|                |                          |  Save  |                     |
|                |                          +--------+                     |
+--------------------------------------------------------------------------+


7. 核心工作流
7.1. Jenkins 构建到信息入库
Jenkins 构建任务完成后，通过 "Post-build Actions" 配置一个 HTTP 请求步骤。
向 crat 平台的 POST /api/v1/builds 接口发送构建信息。
crat 后端接收到请求，验证数据后，在 build_info 表中创建一条新记录。
7.2. 用户触发测试
用户在 "触发执行" 页面，选择一个测试项（如 cds）。
平台根据[关联构建]测试项关联的 associated_job_name，展示一个版本下拉框（数据源为 build_info 表）。
用户通过 [关联通知], 先实现当前通知方式, 当前只支持 SMTP, 关联后在 task SUCCESS 时发送通知到登录的邮箱
用户选择一个版本（即一个 build_info），点击 "触发测试" 按钮。
前端发送 POST /api/v1/test-items/{id}/trigger 请求，携带 build_info_id 和当前用户信息。
后端核心逻辑:
a. 创建一条 test_runs 记录，状态为 PENDING。
b. 异步启动一个 Goroutine 执行以下任务：
i. 从数据库查询 test_item, build_info, request_template 的完整信息。
ii. 变量替换: 将 request_template 中的 URL、Headers、Body 里的占位符（如 {JOB_NAME}, {BUILD_NUMBER}, {PACKAGE_DOWNLOAD_URL}）替换为 build_info 中的实际值。
iii. 更新 test_runs 状态为 RUNNING。
iv. 发送最终的 HTTP 请求到目标测试服务器。
v. 等待响应，处理超时。
vi. 结果验证: 根据 检查响应内容。
vii. 更新 test_runs 状态为 SUCCESS 或 FAILED。
viii. 如果配置了通知，调用邮件服务发送结果通知。SUCCESS 
8. 系统设置与配置
8.1. .env 文件
这是所有配置的唯一来源，由 Go 后端在启动时读取。
# .env
# Server
PORT=8000
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


9.additional info
tab in header bar
Core,Setting


tab in siderbar(left) under Core
core_tab1: build info manage(page, send from jenkins)
core_tab2: trigger excute(trigger pytest send to a sevice)


conten_area:
core_tab1 back end: this page info from send by other like 
```
# 示例：发送 POST 请求到你的自动化平台
curl -X POST -H "Content-Type: application/json" \
     -d "{
           \"BUILD_USER\": \"${BUILD_USER}\",
           \"JOB_NAME\": \"${JOB_NAME}\",
           \"PACKAGE_PATH\": \"${PACKAGE_PATH}\",
           \"BUILD_NUMBER\": \"${BUILD_NUMBER}\"
         }" \
     "${TARGET_URL}"

if JOB_NAME is not null: save all info into pgdatabase build_info, include: id,JOB_NAME,BUILD_USER(defualt is "None"),PACKAGE_PATH,BUILD_NUMBER,create_time

core_tab2 back end 
save needed info to database , let you determine 
-----------------
core_tab1 web page design: build info
Add a job name, that means: allow to show it . hint: this name generally is your jenkis Job name
-example:- (order by create_time desc)
CDN_CORE
-item1- 构建日期: "create_time search by JOB_NAME  = CDN_CORE ", 构建人: "BUILD_USER", 构建路径: "{package_build_info_base_url}/{JOB_NAME}/{BUILD_NUMBER}", 包下载地址: "package_download_base_url + PACKAGE_PATH"  (if conten value too long , show 20 charactor only, )

CDN_SsgAgent
-item2- 构建日期: "create_time search by JOB_NAME  = CDN_SsgAgent ", 构建人: "BUILD_USER", 构建路径: "{package_build_info_base_url}/{JOB_NAME}/{BUILD_NUMBER}", 包下载地址: "package_download_base_url + PACKAGE_PATH"  (if conten value too long , show 20 charactor only)

core_tab2 web page design:
Add a test name, that means: allow to show it, hint: this name generally is your trigger test name. if your test server need it, or keep it equal to Job name 
-item- cds     version:   button: 触发测试 button: 关联构建, button:关联通知 ----(version) 显示为 关联构建 下的 最新 item, 点击 version 后的 下拉框选择 版本, 启动测试

when click 关联构建, 关联通知, 
when click 关联构建, 关联通知

click item cds to expand excute history, include: excutor: (email), resulte: success . report_address 


web page design: settings
system setting:
project name: (设置你的项目名称, 默认 autotest platform)
package_build_info_base_url: (输入你的 jenkins build url, default: http://127.0.0.0.1:8080/job/)
package_download_base_url: (输入你的 ftp 服务器包下载地址, default: http://127.0.0.0.1/build/)

-------------


以下 service_name 以 lowwer 判断， 
cds
/home/ljy/automation_new/testcases/service/cds/live/




------------------

对项目执行以下修改， 1.web 允许 admin  + 密码方式登录， 目前其限制了类型 admin 无法登录   之后修改 的内容---触发测试
需要做什么 
1.下载 test_items.name 例如 cds 文件到本地, 大致方式为, 使用code 获取 cds 下载地址后拼接, 之后下载到本地 /tmp 目录, 确认文件在本地存在后执行下一步 
```
PS D:\Download> curl -v http://192.168.1.39/build/CDN/Core/20240626-story_container-c54239edb10ebf9266c4b97df0418e3b181e6fd6/ | grep cds | grep release
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
  0     0    0     0    0     0      0      0 --:--:-- --:--:-- --:--:--     0*   Trying 192.168.1.39:80...
* Connected to 192.168.1.39 (192.168.1.39) port 80
> GET /build/CDN/Core/20240626-story_container-c54239edb10ebf9266c4b97df0418e3b181e6fd6/ HTTP/1.1
> Host: 192.168.1.39
> User-Agent: curl/8.9.1
> Accept: */*
>
< HTTP/1.1 200 OK
< Server: nginx/1.10.3
< Date: Tue, 17 Jun 2025 02:04:20 GMT
< Content-Type: text/html; charset=utf-8
< Transfer-Encoding: chunked
< Connection: keep-alive
< Cache-Control: no-store
< Pragma: no-cache
<
{ [4020 bytes data]
100  4008    0  4008    0     0   228k      0 --:--:-- --:--:-- --:--:--  230k
* Connection #0 to host 192.168.1.39 left intact
<a href="cds-5.3.9-c54239ed_x86_64-linux-gnu_20240626_release.tgz">cds-5.3.9-c54239ed_x86_64-linux-gnu_20240626_re..&gt;</a> 26-Jun-2024 17:48           246501318

```
2.发送一个请求触发测试 `/api/deploy_and_test` 具体请求细节可以查看 
Not_in_porject_trigger_server 文件这是触发测试的服务器, 提取返回结果 task_id

3.执行查看 /api/tasks/task_id 持续查询, 查询间隔 一分钟, timeout 30s, 每一个 taskid 最大查询 3小时, 可 env 配置, 等待status = completed 时取 report_url, 执行notify 流程. 
```
{
  "task_id": "2847520f-1e81-4e60-97fe-e0bfe142d999",
  "status": "completed",
  "start_time": "2025-05-30 09:02:32",
  "end_time": "2025-05-30 09:25:43",
  "result": {
    "report_url": "http://192.168.1.118:59996/test_report20250530_092534/"
  },
  "error": null
}

```
4.最后检查一下, 整个生命周期应该被记录在数据库, 以不同状态表名不同步骤, 每次执行下一步时更新status , 有助排查



-----

修改触发测试时的操作： 
这是一个示例请求. 我来说说这些参数你要如何提供, 
- uri 是 setting table 的  external_test_server_url	目前是 http://192.168.1.118:8000 /api/deploy_and_test_mock 是固定地址 
- service_name 是 test_items.name 这里不用管大小写, server 端有做适配, 你只需传值即可,  report_keyword 与 
- package_path 是从用户点击触发测试的版本的包路径 如  res curl -v http://192.168.1.39/build/CDN/SsgAgent/20250613-master-27580974441fd35aa299d78a392aa4b59b018c27/el7/ | grep {test_item..name} | if herf > 1 : do grep "release" 取出的. (使用 go code 实现) if len(res) < 1  raise error.  if endswitch not tar.gz raise error 接口过滤后结果可能为 <a href="ssgagent-5.3.1-27580974-el7-20250613.tar.gz">ssgagent-5.3.1-27580974-el7-20250613.tar.gz</a>        13-Jun-2025 15:37            16777430 ---------拼接结果 http://192.168.1.39/build/CDN/SsgAgent/20250613-master-27580974441fd35aa299d78a392aa4b59b018c27/el7/ssgagent-5.3.1-27580974-el7-20250613.tar.gz 下载到本地 /tmp 目录 这就是 package_path
- install_dir 和 test_path 置空即可 目前是server固定了枚举值, 
- upgrade_type": "full 保持原样, 

curl -X POST "http://localhost:8000/api/deploy_and_test_mock" \
  -H "Content-Type: application/json" \
  -d '{
    "service_name": "CDS",
    "package_path": "/path/to/package.tar.gz",
    "install_dir": "",
    "upgrade_type": "full",
    "test_path": "",
    "base_url": "http://192.168.1.118:59996",
    "report_keyword": "CDS"
  }'
  
 这些是默认值， 之后， 增加一个 页面， 名为 parameter set. 可以定义这个接口的所有值，通过在 trigger test 增加一个 关联参数 按钮来关联这些请求参数。  key 先以 现在的 key， value 如果不为空则取配置的值。 增加新table 来存新页面的数据。 设计原理以一个 唯一的 name 为基础， 可以通过 add 增加key value 对， 或减少， 方便关联
 
- 获取结果后你需要， 记录所需内容到数据库,另外 deploy_test_runs 增加 response_raw_data 字段，记录当 status = completed时的json data
- 取出 status = completed 时的 result.test.report_url 用作 Execute History  preview 按钮 。 
{
  "task_id": "aaf8c25a-e229-4ca5-b21a-007f84de44aa",
  "status": "completed",
  "start_time": "2025-06-18 02:15:54",
  "end_time": "2025-06-18 02:16:54",
  "result": {
    "deploy": {
      "service": "CDS",
      "upgrade_type": "full",
      "success": true
    },
    "test": {
      "report_url": "http://192.168.1.118:59996/cds_5329/"
    }
  },
  "error": null
}

请确保在执行数据库操作前先读 schema.sql 了解现有架构， 设计页面时保持风格于现有风格一致


触发执行-test-items 关联通知后方增加 describe, 数据库增加相应字段, admin 权限可编辑描述,  normal user 可查看
请确保在执行数据库操作前先读 schema.sql 了解现有架构





------------


split routers (all of endpoints )from main.go to router/api-router.go


----

preview功能改版， 通过在 report后拼接widgets/summary.json 可以获取到 summary 数据你需要做的时按照图中 的样式展示出来，  -- curl -v http://192.168.1.118:59996/cds_5329/widgets/summary.json
*   Trying 192.168.1.118:59996...
* Connected to 192.168.1.118 (192.168.1.118) port 59996
* using HTTP/1.x
> GET /cds_5329/widgets/summary.json HTTP/1.1
> Host: 192.168.1.118:59996
> User-Agent: curl/8.13.0
> Accept: */*
>
< HTTP/1.1 200 OK
< Server: nginx/1.24.0 (Ubuntu)
< Date: Wed, 18 Jun 2025 07:36:17 GMT
< Content-Type: application/json
< Content-Length: 254
< Last-Modified: Wed, 28 May 2025 03:28:07 GMT
< Connection: keep-alive
< ETag: "683682c7-fe"
< Access-Control-Allow-Origin: *
< Access-Control-Allow-Methods: GET, POST, OPTIONS
< Access-Control-Allow-Headers: DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range
< Access-Control-Expose-Headers: Content-Length,Content-Range
< Accept-Ranges: bytes
<
{"reportName":"Allure Report","testRuns":[],"statistic":{"failed":1,"broken":0,"skipped":6,"passed":43,"unknown":0,"total":50},"time":{"start":1748400822908,"stop":1748401563095,"duration":740187,"minDuration":0,"maxDuration":83678,"sumDuration":508321}}


-------

 修改 SendTestSuccessNotification 的 报告 message， @notification_service.go  1.构建信息 填写 构建路径
http://192.168.1.199:8080/job/CDN_SsgAgent/77。 2.执行时间: 获取当前时间。 查看测试报告 文字改为查看完整测试报告， 3增加刚刚 的 preview 按钮的数据到这里， （如果时 complete 状态。 ） 4.本邮件由 CRAT 自动化测试平台自动发送，请勿回复。- 改为从 设置获取 项目名称。获取不到再使用这个默认的


-----------


1.put build info above trigger test 2.build info 构建 card 可以选择 version， 增加一个 选择版本进行测试 button on 构建card 右上角，
   和time 同行。 逻辑： - 在用户访问 /builds 时将版本选择为 orderby create_time 最新的一条数据 24h 只做一次同步修改，-
  在用户点击某个构建的右上角 button 后版本更新为用户选择那个   3.terigger test Version 功能修改： 只能查看当前选择的 version 信息，
  。页面数据较完整显示， 请你重新布局 button 位置 和 description verison 显示位置， 让他们更好的显示， 且美观

 逻辑： - 在用户访问 /builds 时将版本选择为 orderby create_time 最新的一条数据 24h 只做一次同步修改，-
    在用户点击某个构建的右上角 button 后版本更新为用户选择那个 2.terigger test Version 功能修改： 只能查看当前选择的 version 信息，
  不能手动选择， 以当前样式去掉选择功能， - 概念，每一个 item 有自己关联的 build ， 他们是独立的， 选择不同 build
  版本时同步的是关联的 item 信息，不是所有的。 未关联的不展示数据即可

----
why trigger test page only on item even db has three items.  2.Shoul not hint when press 刷新 button


---
build info 构建 card 可以选择 version， 逻辑： - 在用户访问 /builds 时将版本选择为 orderby create_time 最新的一条数据 24h 只做一次同步修改，- 在用户点击某个构建的右上角 button 后版本更新为用户选择那个    2.terigger test Version 功能： 只能查看当前选择的 version 信息
  - 概念，每一个 item 有自己关联的 build ， 他们是独立的， 选择不同 build
版本时同步的是关联的 item 信息，不是所有的。 未关联的不展示数据即可。 可以考虑在数据库添加新的字段来持久化选择的版本。
请确保在执行数据库操作前先读 schema.sql 了解现有架构。
build info 构建 card 可以选择 version， 逻辑： - 在用户访问 /builds 时将版本选择为 orderby create_time 最新的一条数据 24h 只做一次同步修改，- 在用户点击某个构建的右上角 button 后版本更新为用户选择那个    2.terigger test Version 功能： 只能查看当前选择的 version 信息
  - 概念，每一个 item 有自己关联的 build ， 他们是独立的， 选择不同 build
版本时同步的是关联的 item 信息，不是所有的。 未关联的不展示数据即可。 可以考虑在数据库添加新的字段来持久化选择的版本。
请确保在执行数据库操作前先读 schema.sql 了解现有架构。
Look for a build info controller file in the controllers directory or any file that handles build info related API endpoints.

------

描述一下 /tests 和 /builds 选择版本进行测试的方式是怎样的， 如何选择一个版本进行测试
我发现当前 选择版本按钮 是全局生效的，如果有多个 items 时会导致公用了这个， 探讨一下如何每一个 item 关联的 job name 管理自己的version
选择方案二开始coding ，同时能解决， /builds 界面选择版本时刻处于选择状态问题， 我的要求时处理好版本选择状态， /tests 页面的item 若未关联 ver 不显示内容即可。


---

触发删除 builds 功能： 解释： 有些构建的版本是不包含可用包的也就是不是会触发测试的版本， 为了防止版本干扰， 做一个根据 test_items name 关联 build name 的关系判断 包下载地址中是否包含 可用 item.name的包  若不存在， 直接删除 card
- build card 右上角增加 ‘clear build’ button
- click job ‘clear build’ button to search from test_items who has  asso associated_job_name  there is cds. 
UPDATE public.test_items
SET "name"='cds', description='CDS服务自动化测试， SDS 自动部署', associated_job_name='CDN_CORE', notification_enabled=true, created_at='2025-06-17 12:04:29.608', updated_at='2025-06-18 14:48:57.121', associated_parameter_set_id=2
WHERE id=3;

---
根据提供的文件，是 api/devlop_and_test 接口的 server。请你先了解所有项目后按要求信息画两张 mermaid 流程图帮助不懂的人快速了解项目在做什么， 
1.go 项目流程， 数据流向是怎样的， 
2.以api/devlop_and_test 为 index 画出 当 触发测试时 server 的交互是怎样的 ，如何最终走到 通过 pytest 执行测试的 


----

优化此文本 markdown 显示格式， 但不要改变原有文本描述



----

修改， 当 param 为以下条件时进行特殊处理 test_path == "deploy" 代表只希望部署， 而部署没有所谓的测试报告。 下方我提供一个示例的 当test_path == "deploy"   服务返回示例， 之后帮我做如下处理
1.新的处理状态 Deploy complete 
2.新的处理状态不发送邮件， 不显示 preview 按钮， 完全独立于之前的 complete 状态于逻辑， 只为展示用户部署确实成功 (无需paramter set 相关逻辑)
{
"task_id": "4bd7ab97-8823-472a-9148-c44b13068af4",
"status": "completed",
"start_time": "2025-06-20 02:06:45",
"end_time": "2025-06-20 02:07:45",
"result": {
  "deploy": {
	"service": "CDS",
	"upgrade_type": "full",
	"success": true
  },
  "test":  {"skipped": True, "reason": "test_path is 'deploy'", "report_url": "None"}
},
"error": null
},

在你开始修改之前， 你应该以触发接口 deploy_and_test 为如何先了解这如何修改

----
兼容一个功能, 当 To 非有效邮箱时 收件人改为 config.AppConfig.Email.Username, 发件人改为 EMAIL_SEND_USERNAME 也就是发件人和收件人相同, 主要为了 让邮件有记录


---
 现在有一个新需求: trigger test 页的item 支持配置 type , 也就是数据库需要一个新的字段存储, 默认为空, 也就是当前模式, 我会新增一个 type 固定为 hrun, 
 增加 type 的原因是, type 为 hrun 的项目, 在 preview 内容的获取上有区别, 当 type == hrun 时 获取方式是 go to -------------
 未实现, 改为 hrun report 增加 summary.json 接口实现 