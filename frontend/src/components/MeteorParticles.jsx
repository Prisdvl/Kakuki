import { useEffect, useRef } from 'react';

/**
 * MeteorField —— 全屏粒子背景 + 首屏大陨石（聚散循环）
 *
 * 参考 DeepSeek 官网首页的 logo 粒子效果：大量小粒子从弥散漂浮态
 * 缓缓汇聚成一枚「陨石」大图形（斜飞菱形头 + 高光鼻点 + 渐隐拖尾），
 * 停留片刻后缓缓散开，循环呼吸。鼠标移动时图形轻微跟随呼应。
 *
 * 性能策略：
 *  - 粒子数按视口自适应（上限 1600），单 rAF（30fps 上限）
 *  - prefers-reduced-motion：只绘制一帧静态图形，不动画
 *  - 页面隐藏时暂停（visibilitychange）
 *  - 颜色跟随主题 accent；低功耗设备密度减半
 */
export default function MeteorParticles() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let raf = 0;
    let particles = [];
    let w = 0;
    let h = 0;
    let shapeCx = 0;
    let shapeCy = 0;
    let shapeScale = 1;
    let mouseX = 0.5;
    let mouseY = 0.5;
    let visible = true;

    // 聚散周期（s）：汇聚 → 停留 → 散开
    const GATHER = 3.2;
    const HOLD = 2.4;
    const CYCLE = GATHER + HOLD + 3.4;
    const CYCLE_MS = CYCLE * 1000;

    const readAccent = () => {
      try {
        const cs = getComputedStyle(document.documentElement);
        return cs.getPropertyValue('--accent').trim() || '#7c3aed';
      } catch { return '#7c3aed'; }
    };

    /** 登陆屏画布绘制陨石形状（白底），供采样 */
    function buildShape(size) {
      const off = document.createElement('canvas');
      off.width = size;
      off.height = size;
      const o = off.getContext('2d');
      o.translate(size / 2, size / 2 + size * 0.04);
      o.rotate(-Math.PI / 5.4);
      // 菱形头部（沿旋转轴扁长）
      o.beginPath();
      o.moveTo(0, -size * 0.26);
      o.lineTo(size * 0.18, 0);
      o.lineTo(0, size * 0.26);
      o.lineTo(-size * 0.16, 0);
      o.closePath();
      o.fillStyle = '#fff';
      o.fill();
      // 鼻部高光
      o.beginPath();
      o.arc(0, -size * 0.24, size * 0.06, 0, Math.PI * 2);
      o.fill();
      // 拖尾：向后（左上）渐隐三角
      o.beginPath();
      o.moveTo(-size * 0.11, -size * 0.11);
      o.lineTo(-size * 0.11, size * 0.11);
      o.lineTo(-size * 0.66, 0);
      o.closePath();
      o.fillStyle = 'rgba(255,255,255,0.55)';
      o.fill();
      // 用渐变强化拖尾渐隐
      const g = o.createLinearGradient(-size * 0.66, 0, -size * 0.05, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(1, 'rgba(255,255,255,0.85)');
      o.fillStyle = g;
      o.fill();
      return off;
    }

    function rebuild() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * DPR);
      canvas.height = Math.round(h * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      shapeScale = Math.max(340, Math.min(Math.min(w, h) * 0.44, 560));
      shapeCx = w * 0.5;
      shapeCy = h * 0.26;

      // 陨石形点采样
      const size = Math.round(shapeScale);
      const shape = buildShape(size);
      const sctx = shape.getContext('2d');
      const img = sctx.getImageData(0, 0, size, size);
      const px = img.data;
      const shapePts = [];
      const step = Math.max(2, Math.round(size / 46));
      for (let y = 0; y < size; y += step) {
        for (let x = 0; x < size; x += step) {
          const a = px[(y * size + x) * 4 + 3];
          if (a < 40) continue;
          shapePts.push({
            dx: (x - size / 2) / shapeScale,
            dy: (y - size / 2) / shapeScale,
            jx: Math.random() * 6.28,
            jy: Math.random() * 6.28,
            r: 0.8 + Math.random() * 1.2,
          });
        }
      }

      // 弥散粒子数：视口面积自适应
      const density = reduce ? 0.5
        : (navigator.hardwareConcurrency || 8) <= 4 ? 0.6 : 1;
      const count = Math.round(Math.min(1600, Math.max(320, (w * h) / 2200)) * density);

      // 每个粒子 = 弥散位置 + 形点（取前 N 个形点给"图形粒子"，其余只弥散）
      const shapeCount = Math.min(shapePts.length, Math.round(count * 0.6));
      particles = [];
      for (let i = 0; i < count; i += 1) {
        const sp = i < shapeCount ? shapePts[i] : null;
        particles.push({
          // 弥散位：散布全屏（上方略多，靠近图形区更密）
          dhx: w * (0.12 + Math.random() * 0.76),
          dhy: h * (0.1 + Math.random() * 0.8),
          sp,
          shx: sp ? sp.dx : 0,
          shy: sp ? sp.dy : 0,
          jx: sp ? sp.jx : Math.random() * 6.28,
          jy: sp ? sp.jy : Math.random() * 6.28,
          r: sp ? sp.r : 0.6 + Math.random(),
          alpha: 0.22 + Math.random() * 0.5,
          tw: Math.random() * 6.28, // 独立相位
        });
      }
    }

    function easeInOut(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function phaseAt(now) {
      const t = (now % CYCLE_MS) / 1000;
      if (t < GATHER) return easeInOut(t / GATHER);          // 汇聚
      if (t < GATHER + HOLD) return 1;                       // 停留
      return 1 - easeInOut((t - GATHER - HOLD) / (CYCLE - GATHER - HOLD)); // 散开
    }

    function draw(now) {
      ctx.clearRect(0, 0, w, h);
      if (particles.length === 0) return;
      const accent = readAccent();
      const k = phaseAt(now);
      // 鼠标呼应：图形整体轻微偏移 + 倾斜
      const ox = (mouseX - 0.5) * 26 * k;
      const oy = (mouseY - 0.5) * 18 * k;
      ctx.fillStyle = accent;
      for (const p of particles) {
        let fx, fy;
        if (p.sp) {
          // 弥散 → 形状 插值
          const cx = shapeCx + p.shx * shapeScale + ox;
          const cy = shapeCy + p.shy * shapeScale + oy;
          fx = p.dhx + (cx - p.dhx) * k;
          fy = p.dhy + (cy - p.dhy) * k;
        } else {
          fx = p.dhx + (p.shx * shapeScale + ox) * k * 0.25;
          fy = p.dhy + (p.shy * shapeScale + oy) * k * 0.25;
        }
        // 独立漂浮
        const t = now / 1000;
        const jx = Math.sin(t * 0.5 + p.jx) * 1.4;
        const jy = Math.cos(t * 0.42 + p.jy) * 1.4;
        ctx.globalAlpha = p.alpha * (0.4 + 0.6 * k);
        ctx.beginPath();
        ctx.arc(fx + jx, fy + jy, p.r * (0.8 + 0.25 * k), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function frame(now) {
      if (visible) draw(now);
      raf = requestAnimationFrame(frame);
    }

    rebuild();
    if (reduce) {
      draw(0);
    } else {
      raf = requestAnimationFrame(frame);
    }

    const onResize = () => { rebuild(); if (reduce) draw(0); };
    const onMouse = (e) => {
      mouseX = e.clientX / window.innerWidth;
      mouseY = e.clientY / window.innerHeight;
    };
    const onVis = () => { visible = document.visibilityState === 'visible'; };
    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMouse, { passive: true });
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouse);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return (
    <div className="meteor-field" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}