import { useState, useEffect, useCallback } from 'react';
import { Loader2, ListMusic } from 'lucide-react';
import useMusicStore from '../../store/musicStore';

function PlaylistSelector({ onSelect, loading }) {
  const { playlistList, currentPlaylist, fetchPlaylists } = useMusicStore();

  useEffect(() => {
    if (playlistList.length === 0) {
      fetchPlaylists();
    }
  }, [playlistList.length, fetchPlaylists]);

  if (loading) {
    return (
      <div className="mp-empty">
        <Loader2 size={20} className="spin" style={{ margin: '0 auto', color: 'var(--accent)' }} />
        <div className="mp-empty-text">加载歌单列表...</div>
      </div>
    );
  }

  return (
    <div className="mp-panel">
      <div className="mp-section-header">
        <span className="mp-section-title">Prisdvl 的歌单</span>
        <span className="mp-section-meta">{playlistList.length} 个</span>
      </div>
      <div className="mp-scroll-list">
        {playlistList.map((pl) => {
          const isActive = currentPlaylist?.id === pl.id;
          return (
            <button
              key={pl.id}
              onClick={() => onSelect(pl)}
              className="track-row mp-row"
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
    </div>
  );
}

function TrackList({ onPlay, currentTrack, onBack }) {
  const { currentPlaylist, isPlaying } = useMusicStore();
  const tracks = currentPlaylist?.tracks || [];

  return (
    <div className="mp-panel">
      <div className="mp-section-header">
        <button onClick={onBack} className="icon-btn mp-back" aria-label="返回歌单列表">
          <ListMusic size={16} />
        </button>
        <span className="mp-section-title mp-truncate">{currentPlaylist?.name || 'Prisdvl 的喜欢音乐'}</span>
        <span className="mp-section-meta">{tracks.length} 首</span>
      </div>
      {tracks.length === 0 ? (
        <div className="mp-empty-text">歌单暂无歌曲</div>
      ) : (
        <div className="mp-scroll-list">
          {tracks.map((track, idx) => {
            const isActive = currentTrack?.id === track.id;
            const activePlaying = isActive && isPlaying;
            return (
              <button
                key={track.id}
                onClick={() => onPlay(track)}
                className="track-row mp-row"
                aria-label={`播放 ${track.name}`}
              >
                <span className="mp-track-index">{idx + 1}</span>
                <div className="mp-row-body">
                  <div className={`mp-row-title ${isActive ? 'active' : ''}`}>
                    {activePlaying && <span className="playing-indicator">♪</span>}
                    {track.name}
                  </div>
                  <div className="mp-row-meta">
                    {(track.artists || []).map((a) => a.name).join(' / ')}
                  </div>
                </div>
                {isActive && (
                  <span className="playing-indicator" aria-hidden="true">
                    {isPlaying ? '♪' : '❚❚'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function MusicPlayer() {
  const {
    currentTrack,
    playTrack, fetchBootstrapPlaylist, fetchPlaylistById,
  } = useMusicStore(
    (state) => ({
      currentTrack: state.currentTrack,
      playTrack: state.playTrack,
      fetchBootstrapPlaylist: state.fetchBootstrapPlaylist,
      fetchPlaylistById: state.fetchPlaylistById,
    })
  );

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);
  const [view, setView] = useState('tracks');
  const [switching, setSwitching] = useState(false);

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

  const handleSelectPlaylist = async (pl) => {
    setSwitching(true);
    const result = await fetchPlaylistById(pl.id);
    setSwitching(false);
    if (result.success) {
      setView('tracks');
    }
  };

  return (
    <div className="glass music-card mouse-glow" style={{ padding: 0, overflow: 'hidden' }}>
      {loading ? (
        <div className="mp-empty">
          <Loader2 size={24} className="spin" style={{ margin: '0 auto', color: 'var(--accent)' }} />
          <div className="mp-empty-text">正在加载 Prisdvl 的喜欢音乐...</div>
          <div className="mp-empty-hint">首次加载可能需要几秒</div>
        </div>
      ) : loadError ? (
        <div className="mp-empty">
          <div className="mp-empty-text">{loadError}</div>
          <button onClick={() => setRetryKey((k) => k + 1)} className="mp-retry">
            重试
          </button>
        </div>
      ) : view === 'playlists' ? (
        <PlaylistSelector onSelect={handleSelectPlaylist} loading={switching} />
      ) : (
        <TrackList
          onPlay={playTrack}
          currentTrack={currentTrack}
          onBack={() => setView('playlists')}
        />
      )}
    </div>
  );
}
