import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getCategories, getArticles } from "../../api/article";
import { extractList } from "../../api/request";

export default function CategoryPage() {
  const { id } = useParams();
  const [categories, setCategories] = useState([]);
  const [articles, setArticles] = useState([]);
  const [activeCat, setActiveCat] = useState(id ? Number(id) : null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCategories().then((res) => setCategories(extractList(res)));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = activeCat ? { category: activeCat, page_size: 50 } : { page_size: 50 };
    getArticles(params).then((res) => setArticles(extractList(res))).finally(() => setLoading(false));
  }, [activeCat]);

  useEffect(() => { setActiveCat(id ? Number(id) : null); }, [id]);

  return (
    <div style={{ paddingTop: "2rem" }}>
      <h2 style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" }}>分类</h2>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "2rem" }}>按分类浏览文章</p>

      <div className="category-chip-container">
        <button
          className={`category-chip ${!activeCat ? "active" : ""}`}
          onClick={() => setActiveCat(null)}
        >
          全部
          <span className="category-chip-count">{categories.length}</span>
        </button>
        {categories.map((cat) => {
          const count = cat.article_count || 0;
          return (
            <button
              key={cat.id}
              className={`category-chip ${activeCat === cat.id ? "active" : ""}`}
              onClick={() => setActiveCat(activeCat === cat.id ? null : cat.id)}
            >
              {cat.name}
              {count > 0 && <span className="category-chip-count">{count}</span>}
            </button>
          );
        })}
      </div>

      {activeCat && (
        <div style={{ marginBottom: "1.5rem", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
          筛选分类：<span style={{ color: "var(--accent)", fontWeight: 600 }}>{categories.find((c) => c.id === activeCat)?.name}</span>
          {" "}· {articles.length} 篇文章
        </div>
      )}

      {loading ? null : articles.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {articles.map((article, i) => (
            <Link key={article.id} to={`/article/${article.id}`}
              className="article-card reveal"
              style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem", '--reveal-i': i }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 className="article-card-title" style={{ fontSize: "1rem", marginBottom: "0.25rem" }}>{article.title}</h3>
                {article.summary && <p className="article-card-summary" style={{ fontSize: "0.85rem" }}>{article.summary}</p>}
                <div className="article-card-meta" style={{ marginBottom: 0, marginTop: "0.25rem" }}>
                  <span>{article.created_at?.slice(0, 10)}</span>
                  <span>{" "}· {article.views} 次阅读</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--text-tertiary)" }}>
          {activeCat ? "该分类下暂无文章" : "暂无文章"}
        </div>
      )}
    </div>
  );
}
