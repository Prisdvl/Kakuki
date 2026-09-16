import { useState } from 'react';
import { Palette, Copy, RefreshCw, Check } from 'lucide-react';

function randomHue() {
  return Math.floor(Math.random() * 360);
}

function hsl(h, s, l) {
  return `hsl(${h}, ${s}%, ${l}%)`;
}

// 基于随机色相生成一组和谐的 HSL 色板
function generatePalette() {
  const base = randomHue();
  const shifts = [0, 28, -22, 48, -50];
  return shifts.map((shift, i) => {
    const h = (base + shift + 360) % 360;
    const s = 62 + (i % 3) * 8;
    const l = 46 + (i % 2) * 10;
    return { hue: h, hex: hexFromHsl(h, s, l) };
  });
}

function hexFromHsl(h, s, l) {
  const sN = s / 100;
  const lN = l / 100;
  const c = (1 - Math.abs(2 * lN - 1)) * sN;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lN - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export default function PaletteCard() {
  const [colors, setColors] = useState(generatePalette);
  const [copied, setCopied] = useState('');

  const regenerate = () => setColors(generatePalette());

  const copyColor = async (hex) => {
    try {
      await navigator.clipboard.writeText(hex);
    } catch {
      // clipboard 不可用时回退
      const ta = document.createElement('textarea');
      ta.value = hex;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(hex);
    setTimeout(() => setCopied(''), 1200);
  };

  return (
    <div className="ui-card ui-pad ui-flex-col ui-h-full">
      <div className="ui-card-head">
        <h3 className="ui-card-title">
          <Palette size={18} /> 色板生成器
        </h3>
        <div className="ui-card-actions">
          <button
            onClick={regenerate}
            aria-label="生成新色板"
            title="换一组颜色"
            className="ui-icon-action"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="palette-grid">
        {colors.map((c, i) => (
          <button
            key={i}
            onClick={() => copyColor(c.hex)}
            aria-label={`复制颜色 ${c.hex}`}
            title={`点击复制 ${c.hex}`}
            className="palette-swatch"
            style={{ background: c.hex }}
          >
            <span className="palette-swatch-label">
              {copied === c.hex ? <Check size={16} /> : c.hex}
            </span>
          </button>
        ))}
      </div>
      <p className="palette-caption">
        {copied ? `已复制 ${copied}` : '点击色块复制颜色 · 支持任意主题取色'}
      </p>
    </div>
  );
}
