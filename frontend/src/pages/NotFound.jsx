import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="page-content page-enter">
      <div className="app-container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
      }}>
        <div style={{
          textAlign: 'center',
          maxWidth: 440,
          padding: '3rem 2rem',
        }}>
          <div style={{
            fontSize: '6rem',
            fontWeight: 800,
            lineHeight: 1,
            background: 'linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 40%, var(--bg-secondary)))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '1rem',
          }}>
            404
          </div>
          <h1 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>页面未找到</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            你访问的页面可能已被移除或链接有误。
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <Link to="/" className="btn-glass-solid" style={{ textDecoration: 'none' }}>
              <Home size={16} style={{ marginRight: 6 }} />
              返回首页
            </Link>
            <button
              onClick={() => window.history.back()}
              className="btn-glass"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <ArrowLeft size={16} />
              返回上页
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
