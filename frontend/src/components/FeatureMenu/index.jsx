import { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Image as ImageIcon,
  RotateCcw,
  Settings,
  Sun,
  Moon,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import useThemeStore from '../../store/themeStore';

const PRESET_COLORS = [
  { name: '梦幻紫', color: '#7c3aed' },
  { name: '玫瑰粉', color: '#ec4899' },
  { name: '海洋蓝', color: '#3b82f6' },
  { name: '薄荷绿', color: '#10b981' },
  { name: '日落橙', color: '#f97316' },
  { name: '夜空蓝', color: '#6366f1' },
  { name: '琥珀黄', color: '#f59e0b' },
  { name: '曜石灰', color: '#2b3036' },
];

export const OPEN_SETTINGS_EVENT = 'kakuki:open-settings';

export default function FeatureMenu() {
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [hexInput, setHexInput] = useState('');
  const [toast, setToast] = useState(null);   // { type: 'ok' | 'err', text }

  const {
    isDark,
    bgImage,
    themeColor,
    requestThemeToggle,
    uploadBackground,
    clearBackground,
    setThemeColor,
  } = useThemeStore();

  // 外部（导航栏主题按钮等）可请求打开设置面板
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_SETTINGS_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, onOpen);
  }, []);

  useEffect(() => {
    const onDocClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    if (open) {
      document.addEventListener('mousedown', onDocClick);
      document.addEventListener('keydown', onEsc);
    }
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  // toast 自动消失
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (themeColor) setHexInput(themeColor);
  }, [themeColor]);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setToast({ type: 'err', text: '请选择图片文件' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setToast({ type: 'err', text: '图片不能超过 10MB' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    try {
      await uploadBackground(file);
      setToast({ type: 'ok', text: '背景已应用，主题色已自动提取' });
    } catch (err) {
      setToast({ type: 'err', text: '图片处理失败：' + (err?.message || '未知错误') });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 校验并应用任意 hex 颜色（支持 #rgb / #rrggbb）
  const handleHexApply = () => {
    let val = hexInput.trim();
    if (!val) return;
    if (!val.startsWith('#')) val = '#' + val;
    const m = val.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
    if (!m) {
      setToast({ type: 'err', text: '颜色格式不对，例如 #7c3aed' });
      return;
    }
    const full = m[1].length === 3
      ? '#' + m[1].split('').map((c) => c + c).join('')
      : val;
    setThemeColor(full.toLowerCase());
    setHexInput(full.toLowerCase());
  };

  const resetAll = () => {
    clearBackground();
    setThemeColor('#7c3aed');
    setToast({ type: 'ok', text: '已恢复默认外观' });
  };

  return (
    <div className="settings-root" ref={containerRef}>
      <button
        className="theme-toggle settings-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-label="设置"
        aria-expanded={open}
        title="设置"
      >
        <Settings size={18} />
      </button>

      {open && (
        <>
          <div className="settings-backdrop" onClick={() => setOpen(false)} />
          <div className="settings-panel" role="dialog" aria-label="设置">
            {/* 头部：标题 + 关闭 */}
            <div className="settings-head">
              <span className="settings-title">设置</span>
              <button className="settings-done" onClick={() => setOpen(false)}>完成</button>
            </div>

            <div className="settings-body">
              {/* ---- 外观模式（分段控件，一眼看清当前态） ---- */}
              <div className="settings-row settings-row-block">
                <span className="settings-label">外观</span>
                <div className="settings-seg" role="group" aria-label="外观模式">
                  <button
                    className={`settings-seg-btn ${!isDark ? 'active' : ''}`}
                    onClick={(e) => { if (isDark) requestThemeToggle(e.currentTarget); }}
                    aria-pressed={!isDark}
                  >
                    <Sun size={13} /> 浅色
                  </button>
                  <button
                    className={`settings-seg-btn ${isDark ? 'active' : ''}`}
                    onClick={(e) => { if (!isDark) requestThemeToggle(e.currentTarget); }}
                    aria-pressed={isDark}
                  >
                    <Moon size={13} /> 深色
                  </button>
                </div>
              </div>

              {/* ---- 主题色 ---- */}
              <div className="settings-row settings-row-block">
                <div className="settings-label-line">
                  <span className="settings-label">主题色</span>
                  <span className="settings-hex-badge">{themeColor?.toUpperCase()}</span>
                </div>
                <div className="settings-colors">
                  {PRESET_COLORS.map((c) => {
                    const active = themeColor?.toLowerCase() === c.color;
                    return (
                      <button
                        key={c.color}
                        className={`settings-swatch ${active ? 'active' : ''}`}
                        style={{ background: c.color }}
                        onClick={() => setThemeColor(c.color)}
                        title={c.name}
                        aria-label={c.name}
                        aria-pressed={active}
                      >
                        {active && <Check size={13} strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
                <div className="settings-hex-row">
                  <input
                    type="color"
                    value={themeColor || '#7c3aed'}
                    onChange={(e) => setThemeColor(e.target.value)}
                    className="settings-color-picker"
                    aria-label="取色器"
                  />
                  <input
                    type="text"
                    className="settings-hex-input"
                    value={hexInput}
                    onChange={(e) => setHexInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleHexApply(); }}
                    placeholder="#7c3aed"
                    aria-label="十六进制颜色"
                    spellCheck="false"
                  />
                  <button className="settings-hex-apply" onClick={handleHexApply}>应用</button>
                </div>
              </div>

              {/* ---- 背景图 ---- */}
              <div className="settings-row">
                <div
                  className={`settings-bg-thumb ${bgImage ? 'has-bg' : ''}`}
                  style={bgImage ? { backgroundImage: `url(${bgImage})` } : {}}
                >
                  {!bgImage && <ImageIcon size={15} />}
                </div>
                <div className="settings-bg-text">
                  <span className="settings-label">背景图片</span>
                  <span className="settings-hint">{bgImage ? '已自定义' : '使用默认'}</span>
                </div>
                <div className="settings-bg-actions">
                  <button
                    className="settings-btn primary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 size={13} className="settings-spin" /> : <Upload size={13} />}
                    {bgImage ? '更换' : '上传'}
                  </button>
                  {bgImage && (
                    <button className="settings-btn" onClick={clearBackground} title="恢复默认背景">
                      <RotateCcw size={13} /> 重置
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
              </div>

              {/* ---- 恢复默认 ---- */}
              <div className="settings-foot">
                <button className="settings-reset" onClick={resetAll}>
                  <RotateCcw size={13} /> 恢复默认外观
                </button>
              </div>
            </div>

            {/* 内联提示，替代 alert 弹窗 */}
            {toast && (
              <div className={`settings-toast ${toast.type}`}>
                {toast.type === 'ok' ? <Check size={13} /> : <AlertCircle size={13} />}
                {toast.text}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
