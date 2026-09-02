import { useEffect, useRef, useState } from 'react';

/**
 * 数字滚动动画 hook
 * @param {number} target 目标数值
 * @param {number} duration 动画时长 ms
 * @param {boolean} start 是否开始
 */
export default function useCountUp(target = 0, duration = 900, start = true) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!start) return undefined;
    const from = 0;
    const to = Number(target) || 0;
    if (to === from) { setValue(to); return undefined; }
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, start]);

  return value;
}
