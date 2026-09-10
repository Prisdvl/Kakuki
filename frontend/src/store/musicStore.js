import { create } from 'zustand';
import request from '../api/request';
import { STATIC_MUSIC } from '../data/musicStatic';

// 同源音频流地址：经后端代理转发网易云 MP3，媒体 CORS-clean，频谱分析可正常输出
const streamUrl = (songId) => `/api/v1/netease/song/${songId}/stream/`;

// 线上静态部署（无后端）时使用的真实歌单静态快照（来自本地后端接口，构建时生成）
const STATIC_LIST = [{ id: STATIC_MUSIC.id, name: STATIC_MUSIC.name, coverImgUrl: STATIC_MUSIC.coverImgUrl, trackCount: STATIC_MUSIC.trackCount }];

const applyStaticPlaylist = (set, get) => {
  const playlist = {
    ...STATIC_MUSIC,
    tracks: STATIC_MUSIC.tracks.map((t) => ({ ...t })),
  };
  set({
    user: { nickname: 'Prisdvl', avatarUrl: STATIC_MUSIC.coverImgUrl || '' },
    playlists: [playlist],
    playlistList: STATIC_LIST,
    currentPlaylist: playlist,
    currentTrack: null,
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

  // 音频加载失败处理：统一日志，便于排查（同源流代理失败多为后端未就绪或歌曲不可用）
  const onError = () => {
    const err = audio.error;
    if (!err) return;
    console.warn('[music] 音频加载失败:', err.code, '| src:', audio.src);
  };

  audio.addEventListener('timeupdate', onTimeUpdate);
  audio.addEventListener('loadedmetadata', onLoadedMetadata);
  audio.addEventListener('ended', onEnded);
  audio.addEventListener('play', onPlay);
  audio.addEventListener('pause', onPause);
  audio.addEventListener('error', onError);
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

        // 已有正在播放的曲目且属于同一歌单：保持播放，不重置 currentTrack / audio.src。
        // 否则（首次加载或切换歌单）才初始化第一首。
        const prevTrack = get().currentTrack;
        const isSamePlaylist = prevTrack && get().currentPlaylist?.id === playlist.id;

        set({
          user: { nickname: 'Prisdvl', avatarUrl: playlist.coverImgUrl || '' },
          playlists: [playlist],
          currentPlaylist: playlist,
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
      console.error('Fetch bootstrap error, use static:', err);
      return applyStaticPlaylist(set, get);
    }
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
      });

      const audio = getAudio();
      if (audio) {
        audio.src = url;
        await ensureAudioContext();
        audio.play().catch(() => {});
      }
      return true;
    } catch (err) {
      console.error('Play track error:', err);
      return false;
    }
  },

  nextTrack: () => {
    const { currentPlaylist, currentTrack } = get();
    if (!currentPlaylist?.tracks || !currentTrack) return;
    const idx = currentPlaylist.tracks.findIndex((t) => t.id === currentTrack.id);
    if (idx >= 0 && idx < currentPlaylist.tracks.length - 1) {
      get().playTrack(currentPlaylist.tracks[idx + 1]);
    }
  },

  prevTrack: () => {
    const { currentPlaylist, currentTrack } = get();
    if (!currentPlaylist?.tracks || !currentTrack) return;
    const idx = currentPlaylist.tracks.findIndex((t) => t.id === currentTrack.id);
    if (idx > 0) {
      get().playTrack(currentPlaylist.tracks[idx - 1]);
    }
  },

  togglePlay: async () => {
    const { isPlaying } = get();
    const audio = getAudio();
    if (!audio || !audio.src) return;
    if (isPlaying) {
      audio.pause();
    } else {
      await ensureAudioContext();
      audio.play().catch(() => {});
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
