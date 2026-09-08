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
    <div className="glass mouse-glow reveal" style={{ borderRadius: 20, padding: '1.25rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Palette size={18} style={{ color: 'var(--accent)' }} /> 色板生成器
        </h3>
        <button
          onClick={regenerate}
          aria-label="生成新色板"
          title="换一组颜色"
          className="quote-shuffle"
          style={{
            border: '1px solid var(--border)', background: 'var(--glass-bg-strong)', color: 'var(--text-secondary)',
            width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.3s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'rotate(180deg)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'rotate(0deg)'; }}
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem', flex: 1 }}>
        {colors.map((c, i) => (
          <button
            key={i}
            onClick={() => copyColor(c.hex)}
            aria-label={`复制颜色 ${c.hex}`}
            title={`点击复制 ${c.hex}`}
            style={{
              position: 'relative', border: 'none', borderRadius: 12, cursor: 'pointer',
              background: c.hex, aspectRatio: '1', display: 'flex',
              alignItems: 'flex-end', justifyContent: 'center', padding: 0,
              overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <span style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.02em',
              textShadow: '0 1px 3px rgba(0,0,0,0.45)', background: 'rgba(0,0,0,0.06)',
              opacity: 0, transition: 'opacity 0.2s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; }}
            >
              {copied === c.hex ? <Check size={16} /> : c.hex}
            </span>
          </button>
        ))}
      </div>
      <p style={{ marginTop: '0.6rem', fontSize: '0.68rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
        {copied ? `已复制 ${copied}` : '点击色块复制颜色 · 支持任意主题取色'}
      </p>
    </div>
  );
}
