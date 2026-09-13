import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, SkipBack, SkipForward, Music, Disc3, Loader2, Volume2, VolumeX, Upload, Trash2, X, CheckCircle2 } from 'lucide-react';
import useMusicStore from '../../store/musicStore';
import useUserStore from '../../store/userStore';
import mediaApi from '../../api/media';
import CoverParticles from '../../components/CoverParticles';
import { extractEmbeddedCover } from '../../utils/embeddedCover';

const ACCEPT = '.mp3,.m4a,.aac,.wav,.ogg,.flac,audio/*';
const MAX_MB = 60;

/** 上传面板：把本地音频收进站内音频库（D1 元数据 + R2 二进制），播放走同源流接口 */
function UploadPanel({ onDone, onClose }) {
  const inputRef = useRef(null);
  const [queue, setQueue] = useState([]);      // [{ file, name, cover, thumb }]
  const [artist, setArtist] = useState('');
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);        // { type: 'ok'|'err', text }

  const pick = (fileList) => {
    const list = Array.from(fileList || []);
    const tooBig = list.filter((f) => f.size > MAX_MB * 1024 * 1024);
    const ok = list.filter((f) => f.size <= MAX_MB * 1024 * 1024);
    if (tooBig.length) {
      setMsg({ type: 'err', text: `已跳过 ${tooBig.length} 个超过 ${MAX_MB} MB 的文件` });
    }
    if (!ok.length) return;
    setQueue((q) => [...q, ...ok.map((file) => ({ file, name: file.name.replace(/\.[^.]+$/, ''), cover: null, thumb: null }))]);
    // 异步解析内嵌封面：不阻塞加入队列，解析到就回填缩略图
    ok.forEach((file, idx) => {
      const targetName = file.name.replace(/\.[^.]+$/, '');
      extractEmbeddedCover(file)
        .then((cover) => {
          if (!cover) return;
          const url = URL.createObjectURL(cover.blob);
          setQueue((prev) =>
            prev.map((x) => (x.file === file && x.name === targetName ? { ...x, cover, thumb: url } : x))
          );
        })
        .catch(() => {});
    });
  };

  const start = async () => {
    if (!queue.length || busy) return;
    setBusy(true);
    setMsg(null);
    let done = 0;
    for (const item of queue) {
      try {
        await mediaApi.upload(
          item.file,
          { name: item.name, artist, cover: item.cover || undefined },
          (p) => setProgress(Math.round(((done + p / 100) / queue.length) * 100))
        );
        done += 1;
      } catch (e) {
        const m = e?.response?.data?.message || e?.message || '上传失败';
        setMsg({ type: 'err', text: `第 ${done + 1} 首失败：${m}` });
        setBusy(false);
        setProgress(0);
        if (done > 0) onDone();
        return;
      }
    }
    setProgress(100);
    setBusy(false);
    setQueue([]);
    setMsg({ type: 'ok', text: `已上传 ${done} 首` });
    onDone();
  };

  return (
    <div className="glass music-upload-panel">
      <div className="music-panel-header">
        <button onClick={onClose} className="icon-btn" aria-label="关闭上传面板"><X size={18} /></button>
        <span className="music-panel-title">上传歌曲</span>
        <span className="music-panel-meta">≤ {MAX_MB} MB / 首</span>
      </div>

      <div
        className="music-upload-drop"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragging'); }}
        onDragLeave={(e) => e.currentTarget.classList.remove('dragging')}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove('dragging');
          pick(e.dataTransfer?.files);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') inputRef.current?.click(); }}
      >
        <Upload size={20} />
        <span>选择或拖入音频文件（支持多选）</span>
        <span className="music-upload-hint">mp3 / m4a / wav / ogg · 上传后同源播放，频谱可用</span>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          onChange={(e) => { pick(e.target.files); e.target.value = ''; }}
        />
      </div>

      {queue.length > 0 && (
        <div className="music-upload-queue">
          {queue.map((q, i) => (
            <div key={`${q.file.name}-${i}`} className="music-upload-item">
              {q.thumb
                ? <img className="music-upload-thumb" src={q.thumb} alt="" />
                : <span className="music-upload-thumb music-upload-thumb-empty" aria-hidden="true" />}
              <input
                value={q.name}
                onChange={(e) => setQueue((prev) => prev.map((x, xi) => (xi === i ? { ...x, name: e.target.value } : x)))}
                disabled={busy}
                aria-label="曲名"
              />
              <span className="music-upload-size">{(q.file.size / 1024 / 1024).toFixed(1)} MB</span>
              <button
                className="icon-btn"
                aria-label="移除"
                disabled={busy}
                onClick={() => setQueue((prev) => prev.filter((_, xi) => xi !== i))}
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="music-upload-meta">
        <label>
          歌手
          <input
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="整批统一填写，可留空"
            disabled={busy}
          />
        </label>
      </div>

      {busy && (
        <div className="music-upload-progress" aria-label="上传进度">
          <div style={{ width: `${progress}%` }} />
          <span>{progress}%</span>
        </div>
      )}

      {msg && (
        <p className={`music-upload-msg ${msg.type}`}>
          {msg.type === 'ok' && <CheckCircle2 size={14} />} {msg.text}
        </p>
      )}

      <div className="music-upload-actions">
        <button
          className="glass-button-solid music-upload-submit"
          onClick={start}
          disabled={!queue.length || busy}
        >
          {busy ? <Loader2 size={15} className="spin" /> : <Upload size={15} />}
          {busy ? '上传中…' : `上传 ${queue.length || ''}`.trim()}
        </button>
      </div>
    </div>
  );
}

export default function MusicPage() {
  const currentPlaylist = useMusicStore((s) => s.currentPlaylist);
  const currentTrack = useMusicStore((s) => s.currentTrack);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const currentTime = useMusicStore((s) => s.currentTime);
  const duration = useMusicStore((s) => s.duration);
  const volume = useMusicStore((s) => s.volume);
  const muted = useMusicStore((s) => s.muted);
  const fetchBootstrapPlaylist = useMusicStore((s) => s.fetchBootstrapPlaylist);
  const refreshUploads = useMusicStore((s) => s.refreshUploads);
  const playTrack = useMusicStore((s) => s.playTrack);
  const togglePlay = useMusicStore((s) => s.togglePlay);
  const nextTrack = useMusicStore((s) => s.nextTrack);
  const prevTrack = useMusicStore((s) => s.prevTrack);
  const seekTo = useMusicStore((s) => s.seekTo);
  const setVolume = useMusicStore((s) => s.setVolume);
  const toggleMute = useMusicStore((s) => s.toggleMute);

  const isLoggedIn = useUserStore((s) => s.isLoggedIn);
  const isStaff = useUserStore((s) => s.user?.is_staff ?? false);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [notice, setNotice] = useState('');

  const tracks = currentPlaylist?.tracks || [];

  const handleDelete = async (track) => {
    if (!window.confirm(`删除《${track.name}》？此操作不可撤销。`)) return;
    try {
      await mediaApi.remove(track.id);
      setNotice(`已删除《${track.name}》`);
      await refreshUploads();
    } catch (e) {
      setNotice(e?.response?.data?.message || '删除失败');
    }
  };

  // 只在挂载时初始化一次。若 store 中已有播放状态（从其他页面返回），保持播放、不重置音频。
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const state = useMusicStore.getState();
      if (state.currentPlaylist) {
        // 已有歌单，说明是页面切换返回，避免 fetchBootstrapPlaylist 重置 audio.src 导致音乐停止
        if (mounted) setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const result = await fetchBootstrapPlaylist();
        if (mounted && !result.success) {
          setError(result.error || '加载失败');
        }
      } catch (err) {
        if (mounted) setError(err?.message || '加载失败');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    init();
    return () => { mounted = false; };
    // 初始化只在挂载时执行一次；currentTrack/currentPlaylist 变化不应触发重新 fetch。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatTime = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // ===== 进度条：点击 + 按住拖动（pointer capture）=====
  const progressRef = useRef(null);
  const [dragPct, setDragPct] = useState(null);   // 拖动中的本地预览百分比

  const pctFromEvent = useCallback((clientX) => {
    if (!progressRef.current) return 0;
    const rect = progressRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const handlePointerDown = useCallback((e) => {
    if (!duration) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDragPct(pctFromEvent(e.clientX));
  }, [duration, pctFromEvent]);

  const handlePointerMove = useCallback((e) => {
    if (dragPct === null) return;
    setDragPct(pctFromEvent(e.clientX));
  }, [dragPct, pctFromEvent]);

  const handlePointerUp = useCallback((e) => {
    if (dragPct === null) return;
    const pct = pctFromEvent(e.clientX);
    setDragPct(null);
    if (duration) seekTo(pct * duration);
  }, [dragPct, duration, seekTo, pctFromEvent]);

  const displayPct = dragPct !== null
    ? dragPct * 100
    : duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="music-page">
      <div className="music-page-head">
        <div style={{ minWidth: 0 }}>
          <h1 className="music-page-title">音乐</h1>
          <p className="music-page-subtitle">
            {loading ? '正在加载...' : tracks.length > 0 ? `共 ${tracks.length} 首 · 站内音频库` : ''}
          </p>
        </div>
        {isStaff ? (
          <button
            className="glass-button music-upload-entry"
            onClick={() => { if (!isLoggedIn) { navigate('/login'); return; } setShowUpload((v) => !v); }}
            title="上传本地音频到站内音频库"
          >
            <Upload size={15} /> 上传歌曲
          </button>
        ) : (
          isLoggedIn && <span className="music-upload-hint" style={{ alignSelf: 'center' }}>仅站长账号可上传歌曲</span>
        )}
      </div>

      {showUpload && (
        <UploadPanel
          onDone={() => refreshUploads()}
          onClose={() => setShowUpload(false)}
        />
      )}

      {notice && (
        <p className="music-notice">
          {notice}
          <button className="icon-btn" aria-label="关闭提示" onClick={() => setNotice('')}><X size={14} /></button>
        </p>
      )}

      <CoverParticles />

      {loading && (
        <div className="glass music-loading">
          <Loader2 size={32} className="spin" style={{ margin: '0 auto', color: 'var(--accent)' }} />
          <p className="music-loading-text">正在加载音乐…</p>
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

      {!loading && !error && tracks.length === 0 && (
        <div className="glass music-empty-library">
          <Music size={28} style={{ color: 'var(--text-tertiary)' }} />
          <p>音频库还没有歌曲</p>
          {isStaff ? (
            <button
              className="glass-button-solid"
              onClick={() => { if (!isLoggedIn) { navigate('/login'); return; } setShowUpload(true); }}
            >
              <Upload size={14} /> {isLoggedIn ? '上传第一首歌' : '登录后上传'}
            </button>
          ) : (
            isLoggedIn && <p className="music-upload-hint">仅站长账号可上传歌曲</p>
          )}
        </div>
      )}

      {tracks.length > 0 && !loading && (
        <>
          <div className="music-panel-header">
            <span className="music-panel-title">我的音乐</span>
            <span className="music-panel-meta">{tracks.length} 首</span>
          </div>

          <div className="music-track-list">
            {tracks.map((track, idx) => {
              const isActive = currentTrack?.id === track.id;
              return (
                <div
                  key={track.id}
                  onClick={() => playTrack(track)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); playTrack(track); } }}
                  role="button"
                  tabIndex={0}
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
                  {track.isUpload && isStaff && (
                    <button
                      className="music-track-del icon-btn"
                      aria-label={`删除 ${track.name}`}
                      title="删除"
                      onClick={(e) => { e.stopPropagation(); handleDelete(track); }}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* 播放控制条：嵌在列表下方，与列表同宽对齐（不再悬浮全屏） */}
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

                {/* Center: Progress（可点击 + 可拖动） */}
                <div className="music-player-center">
                  <div
                    ref={progressRef}
                    className="progress-bar music-progress"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
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
        </>
      )}
    </div>
  );
}
