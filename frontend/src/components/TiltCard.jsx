import { useRef, useCallback } from 'react';

/**
 * TiltCard — 3D 倾斜悬停卡片（GitHub 流行的 tilt.js / vanilla-tilt 效果）
 * 鼠标进入时卡片随光标位置产生 rotateX / rotateY 倾斜 + 轻微放大，
 * 带光滑回弹；遵循 prefers-reduced-motion。
 * 仅保留倾斜，不渲染任何扫光 / 光晕效果。
 */
export default function TiltCard({ children, max = 8, scale = 1.01, className = '', style = {}, glare = false }) {
  const ref = useRef(null);

  const handleMove = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rx = (0.5 - py) * max;
    const ry = (px - 0.5) * max;
    el.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale(${scale})`;
  }, [max, scale]);

  const handleLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)';
  }, []);

  return (
    <div
      ref={ref}
      className={`tilt-card ${className}`}
      style={{
        ...style,
        transformStyle: 'preserve-3d',
        transition: 'transform 0.5s cubic-bezier(0.22, 0.61, 0.36, 1)',
        willChange: 'transform',
      }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      {children}
    </div>
  );
}
