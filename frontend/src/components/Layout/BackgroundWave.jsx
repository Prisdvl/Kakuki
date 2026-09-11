import { useEffect, useRef } from 'react';

/**
 * Vanta 风格动态波浪背景层
 * - 两条正弦光波缓慢流动，随鼠标位置轻微起伏（参考 Vanta.js Wave 的流体感）
 * - 低分辨率渲染（0.5 倍）+ 低透明度，不干扰文字阅读
 * - 尊重 prefers-reduced-motion；组件卸载自动清理
 */
export default function BackgroundWave() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let W = 0;
    let H = 0;
    const mouse = { x: 0.5, y: 0.35 };

    const resize = () => {
      W = canvas.width = Math.floor(window.innerWidth * 0.5);
      H = canvas.height = Math.floor(window.innerHeight * 0.5);
    };
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', (e) => {
      mouse.x = e.clientX / window.innerWidth;
      mouse.y = e.clientY / window.innerHeight;
    });

    let t = 0;
    const draw = () => {
      t += 0.0045;
      ctx.clearRect(0, 0, W, H);
      const accent =
        getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#7c3aed';

      for (let w = 0; w < 2; w++) {
        const amp = 7 + w * 5 + mouse.y * 10;
        const freq = 0.011 + w * 0.006;
        const yBase = H * (0.32 + w * 0.34) + mouse.x * 14;

        ctx.beginPath();
        for (let x = 0; x <= W; x += 4) {
          const y =
            yBase +
            Math.sin(x * freq + t * 55 + w * 2.6) * amp +
            Math.sin(x * freq * 0.42 - t * 42) * amp * 0.5;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = accent;
        ctx.globalAlpha = 0.09 + w * 0.05;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // 第二层：缓慢漂浮的柔光斑点（类似 Vanta Fog 的轻雾感）
      for (let i = 0; i < 2; i++) {
        const cx = W * ((0.22 + i * 0.56 + Math.sin(t * 0.35 + i * 2.1) * 0.12 + mouse.x * 0.04) % 1);
        const cy = H * ((0.3 + i * 0.3 + Math.cos(t * 0.28 + i * 1.3) * 0.1) % 1);
        const rad = Math.max(W, H) * (0.16 + i * 0.06);
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        grad.addColorStop(0, accent);
        grad.addColorStop(1, 'transparent');
        ctx.globalAlpha = 0.05;
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.globalAlpha = 1;

      if (!reduce) raf = requestAnimationFrame(draw);
    };

    if (!reduce) raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="bg-scene-wave" aria-hidden="true" />;
}
