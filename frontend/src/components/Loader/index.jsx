import { useEffect, useRef, useState } from 'react';
import useThemeStore from '../../store/themeStore';

/**
 * 主题化加载组件（Scramble 乱码解码 + Particle Text 粒子连线背景）
 * - 品牌文字：等宽字体逐位乱码→解码收敛（参照 timer-motion-all-v2 的 Scramble 效果），循环解码
 * - 背景：全屏 Canvas 粒子漂浮 + 近距离连线（Particle Text 风格），颜色跟随主题 accent
 * - 无任何图形图标；状态文案 + 细流动进度条保留
 * - 加载完成平滑淡出
 */

const SCRAMBLE_CHARS = '!<>-_\\/[]{}—=+*^?#________'.split('');
const SCRAMBLE_TARGET = 'KAKUKI';

function hexToRgba(hex, alpha) {
  let h = (hex || '#7c3aed').replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return `rgba(124, 58, 237, ${alpha})`;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Scramble 乱码解码：逐位随机字符 → 定时收敛到目标文字，收敛后停留再循环 */
function useScramble(target, { speed = 34, holdMs = 1400 } = {}) {
  const [text, setText] = useState('');
  useEffect(() => {
    let iv = null;
    let hold = null;
    let disposed = false;
    const run = () => {
      let iter = 0;
      iv = setInterval(() => {
        if (disposed) return;
        let r = '';
        for (let i = 0; i < target.length; i++) {
          r += i < iter ? target[i] : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        }
        setText(r);
        iter += 1 / 3;
        if (iter >= target.length + 3) {
          clearInterval(iv);
          iv = null;
          setText(target);
          hold = setTimeout(run, holdMs); // 循环解码，加载期间持续有动效
        }
      }, speed);
    };
    run();
    return () => {
      disposed = true;
      if (iv) clearInterval(iv);
      if (hold) clearTimeout(hold);
    };
  }, [target, speed, holdMs]);
  return text;
}

/** Particle Text 粒子连线背景（Canvas）：漂浮粒子 + 近距离连线，颜色跟随 accent */
function ParticleField({ color, isDark }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    let w = 0;
    let h = 0;
    let pts = [];
    let raf = 0;

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const N = Math.min(90, Math.floor(window.innerWidth / 16));
    pts = Array.from({ length: N }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      s: Math.random() * 1.8 + 0.4,
      a: Math.random() * 0.45 + 0.12,
    }));

    const LINE_DIST = 88;

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(color, Math.min(p.a, isDark ? 0.6 : 0.35));
        ctx.fill();
      }
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < LINE_DIST) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = hexToRgba(color, 0.12 * (1 - d / LINE_DIST));
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [color, isDark]);

  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1 }} />;
}

export default function Loader({
  fullscreen = false,
  progress = 0,
  statusText = '',
  showProgress = false,
  fadingOut = false,
}) {
  const { isDark, themeColor, colorPalette } = useThemeStore();
  const [mounted, setMounted] = useState(false);
  const scramble = useScramble(SCRAMBLE_TARGET);

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
          ? 'rgba(15, 10, 30, 0.62)'
          : 'rgba(245, 240, 255, 0.62)',
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
        position: 'relative',
      };

  const displayProgress = Math.min(100, Math.max(0, progress));

  return (
    <div style={containerStyle}>
      {/* Particle Text：粒子连线背景 */}
      {fullscreen && <ParticleField color={accent} isDark={isDark} />}

      {/* 内容层：Scramble 品牌文字 + 状态文案 + 细流动进度条 */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
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
        <div style={{ textAlign: 'center' }}>
          {/* Scramble 乱码解码品牌字 */}
          <div
            style={{
              fontSize: 34,
              fontWeight: 700,
              letterSpacing: '0.24em',
              fontFamily: '"SF Mono", "Fira Code", Consolas, "JetBrains Mono", monospace',
              color: accent,
              textShadow: `0 0 18px ${hexToRgba(accent, 0.4)}, 0 0 46px ${hexToRgba(accent, 0.18)}`,
              padding: '0 0.24em',
              minHeight: '1.2em',
              whiteSpace: 'nowrap',
            }}
          >
            {scramble || 'KAKUKI'}
          </div>

          {statusText && (
            <div
              style={{
                marginTop: 14,
                fontSize: 12,
                color: textColor,
                opacity: 0.7,
                letterSpacing: '0.14em',
              }}
            >
              {statusText}
            </div>
          )}
        </div>

        {/* 细流动进度条（无图标，仅线条） */}
        <div style={{ marginTop: 34, width: 220, maxWidth: '60vw' }}>
          <div
            style={{
              height: 2,
              borderRadius: 2,
              background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                height: '100%',
                width: showProgress ? `${displayProgress}%` : '100%',
                background: `linear-gradient(90deg, ${accent}, ${accentLight}, ${accentSecondary})`,
                borderRadius: 2,
                transition: 'width 0.3s ease-out',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: `linear-gradient(90deg, transparent, ${isDark ? '#ffffff' : '#000000'}2e, transparent)`,
                  animation: 'loader-progress-shimmer 1.4s ease-in-out infinite',
                }}
              />
            </div>
          </div>

          {showProgress && (
            <div
              style={{
                marginTop: 10,
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 10,
                color: textColor,
                opacity: 0.55,
                letterSpacing: '0.18em',
              }}
            >
              <span>LOADING</span>
              <span>{Math.round(displayProgress)}%</span>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes loader-progress-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
