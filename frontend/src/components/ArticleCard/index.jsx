import { Link } from "react-router-dom";
import { Tag } from "antd";
import { Eye, MessageCircle, Calendar } from "lucide-react";

/**
 * ArticleCard — 优化版
 *
 * 关键改动：
 *   - 弃用 Antd Card（自带浏览器样式难以覆盖且动画手感差）
 *   - 改用 .glass-elevated（自带液态玻璃 + GPU 优化过渡）
 *   - 仅靠 transform + opacity 实现 hover，无 layout 抖动
 *   - 通过 --refraction-x / --refraction-y 暴露折射坐标供鼠标交互
 *   - 响应 prefers-reduced-motion（由 CSS 集中处理）
 */
export default function ArticleCard({ article }) {
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    e.currentTarget.style.setProperty("--refraction-x", `${x}%`);
    e.currentTarget.style.setProperty("--refraction-y", `${y}%`);
  };

  return (
    <Link
      to={`/article/${article.id}`}
      className="glass-elevated lift-on-hover stagger-item"
      style={{ display: "block", textDecoration: "none", color: "inherit" }}
      onMouseMove={handleMouseMove}
    >
      {article.cover && (
        <div style={{ overflow: "hidden", borderRadius: "var(--radius-xl) var(--radius-xl) 0 0" }}>
          <img
            src={article.cover}
            alt={article.title}
            loading="lazy"
            className="card-image"
            style={{
              width: "100%",
              height: 210,
              objectFit: "cover",
              display: "block",
              transition: "transform var(--motion-slower) var(--ease-standard)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.06)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          />
        </div>
      )}

      <div style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
          {article.is_top && <Tag color="red" bordered={false}>置顶</Tag>}
          {article.category && (
            <span className="glass-pill" style={{ fontSize: "0.75rem" }}>
              {article.category.name}
            </span>
          )}
        </div>

        <h3
          style={{
            fontSize: "1.15rem",
            fontWeight: 700,
            lineHeight: 1.4,
            color: "var(--text-primary)",
            marginBottom: "0.5rem",
            transition: "color var(--motion-fast) var(--ease-standard)",
          }}
          className="article-title-hover"
        >
          {article.title}
        </h3>

        {article.summary && (
          <p
            style={{
              fontSize: "0.88rem",
              color: "var(--text-secondary)",
              lineHeight: 1.6,
              margin: 0,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {article.summary}
          </p>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            marginTop: "1rem",
            fontSize: "0.8rem",
            color: "var(--text-tertiary)",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
            <Eye size={14} /> {article.views ?? 0}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
            <MessageCircle size={14} /> {article.comment_count ?? 0}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
            <Calendar size={14} /> {article.created_at?.slice(0, 10)}
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ============================================================
 * 配套的 CSS（直接放在组件文件下，避免散落，可被项目内 CSS 引入）
 * ============================================================ */
const styles = `
.article-title-hover:hover {
  color: var(--accent);
}

.stagger-item {
  opacity: 0;
  animation: fadeUp var(--motion-slow) var(--ease-decelerate) both;
  animation-delay: calc(var(--i, 0) * 80ms);
}

@media (prefers-reduced-motion: reduce) {
  .stagger-item { animation: none !important; opacity: 1 !important; transform: none !important; }
}
`;

if (typeof document !== "undefined" && !document.getElementById("article-card-styles")) {
  const tag = document.createElement("style");
  tag.id = "article-card-styles";
  tag.textContent = styles;
  document.head.appendChild(tag);
}