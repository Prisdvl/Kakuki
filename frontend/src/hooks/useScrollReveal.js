import { useEffect } from "react";

/**
 * useScrollReveal — 滚动入场动画 Hook
 *
 * 用法：
 *   useScrollReveal();                        // 监听 .reveal
 *   useScrollReveal({ selector: '.fade-up' }); // 监听自定义选择器
 *   useScrollReveal({ threshold: 0.2 });      // 自定义触发阈值
 *
 * 行为：
 *   - 使用 IntersectionObserver 监听进入视口的元素
 *   - 给命中的元素加 .visible（CSS 负责过渡）
 *   - 配合 MutationObserver 抓异步加载的 DOM
 *   - 后台标签 / 无头 / 省电模式下用 getBoundingClientRect 兜底
 *   - 自动兼容 prefers-reduced-motion（CSS 层禁用即可）
 */
export function useScrollReveal(options = {}) {
  const {
    selector = ".reveal",
    activeClass = "visible",
    threshold = 0.06,
    rootMargin = "0px 0px -8% 0px",
    deps = [],
  } = options;

  useEffect(() => {
    let io;

    const setup = () => {
      if (io) io.disconnect();

      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add(activeClass);
              io.unobserve(entry.target);
            }
          }
        },
        { threshold, rootMargin }
      );

      const vh = window.innerHeight || document.documentElement.clientHeight;
      document.querySelectorAll(`${selector}:not(.${activeClass})`).forEach((el) => {
        io.observe(el);
        // 后台标签 / 节流模式下 IO 不回调时的兜底
        const rect = el.getBoundingClientRect();
        if (rect.top < vh && rect.bottom > 0) {
          el.classList.add(activeClass);
          io.unobserve(el);
        }
      });
    };

    setup();

    const mo = new MutationObserver((mutations) => {
      let hasNew = false;
      for (const m of mutations) {
        if (m.type !== "childList") continue;
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (
            node.matches?.(`${selector}:not(.${activeClass})`) ||
            node.querySelector?.(`${selector}:not(.${activeClass})`)
          ) {
            hasNew = true;
            break;
          }
        }
        if (hasNew) break;
      }
      if (hasNew) setup();
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io?.disconnect();
      mo.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}