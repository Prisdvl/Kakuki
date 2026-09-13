import { Component } from 'react';
import { AlertCircle } from 'lucide-react';

const CHUNK_ERROR_RE = /Failed to fetch dynamically imported module|Importing a module script failed|dynamically imported module/i;
const RELOAD_KEY = 'kakuki:chunk-reload-at';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, isChunkError: false };
  }

  static getDerivedStateFromError(error) {
    const isChunkError = CHUNK_ERROR_RE.test(String(error?.message || ''));
    return { hasError: true, error, isChunkError };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error Boundary caught:', error, errorInfo);
    // 动态 chunk 加载失败 = 浏览器持有旧版入口（部署后 chunk 名已变）。
    // 点「重试」只是重新 import 同一个失效 URL，救不回来；必须整页刷新拿新 HTML。
    // 10 秒内只自动刷新一次，防止部署异常时无限循环。
    if (this.state.isChunkError) {
      const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
      if (Date.now() - last > 10000) {
        sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
        window.location.reload();
      }
    }
  }

  handleRetry = () => {
    if (this.state.isChunkError) {
      window.location.reload();
      return;
    }
    this.setState({ hasError: false, error: null, isChunkError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          padding: '2rem',
        }}>
          <div style={{
            maxWidth: 420,
            textAlign: 'center',
            padding: '3rem 2rem',
            background: 'var(--card-bg)',
            borderRadius: 20,
            border: '1px solid var(--glass-border)',
            backdropFilter: 'blur(16px)',
          }}>
            <AlertCircle size={48} style={{ color: 'var(--error)', margin: '0 auto 1rem' }} />
            <h2 style={{ marginBottom: '0.5rem', fontSize: '1.2rem' }}>
              {this.state.isChunkError ? '站点已更新' : '页面出错了'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              {this.state.isChunkError
                ? '检测到新版本已发布，正在刷新页面…'
                : (this.state.error?.message || '发生了一个意外错误')}
            </p>
            <button
              onClick={this.handleRetry}
              className="btn-glass-solid"
              style={{ border: 'none', cursor: 'pointer' }}
            >
              {this.state.isChunkError ? '刷新' : '重试'}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
