import request from './request';

/**
 * 站点流量统计（Cloudflare Analytics，经 Worker 代理）
 *
 * 后端契约：GET /stats/traffic/?days=7
 *   data: {
 *     zone, days, source: 'live'|'stale'|'empty',
 *     series: [{ date, requests, bytes, uniques }],
 *     totals: { requests, bytes, uniques },
 *     top_paths: [{ path, requests, bytes }],
 *     generated_at
 *   }
 *
 * 公开读接口（对齐首页 GitHub/LeetCode 卡片），无需登录。
 * Worker 侧有 5 分钟缓存，token 不下发到浏览器。
 */
const statsApi = {
  traffic: (days = 7) => request.get('/stats/traffic/', { params: { days } }),
};

export default statsApi;
