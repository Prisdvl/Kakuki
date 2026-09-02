import { useEffect, useRef, useState } from 'react';

/**
 * 数字滚动动画 hook
 * @param {number} target 目标数值
 * @param {number} duration 动画时长 ms
 * @param {boolean} start 是否开始
 *
 * 健壮性：RAF 在后台标签页 / 省电模式 / 无头环境下会被节流甚至不触发，
 * 因此额外用 setTimeout 兜底，保证最终一定能到达目标值。
 */
export default function useCountUp(target = 0, duration = 900, start = true) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!start) return undefined;
    const to = Number(target) || 0;
    if (to === 0) { setValue(0); return undefined; }

    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(to * eased));
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setValue(to);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    // 兜底：即使 RAF 被节流也保证到达最终值
    timerRef.current = setTimeout(() => {
      setValue(to);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }, duration + 60);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [target, duration, start]);

  return value;
}
