import axios from 'axios';

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
