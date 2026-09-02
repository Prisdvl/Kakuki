import { Link } from "react-router-dom";
import { Card, Tag } from "antd";
import { EyeOutlined, MessageOutlined, CalendarOutlined } from "@ant-design/icons";

export default function ArticleCard({ article }) {
  return (
    <Card
      className="mb-4 border border-[var(--border)] bg-[var(--card-bg)] rounded-2xl transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[var(--shadow-accent)] hover:border-[var(--accent)]"
      title={
        <Link
          to={`/article/${article.id}`}
          className="text-lg font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors duration-200"
        >
          {article.is_top && <Tag color="red">置顶</Tag>}
          {article.title}
        </Link>
      }
    >
      {article.summary && (
        <p className="text-[var(--text-secondary)] mb-3 leading-relaxed">{article.summary}</p>
      )}
      <div className="flex items-center gap-4 text-sm text-[var(--text-tertiary)]">
        {article.category && (
          <Tag className="border-[var(--border)] bg-[var(--accent-glow)] text-[var(--accent)]">
            {article.category.name}
          </Tag>
        )}
        <span className="flex items-center gap-1">
          <EyeOutlined /> {article.views}
        </span>
        <span className="flex items-center gap-1">
          <MessageOutlined /> {article.comment_count}
        </span>
        <span className="flex items-center gap-1">
          <CalendarOutlined /> {article.created_at?.slice(0, 10)}
        </span>
      </div>
    </Card>
  );
}