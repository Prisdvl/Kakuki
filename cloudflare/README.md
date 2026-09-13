# Kakuki Backend

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare%20Workers-F6821F?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Hono](https://img.shields.io/badge/Hono-4-E36002?logo=hono&logoColor=white)](https://hono.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&logoColor=white)](package.json)
[![D1](https://img.shields.io/badge/D1-SQLite-07401e?logo=cloudflare&logoColor=white)](wrangler.jsonc)
[![R2](https://img.shields.io/badge/R2-Object%20Storage-07401e?logo=cloudflare&logoColor=white)](wrangler.jsonc)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)

**Kakuki 个人博客的后端服务** — 基于 Cloudflare Workers 的全 Serverless 实现

> Hono + TypeScript + Cloudflare Workers/D1/R2，驱动 [kakuki.top](https://kakuki.top) 的全部业务接口：
> 认证、博客、评论、点赞、归档、每日打卡、站内音频库、外部数据代理。免费额度内运行，24 小时在线、零本机依赖。

---

## ✨ 特性

**内容与认证**
- 文章 / 分类 / 评论 / 点赞 / 杂谈（Talks）/ 项目展示 / 归档统计，DRF 风格分页契约
- JWT 认证：HS256（Web Crypto），access 1 天 / refresh 7 天
- 密码 PBKDF2-SHA256（100k 迭代），与 Django 格式兼容（`pbkdf2_sha256$iter$salt$hash`）
- 注册关闭，仅站长账号（D1 手工管理）

**互动与打卡**
- 每日打卡 + 连续天数统计（`/checkin/summary/` 全站统一口径）
- 专注时长上报（配合本地 PrisTimer 计时器，令牌鉴权）
- 点赞去重：登录按 user_id、游客按 IP（partial unique index 兜底）

**站内音频库**
- 上传本地音乐到 R2 对象存储（单文件 ≤ 60 MiB，**库总容量硬上限 10 GiB**，永不越出免费额度）
- 曲目元数据存 D1（强一致，上传即见），音频二进制存 R2
- 播放走同源流接口 `/api/v1/media/stream/:id/`，R2 原生 range 读取，支持进度条拖动（206）

**外部数据代理**（前端禁止直连第三方 API，全部经 Worker 边缘缓存）
- GitHub 用户 / 仓库数据（1h Cache API → 过期缓存 → 内置快照三级兜底）
- LeetCode（leetcode.cn GraphQL；WAF 拦截数据中心 IP 时返回真实数据快照）
- 网易云音乐歌单 / 歌词 / 音频流（透传 Range）

**稳定性**
- D1 固定窗口限流：匿名 120/min、认证 300/min
- 响应统一 `{code, message, data}` 包装；代理响应带 `X-Kakuki-Cache: hit|miss|stale|snapshot`
- 前端静态资产同源托管（Worker assets + SPA fallback），音频同源保证 Web Audio 可用

## 🧰 技术栈

| 层 | 技术 |
|---|---|
| 运行时 | Cloudflare Workers |
| 框架 | Hono + TypeScript |
| 数据库 | Cloudflare D1（SQLite） |
| 对象存储 | Cloudflare R2（音频库） |
| 认证 | JWT（Web Crypto HS256）+ PBKDF2 |
| 缓存 | Cache API（边缘节点级） |

## 📁 项目结构

```
cloudflare/
├── wrangler.jsonc        # Worker 配置（D1 + R2 绑定 + assets + run_worker_first）
├── schema.sql            # D1 表结构
├── src/
│   ├── index.ts          # 入口：限流中间件 + 路由挂载
│   ├── util.ts           # 响应包装 / 分页 / JWT / PBKDF2 / 时间 / IP
│   ├── auth.ts           # login / refresh / me / change-password
│   ├── blog.ts           # 文章 / 分类 / 评论 / 点赞 / 杂谈 / 项目 / 归档 / 统计
│   ├── checkin.ts        # 每日打卡 + 专注时长
│   ├── media.ts          # 站内音频库（R2 存储 + 10 GiB 容量守卫 + Range 流）
│   ├── proxy.ts          # LeetCode + 网易云代理
│   └── ratelimit.ts      # D1 限流
└── package.json
```

## 🚀 快速开始

```bash
npm install

# 本地开发（自动加载 ../frontend/dist 静态资产）
npm run dev

# 建表（本地 / 远程）
npm run db:schema:local
npm run db:schema:remote

# 类型检查 / 部署
npm run typecheck
npm run deploy
```

### 首次部署

1. `wrangler login`
2. `wrangler d1 create kakuki-db` → 将返回的 `database_id` 填入 `wrangler.jsonc`
3. `wrangler r2 bucket create kakuki-media` → 绑定 `MEDIA_R2`
4. `wrangler secret put JWT_SECRET`（强随机；本地 dev 用 `wrangler.jsonc` 里的占位密钥即可）
5. `npm run db:schema:remote && npm run deploy`
6. Cloudflare 控制台为 Worker 绑定自定义域名（或 `wrangler deploy --routes`）

## 🔑 配置与密钥

| 绑定 | 类型 | 用途 |
|------|------|------|
| `DB` | D1 | 业务数据（文章 / 评论 / 打卡 / 专注 / 音频元数据） |
| `MEDIA_R2` | R2 | 音频二进制与封面（`audio/<id>`、`cover/<id>`） |
| `JWT_SECRET` | Secret | HS256 签名密钥（`wrangler secret put`，勿写入仓库） |
| `SYNC_TOKEN` | Secret | PrisTimer 专注数据上报令牌 |
| `GITHUB_TOKEN` | Secret | 可选：GitHub 代理提额（5000 req/h） |

> 所有密钥通过 `wrangler secret` 管理，仓库内只有占位值。`.dev.vars` 已被 gitignore。

## 📄 License

[MIT](LICENSE)
