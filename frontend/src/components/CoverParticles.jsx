import { useLayoutEffect, useRef } from 'react';
import useMusicStore, { getAnalyser } from '../store/musicStore';

/**
 * CoverParticles —— 封面粒子主视觉（参考 Mineradio 的封面粒子效果）
 *
 * 原理：
 *   1. 把当前曲目封面画到 64×64 离屏 canvas，逐像素采样出「粒子」：
 *      每颗粒子带原位坐标（home，-1..1）、颜色（取自封面像素）、
 *      频带归属（到中心距离 → 0=低频区，1=高频区）。
 *   2. 播放时从 AnalyserNode 取真实频率数据：低频能量把内侧粒子向外推、
 *      高频能量让外侧粒子抖动闪烁，整体缓慢旋涡旋转 —— 封面随音乐"呼吸"。
 *   3. 暂停时能量优雅衰减，只留轻微呼吸；无封面时用主题色合成粒子盘。
 *   4. 切歌时粒子场交叉淡入淡出；prefers-reduced-motion 时静止呈现。
 */

const SAMPLE = 64;               // 封面采样分辨率
const PARTICLE_CAP = 3600;       // 桌面端粒子上限（比原来更密集；采样 64² 最大 4096）

/** 挂载世代号：新实例 ++generation；旧循环发现世代不匹配自我终止，
 *  防止反复进出音乐页时 rAF 循环残留累积把页面拖死。 */
let generation = 0;

const STYLES = `
.cover-particles {
  position: relative;
  width: 100%;
}
.cp-canvas {
  width: 100%;
  height: 380px;
  display: block;
  border-radius: 16px;
  cursor: grab;
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
}
.cp-canvas.dragging { cursor: grabbing; }
.cp-status {
  font-size: 0.7rem;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--text-tertiary);
  opacity: 0.7;
  user-select: none;
  margin-top: 0.5rem;
  text-align: center;
}
@media (max-width: 640px) {
  .cp-canvas { height: 300px; }
}
`;

if (typeof document !== 'undefined' && !document.getElementById('cover-particles-styles')) {
  const tag = document.createElement('style');
  tag.id = 'cover-particles-styles';
  tag.textContent = STYLES;
  document.head.appendChild(tag);
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** rgb 字符串/hex → HSL（解析失败返回 null） */
function parseToHsl(str) {
  const s = (str || '').trim();
  let r, g, b;
  const m = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(s);
  if (m) {
    r = +m[1]; g = +m[2]; b = +m[3];
  } else {
    const hex = /^#([0-9a-f]{6})$/i.exec(s);
    if (!hex) return null;
    const v = parseInt(hex[1], 16);
    r = (v >> 16) & 255; g = (v >> 8) & 255; b = v & 255;
  }
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 262, s: 0, l }; // 无彩色 → 兜底紫 hue
  const d = max - min;
  const satV = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: h * 60, s: satV, l };
}

/** 无封面兜底：主题 accent 色相 + 邻近色渐变合成"虚拟封面"再采样。
 *  主题 accent 饱和度过低（灰调主题）时，取站内标志性紫 hue 262 补饱和，
 *  避免粒子盘灰成一团。 */
function syntheticCoverCanvas() {
  const c = document.createElement('canvas');
  c.width = SAMPLE;
  c.height = SAMPLE;
  const ctx = c.getContext('2d');
  const css = getComputedStyle(document.documentElement);
  const parsed = parseToHsl(css.getPropertyValue('--accent'));
  const h = parsed ? parsed.h : 262;
  const sat = parsed && parsed.s > 0.18 ? Math.max(0.55, parsed.s) : 0.66;
  const grad = ctx.createRadialGradient(SAMPLE / 2, SAMPLE / 2, 3, SAMPLE / 2, SAMPLE / 2, SAMPLE / 2);
  grad.addColorStop(0, `hsl(${(h + 55) % 360}, ${Math.round(sat * 100)}%, 66%)`);
  grad.addColorStop(0.55, `hsl(${h}, ${Math.round(sat * 100)}%, 60%)`);
  grad.addColorStop(1, `hsl(${(h - 45 + 360) % 360}, ${Math.round(sat * 100)}%, 50%)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(SAMPLE / 2, SAMPLE / 2, SAMPLE / 2 - 1, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

/** 从封面采样粒子集合：{ list, avgColor }，home 坐标 -1..1
 *  source 可为 canvas 或 HTMLImageElement：后者先画到离屏 canvas（等比居中裁剪）再读像素 */
function sampleParticles(source) {
  let ctx;
  if (source instanceof HTMLImageElement) {
    const c = document.createElement('canvas');
    c.width = SAMPLE;
    c.height = SAMPLE;
    const d = c.getContext('2d', { willReadFrequently: true });
    // 等比居中裁剪（cover 模式）：铺满 64×64，避免拉伸变形
    const iw = source.naturalWidth || SAMPLE;
    const ih = source.naturalHeight || SAMPLE;
    const sc = Math.max(SAMPLE / iw, SAMPLE / ih);
    const dw = iw * sc, dh = ih * sc;
    d.drawImage(source, (SAMPLE - dw) / 2, (SAMPLE - dh) / 2, dw, dh);
    ctx = d;
  } else {
    ctx = source.getContext('2d', { willReadFrequently: true });
  }
  const { data } = ctx.getImageData(0, 0, SAMPLE, SAMPLE);
  const raw = [];
  let ar = 0, ag = 0, ab = 0, n = 0;
  for (let y = 0; y < SAMPLE; y++) {
    for (let x = 0; x < SAMPLE; x++) {
      const i = (y * SAMPLE + x) * 4;
      if (data[i + 3] < 140) continue;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      raw.push({
        hx: (x + 0.5) / SAMPLE * 2 - 1,
        hy: (y + 0.5) / SAMPLE * 2 - 1,
        r, g, b,
        phase: Math.random() * Math.PI * 2,
      });
      ar += r; ag += g; ab += b; n++;
    }
  }
  if (!n) return { list: [], avg: [124, 58, 237] };
  // 数量超上限时均匀抽稀（保持构图）
  const step = raw.length > PARTICLE_CAP ? raw.length / PARTICLE_CAP : 1;
  const list = [];
  for (let k = 0; k < raw.length; k += step) {
    const p = raw[Math.floor(k)];
    list.push({
      ...p,
      band: clamp(Math.hypot(p.hx, p.hy) / 1.25, 0, 1), // 0=中心低频区 → 1=边缘高频区
    });
  }
  return { list, avg: [ar / n, ag / n, ab / n] };
}

export default function CoverParticles() {
  const canvasRef = useRef(null);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const coverUrl = useMusicStore((s) => s.currentTrack?.cover) || '';
  const playingRef = useRef(false);
  const coverRef = useRef('');
  const rafRef = useRef(null);

  useLayoutEffect(() => {
    playingRef.current = isPlaying;
  }, [isPlaying]);

  // 封面变化 → 离屏采样（组件层只负责"提供最新粒子集"，渲染循环读 ref）
  // 注意：无封面（coverUrl 为空串）也要走一次合成采样，作为无曲/无封面的兜底粒子盘。
  useLayoutEffect(() => {
    coverRef.current = coverUrl;
    const load = async () => {
      let source;
      if (coverUrl) {
        source = await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(syntheticCoverCanvas());
          img.src = coverUrl;
        });
      } else {
        source = syntheticCoverCanvas();
      }
      // 交给渲染循环（统一转成采样，避免在 ctx 读像素的 canvas 污染）
      pendingSourceRef.current = source;
    };
    load();
  }, [coverUrl]);

  const pendingSourceRef = useRef(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas && canvas.getContext('2d');
    if (!ctx) return;

    const gen = ++generation;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;
    let particles = null;      // 当前粒子集
    let avgColor = [124, 58, 237];
    let swapFade = 1;          // 切歌交叉淡入淡出：→0 换集 →1
    let angle = 0;
    let dragAngle = 0;         // 用户拖拽累积的方向偏移
    let t = 0;
    let eLow = 0, eHigh = 0;   // 平滑后的低/高频能量

    // 拖拽旋转：按住 canvas 拖动即调整粒子封面的显示方向。
    // 拖动期间暂停自动旋涡，松手后在用户所选方向上继续自转。
    let dragging = false;
    let dragPointer = null;
    let lastPX = 0, lastPY = 0;
    const onPointerDown = (e) => {
      dragging = true;
      dragPointer = e.pointerId;
      lastPX = e.clientX;
      lastPY = e.clientY;
      try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      canvas.classList.add('dragging');
      e.preventDefault();
    };
    const onPointerMove = (e) => {
      if (!dragging || e.pointerId !== dragPointer) return;
      const dx = e.clientX - lastPX;
      const dy = e.clientY - lastPY;
      lastPX = e.clientX;
      lastPY = e.clientY;
      // 水平拖动旋转角度，纵向略加权让拖拽更跟手
      dragAngle += dx * 0.008 + dy * 0.004;
    };
    const endDrag = (e) => {
      if (e.pointerId === dragPointer) {
        dragging = false;
        dragPointer = null;
        canvas.classList.remove('dragging');
      }
    };
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);

    let analyser = getAnalyser();
    let freqData = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    const pollHandle = setInterval(() => {
      const a = getAnalyser();
      if (a && a !== analyser) {
        analyser = a;
        freqData = new Uint8Array(a.frequencyBinCount);
      }
    }, 300);

    const setup = () => {
      W = canvas.clientWidth || 800;
      H = canvas.clientHeight || 380;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    setup();

    const trySwap = () => {
      const src = pendingSourceRef.current;
      if (!src) return;
      const sampled = sampleParticles(src);
      if (!sampled.list.length) return;
      particles = sampled.list;
      avgColor = sampled.avg;
      pendingSourceRef.current = null;
    };

    const binAvg = (from, to) => {
      if (!analyser || !freqData) return 0;
      let s = 0;
      const a = Math.max(1, Math.floor(from)), b = Math.min(freqData.length - 1, Math.floor(to));
      for (let i = a; i <= b; i++) s += freqData[i];
      return s / Math.max(1, b - a + 1) / 255;
    };

    const draw = (dt) => {
      ctx.clearRect(0, 0, W, H);
      // 首次装载：还没有粒子集时直接换集，不走淡出
      if (!particles && pendingSourceRef.current) trySwap();
      if (!particles || !particles.length) return;

      const isDark = document.documentElement.classList.contains('dark');
      const playing = playingRef.current && analyser && freqData;

      // 能量平滑：播放取真实数据，暂停衰减为微呼吸
      if (playing) {
        // 分析器失效防护：重建链路/切歌后 getAnalyser 可能指向已断开的节点，
        // 直接读会每帧抛错拖垮渲染循环，这里捕获并降级为呼吸动画。
        try {
          analyser.getByteFrequencyData(freqData);
          const binCount = freqData.length;
          const tLow = binAvg(2, Math.max(4, binCount * 0.06));
          const tHigh = binAvg(binCount * 0.45, binCount * 0.9);
          eLow += (tLow - eLow) * 0.18;
          eHigh += (tHigh - eHigh) * 0.18;
        } catch {
          analyser = null;
          freqData = null;
          eLow = 0;
          eHigh = 0;
        }
      } else {
        eLow += (0.03 + 0.03 * Math.sin(t * 1.1) - eLow) * 0.05;
        eHigh += (0.02 - eHigh) * 0.05;
      }

      // 切歌交叉淡出 → 换集 → 淡入
      if (pendingSourceRef.current) {
        swapFade -= dt * 3.2;
        if (swapFade <= 0) { swapFade = 0; trySwap(); }
      } else if (swapFade < 1) {
        swapFade = Math.min(1, swapFade + dt * 2.4);
      }
      const alpha = (isDark ? 0.85 : 0.8) * swapFade;
      if (alpha <= 0.01) return;

      const cx = W / 2;
      const cy = H / 2;
      const scale = Math.min(W, H) * 0.44;
      const spin = playing ? 0.10 : 0.045; // rad/s
      // 拖动时锁定方向；松手后从拖到的基础角度继续自转
      if (!dragging) angle += spin * dt;
      t += dt;
      const baseSize = Math.max(0.7, (scale / SAMPLE) * 0.62);
      const jitterAmp = playing ? 0.02 : 0.008;

      // 背景氛围光：封面均色的超大径向渐变，克制到刚可感知
      const glowR = Math.min(W, H) * (0.52 + eLow * 0.16);
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      bg.addColorStop(0, `rgba(${avgColor[0] | 0},${avgColor[1] | 0},${avgColor[2] | 0},${0.10 * swapFade})`);
      bg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = bg;
      ctx.fillRect(cx - glowR, cy - glowR, glowR * 2, glowR * 2);

      const ca = Math.cos(angle), sa = Math.sin(angle);
      // 普通合成：加法混合(lighter)在粒子密集处会叠加饱和成白色，冲掉封面取色

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        // 差速旋涡：外侧转得稍快，制造流动感（dragAngle 为用户拖拽的基础方向）
        const th = (dragAngle + angle) * (0.6 + 0.55 * p.band);
        const ca2 = Math.cos(th), sa2 = Math.sin(th);
        const rx = p.hx * ca2 - p.hy * sa2;
        const ry = p.hx * sa2 + p.hy * ca2;
        // 频带驱动位移：低频推内侧、高频抖外侧
        const push = 1
          + eLow * 0.26 * (1 - p.band)
          + eHigh * 0.42 * p.band
          + Math.sin(t * 2.2 + p.phase) * jitterAmp;
        const x = cx + rx * scale * push;
        const y = cy + ry * scale * push;
        // 亮度随能量微调：粒子"闪"起来
        const lift = 1 + eHigh * 0.9 * p.band + eLow * 0.35 * (1 - p.band);
        const r = clamp(p.r * lift, 0, 255) | 0;
        const g = clamp(p.g * lift, 0, 255) | 0;
        const b = clamp(p.b * lift, 0, 255) | 0;
        const s = baseSize * (1 + eLow * 0.7 * (1 - p.band) + eHigh * 0.5 * p.band);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
      }

      ctx.globalAlpha = 1;
    };

    let last = performance.now();
    const step = (now) => {
      // 世代守卫：本实例已卸载但旧 rAF 回调仍被调度时，自我终止，绝不续帧
      if (gen !== generation) {
        cancelAnimationFrame(rafRef.current);
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      draw(dt);
      rafRef.current = requestAnimationFrame(step);
    };

    const onResize = () => setup();
    window.addEventListener('resize', onResize);

    let cleanupExtras = null;
    if (reduced) {
      // 静态呈现：等封面采样完成后铺开一帧（封面加载是异步的，轮询几次）
      let tries = 0;
      const idleTick = setInterval(() => {
        tries += 1;
        if (pendingSourceRef.current) trySwap();
        draw(0);
        if (particles || tries > 20) clearInterval(idleTick);
      }, 400);
      cleanupExtras = () => clearInterval(idleTick);
    } else {
      rafRef.current = requestAnimationFrame(step);
    }

    const startLoop = () => {
      if (!reduced && !rafRef.current) {
        last = performance.now();
        rafRef.current = requestAnimationFrame(step);
      }
    };
    const stopLoop = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
    const onVisibility = () => {
      if (document.hidden) stopLoop();
      else startLoop();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stopLoop();
      if (cleanupExtras) cleanupExtras();
      clearInterval(pollHandle);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', endDrag);
      canvas.removeEventListener('pointercancel', endDrag);
    };
  }, []);

  return (
    <div className="cover-particles">
      <canvas ref={canvasRef} className="cp-canvas" aria-label="封面粒子可视化（可拖动旋转方向）" />
      <div className="cp-status">{isPlaying ? 'LIVE' : '已暂停'} · 拖动旋转</div>
    </div>
  );
}
