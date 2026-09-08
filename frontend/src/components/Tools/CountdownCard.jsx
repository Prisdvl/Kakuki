import { useState, useEffect } from 'react';
import { CalendarDays, Pencil, Save, X } from 'lucide-react';

const STORAGE_KEY = 'kakuki-countdown';

function loadEvent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function calcDays(target) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(target + 'T00:00:00');
  const diff = targetDate - today;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function CountdownCard() {
  const [event, setEvent] = useState(loadEvent);
  const [editing, setEditing] = useState(!loadEvent());
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    try {
      if (event) localStorage.setItem(STORAGE_KEY, JSON.stringify(event));
    } catch { /* ignore */ }
  }, [event]);

  const save = () => {
    if (!title.trim() || !date) return;
    setEvent({ title: title.trim(), date });
    setEditing(false);
  };

  const cancel = () => {
    if (!event) setEditing(true);
    else setEditing(false);
  };

  const todayStr = () => new Date().toISOString().slice(0, 10);

  const days = event ? calcDays(event.date) : 0;
  const isPast = days < 0;
  const label = isPast ? '已过去' : (days === 0 ? '就是今天' : '倒计时');

  return (
    <div className="glass mouse-glow reveal" style={{ borderRadius: 20, padding: '1.25rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <CalendarDays size={18} style={{ color: 'var(--accent)' }} /> 纪念日
        </h3>
        {event && !editing && (
          <button
            onClick={() => { setTitle(event.title); setDate(event.date); setEditing(true); }}
            aria-label="编辑纪念日"
            style={{
              border: 'none', background: 'transparent', cursor: 'pointer',
              color: 'var(--text-tertiary)', display: 'flex', padding: '0.2rem',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}
          >
            <Pencil size={14} />
          </button>
        )}
      </div>

      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, justifyContent: 'center' }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="事件名称，如：我的生日"
            aria-label="事件名称"
            style={{
              padding: '0.55rem 0.75rem', borderRadius: 10,
              background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
              color: 'var(--text-primary)', fontSize: '0.82rem', outline: 'none',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
          />
          <input
            type="date"
            value={date}
            min={todayStr()}
            onChange={(e) => setDate(e.target.value)}
            aria-label="事件日期"
            style={{
              padding: '0.55rem 0.75rem', borderRadius: 10,
              background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
              color: 'var(--text-primary)', fontSize: '0.82rem', outline: 'none',
              colorScheme: 'inherit',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
          />
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem' }}>
            <button onClick={save} className="glass-button-solid" style={{ padding: '0.5rem 1rem', borderRadius: 10, fontSize: '0.8rem', flex: 1 }}>
              <Save size={14} /> 保存
            </button>
            {event && (
              <button onClick={cancel} className="glass-button" style={{ padding: '0.5rem 1rem', borderRadius: 10, fontSize: '0.8rem' }}>
                <X size={14} /> 取消
              </button>
            )}
          </div>
        </div>
      ) : event ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{event.title}</span>
          <span className="countdown-number" style={{
            fontSize: '2.6rem', fontWeight: 800, lineHeight: 1.1,
            color: isPast ? 'var(--text-tertiary)' : 'var(--accent)',
            fontVariantNumeric: 'tabular-nums',
            textShadow: isPast ? 'none' : '0 0 24px var(--accent-glow)',
          }}>
            {Math.abs(days)}
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{label} · {event.date?.slice(0, 10)}</span>
        </div>
      ) : (
        <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.8rem', padding: '1rem 0', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          设置一个值得期待的日子吧
        </p>
      )}
    </div>
  );
}
