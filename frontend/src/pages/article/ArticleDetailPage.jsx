import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Calendar, Eye, FolderOpen, Heart, Copy, Check, ListTree, MessageCircle, BookOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { getArticleDetail, likeArticle, getArticles } from "../../api/article";
import { extractList } from "../../api/request";
import CommentList from "../../components/CommentList";

const slugify = (text) =>
  String(text).trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fa5-]/g, '');

function nodeText(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join('');
  if (node.props?.children) return nodeText(node.props.children);
  return '';
}

/** 代码块：带语言标签 + 一键复制 */
function CodeBlock({ children }) {
  const preRef = useRef(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const text = preRef.current?.innerText || '';
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  // 提取语言标签
  let lang = 'code';
  try {
    const codeEl = Array.isArray(children) ? children[0] : children;
    const cls = codeEl?.props?.className || '';
    const m = cls.match(/language-([\w-]+)/);
    if (m) lang = m[1];
  } catch { /* ignore */ }

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span className="code-block-lang">{lang}</span>
        <button
          className={`code-copy-btn ${copied ? 'copied' : ''}`}
          onClick={handleCopy}
          aria-label="复制代码"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          <span>{copied ? '已复制' : '复制'}</span>
        </button>
      </div>
      <pre ref={preRef}>{children}</pre>
    </div>
  );
}

/** 心形点赞 + 粒子爆裂 */
function LikeButton({ liked, count, onToggle }) {
  const [burstKey, setBurstKey] = useState(0);
  const handleClick = () => {
    if (!liked) setBurstKey((k) => k + 1);
    onToggle();
  };
  return (
    <div className="like-button-wrap">
      {burstKey > 0 && !liked && (
        <span key={burstKey} className="like-burst" aria-hidden>
          {[...Array(8)].map((_, i) => <i key={i} className={`like-particle p${i}`} />)}
        </span>
      )}
      <button className={`like-button ${liked ? 'liked' : ''}`} onClick={handleClick}>
        <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
        <span className="like-count">{count}</span>
        <span className="like-label">{liked ? '已点赞' : '点赞'}</span>
      </button>
    </div>
  );
}

/** 从 Markdown 提取目录 */
function extractToc(markdown) {
  const items = [];
  let inCode = false;
  for (const line of markdown.split('\n')) {
    if (line.trimStart().startsWith('```')) { inCode = !inCode; continue; }
    if (inCode) continue;
    const m = line.match(/^(#{2,3})\s+(.+)$/);
    if (m) {
      const text = m[2].replace(/[*`~]/g, '').trim();
      items.push({ level: m[1].length, text, id: slugify(text) });
    }
  }
  return items;
}

export default function ArticleDetailPage() {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [activeHeading, setActiveHeading] = useState('');
  const [related, setRelated] = useState([]);
  const articleRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setArticle(null);
    setRelated([]);
    window.scrollTo({ top: 0, behavior: 'instant' });
    getArticleDetail(id)
      .then((res) => {
        const data = res && res.data ? res.data : res;
        if (data && data.title) {
          setArticle(data);
          setLiked(!!data.liked);
          setLikeCount(data.like_count || 0);
        } else {
          setError("文章数据异常");
        }
      })
      .catch((err) => {
        setError(err?.response?.data?.message || err?.message || "加载失败");
      })
      .finally(() => setLoading(false));
  }, [id]);

  // 浏览器标签页标题跟随文章
  useEffect(() => {
    if (article?.title) {
      document.title = `${article.title} - Kakuki`;
      return () => { document.title = "Kakuki - 个人博客"; };
    }
  }, [article?.title]);

  // 相关文章：同分类下排除当前文章，取 3 篇
  useEffect(() => {
    const categoryId = article?.category?.id;
    if (!categoryId) { setRelated([]); return; }
    getArticles({ category: categoryId, page_size: 5 })
      .then((res) => setRelated(extractList(res).filter((a) => a.id !== article.id).slice(0, 3)))
      .catch(() => setRelated([]));
  }, [article?.category?.id, article?.id]);

  const toc = useMemo(() => (article ? extractToc(article.content || '') : []), [article]);

  // 目录滚动高亮
  useEffect(() => {
    if (!article || toc.length === 0) return;
    const onScroll = () => {
      let current = '';
      for (const item of toc) {
        const el = document.getElementById(item.id);
        if (el && el.getBoundingClientRect().top < 120) current = item.id;
      }
      setActiveHeading(current);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [article, toc]);

  const handleToggleLike = async () => {
    try {
      const res = await likeArticle(id);
      const data = res?.data ?? res;
      if (data) {
        setLiked(data.liked);
        setLikeCount(data.like_count);
      }
    } catch { /* 静默失败，保持原状态 */ }
  };

  const markdownComponents = useMemo(() => ({
    pre: CodeBlock,
    h2: ({ children }) => <h2 id={slugify(nodeText(children))}>{children}</h2>,
    h3: ({ children }) => <h3 id={slugify(nodeText(children))}>{children}</h3>,
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
    ),
  }), []);

  if (loading) {
    return (
      <div className="article-page">
        <div className="glass article-skeleton">
          <div className="shimmer" style={{ height: '2.2rem', width: '70%', borderRadius: 8 }} />
          <div className="shimmer" style={{ height: '1rem', width: '40%', borderRadius: 8, marginTop: '1rem' }} />
          <div className="shimmer" style={{ height: '14rem', borderRadius: 12, marginTop: '1.5rem' }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass" style={{ textAlign: 'center', padding: '4rem 2rem', borderRadius: 20 }}>
        <p style={{ color: 'var(--error)', marginBottom: '1rem' }}>{error}</p>
        <Link to="/archive" style={{ color: 'var(--accent)' }}>&larr; 浏览全部文章</Link>
      </div>
    );
  }

  if (!article) return null;

  return (
    <div className="article-page">
      <article className="glass article-main" ref={articleRef}>
        <Link to="/archive" className="article-back">
          &larr; 返回归档
        </Link>

        <h1 className="article-title">{article.title}</h1>

        <div className="article-meta">
          <span className="article-meta-item"><Calendar size={14} /> {article.created_at?.slice(0, 10)}</span>
          <span className="article-meta-item"><Eye size={14} /> {article.views} 阅读</span>
          <span className="article-meta-item">
            <MessageCircle size={14} /> {article.comment_count} 评论
          </span>
          <span className="article-meta-item">
            <Heart size={14} /> {likeCount} 点赞
          </span>
          {article.category && (
            <Link
              to={`/category/${article.category.id}`}
              className="article-meta-item article-category-badge"
            >
              <FolderOpen size={14} /> {article.category.name}
            </Link>
          )}
        </div>

        {article.tags?.length > 0 && (
          <div className="article-tags">
            {article.tags.map((t) => (
              <Link key={t.id} to={`/tag/${t.id}`} className="article-tag">#{t.name}</Link>
            ))}
          </div>
        )}

        {article.cover_image && (
          <img
            src={article.cover_image}
            alt={article.title}
            decoding="async"
            fetchpriority="high"
            className="article-cover"
          />
        )}

        <div className="markdown-body">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={markdownComponents}
          >
            {article.content}
          </ReactMarkdown>
        </div>

        {/* 点赞栏 */}
        <div className="article-like-section">
          <p className="article-like-tip">{liked ? '感谢你的支持！' : '如果这篇文章对你有帮助，点个赞吧～'}</p>
          <LikeButton liked={liked} count={likeCount} onToggle={handleToggleLike} />
        </div>

        {/* 评论区 */}
        <CommentList articleId={Number(id)} />

        {/* 相关文章推荐 */}
        {related.length > 0 && (
          <section className="related-articles">
            <h3 className="related-title"><BookOpen size={16} /> 继续阅读</h3>
            <div className="related-grid">
              {related.map((a) => (
                <Link key={a.id} to={`/article/${a.id}`} className="related-card">
                  <span className="related-card-title">{a.title}</span>
                  <span className="related-card-meta">
                    {a.created_at?.slice(0, 10)} · {a.views || 0} 阅读 · {a.category?.name || ''}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>

      {/* 目录 TOC */}
      {toc.length > 0 && (
        <aside className="article-toc">
          <div className="article-toc-title"><ListTree size={14} /> 目录</div>
          <ul>
            {toc.map((item) => (
              <li key={item.id} className={item.level === 3 ? 'toc-h3' : ''}>
                <a
                  href={`#${item.id}`}
                  className={activeHeading === item.id ? 'active' : ''}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >
                  {item.text}
                </a>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  );
}
