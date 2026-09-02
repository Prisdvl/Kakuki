# Kakuki - 全栈个人博客平台

> 基于 **Django 4.2 + React 18** 的现代化全栈博客系统，前后端分离架构，开箱即用的演示数据，面向大学生软件类竞赛设计。

## ✨ 项目亮点

- **前后端完全分离**：RESTful API 统一响应格式 `{code, message, data}`，前端 Axios 拦截器统一处理
- **JWT 认证 + 无感续期**：Access/Refresh 双令牌，前端拦截 401 自动刷新并重放原请求，用户体验零感知
- **接口安全加固**：DRF 节流（匿名 120/min、登录 300/min）、CORS 白名单、生产环境安全头（HSTS/HTTPS 重定向/HttpOnly Cookie）
- **防刷点赞设计**：`ArticleLike`/`TalkLike` 复合唯一约束（用户 + 文章），支持登录用户与匿名 IP 两种维度去重
- **Markdown 全链路**：GFM 语法、代码高亮（highlight.js）、代码块一键复制、自动生成文章目录（TOC）锚点跳转
- **丰富动效**：首屏进度加载动画、滚动入场（IntersectionObserver）、点赞粒子爆炸、数字滚动统计、深浅主题平滑切换
- **一键演示数据**：`python manage.py seed_demo` 自动生成真实感文章/评论/杂谈/项目，比赛演示零准备

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                      浏览器 (React SPA)                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │ 首页/文章 │ │ 杂谈/项目 │ │  音乐/关于 │ │  管理后台   │  │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘  │
│         Zustand 状态管理 · React Router · Axios          │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP / Bearer JWT
┌────────────────────────▼────────────────────────────────┐
│                   Django 4.2 (ASGI/WSGI)                 │
│  ┌──────────────────────────────────────────────────┐   │
│  │  中间件链：CORS → Security → Session → CSRF → Auth  │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────────┐   │
│  │ users   │ │  blog   │ │ 限流     │ │ drf-spectacular│  │
│  │ JWT认证  │ │ 业务API  │ │ 防刷     │ │  Swagger文档  │  │
│  └─────────┘ └─────────┘ └─────────┘ └──────────────┘   │
└────────────────────────┬────────────────────────────────┘
                         │
            ┌────────────▼────────────┐
            │  SQLite（默认演示）/ MySQL 8.0（生产可选）  │
            └─────────────────────────┘
```

**模块划分**

```
Kakuki/
├── backend/
│   ├── kakuki/          # 项目配置：settings（限流/CORS/安全）、统一异常处理
│   ├── users/           # 用户模块：注册、JWT 登录/刷新、资料、改密（含 tests.py）
│   ├── blog/            # 业务模块：文章/分类/标签/评论/杂谈/项目/点赞/统计（含 tests.py）
│   │   └── management/commands/seed_demo.py   # 一键演示数据
│   ├── requirements.txt
│   ├── Dockerfile
│   └── manage.py
├── frontend/
│   ├── src/
│   │   ├── api/         # Axios 封装：401 自动刷新、统一响应解析
│   │   ├── store/       # Zustand：主题 / 用户 / 音乐播放
│   │   ├── components/  # 布局与通用组件
│   │   └── pages/       # 前台页面 + /admin 管理后台
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── .gitee/workflows/ci.yml   # Gitee Go 持续集成
├── docker-compose.yml        # 一键部署（Django + React + MySQL）
├── LICENSE                   # MIT
└── README.md
```

## 🛠️ 技术栈

| 层次 | 技术 |
|------|------|
| 后端 | Python 3.10+ · Django 4.2 · Django REST Framework · SimpleJWT · django-filter · drf-spectacular |
| 数据库 | SQLite（演示默认）· MySQL 8.0（生产可选，`USE_MYSQL=True`） |
| 前端 | React 18 · Vite · Ant Design · Tailwind CSS · Zustand · React Router v6 |
| 内容 | react-markdown · remark-gfm · rehype-highlight（代码高亮） |
| 安全 | JWT 双令牌 · DRF Throttling · CORS 白名单 · 生产安全头 |

## 🚀 快速开始

### 1. 后端（零配置即可跑通，默认 SQLite）

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows（Linux: source .venv/bin/activate）

pip install -r requirements.txt

python manage.py migrate
python manage.py seed_demo    # 一键生成演示数据（可选，比赛演示强烈推荐）
python manage.py runserver 8000
```

**演示账号**（seed_demo 自动创建）：

| 角色 | 用户名 | 密码 | 权限 |
|------|--------|------|------|
| 管理员 | `admin` | `admin123456` | 后台管理、发文章、发杂谈 |
| 普通用户 | `demo` | `demo123456` | 评论、点赞 |

> API 文档：http://127.0.0.1:8000/api/v1/swagger/

### 2. 前端

```bash
cd frontend
npm install
npm run dev        # 访问 http://localhost:3000
```

### 3. 使用 MySQL（生产可选）

```bash
# 1. 创建数据库
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS kakuki CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. 在 backend/.env 中配置
USE_MYSQL=True
DB_NAME=kakuki
DB_USER=root
DB_PASSWORD=你的密码

# 3. 迁移
python manage.py migrate
```

### 4. Docker 一键启动（推荐，含 MySQL + 演示数据）

不需要本机装 Python / Node / MySQL，一条命令跑通全栈：

```bash
docker compose up -d --build
```

- 前端：http://localhost
- API：http://localhost/api/v1/
- Swagger 文档：http://localhost/api/v1/swagger/
- 首次启动自动建表并生成演示数据（幂等，可重复执行）

> 访问 `http://localhost` 即可看到完整博客；用 `admin / admin123456` 登录后台，`demo / demo123456` 体验评论点赞。

### 5. 运行测试

```bash
cd backend
python manage.py test users blog     # 36 个用例：认证 / 文章 / 评论 / 杂谈 / 项目 / 点赞 / 统计
```

CI（Gitee Go）在每次 push 时自动执行后端测试与前端构建，配置见 `.gitee/workflows/ci.yml`。

## 📡 API 概览

统一前缀 `/api/v1/`，统一响应格式：

```json
{ "code": 200, "message": "ok", "data": { ... } }
```

| 模块 | 端点 | 说明 |
|------|------|------|
| 认证 | `POST /auth/register/` `POST /auth/login/` `POST /auth/refresh/` `GET /auth/me/` | 注册 / JWT 登录 / 刷新 / 用户信息 |
| 文章 | `GET /articles/` `GET /articles/<id>/` `POST /articles/create/` | 列表（搜索/筛选/分页）/ 详情 / 发布 |
| 互动 | `POST /articles/<id>/like/` `POST /talks/<id>/like/` | 点赞（用户/IP 双维度去重） |
| 评论 | `GET /articles/<id>/comments/` `POST /comments/create/` | 二级回复结构 |
| 杂谈 | `GET /talks/` `POST /talks/create/` | 类朋友圈动态流 |
| 项目 | `GET /projects/` | 作品集展示 |
| 归档 | `GET /archives/` | 按年月归档 |
| 统计 | `GET /stats/` | 站点总览（文章/评论/浏览/点赞） |
| 扩展 | `GET /leetcode/<user>/` `GET /netease/...` | LeetCode 统计、网易云歌单代理 |

## 🔒 安全设计

| 措施 | 实现 |
|------|------|
| 接口限流 | DRF Throttling：匿名 120/min（按 IP）、登录 300/min（按账号），`.env` 可调 |
| 认证安全 | JWT 双令牌（Access 1天 / Refresh 7天），前端 401 拦截自动续期 |
| 防刷点赞 | 数据库层复合唯一约束，接口层幂等处理，杜绝重复计数 |
| CORS | 生产环境白名单模式（`CORS_ALLOWED_ORIGINS`），禁止全开放 |
| 生产加固 | 强制 SECRET_KEY、HTTPS 重定向、HttpOnly Cookie、XSS/Nosniff、X-Frame-Options DENY |
| 统一异常 | 自定义 Exception Handler，杜绝堆栈信息泄露 |

## 🎬 比赛演示指南

1. **启动**：按"快速开始"执行 `migrate` + `seed_demo` + `runserver`，前端 `npm run dev`
2. **首屏动效**：打开 http://localhost:3000 展示进度加载动画与首页数据滚动
3. **文章页**：进入任意文章 → Markdown 渲染、代码高亮、一键复制、右侧 TOC、点赞粒子动画
4. **互动**：登录 `demo` 账号 → 发评论（二级回复）→ 点赞文章与杂谈
5. **杂谈/项目页**：动态流与作品集，后端实时数据驱动
6. **管理后台**：退出后用 `admin` 登录 → `/admin` 仪表盘统计、文章/分类/标签/评论管理
7. **安全演示**：快速连续请求接口可触发限流（429），展示防刷能力

## 📦 生产部署

```bash
# 前端构建
cd frontend && npm run build

# 后端（Windows 用 uvicorn；Linux 推荐 gunicorn + UvicornWorker）
pip install gunicorn uvicorn
gunicorn kakuki.wsgi:application \
  --worker-class uvicorn.workers.UvicornWorker \
  --workers 4 --bind 0.0.0.0:8000

# .env 生产配置（缺失将拒绝启动）
DEBUG=False
DJANGO_SECRET_KEY=<强随机密钥>
CORS_ALLOWED_ORIGINS=https://your-domain.com
USE_SSL=True   # 启用 HTTPS 重定向与安全 Cookie
```

Nginx 反向代理 / systemd 守护进程配置可参考项目历史文档或联系作者获取。

## 📄 License

MIT
