import { useState, useEffect, useRef } from 'react';
import { ListTodo, Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';

const STORAGE_KEY = 'kakuki-todos';

function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

export default function TodoCard() {
  const [todos, setTodos] = useState(loadTodos);
  const [input, setInput] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(todos)); } catch { /* ignore */ }
  }, [todos]);

  const addTodo = () => {
    const text = input.trim();
    if (!text) return;
    setTodos((prev) => [...prev, { id: Date.now(), text, done: false }]);
    setInput('');
    inputRef.current?.focus();
  };

  const toggle = (id) => {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const remove = (id) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const doneCount = todos.filter((t) => t.done).length;

  return (
    <div className="glass mouse-glow reveal" style={{ borderRadius: 20, padding: '1.25rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <ListTodo size={18} style={{ color: 'var(--accent)' }} /> 待办清单
        </h3>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
          {doneCount}/{todos.length} 完成
        </span>
      </div>

      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addTodo(); }}
          placeholder="添加一条待办，回车确认"
          aria-label="新待办"
          style={{
            flex: 1, minWidth: 0, padding: '0.55rem 0.75rem', borderRadius: 10,
            background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
            color: 'var(--text-primary)', fontSize: '0.82rem', outline: 'none',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
        />
        <button
          onClick={addTodo}
          aria-label="添加待办"
          className="glass-button"
          style={{ padding: '0.5rem 0.75rem', borderRadius: 10, flexShrink: 0 }}
        >
          <Plus size={16} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', overflowY: 'auto', maxHeight: 190, flex: 1 }}>
        {todos.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.8rem', padding: '1rem 0' }}>
            暂无待办，添加第一条吧
          </p>
        ) : (
          todos.map((t) => (
            <div
              key={t.id}
              className="todo-item"
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 0.65rem', borderRadius: 10,
                background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--accent) 40%, transparent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              <button
                onClick={() => toggle(t.id)}
                aria-label={t.done ? '标记未完成' : '标记完成'}
                style={{
                  border: 'none', background: 'transparent', cursor: 'pointer',
                  color: t.done ? 'var(--success)' : 'var(--text-tertiary)',
                  display: 'flex', padding: 0, flexShrink: 0,
                }}
              >
                {t.done ? <CheckCircle2 size={17} /> : <Circle size={17} />}
              </button>
              <span style={{
                flex: 1, minWidth: 0, fontSize: '0.83rem', color: 'var(--text-primary)',
                textDecoration: t.done ? 'line-through' : 'none',
                opacity: t.done ? 0.5 : 1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {t.text}
              </span>
              <button
                onClick={() => remove(t.id)}
                aria-label="删除待办"
                style={{
                  border: 'none', background: 'transparent', cursor: 'pointer',
                  color: 'var(--text-tertiary)', display: 'flex', padding: 0, flexShrink: 0,
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--error)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
