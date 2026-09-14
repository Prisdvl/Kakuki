import { useEffect, useState, useRef, useCallback, memo } from 'react';
import { flushSync } from 'react-dom';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Sun, Moon, Menu, X, ArrowUp, Timer, Activity } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import useUserStore from '../../store/userStore';
import checkinApi from '../../api/checkin';
import FeatureMenu from '../FeatureMenu';
import ParticleField from '../ParticleField';
import InkWash from '../InkWash';
import StarfieldParallax from './StarfieldParallax';
import { useScrollReveal } from '../../hooks/useScrollReveal';

const NAV_ITEMS = [
  { label: '首页', path: '/' },
  // 仪表盘含个人状态卡 + 站点流量统计（原「数据」页已并入）
  { label: '仪表盘', path: '/dashboard' },
  { label: '归档', path: '/archive' },
  { label: '杂谈', path: '/talks' },
  { label: '项目', path: '/projects' },
  { label: '音乐', path: '/music' },
  { label: '关于', path: '/about' },
];

// ===== 液态玻璃折射滤镜的位移贴图（径向渐变，中心黑 → 边缘纯色通道） =====
// R 通道水平位移、G 通道垂直位移；经 feComposite 相加后得到径向对称的位移场，
// feDisplacementMap 据此把 backdrop 里的网格线弯出透镜形变。
// colorInterpolationFilters 必须是 sRGB（默认 linearRGB 会把贴图值整体压暗，位移失真）。
const REFRACT_MAP_R = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cdefs%3E%3CradialGradient id='g' cx='50%25' cy='50%25' r='70%25'%3E%3Cstop offset='0' stop-color='%23000000'/%3E%3Cstop offset='1' stop-color='%23ff0000'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='300' height='300' fill='url(%23g)'/%3E%3C/svg%3E";
const REFRACT_MAP_G = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cdefs%3E%3CradialGradient id='g' cx='50%25' cy='50%25' r='70%25'%3E%3Cstop offset='0' stop-color='%23000000'/%3E%3Cstop offset='1' stop-color='%2300ff00'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='300' height='300' fill='url(%23g)'/%3E%3C/svg%3E";

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

// 翻页数字单元：值变化时 3D 翻转入场（翻页钟风格）
const FlipDigit = memo(function FlipDigit({ digit }) {
  return (
    <span key={digit} className="flip-digit">{digit}</span>
  );
});

const FlipUnit = memo(function FlipUnit({ value, label }) {
  const str = String(value).padStart(value >= 100 ? 3 : 2, '0');
  // 数字在前、单位在后：读作「01天 12时 31分 02秒」。
  // 反过来写成「天01 时12 …」时，01 会视觉上贴到后面的「时」上，
  // 看起来像「天」没带数字、而开头是「1时」。
  return (
    <span className="flip-group">
      <span className="flip-unit">
        {str.split('').map((d, i) => <FlipDigit key={`${d}-${i}`} digit={d} />)}
      </span>
      {label && <span className="flip-label">{label}</span>}
    </span>
  );
});

// 站点运行时长：以 kakuki.top 在 Cloudflare 上线的时刻为基准累计（翻页钟风格）
const StatusUptime = memo(function StatusUptime() {
  // 运行时长基准 = kakuki.top 这个域名真正开始对外服务的时刻，不是最近一次部署时刻。
  //
  // 依据：Cloudflare API 中该 zone 的 activated_on = 2026-09-12T12:52:03Z
  // ≡ 2026-09-12 20:52:03 +0800（北京时间）。此前 9-08 那次发布走的是
  // prisdvl.github.io/Kakuki/ 子路径，域名本身 9-10 才加入 Cloudflare、9-12 才激活，
  // 与 kakuki.top 不是同一个对外入口，所以运行时长从域名激活时刻算起。
  //
  // 该基准必须与 cloudflare/src/blog.ts 的 SITE_LAUNCH_MS 保持一致，
  // 否则状态栏的「运行时长」与关于页的「运行天数」会各说各话。
  const DEPLOY_ISO = '2026-09-12T12:52:03Z';
  const DEPLOY_TS = Date.parse(DEPLOY_ISO);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const diff = Math.max(0, now - DEPLOY_TS);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000) % 24;
  const minutes = Math.floor(diff / 60000) % 60;
  const seconds = Math.floor(diff / 1000) % 60;

  // title 里写清基准时刻，便于与真实上线时间逐秒核对
  const deployLocal = new Date(DEPLOY_TS).toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });

  return (
    <span className="status-item status-uptime" title={`kakuki.top 于 ${deployLocal}（北京时间）在 Cloudflare 上线，此处为自上线起的连续运行时长`}>
      <Activity size={11} />
      {/* 不足一天时不显示"天"，避免 0 天看着像故障 */}
      {days > 0 && <FlipUnit value={days} label="天" />}
      <FlipUnit value={hours} label="时" />
      <FlipUnit value={minutes} label="分" />
      <FlipUnit value={seconds} label="秒" />
    </span>
  );
});

// 今日专注时长：优先取后端（本地 PrisTimer 同步脚本上报），失败回退本地番茄钟记录
const StatusFocus = memo(function StatusFocus() {
  const [minutes, setMinutes] = useState(0);

  const refresh = useCallback(() => {
    const localSum = () => {
      const today = new Date().toDateString();
      try {
        const raw = localStorage.getItem('kakuki-focus-records');
        const arr = raw ? JSON.parse(raw) : [];
        return (Array.isArray(arr) ? arr : [])
          .filter((r) => r && new Date(r.ts).toDateString() === today)
          .reduce((s, r) => s + (r.minutes || 0), 0);
      } catch { return 0; }
    };

    checkinApi.focusSummary(7)
      .then((res) => {
        const d = res?.data;
        // 后端有数据用后端（PrisTimer 真实专注时长），否则回退本地番茄钟
        if (d && d.today_ms > 0) setMinutes(d.today_minutes);
        else setMinutes(localSum());
      })
      .catch(() => setMinutes(localSum()));
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener('kakuki:focus-updated', refresh);
    window.addEventListener('storage', refresh);
    const t = setInterval(refresh, 60000);
    return () => {
      window.removeEventListener('kakuki:focus-updated', refresh);
      window.removeEventListener('storage', refresh);
      clearInterval(t);
    };
  }, [refresh]);

  if (minutes === 0) return null;
  return (
    <span className="status-item status-focus" title="今日专注累计时长（同步自本地计时器）">
      <Timer size={11} />
      今日专注 {minutes} 分钟
    </span>
  );
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
  const themeOverlayRef = useRef(null);

  useEffect(() => { if (isLoggedIn) fetchUser(); }, [isLoggedIn, fetchUser]);

  // 状态栏高度会随视口换行（390px 下可到 83px，430px 只有 55px），
  // 而底部播放条的 bottom 若是写死值就会与状态栏重叠。这里把实测高度
  // 写进 CSS 变量 --status-bar-h，供 .music-player-bar 等固定定位元素使用。
  useEffect(() => {
    const el = document.querySelector('.status-bar');
    if (!el) return undefined;
    const apply = () => {
      document.documentElement.style.setProperty('--status-bar-h', `${Math.round(el.getBoundingClientRect().height)}px`);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    window.addEventListener('resize', apply);
    return () => { ro.disconnect(); window.removeEventListener('resize', apply); };
  }, []);

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

  // 通用玻璃折射：document 级委托，让所有 .glass-elevated 卡片的折射光斑跟随鼠标
  useEffect(() => {
    const onRefract = (e) => {
      const el = e.target.closest?.('.glass-elevated');
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      el.style.setProperty('--refraction-x', `${((e.clientX - r.left) / r.width) * 100}%`);
      el.style.setProperty('--refraction-y', `${((e.clientY - r.top) / r.height) * 100}%`);
    };
    document.addEventListener('mousemove', onRefract, { passive: true });
    return () => document.removeEventListener('mousemove', onRefract);
  }, []);

  // 全局 3D 倾斜委托：统一所有内容区玻璃组件为首页 TiltCard 同款倾斜交互。
  // 对 main 内的 .glass / .glass-card / .glass-elevated（非 tilt-card 内部、非固定条/搜索框）
  // 绑定 mousemove 倾斜 + 光滑回弹；进入时解除一次性 glassMount 动画的 transform 锁定。
  // 倾斜幅度由 CSS 变量 --tilt-max 控制：阅读类页面（文章详情）会把它调低，
  // 因为大幅倾斜会干扰长文阅读。
  useEffect(() => {
    const SEL = 'main .glass, main .glass-card, main .glass-elevated';
    const EXCLUDE = '.search-center, .music-player-bar, .status-bar, .feature-menu-dropdown, .navbar, .tilt-card, .tilt-card *, .about-page, .about-page *';
    const DEFAULT_TILT_MAX = 7;
    const DEFAULT_TILT_SCALE = 1.012;
    const TILT_EASE = 'transform 0.5s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.3s ease';

    const bind = (el) => {
      if (el.__kakukiTilt || el.closest(EXCLUDE)) return;
      el.__kakukiTilt = true;
      let savedTransition = '';
      let restoreTimer = null;

      const onEnter = () => {
        if (restoreTimer) { clearTimeout(restoreTimer); restoreTimer = null; }
        savedTransition = el.style.transition;
        // 若一次性挂载动画仍在运行，解除其对 transform 的锁定，让 inline 倾斜生效
        const anims = el.getAnimations ? el.getAnimations() : [];
        const mounting = anims.some((a) => (a.animationName || '').includes('glassMount') && a.playState === 'running');
        if (mounting) el.style.animation = 'none';
        el.style.transition = TILT_EASE;
        el.style.willChange = 'transform';
      };
      const onMove = (e) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        // 逐元素读取倾斜强度：允许页面通过 --tilt-max / --tilt-scale 局部弱化
        const cs = getComputedStyle(el);
        const maxTilt = parseFloat(cs.getPropertyValue('--tilt-max')) || DEFAULT_TILT_MAX;
        const scale = parseFloat(cs.getPropertyValue('--tilt-scale')) || DEFAULT_TILT_SCALE;
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        const rx = (0.5 - py) * maxTilt;
        const ry = (px - 0.5) * maxTilt;
        el.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale(${scale})`;
      };
      const onLeave = () => {
        el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)';
        if (restoreTimer) clearTimeout(restoreTimer);
        restoreTimer = setTimeout(() => {
          el.style.transition = savedTransition;
          el.style.willChange = '';
          restoreTimer = null;
        }, 560);
      };
      el.addEventListener('mouseenter', onEnter);
      el.addEventListener('mousemove', onMove);
      el.addEventListener('mouseleave', onLeave);
    };

    const scan = () => document.querySelectorAll(SEL).forEach(bind);
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);

  // 玻璃 backdrop 预热：backdrop-filter 首次合成是异步的，若与挂载淡入动画
  // （opacity 变化）重叠，Chromium 会延迟创建模糊层，动画结束后才突然合成，
  // 造成“透明→磨砂”突变。此逻辑在元素挂载/动画结束后强制一次 reflow 预创建模糊层。
  useEffect(() => {
    const SEL = '.glass, .glass-elevated, .glass-card, .glass-floating, .glass-pill, .glass-button, .btn-glass, .glass-button-solid, .tilt-card';
    const warm = (el) => {
      try {
        const bf = getComputedStyle(el).backdropFilter;
        if (!bf || bf === 'none') return;
        el.style.backdropFilter = 'blur(0px) saturate(100%)';
        void el.offsetHeight; // 强制 reflow，预创建 backdrop 合成层
        el.style.backdropFilter = '';
      } catch { /* 忽略 */ }
    };
    let timer = null;
    const run = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        document.querySelectorAll(SEL).forEach(warm);
      }, 120);
    };
    // glassMount 动画结束时也预热（防止动画期间 opacity 阻塞合成）
    const onAnimEnd = (e) => {
      if (e.animationName === 'glassMount' && e.target && e.target.matches?.(SEL)) warm(e.target);
    };
    document.addEventListener('animationend', onAnimEnd, true);
    run();
    const mo = new MutationObserver(run);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      document.removeEventListener('animationend', onAnimEnd, true);
      if (timer) clearTimeout(timer);
    };
  }, []);

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

  // origin：实际被按下的元素。扩散圆心取它 —— 老大要求"从按下位置散开"，
  // 所以导航栏按钮与设置面板分段控件各自作为各自的圆心。
  const handleToggleTheme = useCallback((origin) => {
    if (revealState !== 'idle') return;   // 动画进行中不重复触发
    const el = origin && origin.getBoundingClientRect ? origin : themeBtnRef.current;
    const rect = el
      ? el.getBoundingClientRect()
      : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    // 精确算扩散半径：圆心到最远角的距离 × 1.12（留一点余量让铺满略早于动画结束）。
    // 原先写死 160vmax —— 1440×900 下是 2304px，而实际只需约 1478px，
    // 后半程半径增长完全落在屏幕外，看起来像"瞬间切换"而不是"扩散"。
    const farX = Math.max(x, window.innerWidth - x);
    const farY = Math.max(y, window.innerHeight - y);
    const maxR = Math.ceil(Math.hypot(farX, farY) * 1.12);

    document.body.classList.add('theme-switching');

    // 先把遮罩设为「新主题底色 + 半径 0 + 新圆心」，再同步切到扩散态。
    // 顺序很关键：遮罩一上来就必须是新主题色，扩散才会呈现"从按下点灌满"的效果。
    const nextIsDark = !isDark;
    flushSync(() => {
      setRevealStyle({
        '--rx': `${x}px`,
        '--ry': `${y}px`,
        '--r-max': `${maxR}px`,
        // 与新主题 --bg-primary 保持一致（浅色 #f5f5f7 / 深色 #000000）
        '--overlay-bg': nextIsDark ? '#000000' : '#f5f5f7',
      });
      setRevealState('pre');
    });
    // 读一次布局，强制浏览器落盘"半径 0 + 新圆心"这个起始状态；
    // 否则起始值会被合并掉，clip-path 过渡整段丢失。
    if (themeOverlayRef.current) void themeOverlayRef.current.offsetHeight;
    // 用 flushSync 而非双 rAF：扩散能在点击后一帧内起跑
    // （原先实测有 ~300ms 空档，观感是"按下后卡一下才变色"）。
    flushSync(() => setRevealState('active'));

    // 扩散基本铺满时切换真实主题（此时遮罩已覆盖全屏，切换过程不可见）
    setTimeout(() => {
      toggleTheme();
      setRevealState('done');
    }, 640);

    // 淡出结束 → 清理
    setTimeout(() => {
      setRevealState('idle');
      setRevealStyle({});
      document.body.classList.remove('theme-switching');
    }, 1080);
  }, [toggleTheme, revealState, isDark]);

  // 任意入口（导航栏按钮 / 设置面板）请求切换主题时，统一走扩散动画。
  // preventDefault 表示"已由动画接管"，请求方据此决定是否兜底直切。
  useEffect(() => {
    const onRequest = (e) => {
      // 无论是否能接管，都要 preventDefault：请求方据此不做兜底直切
      e.preventDefault();
      if (revealState !== 'idle') return;
      handleToggleTheme(e.detail && e.detail.origin);
    };
    window.addEventListener('kakuki:request-theme-toggle', onRequest);
    return () => window.removeEventListener('kakuki:request-theme-toggle', onRequest);
  }, [handleToggleTheme, revealState]);

  return (
    <>
      <div className="bg-scene">
        <div className="bg-image-layer" />
        <StarfieldParallax />
        <div className="bg-scene-grid" />
        <InkWash />
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
        <ParticleField />
      </div>

      {scrollProgress > 0 && (
        <div className="scroll-progress" style={{ width: `${scrollProgress}%` }} />
      )}

      {/* 玻璃折射滤镜定义：全站玻璃小件（按钮/胶囊/返回顶部/输入框）共用。
          常驻挂载、0 尺寸不可见；CSS 里用 backdrop-filter: url(#kakuki-refract) 引用。 */}
      <svg aria-hidden="true" focusable="false" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
        <defs>
          <filter id="kakuki-refract" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feImage href={REFRACT_MAP_R} preserveAspectRatio="none" result="mr" />
            <feImage href={REFRACT_MAP_G} preserveAspectRatio="none" result="mg" />
            <feComposite in="mr" in2="mg" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="map" />
            {/* 折射位移量：64 → 32 → 16（两次下调，网格形变更含蓄） */}
            <feDisplacementMap in="SourceGraphic" in2="map" scale="16" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      {/* 返回顶部 */}
      <button
        className={`back-to-top ${scrollProgress > 8 ? 'show' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="返回顶部"
        title="返回顶部"
      >
        <ArrowUp size={18} />
      </button>

      {/* 主题切换扩散遮罩：常驻挂载（空闲时半径 0 不可见）。
          若按需挂载，浏览器往往来不及提交"半径 0"的初始值就开始过渡，
          实测会丢掉约 300ms 的动画起点，表现为"按下后卡一下才切换"。 */}
      <div
        ref={themeOverlayRef}
        className={`theme-overlay ${revealState === 'active' ? 'active' : ''} ${revealState === 'done' ? 'done' : ''}`}
        style={revealStyle}
      />

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
              onClick={(e) => handleToggleTheme(e.currentTarget)}
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
          <div className="status-item status-page">
            <span className="status-page-icon" />
            <span>正在浏览：{NAV_ITEMS.find(n => location.pathname === n.path)?.label || '首页'}</span>
          </div>
          <StatusUptime />
          <StatusFocus />
          <div className="status-item status-stack">
            <span className="status-tech-badge">React</span>
            <span className="status-tech-badge">Hono</span>
            <span className="status-tech-badge">Workers</span>
          </div>
          <div className="status-item status-meta">
            <span>Prisdvl © 2026 · v1.0.0</span>
          </div>
          <div className="status-item" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            {isDark ? <Moon size={12} /> : <Sun size={12} />}
            <span>{isDark ? '深色' : '浅色'}模式</span>
          </div>
        </div>
      </div>
    </>
  );
}
