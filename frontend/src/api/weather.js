import request from './request';

/**
 * 天气（经 Worker 代理 /api/v1/weather/?city=，边缘缓存 10 分钟）
 * 上游：uapis.cn 免费天气接口。前端不直连第三方。
 */
export const getWeather = (city = '北京') =>
  request.get('/weather/', { params: { city } });

export const CITY_KEY = 'kakuki-weather-city';

export function readCity() {
  try { return localStorage.getItem(CITY_KEY) || '北京'; } catch { return '北京'; }
}

export function saveCity(city) {
  try { localStorage.setItem(CITY_KEY, city); } catch { /* ignore */ }
}