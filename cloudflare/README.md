# Kakuki Cloudflare 版（与 Django 版完全隔离）

Kakuki 博客后端的 Cloudflare Workers 重写版：**Hono + TypeScript + D1**，前端静态资产同源托管，
部署于 Cloudflare 免费层，24 小时在线、无本机依赖。

> 与仓库内 `backend/`（Django + DRF）互不影响。Django 版可继续本机运行；本目录只消费
> `frontend/dist` 构建产物，不修改 `frontend/` 源码。

## 架构

```
浏览器 → kakuki.top (Cloudflare CDN/HTTPS)
           ├─ /api/v1/*        → Worker（Hono）：认证/业务/代理/限流 → D1 (SQLite)
           └─ 其余路径          → 静态资产 frontend/dist（SPA fallback → index.html）
```

- 响应契约与 Django 版逐字段对齐：`{code, message, data}` 包装、DRF 分页 `{count, next, previous, results}`、
  SimpleJWT 风格裸 `{access, refresh}` / `{access}`
- JWT：HS256（Web Crypto），access 1 天 / refresh 7 天，`Authorization: Bearer`
- 密码：PBKDF2-SHA256（100k 迭代，`pbkdf2_sha256$iter$salt$hash` 格式，与 Django 格式兼容，便于未来数据迁移）
- 点赞去重：登录按 user_id、游客按 IP（partial unique index 兜底，语义同 Django UniqueConstraint NULL 行为）
- 限流：D1 固定窗口，匿名 120/min、认证 300/min（对齐 `THROTTLE_ANON/USER`）
- 代理：LeetCode（leetcode.cn GraphQL，Cache API 30 分钟）、网易云（歌单/歌词/音频流，音频流透传 Range）

## 目录

```
cloudflare/
├── wrangler.jsonc        # Worker 配置（D1 绑定 + assets + run_worker_first）
├── schema.sql            # D1 表结构
├── seed/build-seed.mjs   # 演示数据生成器（输出 seed/seed.sql）
└── src/
    ├── index.ts          # 入口：限流中间件 + 路由挂载
    ├── util.ts           # 响应包装/分页/JWT/PBKDF2/时间/IP
    ├── auth.ts           # register/login/refresh/me/change-password
    ├── blog.ts           # 文章/分类/评论/点赞/杂谈/项目/归档/统计
    ├── proxy.ts          # LeetCode + 网易云代理
    └── ratelimit.ts      # D1 限流
```

## 常用命令

```bash
npm run dev                 # 本地 wrangler dev（自动加载 ../frontend/dist）
npm run deploy              # 部署到 Cloudflare
npm run db:schema:local     # 本地建表
npm run db:seed:local       # 本地灌演示数据
npm run db:schema:remote    # 远程建表
npm run db:seed:remote      # 远程灌演示数据
npm run typecheck           # tsc --noEmit
```

## 演示账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | `Prisdvl` | `***REDACTED***` |
| 普通用户 | `demo` | `demo123456` |

## 首次部署步骤（已完成过一次后无需重复）

1. `wrangler login`
2. `wrangler d1 create kakuki-db` → 把返回的 `database_id` 填入 `wrangler.jsonc`
3. `wrangler secret put JWT_SECRET`（生产 JWT 密钥，强随机）
4. `npm run db:schema:remote && npm run db:seed:remote`
5. `npm run deploy`
6. Cloudflare 控制台为 Worker 绑定 Custom Domain `kakuki.top`（或 `wrangler deploy --routes`）

## 与 Django 版的差异（有意为之）

| 项 | Django 版 | Workers 版 |
|----|-----------|------------|
| 数据库 | SQLite / MySQL | D1（云上 SQLite） |
| 文件上传（封面/头像） | MEDIA 目录 | 不支持，字段存 URL |
| 分页 page_size 参数 | 忽略（固定 10） | 支持（1-100） |
| 删除响应 | HTTP 204 空 body | HTTP 200 + `{code:204}`（HTTP 规范兼容） |
| LeetCode/网易云缓存 | 单实例内存 | Cache API（边缘节点级） |
