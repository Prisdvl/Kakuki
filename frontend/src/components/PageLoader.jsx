import { useEffect, useState } from "react";
import useThemeStore from "../store/themeStore";

/**
 * 页面级加载动画（用于 Suspense fallback 和页面数据加载）
 * - 透明背景，无缝嵌入页面
 * - 东京食尸鬼风格眨眼眼睛动画（React state 驱动）
 * - 眨眼时光晕脉冲 + 扫描线
 */
export default function PageLoader() {
  const { isDark, themeColor, colorPalette } = useThemeStore();
  const [blink, setBlink] = useState(false);
  const [phase, setPhase] = useState(0);

  // 眨眼动画：首次 1 秒后眨眼，之后每 2.5-4 秒眨一次
  useEffect(() => {
    let blinkTimer;
    const triggerBlink = () => {
      setBlink(true);
      blinkTimer = setTimeout(() => setBlink(false), 130);
    };
    const firstBlink = setTimeout(triggerBlink, 1000);
    const interval = setInterval(triggerBlink, 2500 + Math.random() * 1500);
    return () => { clearTimeout(firstBlink); clearInterval(interval); clearTimeout(blinkTimer); };
  }, []);

  // 扫描线动画
  useEffect(() => {
    const t = setInterval(() => setPhase((p) => (p + 1) % 100), 50);
    return () => clearInterval(t);
  }, []);

  const accent = themeColor || '#7c3aed';
  const accentLight = colorPalette?.LightVibrant || (isDark ? '#c4b5fd' : '#a78bfa');
  const accentSecondary = colorPalette?.LightMuted || (isDark ? '#f472b6' : '#ec4899');

  const eyePath = blink
    ? 'M 20 55 Q 55 55 90 55 Q 55 55 20 55 Z'
    : 'M 20 55 Q 55 20 90 55 Q 55 90 20 55 Z';

  // 扫描线 Y 位置：在眼睛区域内上下移动
  const scanY = 30 + (phase / 100) * 50;

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "50vh", gap: "1.2rem",
      animation: "fadeIn 0.4s ease",
      background: 'transparent',
      position: 'relative',
    }}>
      {/* 眼睛后面的光晕 — 眨眼时脉冲增强 */}
      <div style={{
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${accent}${blink ? '40' : '20'} 0%, transparent 70%)`,
        transition: 'background 0.1s',
        animation: 'page-loader-breathe 4s ease-in-out infinite',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', width: 100, height: 100 }}>
        <svg width="100" height="100" viewBox="0 0 110 110" style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <radialGradient id="pageIrisGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={accentLight} />
              <stop offset="35%" stopColor={accent} />
              <stop offset="100%" stopColor={accentSecondary} />
            </radialGradient>
            <radialGradient id="pagePupilGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fff" />
              <stop offset="50%" stopColor={accent} />
              <stop offset="100%" stopColor={accentSecondary} />
            </radialGradient>
            <clipPath id="pageEyeClip">
              <path d={eyePath} />
            </clipPath>
            <filter id="pageEyeGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation={blink ? '1' : '2.5'} result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="scanLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="50%" stopColor={accentLight} stopOpacity="0.8" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>

          {/* 眼睛轮廓 — 眨眼时变细 */}
          <path
            d={eyePath}
            fill={`${accent}08`}
            stroke={accent}
            strokeWidth={blink ? '1' : '2.5'}
            filter="url(#pageEyeGlow)"
            style={{ transition: 'stroke-width 0.08s' }}
          />

          {/* 虹膜区域（裁剪在眼睛形状内） */}
          <g clipPath="url(#pageEyeClip)">
            {/* 虹膜 */}
            <g style={{
              transformBox: 'fill-box',
              transformOrigin: 'center',
              animation: 'page-iris-pulse 2.5s ease-in-out infinite',
              opacity: blink ? 0 : 1,
              transition: 'opacity 0.06s',
            }}>
              <circle cx="55" cy="55" r="22" fill="url(#pageIrisGrad)" />
              {/* 虹膜纹理线 */}
              <circle cx="55" cy="55" r="18" fill="none" stroke={accentLight} strokeWidth="0.5" opacity="0.4" />
              <circle cx="55" cy="55" r="14" fill="none" stroke={accentLight} strokeWidth="0.5" opacity="0.3" />
              {/* 瞳孔 */}
              <circle cx="55" cy="55" r="9" fill="url(#pagePupilGrad)" />
              {/* 高光 */}
              <circle cx="49" cy="49" r="3.5" fill="rgba(255,255,255,0.9)" />
              <circle cx="61" cy="61" r="1.8" fill="rgba(255,255,255,0.5)" />
            </g>

            {/* 扫描线 — 眼睛睁开时显示 */}
            {!blink && (
              <rect
                x="15" y={scanY}
                width="80" height="1.5"
                fill="url(#scanLineGrad)"
                opacity="0.6"
              />
            )}
          </g>
        </svg>
      </div>

      {/* 加载文字 + 进度指示 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
      }}>
        <span style={{
          color: "var(--text-secondary)", fontSize: "0.85rem", fontWeight: 500,
          letterSpacing: "0.08em",
        }}>
          加载中
        </span>
        {/* 三点动画 */}
        <span style={{ display: 'inline-flex', gap: 3 }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                width: 4, height: 4, borderRadius: '50%',
                background: accent,
                animation: `page-dot-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </span>
      </div>

      {/* 底部进度条 */}
      <div style={{
        width: 100, height: 2, borderRadius: 2,
        background: "linear-gradient(90deg, transparent, var(--accent-soft), var(--accent), var(--accent-soft), transparent)",
        backgroundSize: "200% 100%",
        animation: "page-shimmer 1.5s ease-in-out infinite",
      }} />

      <style>{`
        @keyframes page-loader-breathe {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.15); opacity: 0.6; }
        }
        @keyframes page-iris-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes page-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes page-dot-pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
