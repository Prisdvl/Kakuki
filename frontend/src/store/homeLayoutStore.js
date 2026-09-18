import { create } from 'zustand';

const STORAGE_KEY = 'kakuki-home-layout';

/**
 * 自由布局 v4（流式自动排版，稳定优先）：
 * 每张卡片 { id, w(宽度档), visible }，按数组顺序在 12 列网格中自动折行排布。
 *  - CSS grid 天然保证不重叠 / 不溢出 / 内容自适应高度（不再裁切）
 *  - 编辑：按钮上移/下移/循环宽度档；可选简单拖拽换位
 *  - 宽档：quarter(3)/third(4)/half(6)/two-thirds(8)/full(12)
 */

const W_ORDER = ['quarter', 'third', 'half', 'two-thirds', 'full'];
const W_SPAN = { quarter: 3, third: 4, half: 6, 'two-thirds': 8, full: 12 };

const DEFAULT_LAYOUT = [
  { id: 'profile',   w: 'half',        visible: true },
  { id: 'music',     w: 'full',        visible: true },
  { id: 'leetcode',  w: 'half',        visible: true },
  { id: 'weather',   w: 'half',        visible: true },
  { id: 'talks',     w: 'third',       visible: true },
  { id: 'projects',  w: 'third',       visible: true },
  { id: 'categories',w: 'third',       visible: true },
  { id: 'quote',     w: 'full',        visible: true },
  { id: 'todo',      w: 'third',       visible: true },
  { id: 'palette',   w: 'third',       visible: true },
  { id: 'countdown', w: 'third',       visible: true },
];

/** 杂志模板：交错宽度 */
const MAGAZINE_LAYOUT = [
  { id: 'profile',   w: 'two-thirds', visible: true },
  { id: 'weather',   w: 'third',      visible: true },
  { id: 'music',     w: 'full',       visible: true },
  { id: 'stats',     w: 'quarter',    visible: true },
  { id: 'todo',      w: 'quarter',    visible: true },
  { id: 'palette',   w: 'quarter',    visible: true },
  { id: 'countdown', w: 'quarter',    visible: true },
  { id: 'leetcode',  w: 'half',       visible: true },
  { id: 'talks',     w: 'half',       visible: true },
  { id: 'projects',  w: 'third',      visible: true },
  { id: 'categories',w: 'third',      visible: true },
  { id: 'comments',  w: 'third',      visible: true },
  { id: 'quote',     w: 'full',       visible: true },
];

const RETIRED_IDS = new Set(['pomodoro']);
const KNOWN_IDS = new Set([
  'profile', 'music', 'leetcode', 'talks', 'projects',
  'categories', 'quote', 'todo', 'palette', 'countdown',
  'stats', 'tags', 'comments', 'weather',
]);

/** 宽度档 ↔ 12 列 span 换算（兼容 v1/v2/v3 迁移） */
function spanToW(span) {
  const s = Math.max(1, Math.min(12, Math.round(span) || 4));
  if (s <= 3) return 'quarter';
  if (s <= 4) return 'third';
  if (s <= 6) return 'half';
  if (s <= 8) return 'two-thirds';
  return 'full';
}
function halfSpanToW(halfSpan) {
  return spanToW(halfSpan / 2);
}

function isLegacyWidth(arr) {
  try { return Array.isArray(arr) && arr.some((x) => x && typeof x === 'object' && 'width' in x); } catch { return true; }
}

function normalize(item) {
  // v3/v2：{x,y,w,h} 或 {x,y,w}（24 半列或 12 列）
  if (item && typeof item === 'object' && 'w' in item) {
    const isHalf = item.x != null && item.x > 12; // 24 半列布局特征
    const w = isHalf ? halfSpanToW(item.w) : spanToW(item.w);
    return { id: item.id, w, visible: item.visible !== false };
  }
  return { id: item.id, w: W_ORDER.includes(item.w) ? item.w : 'two-thirds', visible: item.visible !== false };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {
        if (isLegacyWidth(parsed)) return DEFAULT_LAYOUT.map((x) => ({ ...x }));
        const seen = new Set();
        const cleaned = parsed
          .filter((x) => x && KNOWN_IDS.has(x.id) && !RETIRED_IDS.has(x.id))
          .filter((x) => (seen.has(x.id) ? false : seen.add(x.id)))
          .map(normalize);
        if (cleaned.length) return cleaned;
      }
    }
  } catch { /* ignore */ }
  return DEFAULT_LAYOUT.map((x) => ({ ...x }));
}

function persist(arr) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); } catch { /* ignore */ }
}

const clone = (arr) => arr.map((x) => ({ ...x }));

export const useHomeLayout = create((set) => ({
  layout: load(),
  editing: false,
  setEditing: (v) => set({ editing: v }),

  cycleWidth: (id) => set((s) => {
    const arr = s.layout.map((x) => {
      if (x.id !== id) return x;
      const next = W_ORDER[(W_ORDER.indexOf(x.w) + 1) % W_ORDER.length];
      return { ...x, w: next };
    });
    persist(arr);
    return { layout: arr };
  }),

  move: (id, dir) => set((s) => {
    const idx = s.layout.findIndex((x) => x.id === id);
    const ni = idx + dir;
    if (idx < 0 || ni < 0 || ni >= s.layout.length) return {};
    const arr = clone(s.layout);
    const [it] = arr.splice(idx, 1);
    arr.splice(ni, 0, it);
    persist(arr);
    return { layout: arr };
  }),

  /** 拖拽换位：把 id 插到 target 的前/后 */
  moveTo: (id, targetId, after = false) => set((s) => {
    if (id === targetId) return {};
    const arr = clone(s.layout);
    const from = arr.findIndex((x) => x.id === id);
    if (from < 0 || !arr.some((x) => x.id === targetId)) return {};
    const [it] = arr.splice(from, 1);
    const tp = arr.findIndex((x) => x.id === targetId);
    arr.splice(after ? tp + 1 : tp, 0, it);
    persist(arr);
    return { layout: arr };
  }),

  toggleVisible: (id) => set((s) => {
    const arr = s.layout.map((x) => (x.id === id ? { ...x, visible: !x.visible } : x));
    persist(arr);
    return { layout: arr };
  }),

  addComponent: (id) => set((s) => {
    if (s.layout.some((x) => x.id === id)) return {};
    const arr = [...s.layout, { id, w: 'two-thirds', visible: true }];
    persist(arr);
    return { layout: arr };
  }),

  removeComponent: (id) => set((s) => {
    const arr = s.layout.filter((x) => x.id !== id);
    persist(arr);
    return { layout: arr };
  }),

  resetLayout: () => set(() => {
    const arr = clone(DEFAULT_LAYOUT);
    persist(arr);
    return { layout: arr };
  }),

  applyTemplate: (name) => set(() => {
    const src = name === 'magazine' ? MAGAZINE_LAYOUT : DEFAULT_LAYOUT;
    persist(clone(src));
    return { layout: clone(src) };
  }),

  /** 一键整理：移除不可见卡后按固定顺序重排 */
  tidy: () => set((s) => {
    const order = [
      'profile', 'music', 'leetcode', 'weather', 'stats',
      'talks', 'projects', 'categories', 'comments', 'tags',
      'todo', 'palette', 'countdown', 'quote',
    ];
    const seen = new Set();
    const visible = order
      .filter((id) => s.layout.some((x) => x.id === id && x.visible) && !seen.has(id) && seen.add(id))
      .map((id) => s.layout.find((x) => x.id === id) || { id, w: 'two-thirds', visible: true });
    // 补录未知组件（保留原顺序）
    const knownSet = new Set(order);
    const rest = s.layout.filter((x) => !knownSet.has(x.id));
    const arr = [...visible, ...rest];
    persist(arr);
    return { layout: arr };
  }),
}));