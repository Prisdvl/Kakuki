import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Code2,
  MessageSquare, BookOpen, Sparkles,
  Calendar, ExternalLink, Music,
  BarChart3, Flame, TrendingUp,
  Heart,
  Rocket, FolderTree, Quote, ThumbsUp, Shuffle, ArrowRight,
  LayoutGrid, GripVertical, ArrowUp, ArrowDown, Maximize2, Minimize2,
  EyeOff, Plus, RotateCcw, Check, X, CalendarCheck,
  Tags, Cloud, MessageCircle,
} from "lucide-react";
import { getArticles, getCategories } from "../../api/article";
import { getTalks, likeTalk } from "../../api/talk";
import { extractList } from "../../api/request";
import githubApi from "../../api/github";
import { useGithubProjects, LANG_COLORS } from "../../hooks/useGithubProjects";
import MusicPlayer from "../../components/MusicPlayer";
import TodoCard from "../../components/Tools/TodoCard";
import PaletteCard from "../../components/Tools/PaletteCard";
import CountdownCard from "../../components/Tools/CountdownCard";
import CheckinCard from "../../components/Tools/CheckinCard";
import SiteStatsCard from "../../components/Tools/SiteStatsCard";
import TagsCloudCard from "../../components/Tools/TagsCloudCard";
import RecentCommentsCard from "../../components/Tools/RecentCommentsCard";
import WeatherCard from "../../components/Tools/WeatherCard";
import MeteorParticles from "../../components/MeteorParticles";
import TiltCard from "../../components/TiltCard";
import { QUOTES } from "../../data/quotes";
import { useHomeLayout } from "../../store/homeLayoutStore";
import useMusicStore from '../../store/musicStore';
import useCountUp from "../../hooks/useCountUp";
import useMagnetic from "../../hooks/useMagnetic";

// ===== 可自由布局的组件注册表 =====
const COMPONENT_META = {
  profile:   { name: "博主卡片",  icon: Sparkles },
  music:     { name: "音乐播放",  icon: Music },
  leetcode:  { name: "每日打卡",  icon: CalendarCheck },
  talks:     { name: "最新杂谈",  icon: MessageSquare },
  projects:  { name: "项目精选",  icon: Rocket },
  categories:{ name: "分类速览",  icon: FolderTree },
  quote:     { name: "拾句",      icon: Quote },
  todo:      { name: "待办清单",  icon: Check },
  palette:   { name: "色板生成",  icon: LayoutGrid },
  countdown: { name: "纪念日",    icon: Calendar },
  stats:     { name: "站点统计",  icon: BarChart3 },
  tags:      { name: "分类云",    icon: Tags },
  comments:  { name: "最近评论",  icon: MessageCircle },
  weather:   { name: "天气",      icon: Cloud },
};

function AnimatedStatValue({ value }) {
  const animated = useCountUp(value);
  return <>{animated}</>;
}

const GITHUB_USERNAME = 'Prisdvl';
const GH_CACHE_KEY = 'kakuki-github-profile';
const GH_CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

// 从 GitHub API 实时拉取头像与个人介绍（Worker 代理；localStorage 缓存 24h 作离线兜底）
function useGithubProfile() {
  const [profile, setProfile] = useState(null);
  useEffect(() => {
    let cancelled = false;
    try {
      const raw = localStorage.getItem(GH_CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        if (Date.now() - cached.ts < GH_CACHE_TTL) {
          setProfile(cached.data);
          return;
        }
      }
    } catch { /* ignore */ }
    githubApi
      .user(GITHUB_USERNAME)
      .then((data) => {
        if (cancelled || !data) return;
        setProfile(data);
        try {
          localStorage.setItem(GH_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: { avatar_url: data.avatar_url, bio: data.bio } }));
        } catch { /* ignore */ }
      })
      .catch(() => { /* 静默回退本地头像/简介 */ });
    return () => { cancelled = true; };
  }, []);
  return profile;
}

export function ProfileCard({ stats }) {
  const gh = useGithubProfile();
  // 头像：GitHub 官方（经 Worker 代理缓存）→ 首字母徽章（本地快照已废弃）
  const [avatarLevel, setAvatarLevel] = useState(0);
  const avatarSources = [gh?.avatar_url || 'https://github.com/Prisdvl.png'];
  const bio = gh?.bio || '全栈开发者 · React + Vite · 构建 Kakuki：博客 / 音乐播放器 / LeetCode 追踪 / 仪表盘工具';
  return (
    <div className="glass profile-card mouse-glow">
      <div className="profile-avatar">
        {avatarLevel >= 1 ? (
          <div className="profile-avatar-fallback">P</div>
        ) : (
          <img src={avatarSources[avatarLevel]} alt="Prisdvl" className="profile-avatar-img" onError={() => setAvatarLevel((l) => l + 1)} />
        )}
      </div>
      <div className="profile-info">
        <div className="profile-name">Prisdvl</div>
        <div className="profile-bio">{bio}</div>
        <div className="profile-stats">
          {stats.map((s) => (
            <div key={s.label} className="profile-stat">
              <div className="profile-stat-value"><AnimatedStatValue value={s.value} /></div>
              <div className="profile-stat-label">
                <s.icon size={11} />
                {s.label}
              </div>
            </div>
          ))}
        </div>
        <div className="profile-social">
          <a href="https://github.com/Prisdvl" target="_blank" rel="noopener noreferrer" title="GitHub"><Code2 size={16} /></a>
          <a href="/archive" title="文章"><BookOpen size={16} /></a>
          <a href="/music" title="音乐"><Music size={16} /></a>
          <a href="/about" title="关于"><Sparkles size={16} /></a>
        </div>
      </div>
    </div>
  );
}

/**
 * 每日打卡卡（原 LeetCode 卡已改造，历史数据作为初始记录导入）
 * 组件实现见 components/Tools/CheckinCard.jsx
 * 注意：这里必须用 import 引入局部绑定，`export { x as Y }` 不会创建可用的本地变量。
 */
export function LeetCodeCard() {
  return <CheckinCard />;
}

/**
 * 拾句 —— 逐条摘录自 11 位音乐人的歌词与语录（数据见 data/quotes.js）
 * 命名取「拾取句子」之意，替代原先泛化的「每日一言」。
 */
export function QuoteCard() {
  const total = QUOTES.length;
  const [index, setIndex] = useState(() => {
    const saved = parseInt(localStorage.getItem('kakuki-quote-idx'), 10);
    if (!Number.isNaN(saved) && saved >= 0) return saved % total;
    return Math.floor(Math.random() * total);
  });
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => {
          const ni = (i + 1) % total;
          localStorage.setItem('kakuki-quote-idx', String(ni));
          return ni;
        });
        setVisible(true);
      }, 400);
    }, 8000);
    return () => clearInterval(t);
  }, [total]);

  const shuffle = () => {
    setVisible(false);
    setTimeout(() => {
      setIndex((i) => {
        let ni = i;
        if (total > 1) while (ni === i) ni = Math.floor(Math.random() * total);
        localStorage.setItem('kakuki-quote-idx', String(ni));
        return ni;
      });
      setVisible(true);
    }, 400);
  };

  const q = QUOTES[index] || QUOTES[0];

  return (
    <div className="ui-card ui-pad">
      <div className="ui-card-head">
        <h3 className="ui-card-title">
          <Quote size={18} /> 拾句
        </h3>
        <div className="ui-card-actions">
          <button
            onClick={shuffle}
            aria-label="换一句"
            title="换一句"
            className="ui-icon-action quote-shuffle"
          >
            <Shuffle size={14} />
          </button>
        </div>
      </div>
      <div className={`quote-fade ${visible ? 'quote-show' : 'quote-hide'}`} style={{ flex: 1 }}>
        <p className="quote-text">“{q.text}”</p>
      </div>
      <div className="quote-author">
        —— {q.author}
        <span className="quote-work">《{q.work}》</span>
      </div>
    </div>
  );
}

export function ProjectsCard() {
  // 真实项目来自 GitHub 仓库（排除 fork），不再读后台占位数据
  const { projects: allProjects, loading } = useGithubProjects();
  const projects = useMemo(() => allProjects.slice(0, 3), [allProjects]);

  return (
    <div className="ui-card ui-pad">
      <div className="ui-card-head">
        <h3 className="ui-card-title">
          <Rocket size={18} /> 项目精选
        </h3>
        <div className="ui-card-actions">
          <Link to="/projects" className="ui-card-sub ui-card-link">
            更多 <ExternalLink size={12} />
          </Link>
        </div>
      </div>
      {loading && projects.length === 0 ? (
        <div className="ui-empty ui-empty-inline">
          <span className="ui-empty-text">加载项目中…</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="ui-empty ui-empty-inline">
          <span className="ui-empty-text">还没有项目内容</span>
        </div>
      ) : (
        <div className="ui-card-list">
          {projects.map((p) => (
            <div key={p.id} className="project-mini ui-card-row ui-card-row-stack">
              <div className="project-mini-head">
                <a
                  href={p.repo_url || p.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="project-mini-name"
                >
                  {p.language && (
                    <i className="project-mini-lang" style={{ background: LANG_COLORS[p.language] || '#8b949e' }} />
                  )}
                  <span className="project-mini-name-text">{p.name}</span>
                </a>
                <div className="project-mini-links">
                  {p.repo_url && (
                    <a href={p.repo_url} target="_blank" rel="noopener noreferrer" aria-label={`${p.name} 仓库`} title="GitHub 仓库" className="ui-icon-action project-mini-link">
                      <Code2 size={14} />
                    </a>
                  )}
                  {p.url && (
                    <a href={p.url} target="_blank" rel="noopener noreferrer" aria-label={`${p.name} 在线访问`} title="在线访问" className="ui-icon-action project-mini-link">
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>
              {p.description && <p className="project-mini-desc">{p.description}</p>}
              {p.tech_list?.length > 0 && (
                <div className="project-mini-tech">
                  {p.tech_list.slice(0, 4).map((t) => (
                    // 字不用 var(--accent)：accent-soft 叠在玻璃卡上后底色偏暗，
                    // accent 字只剩 3~4:1；text-primary 在同一底上 ≥ 5:1
                    <span key={t} className="ui-badge">{t}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CategoriesCard({ categories }) {
  return (
    <div className="ui-card ui-pad">
      <div className="ui-card-head">
        <h3 className="ui-card-title">
          <FolderTree size={18} /> 分类速览
        </h3>
        <div className="ui-card-actions">
          <Link to="/archive" className="ui-card-sub ui-card-link">
            全部 <ArrowRight size={12} />
          </Link>
        </div>
      </div>
      <div className="category-chip-container category-chip-container-bare">
        {categories.length === 0 ? (
          <div className="ui-empty ui-empty-inline">
            <span className="ui-empty-text">暂无分类</span>
          </div>
        ) : (
          categories.map((c) => (
            <Link key={c.id} to={`/category/${c.id}`} className="ui-chip ui-chip-plain category-chip">
              {c.name}
              <span className="ui-chip-count category-chip-count">{c.article_count ?? 0}</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

export function TalksCard() {
  const [talks, setTalks] = useState([]);

  useEffect(() => {
    getTalks({ page_size: 3 })
      .then((res) => setTalks(extractList(res)))
      .catch(() => setTalks([]));
  }, []);

  const handleLike = async (item) => {
    try {
      const res = await likeTalk(item.id);
      const liked = res?.data?.liked;
      const count = res?.data?.like_count;
      setTalks((prev) => prev.map((t) => (t.id === item.id ? { ...t, liked, like_count: count } : t)));
    } catch {
      // 静默失败，保持原状态
    }
  };

  return (
    <div className="ui-card ui-pad">
      <div className="ui-card-head">
        <h3 className="ui-card-title">
          <MessageSquare size={18} /> 最新杂谈
        </h3>
        <div className="ui-card-actions">
          <Link to="/talks" className="ui-card-sub ui-card-link">
            更多 <ExternalLink size={12} />
          </Link>
        </div>
      </div>
      <div className="ui-card-list">
        {talks.length === 0 ? (
          <div className="ui-empty ui-empty-inline">
            <span className="ui-empty-text">还没有杂谈内容</span>
          </div>
        ) : (
          talks.map((item) => (
            <div key={item.id} className="ui-card-row ui-card-row-stack talk-mini">
              <p className="talk-mini-content">{item.content}</p>
              <div className="talk-mini-meta">
                <span className="ui-card-sub talk-mini-date">
                  <Calendar size={11} /> {item.created_at?.slice(5, 10)}
                </span>
                <button
                  onClick={() => handleLike(item)}
                  aria-pressed={!!item.liked}
                  aria-label="点赞"
                  className={`ui-icon-action talk-like-mini ${item.liked ? 'liked' : ''}`}
                >
                  <Heart size={11} fill={item.liked ? 'currentColor' : 'none'} />
                  {item.like_count || 0}
                </button>
                <Link to="/talks" className="ui-card-sub ui-card-link talk-mini-more">
                  去互动 <ArrowRight size={11} />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalArticles, setTotalArticles] = useState(0);
  const [totalCategories, setTotalCategories] = useState(0);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    Promise.all([
      getArticles({ page_size: 3 }),
      getArticles({ page_size: 1 }),
      getCategories(),
    ]).then(([articlesRes, countRes, catsRes]) => {
      const list = extractList(articlesRes);
      setArticles(list);
      const total = countRes?.data?.count ?? countRes?.count ?? (Array.isArray(countRes) ? countRes.length : 0);
      setTotalArticles(total);
      const cats = extractList(catsRes);
      setCategories(cats);
      setTotalCategories(Array.isArray(cats) ? cats.length : 0);
    }).catch((err) => {
      console.warn('API failed, using fallback data:', err.message);
    }).finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: "文章", value: totalArticles, icon: BookOpen },
    { label: "分类", value: totalCategories, icon: Code2 },
  ];

  // ===== 自由布局（12 列看板）=====
  const { layout, editing, setEditing, move, preview, placeAt, setWidth, toggleVisible, addComponent, removeComponent, resetLayout } = useHomeLayout();
  const [drag, setDrag] = useState(null); // { id, fromX, fromY, startCX, startCY, colW, gridTop, gridHeight, maxY }
  const gridRef = useRef(null);
  const dragElRef = useRef(null);
  const resizeRef = useRef(null);

  const visibleItems = layout.filter((x) => x.visible);
  const hiddenItems = layout.filter((x) => !x.visible);
  const availableComponents = Object.keys(COMPONENT_META).filter((id) => !layout.some((x) => x.id === id));

  const renderComponent = (id) => {
    switch (id) {
      case 'profile': return <ProfileCard stats={stats} />;
      case 'music': return <MusicPlayer />;
      case 'leetcode': return <LeetCodeCard />;
      case 'talks': return <TalksCard />;
      case 'projects': return <ProjectsCard />;
      case 'categories': return <CategoriesCard categories={categories} />;
      case 'quote': return <QuoteCard />;
      case 'todo': return <TodoCard />;
      case 'palette': return <PaletteCard />;
      case 'countdown': return <CountdownCard />;
      case 'stats': return <SiteStatsCard />;
      case 'tags': return <TagsCloudCard />;
      case 'comments': return <RecentCommentsCard />;
      case 'weather': return <WeatherCard />;
      default: return null;
    }
  };

  /**
   * Pointer 跟手拖拽（替代 HTML5 draggable —— 原实现受容器查询/3D 倾斜干扰拖不动）。
   *  - 按下卡片（避开按钮/手柄）开始拖拽，卡片跟随鼠标平移
   *  - 松手时按 12 列网格计算落点：横向按列宽取整位移，纵向按估算行高换行
   *  - store.placeAt 内部推挤自动排版（重叠的卡向下让位，空白保留）
   */
  const beginDrag = (e, item) => {
    if (e.button !== 0) return;
    if (e.target.closest('button, a, .layout-resize, input, textarea, .home-ctrl-actions')) return;
    const gridEl = gridRef.current;
    if (!gridEl) return;
    e.preventDefault();
    const rect = gridEl.getBoundingClientRect();
    const maxY = layout.reduce((m, it) => (it.visible ? Math.max(m, it.y) : m), 1);
    const rowH = Math.max(96, (rect.height - Math.max(0, maxY - 1) * 16) / Math.max(1, maxY));
    setDrag({
      id: item.id,
      fromX: item.x,
      fromY: item.y,
      startCX: e.clientX,
      startCY: e.clientY,
      colW: rect.width / 12,
      gridLeft: rect.left,
      gridTop: rect.top,
      rowH,
    });
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    document.body.style.cursor = 'grabbing';
    e.currentTarget.classList.add('is-dragging');
    dragElRef.current = e.currentTarget;
  };

  const onDragMove = useCallback((e) => {
    setDrag((d) => {
      if (!d) return d;
      const dx = e.clientX - d.startCX;
      const dy = e.clientY - d.startCY;
      if (dragElRef.current) {
        dragElRef.current.style.setProperty('--drag-x', `${dx}px`);
        dragElRef.current.style.setProperty('--drag-y', `${dy}px`);
      }
      return d;
    });
  }, []);

  const onDragUp = useCallback((e) => {
    setDrag((d) => {
      if (!d) return d;
      const dx = e.clientX - d.startCX;
      const dy = e.clientY - d.startCY;
      const colShift = Math.round(dx / d.colW);
      const rowShift = Math.round(dy / d.rowH);
      const x = Math.max(1, d.fromX + colShift);
      const y = Math.max(1, d.fromY + rowShift);
      placeAt(d.id, x, y);
      if (dragElRef.current) {
        dragElRef.current.classList.remove('is-dragging');
        dragElRef.current.style.removeProperty('--drag-x');
        dragElRef.current.style.removeProperty('--drag-y');
        dragElRef.current = null;
      }
      document.body.style.cursor = '';
      return null;
    });
  }, [placeAt]);

  /**
   * resize 手柄：编辑模式下拖右下角手柄，实时预览列跨度，松手落定。
   * 列宽按 grid 容器 12 等分换算；最小 3 列、最大 12 列。
   */
  const startResize = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    if (!gridRef.current) return;
    const gridRect = gridRef.current.getBoundingClientRect();
    const colW = gridRect.width / 12;
    const startX = e.clientX;
    const startW = item.w;
    // 用局部变量跟踪预览中的最新宽度，避免松手时读旧闭包导致“自动复原”
    let currentW = startW;
    const onMove = (ev) => {
      ev.preventDefault();
      currentW = Math.max(3, Math.min(12, startW + Math.round((ev.clientX - startX) / colW)));
      preview(item.id, { w: currentW });
    };
    const onUp = () => {
      setWidth(item.id, currentW);
      resizeRef.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    resizeRef.current = { onMove, onUp };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const enterEdit = () => {
    setEditing(true);
  };
  // 磁吸按钮：光标靠近时吸附跟随
  const magneticRef = useMagnetic(0.22);
  const magneticRefSolid = useMagnetic(0.22);
  const finishEdit = () => {
    setEditing(false);
  };

  // 编辑模式：全局监听 pointermove/pointerup 完成跟手拖动
  useEffect(() => {
    if (!editing) return undefined;
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragUp);
    return () => {
      window.removeEventListener('pointermove', onDragMove);
      window.removeEventListener('pointerup', onDragUp);
      document.body.style.cursor = '';
    };
  }, [editing, onDragMove, onDragUp]);

  return (
    <section className="home-section">
      {/* 首屏博主卡右侧的钻石陨石聚散（装饰层，pointer-events: none） */}
      <MeteorParticles variant="home" />
      <div className="app-container home-container">
        {/* Layout Toolbar */}
        <div className="home-layout-toolbar">
          {!editing ? (
            <button className="ui-btn ui-btn-sm" ref={magneticRef} onClick={enterEdit}>
              <LayoutGrid size={15} /> 自定义布局
            </button>
          ) : (
            <>
              <button className="ui-btn ui-btn-primary ui-btn-sm" ref={magneticRefSolid} onClick={finishEdit}>
                <Check size={15} /> 完成编辑
              </button>
              <button className="ui-btn ui-btn-sm" ref={magneticRef} onClick={resetLayout}>
                <RotateCcw size={15} /> 恢复默认
              </button>
            </>
          )}
          {editing && (
            <span className="home-layout-hint">
              <GripVertical size={13} /> 拖动卡片到任意位置 · 右下角手柄任意拉宽 · 卡片重叠时自动下移
            </span>
          )}
        </div>

        {/* Free Layout Grid（12 列自由看板） */}
        <div className={`home-layout-grid ${editing ? 'editing' : ''}`} ref={gridRef}>
          <AnimatePresence>
            {visibleItems.map((item) => {
              const meta = COMPONENT_META[item.id];
              const Icon = meta?.icon;
              return (
                <motion.div
                  key={item.id}
                  layout={!editing}
                  initial={editing ? false : { opacity: 0, scale: 0.96, y: 10 }}
                  animate={editing ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
                  exit={editing ? undefined : { opacity: 0, scale: 0.96 }}
                  transition={editing ? undefined : { duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
                  className={`home-layout-item ${drag?.id === item.id ? 'is-dragging' : ''}`}
                  data-id={item.id}
                  onPointerDown={editing ? (e) => beginDrag(e, item) : undefined}
                  style={{
                    gridColumn: `${item.x} / span ${item.w}`,
                    gridRow: item.y,
                  }}
                >
                  <div>
                    {editing && (
                      <div className="home-layout-controls">
                        <span className="home-drag-handle" title="拖动到任意位置">
                          <GripVertical size={15} />
                        </span>
                        <span className="home-ctrl-name">
                          {Icon && <Icon size={13} />} {meta?.name}
                        </span>
                        <div className="home-ctrl-actions">
                          <button onClick={() => move(item.id, -1)} aria-label="上移一行" title="上移一行"><ArrowUp size={13} /></button>
                          <button onClick={() => move(item.id, 1)} aria-label="下移一行" title="下移一行"><ArrowDown size={13} /></button>
                          <button onClick={() => toggleVisible(item.id)} aria-label="隐藏" title="隐藏"><EyeOff size={13} /></button>
                          <button onClick={() => removeComponent(item.id)} aria-label="移除" title="移除" className="danger"><X size={13} /></button>
                        </div>
                      </div>
                    )}
                    {/* 右下角拉宽手柄（编辑模式） */}
                    {editing && (
                      <span
                        className="layout-resize"
                        onPointerDown={(e) => startResize(e, item)}
                        title="拖动拉宽（3–12 列）"
                      />
                    )}
                    <TiltCard>{renderComponent(item.id)}</TiltCard>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Add / Restore Panel */}
        {editing && (availableComponents.length > 0 || hiddenItems.length > 0) && (
          <div className="home-add-panel">
            <h4 className="home-add-title"><Plus size={15} /> 添加 / 恢复组件</h4>
            <div className="home-add-list">
              {availableComponents.map((id) => {
                const meta = COMPONENT_META[id];
                const Icon = meta?.icon;
                return (
                  <button key={id} className="home-add-chip" onClick={() => addComponent(id, 'two-thirds')}>
                    {Icon && <Icon size={14} />} {meta?.name}
                  </button>
                );
              })}
              {hiddenItems.map((item) => {
                const meta = COMPONENT_META[item.id];
                const Icon = meta?.icon;
                return (
                  <button key={item.id} className="home-add-chip restore" onClick={() => toggleVisible(item.id)}>
                    {Icon && <Icon size={14} />} {meta?.name} <EyeOff size={12} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Article Grid（hero 固定顶部；陨石粒子为全屏背景，见 AppLayout） */}
        <div className="hero-articles">
          {loading ? (
            <>
              {[0, 1, 2].map((i) => (
                <div key={i} className={`hero-article-card ${i === 0 ? 'featured' : ''}`}>
                  <div className="hero-article-card-cover shimmer" style={{ minHeight: i === 0 ? 520 : 280 }} />
                </div>
              ))}
            </>
          ) : articles.length === 0 ? (
            <div className="ui-empty hero-articles-empty">
              <span className="ui-empty-icon"><BookOpen size={40} /></span>
              <span className="ui-empty-title">暂无文章</span>
              <span className="ui-empty-text">
                登录后去 <Link to="/admin/articles/new" className="ui-card-link">后台创建</Link> 第一篇吧
              </span>
            </div>
          ) : (
            articles.slice(0, 3).map((article, idx) => {
              const isFeatured = idx === 0;
              return (
                <Link
                  key={article.id}
                  to={`/article/${article.id}`}
                  className={`hero-article-card reveal ${isFeatured ? 'featured' : ''}`}
                  style={{ '--reveal-i': idx }}
                >
                  <div className="hero-article-card-cover">
                    {article.cover_image ? (
                      <img src={article.cover_image} alt={article.title} loading="lazy" decoding="async" />
                    ) : (
                      <div className="hero-article-card-cover-fallback">
                        <BookOpen size={26} style={{ opacity: 0.45 }} />
                      </div>
                    )}
                    <div className="hero-article-card-overlay">
                      <div className="hero-article-card-date">
                        {article.created_at?.slice(0, 10)} · {article.views || 0} 阅读
                      </div>
                      <div className="hero-article-card-title">{article.title}</div>
                      {!isFeatured && article.summary && (
                        <div className="hero-article-card-summary">{article.summary}</div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
