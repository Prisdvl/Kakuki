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
        bio: 'No such thing as a life is better than yourz.',
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

  return null;
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
    // 后端不可用（网络错误 / 404 / 5xx）时走本地降级数据
    if (!response || [404, 502, 503, 504].includes(response?.status)) {
      const mocked = mockResolve(config);
      if (mocked) return mocked;
    }
    if (response?.status === 401 && config && !config._retried) {
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
