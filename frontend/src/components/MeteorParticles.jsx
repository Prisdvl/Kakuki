import { useEffect, useRef } from 'react';

/**
 * MeteorParticles —— 首页首屏局部背景：粒子组成「陨石块」图形
 *
 * 参考 DeepSeek 官网「图标粒子背景」的形态：大量小粒子汇聚成一个
 * 形状轮廓并缓慢漂浮/聚散。此处把图形换成「斜飞的陨石」：
 * 菱形头部 + 高光鼻点 + 向后渐隐的拖尾。
 *
 * 性能策略：
 *  - 粒子数按容器面积自适应（上限 1500），30fps rAF
 *  - prefers-reduced-motion：只绘制一帧静态图形，不跑动画
 *  - 颜色跟随当前主题 accent（读取 CSS 变量）
 */
export default function MeteorParticles({ className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let raf = 0;
    let particles = [];
    let w = 0;
    let h = 0;
    let t0 = performance.now();

    const readAccent = () => {
      try {
        const cs = getComputedStyle(document.documentElement);
        return cs.getPropertyValue('--accent').trim() || '#7c3aed';
      } catch { return '#7c3aed'; }
    };

    /** 在离屏画布绘制陨石形状（白底），返回采样源 */
    function buildShape(size) {
      const off = document.createElement('canvas');
      off.width = size;
      off.height = size;
      const o = off.getContext('2d');
      o.translate(size / 2, size / 2 + size * 0.06);
      o.rotate(-Math.PI / 5.2); // 斜飞 34°
      // 头部：菱形（沿旋转轴扁长）
      o.beginPath();
      o.moveTo(0, -size * 0.24);
      o.lineTo(size * 0.17, 0);
      o.lineTo(0, size * 0.24);
      o.lineTo(-size * 0.15, 0);
      o.closePath();
      o.fillStyle = '#fff';
      o.fill();
      // 鼻部高光点
      o.beginPath();
      o.arc(0, -size * 0.22, size * 0.055, 0, Math.PI * 2);
      o.fill();
      // 拖尾：向后渐隐三角形
      o.beginPath();
      o.moveTo(-size * 0.10, -size * 0.10);
      o.lineTo(-size * 0.10, size * 0.10);
      o.lineTo(-size * 0.62, 0);
      o.closePath();
      o.fillStyle = 'rgba(255,255,255,0.6)';
      o.fill();
      return off;
    }

    function rebuild() {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      if (w <= 0 || h <= 0) return;
      canvas.width = Math.round(w * DPR);
      canvas.height = Math.round(h * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      // 形状尺寸：约为容器上半部大图的 62%，斜向排布
      const shapeSize = Math.max(120, Math.min(Math.floor(Math.min(w, h) * 0.72), 300));
      const shape = buildShape(shapeSize);
      const sctx = shape.getContext('2d');
      const imgData = sctx.getImageData(0, 0, shapeSize, shapeSize);
      const px = imgData.data;

      // 采样面积与粒子数：按容器面积自适应
      const target = Math.min(1500, Math.round((w * h) / 900));
      const step = Math.max(1, Math.floor(Math.sqrt((shapeSize * shapeSize) / target)));
      const home = [];
      for (let y = 0; y < shapeSize; y += step) {
        for (let x = 0; x < shapeSize; x += step) {
          const a = px[(y * shapeSize + x) * 4 + 3];
          if (a < 32) continue;
          home.push({
            // 形状居中偏右上摆放（避让文章卡左部）
            x: w * 0.62 + (x - shapeSize / 2) * 1.05,
            y: h * 0.42 + (y - shapeSize / 2) * 1.05,
            jx: Math.random() * 6.28,
            jy: Math.random() * 6.28,
            r: 0.7 + Math.random() * 1.1,
            alpha: 0.25 + Math.min(0.75, a / 255) * 0.7,
          });
        }
      }
      particles = home;
    }

    function draw(now) {
      ctx.clearRect(0, 0, w, h);
      if (particles.length === 0) return;
      const accent = readAccent();
      const t = (now - t0) / 1000;
      const driftX = Math.sin(t * 0.08) * 6;
      const driftY = Math.cos(t * 0.06) * 5;
      ctx.fillStyle = accent;
      for (const p of particles) {
        const ox = Math.sin(t * 0.5 + p.jx) * 1.6;
        const oy = Math.cos(t * 0.42 + p.jy) * 1.6;
        const px = p.x + driftX + ox;
        const py = p.y + driftY + oy;
        ctx.globalAlpha = p.alpha * (0.82 + 0.18 * Math.sin(t * 0.9 + p.jx));
        ctx.beginPath();
        ctx.arc(px, py, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function frame(now) {
      draw(now);
      raf = requestAnimationFrame(frame);
    }

    rebuild();
    if (reduceMotion) {
      draw(performance.now());
    } else {
      raf = requestAnimationFrame(frame);
    }

    const onResize = () => { rebuild(); if (reduceMotion) draw(performance.now()); };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <div className={`meteor-particles ${className}`} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}