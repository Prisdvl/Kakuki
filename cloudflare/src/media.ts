/**
 * 站内音频库（用户上传的音乐）
 *
 * 为什么自建而不是继续用网易云外链：
 *   网易云 `outer/url` 免费外链接口已关闭（上游返回 HTML），歌单曲目不可播。
 *   自建后音源完全可控，且天然**同源** —— 播放器用 createMediaElementSource
 *   接入 Web Audio 做频谱，只有同源（或带 CORS 头）的媒体才不会被静音。
 *
 * 存储（2026-09-13 三定：D1 元数据 + R2 二进制）：
 *   DB      D1 —— 曲目元数据（media_tracks 表）。不用 KV 的原因：
 *         KV list 有最长 60s 缓存，上传后列表不刷新；D1 强一致。
 *   MEDIA_R2 R2 —— 音频二进制（audio/<id>）与封面（cover/<id>）
 *   R2 免费额度 10 GB/月，**库总容量在业务层写死 ≤ 10 GiB**（LIBRARY_CAP_BYTES），
 *   超限上传直接 413 拒绝，永远不会越出免费额度产生费用。
 *
 * 写入权限：仅登录且 is_staff 的用户；读取与播放公开。
 * 播放端点支持 Range（R2 原生 range get 流式返回），拖动进度条即时生效。
 */
import { Hono } from 'hono';
import type { Env } from './util';
import { ok, ok201, ok204, fail, nowIso } from './util';
import { authUser } from './auth';

const MAX_BYTES = 60 * 1024 * 1024; // 单文件 60 MiB（放得下长曲 / 无损）
const MAX_COVER_BYTES = 5 * 1024 * 1024; // 封面 5 MiB 上限（内嵌封面通常 < 1 MiB）
/** 库总容量硬上限：10 GiB（R2 免费额度 10 GB/月，写死防超额计费） */
const LIBRARY_CAP_BYTES = 10 * 1024 * 1024 * 1024;
const AUDIO_KEY = (id: string) => `audio/${id}`;
const COVER_KEY = (id: string) => `cover/${id}`;
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

type MetaRow = {
  id: string;
  name: string;
  artist: string;
  album: string;
  size: number;
  type: string;
  duration: number;
  has_cover: number;
  created_at: string;
};

const rowToMeta = (r: MetaRow): MediaMeta => ({
  id: r.id,
  name: r.name,
  artist: r.artist,
  album: r.album,
  size: r.size,
  type: r.type,
  duration: r.duration,
  hasCover: !!r.has_cover,
  created_at: r.created_at,
});

export const mediaRoutes = new Hono<{ Bindings: Env }>()

  /** 曲目列表（公开）；附库用量与上限，便于前端/站长核对 */
  .get('/media/tracks/', async (c) => {
    if (!c.env.DB) return fail(503, '数据库未绑定');
    const { results } = await c.env.DB.prepare(
      'SELECT id, name, artist, album, size, type, duration, has_cover, created_at FROM media_tracks ORDER BY created_at DESC'
    ).all<MetaRow>();
    const tracks = (results || []).map(rowToMeta).map(toTrack);
    const total = tracks.reduce((s, t) => s + (t.size || 0), 0);
    return ok({
      count: tracks.length,
      total_bytes: total,
      cap_bytes: LIBRARY_CAP_BYTES,
      results: tracks,
    });
  })

  /** 上传（仅 staff）：支持 multipart/form-data（file + 可选 name/artist/album/duration） */
  .post('/media/upload/', async (c) => {
    if (!c.env.DB) return fail(503, '数据库未绑定');
    if (!c.env.MEDIA_R2) return fail(503, '音频对象存储（R2）未绑定');
    const user = await authUser(c);
    if (!user) return fail(401, '请先登录');
    if (!user.is_staff) return fail(403, '仅站长账号可执行此操作');

    let file: File | null = null;
    let coverFile: File | null = null;
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
        const cv = form.get('cover');
        if (cv && typeof cv === 'object' && 'arrayBuffer' in cv) coverFile = cv as File;
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
    if (coverFile && coverFile.size > MAX_COVER_BYTES) {
      return fail(413, `封面不得超过 5 MB（当前 ${(coverFile.size / 1024 / 1024).toFixed(1)} MB）`);
    }
    if (coverFile && !/^image\//i.test(coverFile.type)) {
      return fail(415, '封面必须是图片文件');
    }

    // 10 GiB 硬上限：入库前核对全库用量，超限拒绝（写死，永不越出 R2 免费额度）
    const sumRow = await c.env.DB.prepare('SELECT COALESCE(SUM(size), 0) AS total FROM media_tracks').first<{ total: number }>();
    const used = sumRow?.total || 0;
    if (used + file.size > LIBRARY_CAP_BYTES) {
      return fail(
        413,
        `音频库容量已达上限：已用 ${fmtGiB(used)} GiB / ${fmtGiB(LIBRARY_CAP_BYTES)} GiB，剩余空间不足以容纳本文件（${(file.size / 1024 / 1024).toFixed(1)} MB）。请先删除部分曲目。`
      );
    }

    const id = newId();
    const meta: MediaMeta = {
      id,
      name: nameField.trim() || titleFromFilename(file.name || ''),
      artist: artistField.trim(),
      album: albumField.trim(),
      size: file.size,
      type: file.type || 'audio/mpeg',
      duration: Number.isFinite(durationField) && durationField > 0 ? Math.round(durationField) : 0,
      hasCover: !!coverFile,
      created_at: nowIso(),
    };

    // 先写 R2 二进制（音频 + 可选封面），再写 D1 元数据（顺序保证：元数据存在则音频必在）
    const buf = await file.arrayBuffer();
    await c.env.MEDIA_R2.put(AUDIO_KEY(id), buf, {
      httpMetadata: { contentType: meta.type },
    });
    if (coverFile) {
      const coverBuf = await coverFile.arrayBuffer();
      await c.env.MEDIA_R2.put(COVER_KEY(id), coverBuf, {
        httpMetadata: { contentType: coverFile.type || 'image/jpeg' },
      });
    }
    await c.env.DB.prepare(
      'INSERT INTO media_tracks (id, name, artist, album, size, type, duration, has_cover, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)'
    ).bind(meta.id, meta.name, meta.artist, meta.album, meta.size, meta.type, meta.duration, meta.hasCover ? 1 : 0, meta.created_at).run();

    return ok201(toTrack(meta), '上传成功');
  })

  /** 删除（仅 staff）：同时清 R2 音频/封面与 D1 元数据 */
  .delete('/media/tracks/:id/', async (c) => {
    if (!c.env.DB) return fail(503, '数据库未绑定');
    if (!c.env.MEDIA_R2) return fail(503, '音频对象存储（R2）未绑定');
    const user = await authUser(c);
    if (!user) return fail(401, '请先登录');
    if (!user.is_staff) return fail(403, '仅站长账号可执行此操作');

    const id = c.req.param('id');
    if (!ID_RE.test(id)) return fail(400, '曲目 ID 非法');

    const exists = await c.env.DB.prepare('SELECT id FROM media_tracks WHERE id = ?1').bind(id).first();
    if (!exists) return fail(404, '曲目不存在');

    await c.env.MEDIA_R2.delete(AUDIO_KEY(id));
    await c.env.MEDIA_R2.delete(COVER_KEY(id));
    await c.env.DB.prepare('DELETE FROM media_tracks WHERE id = ?1').bind(id).run();
    return ok204('已删除');
  })

  /** 上传 / 更换封面（仅 staff）：multipart cover 图片，覆盖 R2 并置 D1 has_cover=1 */
  .post('/media/tracks/:id/cover/', async (c) => {
    if (!c.env.DB) return fail(503, '数据库未绑定');
    if (!c.env.MEDIA_R2) return fail(503, '音频对象存储（R2）未绑定');
    const user = await authUser(c);
    if (!user) return fail(401, '请先登录');
    if (!user.is_staff) return fail(403, '仅站长账号可执行此操作');

    const id = c.req.param('id');
    if (!ID_RE.test(id)) return fail(400, '曲目 ID 非法');

    const exists = await c.env.DB.prepare('SELECT id FROM media_tracks WHERE id = ?1').bind(id).first();
    if (!exists) return fail(404, '曲目不存在');

    const ctype = c.req.header('Content-Type') || '';
    if (!/multipart\/form-data/i.test(ctype)) return fail(400, '请使用 multipart/form-data 提交封面');

    let coverFile: File | null = null;
    try {
      const form = await c.req.formData();
      const cv = form.get('cover');
      if (cv && typeof cv === 'object' && 'arrayBuffer' in cv) coverFile = cv as File;
    } catch {
      return fail(400, '请求体解析失败');
    }
    if (!coverFile) return fail(400, '缺少 cover 图片字段');
    if (coverFile.size === 0) return fail(400, '封面文件为空');
    if (coverFile.size > MAX_COVER_BYTES) {
      return fail(413, `封面不得超过 5 MB（当前 ${(coverFile.size / 1024 / 1024).toFixed(1)} MB）`);
    }
    if (!/^image\//i.test(coverFile.type)) return fail(415, '封面必须是图片文件');

    const coverBuf = await coverFile.arrayBuffer();
    await c.env.MEDIA_R2.put(COVER_KEY(id), coverBuf, {
      httpMetadata: { contentType: coverFile.type || 'image/jpeg' },
    });
    await c.env.DB.prepare('UPDATE media_tracks SET has_cover = 1 WHERE id = ?1').bind(id).run();
    return ok({ id, cover: `/api/v1/media/cover/${id}/` }, 200, '封面已更新');
  })

  /** 播放流（公开，支持 Range）：R2 原生 range get，流式返回不整轨加载 */
  .get('/media/stream/:id/', async (c) => {
    if (!c.env.DB) return fail(503, '数据库未绑定');
    if (!c.env.MEDIA_R2) return fail(503, '音频对象存储（R2）未绑定');
    const id = c.req.param('id');
    if (!ID_RE.test(id)) return fail(404, '曲目不存在');

    const row = await c.env.DB.prepare(
      'SELECT id, name, artist, album, size, type, duration, has_cover, created_at FROM media_tracks WHERE id = ?1'
    ).bind(id).first<MetaRow>();
    if (!row) return fail(404, '曲目不存在');
    const meta = rowToMeta(row);

    const total = meta.size || 0;
    const headers: Record<string, string> = {
      'Content-Type': meta.type || 'audio/mpeg',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=604800',
    };

    const range = c.req.header('Range');
    if (!range) {
      const obj = await c.env.MEDIA_R2.get(AUDIO_KEY(id));
      if (!obj) return fail(404, '曲目不存在');
      return new Response(obj.body, {
        status: 200,
        headers: { ...headers, 'Content-Length': String(total || obj.size) },
      });
    }

    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!m) {
      return new Response(null, { status: 416, headers: { ...headers, 'Content-Range': `bytes */${total}` } });
    }
    const startStr = m[1], endStr = m[2];
    let start: number, length: number;
    if (startStr === '') {
      // bytes=-N：最后 N 字节
      const suffix = Number(endStr);
      if (!Number.isFinite(suffix) || suffix <= 0) return new Response(null, { status: 416 });
      start = Math.max(0, total - suffix);
      length = total - start;
    } else {
      start = Number(startStr);
      const end = endStr === '' ? total - 1 : Math.min(Number(endStr), total - 1);
      if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= total) {
        return new Response(null, { status: 416, headers: { ...headers, 'Content-Range': `bytes */${total}` } });
      }
      length = end - start + 1;
    }
    if (start >= total) {
      return new Response(null, { status: 416, headers: { ...headers, 'Content-Range': `bytes */${total}` } });
    }

    const obj = await c.env.MEDIA_R2.get(AUDIO_KEY(id), { range: { offset: start, length } });
    if (!obj) return fail(404, '曲目不存在');
    return new Response(obj.body, {
      status: 206,
      headers: {
        ...headers,
        'Content-Range': `bytes ${start}-${start + length - 1}/${total}`,
        'Content-Length': String(length),
      },
    });
  })

  /** 封面（公开） */
  .get('/media/cover/:id/', async (c) => {
    if (!c.env.MEDIA_R2) return fail(503, '音频对象存储（R2）未绑定');
    const id = c.req.param('id');
    if (!ID_RE.test(id)) return fail(404, '封面不存在');
    const cover = await c.env.MEDIA_R2.get(COVER_KEY(id));
    if (!cover) return fail(404, '封面不存在');
    return new Response(cover.body, {
      status: 200,
      headers: {
        'Content-Type': cover.httpMetadata?.contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=604800',
      },
    });
  });

const fmtGiB = (n: number) => (n / 1024 / 1024 / 1024).toFixed(1);
