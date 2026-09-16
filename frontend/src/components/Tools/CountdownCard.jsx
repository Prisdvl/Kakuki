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
    <div className="ui-card ui-pad ui-flex-col ui-h-full">
      <div className="ui-card-head countdown-head">
        <h3 className="ui-card-title">
          <CalendarDays size={18} /> 纪念日
        </h3>
        {event && !editing && (
          <button
            onClick={() => { setTitle(event.title); setDate(event.date); setEditing(true); }}
            aria-label="编辑纪念日"
            className="ui-icon-action"
          >
            <Pencil size={14} />
          </button>
        )}
      </div>

      {editing ? (
        <div className="ui-flex ui-flex-col ui-gap-2 countdown-edit">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="事件名称，如：我的生日"
            aria-label="事件名称"
            className="ui-input"
          />
          <input
            type="date"
            value={date}
            min={todayStr()}
            onChange={(e) => setDate(e.target.value)}
            aria-label="事件日期"
            className="ui-input"
            style={{ colorScheme: 'inherit' }}
          />
          <div className="ui-flex ui-gap-2">
            <button onClick={save} className="ui-btn ui-btn-primary countdown-save" style={{ flex: 1 }}>
              <Save size={14} /> 保存
            </button>
            {event && (
              <button onClick={cancel} className="ui-btn">
                <X size={14} /> 取消
              </button>
            )}
          </div>
        </div>
      ) : event ? (
        <div className="ui-flex ui-flex-col ui-items-center ui-justify-center ui-gap-1 countdown-display ui-flex-1">
          <span className="countdown-title">{event.title}</span>
          <span className={`countdown-number ${isPast ? 'countdown-number-past' : ''}`}>
            {Math.abs(days)}
          </span>
          <span className="countdown-caption">{label} · {event.date?.slice(0, 10)}</span>
        </div>
      ) : (
        <div className="ui-empty ui-empty-inline ui-flex-1">
          <span className="ui-empty-text">设置一个值得期待的日子吧</span>
        </div>
      )}
    </div>
  );
}
