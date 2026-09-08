import { create } from 'zustand';

const STORAGE_KEY = 'kakuki-home-layout';

const DEFAULT_LAYOUT = [
  { id: 'profile', width: 'wide', visible: true },
  { id: 'music', width: 'wide', visible: true },
  { id: 'leetcode', width: 'half', visible: true },
  { id: 'talks', width: 'half', visible: true },
  { id: 'projects', width: 'half', visible: true },
  { id: 'categories', width: 'half', visible: true },
  { id: 'quote', width: 'wide', visible: true },
  { id: 'todo', width: 'half', visible: true },
  { id: 'pomodoro', width: 'half', visible: true },
  { id: 'palette', width: 'half', visible: true },
  { id: 'countdown', width: 'half', visible: true },
];

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {
        return parsed.map((x) => ({ id: x.id, width: x.width === 'wide' ? 'wide' : 'half', visible: x.visible !== false }));
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
  toggleVisible: (id) => set((s) => {
    const arr = s.layout.map((x) => (x.id === id ? { ...x, visible: !x.visible } : x));
    persist(arr);
    return { layout: arr };
  }),
  addComponent: (id, width) => set((s) => {
    if (s.layout.some((x) => x.id === id)) return {};
    const arr = [...s.layout, { id, width: width || 'half', visible: true }];
    persist(arr);
    return { layout: arr };
  }),
  removeComponent: (id) => set((s) => {
    const arr = s.layout.filter((x) => x.id !== id);
    persist(arr);
    return { layout: arr };
  }),
  resetLayout: () => set({ layout: DEFAULT_LAYOUT.map((x) => ({ ...x })) }),
}));
