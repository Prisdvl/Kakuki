import { useState, useEffect, useRef } from 'react';
import { Timer, Play, Pause, RotateCcw, Coffee } from 'lucide-react';

const WORK_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

export default function PomodoroCard() {
  const [mode, setMode] = useState('work'); // work | break
  const [secondsLeft, setSecondsLeft] = useState(WORK_SECONDS);
  const [running, setRunning] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!running) return;
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          // 自动切换模式
          setMode((m) => {
            const next = m === 'work' ? 'break' : 'work';
            setSecondsLeft(next === 'work' ? WORK_SECONDS : BREAK_SECONDS);
            return next;
          });
          setRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [running]);

  const switchMode = (m) => {
    setMode(m);
    setSecondsLeft(m === 'work' ? WORK_SECONDS : BREAK_SECONDS);
    setRunning(false);
  };

  const reset = () => {
    setRunning(false);
    setSecondsLeft(mode === 'work' ? WORK_SECONDS : BREAK_SECONDS);
  };

  const total = mode === 'work' ? WORK_SECONDS : BREAK_SECONDS;
  const progress = 1 - secondsLeft / total;
  const size = 132;
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference * (1 - progress);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');
  const accent = mode === 'work' ? 'var(--accent)' : 'var(--success)';

  return (
    <div className="glass mouse-glow reveal" style={{ borderRadius: 20, padding: '1.25rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Timer size={18} style={{ color: 'var(--accent)' }} /> 番茄钟
        </h3>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {(['work', 'break']).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className="pomodoro-mode"
              style={{
                padding: '0.25rem 0.6rem', borderRadius: 8, border: '1px solid var(--border)',
                background: mode === m ? 'var(--accent-soft)' : 'transparent',
                color: mode === m ? 'var(--accent)' : 'var(--text-tertiary)',
                fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.25rem',
                transition: 'all 0.2s',
              }}
            >
              {m === 'work' ? <Timer size={11} /> : <Coffee size={11} />}
              {m === 'work' ? '专注' : '休息'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', flex: 1, justifyContent: 'center' }}>
        <div style={{ position: 'relative' }}>
          <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--bg-tertiary)" strokeWidth={stroke} />
            <circle
              cx={size / 2} cy={size / 2} r={radius}
              fill="none" stroke={accent} strokeWidth={stroke} strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={dashoffset}
              style={{ transition: 'stroke-dashoffset 1s linear', filter: `drop-shadow(0 0 6px ${accent === 'var(--accent)' ? 'var(--accent-glow)' : 'rgba(34,197,94,0.4)'})` }}
            />
          </svg>
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: '1.7rem', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
              {mm}:{ss}
            </span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
              {mode === 'work' ? '保持专注' : '放松一下'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setRunning((r) => !r)}
            className="glass-button-solid"
            aria-label={running ? '暂停' : '开始'}
            style={{ padding: '0.55rem 1.3rem', borderRadius: 12, fontSize: '0.85rem' }}
          >
            {running ? <Pause size={15} /> : <Play size={15} />}
            {running ? '暂停' : '开始'}
          </button>
          <button
            onClick={reset}
            className="glass-button"
            aria-label="重置"
            style={{ padding: '0.55rem 1rem', borderRadius: 12, fontSize: '0.85rem' }}
          >
            <RotateCcw size={15} />
            重置
          </button>
        </div>
      </div>
    </div>
  );
}
