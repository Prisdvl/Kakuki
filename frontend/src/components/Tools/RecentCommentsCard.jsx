import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, User } from 'lucide-react';
import { getRecentComments } from '../../api/comment';
import { extractList } from '../../api/request';

/** 最近评论（首页可添加组件之一） */
export default function RecentCommentsCard() {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRecentComments(5)
      .then((res) => setComments(extractList(res)))
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="ui-card ui-pad ui-flex-col ui-h-full">
      <div className="ui-card-head">
        <h3 className="ui-card-title">
          <MessageSquare size={18} /> 最近评论
        </h3>
      </div>
      {loading ? (
        <div className="ui-empty ui-empty-inline ui-flex-1">
          <span className="ui-empty-text">加载中…</span>
        </div>
      ) : comments.length === 0 ? (
        <div className="ui-empty ui-empty-inline ui-flex-1">
          <span className="ui-empty-text">暂无评论</span>
        </div>
      ) : (
        <div className="ui-card-list ui-flex-1">
          {comments.map((c) => (
            <div key={c.id} className="ui-card-row ui-card-row-stack comments-mini">
              <span className="comments-mini-content">{c.content}</span>
              <span className="comments-mini-meta">
                <span className="ui-card-sub"><User size={11} /> {c.user_name}</span>
                {c.article != null && (
                  <Link to={`/article/${c.article}`} className="ui-card-link comments-mini-more">
                    去文章 →
                  </Link>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}