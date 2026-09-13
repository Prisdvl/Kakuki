﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Code2,
  MessageSquare, BookOpen, Sparkles,
  Calendar, ExternalLink, Music,
  BarChart3, Flame, TrendingUp,
  Play, Pause, SkipBack, SkipForward, Heart,
  Rocket, FolderTree, Quote, ThumbsUp, Shuffle, ArrowRight,
  LayoutGrid, GripVertical, ArrowUp, ArrowDown, Maximize2, Minimize2,
  EyeOff, Plus, RotateCcw, Check, X, CalendarCheck,
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
};

function AnimatedStatValue({ value }) {
  const animated = useCountUp(value);
  return <>{animated}</>;
}

const GITHUB_USERNAME = 'Prisdvl';
const GH_CACHE_KEY = 'kakuki-github-profile';
const GH_CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

// 从 GitHub API 同步头像与个人介绍（缓存 24h，失败回退本地）
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
  // 头像：本地快照（unavatar 下载，与 GitHub 一致，网络受限环境零请求）→ GitHub 官方 → 首字母徽章
  const [avatarLevel, setAvatarLevel] = useState(0);
  const avatarSources = [`${import.meta.env.BASE_URL}github-avatar.jpg`, gh?.avatar_url || 'https://github.com/Prisdvl.png'];
  const bio = gh?.bio || '全栈开发者 · React + Vite + Django · 构建玻璃拟态个人站 Kakuki：博客 / 音乐播放器 / LeetCode 追踪 / 仪表盘工具';
  return (
    <div className="glass profile-card mouse-glow">
      <div className="profile-avatar">
        {avatarLevel >= 2 ? (
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '1.4rem' }}>P</div>
        ) : (
          <img src={avatarSources[avatarLevel]} alt="Prisdvl" style={{
            width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover',
          }} onError={() => setAvatarLevel((l) => l + 1)} />
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

export function PlayerBar() {
  const {
    currentTrack,
    isPlaying, togglePlay, nextTrack, prevTrack,
    currentTime, duration, seekTo, audioError,
  } = useMusicStore(
    (state) => ({
      currentTrack: state.currentTrack,
      isPlaying: state.isPlaying,
      togglePlay: state.togglePlay,
      nextTrack: state.nextTrack,
      prevTrack: state.prevTrack,
      currentTime: state.currentTime,
      duration: state.duration,
      seekTo: state.seekTo,
      audioError: state.audioError,
    })
  );

  const progressRef = useRef(null);
  const defaultLyrics = ["欢迎光临", "Prisdvl 的个人空间", "编程是一门艺术", "用热爱点亮生活"];
  const [defIdx, setDefIdx] = useState(0);

  useEffect(() => {
    if (currentTrack) return;
    const t = setInterval(() => setDefIdx((i) => (i + 1) % defaultLyrics.length), 3000);
    return () => clearInterval(t);
  }, [currentTrack]);

  const formatTime = (s) => {
    if (!s || isNaN(s)) return '00:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const handleProgressClick = useCallback((e) => {
    if (!duration || !progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekTo(pct * duration);
  }, [duration, seekTo]);

  let lyricText = '';
  let lyricKey = 'default-' + defIdx;
  let lyricColor = currentTrack ? 'var(--accent)' : 'var(--text-tertiary)';
  if (audioError) {
    // 音源不可用 / 播放被拦截：把原因直接显示在歌词位，而非静默无声
    lyricText = audioError;
    lyricKey = 'err-' + audioError;
    lyricColor = 'var(--warning)';
  } else if (currentTrack) {
    lyricText = currentTrack.name;
    lyricKey = 'track-' + currentTrack.id;
  } else {
    lyricText = defaultLyrics[defIdx];
  }

  const displayPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="glass player-bar mouse-glow reveal" style={{
      marginBottom: '1.5rem', overflow: 'hidden',
    }}>
      {/* Left: Cover + Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0, minWidth: 0, maxWidth: 180 }}>
        {currentTrack?.cover ? (
          <img
            src={currentTrack.cover}
            alt={currentTrack.name}
            decoding="async"
            style={{
              width: 46, height: 46, borderRadius: 10, objectFit: 'cover', flexShrink: 0,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          />
        ) : (
          <div style={{
            width: 46, height: 46, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Music size={22} style={{ color: 'var(--on-accent)' }} />
          </div>
        )}
        <div style={{ minWidth: 0, overflow: 'hidden' }}>
          <div style={{
            fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {currentTrack?.name || 'Prisdvl'}
          </div>
          <div style={{
            fontSize: '0.68rem', color: 'var(--text-tertiary)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {currentTrack ? (currentTrack.artists || []).map((a) => a.name).join(' / ') : '未在播放'}
          </div>
        </div>
      </div>

      {/* Center: Single-line lyric + progress */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {/* Single-line lyric with fade animation */}
        <div style={{
          textAlign: 'center', height: 22, overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span
            key={lyricKey}
            className="lyric-fade"
            style={{
              fontSize: '0.82rem', fontWeight: 500,
              color: lyricColor,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              maxWidth: '100%',
            }}
          >
            {lyricText}
          </span>
        </div>

        {/* Progress bar - click to seek */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: '0.45rem',
            fontSize: '0.65rem', color: 'var(--text-tertiary)', userSelect: 'none',
          }}
        >
          <span style={{ minWidth: 32, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(currentTime)}
          </span>
          <div
          ref={progressRef}
          onClick={handleProgressClick}
          role="slider"
          aria-label="播放进度"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration || 0)}
          aria-valuenow={Math.round(currentTime || 0)}
          style={{
            flex: 1, height: 5, borderRadius: 3, background: 'var(--bg-tertiary)',
            position: 'relative', cursor: 'pointer', transition: 'height 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.height = '7px'; }}
          onMouseLeave={(e) => { e.currentTarget.style.height = '5px'; }}
        >
            <div style={{
              width: `${displayPct}%`, height: '100%',
              background: 'linear-gradient(90deg, var(--accent), var(--accent-secondary))',
              borderRadius: 3,
              boxShadow: displayPct > 0 ? '0 0 6px rgba(124, 58, 237, 0.5)' : 'none',
            }} />
          </div>
          <span style={{ minWidth: 32, fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Right: Controls */}
      <div className="music-controls" style={{ flexShrink: 0, gap: '0.35rem', alignItems: 'center' }}>
        {isPlaying && (
          <div className="eq" aria-hidden="true" style={{ marginRight: '0.15rem' }}>
            <span /><span /><span /><span /><span />
          </div>
        )}
        <button
          className="music-ctrl-btn"
          onClick={() => prevTrack()}
          aria-label="上一首"
          style={{
            border: 'none', background: 'transparent', cursor: 'pointer',
            color: 'var(--text-primary)', padding: 7, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <SkipBack size={17} />
        </button>
        <button
          onClick={() => togglePlay()}
          className="play-pulse"
          aria-label={isPlaying ? '暂停' : '播放'}
          style={{
            border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))',
            color: 'var(--on-accent)', width: 40, height: 40, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)',
          }}
        >
          {isPlaying ? <Pause size={17} /> : <Play size={17} style={{ marginLeft: 2 }} fill="currentColor" />}
        </button>
        <button
          className="music-ctrl-btn"
          onClick={() => nextTrack()}
          aria-label="下一首"
          style={{
            border: 'none', background: 'transparent', cursor: 'pointer',
            color: 'var(--text-primary)', padding: 7, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <SkipForward size={17} />
        </button>
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
    <div className="glass mouse-glow reveal" style={{ borderRadius: 20, padding: '1.25rem 1.25rem 1rem', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Quote size={18} style={{ color: 'var(--accent)' }} /> 拾句
        </h3>
        <button
          onClick={shuffle}
          aria-label="换一句"
          title="换一句"
          className="quote-shuffle"
          style={{
            border: '1px solid var(--border)', background: 'var(--glass-bg-strong)', color: 'var(--text-secondary)',
            width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'rotate(180deg)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'rotate(0deg)'; }}
        >
          <Shuffle size={14} />
        </button>
      </div>
      <div className={`quote-fade ${visible ? 'quote-show' : 'quote-hide'}`} style={{ flex: 1 }}>
        <p style={{ fontSize: '0.95rem', lineHeight: 1.7, color: 'var(--text-primary)' }}>“{q.text}”</p>
      </div>
      <div style={{ marginTop: '0.5rem', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
        —— {q.author}
        <span style={{ marginLeft: '0.35rem', opacity: 0.75 }}>
          《{q.work}》
        </span>
      </div>
    </div>
  );
}

export function ProjectsCard() {
  // 真实项目来自 GitHub 仓库（排除 fork），不再读后台占位数据
  const { projects: allProjects, loading } = useGithubProjects();
  const projects = useMemo(() => allProjects.slice(0, 3), [allProjects]);

  return (
    <div className="glass mouse-glow reveal" style={{ borderRadius: 20, padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Rocket size={18} style={{ color: 'var(--accent)' }} /> 项目精选
        </h3>
        <Link to="/projects" style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
          更多 <ExternalLink size={12} />
        </Link>
      </div>
      {loading && projects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '1.25rem 0', color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>加载项目...</div>
      ) : projects.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '1rem 0', fontSize: '0.85rem' }}>还没有项目内容</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {projects.map((p) => (
            <div key={p.id} className="project-mini" style={{
              display: 'flex', flexDirection: 'column', gap: '0.35rem', padding: '0.75rem 0.85rem',
              borderRadius: 12, background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
              transition: 'all 0.2s', textDecoration: 'none', color: 'inherit',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 18px color-mix(in srgb, var(--accent) 18%, transparent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                <a href={p.repo_url || p.url || '#'} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0 }}>
                  {p.language && (
                    <i style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: LANG_COLORS[p.language] || '#8b949e' }} />
                  )}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                </a>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexShrink: 0 }}>
                  {p.repo_url && (
                    <a href={p.repo_url} target="_blank" rel="noopener noreferrer" aria-label={`${p.name} 仓库`} title="GitHub 仓库"
                      style={{ color: 'var(--text-tertiary)', display: 'flex', transition: 'color 0.2s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}>
                      <Code2 size={14} />
                    </a>
                  )}
                  {p.url && (
                    <a href={p.url} target="_blank" rel="noopener noreferrer" aria-label={`${p.name} 在线访问`} title="在线访问"
                      style={{ color: 'var(--text-tertiary)', display: 'flex', transition: 'color 0.2s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}>
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>
              {p.description && (
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {p.description}
                </p>
              )}
              {p.tech_list?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                  {p.tech_list.slice(0, 4).map((t) => (
                    // 字不用 var(--accent)：accent-soft 叠在玻璃卡上后底色偏暗，
                    // accent 字只剩 3~4:1；text-primary 在同一底上 ≥ 5:1
                    <span key={t} style={{ fontSize: '0.65rem', padding: '0.1rem 0.5rem', borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--text-primary)' }}>{t}</span>
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
    <div className="glass mouse-glow reveal" style={{ borderRadius: 20, padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <FolderTree size={18} style={{ color: 'var(--accent)' }} /> 分类速览
        </h3>
        <Link to="/category" style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
          全部 <ArrowRight size={12} />
        </Link>
      </div>
      <div className="category-chip-container" style={{ marginBottom: 0, padding: 0, background: 'transparent', border: 'none', boxShadow: 'none' }}>
        {categories.length === 0 ? (
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', padding: '0.5rem 0' }}>暂无分类</p>
        ) : (
          categories.map((c) => (
            <Link key={c.id} to={`/category/${c.id}`} className="category-chip">
              {c.name}
              <span className="category-chip-count">{c.article_count ?? 0}</span>
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
    <div className="glass mouse-glow reveal" style={{ borderRadius: 20, padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <MessageSquare size={18} style={{ color: 'var(--accent)' }} /> 最新杂谈
        </h3>
        <Link to="/talks" style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
          更多 <ExternalLink size={12} />
        </Link>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {talks.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '1.5rem 0', fontSize: '0.85rem' }}>
            还没有杂谈内容
          </p>
        ) : (
          talks.map((item) => (
            <div key={item.id} style={{ padding: '0.65rem 0.8rem', borderRadius: 10, background: 'var(--bg-tertiary)', border: '1px solid var(--border)', display: 'block', transition: 'all 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-soft)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: '0.25rem', lineHeight: 1.4 }}>{item.content}</p>
              <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.72rem', color: 'var(--text-tertiary)', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}><Calendar size={11} /> {item.created_at?.slice(5, 10)}</span>
                <button
                  onClick={() => handleLike(item)}
                  aria-pressed={!!item.liked}
                  aria-label="点赞"
                  className={`talk-like-btn ${item.liked ? 'liked' : ''}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.2rem', border: 'none', background: 'transparent',
                    color: item.liked ? 'var(--accent)' : 'var(--text-tertiary)', cursor: 'pointer',
                    padding: '0.1rem 0.2rem', fontSize: '0.72rem', transition: 'all 0.2s', fontFamily: 'inherit',
                  }}
                >
                  <Heart size={11} fill={item.liked ? 'currentColor' : 'none'} />
                  {item.like_count || 0}
                </button>
                <Link to="/talks" style={{ color: 'var(--text-tertiary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.15rem', marginLeft: 'auto' }}>
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
  const navigate = useNavigate();
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

  // ===== 自由布局 =====
  const { layout, editing, setEditing, move, moveTo, cycleWidth, toggleVisible, addComponent, removeComponent, resetLayout } = useHomeLayout();
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);

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
      default: return null;
    }
  };

  const handleDragStart = (e, id) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', id); } catch { /* ignore */ }
  };
  const handleDragOver = (e, id) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (overId !== id) setOverId(id);
  };
  const handleDrop = (e, targetId) => {
    e.preventDefault();
    if (dragId && dragId !== targetId) moveTo(dragId, targetId);
    setDragId(null);
    setOverId(null);
  };
  const handleDragEnd = () => { setDragId(null); setOverId(null); };

  const enterEdit = () => {
    setEditing(true);
  };
  // 磁吸按钮：光标靠近时吸附跟随
  const magneticRef = useMagnetic(0.22);
  const magneticRefSolid = useMagnetic(0.22);
  const finishEdit = () => {
    setEditing(false);
  };

  const onSearch = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      navigate(`/archive?q=${encodeURIComponent(e.target.value.trim())}`);
    }
  };

  return (
    <section style={{ padding: '1.5rem 0 1rem' }}>
      <div className="app-container" style={{ maxWidth: 1200 }}>
        {/* Search Bar */}
        <div className="glass search-center">
          <Search size={18} />
          <input type="text" placeholder="搜索文章、分类..." onKeyDown={onSearch} />
        </div>

        {/* Layout Toolbar */}
        <div className="home-layout-toolbar">
          {!editing ? (
            <button className="glass-button" ref={magneticRef} onClick={enterEdit} style={{ padding: '0.5rem 1rem', fontSize: '0.82rem', borderRadius: 12 }}>
              <LayoutGrid size={15} /> 自定义布局
            </button>
          ) : (
            <>
              <button className="glass-button-solid" ref={magneticRefSolid} onClick={finishEdit} style={{ padding: '0.5rem 1.1rem', fontSize: '0.82rem', borderRadius: 12 }}>
                <Check size={15} /> 完成编辑
              </button>
              <button className="glass-button" ref={magneticRef} onClick={resetLayout} style={{ padding: '0.5rem 1rem', fontSize: '0.82rem', borderRadius: 12 }}>
                <RotateCcw size={15} /> 恢复默认
              </button>
            </>
          )}
          {editing && (
            <span className="home-layout-hint">
              <GripVertical size={13} /> 拖动卡片排序 · 点击控件调整
            </span>
          )}
        </div>

        {/* Free Layout Grid */}
        <div className={`home-layout-grid ${editing ? 'editing' : ''}`}>
          <AnimatePresence>
            {visibleItems.map((item) => {
              const meta = COMPONENT_META[item.id];
              const Icon = meta?.icon;
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
                  className={`home-layout-item ${item.width === 'third' ? 'third' : item.width === 'full' ? 'full' : 'two-thirds'}`}
                  data-id={item.id}
                  draggable={editing}
                  onDragStart={(e) => handleDragStart(e, item.id)}
                  onDragOver={(e) => handleDragOver(e, item.id)}
                  onDrop={(e) => handleDrop(e, item.id)}
                  onDragEnd={handleDragEnd}
                  style={editing && overId === item.id ? { outline: '2px dashed var(--accent)', outlineOffset: 4 } : undefined}
                >
                  <div>
                    {editing && (
                      <div className="home-layout-controls">
                        <span className="home-drag-handle" title="拖动排序">
                          <GripVertical size={15} />
                        </span>
                        <span className="home-ctrl-name">
                          {Icon && <Icon size={13} />} {meta?.name}
                        </span>
                        <div className="home-ctrl-actions">
                          <button onClick={() => move(item.id, -1)} aria-label="上移" title="上移"><ArrowUp size={13} /></button>
                          <button onClick={() => move(item.id, 1)} aria-label="下移" title="下移"><ArrowDown size={13} /></button>
                          <button
                            onClick={() => cycleWidth(item.id)}
                            aria-label="切换宽度"
                            title="循环切换宽度（1/3 · 2/3 · 全宽）"
                          >
                            {item.width === 'full' ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                          </button>
                          <button onClick={() => toggleVisible(item.id)} aria-label="隐藏" title="隐藏"><EyeOff size={13} /></button>
                          <button onClick={() => removeComponent(item.id)} aria-label="移除" title="移除" className="danger"><X size={13} /></button>
                        </div>
                      </div>
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

        {/* Player Bar - full width */}
        <PlayerBar />

        {/* Article Grid */}
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
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
              <BookOpen size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
              <p>暂无文章，登录后去 <Link to="/admin/articles/new" style={{ color: 'var(--accent)' }}>后台创建</Link> 第一篇吧</p>
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
                      {article.category?.name && (
                        <span className="hero-article-card-badge">
                          <Sparkles size={10} />
                          {article.category.name}
                        </span>
                      )}
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
