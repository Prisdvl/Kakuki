import { useMemo } from 'react';

// 烟雾背景：大范围柔和烟团在背景中缓慢弥漫、飘散（非交互装饰层）
// 颜色跟随 --ink-color（浅色=墨黑，深色=淡墨），随主题切换平滑过渡

const SMOKE_COUNT = 10;

const rand = (min, max) => min + Math.random() * (max - min);

const makeSmoke = () =>
  Array.from({ length: SMOKE_COUNT }, (_, i) => ({
    id: i,
    left: rand(0, 90),
    top: rand(2, 86),
    size: rand(300, 620),
    dur: rand(16, 30),
    delay: rand(0, 22),
    max: rand(0.05, 0.13),
    x: rand(30, 90),
    y: rand(-80, -20),
    x2: rand(90, 190),
    y2: rand(-150, -60),
  }));

export default function InkWash() {
  const smoke = useMemo(makeSmoke, []);
  return (
    <div className="ink-wash" aria-hidden="true">
      {smoke.map((b) => (
        <span
          key={b.id}
          className="ink-blot"
          style={{
            left: `${b.left}%`,
            top: `${b.top}%`,
            width: `${b.size}px`,
            height: `${b.size}px`,
            '--ink-dur': `${b.dur}s`,
            '--ink-delay': `${b.delay}s`,
            '--ink-max': b.max,
            '--smoke-x': `${b.x}px`,
            '--smoke-y': `${b.y}px`,
            '--smoke-x2': `${b.x2}px`,
            '--smoke-y2': `${b.y2}px`,
          }}
        />
      ))}
    </div>
  );
}
