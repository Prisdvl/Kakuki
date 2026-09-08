import { useState, useEffect, useRef, useCallback } from 'react';
import { Timer, Play, Pause, RotateCcw, Coffee, Bookmark, CheckCircle2 } from 'lucide-react';

const WORK_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;
const RECORDS_KEY = 'kakuki-focus-records';

function loadRecords() {
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function saveRecords(records) {
  try { localStorage.setItem(RECORDS_KEY, JSON.stringify(records.slice(0, 60))); } catch { /* ignore */ }
}

// 专注记录写入 localStorage 并广播，状态栏等跨组件监听
function recordFocus(name, minutes) {
  const ts = Date.now();
  const records = [{ ts, date: new Date().toISOString(), minutes, name: name?.trim() || '专注' }, ...loadRecords()];
  saveRecords(records);
  window.dispatchEvent(new CustomEvent('kakuki:focus-updated', { detail: { ts, minutes, name } }));
}

export default function PomodoroCard() {
  const [mode, setMode] = useState('work'); // work | break
  const [secondsLeft, setSecondsLeft] = useState(WORK_SECONDS);
  const [running, setRunning] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [todayRecords, setTodayRecords] = useState([]);
  const timerRef = useRef(null);

  const refreshToday = useCallback(() => {
    const today = new Date().toDateString();
    const list = loadRecords().filter((r) => new Date(r.ts).toDateString() === today);
    setTodayRecords(list.slice(0, 5));
  }, []);

  useEffect(() => {
    refreshToday();
    const onUpdate = () => refreshToday();
    window.addEventListener('kakuki:focus-updated', onUpdate);
    return () => window.removeEventListener('kakuki:focus-updated', onUpdate);
  }, [refreshToday]);

  useEffect(() => {
    if (!running) return;
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          // 当前阶段结束：专注结束则记录，休息结束则不记录
          setMode((m) => {
            if (m === 'work') recordFocus(sessionName, WORK_SECONDS / 60);
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
  }, [running, sessionName]);

  const switchMode = (m) => {
    setMode(m);
    setSecondsLeft(m === 'work' ? WORK_SECONDS : BREAK_SECONDS);
    setRunning(false);
  };

  const reset = () => {
    setRunning(false);
    setSecondsLeft(mode === 'work' ? WORK_SECONDS : BREAK_SECONDS);
  };

  // 手动完成并记录当前专注（用于未跑满 25 分钟的场景）
  const completeNow = () => {
    if (mode !== 'work') return;
    const elapsed = WORK_SECONDS - secondsLeft;
    const minutes = Math.max(1, Math.round(elapsed / 60));
    recordFocus(sessionName, minutes);
    setRunning(false);
    setSecondsLeft(WORK_SECONDS);
    setSessionName('');
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

      {/* 专注命名 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
        <Bookmark size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
        <input
          value={sessionName}
          onChange={(e) => setSessionName(e.target.value)}
          placeholder="本次专注做什么？（如：写 React 组件）"
          maxLength={24}
          aria-label="本次专注命名"
          style={{
            flex: 1, minWidth: 0, padding: '0.3rem 0.6rem', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)', fontSize: '0.75rem', outline: 'none',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
        />
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

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
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
            onClick={completeNow}
            className="glass-button"
            aria-label="完成并记录"
            title="完成本次专注并计入统计"
            style={{ padding: '0.55rem 0.9rem', borderRadius: 12, fontSize: '0.85rem' }}
          >
            <CheckCircle2 size={15} />
            完成
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

      {/* 今日专注记录 */}
      {todayRecords.length > 0 && (
        <div style={{ marginTop: '0.75rem', paddingTop: '0.6rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
            今日已专注 {todayRecords.reduce((s, r) => s + r.minutes, 0)} 分钟 · {todayRecords.length} 次
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {todayRecords.slice(0, 3).map((r) => (
              <div key={r.ts} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                <CheckCircle2 size={11} style={{ color: 'var(--success)', flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{r.name}</span>
                <span style={{ flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{r.minutes} 分钟</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
