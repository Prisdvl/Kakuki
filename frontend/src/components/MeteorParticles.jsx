import { useEffect, useRef } from 'react';

/**
 * MeteorParticles —— 粒子背景组件（双形态）
 *
 * variant="ambient"：全站淡淡的弥散粒子层（无图形，几乎不扰眼）。
 *   - AppLayout 的 .bg-scene 内挂载，所有页面可见。
 *
 * variant="home"：首页首屏博主卡右侧的「钻石陨石」聚散循环。
 *   - 粒子从弥散态汇聚成不规则钻石（多边形、棱角、无长尾）→ 停留 → 散开，
 *     持续循环呼吸；鼠标移动时图形轻微偏移呼应。
 *
 * 性能：单 rAF 上限 30fps；粒子数按面积自适应；页面隐藏时暂停。
 */
export default function MeteorParticles({ variant = 'ambient' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let particles = [];
    let w = 0;
    let h = 0;
    let shape = null;      // home: 离屏钻石采样
    let cx = 0;
    let cy = 0;
    let scale = 1;
    let mouseX = 0.5;
    let mouseY = 0.5;
    let visible = document.visibilityState === 'visible';
    const isHome = variant === 'home';

    // 聚散节奏（home）：汇聚 2.6s / 停留 2.2s / 散开 3.2s
    const GATHER = 2.6;
    const HOLD = 2.2;
    const SCATTER = 3.2;
    const CYCLE_MS = (GATHER + HOLD + SCATTER) * 1000;

    const readAccent = () => {
      try {
        const cs = getComputedStyle(document.documentElement);
        return cs.getPropertyValue('--accent').trim() || '#7c3aed';
      } catch { return '#7c3aed'; }
    };

    /** 离屏画布绘制「钻石陨石」：不规则多边形（棱角、无长尾） */
    function buildDiamond(size) {
      const off = document.createElement('canvas');
      off.width = size;
      off.height = size;
      const o = off.getContext('2d');
      o.translate(size / 2, size / 2);
      const pts = [
        [0, -0.34], [0.16, -0.10], [0.21, 0.10], [0.07, 0.30],
        [-0.07, 0.32], [-0.19, 0.14], [-0.22, -0.08], [-0.10, -0.26],
      ];
      o.beginPath();
      pts.forEach(([px, py], i) => {
        const x = px * size;
        const y = py * size;
        if (i === 0) o.moveTo(x, y);
        else o.lineTo(x, y);
      });
      o.closePath();
      o.fillStyle = '#fff';
      o.fill();
      // 内面：反向小三角形做"切割棱"，使钻石有立体感
      o.beginPath();
      o.moveTo(0, -0.06 * size);
      o.lineTo(0.09 * size, 0.04 * size);
      o.lineTo(-0.09 * size, 0.05 * size);
      o.closePath();
      o.fillStyle = 'rgba(0,0,0,0.55)';
      o.fill();
      return off;
    }

    function rebuild() {
      if (isHome) {
        const rect = canvas.parentElement?.getBoundingClientRect() || { width: 0, height: 0 };
        w = rect.width || 360;
        h = rect.height || 300;
      } else {
        w = window.innerWidth;
        h = window.innerHeight;
      }
      if (w <= 0 || h <= 0) return;
      canvas.width = Math.round(w * DPR);
      canvas.height = Math.round(h * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      if (isHome) {
        scale = Math.max(180, Math.min(w * 0.62, 360));
        cx = w / 2;
        cy = h / 2;
        const size = Math.round(scale);
        shape = buildDiamond(size);
        const sctx = shape.getContext('2d');
        const img = sctx.getImageData(0, 0, size, size);
        const px = img.data;
        const shapePts = [];
        const step = Math.max(2, Math.round(size / 42));
        for (let y = 0; y < size; y += step) {
          for (let x = 0; x < size; x += step) {
            const a = px[(y * size + x) * 4 + 3];
            if (a < 40) continue;
            shapePts.push({ dx: (x - size / 2) / scale, dy: (y - size / 2) / scale });
          }
        }
        const density = reduce ? 0.55 : 1;
        const count = Math.round(Math.min(900, Math.max(380, (w * h) / 620)) * density);
        const shapeCount = Math.min(shapePts.length, Math.round(count * 0.62));
        particles = [];
        for (let i = 0; i < count; i += 1) {
          const sp = i < shapeCount ? shapePts[i] : null;
          particles.push({
            dhx: w * (0.1 + Math.random() * 0.8),
            dhy: h * (0.1 + Math.random() * 0.8),
            dx: sp ? sp.dx : 0,
            dy: sp ? sp.dy : 0,
            jx: Math.random() * 6.28,
            jy: Math.random() * 6.28,
            r: sp ? 0.9 + Math.random() * 1.3 : 0.7 + Math.random(),
            alpha: 0.22 + Math.random() * 0.55,
          });
        }
      } else {
        // ambient：很淡的弥散点
        const density = reduce ? 0.5 : 1;
        const count = Math.round(Math.min(460, Math.max(220, (w * h) / 5200)) * density);
        particles = [];
        for (let i = 0; i < count; i += 1) {
          particles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            jx: Math.random() * 6.28,
            jy: Math.random() * 6.28,
            r: 0.7 + Math.random() * 1.4,
            alpha: 0.05 + Math.random() * 0.14,
            vy: 0.08 + Math.random() * 0.2,
          });
        }
      }
    }

    function easeInOut(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function phaseAt(now) {
      if (!isHome) return 0;
      const t = (now % CYCLE_MS) / 1000;
      if (t < GATHER) return easeInOut(t / GATHER);
      if (t < GATHER + HOLD) return 1;
      return 1 - easeInOut((t - GATHER - HOLD) / SCATTER);
    }

    function draw(now) {
      ctx.clearRect(0, 0, w, h);
      if (!particles.length) return;
      const accent = readAccent();
      const speed = reduce ? 0.6 : 1;
      const t = (now * speed) / 1000;

      if (isHome) {
        const k = phaseAt(now * speed);
        const ox = (mouseX - 0.5) * 22 * k;
        const oy = (mouseY - 0.5) * 16 * k;
        ctx.fillStyle = accent;
        for (const p of particles) {
          let fx, fy;
          if (dxOf(p)) {
            fx = p.dhx + (cx + p.dx * scale + ox - p.dhx) * k;
            fy = p.dhy + (cy + p.dy * scale + oy - p.dhy) * k;
          } else {
            fx = p.dhx + ox * k * 0.3;
            fy = p.dhy + oy * k * 0.3;
          }
          const jx = Math.sin(t * 0.5 + p.jx) * 1.6;
          const jy = Math.cos(t * 0.42 + p.jy) * 1.6;
          ctx.globalAlpha = p.alpha * (0.45 + 0.55 * k);
          ctx.beginPath();
          ctx.arc(fx + jx, fy + jy, p.r * (0.75 + 0.3 * k), 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // ambient：缓慢上浮 + 抖动（很淡）
        ctx.fillStyle = accent;
        for (const p of particles) {
          const jx = Math.sin(t * 0.4 + p.jx) * 1.2;
          const jy = Math.cos(t * 0.35 + p.jy) * 1.2;
          ctx.globalAlpha = p.alpha;
          ctx.beginPath();
          ctx.arc(p.x + jx, p.y + jy, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }

    function frame(now) {
      if (visible) draw(now);
      raf = requestAnimationFrame(frame);
    }

    function dxOf(p) { return p.dx !== undefined && (p.dx !== 0 || p.dy !== 0); }

    rebuild();
    raf = requestAnimationFrame(frame);

    const onResize = () => rebuild();
    const onMouse = (e) => {
      mouseX = e.clientX / window.innerWidth;
      mouseY = e.clientY / window.innerHeight;
    };
    const onVis = () => { visible = document.visibilityState === 'visible'; };

    if (isHome) {
      const ro = new ResizeObserver(onResize);
      if (canvas.parentElement) ro.observe(canvas.parentElement);
      ro.observe(canvas);
      window.addEventListener('mousemove', onMouse, { passive: true });
      document.addEventListener('visibilitychange', onVis);
      return () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        window.removeEventListener('mousemove', onMouse);
        document.removeEventListener('visibilitychange', onVis);
      };
    }

    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMouse, { passive: true });
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouse);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [variant]);

  return (
    <div className={`meteor-${variant}`} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}