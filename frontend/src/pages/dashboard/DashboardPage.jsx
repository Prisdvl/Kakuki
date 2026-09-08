import { useEffect, useMemo, useState } from 'react';
import {
  Clock, Timer, CheckCircle2, BarChart3, CalendarDays,
  Flame, BookOpen, TrendingUp, ListTodo, Sparkles,
} from 'lucide-react';
import TiltCard from '../../components/TiltCard';
import leetcodeApi from '../../api/leetcode';
import TodoCard from '../../components/Tools/TodoCard';
import PomodoroCard from '../../components/Tools/PomodoroCard';
import CountdownCard from '../../components/Tools/CountdownCard';

const FOCUS_KEY = 'kakuki-focus-records';
const GITHUB_USERNAME = 'Prisdvl';

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

/* ================= 学习时间统计卡 ================= */
function loadFocusRecords() {
  try { return JSON.parse(localStorage.getItem(FOCUS_KEY) || '[]'); } catch { return []; }
}
function StudyTimeCard() {
  const [records, setRecords] = useState(loadFocusRecords);
  useEffect(() => {
    const refresh = () => setRecords(loadFocusRecords());
    window.addEventListener('kakuki:focus-updated', refresh);
    return () => window.removeEventListener('kakuki:focus-updated', refresh);
  }, []);

  const { today, week, total, sessions } = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = startOfDay - (now.getDay() === 0 ? 6 : now.getDay() - 1) * 86400000;
    let today = 0, week = 0, total = 0;
    records.forEach((r) => {
      const ts = r.ts || new Date(r.date).getTime();
      const m = Number(r.minutes) || 0;
      total += m;
      if (ts >= startOfDay) today += m;
      if (ts >= startOfWeek) week += m;
    });
    return { today, week, total, sessions: records.length };
  }, [records]);

  const goal = 480; // 今日目标 8 小时（分钟）
  const pct = Math.min(100, Math.round((today / goal) * 100));
  const R = 52, C = 2 * Math.PI * R;
  const fmt = (min) => {
    if (min < 60) return `${min} 分钟`;
    const h = Math.floor(min / 60), m = Math.round(min % 60);
    return m ? `${h} 小时 ${m} 分` : `${h} 小时`;
  };

  return (
    <div className="glass mouse-glow reveal" style={{ borderRadius: 20, padding: '1.5rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: '0.9rem' }}>
        <Timer size={15} style={{ color: 'var(--accent)' }} /> 已学习时间
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', flex: 1 }}>
        <div style={{ position: 'relative', width: 124, height: 124, flexShrink: 0 }}>
          <svg width="124" height="124" viewBox="0 0 124 124">
            <circle cx="62" cy="62" r={R} fill="none" stroke="var(--glass-border)" strokeWidth="9" />
            <circle
              cx="62" cy="62" r={R} fill="none"
              stroke="var(--accent)" strokeWidth="9" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)}
              transform="rotate(-90 62 62)"
              style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.22, 0.61, 0.36, 1)' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>{fmt(today)}</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>今日 / {Math.round(goal / 60)}h 目标</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: 0 }}>
          {[
            { icon: Flame, label: '今日', value: fmt(today), color: 'var(--accent)' },
            { icon: TrendingUp, label: '本周', value: fmt(week), color: 'var(--text-primary)' },
            { icon: BookOpen, label: '累计', value: fmt(total), color: 'var(--text-primary)' },
            { icon: CheckCircle2, label: '专注次数', value: `${sessions} 次`, color: 'var(--text-primary)' },
          ].map((s) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem' }}>
              <s.icon size={13} style={{ color: s.color, flexShrink: 0 }} />
              <span style={{ color: 'var(--text-tertiary)', width: 42 }}>{s.label}</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600, whiteSpace: 'nowrap' }}>{s.value}</span>
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
        <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>{err ? '暂无 LeetCode 数据' : '加载 LeetCode 数据...'}</span>
      </div>
    );
  }
  const R = 52, C = 2 * Math.PI * R;
  const diff = [
    { label: '简单', solved: stats.easy, total: stats.easyT, color: 'var(--leetcode-easy)' },
    { label: '中等', solved: stats.medium, total: stats.mediumT, color: 'var(--leetcode-medium)' },
    { label: '困难', solved: stats.hard, total: stats.hardT, color: 'var(--leetcode-hard)' },
  ];
  return (
    <div className="glass mouse-glow reveal" style={{ borderRadius: 20, padding: '1.5rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
          <BarChart3 size={15} style={{ color: 'var(--accent)' }} /> LeetCode 进度
        </span>
        <a href="https://leetcode.cn/u/Likey-e/" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textDecoration: 'none' }}>查看 →</a>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', flex: 1 }}>
        <div style={{ position: 'relative', width: 124, height: 124, flexShrink: 0 }}>
          <svg width="124" height="124" viewBox="0 0 124 124">
            <circle cx="62" cy="62" r={R} fill="none" stroke="var(--glass-border)" strokeWidth="9" />
            <circle
              cx="62" cy="62" r={R} fill="none"
              stroke="var(--accent)" strokeWidth="9" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - stats.pct / 100)}
              transform="rotate(-90 62 62)"
              style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.22, 0.61, 0.36, 1)' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{stats.pct}%</span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>{stats.solved} / {stats.total}</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', flex: 1, minWidth: 0 }}>
          {diff.map((d) => {
            const p = d.total ? Math.round((d.solved / d.total) * 100) : 0;
            return (
              <div key={d.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 3 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{d.label}</span>
                  <span style={{ color: 'var(--text-tertiary)' }}>{d.solved} / {d.total}</span>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: 'var(--glass-border)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${p}%`, borderRadius: 3, background: d.color, transition: 'width 0.8s cubic-bezier(0.22, 0.61, 0.36, 1)' }} />
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
    fetch(`https://api.github.com/users/${GITHUB_USERNAME}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d) setGh(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return (
    <div className="glass mouse-glow reveal" style={{ borderRadius: 20, padding: '1.5rem', height: '100%', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
        <img
          src={`https://github.com/${GITHUB_USERNAME}.png`}
          alt={GITHUB_USERNAME}
          style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--glass-border)' }}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>{GITHUB_USERNAME}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {gh?.bio || 'No such thing as a life is better than yourz.'}
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
      <div style={{ marginBottom: '1.4rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Sparkles size={22} style={{ color: 'var(--accent)' }} /> 仪表盘
        </h1>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-tertiary)', margin: '0.35rem 0 0' }}>学习、刷题、生活，一眼尽收。</p>
      </div>

      <div className="dashboard-grid">
        <TiltCard className="dash-span-2"><ClockCard /></TiltCard>
        <TiltCard><StudyTimeCard /></TiltCard>
        <TiltCard><LeetCodeProgressCard /></TiltCard>
        <TiltCard><GithubCard /></TiltCard>
        <TiltCard><TodoCard /></TiltCard>
        <TiltCard><PomodoroCard /></TiltCard>
        <TiltCard><CountdownCard /></TiltCard>
      </div>

      <style>{`
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 1.1rem;
        }
        .dashboard-grid > .tilt-card { grid-column: span 4; }
        .dashboard-grid > .dash-span-2 { grid-column: span 8; }
        @media (max-width: 1024px) {
          .dashboard-grid > .tilt-card { grid-column: span 6; }
          .dashboard-grid > .dash-span-2 { grid-column: span 12; }
        }
        @media (max-width: 640px) {
          .dashboard-grid > .tilt-card { grid-column: span 12; }
        }
        @keyframes clock-colon { 50% { opacity: 0.35; } }
      `}</style>
    </div>
  );
}
