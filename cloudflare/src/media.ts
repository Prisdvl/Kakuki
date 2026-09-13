/**
 * 站内音频库（用户上传的音乐）
 *
 * 为什么自建而不是继续用网易云外链：
 *   网易云 `outer/url` 免费外链接口已关闭（上游返回 HTML），歌单曲目不可播。
 *   自建后音源完全可控，且天然**同源** —— 播放器用 createMediaElementSource
 *   接入 Web Audio 做频谱，只有同源（或带 CORS 头）的媒体才不会被静音。
 *
 * 存储：Cloudflare KV
 *   t:<id>  音频二进制（单值上限 25 MiB，这里限 20 MiB 留余量）
 *   m:<id>  JSON 元数据
 *   c:<id>  封面图（可选，前端从音频内嵌封面解码后单独上传，非必需）
 * 免费额度（1 GB 存储 / 1000 写/天 / 10 万读/天）对个人博客足够。
 *
 * 写入权限：仅登录且 is_staff 的用户；读取与播放公开。
 * 播放端点支持 Range，避免整轨加载，拖动进度条即时生效。
 */
import { Hono } from 'hono';
import type { Env } from './util';
import { ok, ok201, ok204, fail, nowIso } from './util';
import { authUser } from './auth';

const MAX_BYTES = 20 * 1024 * 1024; // 20 MiB
const META_PREFIX = 'm:';
const BLOB_PREFIX = 't:';
const COVER_PREFIX = 'c:';
const ID_RE = /^[a-f0-9]{16}$/;

type MediaMeta = {
  id: string;
  name: string;
  artist: string;
  album: string;
  size: number;
  type: string;
  duration: number;
  hasCover: boolean;
  created_at: string;
};

const isAudio = (type: string) =>
  /^audio\//i.test(type) || type === 'application/octet-stream' || type === '';

/** 把元数据转成前端播放列表用的曲目结构 */
const toTrack = (m: MediaMeta) => ({
  id: m.id,
  name: m.name,
  artists: [{ name: m.artist || '未知' }],
  album: m.album || '',
  cover: m.hasCover ? `/api/v1/media/cover/${m.id}/` : '',
  url: `/api/v1/media/stream/${m.id}/`,
  duration: m.duration || 0,
  size: m.size || 0,
  created_at: m.created_at,
  isUpload: true,
});

const newId = () => {
  const raw = crypto.randomUUID().replace(/-/g, '');
  return raw.slice(0, 16);
};

/** 从文件名推断曲名：去掉扩展名，把下划线/多余空格整理成可读文本 */
const titleFromFilename = (filename: string) =>
  filename
    .replace(/\.[a-z0-9]{2,5}$/i, '')
    .replace(/[_]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim() || '未命名';

export const mediaRoutes = new Hono<{ Bindings: Env }>()

  /** 曲目列表（公开） */
  .get('/media/tracks/', async (c) => {
    if (!c.env.MEDIA) return fail(503, '音频存储未绑定');
    const listed = await c.env.MEDIA.list({ prefix: META_PREFIX, limit: 1000 });
    const metas = await Promise.all(
      listed.keys.map((k) => c.env.MEDIA!.get<MediaMeta>(k.name, 'json'))
    );
    const tracks = metas
      .filter((m): m is MediaMeta => !!m)
      .map(toTrack)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    return ok({ count: tracks.length, results: tracks });
  })

  /** 上传（仅 staff）：支持 multipart/form-data（file + 可选 name/artist/album/duration） */
  .post('/media/upload/', async (c) => {
    if (!c.env.MEDIA) return fail(503, '音频存储未绑定');
    const user = await authUser(c);
    if (!user) return fail(401, '请先登录');
    if (!user.is_staff) return fail(403, '仅站长账号可执行此操作');

    let file: File | null = null;
    let nameField = '';
    let artistField = '';
    let albumField = '';
    let durationField = 0;

    const ctype = c.req.header('Content-Type') || '';
    try {
      if (/multipart\/form-data/i.test(ctype)) {
        const form = await c.req.formData();
        const f = form.get('file');
        if (f && typeof f === 'object' && 'arrayBuffer' in f) file = f as File;
        nameField = String(form.get('name') || '');
        artistField = String(form.get('artist') || '');
        albumField = String(form.get('album') || '');
        durationField = Number(form.get('duration') || 0);
      } else {
        const buf = await c.req.arrayBuffer();
        const filename = decodeURIComponent(c.req.header('X-File-Name') || '未命名.mp3');
        file = new File([buf], filename, { type: ctype || 'audio/mpeg' });
        nameField = decodeURIComponent(c.req.header('X-Track-Name') || '');
        artistField = decodeURIComponent(c.req.header('X-Track-Artist') || '');
      }
    } catch {
      return fail(400, '请求体解析失败');
    }

    if (!file) return fail(400, '缺少 file 字段');
    if (file.size === 0) return fail(400, '文件为空');
    if (file.size > MAX_BYTES) {
      return fail(413, `单文件不得超过 ${Math.round(MAX_BYTES / 1024 / 1024)} MB（当前 ${(file.size / 1024 / 1024).toFixed(1)} MB）`);
    }
    if (!isAudio(file.type)) return fail(415, `不支持的格式：${file.type || '未知'}`);

    const id = newId();
    const buf = await file.arrayBuffer();
    const meta: MediaMeta = {
      id,
      name: nameField.trim() || titleFromFilename(file.name || ''),
      artist: artistField.trim(),
      album: albumField.trim(),
      size: file.size,
      type: file.type || 'audio/mpeg',
      duration: Number.isFinite(durationField) && durationField > 0 ? Math.round(durationField) : 0,
      hasCover: false,
      created_at: nowIso(),
    };

    await c.env.MEDIA.put(`${BLOB_PREFIX}${id}`, buf, {
      metadata: { type: meta.type, name: meta.name },
    });
    await c.env.MEDIA.put(`${META_PREFIX}${id}`, JSON.stringify(meta));

    return ok201(toTrack(meta), '上传成功');
  })

  /** 删除（仅 staff） */
  .delete('/media/tracks/:id/', async (c) => {
    if (!c.env.MEDIA) return fail(503, '音频存储未绑定');
    const user = await authUser(c);
    if (!user) return fail(401, '请先登录');
    if (!user.is_staff) return fail(403, '仅站长账号可执行此操作');

    const id = c.req.param('id');
    if (!ID_RE.test(id)) return fail(400, '曲目 ID 非法');

    const exists = await c.env.MEDIA.get(`${META_PREFIX}${id}`);
    if (!exists) return fail(404, '曲目不存在');

    await c.env.MEDIA.delete(`${BLOB_PREFIX}${id}`);
    await c.env.MEDIA.delete(`${COVER_PREFIX}${id}`);
    await c.env.MEDIA.delete(`${META_PREFIX}${id}`);
    return ok204('已删除');
  })

  /** 播放流（公开，支持 Range） */
  .get('/media/stream/:id/', async (c) => {
    if (!c.env.MEDIA) return fail(503, '音频存储未绑定');
    const id = c.req.param('id');
    if (!ID_RE.test(id)) return fail(404, '曲目不存在');

    const meta = await c.env.MEDIA.get<MediaMeta>(`${META_PREFIX}${id}`, 'json');
    const buf = await c.env.MEDIA.get(`${BLOB_PREFIX}${id}`, 'arrayBuffer');
    if (!buf || !meta) return fail(404, '曲目不存在');

    const total = buf.byteLength;
    const headers: Record<string, string> = {
      'Content-Type': meta.type || 'audio/mpeg',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=604800',
    };

    const range = c.req.header('Range');
    if (!range) {
      return new Response(buf, { status: 200, headers: { ...headers, 'Content-Length': String(total) } });
    }

    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!m) {
      return new Response(null, { status: 416, headers: { ...headers, 'Content-Range': `bytes */${total}` } });
    }
    const startStr = m[1], endStr = m[2];
    let start: number, end: number;
    if (startStr === '') {
      // bytes=-N：最后 N 字节
      const suffix = Number(endStr);
      if (!Number.isFinite(suffix) || suffix <= 0) return new Response(null, { status: 416 });
      start = Math.max(0, total - suffix);
      end = total - 1;
    } else {
      start = Number(startStr);
      end = endStr === '' ? total - 1 : Math.min(Number(endStr), total - 1);
    }
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= total) {
      return new Response(null, { status: 416, headers: { ...headers, 'Content-Range': `bytes */${total}` } });
    }

    return new Response(buf.slice(start, end + 1), {
      status: 206,
      headers: {
        ...headers,
        'Content-Range': `bytes ${start}-${end}/${total}`,
        'Content-Length': String(end - start + 1),
      },
    });
  })

  /** 封面（公开） */
  .get('/media/cover/:id/', async (c) => {
    if (!c.env.MEDIA) return fail(503, '音频存储未绑定');
    const id = c.req.param('id');
    if (!ID_RE.test(id)) return fail(404, '封面不存在');
    const cover = await c.env.MEDIA.get(`${COVER_PREFIX}${id}`, 'arrayBuffer');
    if (!cover) return fail(404, '封面不存在');
    return new Response(cover, {
      status: 200,
      headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=604800' },
    });
  });
