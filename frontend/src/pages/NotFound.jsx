import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="page-content page-enter">
      <div className="app-container notfound-wrap">
        <div className="notfound-body">
          <div className="notfound-code">404</div>
          <h1 className="notfound-title">页面未找到</h1>
          <p className="notfound-desc">
            你访问的页面可能已被移除或链接有误。
          </p>
          <div className="ui-flex ui-gap-2 notfound-actions">
            <Link to="/" className="ui-btn ui-btn-primary">
              <Home size={16} /> 返回首页
            </Link>
            <button
              onClick={() => window.history.back()}
              className="ui-btn"
            >
              <ArrowLeft size={16} /> 返回上页
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
