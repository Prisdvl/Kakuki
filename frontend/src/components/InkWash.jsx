import { useMemo } from 'react';

// 墨染背景：多个墨滴在宣纸上持续晕开、淡去的写意动画（非交互装饰层）
// 颜色跟随 --ink-color（浅色=墨黑，深色=淡墨），随主题切换平滑过渡

const BLOT_COUNT = 12;

const rand = (min, max) => min + Math.random() * (max - min);

const makeBlots = () =>
  Array.from({ length: BLOT_COUNT }, (_, i) => ({
    id: i,
    left: rand(1, 94),
    top: rand(2, 88),
    size: rand(140, 360),
    dur: rand(9, 16),
    delay: rand(0, 15),
    max: rand(0.09, 0.2),
    radius: `${rand(38, 46)}% ${rand(54, 62)}% ${rand(50, 60)}% ${rand(40, 50)}% / ${rand(43, 56)}% ${rand(44, 57)}% ${rand(43, 56)}% ${rand(44, 57)}%`,
  }));

export default function InkWash() {
  const blots = useMemo(makeBlots, []);
  return (
    <div className="ink-wash" aria-hidden="true">
      {blots.map((b) => (
        <span
          key={b.id}
          className="ink-blot"
          style={{
            left: `${b.left}%`,
            top: `${b.top}%`,
            width: `${b.size}px`,
            height: `${b.size}px`,
            borderRadius: b.radius,
            '--ink-dur': `${b.dur}s`,
            '--ink-delay': `${b.delay}s`,
            '--ink-max': b.max,
          }}
        />
      ))}
    </div>
  );
}
