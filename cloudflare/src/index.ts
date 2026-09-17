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
import { githubRoutes } from './github';
import { audioRoutes } from './audio';
import { mediaRoutes } from './media';
import { statsRoutes } from './stats';
import { weatherRoutes } from './weather';
import { checkRateLimit } from './ratelimit';

type AppEnv = { Bindings: Env };

const app = new Hono<AppEnv>().basePath('/api/v1');

// 认证解析：结果挂到 context 供限流与业务共用
app.use('*', async (c, next) => {
  const user = await authUser(c);
  if (user) c.set('authUser' as never, user as never);
  await next();
});

// 限流：媒体流端点除外（播放一首歌会发多次 Range 请求，计入限流会误伤正常听歌）
app.use('*', async (c, next) => {
  if (c.req.method === 'GET' && /\/netease\/song\/\d+\/stream\/$/.test(c.req.path)) return next();
  if (c.req.method === 'GET' && /\/audio\/[^/]+\/stream\/$/.test(c.req.path)) return next();
  if (c.req.method === 'GET' && /\/media\/(stream|cover)\/[^/]+\/$/.test(c.req.path)) return next();
  const limited = await checkRateLimit(c);
  if (limited) return limited;
  await next();
});

app.route('/', authRoutes);
app.route('/', blogRoutes);
app.route('/', checkinRoutes);
app.route('/', proxyRoutes);
app.route('/', githubRoutes);
app.route('/', audioProbeRoutes);
app.route('/', audioRoutes);
app.route('/', mediaRoutes);
app.route('/', statsRoutes);
app.route('/', weatherRoutes);

app.notFound((c) => fail(404, '未找到。'));

// 兜底：未捕获异常不泄露堆栈（对齐 Django 统一异常处理）
app.onError((err, c) => {
  console.error('[kakuki] unhandled error:', err);
  return fail(500, '服务器内部错误');
});

export default app;
