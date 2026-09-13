import request from './request';

/**
 * 打卡 / 专注 API
 *
 * 后端契约（Cloudflare Worker，{code,message,data} 包装）：
 *  - GET    /checkin/summary/?days=365   今日状态 + 连续天数 + 累计 + 日历
 *  - GET    /checkin/calendar/?from=&to= 区间 date->count
 *  - POST   /checkin/                    手动打卡（幂等，需登录）
 *  - DELETE /checkin/:date/              取消打卡（需登录）
 *  - GET    /focus/summary/?days=30      专注时长总览
 *
 * 写入类接口带 skipAuthRedirect：未登录时由调用方渲染「登录后打卡」，
 * 而不是被全局拦截器重定向到 /login。
 */
const WRITE = { skipAuthRedirect: true };

const checkinApi = {
  summary: (days = 365) => request.get('/checkin/summary/', { params: { days } }),
  calendar: (from, to) => request.get('/checkin/calendar/', { params: { from, to } }),
  create: (payload = {}) => request.post('/checkin/', payload, WRITE),
  remove: (date) => request.delete(`/checkin/${date}/`, WRITE),
  focusSummary: (days = 30) => request.get('/focus/summary/', { params: { days } }),
};

export default checkinApi;
