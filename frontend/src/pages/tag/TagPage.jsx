import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getTags, getArticles } from "../../api/article";
import { extractList } from "../../api/request";

export default function TagPage() {
  const { id } = useParams();
  const [tags, setTags] = useState([]);
  const [articles, setArticles] = useState([]);
  const [activeTag, setActiveTag] = useState(id ? Number(id) : null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTags().then((res) => setTags(extractList(res)));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = activeTag ? { tag: activeTag, page_size: 50 } : { page_size: 50 };
    getArticles(params).then((res) => setArticles(extractList(res))).finally(() => setLoading(false));
  }, [activeTag]);

  useEffect(() => { setActiveTag(id ? Number(id) : null); }, [id]);

  // Font sizes weighted by article count
  const maxCount = Math.max(1, ...tags.map((t) => t.article_count || 0));

  return (
    <div style={{ paddingTop: "2rem" }}>
      <h2 style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" }}>标签云</h2>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>标签越大，文章越多。点击筛选。</p>

      {/* Tag Cloud */}
      <div className="tag-cloud-container">
        <button
          className={`tag-chip ${!activeTag ? "active" : ""}`}
          onClick={() => setActiveTag(null)}
        >
          全部
          <span className="tag-chip-count">{tags.length}</span>
        </button>
        {tags.map((tag) => {
          const count = tag.article_count || 0;
          const ratio = count / maxCount;
          const fontSize = 13 + ratio * 18;
          return (
            <button
              key={tag.id}
              className={`tag-chip ${activeTag === tag.id ? "active" : ""}`}
              style={{ fontSize: `${fontSize}px` }}
              onClick={() => setActiveTag(activeTag === tag.id ? null : tag.id)}
            >
              {tag.name}
              {count > 0 && <span className="tag-chip-count">{count}</span>}
            </button>
          );
        })}
      </div>

      {activeTag && (
        <div style={{ marginBottom: "1.5rem", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
          筛选标签：<span style={{ color: "var(--accent)", fontWeight: 600 }}>{tags.find((t) => t.id === activeTag)?.name}</span>
          {" "}· {articles.length} 篇文章
        </div>
      )}

      {loading ? null : articles.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {articles.map((a) => (
            <Link key={a.id} to={`/article/${a.id}`} className="article-card" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 className="article-card-title" style={{ fontSize: "1rem", marginBottom: "0.25rem" }}>{a.title}</h3>
                {a.summary && <p className="article-card-summary" style={{ fontSize: "0.85rem" }}>{a.summary}</p>}
                <div className="article-card-meta" style={{ marginBottom: 0, marginTop: "0.25rem" }}><span>{a.created_at?.slice(0, 10)}</span></div>
              </div>
            </Link>
          ))}
        </div>
      ) : <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--text-tertiary)" }}>{activeTag ? "该标签下暂无文章" : "暂无文章"}</div>}
    </div>
  );
}
