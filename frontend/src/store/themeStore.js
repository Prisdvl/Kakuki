import { create } from 'zustand';

const DEFAULT_BG = null;
const DEFAULT_COLOR = '#7c3aed';

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
  if (fgColor.startsWith('rgb(')) {
    const match = fgColor.match(/rgba?\(([^)]+)\)/);
    if (!match) return fgColor;
    const parts = match[1].split(',').map((p) => parseFloat(p.trim()));
    const [r, g, b] = parts;
    const hex = rgbToHex(r, g, b);
    const adjusted = ensureContrast(hex, bgHex, minRatio, isDark);
    const alpha = parts.length === 4 ? parts[3] : 1;
    const [ar, ag, ab] = hexToRgb(adjusted);
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
  const sSat = clamp(s, 55, 85);

  return {
    Vibrant: hslToHex(h, sSat, clamp(l, 40, 55)),
    DarkVibrant: hslToHex(h, sSat, clamp(l - 18, 20, 40)),
    LightVibrant: hslToHex(h, clamp(s * 0.7, 30, 55), clamp(l + 18, 55, 80)),
    Muted: hslToHex(h, clamp(s * 0.55, 20, 50), clamp(l, 40, 65)),
    DarkMuted: hslToHex(h, clamp(s * 0.45, 15, 40), clamp(l - 15, 22, 45)),
    LightMuted: hslToHex(h, clamp(s * 0.5, 15, 40), clamp(l + 15, 55, 82)),
  };
}

function hslToHex(h, s, l) {
  const [r, g, b] = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
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
  const warningColor = isDark ? '#fbbf24' : '#f59e0b';
  const errorColor = isDark ? '#f87171' : '#ef4444';
  const infoColor = isDark ? '#60a5fa' : '#3b82f6';

  const bgBase = isDark ? DarkMuted : LightMuted;
  const bgPrimary = bgBase;

  const textPrimaryRaw = isDark ? LightVibrant : DarkVibrant;
  const textSecondaryRaw = isDark ? Vibrant : Muted;
  const accentRaw = Vibrant;
  const accentLightRaw = LightVibrant;
  const accentSecondaryRaw = LightVibrant;
  const mutedRaw = Muted;

  const textPrimary = ensureContrast(textPrimaryRaw, bgPrimary, 7, isDark);
  const textSecondary = ensureContrast(textSecondaryRaw, bgPrimary, 4.5, isDark);
  const accent = ensureContrast(accentRaw, bgPrimary, 4.5, isDark);
  const accentLight = ensureContrast(accentLightRaw, bgPrimary, 3, isDark);
  const accentSecondary = ensureContrast(accentSecondaryRaw, bgPrimary, 3, isDark);
  const muted = ensureContrast(mutedRaw, bgPrimary, 3, isDark);

  return {
    accent,
    accentSoft: rgba(accent, 0.12),
    accentGlow: rgba(accent, 0.25),
    accentSecondary,
    accentDark: ensureContrast(DarkVibrant, bgPrimary, 3, isDark),
    accentLight,
    muted,
    darkMuted: DarkMuted,
    lightMuted: LightMuted,

    glassBg: isDark ? rgba(DarkMuted, 0.6) : rgba(LightMuted, 0.55),
    glassBgStrong: isDark ? rgba(DarkMuted, 0.82) : rgba(LightMuted, 0.78),
    glassBorder: isDark ? rgba(accent, 0.3) : rgba(accent, 0.2),
    glassShadow: isDark
      ? `0 8px 32px ${rgba(DarkVibrant, 0.4)}`
      : `0 8px 32px ${rgba(accent, 0.08)}`,
    glassShadowHover: isDark
      ? `0 16px 48px ${rgba(DarkVibrant, 0.5)}`
      : `0 16px 48px ${rgba(accent, 0.12)}`,

    bgPrimary,
    bgSecondary: isDark ? rgba(DarkVibrant, 0.6) : rgba(LightVibrant, 0.5),
    bgTertiary: rgba(accent, isDark ? 0.05 : 0.06),

    textPrimary,
    textSecondary,
    textTertiary: ensureAlphaContrast(rgba(accent, isDark ? 0.7 : 0.5), bgPrimary, 3, isDark),
    border: rgba(accent, isDark ? 0.12 : 0.18),

    heroOverlay: isDark ? rgba(DarkMuted, 0.6) : rgba(LightMuted, 0.6),
    cardBg: isDark ? rgba(DarkVibrant, 0.45) : rgba(LightVibrant, 0.5),
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
    heatEmpty: isDark ? rgba(LightVibrant, 0.2) : '#e8e5f0',
    heatLevel1: isDark ? rgba(LightVibrant, 0.4) : '#c4b5fd',
    heatLevel2: isDark ? rgba(accent, 0.6) : '#a78bfa',
    heatLevel3: isDark ? rgba(accent, 0.8) : '#8b5cf6',
    heatLevel4: accent,
    leetcodeEasy: ensureContrast(isDark ? '#2dd4bf' : '#00b8a3', bgPrimary, 3, isDark),
    leetcodeMedium: ensureContrast(isDark ? '#fbbf24' : '#ffb700', bgPrimary, 3, isDark),
    leetcodeHard: ensureContrast(isDark ? '#f87171' : '#ff375f', bgPrimary, 3, isDark),
  };
}

function applyThemeVars(vars) {
  const root = document.documentElement;
  root.style.setProperty('--accent', vars.accent);
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
