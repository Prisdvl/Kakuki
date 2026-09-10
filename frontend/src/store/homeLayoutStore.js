import { create } from 'zustand';

const STORAGE_KEY = 'kakuki-home-layout';

// 宽度档位：third(1/3) · two-thirds(2/3) · full(1/1)
const WIDTH_ORDER = ['third', 'two-thirds', 'full'];

const DEFAULT_LAYOUT = [
  { id: 'profile', width: 'full', visible: true },
  { id: 'music', width: 'two-thirds', visible: true },
  { id: 'leetcode', width: 'third', visible: true },
  { id: 'talks', width: 'third', visible: true },
  { id: 'projects', width: 'third', visible: true },
  { id: 'categories', width: 'third', visible: true },
  { id: 'quote', width: 'full', visible: true },
  { id: 'todo', width: 'half', visible: true },
  { id: 'pomodoro', width: 'half', visible: true },
  { id: 'palette', width: 'half', visible: true },
  { id: 'countdown', width: 'half', visible: true },
];

// 兼容旧数据：wide → full，half → two-thirds
function normalizeWidth(w) {
  if (w === 'wide') return 'full';
  if (w === 'half') return 'two-thirds';
  return WIDTH_ORDER.includes(w) ? w : 'two-thirds';
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {
        return parsed.map((x) => ({ id: x.id, width: normalizeWidth(x.width), visible: x.visible !== false }));
      }
    }
  } catch { /* ignore */ }
  return DEFAULT_LAYOUT.map((x) => ({ ...x }));
}

function persist(arr) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); } catch { /* ignore */ }
}

export const useHomeLayout = create((set) => ({
  layout: load(),
  editing: false,
  setEditing: (v) => set({ editing: v }),
  move: (id, dir) => set((s) => {
    const idx = s.layout.findIndex((x) => x.id === id);
    const ni = idx + dir;
    if (idx < 0 || ni < 0 || ni >= s.layout.length) return {};
    const arr = [...s.layout];
    const [item] = arr.splice(idx, 1);
    arr.splice(ni, 0, item);
    persist(arr);
    return { layout: arr };
  }),
  moveTo: (id, targetId) => set((s) => {
    const arr = [...s.layout];
    const from = arr.findIndex((x) => x.id === id);
    if (from < 0 || arr.some((x) => x.id === targetId) === false) return {};
    if (id === targetId) return {};
    const [item] = arr.splice(from, 1);
    const targetPos = arr.findIndex((x) => x.id === targetId);
    if (targetPos < 0) return {};
    arr.splice(targetPos, 0, item);
    persist(arr);
    return { layout: arr };
  }),
  setWidth: (id, width) => set((s) => {
    const arr = s.layout.map((x) => (x.id === id ? { ...x, width } : x));
    persist(arr);
    return { layout: arr };
  }),
  cycleWidth: (id) => set((s) => {
    const arr = s.layout.map((x) => {
      if (x.id !== id) return x;
      const next = WIDTH_ORDER[(WIDTH_ORDER.indexOf(normalizeWidth(x.width)) + 1) % WIDTH_ORDER.length];
      return { ...x, width: next };
    });
    persist(arr);
    return { layout: arr };
  }),
  toggleVisible: (id) => set((s) => {
    const arr = s.layout.map((x) => (x.id === id ? { ...x, visible: !x.visible } : x));
    persist(arr);
    return { layout: arr };
  }),
  addComponent: (id, width) => set((s) => {
    if (s.layout.some((x) => x.id === id)) return {};
    const arr = [...s.layout, { id, width: width || 'two-thirds', visible: true }];
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
