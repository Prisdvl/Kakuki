import { useEffect, useMemo, useState } from 'react';
import {
  Clock, Timer, CheckCircle2, BarChart3,
  Flame, BookOpen, TrendingUp,
} from 'lucide-react';
import TiltCard from '../../components/TiltCard';
import leetcodeApi from '../../api/leetcode';
import checkinApi from '../../api/checkin';
import githubApi from '../../api/github';
import TodoCard from '../../components/Tools/TodoCard';
import CountdownCard from '../../components/Tools/CountdownCard';

const GITHUB_USERNAME = 'Prisdvl';

/* ================= GitHub 头像（三级回退：官方 → 本地快照 → 首字母徽章） ================= */
function GitHubAvatar() {
  const [level, setLevel] = useState(0);
  const sources = [
    `${import.meta.env.BASE_URL}github-avatar.jpg`, // 本地快照优先：与 GitHub 一致、网络受限环境零请求
    `https://github.com/${GITHUB_USERNAME}.png`,
  ];
  const style = { width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--glass-border)', flexShrink: 0 };
  if (level >= sources.length) {
    return (
      <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--glass-bg-strong)', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '1.1rem' }}>
        {GITHUB_USERNAME[0].toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={sources[level]}
      alt={GITHUB_USERNAME}
      style={style}
      onError={() => setLevel((l) => l + 1)}
    />
  );
}

/* ================= 时钟卡 ================= */
function ClockCard() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const pad = (n) => String(n).padStart(2, '0');
  const week = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()];
  return (
    <div className="glass mouse-glow reveal" style={{ borderRadius: 20, padding: '1.5rem', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
        <Clock size={15} style={{ color: 'var(--accent)' }} /> 当前时间
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: '3rem', fontWeight: 800, letterSpacing: '0.03em', lineHeight: 1.1, color: 'var(--text-primary)' }}>
        {pad(now.getHours())}<span style={{ color: 'var(--accent)', animation: 'clock-colon 1s steps(1) infinite' }}>:</span>{pad(now.getMinutes())}
        <span style={{ fontSize: '1.6rem', color: 'var(--text-secondary)' }}>:{pad(now.getSeconds())}</span>
      </div>
      <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
        {now.getFullYear()} 年 {now.getMonth() + 1} 月 {now.getDate()} 日 · 星期{week}
      </div>
    </div>
  );
}

/* ================= 学习时间统计卡 =================
 * 数据源：GET /api/v1/focus/summary/ —— 本地 PrisTimer 专注记录同步进 D1 后的聚合结果。
 * 后端不可用或尚无同步数据时，回退到浏览器本地记录，保证卡片不空。
 * ================================================================= */
const LOCAL_FOCUS_KEY = 'kakuki-focus-records';

function readLocalFocus() {
  try {
    const arr = JSON.parse(localStorage.getItem(LOCAL_FOCUS_KEY) || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function StudyTimeCard() {
  const [summary, setSummary] = useState(null);
  const [localRecords, setLocalRecords] = useState(readLocalFocus);

  useEffect(() => {
    let alive = true;
    const load = () => {
      checkinApi.focusSummary(90)
        .then((res) => { if (alive) setSummary(res?.data || null); })
        .catch(() => { if (alive) setSummary(null); });
      setLocalRecords(readLocalFocus());
    };
    load();
    window.addEventListener('kakuki:focus-updated', load);
    window.addEventListener('storage', load);
    const t = setInterval(load, 5 * 60 * 1000);
    return () => {
      alive = false;
      window.removeEventListener('kakuki:focus-updated', load);
      window.removeEventListener('storage', load);
      clearInterval(t);
    };
  }, []);

  // 后端（PrisTimer 真实专注）优先；否则用本地记录兜底
  const stats = useMemo(() => {
    const recent = Array.isArray(summary?.recent) ? summary.recent : [];
    if (recent.length > 0 || (summary?.total_minutes ?? 0) > 0) {
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const monday = midnight - (now.getDay() === 0 ? 6 : now.getDay() - 1) * 86400000;
      let week = 0;
      recent.forEach((r) => {
        const ts = new Date(`${r.date}T00:00:00`).getTime();
        if (!Number.isNaN(ts) && ts >= monday) week += Number(r.total_minutes) || 0;
      });
      return {
        today: Number(summary.today_minutes) || 0,
        week,
        total: Number(summary.total_minutes) || 0,
        sessions: Number(summary.total_sessions) || 0,
        source: 'pristimer',
      };
    }
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const monday = midnight - (now.getDay() === 0 ? 6 : now.getDay() - 1) * 86400000;
    let today = 0, week = 0, total = 0;
    localRecords.forEach((r) => {
      const ts = Number(r.ts) || new Date(r.date).getTime();
      const m = Number(r.minutes) || 0;
      if (!Number.isFinite(ts)) return;
      total += m;
      if (ts >= midnight) today += m;
      if (ts >= monday) week += m;
    });
    return { today, week, total, sessions: localRecords.length, source: 'local' };
  }, [summary, localRecords]);

  const goal = 480; // 今日目标 8 小时（分钟）
  const pct = Math.min(100, Math.round((stats.today / goal) * 100));
  const R = 46, C = 2 * Math.PI * R;
  const fmt = (min) => {
    if (min < 60) return `${min} 分钟`;
    const h = Math.floor(min / 60), m = Math.round(min % 60);
    return m ? `${h} 小时 ${m} 分` : `${h} 小时`;
  };

  const cells = [
    { icon: Flame, label: '今日', value: fmt(stats.today), color: 'var(--accent)' },
    { icon: TrendingUp, label: '本周', value: fmt(stats.week), color: 'var(--text-primary)' },
    { icon: BookOpen, label: '累计', value: fmt(stats.total), color: 'var(--text-primary)' },
    { icon: CheckCircle2, label: '专注次数', value: `${stats.sessions} 次`, color: 'var(--text-primary)' },
  ];

  return (
    <div className="glass mouse-glow reveal" style={{ borderRadius: 20, padding: '1.5rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
          <Timer size={15} style={{ color: 'var(--accent)' }} /> 已学习时间
        </span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
          {stats.source === 'pristimer' ? 'PrisTimer 同步' : '本地记录'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1 }}>
        {/* 今日进度环 */}
        <div style={{ position: 'relative', width: 112, height: 112, flexShrink: 0 }}>
          <svg width="112" height="112" viewBox="0 0 112 112">
            <circle cx="56" cy="56" r={R} fill="none" stroke="var(--glass-border)" strokeWidth="8" />
            <circle
              cx="56" cy="56" r={R} fill="none"
              stroke="var(--accent)" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)}
              transform="rotate(-90 56 56)"
              style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.22, 0.61, 0.36, 1)' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>{stats.today}<span style={{ fontSize: '0.68rem', fontWeight: 600, marginLeft: 3 }}>分</span></span>
            <span style={{ fontSize: '0.66rem', color: 'var(--text-tertiary)' }}>目标 8h</span>
          </div>
        </div>

        {/* 2×2 指标 */}
        <div style={{ flex: 1, minWidth: 0, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.7rem 1rem' }}>
          {cells.map((s) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
              <s.icon size={14} style={{ color: s.color, flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', lineHeight: 1.3, whiteSpace: 'nowrap' }}>{s.label}</div>
                <div style={{ fontSize: '0.86rem', color: s.color, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================= LeetCode 进度卡 ================= */
function LeetCodeProgressCard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let alive = true;
    leetcodeApi.getAllData('Likey-e').then((d) => { if (alive) { setData(d); setErr(!d?.profile); } });
    return () => { alive = false; };
  }, []);

  const stats = useMemo(() => {
    if (!data?.profile) return null;
    const ac = data.profile.matchedUser.submitStatsGlobal.acSubmissionNum;
    const all = data.profile.allQuestionsCount;
    const get = (arr, diff) => arr.find((x) => x.difficulty === diff)?.count || 0;
    const solved = get(ac, 'All'), total = get(all, 'All');
    const pct = total ? Math.round((solved / total) * 1000) / 10 : 0;
    return {
      solved, total, pct,
      easy: get(ac, 'Easy'), easyT: get(all, 'Easy'),
      medium: get(ac, 'Medium'), mediumT: get(all, 'Medium'),
      hard: get(ac, 'Hard'), hardT: get(all, 'Hard'),
    };
  }, [data]);

  if (err || !stats) {
    return (
      <div className="glass mouse-glow reveal" style={{ borderRadius: 20, padding: '1.5rem', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}>
        <BarChart3 size={22} style={{ color: 'var(--accent)' }} />
        <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>{err ? '暂无 LeetCode 数据' : '加载中'}</span>
      </div>
    );
  }
  const R = 46, C = 2 * Math.PI * R;
  const diff = [
    { label: '简单', solved: stats.easy, total: stats.easyT, color: 'var(--leetcode-easy)' },
    { label: '中等', solved: stats.medium, total: stats.mediumT, color: 'var(--leetcode-medium)' },
    { label: '困难', solved: stats.hard, total: stats.hardT, color: 'var(--leetcode-hard)' },
  ];
  return (
    <div className="glass mouse-glow reveal" style={{ borderRadius: 20, padding: '1.5rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
          <BarChart3 size={15} style={{ color: 'var(--accent)' }} /> LeetCode 进度
        </span>
        <a href="https://leetcode.cn/u/Likey-e/" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textDecoration: 'none' }}>
          共 {stats.total} 题 · 查看 →
        </a>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1 }}>
        {/* 总进度环 */}
        <div style={{ position: 'relative', width: 112, height: 112, flexShrink: 0 }}>
          <svg width="112" height="112" viewBox="0 0 112 112">
            <circle cx="56" cy="56" r={R} fill="none" stroke="var(--glass-border)" strokeWidth="8" />
            <circle
              cx="56" cy="56" r={R} fill="none"
              stroke="var(--accent)" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - stats.pct / 100)}
              transform="rotate(-90 56 56)"
              style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.22, 0.61, 0.36, 1)' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>{stats.solved}</span>
            <span style={{ fontSize: '0.66rem', color: 'var(--text-tertiary)' }}>已解答 · {stats.pct}%</span>
          </div>
        </div>

        {/* 三档进度 */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          {diff.map((d) => {
            const p = d.total ? Math.round((d.solved / d.total) * 1000) / 10 : 0;
            return (
              <div key={d.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '0.76rem', marginBottom: 4, gap: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <i style={{ width: 7, height: 7, borderRadius: '50%', background: d.color, display: 'inline-block' }} />
                    {d.label}
                  </span>
                  <span style={{ color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                    {d.solved} / {d.total}
                    <span style={{ marginLeft: '0.4rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{p}%</span>
                  </span>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: 'var(--glass-border)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.max(p, 0.6)}%`, borderRadius: 3, background: d.color, transition: 'width 0.8s cubic-bezier(0.22, 0.61, 0.36, 1)' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ================= GitHub 概览卡 ================= */
function GithubCard() {
  const [gh, setGh] = useState(null);
  useEffect(() => {
    let alive = true;
    const KEY = 'kakuki-gh-profile';
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        if (Date.now() - cached.ts < 24 * 3600 * 1000) {
          setGh(cached.data);
          return;
        }
      }
    } catch { /* ignore */ }
    githubApi
      .user(GITHUB_USERNAME)
      .then((d) => {
        if (!alive || !d) return;
        setGh(d);
        try {
          localStorage.setItem(KEY, JSON.stringify({ ts: Date.now(), data: { bio: d.bio, public_repos: d.public_repos, followers: d.followers, following: d.following } }));
        } catch { /* ignore */ }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return (
    <div className="glass mouse-glow reveal" style={{ borderRadius: 20, padding: '1.5rem', height: '100%', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
        GitHub
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
        {/* 头像三级回退：GitHub 官方 → 本地快照（与 GitHub 一致）→ 首字母徽章（网络受限环境可用） */}
        <GitHubAvatar />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>{GITHUB_USERNAME}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {gh?.bio || 'React · Django · 个人站 Kakuki 构建者'}
          </div>
        </div>
      </div>
      {gh && (
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          {[
            { label: '仓库', value: gh.public_repos },
            { label: '粉丝', value: gh.followers },
            { label: '关注', value: gh.following },
          ].map((s) => (
            <div key={s.label} style={{ flex: 1, minWidth: 70, textAlign: 'center', padding: '0.55rem 0.2rem', borderRadius: 12, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>{s.value ?? '—'}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}
      <a href={`https://github.com/${GITHUB_USERNAME}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.78rem', color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
        <svg width="13" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
      </a>
    </div>
  );
}

/* ================= 仪表盘页面 ================= */
export default function DashboardPage() {
  return (
    <div className="page-enter">
      <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 1.4rem' }}>
        仪表盘
      </h1>

      <div className="dashboard-grid">
        <TiltCard><ClockCard /></TiltCard>
        <TiltCard><StudyTimeCard /></TiltCard>
        <TiltCard><LeetCodeProgressCard /></TiltCard>
        <TiltCard><GithubCard /></TiltCard>
        <TiltCard><TodoCard /></TiltCard>
        <TiltCard><CountdownCard /></TiltCard>
      </div>

      <style>{`
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 1.1rem;
          align-items: stretch;
        }
        .dashboard-grid > .tilt-card { grid-column: span 6; }
        @media (max-width: 900px) {
          .dashboard-grid > .tilt-card { grid-column: span 12; }
        }
        @keyframes clock-colon { 50% { opacity: 0.35; } }
      `}</style>
    </div>
  );
}
