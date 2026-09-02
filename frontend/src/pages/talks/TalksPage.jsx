import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Calendar, Heart, Trash2, Send, MessageSquare } from "lucide-react";
import { message, Popconfirm, Input, Button } from "antd";
import { getTalks, createTalk, deleteTalk, likeTalk } from "../../api/talk";
import { extractList } from "../../api/request";
import useUserStore from "../../store/userStore";

function TalkCard({ talk, index, isStaff, onLike, onDelete }) {
  const [liked, setLiked] = useState(!!talk.liked);
  const [count, setCount] = useState(talk.like_count || 0);
  const [burstKey, setBurstKey] = useState(0);

  const handleLike = async () => {
    if (!liked) setBurstKey((k) => k + 1);
    try {
      const res = await onLike(talk.id);
      const data = res?.data ?? res;
      if (data) {
        setLiked(data.liked);
        setCount(data.like_count);
      }
    } catch { /* 保持原状态 */ }
  };

  return (
    <div className="glass talk-card reveal" style={{ transitionDelay: `${index * 60}ms` }}>
      <p className="talk-content">{talk.content}</p>
      <div className="talk-footer">
        <div className="talk-meta">
          <span><Calendar size={13} /> {talk.created_at?.slice(0, 10)}</span>
          <span><MessageSquare size={13} /> {talk.author_name || '博主'}</span>
        </div>
        <div className="talk-actions">
          <button
            className={`talk-like-btn ${liked ? 'liked' : ''}`}
            onClick={handleLike}
            aria-label={liked ? '取消点赞' : '点赞'}
          >
            <Heart size={14} fill={liked ? 'currentColor' : 'none'} />
            {count}
            {!liked && burstKey > 0 && (
              <span key={burstKey} className="like-burst" aria-hidden>
                {[...Array(8)].map((_, i) => <i key={i} className={`like-particle p${i}`} />)}
              </span>
            )}
          </button>
          {isStaff && (
            <Popconfirm title="确认删除这条杂谈？" onConfirm={() => onDelete(talk.id)}>
              <button className="talk-delete-btn" aria-label="删除"><Trash2 size={14} /></button>
            </Popconfirm>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TalksPage() {
  const [talks, setTalks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { isLoggedIn, user } = useUserStore();

  const fetchTalks = useCallback(async () => {
    try {
      const res = await getTalks();
      setTalks(extractList(res));
    } catch { /* 列表为空 */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTalks(); }, [fetchTalks]);

  const handlePublish = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await createTalk({ content: content.trim() });
      message.success("发布成功");
      setContent("");
      fetchTalks();
    } catch {
      message.error("发布失败，请确认已登录管理员账号");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteTalk(id);
      message.success("已删除");
      fetchTalks();
    } catch { message.error("删除失败"); }
  };

  const handleLikeById = (id) => likeTalk(id);

  return (
    <div style={{ paddingTop: "2rem", maxWidth: 760, margin: "0 auto" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" }}>杂谈</h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>一些零碎的思考和日常记录。</p>

      {isLoggedIn && user?.is_staff && (
        <div className="glass talk-publish reveal">
          <Input.TextArea
            rows={2}
            maxLength={500}
            showCount
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="记录此刻的想法..."
            className="rounded-xl"
          />
          <Button
            type="primary"
            icon={<Send size={14} />}
            loading={submitting}
            onClick={handlePublish}
            className="mt-2 !bg-[var(--accent)] hover:!bg-[var(--accent-hover)]"
          >
            发布杂谈
          </Button>
        </div>
      )}

      {loading ? (
        <div className="glass talk-card shimmer" style={{ height: 120 }} />
      ) : talks.length === 0 ? (
        <div className="glass talk-card" style={{ textAlign: "center", color: "var(--text-tertiary)", padding: "3rem" }}>
          还没有杂谈，快来写下第一条吧
        </div>
      ) : (
        talks.map((t, i) => (
          <TalkCard
            key={t.id}
            talk={t}
            index={i}
            isStaff={isLoggedIn && user?.is_staff}
            onLike={handleLikeById}
            onDelete={handleDelete}
          />
        ))
      )}

      <div style={{ marginTop: "2rem", textAlign: "center" }}>
        <Link to="/" style={{ color: "var(--accent)", fontSize: "0.88rem" }}>&larr; 返回首页</Link>
      </div>
    </div>
  );
}
