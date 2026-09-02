import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error Boundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
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
            <div style={{ fontSize: 48, marginBottom: '1rem' }}>🤔</div>
            <h2 style={{ marginBottom: '0.5rem', fontSize: '1.2rem' }}>页面出错了</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              {this.state.error?.message || '发生了一个意外错误'}
            </p>
            <button
              onClick={this.handleRetry}
              className="btn-glass-solid"
              style={{ border: 'none', cursor: 'pointer' }}
            >
              重试
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
