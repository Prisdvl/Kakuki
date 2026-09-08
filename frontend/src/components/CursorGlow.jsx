import { useEffect, useRef, useState } from 'react';

/**
 * CursorGlow —— 光标柔和光晕（GitHub 热门 spotlight 效果）
 * 主题色径向光晕以 lerp 缓动跟随光标，融入玻璃背景，pointer-events 穿透。
 * 触屏设备与 prefers-reduced-motion 自动禁用。
 */
export default function CursorGlow() {
  const glowRef = useRef(null);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mqHover = window.matchMedia('(hover: none)');
    if (mqReduce.matches || mqHover.matches) setEnabled(false);
  }, []);

  useEffect(() => {
    if (!enabled || !glowRef.current) return;
    const el = glowRef.current;
    let x = -400, y = -400, tx = -400, ty = -400, raf = null;

    const onMove = (e) => { tx = e.clientX; ty = e.clientY; };

    const loop = () => {
      x += (tx - x) * 0.12;
      y += (ty - y) * 0.12;
      el.style.transform = `translate(${x - 300}px, ${y - 300}px)`;
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [enabled]);

  if (!enabled) return null;
  return <div ref={glowRef} className="cursor-glow" aria-hidden="true" />;
}
