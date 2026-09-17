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
- iOS 风格毛玻璃 + 克制的描边与圆角（纯色底，无装饰性背景层，滚动流畅）
- 深浅主题平滑切换（WCAG 对比度标定）
- 组件化首页自由布局（5 档宽度 · 任意格投放 · 可添加 站点统计/分类云/最近评论/天气 等组件）

**外部数据代理**（前端禁止直连第三方，全部经 Worker 边缘缓存）
- GitHub 用户 / 仓库数据（实时拉取 + 前端缓存上次成功结果兜底）
- LeetCode 提交统计（同上）
- 天气（uapis.cn，10 分钟边缘缓存）
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

## 🔄 数据同步（已改为手动，不再有定时脚本）

站点对 GitHub / LeetCode / 天气等外部数据一律**实时经 Worker 代理拉取**，
前端把最近一次成功结果缓存到 localStorage（代理不可达时展示「离线数据」而非空页）。

**PrisTimer 专注时长** 改为**登录后手动同步**（2026-09 起废弃定时脚本与静态快照）：

1. 本机运行简助助手（唯一保留的本机组件，无定时任务、仅标准库）：

   ```bash
   python local-sync/helper.py        # 监听 http://127.0.0.1:8787
   ```

2. 在**本机打开**站点并登录（线上 kakuki.top 会提示请在本机打开）：
   - 仪表盘「已学习时间」卡右上角，或导航栏登录态下的「同步」按钮
   - 点击 → 助手读本机 PrisTimer 库（只读、按日聚合 `finished` 会话）
     → 以你的登录态 JWT 上报 `/api/v1/focus/sync/` → 卡片局部刷新，
     并显示「新增 X 天 / Y 分钟」与最近同步时间

同步鉴权复用登录态 JWT（后端同时兼容旧的 `X-Sync-Token`）。

## 📄 License

MIT
