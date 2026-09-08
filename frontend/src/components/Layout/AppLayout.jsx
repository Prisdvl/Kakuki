import { useEffect, useState, useRef, useCallback, memo } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Sun, Moon, Menu, X, ArrowUp } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import useUserStore from '../../store/userStore';
import FeatureMenu from '../FeatureMenu';
import { useScrollReveal } from '../../hooks/useScrollReveal';

const NAV_ITEMS = [
  { label: '首页', path: '/' },
  { label: '归档', path: '/archive' },
  { label: '分类', path: '/category' },
  { label: '杂谈', path: '/talks' },
  { label: '项目', path: '/projects' },
  { label: '音乐', path: '/music' },
  { label: '关于', path: '/about' },
];

// 独立的时间组件，避免每秒刷新导致整个布局重渲染
const StatusTime = memo(function StatusTime() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return <span className="status-time">{formatTime(currentTime)}</span>;
});

export default function AppLayout() {
  const { isDark, toggleTheme, bgImage } = useThemeStore(
    (state) => ({ isDark: state.isDark, toggleTheme: state.toggleTheme, bgImage: state.bgImage }),
    (a, b) => a.isDark === b.isDark && a.bgImage === b.bgImage
  );
  const { isLoggedIn, user, fetchUser, logout } = useUserStore(
    (state) => ({ isLoggedIn: state.isLoggedIn, user: state.user, fetchUser: state.fetchUser, logout: state.logout }),
    (a, b) => a.isLoggedIn === b.isLoggedIn && a.user === b.user
  );
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [revealState, setRevealState] = useState('idle');
  const [revealStyle, setRevealStyle] = useState({});
  const [scrollProgress, setScrollProgress] = useState(0);
  const themeBtnRef = useRef(null);

  useEffect(() => { if (isLoggedIn) fetchUser(); }, [isLoggedIn, fetchUser]);

  // 路由切换时立即回到顶部，避免新页面停留在上一页的滚动位置
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  // 滚动入场动画：复用统一 Hook，监听 .reveal 元素进入视口后添加 .visible
  useScrollReveal({ deps: [location.pathname] });

  useEffect(() => {
    const el = document.querySelector('.bg-image-layer');
    if (!el) return;
    if (bgImage) {
      const img = new Image();
      img.onload = () => {
        el.style.backgroundImage = `url(${bgImage})`;
        el.classList.add('loaded');
      };
      img.src = bgImage;
    } else {
      el.style.backgroundImage = '';
      el.classList.remove('loaded');
    }
  }, [bgImage]);

  // 鼠标光标跟随：使用 rAF 节流 + passive 监听，零强制重排
  useEffect(() => {
    let ticking = false;
    let pendingX = 50, pendingY = 50;
    const update = () => {
      document.documentElement.style.setProperty('--cursor-x', pendingX + '%');
      document.documentElement.style.setProperty('--cursor-y', pendingY + '%');
      ticking = false;
    };
    const onMouseMove = (e) => {
      pendingX = ((e.clientX / window.innerWidth) * 100).toFixed(1);
      pendingY = ((e.clientY / window.innerHeight) * 100).toFixed(1);
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    const onVisibilityChange = () => {
      if (document.hidden) {
        document.documentElement.style.setProperty('--cursor-x', '-50%');
        document.documentElement.style.setProperty('--cursor-y', '-50%');
      }
    };
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (mobileMenu) { document.body.style.overflow = 'hidden'; }
    else { document.body.style.overflow = ''; }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenu]);

  useEffect(() => {
    // scroll 事件依赖渲染帧派发：后台标签/无头窗口渲染帧挂起时事件不会触发，
    // 因此叠加低频轮询兜底，保证任何环境下滚动状态都能更新
    let lastUpdate = 0;
    const onScroll = () => {
      const now = performance.now();
      if (now - lastUpdate < 50) return;
      lastUpdate = now;
      const scrollTop = window.scrollY;
      const doc = document.documentElement;
      const scrollHeight = doc.scrollHeight - window.innerHeight;
      const nextScrolled = scrollTop > 60;
      const nextProgress = scrollHeight > 0 ? Math.min(100, (scrollTop / scrollHeight) * 100) : 0;
      setScrolled((prev) => (prev === nextScrolled ? prev : nextScrolled));
      setScrollProgress((prev) => (Math.abs(prev - nextProgress) > 0.4 ? nextProgress : prev));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    const pollTimer = setInterval(onScroll, 250);
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      clearInterval(pollTimer);
    };
  }, []);

  const handleToggleTheme = useCallback(() => {
    const btn = themeBtnRef.current;
    if (!btn) { toggleTheme(); return; }
    const rect = btn.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const computed = getComputedStyle(document.documentElement);
    const oldBg = computed.getPropertyValue('--bg-primary').trim() || '#ede9fe';
    setRevealStyle({ '--rx': x + 'px', '--ry': y + 'px', background: oldBg });
    setRevealState('ready');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { toggleTheme(); setRevealState('active'); });
    });
    setTimeout(() => setRevealState('idle'), 500);
  }, [toggleTheme]);

  return (
    <>
      <div className="bg-scene">
        <div className="bg-image-layer" />
        <div className="bg-scene-grid" />
        <div className="bg-scene-highlight" />
        <div className="bg-scene-flow">
          <div className="bg-flow-beam" />
          <div className="bg-flow-beam" />
          <div className="bg-flow-beam" />
          <div className="bg-flow-beam" />
          <div className="bg-flow-beam vertical" />
          <div className="bg-flow-beam vertical" />
          <div className="bg-flow-beam vertical" />
        </div>
        <div className="bg-scene-orb orb-1" />
        <div className="bg-scene-orb orb-2" />
        <div className="bg-scene-orb orb-3" />
      </div>

      {scrollProgress > 0 && (
        <div className="scroll-progress" style={{ width: `${scrollProgress}%` }} />
      )}

      {/* 返回顶部 */}
      <button
        className={`back-to-top ${scrollProgress > 8 ? 'show' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="返回顶部"
        title="返回顶部"
      >
        <ArrowUp size={18} />
      </button>

      {revealState !== 'idle' && (
        <div className={`theme-overlay ${revealState === 'ready' ? 'ready' : ''} ${revealState === 'active' ? 'active' : ''}`} style={revealStyle} />
      )}

      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="navbar-inner">
          <Link to="/" className="nav-logo" onClick={() => setMobileMenu(false)}>
            Kakuki<span>.</span>
          </Link>

          <ul className="nav-links">
            {NAV_ITEMS.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path)) ? 'active' : ''}
                  onClick={() => setMobileMenu(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="nav-actions">
            <button
              ref={themeBtnRef}
              className="theme-toggle"
              onClick={handleToggleTheme}
              aria-label={isDark ? '切换到浅色模式' : '切换到深色模式'}
              title={isDark ? '当前深色模式 · 点击切换为浅色' : '当前浅色模式 · 点击切换为深色'}
            >
              <span key={isDark ? 'sun' : 'moon'} className="theme-icon-swap">
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </span>
            </button>
            <FeatureMenu />
            {isLoggedIn ? (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <Link to="/admin" className="btn-glass" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                  {user?.nickname || user?.username || '管理'}
                </Link>
                <button onClick={logout} className="theme-toggle" aria-label="退出">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                </button>
              </div>
            ) : (
              <Link to="/login" className="btn-glass" style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem' }}>
                登录
              </Link>
            )}
            <button className="theme-toggle md:hidden" onClick={() => setMobileMenu(!mobileMenu)} aria-label="菜单">
              <span key={mobileMenu ? 'x' : 'menu'} className="theme-icon-swap">
                {mobileMenu ? <X size={18} /> : <Menu size={18} />}
              </span>
            </button>
          </div>
        </div>

        {mobileMenu && (
          <>
            <div className="mobile-menu-backdrop md:hidden" onClick={() => setMobileMenu(false)} />
            <div className="mobile-menu-drawer md:hidden">
              <div className="mobile-menu-header"><span>菜单</span></div>
              <ul className="mobile-menu-list">
                {NAV_ITEMS.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={location.pathname === item.path ? 'active' : ''}
                      onClick={() => setMobileMenu(false)}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
                {isLoggedIn && (
                  <li>
                    <Link to="/admin" onClick={() => setMobileMenu(false)}>管理后台</Link>
                  </li>
                )}
              </ul>
            </div>
          </>
        )}
      </nav>

      <main className="page-content" style={{ paddingBottom: '4rem' }}>
        <div className="app-container" style={{ maxWidth: 1200 }}>
          <div key={location.pathname} className="page-enter">
            <Outlet />
          </div>
        </div>
      </main>

      <div className="status-bar">
        <div className="status-bar-inner">
          <div className="status-item">
            <span className="status-dot" />
            <StatusTime />
          </div>
          <div className="status-item">
            <span>正在浏览：{NAV_ITEMS.find(n => location.pathname === n.path)?.label || '首页'}</span>
          </div>
          <div className="status-item">
            <span className="status-tech-badge">React</span>
            <span className="status-tech-badge">Django</span>
            <span className="status-tech-badge">Tailwind</span>
          </div>
          <div className="status-item">
            <span>Prisdvl © 2026</span>
          </div>
          <div className="status-item">
            <span>{isDark ? '🌙 深色' : '☀️ 浅色'}模式</span>
          </div>
          <div className="status-item">
            <span>v1.0.0</span>
          </div>
        </div>
      </div>
    </>
  );
}
