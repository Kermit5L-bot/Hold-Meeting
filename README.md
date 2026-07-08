# 万维盈创会议信息收集管理系统

轻量化会议活动信息收集、报名签到、数据统计与看板分析工具。

## 当前阶段

阶段一只包含项目初始化与基础页面结构：

- 后台管理端基础布局
- 手机端报名和签到页面骨架
- 会议类型 TypeScript 模型
- mock 数据
- 暂不包含真实登录、数据库、二维码、报名提交、签到逻辑、导出和看板统计

## 本地运行

```bash
npm install
npm run dev
```

## 生产部署要点

### Node.js 版本

当前报名/签到高并发写入使用 Node.js 内置 `node:sqlite` 模块，需要部署环境使用 Node.js 24 或确认目标 Node.js 版本支持 `node:sqlite`。

### 环境变量

生产环境必须设置：

```env
ADMIN_SESSION_SECRET=请替换为至少32位随机字符串
ADMIN_INITIAL_PASSWORD=首次部署临时管理员密码
REGISTRATIONS_DB_PATH=data/registrations.sqlite
NODE_ENV=production
```

`ADMIN_INITIAL_PASSWORD` 只在还没有超级管理员时用于初始化 `admin` 账号；已有 `data/admin-users.json` 后，修改该变量不会重置密码。

### 数据文件

报名/签到数据已迁移为 SQLite，默认位置为：

```text
data/registrations.sqlite
data/registrations.sqlite-wal
data/registrations.sqlite-shm
```

也可以通过 `REGISTRATIONS_DB_PATH` 指定到服务器数据盘，例如 `/data/hold-meeting/registrations.sqlite`。

旧的 `data/registrations.json` 会在首次访问报名数据时自动导入 SQLite。上线后应以 SQLite 文件为准，并定期备份整个 `data` 目录。

其他管理数据目前仍使用 JSON 文件：

```text
data/admin-users.json
data/settings.json
data/outreach-meetings.json
data/marketing-meetings.json
data/external-forums.json
```

### 上传文件

会议头图上传到：

```text
public/uploads/outreach-covers
```

发布新版本时不要覆盖或清空该目录。建议将 `data` 和 `public/uploads` 作为持久化目录单独备份。

### 构建与启动

```bash
npm ci
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

SQLite 适合当前“几百人集中报名”的单机部署场景，但不要用 PM2 cluster、多 Node 进程或多台服务器同时写同一个 `registrations.sqlite` 文件。推荐使用单个 Node 进程加 Nginx/IIS 反向代理。

如果后续并发量继续扩大，或需要多实例部署，应迁移到 PostgreSQL/MySQL/SQL Server，并把企业微信通知改为可靠队列。
