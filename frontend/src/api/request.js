import axios from 'axios';
import { STATIC_LEETCODE } from '../data/leetcodeStatic';

const request = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
});

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ============ 线上静态部署降级（无后端时的本地数据层） ============
 * 仅当请求因后端不可用（网络错误 / 404 / 5xx）失败时触发，
 * 本地开发后端在线时不会走这里。覆盖：注册 / 登录 / 当前用户 / LeetCode。
 */
const MOCK_USERS_KEY = 'kakuki_users';
const MOCK_USER_KEY = 'kakuki_user';

const mockUsers = () => {
  try { return JSON.parse(localStorage.getItem(MOCK_USERS_KEY) || '[]'); } catch { return []; }
};
const saveUsers = (u) => localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(u));
const mockCurrent = () => {
  try { return JSON.parse(localStorage.getItem(MOCK_USER_KEY) || 'null'); } catch { return null; }
};
const parseBody = (data) => {
  if (!data) return {};
  if (typeof data === 'string') { try { return JSON.parse(data); } catch { return {}; } }
  return data;
};

function mockResolve(config) {
  const url = config?.url || '';
  const method = (config?.method || 'get').toLowerCase();
  const body = parseBody(config?.data);

  if (url.startsWith('/auth/register/') && method === 'post') {
    if (!body.username || !body.password) {
      return Promise.reject({ response: { status: 400, data: { message: '用户名和密码不能为空' } } });
    }
    const users = mockUsers();
    if (users.some((u) => u.username === body.username)) {
      return Promise.reject({ response: { status: 400, data: { message: '用户名已存在' } } });
    }
    users.push({ id: users.length + 1, username: body.username, password: body.password, nickname: body.nickname || body.username });
    saveUsers(users);
    return Promise.resolve({ code: 200, message: '注册成功', data: { id: users.length } });
  }

  if (url.startsWith('/auth/login/') && method === 'post') {
    const user = mockUsers().find((u) => u.username === body.username && u.password === body.password);
    if (!user) {
      return Promise.reject({ response: { status: 400, data: { message: '用户名或密码错误' } } });
    }
    const token = `mock-${Date.now()}`;
    localStorage.setItem('access_token', token);
    localStorage.setItem('refresh_token', token);
    localStorage.setItem(MOCK_USER_KEY, JSON.stringify({ id: user.id, username: user.username, nickname: user.nickname || user.username }));
    return Promise.resolve({ access: token, refresh: token });
  }

  if (url.startsWith('/auth/me/') && method === 'get') {
    const cur = mockCurrent();
    if (!cur || !localStorage.getItem('access_token')) {
      return Promise.reject({ response: { status: 401, data: { message: '未登录' } } });
    }
    return Promise.resolve({
      code: 200, message: 'ok',
      data: {
        id: cur.id, username: cur.username, nickname: cur.nickname,
        avatar: `${import.meta.env.BASE_URL}github-avatar.jpg`,
        bio: '全栈开发者 · React + Vite + Django · 构建玻璃拟态个人站 Kakuki：博客 / 音乐播放器 / LeetCode 追踪 / 仪表盘工具',
      },
    });
  }

  if (url.startsWith('/auth/refresh/') && method === 'post') {
    const t = localStorage.getItem('refresh_token');
    if (!t) return Promise.reject({ response: { status: 401, data: { message: '未登录' } } });
    return Promise.resolve({ access: t });
  }

  if (url.startsWith('/leetcode/') && method === 'get') {
    return Promise.resolve(STATIC_LEETCODE);
  }

  /* ---- 打卡：后端不可用时用 localStorage 兜底，保证线上仍可打卡 ---- */
  if (url.startsWith('/checkin/') || url.startsWith('/focus/')) {
    return mockCheckin(url, method, body, config);
  }

  return null;
}

/* ============ 打卡 / 专注 本地降级实现 ============ */
const CHECKIN_KEY = 'kakuki-checkins';
const FOCUS_KEY = 'kakuki-focus-stats';

const localDate = (d = new Date()) => {
  const t = new Date(d.getTime() + 8 * 3600 * 1000);
  return t.toISOString().slice(0, 10);
};
const shiftDate = (iso, days) => {
  const t = new Date(`${iso}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + days);
  return t.toISOString().slice(0, 10);
};
const readStore = (key, fallback) => {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || 'null');
    return raw ?? fallback;
  } catch { return fallback; }
};
const writeStore = (key, val) => {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* 配额满则静默 */ }
};

function mockCheckin(url, method, body, config) {
  // 查询参数在 params 上，不在 url 里
  const params = config?.params || {};
  const store = readStore(CHECKIN_KEY, {});      // { 'yyyy-MM-dd': { count, note, source } }
  const focus = readStore(FOCUS_KEY, {});        // { 'yyyy-MM-dd': { total_ms, session_cnt, tags } }
  const today = localDate();

  if (url.startsWith('/checkin/summary/') && method === 'get') {
    const days = Math.min(730, Math.max(30, Number(params.days) || 365));
    const from = shiftDate(today, -(days - 1));
    const dates = Object.keys(store).sort();
    const list = dates.filter((d) => d >= from).sort().reverse();
    const dateSet = new Set(dates);

    let cursor = dateSet.has(today) ? today : shiftDate(today, -1);
    let streak = 0;
    while (dateSet.has(cursor)) { streak += 1; cursor = shiftDate(cursor, -1); }

    let maxStreak = dates.length ? 1 : 0;
    let cur = 1;
    for (let i = 1; i < dates.length; i += 1) {
      if (dates[i] === shiftDate(dates[i - 1], 1)) cur += 1; else cur = 1;
      if (cur > maxStreak) maxStreak = cur;
    }

    return Promise.resolve({
      code: 200, message: 'ok',
      data: {
        today,
        checked_today: dateSet.has(today),
        today_count: store[today]?.count ?? 0,
        streak,
        max_streak: maxStreak,
        total_days: dates.length,
        total_count: dates.reduce((s, d) => s + (store[d].count || 0), 0),
        calendar: list.map((d) => ({ date: d, count: store[d].count, note: store[d].note || '', source: store[d].source || 'manual' })),
      },
    });
  }

  if (url.startsWith('/checkin/calendar/') && method === 'get') {
    const from = params.from || shiftDate(today, -364);
    const to = params.to || today;
    const map = {};
    Object.keys(store).forEach((d) => { if (d >= from && d <= to) map[d] = store[d].count; });
    return Promise.resolve({ code: 200, message: 'ok', data: { from, to, calendar: map } });
  }

  if (/^\/checkin\/[^/]+\/$/.test(url) && method === 'delete') {
    const date = url.replace('/checkin/', '').replace(/\/$/, '');
    delete store[date];
    writeStore(CHECKIN_KEY, store);
    return Promise.resolve({ code: 200, message: '已取消打卡', data: null });
  }

  if (url.startsWith('/checkin/') && method === 'post') {
    const date = body.date || today;
    const count = Math.max(1, Math.min(100, Number(body.count) || 1));
    const existed = !!store[date];
    store[date] = { count, note: body.note || '', source: 'manual' };
    writeStore(CHECKIN_KEY, store);
    return Promise.resolve({ code: existed ? 200 : 201, message: existed ? '打卡已更新' : '打卡成功', data: { date, count, note: store[date].note } });
  }

  if (url.startsWith('/focus/summary/') && method === 'get') {
    const days = Math.min(365, Math.max(7, Number(params.days) || 30));
    const from = shiftDate(today, -(days - 1));
    const keys = Object.keys(focus).sort().reverse();
    const recent = keys.filter((d) => d >= from).map((d) => ({
      date: d,
      total_ms: focus[d].total_ms || 0,
      total_minutes: Math.round((focus[d].total_ms || 0) / 60000),
      session_cnt: focus[d].session_cnt || 0,
      tags: focus[d].tags || [],
    }));
    const total = keys.reduce((s, d) => s + (focus[d].total_ms || 0), 0);
    const todayRow = focus[today];
    return Promise.resolve({
      code: 200, message: 'ok',
      data: {
        today,
        today_ms: todayRow?.total_ms ?? 0,
        today_minutes: Math.round((todayRow?.total_ms ?? 0) / 60000),
        today_sessions: todayRow?.session_cnt ?? 0,
        total_ms: total,
        total_minutes: Math.round(total / 60000),
        total_sessions: keys.reduce((s, d) => s + (focus[d].session_cnt || 0), 0),
        total_days: keys.length,
        recent,
      },
    });
  }

  return Promise.resolve({ code: 200, message: 'ok', data: null });
}

// 401 时用 refresh_token 静默续期并重放原请求
let refreshing = null;

function clearAuthAndRedirect() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return null;
  const res = await axios.post('/api/v1/auth/refresh/', { refresh: refreshToken });
  const access = res.data?.data?.access || res.data?.access;
  if (access) {
    localStorage.setItem('access_token', access);
    return access;
  }
  return null;
}

request.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const { response, config } = error;
    // 后端不可用（网络错误 / 404 / 405 / 5xx，含 vite proxy 转发的 500）时走本地降级数据
    if (!response || [404, 405, 500, 502, 503, 504].includes(response?.status)) {
      const mocked = mockResolve(config);
      if (mocked) return mocked;
    }
    if (response?.status === 401 && config && !config._retried) {
      // 标记了 skipAuthRedirect 的请求（如打卡写入）由调用方自行处理未登录状态，
      // 不做整页跳转 —— 否则匿名访客点一下打卡就会被弹出首页。
      if (config.skipAuthRedirect) return Promise.reject(error);

      config._retried = true;
      try {
        refreshing = refreshing || refreshAccessToken();
        const access = await refreshing;
        refreshing = null;
        if (access) {
          config.headers.Authorization = `Bearer ${access}`;
          return request(config);
        }
      } catch {
        refreshing = null;
      }
      clearAuthAndRedirect();
    }
    return Promise.reject(error);
  }
);

/**
 * 统一解析列表响应：兼容 {code,message,data:{count,results}} 包装格式
 * 与原生 {count,results} / 纯数组格式
 */
export function extractList(res) {
  const d = res?.data ?? res ?? {};
  if (Array.isArray(d)) return d;
  if (Array.isArray(d.results)) return d.results;
  return [];
}

export default request;
