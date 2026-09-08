﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Mail, Code2,
  MessageSquare, BookOpen, Sparkles,
  Calendar, ExternalLink, Music,
  BarChart3, Flame, TrendingUp,
  Play, Pause, SkipBack, SkipForward, Heart,
  Rocket, FolderTree, Quote, ThumbsUp, Shuffle, ArrowRight,
  LayoutGrid, GripVertical, ArrowUp, ArrowDown, Maximize2, Minimize2,
  EyeOff, Plus, RotateCcw, Check, X, Timer,
} from "lucide-react";
import { getArticles, getCategories } from "../../api/article";
import { getTalks, likeTalk } from "../../api/talk";
import { getProjects } from "../../api/project";
import { extractList } from "../../api/request";
import MusicPlayer from "../../components/MusicPlayer";
import TodoCard from "../../components/Tools/TodoCard";
import PomodoroCard from "../../components/Tools/PomodoroCard";
import PaletteCard from "../../components/Tools/PaletteCard";
import CountdownCard from "../../components/Tools/CountdownCard";
import TiltCard from "../../components/TiltCard";
import { useHomeLayout } from "../../store/homeLayoutStore";
import useMusicStore from '../../store/musicStore';
import leetcodeApi from "../../api/leetcode";
import useCountUp from "../../hooks/useCountUp";
import useMagnetic from "../../hooks/useMagnetic";

// ===== 可自由布局的组件注册表 =====
const COMPONENT_META = {
  profile:   { name: "博主卡片",  icon: Sparkles },
  music:     { name: "音乐播放",  icon: Music },
  leetcode:  { name: "LeetCode",  icon: BarChart3 },
  talks:     { name: "最新杂谈",  icon: MessageSquare },
  projects:  { name: "项目精选",  icon: Rocket },
  categories:{ name: "分类速览",  icon: FolderTree },
  quote:     { name: "每日一言",  icon: Quote },
  todo:      { name: "待办清单",  icon: Check },
  pomodoro:  { name: "番茄钟",    icon: Timer },
  palette:   { name: "色板生成",  icon: LayoutGrid },
  countdown: { name: "纪念日",    icon: Calendar },
};

const LEETCODE_USERNAME = 'Likey-e';

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
    fetch(`https://api.github.com/users/${GITHUB_USERNAME}`)
      .then((r) => (r.ok ? r.json() : null))
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
  // 头像：GitHub 官方 → 本地快照（unavatar 下载，与 GitHub 一致）→ 首字母徽章
  const [avatarLevel, setAvatarLevel] = useState(0);
  const avatarSources = [gh?.avatar_url || 'https://github.com/Prisdvl.png', '/github-avatar.png'];
  const bio = gh?.bio || '全栈开发者 · 热爱代码与创造。在这里记录技术足迹与生活碎片。';
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
          <a href="mailto:kakuki@example.com" title="Email"><Mail size={16} /></a>
          <a href="/archive" title="文章"><BookOpen size={16} /></a>
          <a href="/category" title="分类"><FolderTree size={16} /></a>
          <a href="/about" title="关于"><Sparkles size={16} /></a>
        </div>
      </div>
    </div>
  );
}

export function PlayerBar() {
  const {
    currentTrack, currentLyrics, currentLyricIndex,
    isPlaying, togglePlay, nextTrack, prevTrack,
    currentTime, duration, seekTo,
  } = useMusicStore(
    (state) => ({
      currentTrack: state.currentTrack,
      currentLyrics: state.currentLyrics,
      currentLyricIndex: state.currentLyricIndex,
      isPlaying: state.isPlaying,
      togglePlay: state.togglePlay,
      nextTrack: state.nextTrack,
      prevTrack: state.prevTrack,
      currentTime: state.currentTime,
      duration: state.duration,
      seekTo: state.seekTo,
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
  if (currentTrack && currentLyrics.length > 0 && currentLyricIndex >= 0) {
    lyricText = currentLyrics[currentLyricIndex]?.text || currentTrack.name;
    lyricKey = 'lyric-' + currentLyricIndex;
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
              color: currentTrack ? 'var(--accent)' : 'var(--text-tertiary)',
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

const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

function ProgressRing({ value, max, size = 120, stroke = 10, color = '#44b700', label, sublabel }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = max > 0 ? (value / max) : 0;
  const dashoffset = circumference * (1 - Math.min(progress, 1));
  const center = size / 2;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={center} cy={center} r={radius}
          fill="none"
          stroke="var(--bg-tertiary)"
          strokeWidth={stroke}
        />
        <circle
          cx={center} cy={center} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          style={{ transition: 'stroke-dashoffset 1s ease', filter: `drop-shadow(0 0 6px ${color}40)` }}
        />
      </svg>
      <div style={{ marginTop: -size / 2 - 8, position: 'relative', height: 0 }}>
        <div style={{
          fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)',
          textAlign: 'center',
        }}>
          {value}
        </div>
        {sublabel && (
          <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
            / {sublabel}
          </div>
        )}
      </div>
      {label && (
        <div style={{ marginTop: size / 2 + 16, fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
          {label}
        </div>
      )}
    </div>
  );
}

function SmallRing({ value, max, color, label }) {
  const size = 64;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = max > 0 ? (value / max) : 0;
  const dashoffset = circumference * (1 - Math.min(progress, 1));
  const center = size / 2;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ position: 'relative' }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--bg-tertiary)" strokeWidth={stroke} />
          <circle
            cx={center} cy={center} r={radius}
            fill="none" stroke={color} strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashoffset}
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)',
        }}>
          {value}
        </div>
      </div>
      <div style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)' }}>
        {label} {value}/{max}
      </div>
    </div>
  );
}

export function LeetCodeCard() {
  const [lcData, setLcData] = useState(null);
  const [lcLoading, setLcLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLcLoading(true);
      try {
        const result = await leetcodeApi.getAllData(LEETCODE_USERNAME);
        if (result.profile?.matchedUser) {
          setLcData(result);
        } else {
          setLcData({ profile: null, calendar: {}, recentSubmissions: [] });
        }
      } catch {
        setLcData({ profile: null, calendar: {}, recentSubmissions: [] });
      } finally {
        setLcLoading(false);
      }
    };
    fetchData();
  }, []);

  const HEATMAP_WEEKS = 26;
  const DAYS = 7;

  const profile = lcData?.profile;
  const matchedUser = profile?.matchedUser;

  const diffColors = { Easy: 'var(--leetcode-easy)', Medium: 'var(--leetcode-medium)', Hard: 'var(--leetcode-hard)' };
  const diffs = useMemo(() => [
    { label: '简单', difficulty: 'Easy', color: diffColors.Easy },
    { label: '中等', difficulty: 'Medium', color: diffColors.Medium },
    { label: '困难', difficulty: 'Hard', color: diffColors.Hard },
  ].map((d) => {
    const acNum = matchedUser?.submitStatsGlobal?.acSubmissionNum?.find(
      (s) => s.difficulty === d.difficulty
    );
    const total = profile?.allQuestionsCount?.find(
      (s) => s.difficulty === d.difficulty
    );
    return { ...d, solved: acNum?.count || 0, total: total?.count || 0 };
  }), [matchedUser, profile]);

  const totalAll = useMemo(() => diffs.reduce((s, d) => s + d.solved, 0), [diffs]);
  const totalMax = useMemo(() => diffs.reduce((s, d) => s + d.total, 0), [diffs]);

  const recentSubs = useMemo(() => lcData?.recentSubmissions || [], [lcData]);
  // 优先使用后端返回的真实 streak/totalActiveDays，回退到前端计算
  const streak = useMemo(() => {
    if (lcData?.streak) return lcData.streak;
    if (recentSubs.length === 0) return 0;
    const days = Array.from(new Set(recentSubs.map((s) => {
      const d = new Date(parseInt(s.timestamp) * 1000);
      return d.toDateString();
    }))).sort((a, b) => new Date(b) - new Date(a));
    let count = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < days.length; i++) {
      const d = new Date(days[i]);
      d.setHours(0, 0, 0, 0);
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);
      if (d.getTime() === expectedDate.getTime()) count++;
      else break;
    }
    return count;
  }, [recentSubs, lcData]);
  const activeDays = lcData?.totalActiveDays || useMemo(() => {
    const uniqueDays = new Set(recentSubs.map((s) => {
      const d = new Date(parseInt(s.timestamp) * 1000);
      return d.toDateString();
    }));
    return uniqueDays.size;
  }, [recentSubs, lcData]);

  const heatmapData = useMemo(() => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (HEATMAP_WEEKS * DAYS - 1));
    startDate.setDate(startDate.getDate() - startDate.getDay());
    const calendar = lcData?.calendar || {};
    // 日历为空时，用最近提交记录按日期聚合出真实瓷砖（而非随机占位）
    const calFromSubs = {};
    if (Object.keys(calendar).length === 0 && recentSubs.length > 0) {
      recentSubs.forEach((s) => {
        if (!s.timestamp) return;
        const d = new Date(parseInt(s.timestamp) * 1000);
        if (Number.isNaN(d.getTime())) return;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        calFromSubs[key] = (calFromSubs[key] || 0) + 1;
      });
    }
    const activeCal = Object.keys(calendar).length > 0 ? calendar : calFromSubs;
    const hasRealData = Object.keys(activeCal).length > 0;
    const data = [];
    for (let w = 0; w < HEATMAP_WEEKS; w++) {
      const week = [];
      for (let d = 0; d < DAYS; d++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + w * DAYS + d);
        const isFuture = date > today;
        if (isFuture) {
          week.push({ date, count: -1 });
        } else if (hasRealData) {
          const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          const count = activeCal[dateStr] || 0;
          const level = count === 0 ? 0 : Math.min(Math.ceil(count / 3), 4);
          week.push({ date, count: level });
        } else {
          const seed = (date.getFullYear() * 1000 + date.getMonth() * 50 + date.getDate()) % 100;
          let count = 0;
          if (seed < 35) count = 0;
          else if (seed < 60) count = 1;
          else if (seed < 80) count = 2;
          else if (seed < 92) count = 3;
          else count = 4;
          week.push({ date, count });
        }
      }
      data.push(week);
    }
    return data;
  }, [lcData, recentSubs]);

  const cellColor = (count) => {
    if (count < 0) return 'transparent';
    const colors = ['var(--heat-empty)', 'var(--heat-level-1)', 'var(--heat-level-2)', 'var(--heat-level-3)', 'var(--heat-level-4)'];
    return colors[Math.min(count, 4)];
  };

  return (
    <div className="glass mouse-glow reveal" style={{ borderRadius: 20, padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Code2 size={18} style={{ color: 'var(--accent)' }} /> LeetCode
        </h3>
        <a href={`https://leetcode.cn/u/${LEETCODE_USERNAME}/`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.8rem', textDecoration: 'none' }}>
          查看 <ExternalLink size={12} />
        </a>
      </div>

      {lcLoading ? (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-tertiary)' }}>
          <BarChart3 size={24} style={{ margin: '0 auto 0.5rem' }} />
          <div style={{ fontSize: '0.8rem' }}>加载 LeetCode 数据...</div>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '1.25rem', alignItems: 'center' }}>
            <ProgressRing
              value={totalAll}
              max={totalMax}
              size={110}
              stroke={9}
              color="var(--accent)"
              label="已解答"
              sublabel={`${totalAll}/${totalMax}`}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                {diffs.map((d) => (
                  <SmallRing key={d.label} value={d.solved} max={d.total} color={d.color} label={d.label} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  <BarChart3 size={13} style={{ color: 'var(--accent)' }} />
                  <strong style={{ color: 'var(--text-primary)' }}>{recentSubs.length}</strong> 次提交
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  <TrendingUp size={13} style={{ color: 'var(--success)' }} />
                  <strong style={{ color: 'var(--text-primary)' }}>{activeDays}</strong> 天活跃
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  <Flame size={13} style={{ color: 'var(--warning)' }} />
                  <strong style={{ color: 'var(--text-primary)' }}>{streak}</strong> 天连续
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                近半年提交记录
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>少</span>
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} style={{ width: 8, height: 8, borderRadius: 2, background: ['var(--heat-empty)', 'var(--heat-level-1)', 'var(--heat-level-2)', 'var(--heat-level-3)', 'var(--heat-level-4)'][i] }} />
                ))}
                <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>多</span>
              </div>
            </div>

            <div className="lc-heatmap-wrapper">
              <div style={{ display: 'inline-block', minWidth: '100%' }}>
                <div style={{ display: 'flex', gap: 2, marginLeft: 22, marginBottom: 4 }}>
                  {MONTHS.map((m, i) => (
                    <span key={i} style={{
                      fontSize: '0.6rem', color: 'var(--text-tertiary)',
                      flex: 1, textAlign: 'left',
                    }}>
                      {m}
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginRight: 4, fontSize: '0.55rem', color: 'var(--text-tertiary)' }}>
                    <span style={{ height: 10 }}></span>
                    <span style={{ height: 10 }}>一</span>
                    <span style={{ height: 10 }}></span>
                    <span style={{ height: 10 }}>三</span>
                    <span style={{ height: 10 }}></span>
                    <span style={{ height: 10 }}>五</span>
                    <span style={{ height: 10 }}></span>
                  </div>
                  {heatmapData.map((week, wi) => (
                    <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {week.map((day, di) => (
                        <div
                          key={di}
                          title={day.count >= 0 ? `${day.count} 次提交` : ''}
                          style={{
                            width: 10, height: 10, borderRadius: 2,
                            background: cellColor(day.count),
                            opacity: day.count < 0 ? 0.3 : 1,
                            cursor: day.count >= 0 ? 'pointer' : 'default',
                            transition: 'transform 0.1s',
                          }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const QUOTES = [
  { text: '代码是写给未来的情书，也是写给过去的自己的一封回信。', author: 'Kakuki' },
  { text: '把复杂留给自己，把简单留给用户。', author: 'Kakuki' },
  { text: '学习不是填满水桶，而是点燃火焰。', author: 'William Butler Yeats' },
  { text: '最好的投资，是投资自己。', author: 'Benjamin Franklin' },
  { text: '细节决定成败，但方向决定命运。', author: 'Kakuki' },
  { text: '编程三分靠写，七分靠改。', author: '民间智慧' },
  { text: '愿你眼里有光，心中有火，脚下有路。', author: 'Kakuki' },
  { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
];

export function QuoteCard() {
  const [index, setIndex] = useState(() => {
    const saved = parseInt(localStorage.getItem('kakuki-quote-idx'), 10);
    if (!Number.isNaN(saved) && saved >= 0) return saved % QUOTES.length;
    return Math.floor(Math.random() * QUOTES.length);
  });
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => {
          const ni = (i + 1) % QUOTES.length;
          localStorage.setItem('kakuki-quote-idx', String(ni));
          return ni;
        });
        setVisible(true);
      }, 400);
    }, 8000);
    return () => clearInterval(t);
  }, []);

  const shuffle = () => {
    setVisible(false);
    setTimeout(() => {
      setIndex((i) => {
        let ni = i;
        while (ni === i) ni = Math.floor(Math.random() * QUOTES.length);
        localStorage.setItem('kakuki-quote-idx', String(ni));
        return ni;
      });
      setVisible(true);
    }, 400);
  };

  const q = QUOTES[index];

  return (
    <div className="glass mouse-glow reveal" style={{ borderRadius: 20, padding: '1.25rem 1.25rem 1rem', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Quote size={18} style={{ color: 'var(--accent)' }} /> 每日一言
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
      </div>
    </div>
  );
}

export function ProjectsCard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProjects().then((res) => {
      const list = extractList(res);
      const sorted = [...list].sort((a, b) => ((b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0)) || ((a.order ?? 0) - (b.order ?? 0)));
      setProjects(sorted.slice(0, 3));
    }).catch(() => setProjects([])).finally(() => setLoading(false));
  }, []);

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
      {loading ? (
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
                <a href={p.url || p.repo_url || '#'} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', textDecoration: 'none' }}>
                  {p.name}
                </a>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
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
                    <span key={t} style={{ fontSize: '0.65rem', padding: '0.1rem 0.5rem', borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)' }}>{t}</span>
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
  const { layout, editing, setEditing, move, moveTo, setWidth, toggleVisible, addComponent, removeComponent, resetLayout } = useHomeLayout();
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
      case 'pomodoro': return <PomodoroCard />;
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
  // 完成编辑：从光标位置泛起涟漪扩散至整个页面，组件随之波浪起伏
  const lastMouse = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  useEffect(() => {
    const onMove = (e) => { lastMouse.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);
  const [ripple, setRipple] = useState(null);
  const finishEdit = () => {
    setEditing(false);
    setRipple({ key: Date.now(), ...lastMouse.current });
    setTimeout(() => setRipple(null), 1600);
  };

  const onSearch = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      navigate(`/archive?q=${encodeURIComponent(e.target.value.trim())}`);
    }
  };

  const fallbackImages = [
    "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=anime%20style%20illustration%20of%20a%20cute%20girl%20reading%20a%20book%20under%20a%20cherry%20blossom%20tree%2C%20soft%20pastel%20colors%2C%20dreamy%20atmosphere%2C%20digital%20art&image_size=portrait_4_3",
    "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=warm%20sunlight%20through%20windows%2C%20cozy%20desk%20setup%20with%20books%2C%20plants%2C%20and%20coffee%2C%20minimalist%20anime%20illustration%2C%20soft%20bokeh&image_size=landscape_4_3",
    "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=starry%20night%20sky%20with%20milky%20way%2C%20mountain%20landscape%2C%20mystical%20anime%20art%2C%20purple%20and%20blue%20gradient%2C%20dreamy%20atmosphere&image_size=portrait_4_3",
  ];

  const displayArticles = articles.length >= 3 ? articles : [
    ...articles,
    ...Array(Math.max(0, 3 - articles.length)).fill(null).map((_, i) => ({
      id: `placeholder-${i}`,
      title: articles.length === 0 ? `示例文章 ${i + 1} · 开始写作吧` : `更多精彩内容 ${i + 1}`,
      summary: "这是一篇示例文章，欢迎在后台管理系统中添加真实内容。",
      created_at: new Date().toISOString().slice(0, 10),
      views: 0,
      category: { name: "未分类" },
      cover_image: null,
    })),
  ];

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
                  className={`home-layout-item ${item.width === 'wide' ? 'wide' : 'half'}`}
                  data-id={item.id}
                  draggable={editing}
                  onDragStart={(e) => handleDragStart(e, item.id)}
                  onDragOver={(e) => handleDragOver(e, item.id)}
                  onDrop={(e) => handleDrop(e, item.id)}
                  onDragEnd={handleDragEnd}
                  style={editing && overId === item.id ? { outline: '2px dashed var(--accent)', outlineOffset: 4 } : undefined}
                >
                  <div
                    className={`home-ripple-target ${ripple ? 'bobbing' : ''}`}
                    style={{ '--ripple-i': visibleItems.indexOf(item) }}
                  >
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
                            onClick={() => setWidth(item.id, item.width === 'wide' ? 'half' : 'wide')}
                            aria-label={item.width === 'wide' ? '改为半宽' : '改为全宽'}
                            title={item.width === 'wide' ? '改为半宽' : '改为全宽'}
                          >
                            {item.width === 'wide' ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
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
                  <button key={id} className="home-add-chip" onClick={() => addComponent(id, 'half')}>
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

        {/* 完成编辑涟漪动画（光标处扩散至全页） */}
        {ripple && (
          <div key={ripple.key} className="ripple-overlay" aria-hidden="true">
            <span
              className="ripple-wave ripple-fill"
              style={{ left: ripple.x, top: ripple.y, transform: 'translate(-50%, -50%)' }}
            />
            <span
              className="ripple-wave"
              style={{ left: ripple.x, top: ripple.y, transform: 'translate(-50%, -50%)', animationDelay: '0.06s' }}
            />
            <span
              className="ripple-wave"
              style={{ left: ripple.x, top: ripple.y, transform: 'translate(-50%, -50%)', animationDelay: '0.14s' }}
            />
            <span
              className="ripple-wave"
              style={{ left: ripple.x, top: ripple.y, transform: 'translate(-50%, -50%)', animationDelay: '0.22s' }}
            />
          </div>
        )}

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
          ) : displayArticles.length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
              <BookOpen size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
              <p>暂无文章，登录后去 <Link to="/admin/articles/new" style={{ color: 'var(--accent)' }}>后台创建</Link> 第一篇吧</p>
            </div>
          ) : (
            displayArticles.slice(0, 3).map((article, idx) => {
              const isFeatured = idx === 0;
              const isReal = article.id && !String(article.id).startsWith('placeholder');
              const imgUrl = article.cover_image || fallbackImages[idx % fallbackImages.length];
              return (
                <Link
                  key={article.id}
                  to={isReal ? `/article/${article.id}` : '/admin/articles/new'}
                  className={`hero-article-card reveal ${isFeatured ? 'featured' : ''}`}
                  style={{ '--reveal-i': idx }}
                >
                  <div className="hero-article-card-cover">
                    <img src={imgUrl} alt={article.title} loading="lazy" decoding="async" />
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
