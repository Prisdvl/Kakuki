# Kakuki

**全栈个人博客平台** — 线上运行于 [kakuki.top](https://kakuki.top)

> 前后端同仓：`frontend/`（React SPA）+ `cloudflare/`（Cloudflare Workers 后端）。
> 全 Serverless 架构，免费额度内运行，24 小时在线、零本机依赖。

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

**界面**
- 玻璃拟态 + 折射滤镜（SVG displacement map）
- 深浅主题平滑切换（WCAG 对比度标定）
- 组件化首页布局、滚动入场动效

**外部数据代理**（前端禁止直连第三方，全部经 Worker 边缘缓存）
- GitHub 用户 / 仓库数据（三级兜底：缓存 → 过期缓存 → 快照）
- LeetCode 提交统计
- 网易云歌单 / 歌词

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
    ├── src/      # auth / blog / checkin / media / proxy / ratelimit
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

## 📄 License

MIT
