import { create } from 'zustand';

const STORAGE_KEY = 'kakuki-home-layout';
export const GRID_COLS = 24;       // 24 半列（视觉 12 列，半列级吸附）
export const ROW_H = 92;           // 单行高度（px，与 globals --row-h 一致）
export const ROW_STEP = ROW_H + 16; // 行步长（含 gap）

/**
 * 自由布局 v3（看板式网格）：
 * 每张卡片 { id, x(半列 1..24), y(行), w(半列 1..24), h(占行数 1..4), visible }
 *  - 水平：半列吸附（比 12 列细一倍，位置更自由）
 *  - 垂直：固定行高（92px），拖到哪一行就是哪一行，位置精确对得齐
 *  - 高度：h 决定占几行，可整体调高/调低
 *  - 放置冲突：自动向下推挤（placeIn），空白位保留
 */

/** 各组件默认占行数（按内容量） */
const DEFAULT_H = {
  profile: 2, music: 3, leetcode: 3, talks: 2, projects: 2, categories: 2,
  quote: 2, todo: 2, palette: 2, countdown: 2,
  stats: 2, tags: 2, comments: 2, weather: 2,
};

const DEFAULT_LAYOUT = [
  { id: 'profile',   x: 1,  y: 1, w: 16, h: 2, visible: true },
  { id: 'music',     x: 1,  y: 3, w: 12, h: 3, visible: true },
  { id: 'leetcode',  x: 13, y: 3, w: 12, h: 3, visible: true },
  { id: 'talks',     x: 1,  y: 6, w: 8,  h: 2, visible: true },
  { id: 'projects',  x: 9,  y: 6, w: 8,  h: 2, visible: true },
  { id: 'categories',x: 17, y: 6, w: 8,  h: 2, visible: true },
  { id: 'quote',     x: 1,  y: 8, w: 24, h: 2, visible: true },
  { id: 'todo',      x: 1,  y: 10, w: 8, h: 2, visible: true },
  { id: 'palette',   x: 9,  y: 10, w: 8, h: 2, visible: true },
  { id: 'countdown', x: 17, y: 10, w: 8, h: 2, visible: true },
];

/** 杂志网格模板：不等宽交错 */
const MAGAZINE_LAYOUT = [
  { id: 'profile',   x: 1,  y: 1, w: 24, h: 2, visible: true },
  { id: 'music',     x: 1,  y: 3, w: 14, h: 3, visible: true },
  { id: 'weather',   x: 15, y: 3, w: 10, h: 3, visible: true },
  { id: 'stats',     x: 1,  y: 6, w: 10, h: 2, visible: true },
  { id: 'leetcode',  x: 11, y: 6, w: 14, h: 2, visible: true },
  { id: 'projects',  x: 1,  y: 8, w: 8,  h: 2, visible: true },
  { id: 'categories',x: 9,  y: 8, w: 8,  h: 2, visible: true },
  { id: 'comments',  x: 17, y: 8, w: 8,  h: 2, visible: true },
  { id: 'quote',     x: 1,  y: 10, w: 24, h: 2, visible: true },
];

const RETIRED_IDS = new Set(['pomodoro']);
const KNOWN_IDS = new Set([
  'profile', 'music', 'leetcode', 'talks', 'projects',
  'categories', 'quote', 'todo', 'palette', 'countdown',
  'stats', 'tags', 'comments', 'weather',
]);
// 一键整理时的默认顺序（先大类后小件）
const TIDY_ORDER = [
  'profile', 'music', 'leetcode', 'stats', 'weather',
  'talks', 'projects', 'categories', 'comments', 'tags',
  'todo', 'palette', 'countdown', 'quote',
];

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const overlap1d = (a1, a2, b1, b2) => a1 < b2 && a2 > b1;

function isLegacy(arr) {
  try {
    return Array.isArray(arr) && arr.some((x) => x && typeof x === 'object' && 'width' in x);
  } catch { return true; }
}

function normalize(item) {
  // v2(12 列) → v3(24 半列)：列/宽 ×2−1 / ×2；无 h 时按组件默认
  const isV2 = item && typeof item === 'object' && !('h' in item) && 'w' in item;
  const h = clamp(Math.round((isV2 ? DEFAULT_H[item.id] : item.h) || 2), 1, 4);
  if (isV2) {
    return {
      id: item.id,
      x: clamp(Math.round(item.x) * 2 - 1 || 1, 1, GRID_COLS),
      y: Math.max(1, Math.round(item.y) || 1),
      w: clamp(Math.round(item.w) * 2, 1, GRID_COLS),
      h,
      visible: item.visible !== false,
    };
  }
  return {
    id: item.id,
    x: clamp(Math.round(item.x) || 1, 1, GRID_COLS),
    y: Math.max(1, Math.round(item.y) || 1),
    w: clamp(Math.round(item.w) || 4, 1, GRID_COLS),
    h,
    visible: item.visible !== false,
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {
        if (isLegacy(parsed)) return DEFAULT_LAYOUT.map((x) => ({ ...x }));
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

/** 推挤式放置：把 id 放到 (x, y, w, h)。冲突卡自动向下移动（y 单调递增 → 必然终止） */
function placeIn(layout, id, x, y, w, h) {
  x = clamp(Math.round(x) || 1, 1, GRID_COLS);
  w = clamp(Math.round(w) || 4, 1, GRID_COLS);
  x = clamp(x, 1, GRID_COLS - w + 1);
  y = Math.max(1, Math.round(y) || 1);
  h = clamp(Math.round(h) || 1, 1, 4);

  // 全量拷贝（不可变）
  const arr = layout.map((it) => ({
    ...it,
    ...(it.id === id ? { x, y, w, h } : {}),
  }));

  const queue = [{ id, x, y, w, h }];
  let guard = 0;
  while (queue.length > 0 && guard < 80) {
    guard += 1;
    const cur = queue.shift();
    for (const it of arr) {
      if (it.id === cur.id || !it.visible) continue;
      const hit =
        it.y < cur.y + cur.h &&
        it.y + it.h > cur.y &&
        overlap1d(it.x, it.x + it.w, cur.x, cur.x + cur.w);
      if (hit) {
        it.y = cur.y + cur.h;
        it.x = clamp(it.x, 1, GRID_COLS - it.w + 1);
        queue.push({ id: it.id, x: it.x, y: it.y, w: it.w, h: it.h });
      }
    }
  }
  return arr;
}

/** 一键整理：按 TIDY_ORDER 流式重排（保持各自 w/h，行优先） */
function tidyLayout(layout) {
  const order = [...TIDY_ORDER, ...layout.map((x) => x.id).filter((id) => !TIDY_ORDER.includes(id))];
  const seen = new Set();
  const visible = order
    .filter((id) => layout.some((it) => it.id === id && it.visible) && !seen.has(id) && seen.add(id))
    .map((id) => layout.find((it) => it.id === id));

  let curX = 1;
  let curY = 1;
  let rowMaxH = 0;
  const placed = [];
  for (const it of visible) {
    if (curX + it.w > GRID_COLS + 1) {
      curY += rowMaxH;
      curX = 1;
      rowMaxH = 0;
    }
    placed.push({ ...it, x: curX, y: curY });
    curX += it.w;
    rowMaxH = Math.max(rowMaxH, it.h);
  }
  const hidden = layout.filter((it) => !it.visible);
  return [...placed, ...hidden];
}

export const useHomeLayout = create((set) => ({
  layout: load(),
  editing: false,
  setEditing: (v) => set({ editing: v }),

  preview: (id, patch) => set((s) => ({
    layout: s.layout.map((it) => (it.id === id ? { ...it, ...patch } : it)),
  })),

  /** 松手落定（位置，自动推挤） */
  placeAt: (id, x, y) => set((s) => {
    const self = s.layout.find((it) => it.id === id);
    if (!self) return {};
    const arr = placeIn(s.layout, id, x, y, self.w || 4, self.h || 2);
    persist(arr);
    return { layout: arr };
  }),

  /** 尺寸落定（宽/高由角拖手柄产生） */
  setSize: (id, w, h) => set((s) => {
    const self = s.layout.find((it) => it.id === id);
    if (!self) return {};
    const arr = placeIn(s.layout, id, self.x, self.y, clamp(w, 1, 24), clamp(h, 1, 4));
    persist(arr);
    return { layout: arr };
  }),

  move: (id, dir) => set((s) => {
    const self = s.layout.find((x) => x.id === id);
    if (!self) return {};
    const arr = placeIn(s.layout, id, self.x, Math.max(1, self.y + dir), self.w, self.h);
    persist(arr);
    return { layout: arr };
  }),

  toggleVisible: (id) => set((s) => {
    const arr = s.layout.map((x) => (x.id === id ? { ...x, visible: !x.visible } : x));
    persist(arr);
    return { layout: arr };
  }),

  addComponent: (id, w = 8, h) => set((s) => {
    if (s.layout.some((x) => x.id === id)) return {};
    const maxY = s.layout.reduce((m, x) => (x.visible ? Math.max(m, x.y + x.h) : m), 0);
    const arr = [...s.layout, { id, x: 1, y: maxY + 1, w: clamp(w, 1, 24), h: clamp(h || DEFAULT_H[id] || 2, 1, 4), visible: true }];
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

  /** 套用模板 */
  applyTemplate: (name) => set(() => {
    const src = name === 'magazine' ? MAGAZINE_LAYOUT : DEFAULT_LAYOUT;
    const arr = src.map((x) => ({ ...x }));
    persist(arr);
    return { layout: arr };
  }),

  /** 一键整理：按固定顺序流式重排 */
  tidy: () => set((s) => {
    const arr = tidyLayout(s.layout);
    persist(arr);
    return { layout: arr };
  }),
}));