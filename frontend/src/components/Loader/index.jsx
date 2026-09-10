import { useEffect, useState } from 'react';
import useThemeStore from '../../store/themeStore';

/**
 * 主题化加载组件（纯文字极简版）
 * - 无任何图形图标：仅品牌文字 + 状态文案 + 细流动进度条
 * - 全屏遮罩延续磨砂玻璃质感
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
      {/* 内容层：纯文字 + 流动进度条，无图形图标 */}
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
        {/* 品牌文字：shimmer 流动 */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 30,
            fontWeight: 800,
            letterSpacing: '0.22em',
            background: `linear-gradient(90deg, ${textColor}, ${accent}, ${accentLight}, ${accentSecondary}, ${textColor})`,
            backgroundSize: '300% 100%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'loader-shimmer 2.2s linear infinite',
            padding: '0 0.22em',
          }}>
            Kakuki
          </div>

          {statusText && (
            <div style={{
              marginTop: 14,
              fontSize: 12,
              color: textColor,
              opacity: 0.7,
              letterSpacing: '0.14em',
            }}>
              {statusText}
            </div>
          )}
        </div>

        {/* 细流动进度条（无图标，仅线条） */}
        <div style={{ marginTop: 34, width: 220, maxWidth: '60vw' }}>
          <div style={{
            height: 2,
            borderRadius: 2,
            background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            overflow: 'hidden',
            position: 'relative',
          }}>
            <div style={{
              height: '100%',
              width: showProgress ? `${displayProgress}%` : '100%',
              background: `linear-gradient(90deg, ${accent}, ${accentLight}, ${accentSecondary})`,
              borderRadius: 2,
              transition: 'width 0.3s ease-out',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* 亮带流动 */}
              <div style={{
                position: 'absolute',
                inset: 0,
                background: `linear-gradient(90deg, transparent, ${isDark ? '#ffffff' : '#000000'}2e, transparent)`,
                animation: 'loader-progress-shimmer 1.4s ease-in-out infinite',
              }} />
            </div>
          </div>

          {showProgress && (
            <div style={{
              marginTop: 10,
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 10,
              color: textColor,
              opacity: 0.55,
              letterSpacing: '0.18em',
            }}>
              <span>LOADING</span>
              <span>{Math.round(displayProgress)}%</span>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes loader-shimmer {
          0% { background-position: 300% 0; }
          100% { background-position: -300% 0; }
        }
        @keyframes loader-progress-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
