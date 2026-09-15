import { ExternalLink, Star, Rocket, GitBranch, Code2, Clock } from "lucide-react";
import { useGithubProjects, LANG_COLORS } from "../../hooks/useGithubProjects";

const GITHUB_URL = 'https://github.com/Prisdvl';
const GITEE_URL = '';   // 待老大提供 Gitee 用户名后填入

function relTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d < 1) return '今天更新';
  if (d < 30) return `${d} 天前更新`;
  const m = Math.floor(d / 30);
  if (m < 12) return `${m} 个月前更新`;
  return `${Math.floor(m / 12)} 年前更新`;
}

export default function ProjectsPage() {
  const { projects, loading, error, stale } = useGithubProjects();

  return (
    <div className="pj-page">
      <header className="pj-head">
        <h1 className="pj-title">项目</h1>
        <p className="pj-sub">数据实时来自 GitHub 仓库，只列自有项目（不含 fork）。</p>
        <div className="pj-links">
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="pj-link glass-button" style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem' }}>
            <GitBranch size={14} /> GitHub
          </a>
          {GITEE_URL && (
            <a href={GITEE_URL} target="_blank" rel="noopener noreferrer" className="pj-link glass-button" style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem' }}>
              <Code2 size={14} /> Gitee
            </a>
          )}
        </div>
      </header>

      {loading && projects.length === 0 ? (
        <div className="pj-grid">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="pj-card shimmer" style={{ height: 186 }} />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="pj-empty">
          <Rocket size={38} style={{ opacity: 0.35 }} />
          <p>暂时拉不到项目数据</p>
          {error && <span className="pj-empty-hint">原因：{error}</span>}
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="pj-link glass-button" style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem' }}>
            去 GitHub 看看 <ExternalLink size={13} />
          </a>
        </div>
      ) : (
        <>
          <div className="pj-grid">
            {projects.map((p, i) => (
              <a
                key={p.id}
                href={p.repo_url || p.url || GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="pj-card reveal"
                style={{ '--reveal-i': i }}
              >
                <div className="pj-card-top">
                  <span className="pj-card-icon">
                    <Code2 size={18} />
                  </span>
                  <div className="pj-card-badges">
                    {p.is_featured && <span className="pj-badge featured">精选</span>}
                    {p.stars > 0 && (
                      <span className="pj-badge star">
                        <Star size={10} fill="currentColor" /> {p.stars}
                      </span>
                    )}
                    <ExternalLink size={14} className="pj-card-ext" />
                  </div>
                </div>

                <h3 className="pj-card-name">{p.name}</h3>
                <p className="pj-card-desc">{p.description || '暂无项目描述'}</p>

                <div className="pj-card-foot">
                  <div className="pj-card-tech">
                    {p.language && (
                      <span className="pj-lang">
                        <i style={{ background: LANG_COLORS[p.language] || '#8b949e' }} />
                        {p.language}
                      </span>
                    )}
                    {p.tech_list
                      .filter((t) => t !== p.language)
                      .slice(0, 3)
                      .map((t) => (
                        <span key={t} className="pj-tag">{t}</span>
                      ))}
                  </div>
                  {p.updated_at && (
                    <span className="pj-time">
                      <Clock size={10} /> {relTime(p.updated_at)}
                    </span>
                  )}
                </div>
              </a>
            ))}
          </div>

          {stale && (
            <p className="pj-stale">
              当前显示的是缓存快照（GitHub API 暂时不可达{error ? `：${error}` : ''}）
            </p>
          )}
        </>
      )}
    </div>
  );
}
