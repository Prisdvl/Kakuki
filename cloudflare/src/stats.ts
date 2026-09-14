/**
 * 站点流量统计（Cloudflare Analytics GraphQL）
 *
 * 数据源：Cloudflare GraphQL Analytics API（api.cloudflare.com/client/v4/graphql）。
 * 凭证：CF_API_TOKEN（wrangler secret，Analytics:Read 权限）+ CF_ZONE_ID（vars）。
 *
 * 为什么走 Worker 而非前端直连：GraphQL API 需要 Bearer Token 鉴权，
 * token 绝不能下发到浏览器；且 Worker 侧可加缓存，避免每次访问都消耗配额。
 *
 * 数据集选择（2026-09-14 对着线上账号实测确认）：
 *   - 日粒度序列 → httpRequests1dGroups，支持 7~30 天区间，带 uniq.uniques。
 *   - 热门路径   → httpRequestsAdaptiveGroups。旧的 httpRequests1hGroups 维度只有
 *                  date / datetime，压根没有 clientRequestPath；把它写进查询会让
 *                  整个请求报 "unknown field" 而全盘失败（此前线上一直返回空数据
 *                  就是这个原因）。adaptive 数据集在本账号额度下时间跨度上限为
 *                  1 天，所以热门路径固定是「近 24 小时」，窗口与总量序列不同。
 *   两个数据集分开发请求：热门路径失败不应连累总量/趋势图。
 *
 * 缓存：5 分钟。命中即返回；上游失败返回过期缓存；再无缓存则返回空数据（不报错）。
 * 权限：公开读（对齐首页 GitHub / LeetCode 卡片，任何人可见流量概况）。
 */
import { Hono } from 'hono';
import type { Env } from './util';
import { fail, ok } from './util';

const CF_GRAPHQL = 'https://api.cloudflare.com/client/v4/graphql';
const TTL_MS = 5 * 60 * 1000; // 5 分钟

/** 热门路径的时间窗口：adaptive 数据集跨度上限 1 天，超了会被上游拒绝 */
const TOP_PATHS_WINDOW_MS = 24 * 60 * 60 * 1000;

interface DayPoint {
  date: string;
  requests: number;
  bytes: number;
  uniques: number;
}

interface TopPath {
  path: string;
  requests: number;
  bytes: number;
}

/** httpRequests1dGroups 单组 */
interface DailyGroup {
  dimensions: { date: string };
  sum: { requests: number; bytes: number };
  uniq: { uniques: number };
}

/** httpRequestsAdaptiveGroups 单组 */
interface AdaptiveGroup {
  count: number;
  dimensions: { clientRequestPath: string };
  sum: { edgeResponseBytes: number };
}

interface StatsPayload {
  zone: string;
  days: number;
  series: DayPoint[];
  totals: { requests: number; bytes: number; uniques: number };
  top_paths: TopPath[];
  source: 'live' | 'stale' | 'empty';
  generated_at: string;
}

/** 纯日期（Cloudflare Analytics 只接受 yyyy-MM-dd，不接受带时间的 ISO） */
function utcDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return utcDate(d);
}

/** 空数据（上游失败且无缓存时兜底，保证前端不白屏） */
function emptyPayload(days: number): StatsPayload {
  return {
    zone: '',
    days,
    series: [],
    totals: { requests: 0, bytes: 0, uniques: 0 },
    top_paths: [],
    source: 'empty',
    generated_at: new Date().toISOString(),
  };
}

/** 统一的 GraphQL 请求，返回 viewer.zones[0]；任何错误直接抛出 */
async function graphqlRequest<T>(token: string, query: string): Promise<T | undefined> {
  const resp = await fetch(CF_GRAPHQL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`CF GraphQL HTTP ${resp.status}: ${text.slice(0, 200)}`);
  }

  const body = (await resp.json()) as {
    data?: { viewer?: { zones?: T[] } };
    errors?: Array<{ message: string }>;
  };

  if (body.errors?.length) throw new Error(`CF GraphQL error: ${body.errors[0].message}`);
  return body.data?.viewer?.zones?.[0];
}

/** 近 N 天日粒度请求 / 字节 / 独立访客 */
async function fetchDailySeries(token: string, zone: string, days: number): Promise<DayPoint[]> {
  const from = daysAgo(days - 1);
  const to = utcDate(new Date());

  const zoneData = await graphqlRequest<{ httpRequests1dGroups?: DailyGroup[] }>(
    token,
    `query {
      viewer {
        zones(filter: { zoneTag: "${zone}" }) {
          httpRequests1dGroups(limit: ${days}, filter: { date_geq: "${from}", date_leq: "${to}" }, orderBy: [date_ASC]) {
            dimensions { date }
            sum { requests bytes }
            uniq { uniques }
          }
        }
      }
    }`,
  );

  return (zoneData?.httpRequests1dGroups ?? []).map((g) => ({
    date: g.dimensions.date,
    requests: g.sum.requests,
    bytes: g.sum.bytes,
    uniques: g.uniq.uniques,
  }));
}

/** 热门路径：近 24 小时（adaptive 数据集时间跨度上限） */
async function fetchTopPaths(token: string, zone: string): Promise<TopPath[]> {
  const now = Date.now();
  const from = new Date(now - TOP_PATHS_WINDOW_MS).toISOString();
  const to = new Date(now).toISOString();

  const zoneData = await graphqlRequest<{ httpRequestsAdaptiveGroups?: AdaptiveGroup[] }>(
    token,
    `query {
      viewer {
        zones(filter: { zoneTag: "${zone}" }) {
          httpRequestsAdaptiveGroups(limit: 50, filter: { datetime_geq: "${from}", datetime_leq: "${to}" }, orderBy: [count_DESC]) {
            count
            dimensions { clientRequestPath }
            sum { edgeResponseBytes }
          }
        }
      }
    }`,
  );

  const pathMap = new Map<string, TopPath>();
  for (const g of zoneData?.httpRequestsAdaptiveGroups ?? []) {
    const p = g.dimensions.clientRequestPath || '/';
    const cur = pathMap.get(p) ?? { path: p, requests: 0, bytes: 0 };
    cur.requests += g.count ?? 0;
    cur.bytes += g.sum.edgeResponseBytes ?? 0;
    pathMap.set(p, cur);
  }

  return [...pathMap.values()].sort((a, b) => b.requests - a.requests).slice(0, 10);
}

/** 聚合出完整 payload */
async function fetchStats(env: Env, zone: string, days: number): Promise<StatsPayload> {
  const token = env.CF_API_TOKEN;
  if (!token) throw new Error('CF_API_TOKEN not configured');

  // 两个数据集分开发请求：热门路径失败时，总量与趋势图仍要正常返回
  const [series, top_paths] = await Promise.all([
    fetchDailySeries(token, zone, days),
    fetchTopPaths(token, zone).catch((e: unknown) => {
      console.warn(`[stats] top paths failed: ${e instanceof Error ? e.message : String(e)}`);
      return [] as TopPath[];
    }),
  ]);

  const totals = {
    requests: series.reduce((s, d) => s + d.requests, 0),
    bytes: series.reduce((s, d) => s + d.bytes, 0),
    uniques: series.reduce((s, d) => s + d.uniques, 0),
  };

  return {
    zone,
    days,
    series,
    totals,
    top_paths,
    source: 'live',
    generated_at: new Date().toISOString(),
  };
}

export const statsRoutes = new Hono<{ Bindings: Env }>().get('/stats/traffic/', async (c) => {
  const zone = c.env.CF_ZONE_ID;
  const days = Math.min(30, Math.max(7, Number(c.req.query('days') || 7)));

  if (!c.env.CF_API_TOKEN || !zone) {
    return fail(503, '流量统计未配置（缺少 CF_API_TOKEN / CF_ZONE_ID）');
  }

  const cache = caches.default;
  const cacheKey = `stats/traffic/${zone}/${days}`;
  const key = new Request(`https://cache.internal/${cacheKey}`);
  let stale: StatsPayload | null = null;

  try {
    const hit = await cache.match(key);
    if (hit) {
      const ts = Number(hit.headers.get('x-cached-at') || 0);
      const parsed = (await hit.json()) as StatsPayload;
      if (Date.now() - ts < TTL_MS) {
        return ok(parsed, 200, 'ok');
      }
      stale = parsed;
    }
  } catch {
    /* dev 环境 Cache API 不可用时忽略 */
  }

  try {
    const payload = await fetchStats(c.env, zone, days);
    const stored = new Response(JSON.stringify(payload), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'x-cached-at': String(Date.now()),
        'Cache-Control': 'public, max-age=300',
      },
    });
    try { await cache.put(key, stored.clone()); } catch { /* ignore */ }
    return ok(payload, 200, 'ok');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[stats] fetch failed: ${msg}`);
    if (stale) return ok(stale, 200, 'ok');
    return ok(emptyPayload(days), 200, 'ok');
  }
});
