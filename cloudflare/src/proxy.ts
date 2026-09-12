/**
 * 外部代理：LeetCode（leetcode.cn GraphQL）+ 网易云音乐
 * 对齐 leetcode_views.py / netease_views.py：裸 JSON（不包装），Cache API 缓存。
 * 音频流端点转发 Range 请求，供前端 <audio> 同源加载出频谱。
 */
import { Hono } from 'hono';
import type { Env } from './util';

/* ---------------- LeetCode ---------------- */

const LC_GRAPHQL = 'https://leetcode.cn/graphql';
const LC_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  Referer: 'https://leetcode.cn/',
  Origin: 'https://leetcode.cn',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
};
const LC_DIFF_MAP: Record<string, string> = { EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard' };
const LC_TOTALS: Record<string, number> = { EASY: 850, MEDIUM: 1750, HARD: 800 };

let lcLastError = '';

async function lcPost(query: string, variables: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  try {
    const resp = await fetch(LC_GRAPHQL, {
      method: 'POST',
      headers: LC_HEADERS,
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!resp.ok) {
      lcLastError = `HTTP ${resp.status}`;
      console.warn(`[leetcode] HTTP ${resp.status} from ${LC_GRAPHQL}`);
      return null;
    }
    return (await resp.json()) as Record<string, unknown>;
  } catch (e) {
    lcLastError = e instanceof Error ? e.message : String(e);
    console.warn(`[leetcode] fetch failed: ${lcLastError}`);
    return null;
  }
}

function fallbackCalendar(): Record<string, number> {
  const cal: Record<string, number> = {};
  const now = Date.now();
  for (let i = 0; i < 180; i++) {
    const key = new Date(now - i * 86_400_000).toISOString().slice(0, 10);
    if (i < 7) cal[key] = 1 + Math.floor(Math.random() * 5);
    else if (i < 30) cal[key] = Math.floor(Math.random() * 4);
    else cal[key] = Math.random() > 0.6 ? Math.floor(Math.random() * 2) : 0;
  }
  return cal;
}

const RECENT_FALLBACK = (): Array<{ title: string; titleSlug: string; timestamp: number }> => {
  const h = 3_600_000;
  const now = Date.now();
  return [
    { title: 'Two Sum', titleSlug: 'two-sum', timestamp: Math.floor((now - 2 * h) / 1000) },
    { title: 'Reverse Linked List', titleSlug: 'reverse-linked-list', timestamp: Math.floor((now - 24 * h) / 1000) },
    { title: 'Binary Tree Inorder Traversal', titleSlug: 'binary-tree-inorder-traversal', timestamp: Math.floor((now - 27 * h) / 1000) },
    { title: 'Valid Parentheses', titleSlug: 'valid-parentheses', timestamp: Math.floor((now - 48 * h) / 1000) },
    { title: 'Merge Two Sorted Lists', titleSlug: 'merge-two-sorted-lists', timestamp: Math.floor((now - 72 * h) / 1000) },
    { title: 'Maximum Subarray', titleSlug: 'maximum-subarray', timestamp: Math.floor((now - 96 * h) / 1000) },
  ];
};

async function fetchLeetcodeLive(userSlug: string): Promise<Record<string, unknown> | null> {
  const progressQuery = `
    query($userSlug: String!) {
      userProfileUserQuestionProgress(userSlug: $userSlug) {
        numAcceptedQuestions { difficulty count }
      }
    }`;
  const progress = await lcPost(progressQuery, { userSlug });
  if (!progress || 'errors' in progress) {
    if (progress) lcLastError = 'graphql errors';
    return null;
  }
  const progData = (progress.data as Record<string, unknown> | undefined)?.userProfileUserQuestionProgress as
    | { numAcceptedQuestions?: Array<{ difficulty: string; count: number }> }
    | undefined;
  if (!progData) {
    lcLastError = 'empty userProfileUserQuestionProgress';
    return null;
  }

  const acList = progData.numAcceptedQuestions ?? [];
  const acSubmissionNum: Array<{ difficulty: string; count: number }> = [];
  const allQuestionsCount: Array<{ difficulty: string; count: number }> = [];
  let totalAc = 0;
  let totalAll = 0;
  for (const key of ['EASY', 'MEDIUM', 'HARD']) {
    const ac = acList.find((x) => x.difficulty === key);
    const solved = ac?.count ?? 0;
    totalAc += solved;
    totalAll += LC_TOTALS[key];
    acSubmissionNum.push({ difficulty: LC_DIFF_MAP[key], count: solved });
    allQuestionsCount.push({ difficulty: LC_DIFF_MAP[key], count: LC_TOTALS[key] });
  }
  acSubmissionNum.unshift({ difficulty: 'All', count: totalAc });
  allQuestionsCount.unshift({ difficulty: 'All', count: totalAll });

  // 日历 / 最近提交：失败回退默认，保证前端始终有内容（对齐 Django 版策略）
  let streak = 0;
  let totalActiveDays = 0;
  let calendar: Record<string, number> = {};
  try {
    const cal = await lcPost(
      `query($userSlug: String!, $year: Int) {
        userProfileCalendar(userSlug: $userSlug, year: $year) { streak totalActiveDays submissionCalendar }
      }`,
      { userSlug, year: new Date().getUTCFullYear() },
    );
    const calData = (cal?.data as Record<string, unknown> | undefined)?.userProfileCalendar as
      | { streak?: number; totalActiveDays?: number; submissionCalendar?: string }
      | undefined;
    if (calData) {
      streak = calData.streak ?? 0;
      totalActiveDays = calData.totalActiveDays ?? 0;
      if (calData.submissionCalendar) calendar = JSON.parse(calData.submissionCalendar);
    }
  } catch {
    /* 回退 */
  }

  let recentSubmissions: Array<{ title: string; titleSlug: string; timestamp: number }> = [];
  try {
    const subs = await lcPost(
      `query($userSlug: String!, $limit: Int) {
        recentSubmitList(userSlug: $userSlug, limit: $limit) { title titleSlug submitTime }
      }`,
      { userSlug, limit: 100 },
    );
    const list = ((subs?.data as Record<string, unknown> | undefined)?.recentSubmitList ?? []) as Array<{
      title?: string;
      titleSlug?: string;
      submitTime?: number | string;
    }>;
    recentSubmissions = list.map((s) => ({
      title: s.title ?? '',
      titleSlug: s.titleSlug ?? '',
      timestamp: Number(s.submitTime) || 0,
    }));
  } catch {
    /* 回退 */
  }
  if (!Object.keys(calendar).length) calendar = fallbackCalendar();
  if (!recentSubmissions.length) recentSubmissions = RECENT_FALLBACK();

  return {
    profile: {
      matchedUser: {
        submitStatsGlobal: { acSubmissionNum },
        profile: { ranking: 0 },
      },
      allQuestionsCount,
    },
    calendar,
    recentSubmissions,
    streak,
    totalActiveDays,
    source: 'live',
  };
}

/* ---------------- 网易云 ---------------- */

const NETEASE_BASE = 'https://music.163.com';
const NETEASE_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  Referer: 'https://music.163.com',
  'Content-Type': 'application/x-www-form-urlencoded',
};
const PRISDVL_PLAYLIST_ID = 2215753622;
const PRISDVL_UID = 1450284080;

const outerUrl = (songId: number | string) => `${NETEASE_BASE}/song/media/outer/url?id=${songId}.mp3`;

async function neGet(endpoint: string, params: Record<string, string | number>): Promise<Record<string, unknown> | null> {
  try {
    const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
    const resp = await fetch(`${NETEASE_BASE}${endpoint}?${qs}`, {
      headers: { 'User-Agent': NETEASE_HEADERS['User-Agent'], Referer: NETEASE_HEADERS.Referer },
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) return null;
    return (await resp.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function nePost(endpoint: string, data: Record<string, string>): Promise<Record<string, unknown> | null> {
  try {
    const resp = await fetch(`${NETEASE_BASE}${endpoint}`, {
      method: 'POST',
      headers: NETEASE_HEADERS,
      body: new URLSearchParams(data).toString(),
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) return null;
    return (await resp.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

interface MappedTrack {
  id: number;
  name: string;
  ar: Array<{ name: string }>;
  al: { name: string; picUrl: string };
  duration: number;
}

async function fetchPlaylistTracks(playlistId: number, limit: number): Promise<Record<string, unknown> | null> {
  const plData = await neGet('/api/v6/playlist/detail', { id: playlistId, n: 0, s: 0 });
  if (!plData) return null;
  const playlist = (plData.playlist ?? {}) as Record<string, unknown>;
  const trackIds = (playlist.trackIds ?? []) as Array<{ id: number }>;
  if (!trackIds.length) return null;

  const songLimit = Math.min(limit, trackIds.length);
  const rawTracks: Array<Record<string, unknown>> = [];
  for (let i = 0; i < songLimit; i += 50) {
    const batch = trackIds.slice(i, i + 50);
    const result = await nePost('/api/v3/song/detail', { c: JSON.stringify(batch.map((t) => ({ id: t.id }))) });
    if (result && Array.isArray(result.songs)) rawTracks.push(...(result.songs as Array<Record<string, unknown>>));
  }

  const mapped: MappedTrack[] = [];
  for (const t of rawTracks) {
    const fee = Number(t.fee ?? 0);
    if (fee === 1 || fee === 4) continue;
    const ar = (t.ar ?? t.artists ?? []) as Array<Record<string, unknown>>;
    const al = (t.al ?? t.album ?? {}) as Record<string, unknown>;
    mapped.push({
      id: Number(t.id),
      name: String(t.name ?? ''),
      ar: ar.map((a) => ({ name: String(a.name ?? '') })),
      al: { name: String(al.name ?? ''), picUrl: String(al.picUrl ?? '') },
      duration: Number(t.dt ?? t.duration ?? 0),
    });
  }

  return {
    playlist: {
      id: playlistId,
      name: playlist.name ?? '',
      coverImgUrl: playlist.coverImgUrl ?? '',
      trackCount: playlist.trackCount ?? trackIds.length,
      creator: 'Prisdvl',
      tracks: mapped,
    },
    song_urls: mapped.map((t) => ({ id: t.id, url: outerUrl(t.id) })),
  };
}

const neteaseError = (message: string, status = 502) => Response.json({ error: message }, { status });

export const proxyRoutes = new Hono<{ Bindings: Env }>()

  /* ---------------- LeetCode ---------------- */
  .get('/leetcode/:username/', async (c) => {
    const username = c.req.param('username');
    const cacheKey = new Request(`https://cache.internal/leetcode/${username}`, c.req.raw);
    const cache = caches.default;
    try {
      const cached = await cache.match(cacheKey);
      if (cached) return cached;
    } catch {
      /* dev 域名不支持 Cache API 时忽略 */
    }
    const live = await fetchLeetcodeLive(username);
    const payload = live ?? {
      profile: {
        matchedUser: {
          submitStatsGlobal: {
            // leetcode.cn WAF 拦截 Cloudflare 数据中心 IP（HTTP 403），live 不可得；
            // fallback 为真实数据快照（2026-09-12：All 210 = 69/129/12）
            acSubmissionNum: [
              { difficulty: 'All', count: 210 },
              { difficulty: 'Easy', count: 69 },
              { difficulty: 'Medium', count: 129 },
              { difficulty: 'Hard', count: 12 },
            ],
          },
          profile: { ranking: 0 },
        },
        allQuestionsCount: [
          { difficulty: 'All', count: 3400 },
          { difficulty: 'Easy', count: 850 },
          { difficulty: 'Medium', count: 1750 },
          { difficulty: 'Hard', count: 800 },
        ],
      },
      calendar: fallbackCalendar(),
      recentSubmissions: RECENT_FALLBACK(),
      streak: 0,
      totalActiveDays: 0,
      source: 'fallback',
      debug: lcLastError, // 诊断用：live 拉取失败原因（前端不读取此字段）
    };
    const resp = Response.json(payload);
    try {
      const cacheable = resp.clone();
      cacheable.headers.set('Cache-Control', 'public, max-age=1800');
      await cache.put(cacheKey, cacheable);
    } catch {
      /* ignore */
    }
    return resp;
  })

  /* ---------------- Netease ---------------- */
  .get('/netease/playlists/', async (c) => {
    const data = await neGet('/api/user/playlist', { uid: PRISDVL_UID, limit: 50 });
    if (!data) return neteaseError('无法连接到网易云 API');
    const playlists = ((data.playlist ?? []) as Array<Record<string, unknown>>).map((pl) => ({
      id: pl.id,
      name: pl.name ?? '',
      coverImgUrl: pl.coverImgUrl ?? '',
      trackCount: pl.trackCount ?? 0,
      playCount: pl.playCount ?? 0,
    }));
    return Response.json({ playlists });
  })

  .get('/netease/bootstrap/', async (c) => {
    const playlistId = Number(c.req.query('playlist_id')) || PRISDVL_PLAYLIST_ID;
    const limit = Number(c.req.query('limit')) || 100;
    const result = await fetchPlaylistTracks(playlistId, limit);
    if (!result) return neteaseError('无法获取歌单数据');
    return Response.json(result);
  })

  .get('/netease/playlist/:id/', async (c) => {
    const data = await neGet('/api/v6/playlist/detail', { id: Number(c.req.param('id')), n: 0, s: 0 });
    if (!data) return neteaseError('API not available');
    return Response.json(data);
  })

  .get('/netease/playlist/:id/tracks/', async (c) => {
    const limit = Number(c.req.query('limit')) || 100;
    const result = await fetchPlaylistTracks(Number(c.req.param('id')), limit);
    if (!result) return neteaseError('API not available');
    return Response.json(result);
  })

  .get('/netease/song/:id/', (c) => Response.json({ data: [{ id: Number(c.req.param('id')), url: outerUrl(c.req.param('id')) }] }))

  .get('/netease/song/:id/lyric/', async (c) => {
    const data = await neGet('/api/song/lyric', { os: 'pc', id: c.req.param('id'), lv: -1, kv: -1, tv: -1 });
    if (!data) return neteaseError('API not available');
    return Response.json(data);
  })

  .get('/netease/search/', async (c) => {
    const keywords = c.req.query('keywords') ?? '';
    const data = await neGet('/api/search/get', { s: keywords, type: 1000, limit: 10 });
    if (!data) return neteaseError('API not available');
    return Response.json(data);
  })

  .get('/netease/user/:uid/', async (c) => {
    const data = await neGet('/api/user/playlist', { uid: Number(c.req.param('uid')), limit: 30 });
    if (!data) return neteaseError('API not available');
    return Response.json(data);
  })

  // 同源音频流：透传 Range，前端 <audio> 加载后 createMediaElementSource 可出频谱
  .get('/netease/song/:id/stream/', async (c) => {
    const headers: Record<string, string> = {
      'User-Agent': NETEASE_HEADERS['User-Agent'],
      Referer: NETEASE_HEADERS.Referer,
    };
    const range = c.req.header('Range');
    if (range) headers.Range = range;
    let upstream: Response;
    try {
      upstream = await fetch(outerUrl(c.req.param('id')), { headers, redirect: 'follow', signal: AbortSignal.timeout(20_000) });
    } catch {
      return neteaseError('音频获取失败');
    }
    if (upstream.status !== 200 && upstream.status !== 206) return neteaseError('音频不可用', upstream.status);
    const respHeaders = new Headers();
    respHeaders.set('Content-Type', upstream.headers.get('Content-Type') ?? 'audio/mpeg');
    respHeaders.set('Accept-Ranges', 'bytes');
    respHeaders.set('Cache-Control', 'no-store');
    const contentRange = upstream.headers.get('Content-Range');
    if (contentRange) respHeaders.set('Content-Range', contentRange);
    const contentLength = upstream.headers.get('Content-Length');
    if (contentLength) respHeaders.set('Content-Length', contentLength);
    return new Response(upstream.body, { status: upstream.status, headers: respHeaders });
  });
