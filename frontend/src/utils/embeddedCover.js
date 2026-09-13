/**
 * 从音频文件中提取内嵌封面（不做任何网络请求，纯前端解析）。
 *
 * 为什么在上传时做：上传后音频存进 R2，浏览器端 <audio> 流式播放时无法（也不该）
 * 再回头解析二进制里的 ID3/FLAC/MP4 元数据；封面只有在选文件的当下就在本地解析出来，
 * 随上传表单一起交给后端存成独立的 cover/<id> 对象，播放列表才能直接用图片 URL。
 *
 * 覆盖三种主流内嵌格式：
 *   MP3  —— ID3v2.2 (PIC) / ID3v2.3 / ID3v2.4 (APIC)，帧在文件头
 *   FLAC —— METADATA_BLOCK PICTURE（type 6），块在文件头
 *   M4A  —— MP4 atom moov.udta.meta.ilst.covr，moov 可能在文件尾（未做 faststart）
 *
 * 不支持的格式（ogg 的 Vorbis base64 封面等）返回 null，调用方静默降级。
 */

/** 读取大端 32 位整数 */
const be32 = (v, o) => (v[o] << 24) | (v[o + 1] << 16) | (v[o + 2] << 8) | v[o + 3];
/** 读取大端 24 位整数（FLAC block size / ID3v2.2 帧长） */
const be24 = (v, o) => (v[o] << 16) | (v[o + 1] << 8) | v[o + 2];
/** ID3v2.4 的 syncsafe 32 位（每字节只用低 7 位） */
const syncsafe = (v, o) => (v[o] << 21) | (v[o + 1] << 14) | (v[o + 2] << 7) | v[o + 3];

const result = (bytes, mime, offset, length) => {
  if (length <= 0 || offset + length > bytes.length) return null;
  // 注意：TypedArray 构造器对 (typedArray, offset, length) 会整体拷贝，必须用 subarray
  const view = bytes.subarray(offset, offset + length);
  return { blob: new Blob([view], { type: mime }), mime };
};

/** ---- ID3v2（MP3）---- */
function parseID3(v) {
  if (v.length < 10 || v[0] !== 0x49 || v[1] !== 0x44 || v[2] !== 0x33) return null;
  const major = v[3];
  const flags = v[5];
  const tagSize = syncsafe(v, 6);
  let p = 10; // 帧区起点（tag header 之后）
  // 扩展头（v2.3/v2.4 且 flag 0x40）：跳过
  if (flags & 0x40) {
    if (major === 4) p += syncsafe(v, p) + 4;
    else p += be32(v, p) + 4;
  }
  const end = Math.min(10 + tagSize, v.length);
  const frameHeaderSize = major === 2 ? 6 : 10; // v2.2: id3+size3；v2.3/4: id4+size4+flags2
  while (p + frameHeaderSize <= end) {
    let id, size;
    if (major === 2) {
      id = String.fromCharCode(v[p], v[p + 1], v[p + 2]);
      size = be24(v, p + 3);
    } else {
      id = String.fromCharCode(v[p], v[p + 1], v[p + 2], v[p + 3]);
      size = major === 4 ? syncsafe(v, p + 4) : be32(v, p + 4);
    }
    if (!/^[A-Z0-9]{3,4}$/.test(id) || size <= 0 || p + frameHeaderSize + size > end) break;
    const body = p + frameHeaderSize;
    if (id === 'APIC' || id === 'PIC') return parseAPIC(v, body, size, major);
    p = body + size;
  }
  return null;
}

function parseAPIC(v, body, size, major) {
  const end = body + size;
  let p = body + 1; // 跳过 text encoding
  let mime = 'image/jpeg';
  if (major === 2) {
    // v2.2：3 字符格式（'JPG'/'PNG'）
    const fmt = String.fromCharCode(v[p], v[p + 1], v[p + 2]).toUpperCase();
    mime = fmt.startsWith('PNG') ? 'image/png' : 'image/jpeg';
    p += 3;
  } else {
    // v2.3+：latin1 null 结尾的 MIME 串
    const z = v.indexOf(0, p);
    if (z < 0 || z >= end) return null;
    const m = String.fromCharCode(...v.subarray(p, z)).trim().toLowerCase();
    if (m) mime = m.startsWith('image/') ? m : `image/${m}`;
    p = z + 1;
  }
  p += 1; // picture type
  // description：按编码找终止符（0/3 单字节 0x00；1/2 双字节 0x0000）
  const enc = v[body];
  let descEnd = -1;
  if (enc === 1 || enc === 2) {
    for (let i = p; i + 1 < end; i += 2) {
      if (v[i] === 0 && v[i + 1] === 0) { descEnd = i; break; }
    }
    if (descEnd >= 0) p = descEnd + 2;
  } else {
    const z = v.indexOf(0, p);
    if (z >= 0 && z < end) p = z + 1;
  }
  if (p >= end) return null;
  // 压缩/加密帧不支持（少见），直接按原始数据取
  return result(v, mime, p, end - p);
}

/** ---- FLAC ---- */
function parseFLAC(v) {
  if (v.length < 8 || v[0] !== 0x66 || v[1] !== 0x4c || v[2] !== 0x61 || v[3] !== 0x43) return null;
  let p = 4;
  for (;;) {
    if (p + 4 > v.length) return null;
    const header = v[p];
    const last = (header & 0x80) !== 0;
    const type = header & 0x7f;
    const size = be24(v, p + 1);
    const body = p + 4;
    if (type === 6 && body + 8 <= v.length) {
      // PICTURE: type(4) mimeLen(4) mime descLen(4) desc w(4) h(4) depth(4) colors(4) dataLen(4) data
      let q = body + 4;
      const mimeLen = be32(v, q);
      q += 4;
      const mime = String.fromCharCode(...v.subarray(q, q + mimeLen)).toLowerCase();
      q += mimeLen;
      const descLen = be32(v, q);
      q += 4 + descLen + 16; // desc + w/h/depth/colors
      const dataLen = be32(v, q);
      q += 4;
      return result(v, mime || 'image/jpeg', q, dataLen);
    }
    if (last || size === 0) return null;
    p = body + size;
  }
}

/** ---- MP4 / M4A（atom 遍历）---- */
const atomType = (v, o) => String.fromCharCode(v[o], v[o + 1], v[o + 2], v[o + 3]);

function findAtom(v, start, end, type) {
  let p = start;
  while (p + 8 <= end) {
    let size = be32(v, p);
    const t = atomType(v, p + 4);
    let header = 8;
    if (size === 1) {
      // 64 位扩展长度：取低 32 位足够
      if (p + 16 > end) return null;
      size = be32(v, p + 12); // 低 32 位（偏移 +8 处是高 32 位）
      header = 16;
    } else if (size === 0) {
      size = end - p; // 到结尾
    }
    if (size < header) return null;
    if (t === type) return { start: p, body: p + header, end: p + size };
    p += size;
  }
  return null;
}

function parseMP4(v) {
  // meta 容器有 4 字节 version/flags
  const moov = findAtom(v, 0, v.length, 'moov');
  if (!moov) return null;
  const udta = findAtom(v, moov.body, moov.end, 'udta');
  if (!udta) return null;
  const meta = findAtom(v, udta.body, udta.end, 'meta');
  if (!meta) return null;
  const ilst = findAtom(v, meta.body + 4, meta.end, 'ilst');
  if (!ilst) return null;
  const covr = findAtom(v, ilst.body, ilst.end, 'covr');
  if (!covr) return null;
  const data = findAtom(v, covr.body, covr.end, 'data');
  if (!data) return null;
  // data atom: 4B type indicator（13=jpeg 14=png）+ 4B locale + payload
  if (data.body + 8 > data.end) return null;
  const indicator = be32(v, data.body);
  const mime = indicator === 14 ? 'image/png' : 'image/jpeg';
  return result(v, mime, data.body + 8, data.end - (data.body + 8));
}

/**
 * 提取音频文件的内嵌封面。
 * @param {File} file
 * @returns {Promise<{blob: Blob, mime: string} | null>} 无封面或解析失败返回 null
 */
export async function extractEmbeddedCover(file) {
  if (!file || typeof file.slice !== 'function') return null;
  const headLen = Math.min(file.size, 24 * 1024 * 1024);
  const head = new Uint8Array(await file.slice(0, headLen).arrayBuffer());

  if (head.length > 10 && head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33) {
    return parseID3(head);
  }
  if (head.length > 8 && head[0] === 0x66 && head[1] === 0x4c && head[2] === 0x61 && head[3] === 0x43) {
    return parseFLAC(head);
  }
  // MP4：moov 在头部的 faststart 文件直接命中；否则读文件尾再找一次
  if (head.length > 12 && atomType(head, 4) === 'ftyp') {
    const front = parseMP4(head);
    if (front) return front;
    const tailLen = Math.min(file.size, 16 * 1024 * 1024);
    const tail = new Uint8Array(await file.slice(file.size - tailLen).arrayBuffer());
    return parseMP4(tail);
  }
  return null;
}

export default extractEmbeddedCover;
