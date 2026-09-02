import { useEffect, useState } from 'react';
import useThemeStore from '../../store/themeStore';

/**
 * 主题化加载动画组件
 * - 透明背景，不遮挡页面内容
 * - 东京食尸鬼风格眨眼眼睛动画（React state 驱动，跨浏览器兼容）
 * - 眨眼时光晕脉冲 + 扫描线 + 虹膜纹理
 * - 加载完成平滑淡出
 */
export default function Loader({
  fullscreen = false,
  progress = 0,
  statusText = '',
  showProgress = false,
  fadingOut = false,
}) {
  const { isDark, themeColor, colorPalette } = useThemeStore();
  const [mounted, setMounted] = useState(false);
  const [blink, setBlink] = useState(false);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(t);
  }, []);

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
    const t = setInterval(() => setPhase((p) => (p + 1) % 100), 40);
    return () => clearInterval(t);
  }, []);

  const accent = themeColor || '#7c3aed';
  const accentLight = colorPalette?.LightVibrant || (isDark ? '#c4b5fd' : '#a78bfa');
  const accentSecondary = colorPalette?.LightMuted || (isDark ? '#f472b6' : '#ec4899');

  const textColor = isDark
    ? (colorPalette?.LightVibrant || '#c4b5fd')
    : (colorPalette?.DarkVibrant || '#4c1d95');

  const containerStyle = fullscreen
    ? {
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        overflow: 'hidden',
        background: isDark
          ? 'rgba(15, 10, 30, 0.55)'
          : 'rgba(245, 240, 255, 0.55)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        transition: 'opacity 0.8s ease-out, backdrop-filter 0.8s ease-out',
        opacity: mounted ? (fadingOut ? 0 : 1) : 0,
        pointerEvents: fadingOut ? 'none' : 'auto',
      }
    : {
        width: '100%',
        minHeight: '50vh',
        background: 'transparent',
      };

  const displayProgress = Math.min(100, Math.max(0, progress));

  // 眼睛路径：睁开 vs 完全闭眼
  const eyePath = blink
    ? 'M 20 55 Q 55 55 90 55 Q 55 55 20 55 Z'
    : 'M 20 55 Q 55 20 90 55 Q 55 90 20 55 Z';

  // 扫描线 Y 位置
  const scanY = 28 + (phase / 100) * 54;

  return (
    <div style={containerStyle}>
      {/* 内容层 */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          height: fullscreen ? '100%' : 'auto',
          minHeight: fullscreen ? '100vh' : '50vh',
          opacity: mounted ? 1 : 0,
          transition: 'opacity 0.6s ease 0.1s',
        }}
      >
        {/* 眼睛后面的光晕 — 眨眼时脉冲增强 */}
        <div style={{
          position: 'absolute',
          width: 220,
          height: 220,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accent}${blink ? '45' : '25'} 0%, transparent 70%)`,
          transition: 'background 0.1s',
          animation: 'loader-breathe 4s ease-in-out infinite',
          pointerEvents: 'none',
        }} />

        {/* 主加载动画 — 东京食尸鬼之眼 */}
        <div style={{ position: 'relative', width: 120, height: 120 }}>
          {/* 外圈旋转光环 */}
          <svg width="120" height="120" style={{ position: 'absolute', inset: 0 }}>
            <defs>
              <linearGradient id="loaderGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={accent} />
                <stop offset="100%" stopColor={accentSecondary} />
              </linearGradient>
            </defs>
            <circle cx="60" cy="60" r="52" fill="none" stroke={`${accent}15`} strokeWidth="2" />
            <circle
              cx="60" cy="60" r="52"
              fill="none"
              stroke="url(#loaderGrad1)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="326.7"
              strokeDashoffset="76"
              transform="rotate(-90 60 60)"
              style={{ animation: 'loader-svg-spin 1.8s cubic-bezier(0.65, 0, 0.35, 1) infinite' }}
            />
          </svg>

          {/* 眨眼眼睛 SVG */}
          <svg
            width="120"
            height="120"
            viewBox="0 0 120 120"
            style={{ position: 'absolute', inset: 0 }}
          >
            <defs>
              <radialGradient id="irisGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={accentLight} />
                <stop offset="35%" stopColor={accent} />
                <stop offset="100%" stopColor={accentSecondary} />
              </radialGradient>
              <radialGradient id="pupilGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fff" />
                <stop offset="50%" stopColor={accent} />
                <stop offset="100%" stopColor={accentSecondary} />
              </radialGradient>
              <clipPath id="eyeClip">
                <path d={eyePath} />
              </clipPath>
              <filter id="eyeGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation={blink ? '1' : '3'} result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id="scanLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="50%" stopColor={accentLight} stopOpacity="0.9" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>

            {/* 眼睛轮廓 — 眨眼时变细 */}
            <path
              d={eyePath}
              fill={`${accent}08`}
              stroke={accent}
              strokeWidth={blink ? '1' : '2.5'}
              filter="url(#eyeGlow)"
              style={{ transition: 'stroke-width 0.08s' }}
            />

            {/* 虹膜区域（裁剪在眼睛形状内） */}
            <g clipPath="url(#eyeClip)">
              {/* 虹膜 */}
              <g style={{
                transformBox: 'fill-box',
                transformOrigin: 'center',
                animation: 'loader-iris-pulse 2.5s ease-in-out infinite',
                opacity: blink ? 0 : 1,
                transition: 'opacity 0.06s',
              }}>
                <circle cx="60" cy="60" r="24" fill="url(#irisGrad)" />
                {/* 虹膜纹理线 */}
                <circle cx="60" cy="60" r="20" fill="none" stroke={accentLight} strokeWidth="0.5" opacity="0.4" />
                <circle cx="60" cy="60" r="16" fill="none" stroke={accentLight} strokeWidth="0.5" opacity="0.3" />
                {/* 瞳孔 */}
                <circle cx="60" cy="60" r="10" fill="url(#pupilGrad)" />
                {/* 高光 */}
                <circle cx="53" cy="53" r="4" fill="rgba(255,255,255,0.9)" />
                <circle cx="66" cy="66" r="2" fill="rgba(255,255,255,0.5)" />
              </g>

              {/* 扫描线 — 眼睛睁开时显示 */}
              {!blink && (
                <rect
                  x="15" y={scanY}
                  width="90" height="1.5"
                  fill="url(#scanLineGrad)"
                  opacity="0.7"
                />
              )}
            </g>
          </svg>

          {/* 轨道粒子 */}
          <div style={{
            position: 'absolute',
            inset: 0,
            animation: 'loader-spin 3s linear infinite',
          }}>
            <div style={{
              position: 'absolute',
              top: -5,
              left: '50%',
              width: 8,
              height: 8,
              marginLeft: -4,
              borderRadius: '50%',
              background: accentLight,
              boxShadow: `0 0 10px ${accentLight}`,
            }} />
          </div>
          <div style={{
            position: 'absolute',
            inset: 0,
            animation: 'loader-spin-rev 2.5s linear infinite',
          }}>
            <div style={{
              position: 'absolute',
              bottom: -4,
              left: '50%',
              width: 6,
              height: 6,
              marginLeft: -3,
              borderRadius: '50%',
              background: accentSecondary,
              boxShadow: `0 0 8px ${accentSecondary}`,
            }} />
          </div>
        </div>

        {/* 品牌文字 */}
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <div style={{
            fontSize: 17,
            fontWeight: 700,
            letterSpacing: '0.12em',
            background: `linear-gradient(90deg, ${textColor}, ${accent}, ${accentSecondary}, ${textColor})`,
            backgroundSize: '300% 100%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'loader-shimmer 2.5s linear infinite',
          }}>
            {showProgress ? `${Math.round(displayProgress)}%` : 'Kakuki'}
          </div>

          {!showProgress && statusText && (
            <div style={{
              marginTop: 6,
              fontSize: 11,
              color: textColor,
              opacity: 0.75,
              letterSpacing: '0.05em',
            }}>
              {statusText}
            </div>
          )}
        </div>

        {/* 进度条 */}
        {showProgress && (
          <div style={{ marginTop: 18, width: 200 }}>
            <div style={{
              height: 2.5,
              borderRadius: 2,
              background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
              overflow: 'hidden',
              position: 'relative',
            }}>
              <div style={{
                height: '100%',
                width: `${displayProgress}%`,
                background: `linear-gradient(90deg, ${accent}, ${accentSecondary})`,
                borderRadius: 2,
                transition: 'width 0.3s ease-out',
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: `linear-gradient(90deg, transparent, ${accentLight}60, transparent)`,
                  animation: 'loader-progress-shimmer 1.5s ease-in-out infinite',
                }} />
              </div>
            </div>
            <div style={{
              marginTop: 6,
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 9,
              color: textColor,
              opacity: 0.5,
              letterSpacing: '0.1em',
            }}>
              <span>LOADING</span>
              <span>{Math.round(displayProgress)}%</span>
            </div>
          </div>
        )}

        {/* 三点动画 + 波浪条 */}
        {!showProgress && (
          <div style={{
            marginTop: 18,
            display: 'flex',
            gap: 4,
            alignItems: 'center',
          }}>
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                style={{
                  width: 2.5,
                  height: 16,
                  borderRadius: 2,
                  background: `linear-gradient(to top, ${accent}, ${accentLight})`,
                  opacity: 0.3 + (i % 3) * 0.15,
                  animation: `loader-wave 1.4s ease-in-out ${i * 0.12}s infinite`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes loader-spin { to { transform: rotate(360deg); } }
        @keyframes loader-spin-rev { to { transform: rotate(-360deg); } }
        @keyframes loader-svg-spin {
          0% { stroke-dashoffset: 76; transform: rotate(-90deg); }
          50% { stroke-dashoffset: 280; }
          100% { stroke-dashoffset: 76; transform: rotate(630deg); }
        }
        @keyframes loader-breathe {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.2); opacity: 0.7; }
        }
        @keyframes loader-shimmer {
          0% { background-position: 300% 0; }
          100% { background-position: -300% 0; }
        }
        @keyframes loader-wave {
          0%, 100% { height: 6px; opacity: 0.3; }
          50% { height: 20px; opacity: 0.9; }
        }
        @keyframes loader-progress-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes loader-iris-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
