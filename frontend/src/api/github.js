import request from './request';

/**
 * GitHub 公开数据（经 Worker 代理）
 *
 * 不要改回直连 api.github.com：未认证配额只有 60 次/小时/IP，
 * 访客几次刷新就打满，随后全部 403 —— 项目卡会空掉。
 * 代理侧有 1 小时 Cache API 缓存 + 快照兜底，见 cloudflare/src/github.ts。
 */
export const GITHUB_USERNAME = 'Prisdvl';

export const githubApi = {
  user: (login = GITHUB_USERNAME) => request.get(`/github/user/${login}/`),
  repos: (login = GITHUB_USERNAME) => request.get(`/github/repos/${login}/`),
};

export default githubApi;
