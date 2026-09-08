# -*- coding: utf-8 -*-
import io
path = r'D:\develop\Kakuki\frontend\src\styles\globals.css'
with io.open(path, 'r', encoding='utf-8-sig', newline='') as f:
    c = f.read()

old_bar = (
    ".status-bar {\r\n"
    "  position: fixed;\r\n"
    "  bottom: 0;\r\n"
    "  left: 0;\r\n"
    "  right: 0;\r\n"
    "  z-index: 90;\r\n"
    "  background: var(--glass-bg);\r\n"
    "  backdrop-filter: blur(24px);\r\n"
    "  -webkit-backdrop-filter: blur(24px);\r\n"
    "  border-top: 1px solid var(--glass-border);\r\n"
    "  padding: 0.6rem 0;\r\n"
    "  transition: transform 0.4s ease;\r\n"
    "}"
)
new_bar = (
    ".status-bar {\r\n"
    "  position: fixed;\r\n"
    "  bottom: 0;\r\n"
    "  left: 0;\r\n"
    "  right: 0;\r\n"
    "  z-index: 90;\r\n"
    "  background: var(--glass-bg-strong);\r\n"
    "  backdrop-filter: blur(28px) saturate(180%);\r\n"
    "  -webkit-backdrop-filter: blur(28px) saturate(180%);\r\n"
    "  border-top: 1px solid var(--glass-border);\r\n"
    "  box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.06);\r\n"
    "  padding: 0.6rem 0;\r\n"
    "  transition: transform 0.4s ease;\r\n"
    "}"
)

old_time = (
    ".status-time {\r\n"
    "  font-family: 'SF Mono', 'Fira Code', monospace;\r\n"
    "  font-size: 0.95rem;\r\n"
    "  font-weight: 600;\r\n"
    "  color: var(--accent);\r\n"
    "  letter-spacing: 0.05em;\r\n"
    "  padding: 0.3rem 0.75rem;\r\n"
    "  border-radius: 8px;\r\n"
    "  background: var(--accent-soft);\r\n"
    "}"
)
new_time = (
    ".status-time {\r\n"
    "  font-family: 'SF Mono', 'Fira Code', monospace;\r\n"
    "  font-size: 0.95rem;\r\n"
    "  font-weight: 600;\r\n"
    "  color: var(--accent);\r\n"
    "  letter-spacing: 0.05em;\r\n"
    "  font-variant-numeric: tabular-nums;\r\n"
    "  padding: 0.3rem 0.75rem;\r\n"
    "  border-radius: 8px;\r\n"
    "  background: var(--accent-soft);\r\n"
    "  border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);\r\n"
    "}"
)

old_badge = (
    ".status-tech-badge {\r\n"
    "  padding: 0.2rem 0.6rem;\r\n"
    "  border-radius: 6px;\r\n"
    "  background: var(--glass-bg);\r\n"
    "  backdrop-filter: blur(8px);\r\n"
    "  border: 1px solid var(--glass-border);\r\n"
    "  font-size: 0.7rem;\r\n"
    "  font-weight: 600;\r\n"
    "  color: var(--text-secondary);\r\n"
    "  letter-spacing: 0.02em;\r\n"
    "}"
)
new_badge = (
    ".status-tech-badge {\r\n"
    "  padding: 0.2rem 0.6rem;\r\n"
    "  border-radius: 6px;\r\n"
    "  background: var(--bg-tertiary);\r\n"
    "  border: 1px solid var(--border);\r\n"
    "  font-size: 0.7rem;\r\n"
    "  font-weight: 600;\r\n"
    "  color: var(--text-secondary);\r\n"
    "  letter-spacing: 0.02em;\r\n"
    "  transition: border-color 0.2s, color 0.2s;\r\n"
    "}\r\n"
    ".status-tech-badge:hover {\r\n"
    "  border-color: var(--accent);\r\n"
    "  color: var(--accent);\r\n"
    "}\r\n"
    "\r\n"
    ".status-page-icon {\r\n"
    "  width: 6px;\r\n"
    "  height: 6px;\r\n"
    "  border-radius: 50%;\r\n"
    "  background: var(--accent);\r\n"
    "  box-shadow: 0 0 6px var(--accent-glow);\r\n"
    "}\r\n"
    ".status-meta {\r\n"
    "  opacity: 0.85;\r\n"
    "  font-size: 0.75rem;\r\n"
    "}\r\n"
    "@media (max-width: 768px) {\r\n"
    "  .status-meta,\r\n"
    "  .status-page { display: none; }\r\n"
    "}"
)

ok = 0
if old_bar in c: c = c.replace(old_bar, new_bar); ok += 1
else: print('bar NOT FOUND')
if old_time in c: c = c.replace(old_time, new_time); ok += 1
else: print('time NOT FOUND')
if old_badge in c: c = c.replace(old_badge, new_badge); ok += 1
else: print('badge NOT FOUND')

with io.open(path, 'w', encoding='utf-8-sig', newline='') as f:
    f.write(c)
print('patched ok=%d/3' % ok)
