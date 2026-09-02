import { useState, useEffect } from "react";
import { List, Avatar, Button, Input, message, Popconfirm } from "antd";
import { UserOutlined, DeleteOutlined } from "@ant-design/icons";
import { getComments, createComment, deleteComment } from "../../api/comment";
import { extractList } from "../../api/request";
import useUserStore from "../../store/userStore";

export default function CommentList({ articleId }) {
  const [comments, setComments] = useState([]);
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [loading, setLoading] = useState(false);
  const { isLoggedIn, user } = useUserStore();

  const fetchComments = async () => {
    try {
      const res = await getComments(articleId);
      setComments(extractList(res));
    } catch { }
  };

  useEffect(() => { fetchComments(); }, [articleId]);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      await createComment({ article: articleId, content: content.trim(), parent: replyTo?.id || null });
      message.success("评论成功");
      setContent("");
      setReplyTo(null);
      fetchComments();
    } catch { message.error("评论失败"); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    try { await deleteComment(id); message.success("删除成功"); fetchComments(); }
    catch { message.error("删除失败"); }
  };

  return (
    <div className="mt-8 animate-fade-in-up">
      <h3 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">评论 ({comments.length})</h3>
      {isLoggedIn ? (
        <div className="mb-6 p-4 rounded-xl border border-[var(--border)] bg-[var(--card-bg)]">
          {replyTo && (
            <div className="text-sm text-[var(--text-secondary)] mb-2">
              回复 @{replyTo.user_name}：
              <Button
                type="link"
                size="small"
                className="!text-[var(--accent)]"
                onClick={() => setReplyTo(null)}
              >
                取消
              </Button>
            </div>
          )}
          <Input.TextArea
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="写下你的评论..."
            className="rounded-lg"
          />
          <Button
            type="primary"
            className="mt-2 !bg-[var(--accent)] hover:!bg-[var(--accent-hover)] shadow-[var(--shadow-accent)]"
            loading={loading}
            onClick={handleSubmit}
          >
            发表评论
          </Button>
        </div>
      ) : (
        <p className="text-[var(--text-tertiary)] mb-4">请先登录后发表评论</p>
      )}
      <List
        dataSource={comments}
        renderItem={(item) => (
          <List.Item className="border-b border-[var(--border)] hover:bg-[var(--bg-tertiary)] transition-colors">
            <List.Item.Meta
              avatar={<Avatar icon={<UserOutlined />} className="!bg-[var(--accent-glow)] !text-[var(--accent)]" />}
              title={
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[var(--text-primary)]">{item.user_name}</span>
                  <span className="text-xs text-[var(--text-tertiary)]">{item.created_at?.slice(0, 16)}</span>
                  {isLoggedIn && (
                    <Button
                      type="link"
                      size="small"
                      className="!text-[var(--accent)]"
                      onClick={() => setReplyTo(item)}
                    >
                      回复
                    </Button>
                  )}
                  {(user?.id === item.user_id || user?.is_staff) && (
                    <Popconfirm title="确认删除？" onConfirm={() => handleDelete(item.id)}>
                      <Button type="link" size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  )}
                </div>
              }
              description={
                <div>
                  <p className="text-[var(--text-secondary)]">{item.content}</p>
                  {item.replies?.map((reply) => (
                    <div
                      key={reply.id}
                      className="ml-8 mt-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-[var(--text-primary)]">{reply.user_name}</span>
                        <span className="text-xs text-[var(--text-tertiary)]">
                          {reply.created_at?.slice(0, 16)}
                        </span>
                      </div>
                      <p className="text-sm mt-1 text-[var(--text-secondary)]">{reply.content}</p>
                    </div>
                  ))}
                </div>
              }
            />
          </List.Item>
        )}
      />
    </div>
  );
}
