/**
 * 兜底示例曲目集
 *
 * 背景（2026-09-13 经 Cloudflare 边缘实测确认）：
 *   网易云 `music.163.com/song/media/outer/url` 免费外链接口**已关闭** ——
 *   现在返回的是 107KB 的 HTML 网页（响应体以 `<!DOCTYPE ht` 开头），
 *   而不是音频。因此线上歌单里的曲目在当前机制下**永远无法播放**，
 *   与网络出口、风控、代理都无关。
 *
 * 在歌单曲目全部不可播时用这组曲目兜底，保证播放器有声音、频谱有输出。
 * 来源：SoundHelix（CC-BY，长期稳定、明确允许直链，专为示例/测试提供）。
 *
 * 注意走的是**同源代理** `/api/v1/audio/sh-N/stream/` 而不是直连 SoundHelix：
 * SoundHelix 不返回 Access-Control-Allow-Origin，而播放器要把 <audio> 接入
 * Web Audio 做频谱 —— 跨域无 CORS 的媒体会被浏览器静音（看着在播但没声音）。
 * 同源代理后既规避该问题，又拿到 Range 支持与边缘缓存。
 *
 * 想换成自己的音乐：把 mp3 放进 frontend/public/music/，
 * 再把下面的 url 改成 `/music/<文件名>` 即可（同源，无需改后端）。
 */

const apiStream = (key) => `/api/v1/audio/${key}/stream/`;

const mk = (n, title, mood) => ({
  id: `sample-${n}`,
  name: title,
  artists: [{ name: 'SoundHelix' }],
  album: '示例曲目（CC-BY）',
  cover: '',
  url: apiStream(`sh-${n}`),
  duration: 0,
  mood,
  isFallback: true,
});

export const FALLBACK_TRACKS = [
  mk(1, 'Sample Track I', 'loop'),
  mk(2, 'Sample Track II', 'calm'),
  mk(3, 'Sample Track III', 'drive'),
  mk(4, 'Sample Track IV', 'night'),
  mk(5, 'Sample Track V', 'warm'),
  mk(6, 'Sample Track VI', 'focus'),
];

export const FALLBACK_PLAYLIST = {
  id: 'kakuki-fallback',
  name: '示例曲目（原歌单外链已失效）',
  coverImgUrl: '',
  trackCount: FALLBACK_TRACKS.length,
  tracks: FALLBACK_TRACKS,
};
