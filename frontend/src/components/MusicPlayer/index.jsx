import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ListMusic, Upload } from 'lucide-react';
import useMusicStore from '../../store/musicStore';
import PlayerBar from './PlayerBar';

/**
 * 首页音乐卡：站内音频库曲目列表（简约版）。
 * 示例曲目已删除——空库时给出上传引导，不再播放占位音频。
 */
export default function MusicPlayer() {
  const {
    currentPlaylist, currentTrack,
    playTrack, fetchBootstrapPlaylist,
  } = useMusicStore(
    (state) => ({
      currentPlaylist: state.currentPlaylist,
      currentTrack: state.currentTrack,
      playTrack: state.playTrack,
      fetchBootstrapPlaylist: state.fetchBootstrapPlaylist,
    })
  );

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await fetchBootstrapPlaylist();
      if (!result.success) {
        setLoadError(result.error || '加载失败');
      }
    } catch (err) {
      setLoadError(err?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [fetchBootstrapPlaylist]);

  useEffect(() => {
    fetchData();
  }, [fetchData, retryKey]);

  const tracks = currentPlaylist?.tracks || [];
  const isPlaying = useMusicStore((s) => s.isPlaying);

  return (
    <div className="glass music-card mouse-glow" style={{ padding: 0, overflow: 'hidden' }}>
      {loading ? (
        <div className="mp-empty">
          <Loader2 size={24} className="spin" style={{ margin: '0 auto', color: 'var(--accent)' }} />
          <div className="mp-empty-text">正在加载音乐…</div>
        </div>
      ) : loadError ? (
        <div className="mp-empty">
          <div className="mp-empty-text">{loadError}</div>
          <button onClick={() => setRetryKey((k) => k + 1)} className="mp-retry">
            重试
          </button>
        </div>
      ) : tracks.length === 0 ? (
        <div className="mp-empty">
          <ListMusic size={26} style={{ margin: '0 auto', color: 'var(--text-tertiary)' }} />
          <div className="mp-empty-text">音频库还没有歌曲</div>
          <Link to="/music" className="mp-retry" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <Upload size={13} /> 去上传
          </Link>
        </div>
      ) : (
        <div className="mp-panel">
          <div className="mp-section-header">
            <span className="mp-section-title">我的音乐</span>
            <span className="mp-section-meta">{tracks.length} 首</span>
          </div>
          <div className="mp-scroll-list">
            {tracks.map((track, idx) => {
              const isActive = currentTrack?.id === track.id;
              return (
                <button
                  key={track.id}
                  onClick={() => playTrack(track)}
                  className="track-row mp-row"
                  aria-label={`播放 ${track.name}`}
                >
                  <span className="mp-track-index">{idx + 1}</span>
                  <div className="mp-row-body">
                    <div className={`mp-row-title ${isActive ? 'active' : ''}`}>{track.name}</div>
                    <div className="mp-row-meta">
                      {(track.artists || []).map((a) => a.name).join(' / ')}
                    </div>
                  </div>
                  {isActive && isPlaying && (
                    <span className="eq" aria-hidden="true">
                      <span /><span /><span /><span /><span />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 播放控制条：嵌在曲目列表下方，与卡片同宽 */}
      <PlayerBar />
    </div>
  );
}
