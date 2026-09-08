import { useEffect, useState } from 'react';
import useThemeStore from '../../store/themeStore';

/**
 * 主题化加载动画组件
 * - 透明背景，不遮挡页面内容
 * - 水墨晕环加载动画：渐变外环旋转 + 中心墨滴呼吸 + 涟漪扩散（参照 GitHub 流行加载风格）
 * - 品牌文字 shimmer 流动 + 进度条
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

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(t);
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
        {/* 主加载动画 — 水墨晕环：外环旋转 + 中心墨滴呼吸 + 涟漪扩散 */}
        <div style={{ position: 'relative', width: 132, height: 132 }}>
          {/* 外圈旋转渐变环 */}
          <svg width="132" height="132" style={{ position: 'absolute', inset: 0 }}>
            <defs>
              <linearGradient id="loaderGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={accent} />
                <stop offset="100%" stopColor={accentSecondary} />
              </linearGradient>
            </defs>
            <circle cx="66" cy="66" r="58" fill="none" stroke={`${accent}14`} strokeWidth="2" />
            <circle
              cx="66" cy="66" r="58"
              fill="none"
              stroke="url(#loaderGrad1)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="364"
              strokeDashoffset="86"
              transform="rotate(-90 66 66)"
              style={{ animation: 'loader-svg-spin 1.6s cubic-bezier(0.65, 0, 0.35, 1) infinite' }}
            />
            {/* 反向细环 */}
            <circle
              cx="66" cy="66" r="48"
              fill="none"
              stroke={accentLight}
              strokeWidth="1"
              strokeDasharray="60 241"
              opacity="0.55"
              transform="rotate(90 66 66)"
              style={{ animation: 'loader-ring-rev 2.4s linear infinite' }}
            />
          </svg>

          {/* 涟漪扩散环（两层交错） */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              border: `1.5px solid ${accent}55`,
              animation: 'loader-ripple 2.4s cubic-bezier(0.2, 0.6, 0.4, 1) infinite',
            }} />
            <div style={{
              position: 'absolute',
              width: 52, height: 52, borderRadius: '50%',
              border: `1px solid ${accent}30`,
              animation: 'loader-ripple 2.4s cubic-bezier(0.2, 0.6, 0.4, 1) 1.2s infinite',
            }} />
          </div>

          {/* 中心墨滴：呼吸 + 微光 */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: `radial-gradient(circle at 36% 32%, ${accentLight}, ${accent} 62%, ${accentSecondary})`,
              filter: 'blur(0.5px)',
              boxShadow: `0 0 20px ${accent}66, 0 0 46px ${accent}2e`,
              animation: 'loader-ink-breathe 2s ease-in-out infinite',
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
          0% { stroke-dashoffset: 86; transform: rotate(-90deg); }
          50% { stroke-dashoffset: 320; }
          100% { stroke-dashoffset: 86; transform: rotate(630deg); }
        }
        @keyframes loader-ring-rev {
          0% { stroke-dashoffset: 60; }
          100% { stroke-dashoffset: 420; }
        }
        @keyframes loader-ripple {
          0% { transform: scale(0.55); opacity: 0.9; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes loader-ink-breathe {
          0%, 100% { transform: scale(1); opacity: 0.85; }
          50% { transform: scale(1.14); opacity: 1; }
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
      `}</style>
    </div>
  );
}
