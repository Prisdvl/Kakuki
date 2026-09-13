/**
 * Kakuki Worker 入口
 * - /api/v1/*  API（限流 → 认证 → 路由）
 * - 其余请求由 wrangler assets 托管的 frontend/dist 处理（SPA fallback）
 */
import { Hono } from 'hono';
import type { Env } from './util';
import { fail } from './util';
import { authRoutes, authUser } from './auth';
import { blogRoutes } from './blog';
import { checkinRoutes } from './checkin';
import { proxyRoutes, audioProbeRoutes } from './proxy';
import { audioRoutes } from './audio';
import { checkRateLimit } from './ratelimit';

type AppEnv = { Bindings: Env };

const app = new Hono<AppEnv>().basePath('/api/v1');

// 认证解析：结果挂到 context 供限流与业务共用
app.use('*', async (c, next) => {
  const user = await authUser(c);
  if (user) c.set('authUser' as never, user as never);
  await next();
});

// 限流：音频流端点除外（Django 版该端点同样不受 DRF 限流）
app.use('*', async (c, next) => {
  if (c.req.method === 'GET' && /\/netease\/song\/\d+\/stream\/$/.test(c.req.path)) return next();
  if (c.req.method === 'GET' && /\/audio\/[^/]+\/stream\/$/.test(c.req.path)) return next();
  const limited = await checkRateLimit(c);
  if (limited) return limited;
  await next();
});

app.route('/', authRoutes);
app.route('/', blogRoutes);
app.route('/', checkinRoutes);
app.route('/', proxyRoutes);
app.route('/', audioProbeRoutes);
app.route('/', audioRoutes);

app.notFound((c) => fail(404, '未找到。'));

// 兜底：未捕获异常不泄露堆栈（对齐 Django 统一异常处理）
app.onError((err, c) => {
  console.error('[kakuki] unhandled error:', err);
  return fail(500, '服务器内部错误');
});

export default app;
