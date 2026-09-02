import { useState, useRef, useEffect } from 'react';
import {
  Palette,
  Upload,
  Image as ImageIcon,
  RotateCcw,
  Settings,
  X,
  Sun,
  Moon,
  Sparkles,
} from 'lucide-react';
import useThemeStore from '../../store/themeStore';

const PRESET_COLORS = [
  { name: '梦幻紫', color: '#7c3aed' },
  { name: '玫瑰粉', color: '#ec4899' },
  { name: '海洋蓝', color: '#3b82f6' },
  { name: '薄荷绿', color: '#10b981' },
  { name: '日落橙', color: '#f97316' },
  { name: '暮光青', color: '#06b6d4' },
  { name: '夜空蓝', color: '#6366f1' },
  { name: '烈焰红', color: '#ef4444' },
  { name: '朱砂红', color: '#e11d48' },
  { name: '琥珀黄', color: '#f59e0b' },
  { name: '翡翠青', color: '#059669' },
  { name: '天青蓝', color: '#0284c7' },
  { name: '薰衣草', color: '#8b5cf6' },
  { name: '珊瑚橙', color: '#fb7185' },
  { name: '石墨灰', color: '#64748b' },
  { name: '曜石黑', color: '#334155' },
];

export default function FeatureMenu() {
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [hexInput, setHexInput] = useState('');

  const {
    isDark,
    toggleTheme,
    bgImage,
    themeColor,
    uploadBackground,
    clearBackground,
    setThemeColor,
    colorPalette,
  } = useThemeStore();

  useEffect(() => {
    const onDocClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', onDocClick);
    }
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('图片大小不能超过 10MB');
      return;
    }

    setUploading(true);
    try {
      await uploadBackground(file);
      alert('主题色已自动提取并应用');
    } catch (err) {
      console.error('Upload failed:', err);
      alert('图片处理失败：' + (err?.message || '未知错误'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClearBg = () => {
    clearBackground();
  };

  // 校验并应用任意 hex 颜色（支持 #rgb / #rrggbb）
  const handleHexApply = () => {
    let val = hexInput.trim();
    if (!val) return;
    if (!val.startsWith('#')) val = '#' + val;
    const m = val.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
    if (!m) return;
    let full = val;
    if (m[1].length === 3) {
      full = '#' + m[1].split('').map((c) => c + c).join('');
    }
    setThemeColor(full.toLowerCase());
    setHexInput(full.toLowerCase());
  };

  const targetMode = isDark ? '浅色模式' : '深色模式';
  const currentMode = isDark ? '深色模式' : '浅色模式';

  return (
    <div className="feature-menu" ref={containerRef}>
      <button
        className="theme-toggle feature-menu-trigger"
        onClick={() => setOpen(!open)}
        aria-label="个性化设置"
        title="个性化设置"
      >
        <Settings size={18} />
      </button>

      {open && (
        <>
          <div className="feature-menu-backdrop" onClick={() => setOpen(false)} />
          <div className="feature-menu-dropdown">
            <div className="feature-menu-header">
              <div className="feature-menu-title-row">
                <Palette size={16} />
                <span className="feature-menu-title">个性化设置</span>
              </div>
              <button
                className="feature-menu-close"
                onClick={() => setOpen(false)}
                aria-label="关闭"
              >
                <X size={14} />
              </button>
            </div>

            <div className="feature-menu-body">
              <div className="feature-section">
                <div className="feature-section-label">
                  外观模式
                  <span className="feature-current-mode">
                    当前：{currentMode}
                  </span>
                </div>
                <button
                  className="feature-item"
                  onClick={() => toggleTheme()}
                >
                  <div className="feature-item-icon">
                    {isDark ? <Sun size={16} /> : <Moon size={16} />}
                  </div>
                  <div className="feature-item-text">
                    <span className="feature-item-label">
                      切换到{targetMode}
                    </span>
                    <span className="feature-item-desc">
                      点击切换界面外观
                    </span>
                  </div>
                  <div className="feature-item-toggle">
                    <div className={`toggle-track ${isDark ? 'active' : ''}`}>
                      <div className="toggle-thumb" />
                    </div>
                  </div>
                </button>
              </div>

              <div className="feature-section">
                <div className="feature-section-label">
                  主题色
                  <span className="feature-current-color-label">
                    Vibrant: {themeColor?.toUpperCase()}
                  </span>
                </div>
                <div className="feature-current-color">
                  <div className="feature-color-swatches">
                    <div className="feature-swatch-group">
                      <div className="feature-swatch-label">Vibrant</div>
                      <div
                        className="feature-swatch-large"
                        style={{ background: colorPalette?.Vibrant }}
                      />
                    </div>
                    <div className="feature-swatch-col">
                      <div className="feature-swatch-mini" style={{ background: colorPalette?.DarkVibrant }} title="DarkVibrant" />
                      <div className="feature-swatch-mini" style={{ background: colorPalette?.LightVibrant }} title="LightVibrant" />
                    </div>
                    <div className="feature-swatch-col">
                      <div className="feature-swatch-mini" style={{ background: colorPalette?.Muted }} title="Muted" />
                      <div className="feature-swatch-mini" style={{ background: colorPalette?.DarkMuted }} title="DarkMuted" />
                    </div>
                  </div>
                </div>
                <div className="feature-color-grid">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.color}
                      className={`feature-color-swatch ${themeColor?.toLowerCase() === c.color ? 'active' : ''}`}
                      style={{ background: c.color }}
                      onClick={() => setThemeColor(c.color)}
                      title={c.name}
                    />
                  ))}
                </div>

                <div className="feature-custom-color">
                  <div className="feature-custom-head">
                    <span className="feature-custom-title">任意颜色</span>
                    <span className="feature-custom-badge">
                      <Sparkles size={12} /> 文字对比度自动调整
                    </span>
                  </div>
                  <div className="feature-custom-row">
                    <input
                      type="color"
                      value={themeColor}
                      onChange={(e) => {
                        setThemeColor(e.target.value);
                        setHexInput(e.target.value);
                      }}
                      className="feature-color-input"
                      aria-label="选择任意颜色"
                    />
                    <div className="feature-hex-input-wrap">
                      <input
                        type="text"
                        className="feature-hex-input"
                        value={hexInput}
                        onChange={(e) => setHexInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleHexApply(); }}
                        placeholder="#7c3aed"
                        aria-label="输入十六进制颜色"
                        spellCheck="false"
                      />
                      <button
                        className="feature-hex-apply"
                        onClick={handleHexApply}
                        aria-label="应用颜色"
                      >
                        应用
                      </button>
                    </div>
                  </div>
                  <div className="feature-on-accent-preview">
                    <div className="feature-on-accent-swatch" style={{ background: 'var(--accent)' }}>
                      <span style={{ color: 'var(--on-accent)' }}>Aa 文字清晰</span>
                    </div>
                    <span className="feature-on-accent-hint">
                      文字与强调色的对比度已按 WCAG 4.5:1 自动保障
                    </span>
                  </div>
                </div>
              </div>

              <div className="feature-section">
                <div className="feature-section-label">
                  背景图片
                  <span className="feature-auto-badge">
                    <Sparkles size={12} /> 自动提取主题色
                  </span>
                </div>
                <div className="feature-bg-row">
                  <div
                    className={`feature-bg-preview ${bgImage ? 'has-bg' : ''}`}
                    style={bgImage ? { backgroundImage: `url(${bgImage})` } : {}}
                  >
                    {!bgImage && <ImageIcon size={18} />}
                  </div>
                  <div className="feature-bg-actions">
                    <button
                      className="feature-btn feature-btn-primary"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <div className="feature-spinner" />
                      ) : (
                        <Upload size={14} />
                      )}
                      <span>{bgImage ? '更换图片' : '上传图片'}</span>
                    </button>
                    {bgImage && (
                      <button
                        className="feature-btn"
                        onClick={handleClearBg}
                        title="恢复默认"
                      >
                        <RotateCcw size={14} />
                        <span>重置</span>
                      </button>
                    )}
                  </div>
                </div>
                <p className="feature-bg-hint">
                  上传后自动裁切图片并提取 6 种语义化颜色（Vibrant/Dark/Light/Muted），应用到全站主题
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
