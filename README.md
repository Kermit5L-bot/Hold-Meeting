# 万维盈创会议信息收集管理系统

轻量化会议活动信息收集、报名签到、数据统计与看板分析工具。

## 当前功能

- 后台管理员登录与会话保护
- 超级管理员账号管理、模块授权与账号级数据隔离
- 外联会议、外部会议论坛、营销中心会议台账
- 微信扫码报名、签到和现场补报名
- 报名二维码、签到二维码与会议头图
- CSV 历史数据导入及 Excel/CSV 导出
- SQLite 持久化、数据看板和可重试的企业微信群机器人通知

## 本地运行

```bash
npm install
npm run dev
```

## 生产部署要点

### Node.js 版本

当前业务数据写入使用 Node.js 内置 `node:sqlite` 模块，需要部署环境使用 Node.js 24 或确认目标 Node.js 版本支持 `node:sqlite`。

### 环境变量

生产环境必须设置：

```env
ADMIN_SESSION_SECRET=请替换为至少32位随机字符串
ADMIN_INITIAL_PASSWORD=首次部署至少12位的临时管理员密码
APP_BASE_URL=https://meeting.example.com
REGISTRATIONS_DB_PATH=data/registrations.sqlite
NODE_ENV=production
```

`ADMIN_INITIAL_PASSWORD` 只在数据库中还没有超级管理员时用于初始化 `admin` 账号，生产环境至少需要 12 个字符；账号建立后，修改该变量不会重置密码。

超级管理员可在“权限管理”中创建子账号，并按外联会议、外部会议&论坛、营销中心会议三个业务模块授权。子账号只能访问自己的业务数据；超级管理员默认查看自己的数据，可通过顶部“数据账号”切换指定账号或全部账号。停用、删除、重置密码或修改授权会使该账号已有会话立即失效。删除为不可恢复的软删除，历史数据和用户名占用会保留。

`APP_BASE_URL` 必须填写用户实际访问的 HTTPS 正式域名，报名和签到二维码会优先使用该地址生成，不能填写服务器 IP。

反向代理还应覆盖客户端地址请求头，供登录和公开接口限流使用：

```nginx
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header Host $host;
```

### 数据文件

报名/签到、会议台账、基础配置、管理员账号、企微通知任务和企微汇总状态均存储在同一个 SQLite 数据库中，默认位置为：

```text
data/registrations.sqlite
data/registrations.sqlite-wal
data/registrations.sqlite-shm
```

也可以通过 `REGISTRATIONS_DB_PATH` 指定到服务器数据盘，例如 `/data/hold-meeting/registrations.sqlite`。

旧版 `data` 目录中的报名、会议、配置、管理员账号和企微汇总 JSON 文件，会在首次访问对应功能时自动导入。迁移成功后以 SQLite 文件为准，旧 JSON 仅作为迁移来源保留，不再继续更新；如果旧文件损坏，系统会停止迁移并保留原文件，不会用空数据覆盖。

建议停服后备份整个 `data` 目录；若必须在线复制，不能只复制 SQLite 主文件，还要保证主文件与 `-wal`、`-shm` 文件来自同一时点。

报名和现场补报名成功时，企业微信通知会先与报名记录一起写入 SQLite，再由后台任务发送。发送失败会按 1 分钟、5 分钟、15 分钟和 60 分钟间隔重试，最多尝试 5 次；应用重启后会继续处理尚未完成的任务。

### 上传文件

会议头图上传到：

```text
public/uploads/outreach-covers
```

发布新版本时不要覆盖或清空该目录。建议将 `data` 和 `public/uploads` 作为持久化目录单独备份。

系统每天会自动清理超过 24 小时且未被任何会议引用的系统生成头图；刚上传但尚未保存会议的图片不会立即删除。

### 构建与启动

```bash
npm ci
npm test
npm run typecheck
npm run lint
npm run build
npm run start -- -p 3000
```

Windows PowerShell 如果阻止 `npm.ps1`，可以改用：

```bash
cmd /c npm run build
cmd /c npm run start -- -p 3000
```

### 并发部署限制

SQLite 适合当前“几百人集中报名”的单机部署场景，但不要让多台服务器同时写同一个 `registrations.sqlite` 文件。推荐使用单台应用服务器加 Nginx/IIS 反向代理；同机多进程写入虽有事务保护，仍不建议作为长期部署方式。

如果后续并发量继续扩大，或需要多实例部署，应迁移到 PostgreSQL/MySQL/SQL Server，并把当前 SQLite 通知任务升级为支持多实例消费的独立队列。
