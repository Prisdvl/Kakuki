import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * 应用加载状态管理 Hook
 * 基于真实任务进度驱动加载动画
 */
export function useAppLoader(initialLoading = false) {
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(initialLoading);
  const [statusText, setStatusText] = useState('');
  const progressRef = useRef(0);
  const rafRef = useRef(null);
  const targetProgressRef = useRef(0);

  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  const animateProgress = useCallback(() => {
    const animate = () => {
      const diff = targetProgressRef.current - progressRef.current;
      if (Math.abs(diff) < 0.5) {
        progressRef.current = targetProgressRef.current;
        setProgress(targetProgressRef.current);
        if (loadingRef.current && targetProgressRef.current >= 100) {
          loadingRef.current = false;
          setLoading(false);
        }
        return;
      }

      const step = diff * 0.15;
      progressRef.current += step;
      setProgress(Math.round(progressRef.current * 10) / 10);
      rafRef.current = requestAnimationFrame(animate);
    };
    animate();
  }, []);

  const loadingRef = useRef(false);

  const startLoading = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    progressRef.current = 0;
    targetProgressRef.current = 0;
    setProgress(0);
    setLoading(true);
    loadingRef.current = true;
    setStatusText('正在初始化...');
    rafRef.current = requestAnimationFrame(animateProgress);
  }, [animateProgress]);

  const setStatus = useCallback((text) => {
    setStatusText(text);
  }, []);

  const completeTask = useCallback((step, total, status) => {
    const increment = 100 / total;
    targetProgressRef.current = Math.min(
      Math.round(step * increment * 10) / 10,
      100
    );
    if (status) {
      setStatusText(status);
    }
  }, []);

  const finishLoading = useCallback((status) => {
    targetProgressRef.current = 100;
    if (status) {
      setStatusText(status);
    }
    rafRef.current = requestAnimationFrame(() => {
      animateProgress();
    });
  }, [animateProgress]);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return {
    progress,
    loading,
    statusText,
    startLoading,
    setStatus,
    completeTask,
    finishLoading,
  };
}

/**
 * 预加载页面模块
 */
export function preloadPages(onProgress) {
  const pages = [
    { name: '首页', import: () => import('../pages/home/HomePage') },
    { name: '标签', import: () => import('../pages/tag/TagPage') },
    { name: '分类', import: () => import('../pages/category/CategoryPage') },
    { name: '归档', import: () => import('../pages/archive/ArchivePage') },
    { name: '文章详情', import: () => import('../pages/article/ArticleDetailPage') },
    { name: '项目', import: () => import('../pages/projects/ProjectsPage') },
    { name: '音乐', import: () => import('../pages/music/MusicPage') },
    { name: '关于', import: () => import('../pages/about/AboutPage') },
  ];

  let completed = 0;
  const results = [];

  const loadNext = () => {
    if (completed >= pages.length) {
      return Promise.resolve(results);
    }

    const page = pages[completed];
    completed++;

    if (onProgress) {
      onProgress(completed, pages.length, `加载${page.name}...`);
    }

    return page
      .import()
      .then((mod) => {
        results.push(mod);
        return loadNext();
      })
      .catch(() => {
        results.push(null);
        return loadNext();
      });
  };

  return loadNext();
}
