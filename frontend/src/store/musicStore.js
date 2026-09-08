import { create } from 'zustand';
import request from '../api/request';

// 线上静态部署（无后端）时使用的演示歌单：真实可播放的公开示例音频
const DEMO_PLAYLIST = {
  id: 'demo',
  name: 'Prisdvl 的喜欢音乐',
  coverImgUrl: '',
  trackCount: 8,
  tracks: [
    { id: 'demo-1', name: 'Song of the Green Whale', artists: [{ name: 'SoundHelix' }], album: 'Demo Vol.1', cover: 'https://picsum.photos/seed/kakuki-1/300/300', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
    { id: 'demo-2', name: 'Whispering Mountains', artists: [{ name: 'SoundHelix' }], album: 'Demo Vol.1', cover: 'https://picsum.photos/seed/kakuki-2/300/300', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
    { id: 'demo-3', name: 'Ink Drift', artists: [{ name: 'SoundHelix' }], album: 'Demo Vol.2', cover: 'https://picsum.photos/seed/kakuki-3/300/300', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
    { id: 'demo-4', name: 'Paper Moon', artists: [{ name: 'SoundHelix' }], album: 'Demo Vol.2', cover: 'https://picsum.photos/seed/kakuki-4/300/300', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
    { id: 'demo-5', name: 'Misty River', artists: [{ name: 'SoundHelix' }], album: 'Demo Vol.3', cover: 'https://picsum.photos/seed/kakuki-5/300/300', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3' },
    { id: 'demo-6', name: 'Brushstroke', artists: [{ name: 'SoundHelix' }], album: 'Demo Vol.3', cover: 'https://picsum.photos/seed/kakuki-6/300/300', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3' },
    { id: 'demo-7', name: 'Night Ink', artists: [{ name: 'SoundHelix' }], album: 'Demo Vol.4', cover: 'https://picsum.photos/seed/kakuki-7/300/300', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3' },
    { id: 'demo-8', name: 'Pale Whisper', artists: [{ name: 'SoundHelix' }], album: 'Demo Vol.4', cover: 'https://picsum.photos/seed/kakuki-8/300/300', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3' },
  ],
};

const DEMO_LIST = [{ id: 'demo', name: 'Prisdvl 的喜欢音乐', coverImgUrl: '', trackCount: 8 }];

const applyDemoPlaylist = (set, get) => {
  const playlist = { ...DEMO_PLAYLIST, tracks: DEMO_PLAYLIST.tracks.map((t) => ({ ...t })) };
  set({
    user: { nickname: 'Prisdvl', avatarUrl: '' },
    playlists: [playlist],
    playlistList: DEMO_LIST,
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

const getAudio = () => {
  if (!audioInstance) {
    audioInstance = new Audio();
    audioInstance.preload = 'metadata';
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

  audio.addEventListener('timeupdate', onTimeUpdate);
  audio.addEventListener('loadedmetadata', onLoadedMetadata);
  audio.addEventListener('ended', onEnded);
  audio.addEventListener('play', onPlay);
  audio.addEventListener('pause', onPause);
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

  fetchPlaylists: async () => {
    try {
      const res = await request.get('/netease/playlists/', { timeout: 15000 });
      const list = res?.playlists || [];
      set({ playlistList: list });
      return { success: true, playlists: list };
    } catch (err) {
      console.error('Fetch playlists error, use demo:', err);
      set({ playlistList: DEMO_LIST });
      return { success: true, playlists: DEMO_LIST, demo: true };
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
        const urlMap = {};
        (res.song_urls || []).forEach((u) => { if (u && u.id) urlMap[u.id] = u.url; });

        const tracks = allTracks.map((t) => ({
          id: t.id,
          name: t.name,
          artists: (t.ar || []).map((a) => ({ name: a.name })),
          album: (t.al || {}).name || '',
          cover: (t.al || {}).picUrl || '',
          url: urlMap[t.id] || `https://music.163.com/song/media/outer/url?id=${t.id}.mp3`,
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
      console.error('Fetch playlist error, use demo:', err);
      return applyDemoPlaylist(set, get);
    }
  },

  fetchBootstrapPlaylist: async () => {
    try {
      const res = await request.get('/netease/bootstrap/', { timeout: 30000 });
      if (res && res.playlist && res.playlist.tracks) {
        const allTracks = res.playlist.tracks || [];
        const urls = res.song_urls || [];
        const urlMap = {};
        urls.forEach((u) => { if (u && u.id) urlMap[u.id] = u.url; });

        const tracks = allTracks.map((t) => ({
          id: t.id,
          name: t.name,
          artists: (t.ar || []).map((a) => ({ name: a.name })),
          album: (t.al || {}).name || '',
          cover: (t.al || {}).picUrl || '',
          url: urlMap[t.id] || null,
          duration: t.duration || 0,
        })).filter((t) => t.url);

        const playlist = {
          id: res.playlist.id,
          name: res.playlist.name || 'Prisdvl 的喜欢音乐',
          coverImgUrl: res.playlist.coverImgUrl || '',
          trackCount: tracks.length,
          tracks,
        };

        set({
          user: { nickname: 'Prisdvl', avatarUrl: playlist.coverImgUrl || '' },
          playlists: [playlist],
          currentPlaylist: playlist,
        });

        if (tracks.length > 0) {
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
      console.error('Fetch bootstrap error, use demo:', err);
      return applyDemoPlaylist(set, get);
    }
  },

  playTrack: async (track) => {
    try {
      // 演示曲目自带完整音频地址；网易云曲目回退外链
      const url = track.url || `https://music.163.com/song/media/outer/url?id=${track.id}.mp3`;

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

  togglePlay: () => {
    const { isPlaying } = get();
    const audio = getAudio();
    if (!audio || !audio.src) return;
    if (isPlaying) {
      audio.pause();
    } else {
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
}));

export default useMusicStore;
