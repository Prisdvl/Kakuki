import { useLayoutEffect, useRef } from 'react';
import useMusicStore, { getAnalyser } from '../store/musicStore';

/**
 * SpectrumVisualizer —— Canvas 音频频谱可视化（真实音频驱动）
 *  - 64 根彩虹渐变频谱柱条：AnalyserNode.getByteFrequencyData 对数映射（低频更突出）
 *  - 中央环形：AnalyserNode.getByteTimeDomainData 实时波形（oscilloscope 风格）
 *  - 跟随 useMusicStore.isPlaying：播放时绘制真实数据 / 暂停时优雅衰减静止
 *  - 中央展示当前歌曲封面（无曲目时显示音符图标），无独立播放按钮
 *  - AudioContext 懒创建于用户首次播放，遵循浏览器自动播放策略
 */
const BARS = 64;
const RING_PTS = 128;

const STYLES = `
.spectrum-visualizer {
  border-radius: 20px;
  padding: 1.25rem 1.25rem 0.9rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}
.sv-ring {
  position: relative;
  width: 220px;
  height: 220px;
}
.sv-ring-canvas {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: block;
}
.sv-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 104px;
  height: 104px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 0 18px rgba(124, 58, 237, 0.10);
}
.sv-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.sv-icon {
  width: 40px;
  height: 40px;
  color: var(--text-secondary);
  opacity: 0.65;
}
.sv-bars {
  width: 100%;
  height: 126px;
  display: block;
}
.sv-status {
  font-size: 0.7rem;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--text-tertiary);
  opacity: 0.85;
}
@media (max-width: 640px) {
  .sv-ring { width: 190px; height: 190px; }
  .sv-center { width: 88px; height: 88px; }
  .sv-icon { width: 34px; height: 34px; }
  .sv-bars { height: 110px; }
}
`;

if (typeof document !== 'undefined' && !document.getElementById('spectrum-visualizer-styles')) {
  const tag = document.createElement('style');
  tag.id = 'spectrum-visualizer-styles';
  tag.textContent = STYLES;
  document.head.appendChild(tag);
}

/** 对数频率映射：低频更密集、高频更稀疏，符合人耳感知 */
function freqIndex(i, total, binCount) {
  const minIdx = 1; // 跳过 DC
  const maxIdx = binCount - 1;
  const t = i / (total - 1);
  return Math.max(0, Math.min(binCount - 1, Math.floor(minIdx * Math.pow(maxIdx / minIdx, t))));
}

export default function SpectrumVisualizer() {
  const ringRef = useRef(null);
  const barsRef = useRef(null);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const currentTrack = useMusicStore((s) => s.currentTrack);
  const playingRef = useRef(false);
  const rafRef = useRef(null);
  const smoothRef = useRef(Array.from({ length: BARS }, () => 0.02));

  // 同步播放状态到 ref（避免重建 raf 循环）
  useLayoutEffect(() => {
    playingRef.current = isPlaying;
  }, [isPlaying]);

  useLayoutEffect(() => {
    const ring = ringRef.current;
    const bars = barsRef.current;
    const rctx = ring && ring.getContext('2d');
    const bctx = bars && bars.getContext('2d');
    if (!rctx || !bctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let ringSize = 240;
    let barW = 600;
    let barH = 140;

    // AnalyserNode 在用户首次播放时才创建（懒加载），这里轮询直到就绪
    let analyser = getAnalyser();
    let freqData = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    let timeData = analyser ? new Uint8Array(analyser.fftSize) : null;
    const pollHandle = setInterval(() => {
      const a = getAnalyser();
      if (a && a !== analyser) {
        analyser = a;
        freqData = new Uint8Array(a.frequencyBinCount);
        timeData = new Uint8Array(a.fftSize);
      }
    }, 300);

    const setup = () => {
      ringSize = ring.clientWidth || 240;
      ring.width = ringSize * dpr;
      ring.height = ringSize * dpr;
      rctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      barW = bars.clientWidth || 600;
      barH = bars.clientHeight || 140;
      bars.width = barW * dpr;
      bars.height = barH * dpr;
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    setup();

    const drawIdleRing = () => {
      const cx = ringSize / 2;
      const cy = ringSize / 2;
      const baseR = ringSize * 0.32;
      rctx.clearRect(0, 0, ringSize, ringSize);
      rctx.beginPath();
      rctx.arc(cx, cy, baseR, 0, Math.PI * 2);
      rctx.strokeStyle = 'rgba(124, 58, 237, 0.35)';
      rctx.lineWidth = 2;
      rctx.stroke();
    };

    /** 对时域采样值做低通平滑，降低环形锯齿感 */
    const smoothTimeSample = (idx) => {
      const len = timeData.length;
      let sum = 0;
      for (let o = -2; o <= 2; o++) {
        sum += timeData[Math.max(0, Math.min(len - 1, idx + o))];
      }
      return sum / 5;
    };

    /** 中央环形：绘制实时时域波形（oscilloscope 风格，已做低通平滑与振幅限制） */
    const drawRingWave = () => {
      const cx = ringSize / 2;
      const cy = ringSize / 2;
      const baseR = ringSize * 0.34; // 稍微外扩，让波形与封面间留白更舒展
      const maxAmp = ringSize * 0.09; // 振幅减半以下，从 0.16→0.09
      rctx.clearRect(0, 0, ringSize, ringSize);

      const glow = rctx.createRadialGradient(cx, cy, baseR - 8, cx, cy, baseR + maxAmp + 12);
      glow.addColorStop(0, 'rgba(124, 58, 237, 0.04)');
      glow.addColorStop(1, 'rgba(124, 58, 237, 0)');
      rctx.fillStyle = glow;
      rctx.fillRect(0, 0, ringSize, ringSize);

      rctx.beginPath();
      for (let i = 0; i <= RING_PTS; i++) {
        const angle = (i / RING_PTS) * Math.PI * 2 - Math.PI / 2;
        const idx = Math.floor((i / RING_PTS) * (timeData.length - 1));
        const smoothed = smoothTimeSample(idx);
        const v = (smoothed - 128) / 128; // -1..1
        const r = baseR + v * maxAmp;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) rctx.moveTo(x, y);
        else rctx.lineTo(x, y);
      }
      rctx.closePath();

      const grad = rctx.createLinearGradient(0, 0, ringSize, ringSize);
      grad.addColorStop(0, 'rgba(124, 58, 237, 0.95)');
      grad.addColorStop(0.5, 'rgba(236, 72, 153, 0.85)');
      grad.addColorStop(1, 'rgba(6, 182, 212, 0.85)');
      rctx.strokeStyle = grad;
      rctx.lineWidth = 2;
      rctx.shadowColor = 'rgba(124, 58, 237, 0.28)';
      rctx.shadowBlur = 6;
      rctx.stroke();
      rctx.shadowBlur = 0;

      rctx.beginPath();
      rctx.arc(cx, cy, baseR - 16, 0, Math.PI * 2);
      rctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      rctx.lineWidth = 1;
      rctx.stroke();
    };

    const roundRect = (c, x, y, w, h, r) => {
      const rr = Math.min(r, w / 2, h / 2);
      c.beginPath();
      c.moveTo(x + rr, y);
      c.arcTo(x + w, y, x + w, y + h, rr);
      c.arcTo(x + w, y + h, x, y + h, rr);
      c.arcTo(x, y + h, x, y, rr);
      c.arcTo(x, y, x + w, y, rr);
      c.closePath();
    };

    /** 频谱柱条：对数映射的真实频率数据，已整体降低振幅、饱和度与变化速度 */
    const drawBarsFromFreq = () => {
      bctx.clearRect(0, 0, barW, barH);
      const s = smoothRef.current;
      const binCount = freqData.length;
      const gap = 3; // 从 2 增大到 3，柱条更疏朗
      const bw = (barW - gap * (BARS - 1)) / BARS;
      const maxH = barH * 0.72; // 最大高度从 (barH-4) 降到 0.72，整体压低
      for (let i = 0; i < BARS; i++) {
        const idx = freqIndex(i, BARS, binCount);
        const target = freqData[idx] / 255;
        // 平滑系数从 0.35 降到 0.22，动态更柔和
        s[i] += (target - s[i]) * 0.22;
        const bh = Math.max(3, s[i] * maxH);
        const x = i * (bw + gap);
        const y = barH - bh;
        const hue = (i / BARS) * 300;
        // 饱和度从 90~100% 降到 75~85%，明度从 50~70% 降到 55~68%，更克制
        const grad = bctx.createLinearGradient(0, y, 0, barH);
        grad.addColorStop(0, `hsla(${hue + 30}, 90%, 68%, 0.95)`);
        grad.addColorStop(1, `hsla(${hue}, 78%, 55%, 0.88)`);
        bctx.fillStyle = grad;
        roundRect(bctx, x, y, bw, bh, Math.min(bw / 2, 3));
        bctx.fill();
      }
    };

    const drawBarsFromSmooth = () => {
      bctx.clearRect(0, 0, barW, barH);
      const s = smoothRef.current;
      const gap = 3;
      const bw = (barW - gap * (BARS - 1)) / BARS;
      const maxH = barH * 0.72;
      for (let i = 0; i < BARS; i++) {
        const bh = Math.max(3, s[i] * maxH);
        const x = i * (bw + gap);
        const y = barH - bh;
        const hue = (i / BARS) * 300;
        const grad = bctx.createLinearGradient(0, y, 0, barH);
        grad.addColorStop(0, `hsla(${hue + 30}, 90%, 68%, 0.95)`);
        grad.addColorStop(1, `hsla(${hue}, 78%, 55%, 0.88)`);
        bctx.fillStyle = grad;
        roundRect(bctx, x, y, bw, bh, Math.min(bw / 2, 3));
        bctx.fill();
      }
    };

    const step = () => {
      if (playingRef.current && analyser && freqData && timeData) {
        analyser.getByteFrequencyData(freqData);
        analyser.getByteTimeDomainData(timeData);
        drawRingWave();
        drawBarsFromFreq();
      } else {
        // 暂停时：柱条平滑衰减到静止最小值，环形回到 idle
        const s = smoothRef.current;
        for (let i = 0; i < BARS; i++) {
          const diff = 0.02 - s[i];
          s[i] += diff * 0.12;
        }
        drawIdleRing();
        drawBarsFromSmooth();
      }
      rafRef.current = requestAnimationFrame(step);
    };

    const onResize = () => {
      setup();
      drawIdleRing();
      drawBarsFromSmooth();
    };
    window.addEventListener('resize', onResize);

    if (reduced) {
      drawIdleRing();
      const idle = Array.from({ length: BARS }, () => 0.15);
      smoothRef.current = idle;
      drawBarsFromSmooth();
    } else {
      drawIdleRing();
      drawBarsFromSmooth();
      rafRef.current = requestAnimationFrame(step);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearInterval(pollHandle);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <div className="spectrum-visualizer glass">
      <div className="sv-ring">
        <canvas ref={ringRef} className="sv-ring-canvas" />
        <div className="sv-center">
          {currentTrack?.cover ? (
            <img className={`sv-cover ${isPlaying ? 'music-cover-spin' : ''}`} src={currentTrack.cover} alt={currentTrack?.name || ''} />
          ) : (
            <svg className="sv-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          )}
        </div>
      </div>
      <canvas ref={barsRef} className="sv-bars" />
      <div className="sv-status">{isPlaying ? 'Spectrum · 64 bands · Live' : '已暂停 · 64 bands'}</div>
    </div>
  );
}
