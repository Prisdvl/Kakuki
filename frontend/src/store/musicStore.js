import { create } from 'zustand';
import request, { extractList } from '../api/request';
import { STATIC_MUSIC } from '../data/musicStatic';
import { FALLBACK_PLAYLIST } from '../data/musicFallback';

// 同源音频流地址：经后端代理转发网易云 MP3，媒体 CORS-clean，频谱分析可正常输出
const streamUrl = (songId) => `/api/v1/netease/song/${songId}/stream/`;

/** 站内音频库（用户上传）的歌单标识 */
export const UPLOAD_PLAYLIST_ID = 'kakuki-uploads';
export const UPLOAD_PLAYLIST_NAME = '我的音乐';

/** 后端曲目结构 → 播放器曲目结构 */
export const toUploadTrack = (t) => ({
  id: t.id,
  name: t.name || '未命名',
  artists: Array.isArray(t.artists) && t.artists.length ? t.artists : [{ name: '未知' }],
  album: t.album || '',
  cover: t.cover || '',
  url: t.url || `/api/v1/media/stream/${t.id}/`,
  duration: t.duration || 0,
  isUpload: true,
});

/**
 * 拉取站内音频库。
 * 这是当前唯一稳定可播的音源：网易云外链已失效，
 * 而自建音源同源，既能播也能输出频谱。
 */
async function fetchUploadTracks() {
  try {
    const res = await request.get('/media/tracks/', { timeout: 15000 });
    return extractList(res).map(toUploadTrack);
  } catch {
    return [];
  }
}

/**
 * 探测歌单前若干首是否真的可播。
 *
 * 必要性：网易云 outer/url 免费外链接口已关闭（边缘实测返回 HTML 而非音频），
 * 若不做探测，用户点播放只会看到「音源不可用」逐首跳过 —— 体验很差。
 * 这里只要首曲不可播就整体降级到示例曲目，保证有声音。
 */
async function hasPlayableTrack(tracks, probeCount = 2) {
  const n = Math.min(tracks.length, probeCount);
  for (let i = 0; i < n; i += 1) {
    try {
      const r = await request.get(`/netease/song/${tracks[i].id}/available/`, { timeout: 12000 });
      if (r && r.playable) return true;
    } catch {
      // 探测本身失败按不可播处理，继续试下一首
    }
  }
  return false;
}

/** 降级到示例曲目歌单（保留原歌单在 playlists 中不丢） */
const applyFallbackPlaylist = (set, get, extra = {}) => {
  const playlist = { ...FALLBACK_PLAYLIST, tracks: FALLBACK_PLAYLIST.tracks.map((t) => ({ ...t })) };
  // 同时把首曲写入 currentTrack：否则播放条只显示"未在播放"，
  // 用户点了播放看到进度在走却没有曲目信息。
  const first = playlist.tracks[0] || null;
  set({
    ...extra,
    currentPlaylist: playlist,
    currentTrack: first,
    currentLyrics: [],
    currentLyricIndex: -1,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    sourceKind: 'fallback',
    audioError: '',
    badTracks: [],
  });
  const audio = getAudio();
  if (audio && first) audio.src = first.url;
  return { success: true, playlist, fallback: true };
};

// 线上静态部署（无后端）时使用的真实歌单静态快照（来自本地后端接口，构建时生成）
const STATIC_LIST = [{ id: STATIC_MUSIC.id, name: STATIC_MUSIC.name, coverImgUrl: STATIC_MUSIC.coverImgUrl, trackCount: STATIC_MUSIC.trackCount }];

const applyStaticPlaylist = (set, get) => {
  const playlist = {
    ...STATIC_MUSIC,
    tracks: STATIC_MUSIC.tracks.map((t) => ({ ...t })),
  };
  // 首曲一并写入 currentTrack，保证播放条有曲目信息（否则只显示"未在播放"）
  const first = playlist.tracks[0] || null;
  set({
    user: { nickname: 'Prisdvl', avatarUrl: STATIC_MUSIC.coverImgUrl || '' },
    playlists: [playlist],
    playlistList: STATIC_LIST,
    currentPlaylist: playlist,
    currentTrack: first,
    currentLyrics: [],
    currentLyricIndex: -1,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
  });
  if (playlist.tracks.length > 0) {
    const audio = getAudio();
    if (audio) audio.src = playlist.tracks[0].url;
  }
  return { success: true, playlist, demo: true };
};

/**
 * 把站内音频库装载为当前歌单。
 * 与网易云歌单/示例曲目的区别：这里的曲目一定可播（同源、无防盗链），
 * 所以不做 hasPlayableTrack 探测，直接作为主音源。
 */
const applyUploadPlaylist = (set, get, tracks) => {
  const playlist = {
    id: UPLOAD_PLAYLIST_ID,
    name: UPLOAD_PLAYLIST_NAME,
    coverImgUrl: tracks[0]?.cover || '',
    trackCount: tracks.length,
    tracks,
  };
  const prevTrack = get().currentTrack;
  const isSamePlaylist = prevTrack && get().currentPlaylist?.id === UPLOAD_PLAYLIST_ID;

  set({
    user: { nickname: 'Prisdvl', avatarUrl: '' },
    playlists: [playlist],
    playlistList: [{
      id: playlist.id,
      name: playlist.name,
      coverImgUrl: playlist.coverImgUrl,
      trackCount: playlist.trackCount,
    }],
    currentPlaylist: playlist,
    sourceKind: 'uploads',
    audioError: '',
    badTracks: [],
  });

  if (!isSamePlaylist) {
    const first = tracks[0] || null;
    set({
      currentTrack: first,
      currentLyrics: [],
      currentLyricIndex: -1,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
    });
    const audio = getAudio();
    if (audio && first) audio.src = first.url;
  }

  return { success: true, playlist, tracks };
};

// audio 实例作为模块级单例，不放入 React state，避免触发无意义重渲染
let audioInstance = null;
let audioListenersBound = false;
let audioContextInstance = null;
let analyserNodeInstance = null;

export const getAudioContext = () => audioContextInstance;
export const getAnalyser = () => analyserNodeInstance;

/**
 * 懒初始化 Web Audio API 链路：
 *   <audio> → MediaElementSource → AnalyserNode → destination
 * 仅在用户首次交互（播放）时创建，符合浏览器自动播放策略。
 * MediaElementSource 只能对同一 audio 元素调用一次，因此做幂等保护。
 *
 * 关键修复：resume() 必须 await 完成后再 play，否则 audio 被路由到 suspended
 * 的 AudioContext 会导致静音（AudioContext 接管后声音只走 context 图）。
 */
export const ensureAudioContext = async () => {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;

  if (!audioContextInstance) {
    audioContextInstance = new Ctor();
  }

  const audio = getAudio();
  if (audio && !analyserNodeInstance) {
    try {
      const source = audioContextInstance.createMediaElementSource(audio);
      analyserNodeInstance = audioContextInstance.createAnalyser();
      analyserNodeInstance.fftSize = 256;
      analyserNodeInstance.smoothingTimeConstant = 0.75;
      source.connect(analyserNodeInstance);
      analyserNodeInstance.connect(audioContextInstance.destination);
    } catch (e) {
      // createMediaElementSource 抛错 = audio 已被旧 context 接管（如 HMR 重载后模块单例丢失），
      // 旧链路不可达会导致静音。重建 audio 实例以恢复声音。
      console.warn('MediaElementSource 已被接管，重建 audio 恢复声音:', e);
      analyserNodeInstance = null;
      audioInstance = null;
      audioListenersBound = false;
      const rebuilt = getAudio();
      const state = useMusicStore.getState();
      if (state.currentTrack?.url) rebuilt.src = state.currentTrack.url;
      // 重建后重试一次建立分析器（频谱次要，失败仅影响频谱不影响声音）
      try {
        const source2 = audioContextInstance.createMediaElementSource(rebuilt);
        analyserNodeInstance = audioContextInstance.createAnalyser();
        analyserNodeInstance.fftSize = 256;
        analyserNodeInstance.smoothingTimeConstant = 0.75;
        source2.connect(analyserNodeInstance);
        analyserNodeInstance.connect(audioContextInstance.destination);
      } catch (e2) {
        console.warn('分析器重建失败（仅影响频谱）:', e2);
        analyserNodeInstance = null;
      }
    }
  }

  if (audioContextInstance.state === 'suspended') {
    try { await audioContextInstance.resume(); } catch {}
  }
  return audioContextInstance;
};

const getAudio = () => {
  if (!audioInstance) {
    audioInstance = new Audio();
    audioInstance.preload = 'metadata';
    // 音频统一走同源 /api 流代理，无需 crossOrigin，媒体 CORS-clean，
    // createMediaElementSource 可正常输出频谱数据。
    // 首次创建时从 store 同步持久化的音量与静音状态
    try {
      const s = useMusicStore.getState();
      if (typeof s.volume === 'number') audioInstance.volume = s.volume;
      if (typeof s.muted === 'boolean') audioInstance.muted = s.muted;
    } catch {}
    bindAudioListeners(audioInstance);
  }
  return audioInstance;
};

// 兼容旧版：外部传入 audio 元素时同样绑定事件（新的单例会覆盖，但保留导出避免破坏引用方）
export const registerAudio = (audio) => {
  if (audio && audio !== audioInstance) {
    audioInstance = audio;
    audioInstance.preload = 'metadata';
    bindAudioListeners(audioInstance);
  }
};

export const getAudioInstance = getAudio;

function bindAudioListeners(audio) {
  if (audioListenersBound || !audio) return;
  audioListenersBound = true;

  const onTimeUpdate = () => {
    const time = audio.currentTime || 0;
    const state = useMusicStore.getState();
    let newIdx = -1;
    const lyrics = state.currentLyrics;
    for (let i = 0; i < lyrics.length; i++) {
      if (time >= lyrics[i].time) newIdx = i;
      else break;
    }
    const next = { currentTime: time };
    if (newIdx !== state.currentLyricIndex) next.currentLyricIndex = newIdx;
    useMusicStore.setState(next);
  };

  const onLoadedMetadata = () => {
    useMusicStore.setState({ duration: audio.duration || 0 });
  };

  const onEnded = () => {
    useMusicStore.getState().nextTrack();
  };

  const onPlay = () => {
    useMusicStore.setState({ isPlaying: true });
  };

  const onPause = () => {
    useMusicStore.setState({ isPlaying: false });
  };

  // 音频加载失败处理：显式暴露错误（原实现仅 console.warn，导致用户看到"播放中"却无声）
  const onError = () => {
    const err = audio.error;
    const code = err?.code ?? 0;
    // MEDIA_ERR_SRC_NOT_SUPPORTED(4)：src 不可用 / 是 HTML 而非音频；
    // MEDIA_ERR_NETWORK(2)：网络或代理错误
    const msg = code === 4
      ? '音源不可用，已自动跳过'
      : code === 2
        ? '网络错误，音频加载失败'
        : '音频播放失败';
    console.warn('[music] 音频加载失败:', code, '| src:', audio.src);
    useMusicStore.setState({ isPlaying: false, audioError: msg });
  };

  const onPlaying = () => {
    // 真正出声才清除错误态
    useMusicStore.setState({ audioError: '' });
  };

  audio.addEventListener('timeupdate', onTimeUpdate);
  audio.addEventListener('loadedmetadata', onLoadedMetadata);
  audio.addEventListener('ended', onEnded);
  audio.addEventListener('play', onPlay);
  audio.addEventListener('pause', onPause);
  audio.addEventListener('error', onError);
  audio.addEventListener('playing', onPlaying);
}

const parseLyric = (lrcData) => {
  if (!lrcData || !lrcData.lyric) return [];
  const lines = lrcData.lyric.split('\n');
  const result = [];
  lines.forEach((line) => {
    const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const ms = parseInt(match[3], 10);
      const time = minutes * 60 + seconds + ms / 1000;
      const text = match[4].trim();
      if (text) {
        result.push({ time, text });
      }
    }
  });
  return result;
};

const useMusicStore = create((set, get) => ({
  user: null,
  playlists: [],
  playlistList: [],
  currentPlaylist: null,
  currentTrack: null,
  currentLyrics: [],
  currentLyricIndex: -1,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  /** 音频错误提示（空串 = 正常）。原实现静默失败导致"没声音但看不出原因" */
  audioError: '',
  /** 已确认不可播放的曲目 id 集合，用于自动跳过 */
  badTracks: [],
  /** 当前音源类型：netease = 原歌单；fallback = 原歌单外链失效后的示例曲目 */
  sourceKind: 'netease',
  volume: (() => {
    try {
      const v = localStorage.getItem('kakuki_volume');
      if (v !== null) {
        const n = parseFloat(v);
        if (!isNaN(n) && n >= 0 && n <= 1) return n;
      }
    } catch {}
    return 1;
  })(),
  muted: false,

  fetchPlaylists: async () => {
    try {
      const res = await request.get('/netease/playlists/', { timeout: 15000 });
      const list = res?.playlists || [];
      set({ playlistList: list });
      return { success: true, playlists: list };
    } catch (err) {
      console.error('Fetch playlists error, use static:', err);
      set({ playlistList: STATIC_LIST });
      return { success: true, playlists: STATIC_LIST, demo: true };
    }
  },

  fetchPlaylistById: async (playlistId) => {
    try {
      const res = await request.get('/netease/bootstrap/', {
        params: { playlist_id: playlistId },
        timeout: 30000,
      });
      if (res && res.playlist && res.playlist.tracks) {
        const allTracks = res.playlist.tracks || [];

        const tracks = allTracks.map((t) => ({
          id: t.id,
          name: t.name,
          artists: (t.ar || []).map((a) => ({ name: a.name })),
          album: (t.al || {}).name || '',
          cover: (t.al || {}).picUrl || '',
          url: streamUrl(t.id),
          duration: t.duration || 0,
        }));

        const playlist = {
          id: res.playlist.id,
          name: res.playlist.name,
          coverImgUrl: res.playlist.coverImgUrl || '',
          trackCount: tracks.length,
          tracks,
        };

        set({ currentPlaylist: playlist, currentTrack: null, currentLyrics: [], currentLyricIndex: -1 });

        if (tracks.length > 0) {
          get().playTrack(tracks[0]);
        }

        return { success: true, playlist };
      }
      return { success: false, error: '未找到歌单数据' };
    } catch (err) {
      console.error('Fetch playlist error, use static:', err);
      return applyStaticPlaylist(set, get);
    }
  },

  fetchBootstrapPlaylist: async () => {
    // 1) 站内音频库优先：只要上传过歌，就以它作为主歌单（真实可播）
    const uploads = await fetchUploadTracks();
    if (uploads.length > 0) {
      return applyUploadPlaylist(set, get, uploads);
    }

    try {
      const res = await request.get('/netease/bootstrap/', { timeout: 30000 });
      if (res && res.playlist && res.playlist.tracks) {
        const allTracks = res.playlist.tracks || [];

        const tracks = allTracks.map((t) => ({
          id: t.id,
          name: t.name,
          artists: (t.ar || []).map((a) => ({ name: a.name })),
          album: (t.al || {}).name || '',
          cover: (t.al || {}).picUrl || '',
          url: streamUrl(t.id),
          duration: t.duration || 0,
        })).filter((t) => t.id);

        const playlist = {
          id: res.playlist.id,
          name: res.playlist.name || 'Prisdvl 的喜欢音乐',
          coverImgUrl: res.playlist.coverImgUrl || '',
          trackCount: tracks.length,
          tracks,
        };

        // 原有歌单曲目全部不可播（网易云外链接口已关闭）→ 直接降级到示例曲目，
        // 避免用户逐首点、逐首弹「音源不可用」。原歌单仍保留在 playlists 中。
        if (tracks.length > 0 && !(await hasPlayableTrack(tracks))) {
          return applyFallbackPlaylist(set, get, {
            user: { nickname: 'Prisdvl', avatarUrl: playlist.coverImgUrl || '' },
            playlists: [playlist],
            playlistList: [{ id: playlist.id, name: playlist.name, coverImgUrl: playlist.coverImgUrl, trackCount: playlist.trackCount }],
          });
        }

        // 已有正在播放的曲目且属于同一歌单：保持播放，不重置 currentTrack / audio.src。
        // 否则（首次加载或切换歌单）才初始化第一首。
        const prevTrack = get().currentTrack;
        const isSamePlaylist = prevTrack && get().currentPlaylist?.id === playlist.id;

        set({
          user: { nickname: 'Prisdvl', avatarUrl: playlist.coverImgUrl || '' },
          playlists: [playlist],
          currentPlaylist: playlist,
          sourceKind: 'netease',
        });

        if (tracks.length > 0 && !isSamePlaylist) {
          const firstTrack = tracks[0];
          try {
            const lyricsRes = await request.get(`/netease/song/${firstTrack.id}/lyric/`);
            const lyrics = parseLyric(lyricsRes.lrc);
            set({
              currentTrack: firstTrack,
              currentLyrics: lyrics,
              currentLyricIndex: -1,
            });
          } catch {
            set({ currentTrack: firstTrack, currentLyrics: [], currentLyricIndex: -1 });
          }

          const audio = getAudio();
          if (audio) {
            audio.src = firstTrack.url;
            // 不自动播放，等待用户点击播放按钮
          }
        }

        return { success: true, playlist, tracks };
      } else {
        return { success: false, error: '未找到歌单数据' };
      }
    } catch (err) {
      // 网易云歌单接口不可用（外链被风控）属预期降级：用 warn 级别，避免污染控制台错误流
      console.warn('Fetch bootstrap failed, fallback to static playlist:', err?.message || err);
      const stat = applyStaticPlaylist(set, get);
      // 静态快照里的 url 同样是网易云外链（已失效），探测后再决定是否降级到示例曲目
      const statTracks = stat?.playlist?.tracks || [];
      if (statTracks.length && !(await hasPlayableTrack(statTracks))) {
        return applyFallbackPlaylist(set, get, { playlistList: STATIC_LIST });
      }
      return stat;
    }
  },

  /** 重新拉取站内音频库（上传/删除后调用），并把它切换为当前歌单 */
  refreshUploads: async () => {
    const tracks = await fetchUploadTracks();
    if (tracks.length === 0) {
      // 库清空：退回原有降级链路
      const result = await get().fetchBootstrapPlaylist();
      return { success: true, tracks: [], ...result };
    }
    const result = applyUploadPlaylist(set, get, tracks);
    return { success: true, tracks, ...result };
  },

  playTrack: async (track) => {
    try {
      // 网易云曲目经 fetch 已带同源流地址；静态/演示曲目自带完整地址则直接使用，
      // 兜底再用同源流代理。
      const url = track.url || streamUrl(track.id);

      // 后台非阻塞加载歌词
      request.get(`/netease/song/${track.id}/lyric/`).then((lyricsRes) => {
        const lyrics = parseLyric(lyricsRes?.lrc);
        set({ currentLyrics: lyrics, currentLyricIndex: -1 });
      }).catch(() => {
        set({ currentLyrics: [], currentLyricIndex: -1 });
      });

      set({
        currentTrack: { ...track, url },
        currentLyricIndex: -1,
        audioError: '',
      });

      const audio = getAudio();
      if (audio) {
        audio.src = url;
        await ensureAudioContext();
        try {
          await audio.play();
        } catch (err) {
          // play() 被拒（自动播放策略 / 音源不可用）需显式反馈，而不是静默无声
          const name = err?.name || '';
          if (name === 'NotAllowedError') {
            set({ isPlaying: false, audioError: '浏览器拦截了自动播放，请再点一次播放' });
          } else {
            console.warn('[music] play() 失败:', err);
            set({ isPlaying: false, audioError: '音源不可用，已自动跳过' });
            get().skipUnplayable(track.id);
          }
        }
      }
      return true;
    } catch (err) {
      console.error('Play track error:', err);
      set({ audioError: '播放出错' });
      return false;
    }
  },

  /** 标记曲目不可播放并顺序试听下一首（最多跳过整张歌单一次，避免死循环） */
  skipUnplayable: (trackId) => {
    const { badTracks, currentPlaylist, currentTrack } = get();
    if (!trackId || badTracks.includes(trackId)) return;
    const nextBad = [...badTracks, trackId];
    set({ badTracks: nextBad });

    const tracks = currentPlaylist?.tracks || [];
    // 全部试过仍不可用时停止，不再递归
    if (tracks.length === 0 || nextBad.length >= tracks.length) {
      set({ isPlaying: false, audioError: '歌单内暂无可播放音源' });
      return;
    }
    const idx = tracks.findIndex((t) => t.id === trackId);
    const next = tracks.slice(idx + 1).concat(tracks.slice(0, Math.max(idx, 0)))
      .find((t) => !nextBad.includes(t.id));
    if (next) get().playTrack(next);
    else set({ isPlaying: false, audioError: '歌单内暂无可播放音源' });
  },

  nextTrack: () => {
    const { currentPlaylist, currentTrack, badTracks } = get();
    if (!currentPlaylist?.tracks || !currentTrack) return;
    const idx = currentPlaylist.tracks.findIndex((t) => t.id === currentTrack.id);
    // 跳过已知不可播放的曲目（否则下一首仍是空音源，继续无声）
    const rest = currentPlaylist.tracks.slice(idx + 1);
    const next = rest.find((t) => !badTracks.includes(t.id));
    if (next) get().playTrack(next);
  },

  prevTrack: () => {
    const { currentPlaylist, currentTrack, badTracks } = get();
    if (!currentPlaylist?.tracks || !currentTrack) return;
    const idx = currentPlaylist.tracks.findIndex((t) => t.id === currentTrack.id);
    if (idx <= 0) return;
    const before = currentPlaylist.tracks.slice(0, idx).reverse();
    const prev = before.find((t) => !badTracks.includes(t.id));
    if (prev) get().playTrack(prev);
  },

  togglePlay: async () => {
    const { isPlaying } = get();
    const audio = getAudio();
    if (!audio || !audio.src) return;
    // 兜底：若因任何路径漏设 currentTrack，播放条会只显示"未在播放"，
    // 这里用歌单首曲补上，保证播放时信息与状态一致。
    if (!get().currentTrack) {
      const first = get().currentPlaylist?.tracks?.[0];
      if (first) set({ currentTrack: first });
    }
    if (isPlaying) {
      audio.pause();
    } else {
      await ensureAudioContext();
      try {
        await audio.play();
        set({ audioError: '' });
      } catch (err) {
        console.warn('[music] togglePlay 失败:', err);
        set({ isPlaying: false, audioError: '音源不可用，请切换曲目' });
      }
    }
  },

  seekTo: (time) => {
    const audio = getAudio();
    if (!audio || !isFinite(time)) return;
    const clamped = Math.max(0, Math.min(time, audio.duration || time));
    audio.currentTime = clamped;
    // 立即同步一次状态与歌词索引，避免等待 timeupdate
    const state = get();
    let newIdx = -1;
    const lyrics = state.currentLyrics;
    for (let i = 0; i < lyrics.length; i++) {
      if (clamped >= lyrics[i].time) newIdx = i;
      else break;
    }
    const next = { currentTime: clamped };
    if (newIdx !== state.currentLyricIndex) next.currentLyricIndex = newIdx;
    set(next);
  },

  setVolume: (v) => {
    const audio = getAudio();
    const vol = Math.max(0, Math.min(1, v));
    if (audio) {
      audio.volume = vol;
      // 用户主动把音量拉到 >0：自动取消静音
      if (vol > 0 && audio.muted) audio.muted = false;
    }
    const nextMuted = vol > 0 ? false : get().muted;
    set({ volume: vol, muted: nextMuted });
    try { localStorage.setItem('kakuki_volume', String(vol)); } catch {}
  },

  toggleMute: () => {
    const { muted } = get();
    const audio = getAudio();
    if (audio) audio.muted = !muted;
    set({ muted: !muted });
  },
}));

export default useMusicStore;
