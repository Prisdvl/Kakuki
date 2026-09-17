import { create } from 'zustand';

const DEFAULT_BG = null;
// 默认主题：黑白水墨色（中性墨灰，低饱和，避免被强制提饱和）
const DEFAULT_COLOR = '#2b3036';

const getInitialTheme = () => {
  const stored = localStorage.getItem('kakuki-theme');
  if (stored) return stored === 'dark';
  return true;
};

const getStoredBackground = () => {
  try {
    const stored = localStorage.getItem('kakuki-bg');
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h * 360, s * 100, l * 100];
}

function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  if (s === 0) { const v = l * 255; return [v, v, v]; }
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue2rgb(p, q, h + 1 / 3) * 255, hue2rgb(p, q, h) * 255, hue2rgb(p, q, h - 1 / 3) * 255];
}

const rgbToHex = (r, g, b) =>
  '#' + [r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');

const hexToRgb = (hex) => {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

function rgba(hex, alpha) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function adjustLightness(hex, delta) {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const newL = clamp(l + delta, 0, 100);
  const [nr, ng, nb] = hslToRgb(h, s, newL);
  return rgbToHex(nr, ng, nb);
}

function withSaturation(hex, s) {
  const [r, g, b] = hexToRgb(hex);
  const [h, , l] = rgbToHsl(r, g, b);
  const [nr, ng, nb] = hslToRgb(h, s, l);
  return rgbToHex(nr, ng, nb);
}

function getContrastText(hex) {
  const [r, g, b] = hexToRgb(hex);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#1e1b4b' : '#ffffff';
}

/**
 * 计算“位于强调色背景之上”的前景文字色。
 * 双向比较白色与深墨色在强调色上的 WCAG 对比度：任意可达 4.5:1 则选用，否则取更优者，
 * 保证任何自定义/图片提取的强调色下按钮文字都清晰可辨。
 */
function pickOnAccentText(accentHex) {
  const lum = getRelativeLuminance(accentHex);
  const whiteRatio = 1.05 / (lum + 0.05);
  const darkLum = getRelativeLuminance('#1e1b4b');
  const darkRatio = (lum + 0.05) / (darkLum + 0.05);
  if (whiteRatio >= 4.5) return '#ffffff';
  if (darkRatio >= 4.5) return '#1e1b4b';
  return whiteRatio >= darkRatio ? '#ffffff' : '#1e1b4b';
}

function getRelativeLuminance(hex) {
  const [r, g, b] = hexToRgb(hex);
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(fgHex, bgHex) {
  const l1 = getRelativeLuminance(fgHex);
  const l2 = getRelativeLuminance(bgHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** 把不透明色 overHex 以 alpha 压在 baseHex 之上，返回混色后的 hex */
function compositeOver(baseHex, overHex, alpha) {
  const [or_, og, ob] = hexToRgb(overHex);
  const [br, bg, bb] = hexToRgb(baseHex);
  const mix = (o, b) => Math.round(o * alpha + b * (1 - alpha));
  return rgbToHex(mix(or_, br), mix(og, bg), mix(ob, bb));
}

/**
 * 半透明前景压在背景上的**实际**对比度。
 *
 * WCAG 判定的是肉眼看到的颜色，所以必须先把 alpha 混进背景再算比值 ——
 * 直接拿不透明原色算，会把 4.5:1 悄悄降成 2.9:1（浅色下 alpha 0.66 尤其严重）。
 */
function getBlendedContrastRatio(rgbTriple, alpha, bgHex) {
  const [br, bg, bb] = hexToRgb(bgHex);
  const mix = (o, b) => Math.round(o * alpha + b * (1 - alpha));
  return getContrastRatio(rgbToHex(mix(rgbTriple[0], br), mix(rgbTriple[1], bg), mix(rgbTriple[2], bb)), bgHex);
}

function ensureContrast(fgHex, bgHex, minRatio, isDark) {
  const current = getContrastRatio(fgHex, bgHex);
  if (current >= minRatio) return fgHex;

  const [r, g, b] = hexToRgb(fgHex);
  const [h, s, l] = rgbToHsl(r, g, b);

  let newL = l;
  let newS = s;
  let ratio = current;
  let iterations = 0;
  const maxIterations = 20;

  if (isDark) {
    while (ratio < minRatio && iterations < maxIterations) {
      newL = clamp(newL + 3, 0, 100);
      if (newL >= 95) break;
      if (newS > 40) newS = Math.max(20, newS - 2);
      const adj = hslToHex(h, newS, newL);
      ratio = getContrastRatio(adj, bgHex);
      iterations++;
    }
  } else {
    while (ratio < minRatio && iterations < maxIterations) {
      newL = clamp(newL - 3, 0, 100);
      if (newL <= 8) break;
      if (newS > 40) newS = Math.max(20, newS - 2);
      const adj = hslToHex(h, newS, newL);
      ratio = getContrastRatio(adj, bgHex);
      iterations++;
    }
  }

  return hslToHex(h, newS, newL);
}

function ensureAlphaContrast(fgColor, bgHex, minRatio, isDark) {
  if (fgColor.startsWith('#')) {
    return ensureContrast(fgColor, bgHex, minRatio, isDark);
  }
  // 注意：必须用 'rgb' 而不是 'rgb(' —— rgba(...) 前四字符是 'rgba'，
  // 与 'rgb(' 不匹配，会导致整条 alpha 分支被静默跳过。
  if (fgColor.startsWith('rgb')) {
    const match = fgColor.match(/rgba?\(([^)]+)\)/);
    if (!match) return fgColor;
    const parts = match[1].split(',').map((p) => parseFloat(p.trim()));
    const [r, g, b] = parts;
    const alpha = parts.length === 4 ? parts[3] : 1;
    if (alpha >= 0.999) return ensureContrast(rgbToHex(r, g, b), bgHex, minRatio, isDark);

    // 不透明原色达标 ≠ 观感达标：alpha 会把前景往背景方向拉。
    // 这里逐步抬高「不透明色目标」，直到**混色后**的比值真正满足 minRatio。
    let base = rgbToHex(r, g, b);
    let target = minRatio;
    for (let i = 0; i < 10; i += 1) {
      base = ensureContrast(rgbToHex(r, g, b), bgHex, target, isDark);
      const triple = hexToRgb(base);
      if (getBlendedContrastRatio(triple, alpha, bgHex) >= minRatio) break;
      target += 1.5;
    }
    const [ar, ag, ab] = hexToRgb(base);
    return `rgba(${ar}, ${ag}, ${ab}, ${alpha})`;
  }
  return fgColor;
}

/**
 * Android Palette-style vibrant color extraction
 * Outputs 6 semantic colors: Vibrant, DarkVibrant, LightVibrant, Muted, DarkMuted, LightMuted
 */
function extractVibrantPalette(imageData) {
  const pixelCount = imageData.length / 4;

  // Quantize colors into 4x4x4 = 64 bins
  const bins = {};
  const binSize = 64;
  const weights = [];

  for (let i = 0; i < pixelCount; i++) {
    const r = imageData[i * 4];
    const g = imageData[i * 4 + 1];
    const b = imageData[i * 4 + 2];
    const a = imageData[i * 4 + 3];

    if (a < 125) continue;

    const br = Math.floor(r / binSize);
    const bg = Math.floor(g / binSize);
    const bb = Math.floor(b / binSize);
    const key = `${br}-${bg}-${bb}`;

    if (!bins[key]) {
      bins[key] = { count: 0, r: 0, g: 0, b: 0 };
    }
    bins[key].count++;
    bins[key].r += r;
    bins[key].g += g;
    bins[key].b += b;
  }

  // Get color clusters sorted by frequency
  const clusters = Object.values(bins)
    .map((c) => ({
      count: c.count,
      r: Math.round(c.r / c.count),
      g: Math.round(c.g / c.count),
      b: Math.round(c.b / c.count),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  if (clusters.length === 0) {
    return generateVibrantPalette(DEFAULT_COLOR);
  }

  // Classify each cluster by HSL
  const classified = clusters.map((c) => {
    const [h, s, l] = rgbToHsl(c.r, c.g, c.b);
    return {
      ...c,
      h, s, l,
      hex: rgbToHex(c.r, c.g, c.b),
      saturationScore: computeSaturationScore(s),
      lightnessScore: computeLightnessScore(l),
    };
  });

  // Find the most vibrant color (high saturation, medium lightness)
  const vibrant = findBestColor(classified, 'VIBRANT');
  const darkVibrant = findBestColor(classified, 'DARK_VIBRANT', vibrant);
  const lightVibrant = findBestColor(classified, 'LIGHT_VIBRANT', vibrant);
  const muted = findBestColor(classified, 'MUTED', vibrant);
  const darkMuted = findBestColor(classified, 'DARK_MUTED', muted);
  const lightMuted = findBestColor(classified, 'LIGHT_MUTED', muted);

  return {
    Vibrant: vibrant?.hex || DEFAULT_COLOR,
    DarkVibrant: darkVibrant?.hex || adjustLightness(vibrant?.hex || DEFAULT_COLOR, -20),
    LightVibrant: lightVibrant?.hex || adjustLightness(vibrant?.hex || DEFAULT_COLOR, 15),
    Muted: muted?.hex || withSaturation(vibrant?.hex || DEFAULT_COLOR, 50),
    DarkMuted: darkMuted?.hex || adjustLightness(withSaturation(vibrant?.hex || DEFAULT_COLOR, 45), -15),
    LightMuted: lightMuted?.hex || adjustLightness(withSaturation(vibrant?.hex || DEFAULT_COLOR, 45), 15),
  };
}

function computeSaturationScore(s) {
  // Peak at s=70, good range 40-90
  if (s < 15) return 0;
  if (s < 40) return s * 0.5;
  if (s < 70) return s;
  if (s < 95) return s * 0.8 + 14;
  return Math.max(0, 100 - s);
}

function computeLightnessScore(l) {
  // Peak at l=50, good range 25-75
  if (l < 5) return 0;
  if (l < 25) return l * 2;
  if (l < 50) return l;
  if (l < 75) return 75 - l * 0.5;
  return Math.max(0, 100 - l);
}

function computeDarkScore(l) {
  if (l < 10) return 0;
  if (l < 35) return l * 2;
  if (l < 55) return Math.max(0, 70 - l);
  return Math.max(0, 50 - (l - 55) * 2);
}

function computeLightScore(l) {
  if (l > 95) return 0;
  if (l > 65) return (100 - l) * 1.5;
  if (l > 45) return l * 0.5;
  return Math.max(0, l);
}

function computeMutedScore(s, l) {
  // Prefer low saturation (20-50), medium lightness
  if (s < 10) return 0;
  const satScore = s < 30 ? s : Math.max(0, 60 - s);
  const lightScore = l > 20 && l < 80 ? 100 - Math.abs(l - 50) * 0.6 : 0;
  return satScore * 0.7 + lightScore * 0.3;
}

function findBestColor(clusters, type, exclude) {
  const excludeHex = exclude?.hex;
  let best = null;
  let bestScore = -Infinity;

  for (const c of clusters) {
    if (c.hex === excludeHex) continue;

    let score;
    switch (type) {
      case 'VIBRANT':
        score = c.saturationScore * 0.6 + c.lightnessScore * 0.4 + c.count * 0.001;
        break;
      case 'DARK_VIBRANT':
        score = c.saturationScore * 0.4 + computeDarkScore(c.l) * 0.6 + c.count * 0.001;
        break;
      case 'LIGHT_VIBRANT':
        score = c.saturationScore * 0.4 + computeLightScore(c.l) * 0.6 + c.count * 0.001;
        break;
      case 'MUTED':
        score = computeMutedScore(c.s, c.l) * 0.7 + c.count * 0.001;
        break;
      case 'DARK_MUTED':
        score = computeMutedScore(c.s, c.l) * 0.4 + computeDarkScore(c.l) * 0.6 + c.count * 0.001;
        break;
      case 'LIGHT_MUTED':
        score = computeMutedScore(c.s, c.l) * 0.4 + computeLightScore(c.l) * 0.6 + c.count * 0.001;
        break;
      default:
        score = 0;
    }

    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }

  return best;
}

function generateVibrantPalette(hex) {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  // 低饱和色（如水墨灰）保持低饱和，不被强制提饱和；彩色才提升至鲜亮
  const lowSat = s <= 38;
  const sSat = lowSat ? clamp(s, 0, 20) : clamp(s, 55, 85);
  const lSat = lowSat ? clamp(l, 28, 48) : clamp(l, 40, 55);

  return {
    Vibrant: hslToHex(h, sSat, lSat),
    DarkVibrant: hslToHex(h, sSat, clamp(lSat - 18, 18, 40)),
    LightVibrant: hslToHex(h, lowSat ? clamp(s, 0, 16) : clamp(s * 0.7, 30, 55), clamp(lSat + 18, 55, 80)),
    Muted: hslToHex(h, lowSat ? clamp(s, 0, 14) : clamp(s * 0.55, 20, 50), clamp(lSat, 40, 65)),
    DarkMuted: hslToHex(h, lowSat ? clamp(s, 0, 12) : clamp(s * 0.45, 15, 40), clamp(lSat - 15, 22, 45)),
    LightMuted: hslToHex(h, lowSat ? clamp(s, 0, 12) : clamp(s * 0.5, 15, 40), clamp(lSat + 15, 55, 82)),
  };
}

function hslToHex(h, s, l) {
  const [r, g, b] = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

/**
 * 生成“比主题色淡”的页面底色：保留主题色色相，显著降低饱和度并拉高/压低亮度。
 * 亮色模式 → 近白淡彩（96% 亮度）；暗色模式 → 近黑淡彩（6% 亮度）。
 * 这样任意主题色下背景都柔和、带有主题色氛围，且文字辨识度由 ensureContrast 兜底。
 */
function getTintedBackground(accentHex, isDark) {
  const [r, g, b] = hexToRgb(accentHex);
  const [h, s] = rgbToHsl(r, g, b);
  if (isDark) {
    return hslToHex(h, clamp(s * 0.22, 10, 28), 6);
  }
  return hslToHex(h, clamp(s * 0.28, 12, 34), 96);
}

function extractDominantColorFallback(imageSrc) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = async () => {
      try {
        if (img.decode) { try { await img.decode(); } catch {} }

        const canvas = document.createElement('canvas');
        const size = 64;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;
        if (!w || !h) { resolve(generateVibrantPalette(DEFAULT_COLOR)); return; }

        const scale = Math.min(size / w, size / h);
        const sw = Math.max(1, Math.floor(w * scale));
        const sh = Math.max(1, Math.floor(h * scale));
        const ox = Math.floor((size - sw) / 2);
        const oy = Math.floor((size - sh) / 2);
        ctx.drawImage(img, ox, oy, sw, sh);

        let data;
        try { data = ctx.getImageData(0, 0, size, size).data; }
        catch { resolve(generateVibrantPalette(DEFAULT_COLOR)); return; }

        // 将颜色量化工作推迟到下一帧，避免阻塞主线程
        const runExtraction = () => {
          try {
            const palette = extractVibrantPalette(data);
            resolve(palette);
          } catch {
            resolve(generateVibrantPalette(DEFAULT_COLOR));
          }
        };

        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(runExtraction, { timeout: 300 });
        } else {
          setTimeout(runExtraction, 0);
        }
      } catch {
        resolve(generateVibrantPalette(DEFAULT_COLOR));
      }
    };
    img.onerror = () => resolve(generateVibrantPalette(DEFAULT_COLOR));
    img.src = imageSrc;
  });
}

function buildThemeVars(palette, isDark) {
  const { Vibrant, DarkVibrant, LightVibrant, Muted, DarkMuted, LightMuted } = palette;

  const successColor = isDark ? '#4ade80' : '#22c55e';
  const warningColor = isDark ? '#d9a441' : '#a16207';
  const errorColor = isDark ? '#c98a8a' : '#a33a3a';
  const infoColor = isDark ? '#60a5fa' : '#3b82f6';

  // 页面底色跟随主题色、但比主题色淡（保留色相、压低饱和与明暗差）
  const bgPrimary = getTintedBackground(Vibrant, isDark);

  // 文字实际绝大多数落在**玻璃**上，而不是页面底色上。
  // 两层玻璃比单层更极端：浅色主题下叠出来更暗（#f4f5f6 → #a9b1bb）、
  // 深色主题下换用强玻璃更亮（#0e0f11 → #282c30）。两个方向都会压低对比度，
  // 所以标定基准取这个「最差底色」，否则状态栏 / 播放条 / 卡片内玻璃块上的小字会糊掉
  // （实测浅色 --text-tertiary 只有 2.9:1、深色 3.18:1）。
  const GLASS_ALPHA = isDark ? 0.42 : 0.4;
  const GLASS_BASE = isDark ? DarkMuted : LightMuted;
  const cardBg = compositeOver(bgPrimary, GLASS_BASE, GLASS_ALPHA);
  const stackedBg = compositeOver(bgPrimary, GLASS_BASE, isDark ? 0.72 : 0.64);

  const textPrimaryRaw = isDark ? LightVibrant : DarkVibrant;
  const textSecondaryRaw = isDark ? Vibrant : Muted;
  const accentRaw = Vibrant;
  const accentLightRaw = LightVibrant;
  const accentSecondaryRaw = LightVibrant;
  const mutedRaw = Muted;

  const textPrimary = ensureContrast(textPrimaryRaw, stackedBg, 7, isDark);
  const textSecondary = ensureContrast(textSecondaryRaw, stackedBg, 5, isDark);
  // accent 同样按 stackedBg 标定：accent 大量用作**文字色**（导航 active、链接、
  // 徽章、active 行标题），而它实际落在玻璃底上 —— 只按 bgPrimary 标定时，
  // 深色下 accent(111,125,139) 在玻璃底(45~54)上只有 2.9~4.4:1，成片边缘失达标。
  const accent = ensureContrast(accentRaw, stackedBg, 4.5, isDark);
  const accentLight = ensureContrast(accentLightRaw, bgPrimary, 3, isDark);
  const accentSecondary = ensureContrast(accentSecondaryRaw, bgPrimary, 3, isDark);
  const muted = ensureContrast(mutedRaw, bgPrimary, 3, isDark);

  // 强调色背景之上的文字色：按强调色亮度自动取白/深，保证 4.5:1
  const onAccent = pickOnAccentText(accent);

  return {
    accent,
    onAccent,
    accentSoft: rgba(accent, isDark ? 0.16 : 0.15),
    accentGlow: rgba(accent, 0.25),
    accentSecondary,
    accentDark: ensureContrast(DarkVibrant, bgPrimary, 3, isDark),
    accentLight,
    muted,
    darkMuted: DarkMuted,
    lightMuted: LightMuted,

    glassBg: isDark ? rgba(DarkMuted, 0.36) : rgba(LightMuted, 0.36),
    glassBgStrong: isDark ? rgba(DarkMuted, 0.64) : rgba(LightMuted, 0.62),
    // 实底档：固定条（状态栏）专用。半透明玻璃叠在滚过的任意内容上，
    // 文字对比度不可控，必须用 0.94+ 的不透明档（浅色偏白、深色偏黑）。
    glassBgStrongSolid: isDark ? 'rgba(24, 24, 28, 0.95)' : 'rgba(255, 255, 255, 0.94)',
    glassBorder: isDark ? rgba(accent, 0.3) : rgba(accent, 0.26),
    glassShadow: isDark
      ? `0 8px 32px ${rgba(DarkVibrant, 0.4)}`
      : `0 8px 32px ${rgba(accent, 0.08)}`,
    glassShadowHover: isDark
      ? `0 16px 48px ${rgba(DarkVibrant, 0.5)}`
      : `0 16px 48px ${rgba(accent, 0.12)}`,

    bgPrimary,
    bgSecondary: rgba(accent, isDark ? 0.12 : 0.07),
    bgTertiary: rgba(accent, isDark ? 0.08 : 0.09),

    textPrimary,
    textSecondary,
    // 3:1 是「大字号/装饰性文字」的下限；tertiary 大量用于 11~14px 的元信息，
    // 必须按正文标准 4.5:1。目标设 5.2 留余量：实际底色偶尔比 stackedBg 估算亮
    // （关于页标签玻璃 53~66、行内 code），4.5/4.8 都会在边缘差 0.03~0.2。
    // alpha 也不能太低：浅色主题下 0.66 会把深色前景稀释回背景，吃掉近 1 个档位。
    textTertiary: ensureAlphaContrast(rgba(accent, isDark ? 0.88 : 0.78), stackedBg, 5.2, isDark),
    border: rgba(accent, isDark ? 0.22 : 0.28),

    heroOverlay: isDark ? rgba(DarkMuted, 0.6) : rgba(LightMuted, 0.6),
    // 统一卡面：全站所有卡片容器（tilt-card / .glass / article-card / toc /
    // antd input…）共用这一张面。0.82 近实底——透色残留 ≤18%，装饰层位置
    // 不再决定卡片色调（此前 Vibrant 0.45~0.5 透色让文章卡发紫、玻璃卡随
    // 所处位置忽灰忽粉）；中性白/黑适配两套主题，氛围交给页面背景与 accent。
    cardBg: isDark ? 'rgba(26, 26, 30, 0.82)' : 'rgba(255, 255, 255, 0.82)',
    cardHoverBorder: rgba(Vibrant, 0.3),

    success: ensureContrast(successColor, bgPrimary, 3, isDark),
    successSoft: rgba(ensureContrast(successColor, bgPrimary, 3, isDark), 0.15),
    warning: ensureContrast(warningColor, bgPrimary, 3, isDark),
    warningSoft: rgba(ensureContrast(warningColor, bgPrimary, 3, isDark), 0.15),
    error: ensureContrast(errorColor, bgPrimary, 3, isDark),
    errorSoft: rgba(ensureContrast(errorColor, bgPrimary, 3, isDark), 0.15),
    info: ensureContrast(infoColor, bgPrimary, 3, isDark),
    infoSoft: rgba(ensureContrast(infoColor, bgPrimary, 3, isDark), 0.15),
    white: '#ffffff',
    surface1: isDark ? rgba(DarkMuted, 0.8) : '#ffffffcc',
    surface2: isDark ? rgba(DarkMuted, 0.6) : '#ffffff99',
    surface3: isDark ? rgba(DarkMuted, 0.4) : '#ffffff66',
    // 热力图色阶：空 → 满 必须**同色系递进**才读得出来。
    // 原先 level0/level1 是同一色相只差透明度（0.2 → 0.4），肉眼几乎分不出，
    // 导致"打了卡"和"没打卡"看起来一样。改为统一由 accent 派生 5 档，
    // 同时让热力图跟随用户选的主题色。
    heatEmpty: isDark ? rgba(LightVibrant, 0.14) : rgba(accent, 0.09),
    heatLevel1: rgba(accent, isDark ? 0.34 : 0.28),
    heatLevel2: rgba(accent, isDark ? 0.56 : 0.50),
    heatLevel3: rgba(accent, isDark ? 0.78 : 0.74),
    heatLevel4: accent,
    leetcodeEasy: ensureContrast(isDark ? '#2dd4bf' : '#00b8a3', bgPrimary, 3, isDark),
    leetcodeMedium: ensureContrast(isDark ? '#fbbf24' : '#ffb700', bgPrimary, 3, isDark),
    leetcodeHard: ensureContrast(isDark ? '#f87171' : '#ff375f', bgPrimary, 3, isDark),

    // 星光视差背景（随主题明暗自适应：星点用文本色系，克制不喧宾）
    starColor: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(15,20,30,0.32)',
    starColorDim: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(15,20,30,0.15)',
    starfieldOpacity: isDark ? 0.8 : 0.45,
  };
}

function applyThemeVars(vars) {
  const root = document.documentElement;
  root.style.setProperty('--accent', vars.accent);
  root.style.setProperty('--on-accent', vars.onAccent);
  root.style.setProperty('--accent-soft', vars.accentSoft);
  root.style.setProperty('--accent-glow', vars.accentGlow);
  root.style.setProperty('--accent-secondary', vars.accentSecondary);
  root.style.setProperty('--accent-dark', vars.accentDark);
  root.style.setProperty('--accent-light', vars.accentLight);
  root.style.setProperty('--muted', vars.muted);
  root.style.setProperty('--dark-muted', vars.darkMuted);
  root.style.setProperty('--light-muted', vars.lightMuted);

  root.style.setProperty('--glass-bg', vars.glassBg);
  root.style.setProperty('--glass-bg-strong', vars.glassBgStrong);
  root.style.setProperty('--glass-bg-strong-solid', vars.glassBgStrongSolid);
  root.style.setProperty('--glass-border', vars.glassBorder);
  root.style.setProperty('--glass-shadow', vars.glassShadow);
  root.style.setProperty('--glass-shadow-hover', vars.glassShadowHover);

  root.style.setProperty('--bg-primary', vars.bgPrimary);
  root.style.setProperty('--bg-secondary', vars.bgSecondary);
  root.style.setProperty('--bg-tertiary', vars.bgTertiary);

  root.style.setProperty('--text-primary', vars.textPrimary);
  root.style.setProperty('--text-secondary', vars.textSecondary);
  root.style.setProperty('--text-tertiary', vars.textTertiary);
  root.style.setProperty('--border', vars.border);

  root.style.setProperty('--hero-overlay', vars.heroOverlay);
  root.style.setProperty('--card-bg', vars.cardBg);
  root.style.setProperty('--card-hover-border', vars.cardHoverBorder);

  root.style.setProperty('--success', vars.success);
  root.style.setProperty('--success-soft', vars.successSoft);
  root.style.setProperty('--warning', vars.warning);
  root.style.setProperty('--warning-soft', vars.warningSoft);
  root.style.setProperty('--error', vars.error);
  root.style.setProperty('--error-soft', vars.errorSoft);
  root.style.setProperty('--info', vars.info);
  root.style.setProperty('--info-soft', vars.infoSoft);
  root.style.setProperty('--white', vars.white);
  root.style.setProperty('--surface-1', vars.surface1);
  root.style.setProperty('--surface-2', vars.surface2);
  root.style.setProperty('--surface-3', vars.surface3);
  root.style.setProperty('--heat-empty', vars.heatEmpty);
  root.style.setProperty('--heat-level-1', vars.heatLevel1);
  root.style.setProperty('--heat-level-2', vars.heatLevel2);
  root.style.setProperty('--heat-level-3', vars.heatLevel3);
  root.style.setProperty('--heat-level-4', vars.heatLevel4);
  root.style.setProperty('--leetcode-easy', vars.leetcodeEasy);
  root.style.setProperty('--star-color', vars.starColor);
  root.style.setProperty('--star-color-dim', vars.starColorDim);
  root.style.setProperty('--starfield-opacity', vars.starfieldOpacity);
  root.style.setProperty('--leetcode-medium', vars.leetcodeMedium);
  root.style.setProperty('--leetcode-hard', vars.leetcodeHard);

  const bgImageLayer = document.querySelector('.bg-image-layer');
  if (bgImageLayer) {
    if (vars.bgImage) {
      const img = new Image();
      img.onload = () => {
        bgImageLayer.style.backgroundImage = `url(${vars.bgImage})`;
        bgImageLayer.classList.add('loaded');
      };
      img.src = vars.bgImage;
    } else {
      bgImageLayer.style.backgroundImage = '';
      bgImageLayer.classList.remove('loaded');
    }
  }
}

const applyTheme = (isDark) => {
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

const defaultPalette = generateVibrantPalette(DEFAULT_COLOR);

// Initialize theme synchronously at module load time
const _initialIsDark = getInitialTheme();
applyTheme(_initialIsDark);

const _storedBg = getStoredBackground();
let _initialPalette = defaultPalette;
let _initialBgImage = null;

if (_storedBg) {
  _initialBgImage = _storedBg.image || null;
  if (_storedBg.palette && !Array.isArray(_storedBg.palette) && _storedBg.palette.Vibrant) {
    _initialPalette = _storedBg.palette;
  } else if (_storedBg.color) {
    _initialPalette = generateVibrantPalette(_storedBg.color);
  }
} else {
  try {
    const raw = localStorage.getItem('kakuki-color');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.palette && !Array.isArray(parsed.palette) && parsed.palette.Vibrant) {
        _initialPalette = parsed.palette;
      } else if (parsed?.color) {
        _initialPalette = generateVibrantPalette(parsed.color);
      }
    }
  } catch {}
}

try {
  const _vars = buildThemeVars(_initialPalette, _initialIsDark);
  applyThemeVars({ ..._vars, bgImage: _initialBgImage });
} catch (e) {
  console.error('Theme init error:', e);
}

const useThemeStore = create((set, get) => ({
  isDark: _initialIsDark,
  bgImage: _initialBgImage,
  themeColor: _initialPalette.Vibrant || DEFAULT_COLOR,
  colorPalette: _initialPalette,
  isInitialized: true,

  toggleTheme: () =>
    set((state) => {
      const next = !state.isDark;
      localStorage.setItem('kakuki-theme', next ? 'dark' : 'light');
      applyTheme(next);
      const vars = buildThemeVars(state.colorPalette, next);
      applyThemeVars({ ...vars, bgImage: state.bgImage });
      return { isDark: next };
    }),

  /**
   * 请求切换主题（带扩散动画）。
   * 动画由 AppLayout 的遮罩承载（需要真实 DOM 坐标），因此这里只广播意图事件，
   * 避免设置面板等任意入口绕过动画直接切换。AppLayout 未挂载时会兜底直接切换。
   * @param {Element} [origin] 实际被按下的元素 —— 扩散圆心取它的中心，
   *        这样无论从导航栏还是设置面板触发，颜色都从"按下位置"散开。
   */
  requestThemeToggle: (origin) => {
    const evt = new CustomEvent('kakuki:request-theme-toggle', {
      cancelable: true,
      detail: { origin: origin || null },
    });
    const handled = !window.dispatchEvent(evt);
    if (!handled) get().toggleTheme();
  },

  setTheme: (isDark) => {
    localStorage.setItem('kakuki-theme', isDark ? 'dark' : 'light');
    applyTheme(isDark);
    const state = get();
    const vars = buildThemeVars(state.colorPalette, isDark);
    applyThemeVars({ ...vars, bgImage: state.bgImage });
    set({ isDark });
  },

  uploadBackground: async (file) => {
    try {
      const imageDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      const img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Failed to load image'));
        image.src = imageDataUrl;
      });

      if (img.decode) {
        try { await img.decode(); } catch {}
      }

      // 压缩图片：限制尺寸并降低质量，减少 localStorage 与渲染开销
      const MAX_W = 1280;
      const MAX_H = 800;
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;

      let scale = 1;
      if (w > MAX_W || h > MAX_H) {
        scale = Math.min(MAX_W / w, MAX_H / h);
      }
      const outW = Math.round(w * scale);
      const outH = Math.round(h * scale);

      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, outW, outH);

      const compressedUrl = canvas.toDataURL('image/jpeg', 0.72);

      // 先应用压缩后的背景，让用户立即看到变化
      const state = get();
      set({
        bgImage: compressedUrl,
      });
      applyThemeVars({ ...buildThemeVars(state.colorPalette, state.isDark), bgImage: compressedUrl });

      // 异步提取主题色，避免阻塞主线程
      const palette = await extractDominantColorFallback(imageDataUrl);

      try {
        const bgData = { image: compressedUrl, color: palette.Vibrant, palette };
        localStorage.setItem('kakuki-bg', JSON.stringify(bgData));
      } catch {
        const paletteData = { color: palette.Vibrant, palette };
        localStorage.setItem('kakuki-color', JSON.stringify(paletteData));
      }

      const vars = buildThemeVars(palette, state.isDark);
      applyThemeVars({ ...vars, bgImage: compressedUrl });

      set({
        bgImage: compressedUrl,
        themeColor: palette.Vibrant,
        colorPalette: palette,
      });

      return { color: palette.Vibrant, palette };
    } catch (err) {
      console.error('uploadBackground error:', err);
      throw err;
    }
  },

  setThemeColor: (color) => {
    const palette = generateVibrantPalette(color);
    const state = get();

    const vars = buildThemeVars(palette, state.isDark);
    applyThemeVars({ ...vars, bgImage: state.bgImage });

    const stored = getStoredBackground();
    if (stored) {
      const bgData = { ...stored, color, palette };
      localStorage.setItem('kakuki-bg', JSON.stringify(bgData));
    } else {
      localStorage.setItem('kakuki-color', JSON.stringify({ color, palette }));
    }

    set({
      themeColor: color,
      colorPalette: palette,
    });
  },

  clearBackground: () => {
    localStorage.removeItem('kakuki-bg');
    const state = get();
    const vars = buildThemeVars(defaultPalette, state.isDark);
    applyThemeVars({ ...vars, bgImage: null });
    set({
      bgImage: DEFAULT_BG,
      themeColor: DEFAULT_COLOR,
      colorPalette: defaultPalette,
    });
  },

  initTheme: () => {
    const isDark = getInitialTheme();
    applyTheme(isDark);

    const stored = getStoredBackground();
    let palette = defaultPalette;
    let bgImage = null;
    let storedColor = null;

    if (stored) {
      storedColor = stored.color || DEFAULT_COLOR;
      if (stored.palette && !Array.isArray(stored.palette) && stored.palette.Vibrant) {
        palette = stored.palette;
      } else {
        palette = generateVibrantPalette(storedColor);
      }
      bgImage = stored.image;
    } else {
      try {
        const raw = localStorage.getItem('kakuki-color');
        if (raw) {
          const parsed = JSON.parse(raw);
          storedColor = parsed.color || DEFAULT_COLOR;
          if (parsed?.palette && !Array.isArray(parsed.palette) && parsed.palette.Vibrant) {
            palette = parsed.palette;
          } else if (parsed?.color) {
            palette = generateVibrantPalette(parsed.color);
          }
        }
      } catch {}
    }

    try {
      const vars = buildThemeVars(palette, isDark);
      applyThemeVars({ ...vars, bgImage });
    } catch (e) {
      console.error('Theme init error:', e);
    }

    set({
      isDark,
      bgImage,
      themeColor: palette.Vibrant || storedColor || DEFAULT_COLOR,
      colorPalette: palette,
      isInitialized: true,
    });
  },
}));

export default useThemeStore;
