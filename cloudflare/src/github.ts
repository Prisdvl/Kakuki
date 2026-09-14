/**
 * 外部代理：GitHub 公开 API
 *
 * 为什么必须走服务端：
 *   浏览器直连 api.github.com 走的是**未认证**配额（60 次/小时/IP）。
 *   访客每次打开首页与项目页各发 1~2 个请求，几个人刷几次就打满，
 *   随后全部 403 —— 表现为项目卡空白或只剩兜底快照，且刷新无用。
 *   放到 Worker 侧后：① 出口 IP 与访客无关；② Cache API 命中时根本不碰 GitHub。
 *
 * 缓存策略：1 小时。命中即返回；上游失败时优先返回过期缓存，
 * 再退到内置快照，保证页面永远有内容。
 *
 * 可选：给 Worker 配 `GITHUB_TOKEN` secret 可把配额提到 5000 次/小时
 * （wrangler secret put GITHUB_TOKEN）。不配也能跑，靠缓存兜住。
 */
import { Hono } from 'hono';
import type { Env } from './util';
import { fail, ok } from './util';

const GH_API = 'https://api.github.com';
const TTL_MS = 60 * 60 * 1000; // 1h

/** 兜底快照：2026-09-13 从 GitHub 实抓（字段名与 GitHub 原始响应对齐，前端 normalize 直接可用） */
const SNAPSHOT_USER = {
  login: 'Prisdvl',
  id: 182312910,
  name: 'Prisdvl',
  avatar_url: 'https://avatars.githubusercontent.com/u/182312910?v=4',
  bio: 'No such thing as a life is better than yourz.',
  public_repos: 4,
  followers: 3,
  following: 4,
  html_url: 'https://github.com/Prisdvl',
  source: 'snapshot',
};

const SNAPSHOT_REPOS = [
  {
    id: 1366926213, name: 'PrisTimer', fork: false, archived: false,
    description: 'Tauri 2 + Rust + Vue 3 liquid-glass focus timer with anchor-based engine',
    language: 'Vue', html_url: 'https://github.com/Prisdvl/PrisTimer', homepage: '',
    stargazers_count: 0, updated_at: '2026-09-13T03:34:12Z',
  },
  {
    id: 2, name: 'Kakuki', fork: false, archived: false,
    // GitHub 上该仓库描述里的中文已损坏成 "????????"，前端 cleanDescription 会识别并改用中文兜底文案
    description: 'Kakuki - ???????? (Django + React + MySQL)',
    language: 'JavaScript', html_url: 'https://github.com/Prisdvl/Kakuki', homepage: '',
    stargazers_count: 0, updated_at: '2026-09-10T12:27:07Z',
  },
  {
    id: 3, name: 'prisdvl-nvim-config', fork: false, archived: false,
    description: 'My personal Neovim configuration (C/C++ focused, Neovide-friendly)',
    language: 'Lua', html_url: 'https://github.com/Prisdvl/prisdvl-nvim-config', homepage: '',
    stargazers_count: 0, updated_at: '2026-09-10T06:42:02Z',
  },
  {
    id: 4, name: 'homework-grading-system', fork: false, archived: false,
    description: null, language: 'Python',
    html_url: 'https://github.com/Prisdvl/homework-grading-system', homepage: '',
    stargazers_count: 1, updated_at: '2026-05-31T13:27:39Z',
  },
];

const GH_META_PREFIX = 'meta/github-';

/** R2 里由本机 sync-all.ps1 定期推送的同步快照（优先于内置快照使用）。
 *  Worker 数据中心访问 api.github.com 常被阻断，内置快照永远不会自更新；
 *  本机网络可达时把真实 profile/repos 推到这里做运行时兜底。 */
async function storedSnapshot(env: Env, kind: 'user' | 'repos'): Promise<unknown | null> {
  if (!env.MEDIA_R2) return null;
  try {
    const obj = await env.MEDIA_R2.get(`${GH_META_PREFIX}${kind}.json`);
    return obj ? await obj.json() : null;
  } catch {
    return null;
  }
}

let ghLastError = '';

function ghHeaders(env: Env): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    // GitHub 强制要求 UA，缺失会直接 403
    'User-Agent': 'kakuki-blog (+https://kakuki.top)',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (env.GITHUB_TOKEN) h.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  return h;
}

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...extra },
  });

async function proxyGithub(
  env: Env,
  path: string,
  cacheKey: string,
  snapshot: unknown,
  kind: 'user' | 'repos'
): Promise<Response> {
  const cache = caches.default;
  const key = new Request(`https://cache.internal/${cacheKey}`);
  let stale: Response | null = null;

  try {
    const hit = await cache.match(key);
    if (hit) {
      const ts = Number(hit.headers.get('x-cached-at') || 0);
      if (Date.now() - ts < TTL_MS) {
        return json(await hit.json(), 200, {
          'X-Kakuki-Cache': 'hit',
          'Cache-Control': 'public, max-age=300',
        });
      }
      stale = hit;
    }
  } catch {
    /* dev 域名不支持 Cache API 时忽略 */
  }

  try {
    const resp = await fetch(GH_API + path, {
      headers: ghHeaders(env),
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) {
      ghLastError = `HTTP ${resp.status}`;
      console.warn(`[github] HTTP ${resp.status} for ${path}`);
    } else {
      const body = await resp.text();
      const stored = new Response(body, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'x-cached-at': String(Date.now()),
          'Cache-Control': 'public, max-age=3600',
        },
      });
      try { await cache.put(key, stored.clone()); } catch { /* ignore */ }
      return new Response(body, {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Kakuki-Cache': 'miss' },
      });
    }
  } catch (e) {
    ghLastError = e instanceof Error ? e.message : String(e);
    console.warn(`[github] fetch failed for ${path}: ${ghLastError}`);
  }

  // 上游不可用：过期缓存 → 本机同步快照（R2）→ 内置快照
  if (stale) {
    try {
      return json(await stale.json(), 200, {
        'X-Kakuki-Cache': 'stale',
        'Cache-Control': 'public, max-age=60',
      });
    } catch { /* 落到同步/内置快照 */ }
  }
  const stored = await storedSnapshot(env, kind);
  if (stored) {
    return json(stored, 200, {
      'X-Kakuki-Cache': 'synced',
      'Cache-Control': 'public, max-age=300',
    });
  }
  return json(snapshot, 200, { 'X-Kakuki-Cache': 'snapshot' });
}

export const githubRoutes = new Hono<{ Bindings: Env }>()
  .get('/github/user/:login/', async (c) => {
    const login = c.req.param('login');
    return proxyGithub(c.env, `/users/${login}`, `github/user/${login}`, SNAPSHOT_USER, 'user');
  })
  .get('/github/repos/:login/', async (c) => {
    const login = c.req.param('login');
    return proxyGithub(
      c.env,
      `/users/${login}/repos?per_page=100&sort=updated`,
      `github/repos/${login}`,
      SNAPSHOT_REPOS,
      'repos'
    );
  })

  /** 上报 GitHub 资料/仓库同步快照（本机 sync-all.ps1 调用，需 SYNC_TOKEN）：
   *  把真实数据写入 R2 meta/github-{user,repos}.json，作为 Worker 兜底快照。 */
  .post('/github/snapshot/', async (c) => {
    const token = c.env.SYNC_TOKEN;
    const given = c.req.header('X-Sync-Token');
    if (!token) return fail(503, 'SYNC_TOKEN 未配置，同步接口未启用');
    if (!given || given !== token) return fail(401, '同步令牌无效');
    if (!c.env.MEDIA_R2) return fail(503, '对象存储（R2）未绑定');

    let body: { kind?: string; data?: unknown } = {};
    try {
      body = await c.req.json();
    } catch {
      return fail(400, '请求体应为 JSON');
    }
    if (body.kind !== 'user' && body.kind !== 'repos') {
      return fail(400, 'kind 必须为 user 或 repos');
    }
    if (body.data === undefined || body.data === null) {
      return fail(400, '缺少 data 字段');
    }

    await c.env.MEDIA_R2.put(`${GH_META_PREFIX}${body.kind}.json`, JSON.stringify(body.data), {
      httpMetadata: { contentType: 'application/json' },
    });
    return ok({ kind: body.kind }, 200, 'GitHub 同步快照已更新');
  });
