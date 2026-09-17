import { create } from 'zustand';

const STORAGE_KEY = 'kakuki-home-layout';
export const GRID_COLS = 12;

/**
 * 自由布局 v2（看板式，2026-09）：
 * 每张卡片由 12 列网格坐标定位 { x 起始列, y 行, w 列跨度 }。
 *  - 水平：任意列位置（1..12）与任意跨度（1..12）
 *  - 垂直：以自然行为单位（一行放多卡，放置冲突时自动向下推挤）
 *  - 空白位保留（不自动回收）
 *
 * layout 元素：{ id, x, y, w, visible }
 */
const DEFAULT_LAYOUT = [
  { id: 'profile',   x: 1,  y: 1, w: 8,  visible: true },
  { id: 'music',     x: 1,  y: 2, w: 6,  visible: true },
  { id: 'leetcode',  x: 7,  y: 2, w: 6,  visible: true },
  { id: 'talks',     x: 1,  y: 3, w: 4,  visible: true },
  { id: 'projects',  x: 5,  y: 3, w: 4,  visible: true },
  { id: 'categories',x: 9,  y: 3, w: 4,  visible: true },
  { id: 'quote',     x: 1,  y: 4, w: 12, visible: true },
  { id: 'todo',      x: 1,  y: 5, w: 4,  visible: true },
  { id: 'palette',   x: 5,  y: 5, w: 4,  visible: true },
  { id: 'countdown', x: 9,  y: 5, w: 4,  visible: true },
];
// 首屏第一行右侧 4 列留作「陨石图形」装饰区（见 HomePage .meteor-home）

// 已下线组件：番茄钟（专注计时统一交给本地 PrisTimer）
const RETIRED_IDS = new Set(['pomodoro']);
const KNOWN_IDS = new Set([
  'profile', 'music', 'leetcode', 'talks', 'projects',
  'categories', 'quote', 'todo', 'palette', 'countdown',
  'stats', 'tags', 'comments', 'weather',
]);

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const overlap = (a1, a2, b1, b2) => a1 < b2 && a2 > b1;

/** 兼容旧数据：旧格式有 width 字段 → 视为 v1 布局，直接放弃（v2 起为网格坐标） */
function isLegacyLayout(arr) {
  try {
    return Array.isArray(arr) && arr.some((x) => x && typeof x === 'object' && 'width' in x);
  } catch { return true; }
}

function normalize(item) {
  return {
    id: item.id,
    x: clamp(Math.round(item.x) || 1, 1, GRID_COLS),
    y: Math.max(1, Math.round(item.y) || 1),
    w: clamp(Math.round(item.w) || 4, 1, GRID_COLS),
    visible: item.visible !== false,
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {
        // v1（width 档位）布局：无法安全映射到 v2 网格坐标，重置为默认，
        // 否则所有卡片都会落在 (1,1) 造成全屏重叠。
        if (isLegacyLayout(parsed)) return DEFAULT_LAYOUT.map((x) => ({ ...x }));
        const seen = new Set();
        const cleaned = parsed
          .filter((x) => x && KNOWN_IDS.has(x.id) && !RETIRED_IDS.has(x.id))
          .filter((x) => (seen.has(x.id) ? false : seen.add(x.id)))
          .map(normalize)
          .map((x) => ({ ...x, x: clamp(x.x, 1, GRID_COLS - x.w + 1) }));
        if (cleaned.length) return cleaned;
      }
    }
  } catch { /* ignore */ }
  return DEFAULT_LAYOUT.map((x) => ({ ...x }));
}

function persist(arr) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); } catch { /* ignore */ }
}

/**
 * 推挤式放置：把 id 放到 (x, y, w)。
 * 目标区域与其它可见卡片重叠时，被挤卡片依次向下推到空行（y 单调递增 → 必然终止）。
 * 空白位保留（不回收行号）。
 * @returns 新 layout 数组（不可变）
 */
function placeIn(layout, id, x, y, w) {
  x = clamp(Math.round(x) || 1, 1, GRID_COLS);
  w = clamp(Math.round(w) || 4, 1, GRID_COLS);
  x = clamp(x, 1, GRID_COLS - w + 1);
  y = Math.max(1, Math.round(y) || 1);

  // 全量拷贝（不可变）：后续推挤直接改元素属性
  const arr = layout.map((it) => ({
    ...it,
    ...(it.id === id ? { x, y, w } : {}),
  }));

  // 逐行向下的冲突消解：与已放置区域重叠的卡 → 下移一行（y 单调递增 → 必然终止）
  const queue = [{ id, x, y, w }];
  let guard = 0;
  while (queue.length > 0 && guard < 60) {
    guard += 1;
    const cur = queue.shift();
    for (const it of arr) {
      if (it.id === cur.id || !it.visible) continue;
      if (it.y === cur.y && overlap(it.x, it.x + it.w, cur.x, cur.x + cur.w)) {
        it.y = it.y + 1;
        it.x = Math.max(1, Math.min(it.x, GRID_COLS - it.w + 1));
        queue.push({ id: it.id, x: it.x, y: it.y, w: it.w });
      }
    }
  }
  return arr;
}

export const useHomeLayout = create((set, get) => ({
  layout: load(),
  editing: false,
  setEditing: (v) => set({ editing: v }),

  /** 任意格投放（看板落点）：目标卡 + 落点(前/后半) + 是否落到下一行 */
  moveTo: (id, targetId, { after = false, belowRow = false } = {}) => set((s) => {
    const t = s.layout.find((x) => x.id === targetId);
    if (!t || id === targetId) return {};
    const x = t.x + (after ? t.w : 0);
    const y = t.y + (belowRow ? 1 : 0);
    const self = s.layout.find((x) => x.id === id);
    const arr = placeIn(s.layout, id, x, y, self?.w || 4);
    persist(arr);
    return { layout: arr };
  }),

  /** 拖拽中实时预览落点（只改 x / y / w 之一，不推挤） */
  preview: (id, patch) => set((s) => ({
    layout: s.layout.map((it) => (it.id === id ? { ...it, ...patch } : it)),
  })),

  /** resize：拖右下角手柄改跨度 w（1..12），松手落定（推挤） */
  setWidth: (id, w) => set((s) => {
    const self = s.layout.find((x) => x.id === id);
    if (!self) return {};
    const arr = placeIn(s.layout, id, self.x, self.y, w);
    persist(arr);
    return { layout: arr };
  }),

  move: (id, dir) => set((s) => {
    const self = s.layout.find((x) => x.id === id);
    if (!self) return {};
    const arr = placeIn(s.layout, id, self.x, Math.max(1, self.y + dir), self.w);
    persist(arr);
    return { layout: arr };
  }),

  toggleVisible: (id) => set((s) => {
    const arr = s.layout.map((x) => (x.id === id ? { ...x, visible: !x.visible } : x));
    persist(arr);
    return { layout: arr };
  }),

  addComponent: (id, w = 4) => set((s) => {
    if (s.layout.some((x) => x.id === id)) return {};
    const maxY = s.layout.reduce((m, x) => (x.visible ? Math.max(m, x.y) : m), 0);
    const arr = [...s.layout, { id, x: 1, y: maxY + 1, w: clamp(w, 1, 12), visible: true }];
    persist(arr);
    return { layout: arr };
  }),

  removeComponent: (id) => set((s) => {
    const arr = s.layout.filter((x) => x.id !== id);
    persist(arr);
    return { layout: arr };
  }),

  resetLayout: () => set(() => {
    const arr = DEFAULT_LAYOUT.map((x) => ({ ...x }));
    persist(arr);
    return { layout: arr };
  }),
}));