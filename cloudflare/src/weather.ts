/**
 * 天气代理：GET /api/v1/weather/?city=北京
 *
 * 上游：uapis.cn 免费天气接口（无需鉴权）
 *   GET https://uapis.cn/api/v1/misc/weather?city=<城市>
 *   → { province, city, adcode, weather, weather_icon, temperature,
 *       wind_direction, wind_power, humidity, report_time }
 *
 * 前端禁止直连第三方：全部经 Worker，Cache API 缓存 10 分钟，
 * 上游不可达时返回「未知天气」但不报错（保持卡片骨架可用）。
 */
import { Hono } from 'hono';

const WEATHER_UPSTREAM = 'https://uapis.cn/api/v1/misc/weather';

export const weatherRoutes = new Hono()
  .get('/weather/', async (c) => {
    const city = (c.req.query('city') || '').trim().slice(0, 20) || '北京';

    const cacheKey = new Request(
      `https://cache.internal/weather/${encodeURIComponent(city)}`,
      c.req.raw
    );
    const cache = caches.default;
    try {
      const cached = await cache.match(cacheKey);
      if (cached) return cached;
    } catch {
      /* dev 域名不支持 Cache API 时忽略 */
    }

    let payload: Record<string, unknown> = {
      city,
      weather: '未知',
      temperature: null,
      report_time: '',
    };
    try {
      const upstream = await fetch(
        `${WEATHER_UPSTREAM}?city=${encodeURIComponent(city)}`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0 (Kakuki weather widget)' },
          signal: AbortSignal.timeout(8000),
        }
      );
      if (upstream.ok) {
        const j = (await upstream.json().catch(() => null)) as Record<string, unknown> | null;
        if (j && typeof j === 'object') payload = { ...payload, ...j };
      }
    } catch (e) {
      console.warn('[weather] upstream failed:', e);
    }

    const resp = Response.json(payload);
    try {
      const cacheable = resp.clone();
      cacheable.headers.set('Cache-Control', 'public, max-age=600');
      await cache.put(cacheKey, cacheable);
    } catch {
      /* ignore */
    }
    return resp;
  });