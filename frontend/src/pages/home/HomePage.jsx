﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search, Mail, Code2,
  MessageSquare, BookOpen, Sparkles,
  Calendar, ExternalLink, Music,
  BarChart3, Flame, TrendingUp,
  Play, Pause, SkipBack, SkipForward, Heart,
} from "lucide-react";
import { getArticles, getCategories, getTags } from "../../api/article";
import { getTalks } from "../../api/talk";
import { extractList } from "../../api/request";
import MusicPlayer from "../../components/MusicPlayer";
import useMusicStore from '../../store/musicStore';
import leetcodeApi from "../../api/leetcode";
import useCountUp from "../../hooks/useCountUp";

const LEETCODE_USERNAME = 'Likey-e';

function AnimatedStatValue({ value }) {
  const animated = useCountUp(value);
  return <>{animated}</>;
}

function ProfileCard({ stats }) {
  return (
    <div className="glass profile-card mouse-glow">
      <div className="profile-avatar">
        <img src="/avatar.jpg" alt="Prisdvl" style={{
          width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover',
        }} onError={(e) => { e.target.style.display = 'none'; }} />
      </div>
      <div className="profile-info">
        <div className="profile-name">Prisdvl</div>
        <div className="profile-bio">全栈开发者 · 热爱代码与创造。在这里记录技术足迹与生活碎片。</div>
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
          <a href="/category" title="分类"><Code2 size={16} /></a>
          <a href="/tag" title="标签"><MessageSquare size={16} /></a>
          <a href="/about" title="关于"><Sparkles size={16} /></a>
        </div>
      </div>
    </div>
  );
}

function PlayerBar() {
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
    <div className="glass player-bar mouse-glow" style={{
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
            <Music size={22} style={{ color: '#fff' }} />
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
      <div className="music-controls" style={{ flexShrink: 0, gap: '0.35rem' }}>
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
            color: '#fff', width: 40, height: 40, borderRadius: '50%',
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

function LeetCodeCard() {
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
    const data = [];
    for (let w = 0; w < HEATMAP_WEEKS; w++) {
      const week = [];
      for (let d = 0; d < DAYS; d++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + w * DAYS + d);
        const isFuture = date > today;
        if (isFuture) {
          week.push({ date, count: -1 });
        } else if (Object.keys(calendar).length > 0) {
          const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          const count = calendar[dateStr] || 0;
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
  }, [lcData]);

  const cellColor = (count) => {
    if (count < 0) return 'transparent';
    const colors = ['var(--heat-empty)', 'var(--heat-level-1)', 'var(--heat-level-2)', 'var(--heat-level-3)', 'var(--heat-level-4)'];
    return colors[Math.min(count, 4)];
  };

  return (
    <div className="glass mouse-glow" style={{ borderRadius: 20, padding: '1.25rem' }}>
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

function TalksCard() {
  const [talks, setTalks] = useState([]);

  useEffect(() => {
    getTalks({ page_size: 3 })
      .then((res) => setTalks(extractList(res)))
      .catch(() => setTalks([]));
  }, []);

  return (
    <div className="glass mouse-glow" style={{ borderRadius: 20, padding: '1.25rem' }}>
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
            <Link key={item.id} to="/talks" style={{ padding: '0.65rem 0.8rem', borderRadius: 10, background: 'var(--bg-tertiary)', textDecoration: 'none', color: 'inherit', display: 'block', transition: 'background 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-soft)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
            >
              <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: '0.25rem', lineHeight: 1.4 }}>{item.content}</p>
              <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}><Calendar size={11} /> {item.created_at?.slice(5, 10)}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}><Heart size={11} /> {item.like_count || 0}</span>
              </div>
            </Link>
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
  const [totalTags, setTotalTags] = useState(0);

  useEffect(() => {
    Promise.all([
      getArticles({ page_size: 3 }),
      getArticles({ page_size: 1 }),
      getCategories(),
      getTags(),
    ]).then(([articlesRes, countRes, catsRes, tagsRes]) => {
      const list = extractList(articlesRes);
      setArticles(list);
      const total = countRes?.data?.count ?? countRes?.count ?? (Array.isArray(countRes) ? countRes.length : 0);
      setTotalArticles(total);
      const cats = extractList(catsRes);
      setTotalCategories(Array.isArray(cats) ? cats.length : 0);
      const tags = extractList(tagsRes);
      setTotalTags(Array.isArray(tags) ? tags.length : 0);
    }).catch((err) => {
      console.warn('API failed, using fallback data:', err.message);
    }).finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: "文章", value: totalArticles, icon: BookOpen },
    { label: "分类", value: totalCategories, icon: Code2 },
    { label: "标签", value: totalTags, icon: MessageSquare },
  ];

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
          <input type="text" placeholder="搜索文章、分类、标签..." onKeyDown={onSearch} />
        </div>

        {/* Hero Row: Profile + Music */}
        <div className="hero-grid">
          <ProfileCard stats={stats} />
          <MusicPlayer />
        </div>

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
                  className={`hero-article-card ${isFeatured ? 'featured' : ''}`}
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

        {/* Bottom Row: LeetCode + Talks */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
          <LeetCodeCard />
          <TalksCard />
        </div>
      </div>
    </section>
  );
}
