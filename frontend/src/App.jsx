import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme as antdTheme } from 'antd';
import { useEffect, Suspense, lazy, useState } from 'react';
import AppLayout from './components/Layout/AppLayout';
import ErrorBoundary from './components/ErrorBoundary';
import Loader from './components/Loader';
import useThemeStore from './store/themeStore';
import { useAppLoader } from './hooks/useAppLoader';

const HomePage = lazy(() => import('./pages/home/HomePage'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const ArticleDetailPage = lazy(() => import('./pages/article/ArticleDetailPage'));
const ArchivePage = lazy(() => import('./pages/archive/ArchivePage'));
const ProjectsPage = lazy(() => import('./pages/projects/ProjectsPage'));
const MusicPage = lazy(() => import('./pages/music/MusicPage'));
const TalksPage = lazy(() => import('./pages/talks/TalksPage'));
const AboutPage = lazy(() => import('./pages/about/AboutPage'));
const LoginPage = lazy(() => import('./pages/login/LoginPage'));
const NotFound = lazy(() => import('./pages/NotFound'));
const AdminLayout = lazy(() => import('./components/Layout/AdminLayout'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const ArticleManage = lazy(() => import('./pages/admin/ArticleManage'));
const ArticleEditor = lazy(() => import('./pages/admin/ArticleEditor'));
const CategoryManage = lazy(() => import('./pages/admin/CategoryManage'));
const CommentManage = lazy(() => import('./pages/admin/CommentManage'));

function PageFallback() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '50vh', gap: '0.75rem',
    }}>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', letterSpacing: '0.12em' }}>加载中…</span>
    </div>
  );
}

function ThemeWrapper({ children }) {
  const isInitialized = useThemeStore((state) => state.isInitialized);
  const { progress, statusText, loading, startLoading, completeTask, finishLoading } = useAppLoader(true);
  const [loaderFading, setLoaderFading] = useState(false);
  const [showingLoader, setShowingLoader] = useState(true);

  useEffect(() => {
    // 注意：React.StrictMode 开发模式会双执行 effect（mount→模拟卸载→再 mount），
    // 必须让第二次执行能重新设置定时器，否则 finishLoading 永不触发、加载动画卡死。
    // 因此不使用 startedRef 防重跑，而是依赖 cleanup 清理旧定时器、第二次执行重建。
    if (!isInitialized) return;
    startLoading();

    const minDuration = 1200;

    const steps = [
      { delay: 0, text: '正在初始化主题...' },
      { delay: 0.35, text: '正在应用配色...' },
      { delay: 0.7, text: '正在准备界面...' },
    ];

    const timers = steps.map((step) =>
      setTimeout(() => {
        completeTask(step.delay * 100, 100, step.text);
      }, step.delay * minDuration)
    );

    const finishTimer = setTimeout(() => {
      finishLoading('加载完成');
    }, minDuration);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(finishTimer);
    };
  }, [isInitialized, startLoading, completeTask, finishLoading]);

  // 加载完成后，保持 Loader 显示 800ms 用于平滑淡出
  useEffect(() => {
    if (!loading && isInitialized && showingLoader) {
      setLoaderFading(true);
      const timer = setTimeout(() => {
        setShowingLoader(false);
        setLoaderFading(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [loading, isInitialized, showingLoader]);

  return (
    <>
      {children}
      {showingLoader && (
        <Loader
          fullscreen
          progress={progress}
          statusText={statusText || '正在初始化...'}
          showProgress={true}
          fadingOut={loaderFading}
        />
      )}
    </>
  );
}

// ===== antd 主题与 CSS 令牌对齐 =====
// themeStore.applyThemeVars() 把对比度标定后的颜色写到 :root 的内联样式上，
// 但那是 CSS 变量，antd 的 ConfigProvider 读不到 —— 它只能吃字面值。
// 若这里直接用 colorPalette 的原始值，会出现两套色：CSS 用标定后的 accent，
// antd 用未标定的 Vibrant，同屏的 antd 按钮与自绘玻璃按钮深浅不一。
// 因此这里统一走同一套 CSS 变量引用（antd 5 的 token 支持 var() 字符串），
// 由 themeStore 保证变量已存在；var() 无法求值时 antd 会回落到算法色。
const CSS_VARS = {
  accent: 'var(--accent)',
  accentSoft: 'var(--accent-soft)',
  onAccent: 'var(--on-accent)',
  bgContainer: 'var(--card-bg)',
  bgElevated: 'var(--glass-bg-strong)',
  textPrimary: 'var(--text-primary)',
  textSecondary: 'var(--text-secondary)',
  textTertiary: 'var(--text-tertiary)',
  border: 'var(--border)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  error: 'var(--error)',
  info: 'var(--info)',
};

// 圆角 / 高度 / 时长与 design-tokens.css 的档位一一对应，禁止在这里另立数值。
// （antd 的 borderRadius=14 对应 --radius-md 12px 一档，取 14 会让按钮比自绘 .ui-btn 更圆）
const RADIUS_MD = 12;
const RADIUS_SM = 10;
const RADIUS_LG = 20;
const CONTROL_H = 40;
const CONTROL_H_SM = 32;
const CONTROL_H_LG = 48;

export default function App() {
  const { isDark } = useThemeStore(
    (state) => ({ isDark: state.isDark }),
    (a, b) => a.isDark === b.isDark
  );

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: CSS_VARS.accent,
          colorInfo: CSS_VARS.info,
          colorSuccess: CSS_VARS.success,
          colorWarning: CSS_VARS.warning,
          colorError: CSS_VARS.error,
          // 圆角与 --radius-sm/md/xl 对齐（曾散写 14/10/20，与 CSS 的 12 不一致）
          borderRadius: RADIUS_MD,
          borderRadiusSM: RADIUS_SM,
          borderRadiusLG: RADIUS_LG,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          colorBgContainer: CSS_VARS.bgContainer,
          colorBgElevated: CSS_VARS.bgElevated,
          colorText: CSS_VARS.textPrimary,
          colorTextSecondary: CSS_VARS.textSecondary,
          colorTextTertiary: CSS_VARS.textTertiary,
          colorBorder: CSS_VARS.border,
          colorBorderSecondary: CSS_VARS.border,
          controlHeight: CONTROL_H,
          controlHeightSM: CONTROL_H_SM,
          controlHeightLG: CONTROL_H_LG,
          // 与 --motion-* / --ease-* 同值（antd 只接受 ms/s 与字面曲线）
          motionDurationFast: '0.18s',
          motionDurationMid: '0.24s',
          motionDurationSlow: '0.36s',
          motionEaseIn: 'cubic-bezier(0.55, 0.06, 0.68, 0.19)',
          motionEaseOut: 'cubic-bezier(0.165, 0.84, 0.44, 1)',
          motionEaseInOut: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
        },
        components: {
          Button: {
            borderRadius: RADIUS_MD,
            borderRadiusSM: RADIUS_SM,
            controlHeight: CONTROL_H,
            fontWeight: 500,
            primaryShadow: '0 4px 16px var(--accent-glow)',
          },
          Input: {
            borderRadius: RADIUS_MD,
            controlHeight: CONTROL_H,
            activeBorderColor: CSS_VARS.accent,
            hoverBorderColor: CSS_VARS.accent,
            activeShadow: '0 0 0 3px var(--accent-glow)',
          },
          Select: {
            borderRadius: RADIUS_MD,
            controlHeight: CONTROL_H,
          },
          Card: {
            borderRadiusLG: RADIUS_LG,
            colorBorderSecondary: CSS_VARS.border,
          },
          Tag: {
            borderRadiusSM: RADIUS_SM,
          },
          Menu: {
            itemBorderRadius: RADIUS_SM,
            motionDurationMid: '0.24s',
          },
          Modal: {
            borderRadiusLG: RADIUS_LG,
            motionDurationMid: '0.24s',
          },
          Drawer: {
            motionDurationMid: '0.36s',
          },
          Tabs: {
            inkBarColor: CSS_VARS.accent,
            itemSelectedColor: CSS_VARS.accent,
            motionDurationMid: '0.24s',
          },
        },
      }}
    >
      <ThemeWrapper>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <ErrorBoundary>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<AppLayout />}>
                  <Route index element={<HomePage />} />
          <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="article/:id" element={<ArticleDetailPage />} />
                  <Route path="archive" element={<ArchivePage />} />
                  {/* 分类已整合进归档页（搜索 + 分类同页），旧路由重定向 */}
                  <Route path="category" element={<Navigate to="/archive" replace />} />
                  <Route path="category/:id" element={<Navigate to="/archive" replace />} />
                  <Route path="projects" element={<ProjectsPage />} />
                  <Route path="music" element={<MusicPage />} />
                  {/* 数据统计已并入仪表盘（流量区块），旧路由重定向 */}
                  <Route path="stats" element={<Navigate to="/dashboard" replace />} />
                  <Route path="talks" element={<TalksPage />} />
                  <Route path="about" element={<AboutPage />} />
                  <Route path="login" element={<LoginPage />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="articles" element={<ArticleManage />} />
                  <Route path="articles/new" element={<ArticleEditor />} />
                  <Route path="articles/:id/edit" element={<ArticleEditor />} />
                  <Route path="categories" element={<CategoryManage />} />
                  <Route path="comments" element={<CommentManage />} />
                </Route>
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </ThemeWrapper>
    </ConfigProvider>
  );
}
