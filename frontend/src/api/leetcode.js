import request from "./request";

const LEETCODE_USERNAME = "Likey-e";

export const leetcodeApi = {
  getAllData: async (username = LEETCODE_USERNAME) => {
    try {
      const res = await request.get(`/leetcode/${username}/`);
      return res || { profile: null, calendar: {}, recentSubmissions: [] };
    } catch (err) {
      console.error("LeetCode API error:", err);
      return { profile: null, calendar: {}, recentSubmissions: [] };
    }
  },
};

export default leetcodeApi;
