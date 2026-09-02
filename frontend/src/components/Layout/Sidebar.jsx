import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, Tag } from "antd";
import { getCategories, getTags, getArticles } from "../../api/article";
import { extractList } from "../../api/request";

export default function Sidebar() {
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [hotArticles, setHotArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getCategories(),
      getTags(),
      getArticles({ ordering: "-views", page_size: 5 }),
    ]).then(([catRes, tagRes, artRes]) => {
      setCategories(extractList(catRes));
      setTags(extractList(tagRes));
      setHotArticles(extractList(artRes));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: "2rem 0" }}>
      <div style={{
        width: 24, height: 24, borderRadius: "50%",
        border: "2px solid var(--accent-soft)",
        borderTopColor: "var(--accent)",
        animation: "sidebar-spin 0.8s linear infinite",
      }} />
      <style>{`@keyframes sidebar-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card
        title="分类"
        size="small"
        className="border border-[var(--border)] bg-[var(--card-bg)] rounded-2xl"
      >
        <ul className="space-y-2">
          {categories.map((cat) => (
            <li key={cat.id}>
              <Link
                to={`/category/${cat.id}`}
                className="flex justify-between text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors duration-200 py-1 rounded-md px-1 -mx-1 hover:bg-[var(--accent-glow)]"
              >
                <span>{cat.name}</span>
                <span className="text-[var(--text-tertiary)]">({cat.article_count})</span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
      <Card
        title="标签云"
        size="small"
        className="border border-[var(--border)] bg-[var(--card-bg)] rounded-2xl"
      >
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Link key={tag.id} to={`/tag/${tag.id}`}>
              <Tag
                className="cursor-pointer rounded-lg border-[var(--border)] bg-[var(--glass-bg-strong)] text-[var(--text-primary)] hover:text-[var(--accent)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] transition-all duration-200 font-semibold shadow-sm"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
              >
                {tag.name}
              </Tag>
            </Link>
          ))}
        </div>
      </Card>
      <Card
        title="热门文章"
        size="small"
        className="border border-[var(--border)] bg-[var(--card-bg)] rounded-2xl"
      >
        <ul className="space-y-2">
          {hotArticles.map((art) => (
            <li key={art.id}>
              <Link
                to={`/article/${art.id}`}
                className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors duration-200 line-clamp-2 block py-1"
              >
                {art.title}
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}