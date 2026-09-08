import { useEffect, useRef } from 'react';

/**
 * ParticleField — 跟随主题色的轻量粒子连线背景（GitHub 流行的 particle-connect 效果）
 * 纯 canvas 实现，零依赖，性能友好：粒子数自适应视口，鼠标靠近时产生连接线。
 */
export default function ParticleField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 尊重减弱动态效果
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    let raf = 0;
    let particles = [];
    let mouse = { x: -9999, y: -9999 };
    let W = 0;
    let H = 0;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const count = Math.min(60, Math.max(24, Math.floor((W * H) / 24000)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: 1 + Math.random() * 1.6,
      }));
    };

    const getAccent = () => {
      const root = document.documentElement;
      const accent = getComputedStyle(root).getPropertyValue('--accent').trim() || '#7c3aed';
      return accent;
    };

    const parseRGB = (color) => {
      // 支持 #rgb / #rrggbb
      if (color.startsWith('#')) {
        const hex = color.length === 4
          ? color.slice(1).split('').map((c) => c + c).join('')
          : color.slice(1);
        return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
      }
      const m = color.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
      if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
      return [124, 58, 237];
    };

    let accentRGB = parseRGB(getAccent());

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const LINK_DIST = 130;

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -20) p.x = W + 20; else if (p.x > W + 20) p.x = -20;
        if (p.y < -20) p.y = H + 20; else if (p.y > H + 20) p.y = -20;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${accentRGB[0]}, ${accentRGB[1]}, ${accentRGB[2]}, 0.5)`;
        ctx.fill();
      });

      // 粒子间连线
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < LINK_DIST) {
            const alpha = (1 - dist / LINK_DIST) * 0.18;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(${accentRGB[0]}, ${accentRGB[1]}, ${accentRGB[2]}, ${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
        // 鼠标连接线
        const pi = particles[i];
        const dxm = pi.x - mouse.x;
        const dym = pi.y - mouse.y;
        const distm = Math.hypot(dxm, dym);
        if (distm < 160) {
          const alpha = (1 - distm / 160) * 0.3;
          ctx.beginPath();
          ctx.moveTo(pi.x, pi.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(${accentRGB[0]}, ${accentRGB[1]}, ${accentRGB[2]}, ${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      raf = requestAnimationFrame(draw);
    };

    const onMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const onMouseLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };

    // 主题色变化时同步
    const accentObserver = new MutationObserver(() => {
      accentRGB = parseRGB(getAccent());
    });
    accentObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });

    resize();
    draw();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
      accentObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="particle-field"
      style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        opacity: 0.55,
      }}
    />
  );
}
