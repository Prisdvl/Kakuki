import request from "./request";

const LEETCODE_USERNAME = "Likey-e";
const CACHE_KEY = "kakuki-leetcode-cache";

/**
 * LeetCode 数据（经 Worker 代理 /api/v1/leetcode/:user/）。
 * 静态快照已废弃（2026-09 同步机制重构）：
 *  - 成功拉取 → 写 localStorage 作客户端缓存（下次离线/失败时的兜底）
 *  - 失败 → 读缓存并标记 stale（调用方可展示「离线数据」角标）
 */
export const leetcodeApi = {
  getAllData: async (username = LEETCODE_USERNAME) => {
    try {
      const res = await request.get(`/leetcode/${username}/`);
      if (res && res.profile) {
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(res)); } catch { /* 忽略 */ }
      }
      return res || { profile: null, calendar: {}, recentSubmissions: [] };
    } catch (err) {
      console.error("LeetCode API error:", err);
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
        if (cached) return { ...cached, stale: true };
      } catch { /* 忽略 */ }
      return { profile: null, calendar: {}, recentSubmissions: [] };
    }
  },
};

export default leetcodeApi;