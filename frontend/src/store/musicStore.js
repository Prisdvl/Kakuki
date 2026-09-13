import { create } from 'zustand';
import request, { extractList } from '../api/request';

/** 站内音频库（用户上传）歌单 */
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
 * 拉取站内音频库（KV）。
 * 这是站点唯一的音源：示例曲目已按需求删除，网易云外链早已失效。
 * 上传的歌同源存储、同源播放，频谱可用。
 */
async function fetchUploadTracks() {
  try {
    const res = await request.get('/media/tracks/', { timeout: 15000 });
    return extractList(res).map(toUploadTrack);
  } catch {
    return [];
  }
}

/** 把上传库装载为当前歌单；空库时清空播放状态（不再回退到示例曲目） */
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
    currentPlaylist: playlist,
    sourceKind: 'uploads',
    audioError: '',
    badTracks: [],
  });

  if (!isSamePlaylist) {
    const first = tracks[0] || null;
    set({
      currentTrack: first,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
    });
    const audio = getAudio();
    if (audio) {
      if (first) audio.src = first.url;
      else {
        audio.pause();
        audio.removeAttribute('src');
      }
    }
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
    // 音频统一走同源 /api 流接口，无需 crossOrigin，媒体 CORS-clean，
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
    useMusicStore.setState({ currentTime: audio.currentTime || 0 });
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

const useMusicStore = create((set, get) => ({
  currentPlaylist: null,
  currentTrack: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  /** 音频错误提示（空串 = 正常）。原实现静默失败导致"没声音但看不出原因" */
  audioError: '',
  /** 已确认不可播放的曲目 id 集合，用于自动跳过 */
  badTracks: [],
  /** 当前音源类型：uploads = 站内音频库 */
  sourceKind: 'uploads',
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

  /** 初始化：装载站内音频库。示例曲目已删除，空库就是空态，不再降级。 */
  fetchBootstrapPlaylist: async () => {
    const tracks = await fetchUploadTracks();
    return applyUploadPlaylist(set, get, tracks);
  },

  /** 重新拉取站内音频库（上传/删除后调用），并把它切换为当前歌单 */
  refreshUploads: async () => {
    const tracks = await fetchUploadTracks();
    const result = applyUploadPlaylist(set, get, tracks);
    return { success: true, tracks, ...result };
  },

  playTrack: async (track) => {
    try {
      const url = track.url || `/api/v1/media/stream/${track.id}/`;

      set({
        currentTrack: { ...track, url },
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
    set({ currentTime: clamped });
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
