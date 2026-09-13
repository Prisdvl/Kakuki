import { useRef, useState, useCallback, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Music } from 'lucide-react';
import useMusicStore from '../../store/musicStore';

/**
 * 首页音乐卡内嵌播放条（渲染在曲目列表下方，与列表同宽）。
 * 原 HomePage 全页横幅 PlayerBar 已下线，播放控制收敛进音乐卡片。
 * 进度条支持按住拖动（pointer capture），触摸端需 touch-action:none 防滚动劫持。
 */
export default function PlayerBar() {
  const {
    currentTrack, isPlaying, togglePlay, nextTrack, prevTrack,
    currentTime, duration, seekTo, audioError,
  } = useMusicStore(
    (state) => ({
      currentTrack: state.currentTrack,
      isPlaying: state.isPlaying,
      togglePlay: state.togglePlay,
      nextTrack: state.nextTrack,
      prevTrack: state.prevTrack,
      currentTime: state.currentTime,
      duration: state.duration,
      seekTo: state.seekTo,
      audioError: state.audioError,
    })
  );

  const progressRef = useRef(null);
  const [dragPct, setDragPct] = useState(null); // 拖动中的临时百分比（null = 未拖动）

  const formatTime = (s) => {
    if (!s || isNaN(s)) return '00:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const pctFromEvent = useCallback((clientX) => {
    const el = progressRef.current;
    if (!el || !duration) return 0;
    const rect = el.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, [duration]);

  // 按住拖动：pointer capture 让移出进度条仍持续跟踪
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
    seekTo(pct * duration);
  }, [dragPct, duration, pctFromEvent, seekTo]);

  // 松开在进度条外（capture 下少见）：兜底提交当前拖动值
  useEffect(() => {
    if (dragPct === null) return;
    const onUp = () => {
      if (dragPct !== null) {
        seekTo(dragPct * duration);
        setDragPct(null);
      }
    };
    window.addEventListener('pointerup', onUp, { once: true });
    return () => window.removeEventListener('pointerup', onUp);
  }, [dragPct, duration, seekTo]);

  if (!currentTrack) return null;

  const displayPct = dragPct !== null
    ? dragPct * 100
    : (duration > 0 ? (currentTime / duration) * 100 : 0);

  return (
    <div className="mp-player-bar">
      {/* 上行：封面 + 曲名/状态 + 控制 */}
      <div className="mp-player-top">
        <div className="mp-player-who">
          {currentTrack.cover ? (
            <img src={currentTrack.cover} alt={currentTrack.name} decoding="async" className="mp-player-cover" />
          ) : (
            <div className="mp-player-cover mp-cover-ph">
              <Music size={16} style={{ color: 'var(--on-accent)' }} />
            </div>
          )}
          <div className="mp-player-names">
            <div className="mp-player-track">{currentTrack.name}</div>
            <div className={`mp-player-state ${audioError ? 'err' : ''}`}>
              {audioError || (isPlaying ? '正在播放' : '已暂停')}
            </div>
          </div>
        </div>
        <div className="mp-player-ctrls">
          <button className="mp-ctrl" onClick={prevTrack} aria-label="上一首"><SkipBack size={15} /></button>
          <button
            className="mp-ctrl mp-ctrl-main"
            onClick={togglePlay}
            aria-label={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} style={{ marginLeft: 2 }} fill="currentColor" />}
          </button>
          <button className="mp-ctrl" onClick={nextTrack} aria-label="下一首"><SkipForward size={15} /></button>
        </div>
      </div>

      {/* 下行：可拖动进度条 */}
      <div className="mp-player-progress">
        <span className="mp-player-time">{formatTime(currentTime)}</span>
        <div
          ref={progressRef}
          className="mp-player-rail"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          role="slider"
          aria-label="播放进度"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration || 0)}
          aria-valuenow={Math.round(currentTime || 0)}
        >
          <div className="mp-player-fill" style={{ width: `${displayPct}%` }} />
        </div>
        <span className="mp-player-time">{formatTime(duration)}</span>
      </div>
    </div>
  );
}
