/**
 * 手动同步助手连接（PrisTimer 专注时长，仅本机 open 站点可用）
 * 配套后端：本机 local-sync/helper.py（Python 单文件 HTTP 服务）。
 */

export const LOCAL_HELPER_PORT = 8787;
const HELPER_BASE = `http://127.0.0.1:${LOCAL_HELPER_PORT}`;

/** 当前页面是否运行在用户自己的电脑上（本机站点） */
export function isLocalHost() {
  const h = window.location.hostname || '';
  return h === 'localhost' || h === '127.0.0.1' || h === '::1' || h.endsWith('.local');
}

/** 探测本机助手是否存活；未运行返回 null */
export async function probeLocalHelper() {
  try {
    const r = await fetch(`${HELPER_BASE}/health`, {
      signal: AbortSignal.timeout(1500),
    });
    if (!r.ok) return null;
    return await r.json().catch(() => ({}));
  } catch {
    return null;
  }
}

/** 触发同步：把登录态 JWT 交给本机助手，由它读取 PrisTimer 并上传 D1 */
export async function triggerLocalSync() {
  const token = localStorage.getItem('access_token');
  if (!token) {
    throw new Error('请先登录 kakuki.top 再同步');
  }
  const r = await fetch(`${HELPER_BASE}/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    signal: AbortSignal.timeout(25000),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.ok === false) {
    throw new Error(data.message || `同步失败（HTTP ${r.status}）`);
  }
  return data;
}