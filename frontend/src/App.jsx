import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider, theme as antdTheme } from 'antd';
import { useEffect, Suspense, lazy, useRef, useState } from 'react';
import AppLayout from './components/Layout/AppLayout';
import ErrorBoundary from './components/ErrorBoundary';
import Loader from './components/Loader';
import useThemeStore from './store/themeStore';
import { useAppLoader } from './hooks/useAppLoader';

const HomePage = lazy(() => import('./pages/home/HomePage'));
const ArticleDetailPage = lazy(() => import('./pages/article/ArticleDetailPage'));
const ArchivePage = lazy(() => import('./pages/archive/ArchivePage'));
const CategoryPage = lazy(() => import('./pages/category/CategoryPage'));
const ProjectsPage = lazy(() => import('./pages/projects/ProjectsPage'));
const MusicPage = lazy(() => import('./pages/music/MusicPage'));
const TalksPage = lazy(() => import('./pages/talks/TalksPage'));
const AboutPage = lazy(() => import('./pages/about/AboutPage'));
const LoginPage = lazy(() => import('./pages/login/LoginPage'));
const RegisterPage = lazy(() => import('./pages/login/RegisterPage'));
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
      justifyContent: 'center', minHeight: '50vh', gap: '1rem',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        border: '3px solid var(--accent-glow)', borderTopColor: 'var(--accent)',
        animation: 'spin 0.8s linear infinite',
      }} />
      <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>加载中...</span>
    </div>
  );
}

function ThemeWrapper({ children }) {
  const isInitialized = useThemeStore((state) => state.isInitialized);
  const { progress, statusText, loading, startLoading, completeTask, finishLoading } = useAppLoader(true);
  const startedRef = useRef(false);
  const [loaderFading, setLoaderFading] = useState(false);
  const [showingLoader, setShowingLoader] = useState(true);

  useEffect(() => {
    if (!isInitialized || startedRef.current) return;
    startedRef.current = true;
    startLoading();

    const startTime = Date.now();
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
          statusText={statusText || '正在加载...'}
          showProgress={true}
          fadingOut={loaderFading}
        />
      )}
    </>
  );
}

export default function App() {
  const { isDark, themeColor, colorPalette } = useThemeStore(
    (state) => ({ isDark: state.isDark, themeColor: state.themeColor, colorPalette: state.colorPalette }),
    (a, b) => a.isDark === b.isDark && a.themeColor === b.themeColor && a.colorPalette === b.colorPalette
  );
  const accent = themeColor || '#7c3aed';
  const accentSoft = accent + '1f';
  const accentGlow = accent + '40';
  const accentSecondary = colorPalette?.LightVibrant || '#ec4899';
  const bgContainer = isDark
    ? (colorPalette?.DarkMuted || '#1e1b4b')
    : (colorPalette?.LightMuted || '#ffffff');
  const bgElevated = isDark
    ? (colorPalette?.DarkVibrant || '#262260')
    : '#ffffff';
  const textPrimary = isDark
    ? (colorPalette?.LightVibrant || '#ede9fe')
    : (colorPalette?.DarkVibrant || '#1e1b4b');
  const textSecondary = isDark
    ? (colorPalette?.Vibrant || '#c4b5fd')
    : (colorPalette?.Muted || '#4c1d95');

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: accent,
          colorInfo: accent,
          colorSuccess: '#22c55e',
          colorWarning: '#f59e0b',
          colorError: '#ef4444',
          borderRadius: 12,
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
          colorBgContainer: bgContainer,
          colorBgElevated: bgElevated,
          colorText: textPrimary,
          colorTextSecondary: textSecondary,
          colorBorder: isDark ? accentGlow.replace('40', '26') : accentGlow.replace('40', '1f'),
          controlHeight: 44,
          controlOutline: accentGlow,
        },
        components: {
          Button: {
            colorPrimary: accent,
            algorithm: true,
            borderRadius: 12,
            controlHeight: 44,
          },
          Input: {
            colorPrimary: accent,
            algorithm: true,
            borderRadius: 12,
            controlHeight: 44,
            activeBorderColor: accent,
            hoverBorderColor: accent,
          },
          Form: {
            labelColor: textSecondary,
          },
          Card: {
            headerBg: isDark ? bgContainer : '#ffffff',
            colorBorderSecondary: isDark ? accentGlow.replace('40', '26') : accentGlow.replace('40', '1f'),
          },
          Tag: {
            colorPrimary: accent,
          },
          Menu: {
            itemSelectedBg: isDark ? accentSoft : accentSoft,
          },
        },
      }}
    >
      <ThemeWrapper>
        <BrowserRouter>
          <ErrorBoundary>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<AppLayout />}>
                  <Route index element={<HomePage />} />
                  <Route path="article/:id" element={<ArticleDetailPage />} />
                  <Route path="archive" element={<ArchivePage />} />
                  <Route path="category" element={<CategoryPage />} />
                  <Route path="category/:id" element={<CategoryPage />} />
                  <Route path="projects" element={<ProjectsPage />} />
                  <Route path="music" element={<MusicPage />} />
                  <Route path="talks" element={<TalksPage />} />
                  <Route path="about" element={<AboutPage />} />
                  <Route path="login" element={<LoginPage />} />
                  <Route path="register" element={<RegisterPage />} />
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
