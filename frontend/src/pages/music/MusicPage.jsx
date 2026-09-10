import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Music, Disc3, ListMusic, Loader2, Volume2, VolumeX } from 'lucide-react';
import useMusicStore from '../../store/musicStore';
import SpectrumVisualizer from '../../components/SpectrumVisualizer';

export default function MusicPage() {
  const {
    currentPlaylist, currentTrack, isPlaying, playlistList,
    currentTime, duration, currentLyrics, currentLyricIndex,
    volume, muted,
    fetchBootstrapPlaylist, fetchPlaylistById, fetchPlaylists,
    playTrack, togglePlay, nextTrack, prevTrack, seekTo,
    setVolume, toggleMute,
  } = useMusicStore(
    (state) => ({
      currentPlaylist: state.currentPlaylist,
      currentTrack: state.currentTrack,
      isPlaying: state.isPlaying,
      playlistList: state.playlistList,
      currentTime: state.currentTime,
      duration: state.duration,
      currentLyrics: state.currentLyrics,
      currentLyricIndex: state.currentLyricIndex,
      volume: state.volume,
      muted: state.muted,
      fetchBootstrapPlaylist: state.fetchBootstrapPlaylist,
      fetchPlaylistById: state.fetchPlaylistById,
      fetchPlaylists: state.fetchPlaylists,
      playTrack: state.playTrack,
      togglePlay: state.togglePlay,
      nextTrack: state.nextTrack,
      prevTrack: state.prevTrack,
      seekTo: state.seekTo,
      setVolume: state.setVolume,
      toggleMute: state.toggleMute,
    })
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [switching, setSwitching] = useState(false);

  const tracks = currentPlaylist?.tracks || [];

  // 只在挂载时初始化一次。若 store 中已有播放状态（从其他页面返回），保持播放、不重置音频。
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const state = useMusicStore.getState();
      if (state.currentPlaylist?.tracks?.length && state.currentTrack) {
        // 已有歌单与曲目，说明是页面切换返回，避免 fetchBootstrapPlaylist 重置 audio.src 导致音乐停止
        if (mounted) setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const [playlistRes] = await Promise.all([
          fetchBootstrapPlaylist(),
          fetchPlaylists(),
        ]);
        if (mounted && !playlistRes.success) {
          setError(playlistRes.error || '加载失败');
        }
      } catch (err) {
        if (mounted) setError(err?.message || '加载失败');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    init();
    return () => { mounted = false; };
    // 依赖项留空：初始化逻辑只在组件挂载时执行一次；currentTrack/currentPlaylist 变化不应触发重新 fetch。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectPlaylist = async (pl) => {
    setSwitching(true);
    const result = await fetchPlaylistById(pl.id);
    setSwitching(false);
    if (result.success) {
      setShowPlaylists(false);
    }
  };

  const formatTime = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const progressRef = useRef(null);
  const handleProgressClick = useCallback((e) => {
    if (!duration || !progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekTo(pct * duration);
  }, [duration, seekTo]);

  const lyricsContainerRef = useRef(null);
  useEffect(() => {
    if (lyricsContainerRef.current && currentLyricIndex >= 0) {
      const active = lyricsContainerRef.current.querySelector('.lyric-line.active');
      if (active) {
        const container = lyricsContainerRef.current;
        const offset = active.offsetTop - container.offsetTop - container.clientHeight / 2 + active.clientHeight / 2;
        container.scrollTo({ top: offset, behavior: 'smooth' });
      }
    }
  }, [currentLyricIndex]);

  const currentLyricText = currentLyricIndex >= 0 && currentLyrics[currentLyricIndex]
    ? currentLyrics[currentLyricIndex].text
    : '';
  const displayPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="music-page">
      <h1 className="music-page-title">音乐</h1>
      <p className="music-page-subtitle">
        {loading ? '正在加载...' : tracks.length > 0 ? `共 ${tracks.length} 首歌曲` : ''}
      </p>

      <SpectrumVisualizer />

      {loading && (
        <div className="glass music-loading">
          <Loader2 size={32} className="spin" style={{ margin: '0 auto', color: 'var(--accent)' }} />
          <p className="music-loading-text">正在加载歌单...</p>
          <p className="music-loading-hint">首次加载可能需要几秒</p>
        </div>
      )}

      {error && !loading && (
        <div className="glass music-error">
          <p>{error}</p>
          <button onClick={() => fetchBootstrapPlaylist()} className="music-retry">
            重试
          </button>
        </div>
      )}

      {showPlaylists && !loading && (
        <div className="glass music-playlist-panel">
          <div className="music-panel-header">
            <button onClick={() => setShowPlaylists(false)} className="icon-btn" aria-label="返回">
              ←
            </button>
            <span className="music-panel-title">选择歌单</span>
            <span className="music-panel-meta">{playlistList.length} 个</span>
          </div>
          {switching ? (
            <div className="music-switching">
              <Loader2 size={20} className="spin" style={{ margin: '0 auto', color: 'var(--accent)' }} />
              <div>加载中...</div>
            </div>
          ) : (
            <div className="music-playlist-list">
              {playlistList.map((pl) => {
                const isActive = currentPlaylist?.id === pl.id;
                return (
                  <button
                    key={pl.id}
                    onClick={() => handleSelectPlaylist(pl)}
                    className="track-row music-playlist-row"
                    aria-label={`选择歌单 ${pl.name}`}
                  >
                    {pl.coverImgUrl ? (
                      <img src={pl.coverImgUrl} alt={pl.name} className="mp-cover-sm" loading="lazy" decoding="async" />
                    ) : (
                      <div className="mp-cover-sm mp-cover-placeholder">
                        <ListMusic size={18} />
                      </div>
                    )}
                    <div className="mp-row-body">
                      <div className={`mp-row-title ${isActive ? 'active' : ''}`}>{pl.name}</div>
                      <div className="mp-row-meta">{pl.trackCount} 首</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tracks.length > 0 && !loading && !showPlaylists && (
        <>
          <div className="music-panel-header">
            <button onClick={() => setShowPlaylists(true)} className="icon-btn" aria-label="切换歌单">
              <ListMusic size={18} />
            </button>
            <span className="music-panel-title">
              {currentPlaylist?.name || 'Prisdvl 的喜欢音乐'}
            </span>
            <span className="music-panel-meta">{tracks.length} 首</span>
          </div>

          <div className="music-track-list">
            {tracks.map((track, idx) => {
              const isActive = currentTrack?.id === track.id;
              return (
                <button
                  key={track.id}
                  onClick={() => playTrack(track)}
                  className="track-row music-track-row"
                  aria-label={`播放 ${track.name}`}
                >
                  <span className="mp-track-index">{idx + 1}</span>
                  {track.cover ? (
                    <img src={track.cover} alt={track.name} className="mp-cover-sm" loading="lazy" decoding="async" />
                  ) : (
                    <div className="mp-cover-sm mp-cover-placeholder">
                      <Music size={18} />
                    </div>
                  )}
                  <div className="mp-row-body">
                    <div className={`mp-row-title ${isActive ? 'active' : ''}`}>
                      {isPlaying && isActive && <span className="playing-indicator">♪</span>}
                      {track.name}
                    </div>
                    <div className="mp-row-meta">
                      {(track.artists || []).map((a) => a.name).join(' / ')}
                    </div>
                  </div>
                  <div className="music-track-icon">
                    {isActive && isPlaying ? (
                      <Pause size={18} style={{ color: 'var(--accent)' }} />
                    ) : (
                      <Play size={18} style={{ color: isActive ? 'var(--accent)' : 'var(--text-tertiary)' }} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {currentTrack && (
        <div className="glass music-player-bar">
          <div className="music-player-inner">
            {/* Left: Cover + Title */}
            <div className="music-player-info">
              {currentTrack.cover ? (
                <img
                  src={currentTrack.cover}
                  alt={currentTrack.name}
                  decoding="async"
                  fetchpriority="high"
                  className={`music-player-cover ${isPlaying ? 'music-cover-spin' : ''}`}
                />
              ) : (
                <div className="music-player-cover mp-cover-placeholder">
                  <Disc3 size={22} />
                </div>
              )}
              <div className="music-player-meta">
                <div className="music-player-name">{currentTrack.name}</div>
                <div className="music-player-artist">
                  {(currentTrack.artists || []).map((a) => a.name).join(' / ')}
                </div>
              </div>
            </div>

            {/* Center: Lyrics + Progress */}
            <div className="music-player-center">
              <div ref={lyricsContainerRef} className="lyrics-panel music-lyrics">
                {currentLyrics.length === 0 ? (
                  <div className="music-lyrics-empty">{currentLyricText || '暂无歌词'}</div>
                ) : (
                  currentLyrics.map((lyric, idx) => (
                    <div
                      key={idx}
                      className={`lyric-line ${idx === currentLyricIndex ? 'active' : ''}`}
                    >
                      {lyric.text}
                    </div>
                  ))
                )}
              </div>

              <div
                ref={progressRef}
                className="progress-bar music-progress"
                onClick={handleProgressClick}
                role="slider"
                aria-label="播放进度"
                aria-valuemin={0}
                aria-valuemax={Math.round(duration || 0)}
                aria-valuenow={Math.round(currentTime || 0)}
              >
                <span className="music-time">{formatTime(currentTime)}</span>
                <div className="music-progress-track">
                  <div className="music-progress-fill" style={{ width: `${displayPct}%` }} />
                </div>
                <span className="music-time">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Right: Controls */}
            <div className="music-player-controls">
              <button onClick={prevTrack} className="music-ctrl-btn" aria-label="上一首">
                <SkipBack size={18} />
              </button>
              <button onClick={togglePlay} className="play-pulse music-play-btn" aria-label={isPlaying ? '暂停' : '播放'}>
                {isPlaying ? (
                  <Pause size={18} />
                ) : (
                  <Play size={18} style={{ marginLeft: 2 }} fill="currentColor" />
                )}
              </button>
              <button onClick={nextTrack} className="music-ctrl-btn" aria-label="下一首">
                <SkipForward size={18} />
              </button>
              <div className="music-volume">
                <button
                  onClick={toggleMute}
                  className="music-ctrl-btn"
                  aria-label={muted ? '取消静音' : '静音'}
                  title={muted ? '取消静音' : '静音'}
                >
                  {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="volume-slider"
                  style={{ '--pct': `${(muted ? 0 : volume) * 100}%` }}
                  aria-label="音量"
                  aria-valuemin={0}
                  aria-valuemax={1}
                  aria-valuenow={Number(volume.toFixed(2))}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
