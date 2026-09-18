import { useEffect, useRef } from 'react';

/**
 * MeteorParticles —— 粒子背景组件
 *
 * variant="ambient"：全站淡淡的弥散粒子层（无图形）。
 *
 * variant="home"：首页首屏博主卡右侧的「颜料团块 · 陨石」。
 * 参考 paint-blob-particles（用户提供）的颜料团块质感：
 *   - 用陨石形状图像做像素采样，深色核心 → 粒子更密、更大、更实，
 *     外缘 → 疏、小、淡，形成有体积感的"颜料陨石"
 *   - 外层叠加淡弥散背景点
 * 动画（按用户要求）：
 *   - 入场聚散只执行一次（每次进入首页/刷新时：弥散 → 聚合，~2.8s）
 *   - 完成后静态保持团块
 *   - 光标移入粒子区域 → 粒子随光标轻微扰动扩散；移出 → 平滑回弹
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

    // home 状态
    const gatherT = 2.8;           // 入场聚合时长（s）
    let gatherElapsed = 0;          // 每次挂载只播一次
    let gathered = false;
    let hover = 0;                  // 光标影响强度（平滑 0→1→0）
    let hoverTarget = 0;
    let mx = 0;
    let my = 0;

    const readAccent = () => {
      try {
        const cs = getComputedStyle(document.documentElement);
        return cs.getPropertyValue('--accent').trim() || '#7c3aed';
      } catch { return '#7c3aed'; }
    };

    /** 陨石形状图像：外缘浅灰、核心深黑（亮度 → 密度/大小/透明度映射） */
    function buildDiamondImage(size) {
      const off = document.createElement('canvas');
      off.width = size;
      off.height = size;
      const o = off.getContext('2d');
      o.translate(size / 2, size / 2);
      const pts = [
        [0, -0.34], [0.16, -0.10], [0.21, 0.10], [0.07, 0.30],
        [-0.07, 0.32], [-0.19, 0.14], [-0.22, -0.08], [-0.10, -0.26],
      ];
      // 外缘形状：浅灰（亮 → 疏、淡）
      o.beginPath();
      pts.forEach(([px, py], i) => {
        const x = px * size;
        const y = py * size;
        if (i === 0) o.moveTo(x, y);
        else o.lineTo(x, y);
      });
      o.closePath();
      o.fillStyle = '#b9b9b9';
      o.fill();
      // 外缘描边柔化
      o.strokeStyle = 'rgba(220,220,220,0.6)';
      o.lineWidth = size * 0.035;
      o.stroke();
      // 内核心：径向渐变中心最黑 → 边缘中灰（体积感）
      const core = [
        [0, -0.14], [0.09, -0.03], [0.11, 0.08], [0.01, 0.17],
        [-0.08, 0.12], [-0.10, -0.01], [-0.04, -0.10],
      ];
      o.beginPath();
      core.forEach(([px, py], i) => {
        const x = px * size;
        const y = py * size;
        if (i === 0) o.moveTo(x, y);
        else o.lineTo(x, y);
      });
      o.closePath();
      const g = o.createRadialGradient(0, 0, 0, 0, 0, size * 0.22);
      g.addColorStop(0, '#1a1a1a');
      g.addColorStop(1, '#6a6a6a');
      o.fillStyle = g;
      o.fill();
      return off;
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
        scale = Math.max(200, Math.min(w * 0.6, 360));
        cx = w / 2;
        cy = h / 2;
        const size = Math.round(scale);
        const shape = buildDiamondImage(size);
        const sctx = shape.getContext('2d');
        const img = sctx.getImageData(0, 0, size, size);
        const px = img.data;

        // 参考 paint-blob：按亮度决定密度；深色核心更密
        const step = 2.5;
        const jitter = step * 0.6;
        const shapePts = [];
        for (let y = 0; y < size; y += step) {
          for (let x = 0; x < size; x += step) {
            const i = (Math.floor(y) * size + Math.floor(x)) * 4;
            const r = px[i];
            const gn = px[i + 1];
            const b = px[i + 2];
            const a = px[i + 3];
            if (a < 26) continue;
            const brightness = (r * 0.299 + gn * 0.587 + b * 0.114) / 255;
            const density = 0.4 + (1 - brightness) * 0.9;
            if (Math.random() > density) continue;
            shapePts.push({
              dx: (x - size / 2 + (Math.random() - 0.5) * jitter) / scale,
              dy: (y - size / 2 + (Math.random() - 0.5) * jitter) / scale,
              // 深色 → 更大更实
              r: (0.9 + (1 - brightness) * 2.1 + Math.random() * 0.7) * 0.55,
              alpha: 0.5 + (1 - brightness) * 0.45,
              brightness,
              jx: Math.random() * 6.28,
              jy: Math.random() * 6.28,
            });
          }
        }

        const densityMul = reduce ? 0.6 : 1;
        const count = Math.round(Math.min(1500, Math.max(420, (w * h) / 420)) * densityMul);
        const shapeCount = Math.min(shapePts.length, Math.round(count * 0.72));
        particles = [];
        for (let i = 0; i < count; i += 1) {
          const sp = i < shapeCount ? shapePts[i] : null;
          particles.push({
            dhx: w * (0.08 + Math.random() * 0.84),
            dhy: h * (0.08 + Math.random() * 0.84),
            dx: sp ? sp.dx : 0,
            dy: sp ? sp.dy : 0,
            r: sp ? sp.r : 0.6 + Math.random() * 0.9,
            alpha: sp ? sp.alpha : 0.1 + Math.random() * 0.12,
            brightness: sp ? sp.brightness : 0.7,
            jx: sp ? sp.jx : Math.random() * 6.28,
            jy: sp ? sp.jy : Math.random() * 6.28,
            isShape: !!sp,
          });
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
        // 入场聚合只播放一次
        if (!gathered) {
          gatherElapsed += 1 / 60;
          if (gatherElapsed >= gatherT) gathered = true;
        }
        const k = gathered ? 1 : easeOutCubic(Math.min(1, gatherElapsed / gatherT));

        // 光标影响强度（平滑接近目标）
        hover += (hoverTarget - hover) * 0.12;

        // DS 官网风格：聚合完成后持续“呼吸 + 缓慢旋转 + 粒子游动”
        const t = now / 1000;
        const breath = gathered ? 1 + Math.sin(t * 0.55) * 0.03 : 1;
        const rot = gathered ? Math.sin(t * 0.14) * 0.055 : 0;
        const c = Math.cos(rot);
        const s = Math.sin(rot);

        const shader = (br) => {
          // 核心（亮度低）→ 压向黑；外缘（亮度高）→ 压向白（DS 青白感）
          const l = Math.max(14, Math.min(96, Math.round(br * 72 + 16)));
          const mixInto = l < 45 ? '#000000' : '#ffffff';
          return `color-mix(in srgb, ${accent} ${l}%, ${mixInto})`;
        };

        for (const p of particles) {
          let fx, fy;
          if (p.isShape) {
            // 形位（含呼吸/旋转），入场时从弥散位插值过来
            const peak = 0.6 + Math.sin(t * 0.7 + p.jx) * 0.25 + Math.random() * 0.1;
            const lx = p.dx * scale * breath;
            const ly = p.dy * scale * breath;
            const rx = lx * c - ly * s;
            const ry = lx * s + ly * c;
            const sx = cx + rx;
            const sy = cy + ry;
            fx = p.dhx + (sx - p.dhx) * k;
            fy = p.dhy + (sy - p.dhy) * k;
            // 粒子绕形位轻微游动（DS 的“流动”感）
            fx += Math.sin(t * 0.5 + p.jx) * 1.6 * peak;
            fy += Math.cos(t * 0.42 + p.jy) * 1.6 * peak;
          } else {
            fx = p.dhx;
            fy = p.dhy;
          }
          // 光标扰动：附近粒子以 (mx,my) 为中心径向外推
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
          ctx.fillStyle = p.isShape ? shader(p.brightness) : accent;
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

    rebuild();
    raf = requestAnimationFrame(frame);

    const onResize = () => rebuild();
    const onVis = () => { visible = document.visibilityState === 'visible'; };

    if (isHome) {
      // 光标位置映射到 canvas 本地坐标
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