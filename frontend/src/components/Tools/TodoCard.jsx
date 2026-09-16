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
    <div className="ui-card ui-pad ui-flex-col ui-h-full">
      <div className="ui-card-head">
        <h3 className="ui-card-title">
          <ListTodo size={18} /> 待办
        </h3>
        <span className="ui-card-sub">
          {doneCount}/{todos.length} 完成
        </span>
      </div>

      <div className="ui-flex ui-gap-2 todo-add-row">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addTodo(); }}
          placeholder="添加一条待办，回车确认"
          aria-label="新待办"
          className="ui-input"
          style={{ flex: 1, minWidth: 0 }}
        />
        <button
          onClick={addTodo}
          aria-label="添加待办"
          className="ui-btn ui-btn-icon"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="ui-flex ui-flex-col ui-gap-2 todo-list">
        {todos.length === 0 ? (
          <div className="ui-empty ui-empty-inline">
            <span className="ui-empty-text">暂无待办，添加第一条吧</span>
          </div>
        ) : (
          todos.map((t) => (
            <div
              key={t.id}
              className="todo-item ui-card-row"
            >
              <button
                onClick={() => toggle(t.id)}
                aria-label={t.done ? '标记未完成' : '标记完成'}
                className="ui-icon-action"
                style={{ color: t.done ? 'var(--success)' : 'var(--text-tertiary)' }}
              >
                {t.done ? <CheckCircle2 size={17} /> : <Circle size={17} />}
              </button>
              <span className={`todo-text ${t.done ? 'todo-text-done' : ''}`}>
                {t.text}
              </span>
              <button
                onClick={() => remove(t.id)}
                aria-label="删除待办"
                className="ui-icon-action is-danger todo-del"
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
