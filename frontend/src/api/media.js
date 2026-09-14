import request from './request';

/**
 * 站内音频库 API（自建音源，KV 存储）
 *
 * 后端契约（Cloudflare Worker，{code,message,data} 包装）：
 *  - GET    /media/tracks/        曲目列表（公开）
 *  - POST   /media/upload/        上传音频（multipart，仅管理员）
 *  - DELETE /media/tracks/:id/    删除曲目（仅管理员）
 *  - GET    /media/stream/:id/    播放流（公开，支持 Range）
 *
 * 为什么要自建：网易云外链已失效，且播放器要把 <audio> 接入 Web Audio 做频谱，
 * 跨域无 CORS 的媒体会被静音 —— 自建后同源播放，两个问题一起解决。
 */
const mediaApi = {
  list: () => request.get('/media/tracks/'),

  /**
   * 上传音频
   * @param {File} file
   * @param {{name?:string, artist?:string, album?:string, duration?:number, cover?:Blob}} meta
   * @param {(percent:number)=>void} onProgress 0-100
   */
  upload: (file, meta = {}, onProgress) => {
    const form = new FormData();
    form.append('file', file);
    if (meta.name) form.append('name', meta.name);
    if (meta.artist) form.append('artist', meta.artist);
    if (meta.album) form.append('album', meta.album);
    if (meta.duration) form.append('duration', String(Math.round(meta.duration)));
    // 内嵌封面（本地解析出的 Blob），后端存 R2 并置 has_cover
    if (meta.cover) {
      const ext = (meta.cover.type || '').includes('png') ? 'png' : 'jpg';
      form.append('cover', meta.cover, `cover.${ext}`);
    }

    return request.post('/media/upload/', form, {
      // 交给浏览器写 boundary，不手动指定 Content-Type
      timeout: 300000,
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    });
  },

  remove: (id) => request.delete(`/media/tracks/${id}/`, { skipAuthRedirect: true }),
};

export default mediaApi;
