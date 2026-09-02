import { useState, useEffect, useRef } from "react";

/**
 * 全屏加载动画：眨眼 Logo + 轨道光环 + 上升粒子 + 渐变进度条
 * 通过 fadingOut 控制淡出，progress/statusText 由外部真实进度驱动
 */
export default function Loader({
  fullscreen = false,
  minDuration = 1800,
  fadingOut = false,
  showProgress = false,
  progress = 0,
  statusText = "",
}) {
  const [visible, setVisible] = useState(true);
  const [blink, setBlink] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const [textKey, setTextKey] = useState(0);
  const prevTextRef = useRef(statusText);

  // 淡出
  useEffect(() => {
    if (fadingOut) {
      setOpacity(0);
      const timer = setTimeout(() => setVisible(false), 650);
      return () => clearTimeout(timer);
    }
  }, [fadingOut]);

  // 兜底自动隐藏
  useEffect(() => {
    if (fadingOut) return;
    const timer = setTimeout(() => setVisible(false), minDuration);
    return () => clearTimeout(timer);
  }, [minDuration, fadingOut]);

  // 眨眼节律
  useEffect(() => {
    if (fadingOut || !visible) return;
    const blinkTimer = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 3400);
    return () => clearInterval(blinkTimer);
  }, [fadingOut, visible]);

  // 状态文本变化时重新触发淡入动画
  useEffect(() => {
    if (statusText !== prevTextRef.current) {
      prevTextRef.current = statusText;
      setTextKey((k) => k + 1);
    }
  }, [statusText]);

  if (!visible) return null;

  const accentColor = `hsl(var(--accent-h), var(--accent-s), var(--accent-l))`;
  const shownProgress = Math.min(100, Math.max(0, Math.round(progress)));

  const wrapStyle = fullscreen
    ? {
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: "radial-gradient(ellipse 90% 70% at 50% 42%, var(--bg-secondary) 0%, var(--bg-primary) 70%)",
        gap: "1.5rem", opacity, overflow: "hidden",
        transition: "opacity 0.65s cubic-bezier(0.4, 0, 0.2, 1)",
        pointerEvents: opacity < 0.5 ? "none" : "auto",
      }
    : {
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", minHeight: "55vh", gap: "1.5rem",
        opacity, transition: "opacity 0.65s cubic-bezier(0.4, 0, 0.2, 1)",
      };

  return (
    <div style={wrapStyle}>
      {/* 中央呼吸光晕 */}
      <div className="loader-halo" aria-hidden />

      {/* 上升粒子 */}
      <div className="loader-particles" aria-hidden>
        {[...Array(14)].map((_, i) => (
          <i
            key={i}
            className={`loader-particle lp${i % 5}`}
            style={{ left: `${4 + i * 7}%`, animationDelay: `${(i % 7) * 0.55}s`, animationDuration: `${5 + (i % 4) * 1.2}s` }}
          />
        ))}
      </div>

      {/* 眼睛 + 轨道环 */}
      <div className="loader-stage" aria-hidden>
        <div className="loader-orbit">
          <span className="loader-orbit-dot" />
          <span className="loader-orbit-dot dot-2" />
        </div>
        <div className="loader-eye-float">
          <svg width="92" height="58" viewBox="0 0 80 50" style={{ overflow: "visible", margin: "0 auto" }}>
            <ellipse cx="40" cy="25" rx="38" ry="24" fill="none"
              stroke={accentColor} strokeOpacity="0.12" strokeWidth="12"
              style={{ filter: "blur(9px)", animation: "eyeGlow 2.5s ease-in-out infinite" }}
            />
            <ellipse cx="40" cy="25" rx="34" ry={blink ? 1.5 : 20}
              fill="none" stroke={accentColor} strokeOpacity="0.6"
              strokeWidth="2.5"
              style={{ transition: "ry 0.12s ease" }}
            />
            <ellipse cx="40" cy="25" rx="14" ry="14"
              fill={accentColor} fillOpacity={blink ? 0 : 0.22}
              style={{ transition: "fill-opacity 0.08s" }}
            />
            <ellipse cx="40" cy="25" rx="6" ry="6"
              fill={accentColor} fillOpacity={blink ? 0 : 0.55}
              style={{ transition: "fill-opacity 0.08s" }}
            />
            <ellipse cx="36" cy="20.5" rx="3.2" ry="2.6"
              fill="white" fillOpacity={blink ? 0 : 0.85}
              style={{ transition: "fill-opacity 0.08s" }}
            />
          </svg>
        </div>
      </div>

      {/* 站点名 */}
      <div className="loader-brand">Kakuki<span>.</span></div>

      {/* 状态文本（切换淡入） */}
      <div key={textKey} className="loader-status">
        {statusText || "加载中"}
      </div>

      {/* 进度条 + 百分比 */}
      {showProgress && (
        <div className="loader-progress-wrap">
          <div className="loader-progress-track">
            <div
              className={`loader-progress-fill ${shownProgress >= 100 ? 'done' : ''}`}
              style={{ width: `${shownProgress}%` }}
            />
          </div>
          <span className="loader-progress-num">{shownProgress}%</span>
        </div>
      )}

      <style>{`
        @keyframes eyeGlow { 0%,100%{opacity:0.3} 50%{opacity:0.75} }
        @keyframes loaderHaloPulse {
          0%,100% { transform: translate(-50%,-50%) scale(1); opacity: 0.5; }
          50% { transform: translate(-50%,-50%) scale(1.18); opacity: 0.85; }
        }
        @keyframes loaderEyeBob {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-7px); }
        }
        @keyframes loaderOrbitSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes loaderParticleRise {
          0% { transform: translateY(0) scale(1); opacity: 0; }
          12% { opacity: var(--po, 0.5); }
          85% { opacity: var(--po, 0.5); }
          100% { transform: translateY(-46vh) scale(0.4); opacity: 0; }
        }
        @keyframes loaderTextIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes loaderBarShimmer {
          from { transform: translateX(-100%); }
          to { transform: translateX(260%); }
        }
      `}</style>
    </div>
  );
}
