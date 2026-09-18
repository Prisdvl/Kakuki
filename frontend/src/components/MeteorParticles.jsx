import { useEffect, useRef } from 'react';

/**
 * MeteorParticles —— 粒子背景组件
 *
 * variant="ambient"：全站淡淡的弥散粒子层（无图形）。
 *
 * variant="home"：首页首屏右侧的「颜料团块」粒子。
 * 粒子形状/颜色**忠实复现用户交付的 paint-blob-particles 参考文件**：
 *   - 加载其内嵌图片（/meteor-blob-512.png，蓝色颜料团块）
 *   - 按原逻辑像素采样：step 2.5 + jitter；深色处粒子更密、更大、更实；
 *     粒子颜色 = 图像像素原色；外加浅灰弥散背景点
 * 动画：
 *   - 入场聚散只执行一次（进入/刷新：弥散 → 聚合，~2.8s）
 *   - 聚合后持续轻微呼吸（±3%）+ 缓慢旋转（±3°）+ 粒子绕形位游动
 *   - 光标移入 → 粒子径向扰动；移出 → 平滑回弹
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
    let cx = 0;
    let cy = 0;
    let scale = 1;
    let visible = document.visibilityState === 'visible';
    const isHome = variant === 'home';

    // home：参考图片加载与采样
    let blobImg = null;
    let blobReady = false;

    // home 状态
    const gatherT = 2.8;
    let gatherElapsed = 0;
    let gathered = false;
    let hover = 0;
    let hoverTarget = 0;
    let mx = 0;
    let my = 0;

    const readAccent = () => {
      try {
        const cs = getComputedStyle(document.documentElement);
        return cs.getPropertyValue('--accent').trim() || '#7c3aed';
      } catch { return '#7c3aed'; }
    };

    if (isHome) {
      blobImg = new Image();
      blobImg.onload = () => { blobReady = true; rebuild(); };
      blobImg.src = '/meteor-blob-512.png';
    }

    /** 像素采样（照搬参考 paint-blob-particles 逻辑），返回形状粒子数组 */
    function sampleBlob(particleCount) {
      const sourceSize = 512;
      const sc = document.createElement('canvas');
      const sctx = sc.getContext('2d');
      sc.width = sourceSize;
      sc.height = sourceSize;
      const scl = Math.min(sourceSize / blobImg.width, sourceSize / blobImg.height);
      const dw = blobImg.width * scl;
      const dh = blobImg.height * scl;
      sctx.drawImage(blobImg, (sourceSize - dw) / 2, (sourceSize - dh) / 2, dw, dh);
      const { width, height, data } = sctx.getImageData(0, 0, sourceSize, sourceSize);

      const outScale = scale / sourceSize;
      const step = 2.5;
      const jitter = step * 0.6;
      const shapePts = [];
      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          const i = (Math.floor(y) * width + Math.floor(x)) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a < 30) continue;
          const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
          const density = 0.4 + (1 - brightness) * 0.9;
          if (Math.random() > density) continue;
          shapePts.push({
            dx: ((x - sourceSize / 2) + (Math.random() - 0.5) * jitter) * outScale,
            dy: ((y - sourceSize / 2) + (Math.random() - 0.5) * jitter) * outScale,
            r: (0.8 + (1 - brightness) * 1.8 + Math.random() * 0.8) * 0.55,
            alpha: 0.5 + (1 - brightness) * 0.42,
            col: `rgb(${r}, ${g}, ${b})`,
            jx: Math.random() * 6.28,
            jy: Math.random() * 6.28,
          });
        }
      }

      const count = Math.round(particleCount);
      const list = [];
      for (let i = 0; i < count; i += 1) {
        const sp = shapePts[i % shapePts.length];
        list.push({
          dhx: Math.random() * w,
          dhy: Math.random() * h,
          dx: sp.dx,
          dy: sp.dy,
          r: sp.r,
          alpha: sp.alpha,
          col: sp.col,
          jx: sp.jx,
          jy: sp.jy,
          isShape: true,
        });
      }
      return list;
    }

    function rebuild() {
      if (isHome) {
        const rect = canvas.parentElement?.getBoundingClientRect() || { width: 0, height: 0 };
        w = rect.width || 420;
        h = rect.height || 360;
      } else {
        w = window.innerWidth;
        h = window.innerHeight;
      }
      if (w <= 0 || h <= 0) return;
      canvas.width = Math.round(w * DPR);
      canvas.height = Math.round(h * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      if (isHome) {
        scale = Math.max(220, Math.min(w * 0.86, h * 0.9, 420));
        cx = w / 2;
        cy = h / 2;
        if (blobReady && blobImg) {
          const densityMul = reduce ? 0.55 : 1;
          const count = Math.round(Math.min(1500, Math.max(420, (w * h) / 380)) * densityMul * 0.72);
          const shapePts = sampleBlob(count);
          const bg = [];
          const bgCount = Math.round(Math.min(640, (w * h) / 700) * densityMul);
          for (let i = 0; i < bgCount; i += 1) {
            bg.push({
              dhx: Math.random() * w,
              dhy: Math.random() * h,
              r: 0.5 + Math.random() * 1.2,
              alpha: 0.1 + Math.random() * 0.08,
              col: '#888',
              jx: Math.random() * 6.28,
              jy: Math.random() * 6.28,
              isShape: false,
            });
          }
          particles = [...shapePts, ...bg];
        }
      } else {
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
          });
        }
      }
    }

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function draw(now) {
      ctx.clearRect(0, 0, w, h);
      if (!particles.length) return;
      const accent = readAccent();

      if (isHome) {
        if (!gathered) {
          gatherElapsed += 1 / 60;
          if (gatherElapsed >= gatherT) gathered = true;
        }
        const k = gathered ? 1 : easeOutCubic(Math.min(1, gatherElapsed / gatherT));
        hover += (hoverTarget - hover) * 0.12;

        const t = now / 1000;
        const breath = gathered ? 1 + Math.sin(t * 0.55) * 0.03 : 1;
        const rot = gathered ? Math.sin(t * 0.14) * 0.055 : 0;
        const c = Math.cos(rot);
        const s = Math.sin(rot);

        for (const p of particles) {
          let fx, fy;
          if (p.isShape) {
            const peak = 0.6 + Math.sin(t * 0.7 + p.jx) * 0.25 + Math.random() * 0.1;
            const lx = p.dx * scale * breath;
            const ly = p.dy * scale * breath;
            const rx = lx * c - ly * s;
            const ry = lx * s + ly * c;
            const sx = cx + rx;
            const sy = cy + ry;
            fx = p.dhx + (sx - p.dhx) * k;
            fy = p.dhy + (sy - p.dhy) * k;
            fx += Math.sin(t * 0.5 + p.jx) * 1.6 * peak;
            fy += Math.cos(t * 0.42 + p.jy) * 1.6 * peak;
          } else {
            fx = p.dhx;
            fy = p.dhy;
          }
          if (hover > 0.02 && p.isShape) {
            const ddx = fx - mx;
            const ddy = fy - my;
            const dist = Math.hypot(ddx, ddy);
            const R = Math.max(90, w * 0.3);
            if (dist < R && dist > 0.01) {
              const fall = 1 - dist / R;
              const push = fall * fall * hover * 8;
              fx += (ddx / dist) * push;
              fy += (ddy / dist) * push;
            }
          }
          ctx.globalAlpha = p.alpha * (p.isShape ? 0.5 + 0.5 * k : 1);
          ctx.fillStyle = p.isShape ? p.col : accent;
          ctx.beginPath();
          ctx.arc(fx, fy, p.r * (p.isShape ? breath : 1), 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        const t = now / 1000;
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

    function onVis() { visible = document.visibilityState === 'visible'; }
    function onResize() { rebuild(); }

    rebuild();
    raf = requestAnimationFrame(frame);

    if (isHome) {
      const onPointerMove = (e) => {
        const rect = canvas.getBoundingClientRect();
        mx = e.clientX - rect.left;
        my = e.clientY - rect.top;
        hoverTarget = 1;
      };
      const onPointerLeave = () => { hoverTarget = 0; };
      const ro = new ResizeObserver(onResize);
      if (canvas.parentElement) ro.observe(canvas.parentElement);
      ro.observe(canvas);
      canvas.addEventListener('pointermove', onPointerMove);
      canvas.addEventListener('pointerleave', onPointerLeave);
      document.addEventListener('visibilitychange', onVis);
      return () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerleave', onPointerLeave);
        document.removeEventListener('visibilitychange', onVis);
      };
    }

    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [variant]);

  return (
    <div className={`meteor-${variant}`} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}