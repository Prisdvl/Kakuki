# -*- coding: utf-8 -*-
import io
path = r'D:\develop\Kakuki\frontend\src\styles\globals.css'
with io.open(path, 'r', encoding='utf-8-sig', newline='') as f:
    c = f.read()

block = """

/* ===== Home Free Layout (自定义布局) ===== */
.home-layout-toolbar {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: 1.2rem;
  flex-wrap: wrap;
}
.home-layout-hint {
  font-size: 0.78rem;
  color: var(--text-tertiary);
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}
.home-layout-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-top: 1.2rem;
}
.home-layout-item {
  min-width: 0;
  position: relative;
}
.home-layout-item.wide { grid-column: span 2; }
@media (max-width: 900px) {
  .home-layout-grid { grid-template-columns: 1fr; }
  .home-layout-item.wide { grid-column: span 1; }
}
/* 编辑模式 */
.home-layout-grid.editing .home-layout-item { cursor: grab; }
.home-layout-grid.editing .home-layout-item:active { cursor: grabbing; }
.home-layout-controls {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.7rem;
  margin-bottom: 0.5rem;
  border-radius: 12px;
  background: var(--glass-bg-strong);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  position: relative;
  z-index: 5;
}
.home-drag-handle {
  color: var(--text-tertiary);
  display: inline-flex;
  cursor: grab;
}
.home-ctrl-name {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  flex: 1;
  min-width: 0;
}
.home-ctrl-actions { display: flex; gap: 0.15rem; }
.home-ctrl-actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}
.home-ctrl-actions button:hover {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--accent-soft);
}
.home-ctrl-actions button.danger:hover {
  color: var(--error);
  border-color: var(--error);
  background: var(--error-soft);
}
/* 添加/恢复面板 */
.home-add-panel {
  margin-top: 1rem;
  padding: 0.9rem 1rem;
  border-radius: 16px;
  background: var(--glass-bg-strong);
  border: 1px dashed var(--glass-border);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.home-add-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.6rem;
}
.home-add-list { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.home-add-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.85rem;
  border-radius: 999px;
  background: var(--accent-soft);
  border: 1px solid transparent;
  color: var(--accent);
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.home-add-chip:hover {
  border-color: var(--accent);
  transform: translateY(-1px);
}
.home-add-chip.restore {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-color: var(--border);
}

/* ===== Tilt Card (3D 悬停倾斜) ===== */
.tilt-card { position: relative; }
.tilt-glare {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(circle at var(--glare-x, 50%) var(--glare-y, 50%), rgba(255, 255, 255, 0.14) 0%, transparent 55%);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s;
  z-index: 3;
}
.tilt-card:hover .tilt-glare { opacity: 1; }
@media (prefers-reduced-motion: reduce) {
  .tilt-card { transform: none !important; }
  .tilt-glare { display: none; }
}
"""

if 'Home Free Layout' not in c:
    c = c.rstrip() + '\n' + block
    with io.open(path, 'w', encoding='utf-8-sig', newline='') as f:
        f.write(c)
    print('layout CSS appended')
else:
    print('already present')
