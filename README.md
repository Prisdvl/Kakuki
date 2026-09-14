<div align="center">

# Kakuki

**个人博客与作品集 — 全栈一体化博客系统**

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare%20Workers-F6821F?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Hono](https://img.shields.io/badge/Hono-4-E36002?logo=hono&logoColor=white)](https://hono.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&logoColor=white)](cloudflare/package.json)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](frontend/package.json)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](frontend/package.json)
[![Ant Design](https://img.shields.io/badge/Ant%20Design-5-1677FF?logo=antdesign&logoColor=white)](frontend/package.json)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3-06B6D4?logo=tailwindcss&logoColor=white)](frontend/package.json)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)

**在线体验：[https://kakuki.top](https://kakuki.top)** ✨

</div>

> 前后端同仓：`frontend/`（React SPA）+ `cloudflare/`（Cloudflare Workers 后端）。
> 全 Serverless ， 24小时在线。

---

## ✨ 特性

**内容与互动**
- 文章 / 评论 / 点赞 / 杂谈（Talks）/ 项目展示 / 归档统计
- Markdown 编辑与渲染、代码高亮、目录跳转
- 每日打卡 + 连续天数统计（全站统一口径 `/checkin/summary/`）
- 点赞去重：登录按用户、游客按 IP

**站内音频库**
- 上传本地音乐（单文件 ≤ 60 MiB，库总容量硬上限 10 GiB）
- 元数据存 D1、音频存 R2，同源流式播放（Range 206）
- 封面粒子动效（真实音频频谱驱动）

**仪表盘**（原独立的「数据」页已并入，`/stats` 会重定向到 `/dashboard`）
- 个人状态：时钟 / 学习时长（PrisTimer 同步）/ LeetCode 进度 / GitHub 概览 / 待办 / 倒计时
- 站点流量：Cloudflare Analytics 的总请求、独立访客、带宽与日粒度请求量趋势图
- 卡片各自带兜底数据源，上游不可用时降级显示而不是白屏

**界面**
- 玻璃拟态 + 折射滤镜（SVG displacement map）
- 深浅主题平滑切换（WCAG 对比度标定）
- 组件化首页布局、滚动入场动效

**外部数据代理**（前端禁止直连第三方，全部经 Worker 边缘缓存）
- GitHub 用户 / 仓库数据（三级兜底：缓存 → 过期缓存 → 快照）
- LeetCode 提交统计
- 网易云歌单 / 歌词
- Cloudflare Analytics 站点流量（Token 只留在 Worker，5 分钟边缘缓存）

## 🧰 技术栈

| 层 | 技术 |
|---|---|
| 后端 | Cloudflare Workers · Hono · TypeScript |
| 数据库 | Cloudflare D1（SQLite） |
| 对象存储 | Cloudflare R2（音频库） |
| 认证 | JWT（HS256）+ PBKDF2 |
| 前端 | React 18 · Vite · Ant Design · Zustand · React Router |

## 📁 仓库结构

```
Kakuki/
├── frontend/     # React SPA（详见 frontend/ 目录）
└── cloudflare/   # Workers 后端（详见 cloudflare/README.md）
    ├── src/      # auth / blog / checkin / media / proxy / stats / ratelimit
    ├── schema.sql # D1 表结构
    └── wrangler.jsonc
```

后端的特性清单、配置密钥表与部署细节见 [cloudflare/README.md](cloudflare/README.md)。

## 🚀 快速开始

### 前端

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
```

### 后端

```bash
cd cloudflare
npm install
npm run db:schema:local   # 本地建表
npm run dev               # http://localhost:8787
```

### 部署

```bash
cd frontend  && npm run build      # 产出 ../frontend/dist，由 Worker assets 托管
cd cloudflare && npm run deploy
```

首次部署的 D1 / R2 / Secret 配置步骤见 [cloudflare/README.md](cloudflare/README.md#-首次部署)。

## 🔁 自动数据同步（本机运行）

站点本身会实时拉取 GitHub / LeetCode 并缓存；以下三项需要本机定时任务（`scripts/` 为本地运维脚本，不入库）：

1. **PrisTimer 专注时长** → `scripts/sync-pristimer.py`（只读本机库，按日聚合 `finished` 会话上报 `/api/v1/focus/sync/`）
2. **LeetCode 数据快照** → 刷新 `frontend/src/data/leetcodeStatic.js`（从站点公开代理 `GET /api/v1/leetcode/:user/` 拉取，前端离线兜底用）
3. **GitHub 头像快照** → 刷新 `frontend/public/github-avatar.jpg`（下载 GitHub 头像转 JPEG）

```powershell
powershell -ExecutionPolicy Bypass -File scripts\schedule-auto-sync.ps1   # 注册计划任务 Kakuki-AutoSync（每 4 小时一次）
powershell -ExecutionPolicy Bypass -File scripts\sync-all.ps1             # 立即手动跑一次（幂等）
```

同步日志追加到 `logs/sync.log`（已 gitignore）。任一步失败不影响其余步骤，网络受限时快照保留旧文件。

## 📄 License

MIT
