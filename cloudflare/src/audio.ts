/**
 * 内置示例音源（同源代理）
 *
 * 为什么必须走服务端代理而不是前端直连：
 *   播放器用 createMediaElementSource 把 <audio> 接入 Web Audio 做频谱。
 *   一旦元素被接入 Web Audio 图，**跨域且无 CORS 头**的媒体会被静音
 *   （浏览器安全策略，输出全零采样）。SoundHelix 等源不返回
 *   Access-Control-Allow-Origin，直连会出现"看着在播但没声音"。
 *   同源代理后该问题彻底消失，同时获得 Range 支持与边缘缓存。
 *
 * 白名单键值固定，不接受任意 URL，因此不存在 SSRF 面。
 * 想换成自己的音频：把文件放进 frontend/public/music/，
 * 然后改 frontend/src/data/musicFallback.js 的 url 为 /music/<文件名>。
 */
import { Hono } from 'hono';
import type { Env } from './util';
import { fail } from './util';

const SOURCES: Record<string, string> = {
  'sh-1': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  'sh-2': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  'sh-3': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  'sh-4': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
  'sh-5': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
  'sh-6': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
};

export const audioRoutes = new Hono<{ Bindings: Env }>()
  .get('/audio/sources/', (c) => c.json({ keys: Object.keys(SOURCES) }))

  .get('/audio/:key/stream/', async (c) => {
    const key = c.req.param('key');
    const upstreamUrl = SOURCES[key];
    if (!upstreamUrl) return fail(404, '未知音源');

    const headers: Record<string, string> = { 'User-Agent': 'Mozilla/5.0' };
    const range = c.req.header('Range');
    if (range) headers.Range = range;

    let upstream: Response;
    try {
      upstream = await fetch(upstreamUrl, {
        headers,
        redirect: 'follow',
        signal: AbortSignal.timeout(25_000),
      });
    } catch {
      return fail(502, '音源获取失败');
    }

    const ctype = upstream.headers.get('Content-Type') ?? '';
    if (!/audio|octet-stream/i.test(ctype)) {
      void upstream.body?.cancel();
      return fail(502, '音源返回非音频内容');
    }
    if (upstream.status !== 200 && upstream.status !== 206) {
      void upstream.body?.cancel();
      return fail(upstream.status, '音源不可用');
    }

    const respHeaders = new Headers();
    respHeaders.set('Content-Type', 'audio/mpeg');
    respHeaders.set('Accept-Ranges', 'bytes');
    // 示例曲目内容不可变，长缓存降低回源
    respHeaders.set('Cache-Control', 'public, max-age=86400');
    const contentRange = upstream.headers.get('Content-Range');
    if (contentRange) respHeaders.set('Content-Range', contentRange);
    const contentLength = upstream.headers.get('Content-Length');
    if (contentLength) respHeaders.set('Content-Length', contentLength);

    return new Response(upstream.body, { status: upstream.status, headers: respHeaders });
  });
