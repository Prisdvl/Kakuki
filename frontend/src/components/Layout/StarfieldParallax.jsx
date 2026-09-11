import { useEffect, useRef } from 'react';

/**
 * 星光视差背景（参考 parallax-scene 的多层视差形式，主题化设计融入博客体系）
 * - 两层星点阵（远层慢 / 近层快），缓慢漂移动画 + 零星闪烁
 * - 鼠标移动驱动视差：远星 factor 12、近星 factor 30
 * - 星点颜色跟随主题（--star-color / --star-color-dim），浅色主题自动降透明度
 * - 尊重 prefers-reduced-motion
 */
export default function StarfieldParallax() {
  const farRef = useRef(null);
  const nearRef = useRef(null);
  const targetRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef(null);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const apply = () => {
      rafRef.current = null;
      const { x, y } = targetRef.current;
      if (farRef.current) {
        farRef.current.style.transform = `translate(${x * 12}px, ${y * 12}px)`;
      }
      if (nearRef.current) {
        nearRef.current.style.transform = `translate(${x * 30}px, ${y * 30}px)`;
      }
    };

    const onMove = (e) => {
      targetRef.current = {
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      };
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(apply);
      }
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="starfield" aria-hidden>
      {/* 远层星点（慢漂移 + 小视差） */}
      <div className="starfield-stars starfield-far" ref={farRef} />
      {/* 近层星点（快漂移 + 大视差）+ 闪星 */}
      <div className="starfield-stars starfield-near" ref={nearRef}>
        <i className="sf-twinkle tw-1" />
        <i className="sf-twinkle tw-2" />
        <i className="sf-twinkle tw-3" />
        <i className="sf-twinkle tw-4" />
        <i className="sf-twinkle tw-5" />
      </div>
    </div>
  );
}
