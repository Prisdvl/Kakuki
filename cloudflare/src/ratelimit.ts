/**
 * DRF 风格限流（D1 固定窗口）：匿名 120/min 按 IP，认证 300/min 按用户。
 * 对齐 settings.py 的 THROTTLE_ANON / THROTTLE_USER；超限返回 DRF 同款 429 文案。
 */
import type { Context } from 'hono';
import type { Env } from './util';
import { clientIp } from './util';

const ANON_LIMIT = 120;
const USER_LIMIT = 300;

export async function checkRateLimit(c: Context<{ Bindings: Env }>): Promise<Response | null> {
  const user = c.get('authUser' as never) as { id: number } | undefined;
  const identity = user ? `user:${user.id}` : `ip:${clientIp(c) ?? 'unknown'}`;
  const limit = user ? USER_LIMIT : ANON_LIMIT;

  // UTC 固定一分钟窗口
  const windowStart = Math.floor(Date.now() / 60_000) * 60_000;
  const key = `${limit === ANON_LIMIT ? 'anon' : 'user'}|${identity}`;

  const res = await c.env.DB.prepare(
    `INSERT INTO rate_limits (key, window_start, count) VALUES (?1, ?2, 1)
     ON CONFLICT (key, window_start) DO UPDATE SET count = count + 1
     RETURNING count`,
  )
    .bind(key, windowStart)
    .first<{ count: number }>();

  // ~1% 概率清理 10 分钟前的旧窗口
  if (Math.random() < 0.01) {
    c.env.DB.prepare('DELETE FROM rate_limits WHERE window_start < ?1')
      .bind(windowStart - 600_000)
      .run()
      .catch(() => {});
  }

  if (res && res.count > limit) {
    const waitSec = Math.ceil((windowStart + 60_000 - Date.now()) / 1000);
    return Response.json(
      { code: 429, message: `Request was throttled. Expected available in ${waitSec} seconds.`, data: null },
      { status: 429 },
    );
  }
  return null;
}
