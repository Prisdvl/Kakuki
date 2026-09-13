import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, Flame, TrendingUp, Trophy, Check, Loader2, Undo2, LogIn } from 'lucide-react';
import checkinApi from '../../api/checkin';
import useUserStore from '../../store/userStore';

const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const WEEK_LABELS = ['一', '', '三', '', '五', '', '日'];

// 单元格几何：必须与 checkin.css 中 .checkin-cell 的 width/height 与 gap 完全一致
const CELL = 10;
const GAP = 2;
const LABEL_W = 18; // 星期列 12px + margin-right 4px + flex gap 2px
const MIN_WEEKS = 12;
const MAX_WEEKS = 30;

/**
 * 由容器可用宽度反推能放下的周数。
 * 固定 26 周在首页 344px 宽的卡片里需要 384px，必然横向溢出，
 * 导致「今天」所在的最近一列被裁掉 —— 所以改为按宽度自适应列数。
 */
function calcWeeks(available) {
  if (!available || available <= 0) return 26;
  const n = Math.floor((available - LABEL_W + GAP) / (CELL + GAP));
  return Math.max(MIN_WEEKS, Math.min(MAX_WEEKS, n));
}

const pad = (n) => String(n).padStart(2, '0');
const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** 取本周的周一（heatmap 列以周一为起点） */
function weekStart(d) {
  const t = new Date(d);
  const dow = (t.getDay() + 6) % 7; // 周一=0
  t.setDate(t.getDate() - dow);
  t.setHours(0, 0, 0, 0);
  return t;
}

/**
 * 每日打卡卡
 *
 * 替代原 LeetCode 卡：数据来自 /checkin/summary/（历史 LeetCode 记录已作为初始数据导入），
 * 此后由老大手动打卡。写入需登录（防止访客篡改），未登录时按钮降级为「登录后打卡」。
 * 热力图列数随卡片宽度自适应，保证最近一天始终可见。
 */
export default function CheckinCard() {
  const navigate = useNavigate();
  const isLoggedIn = useUserStore((s) => s.isLoggedIn);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const wrapRef = useRef(null);
  const [weeks, setWeeks] = useState(26);

  const load = useCallback(async () => {
    try {
      const res = await checkinApi.summary(400);
      setData(res?.data ?? null);
      setError('');
    } catch (e) {
      setError(e?.response?.data?.message || '打卡数据加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // 依据容器实际宽度决定周数：始终按 11px 方格排布，不横向溢出
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setWeeks(calcWeeks(w));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [loading]);

  const checkedToday = data?.checked_today;
  const streak = data?.streak ?? 0;
  const maxStreak = data?.max_streak ?? 0;
  const totalDays = data?.total_days ?? 0;
  const totalCount = data?.total_count ?? 0;

  const toggleToday = async () => {
    if (busy || !data) return;
    // 未登录：不发起请求（后端会 401），直接引导去登录
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (checkedToday) {
        await checkinApi.remove(data.today);
      } else {
        await checkinApi.create({ count: 1 });
      }
      await load();
    } catch (e) {
      const status = e?.response?.status;
      setError(
        status === 401
          ? '登录状态已失效，请重新登录后再打卡'
          : e?.response?.data?.message || '操作失败，请稍后重试'
      );
    } finally {
      setBusy(false);
    }
  };

  /** date -> count */
  const countMap = useMemo(() => {
    const m = {};
    (data?.calendar || []).forEach((r) => { m[r.date] = r.count; });
    return m;
  }, [data]);

  /** 网格起点：始终以「今天所在的周一」为最后一列向左推 weeks 周 */
  const startDay = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const s = weekStart(today);
    s.setDate(s.getDate() - (weeks - 1) * 7);
    return s;
  }, [weeks]);

  const grid = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cols = [];
    for (let w = 0; w < weeks; w += 1) {
      const col = [];
      for (let d = 0; d < 7; d += 1) {
        const date = new Date(startDay);
        date.setDate(startDay.getDate() + w * 7 + d);
        col.push({ date, key: fmt(date), future: date > today });
      }
      cols.push(col);
    }
    return cols;
  }, [startDay, weeks]);

  /** 月标签：按周所属月份分组（取该周周四判定），宽度按覆盖周数折算 */
  const monthSpans = useMemo(() => {
    const spans = [];
    for (let w = 0; w < weeks; w += 1) {
      const date = new Date(startDay);
      date.setDate(startDay.getDate() + w * 7 + 3);
      const m = date.getMonth();
      const last = spans[spans.length - 1];
      if (last && last.m === m) last.w += 1;
      else spans.push({ m, w: 1 });
    }
    return spans;
  }, [startDay, weeks]);

  const level = (count) => {
    if (!count) return 0;
    if (count <= 1) return 1;
    if (count <= 2) return 2;
    if (count <= 4) return 3;
    return 4;
  };

  const now = new Date();
  const daysToYearEnd = Math.ceil(
    (new Date(now.getFullYear() + 1, 0, 1) - now) / 86400000
  );

  return (
    <div className="checkin-card mouse-glow reveal">
      <div className="checkin-head">
        <h3 className="checkin-title">
          <CalendarCheck size={18} /> 每日打卡
        </h3>
        <button
          className={`checkin-btn ${checkedToday ? 'done' : ''} ${!isLoggedIn ? 'need-login' : ''}`}
          onClick={toggleToday}
          disabled={busy || loading}
          title={
            !isLoggedIn
              ? '登录后即可打卡'
              : checkedToday ? '点击撤销今日打卡' : '点击完成今日打卡'
          }
        >
          {busy ? <Loader2 size={15} className="spin" />
            : !isLoggedIn ? <LogIn size={15} />
              : checkedToday ? <Undo2 size={15} /> : <Check size={15} />}
          {!isLoggedIn ? '登录后打卡' : checkedToday ? '已打卡 · 撤销' : '今日打卡'}
        </button>
      </div>

      <div className="checkin-stats">
        <div className="checkin-stat">
          <div className="checkin-stat-value">
            <Flame size={15} style={{ color: 'var(--warning)' }} />
            {streak}
          </div>
          <div className="checkin-stat-label">连续打卡</div>
        </div>
        <div className="checkin-stat">
          <div className="checkin-stat-value">
            <Trophy size={15} style={{ color: 'var(--accent)' }} />
            {maxStreak}
          </div>
          <div className="checkin-stat-label">最长连续</div>
        </div>
        <div className="checkin-stat">
          <div className="checkin-stat-value">
            <TrendingUp size={15} style={{ color: 'var(--success)' }} />
            {totalDays}
          </div>
          <div className="checkin-stat-label">累计天数</div>
        </div>
        <div className="checkin-stat">
          <div className="checkin-stat-value">
            <Check size={15} style={{ color: 'var(--accent-secondary)' }} />
            {totalCount}
          </div>
          <div className="checkin-stat-label">累计题数</div>
        </div>
      </div>

      <div className="checkin-heat">
        <div className="checkin-heat-head">
          <span className="checkin-heat-title">{monthSpans.length >= 5 ? '近半年打卡' : `近 ${weeks} 周打卡`}</span>
          <div className="checkin-legend">
            <span>少</span>
            {[0, 1, 2, 3, 4].map((i) => (
              <i key={i} className={`checkin-cell lv${i}`} style={{ cursor: 'default' }} />
            ))}
            <span>多</span>
          </div>
        </div>

        <div className="checkin-grid-wrap" ref={wrapRef}>
          <div className="checkin-grid-inner">
            <div className="checkin-months">
              {monthSpans.map((s, i) => (
                <span key={i} style={{ width: s.w * CELL + (s.w - 1) * GAP }}>
                  <i>{MONTHS[s.m]}</i>
                </span>
              ))}
            </div>
            <div className="checkin-grid">
              <div className="checkin-weekdays">
                {WEEK_LABELS.map((l, i) => <span key={i}>{l}</span>)}
              </div>
              {grid.map((col, wi) => (
                <div key={wi} className="checkin-col">
                  {col.map((cell) => {
                    const c = countMap[cell.key] || 0;
                    const lv = level(c);
                    return (
                      <div
                        key={cell.key}
                        className={`checkin-cell lv${cell.future ? 'future' : lv} ${cell.key === data?.today ? 'today' : ''}`}
                        title={cell.future ? '' : `${cell.key}${c ? ` · ${c} 题` : ' · 未打卡'}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && <div className="checkin-error">{error}</div>}

      {!loading && (
        <div className="checkin-foot">
          {!isLoggedIn
            ? '打卡记录仅站长可写，登录后即可记录今天'
            : checkedToday
              ? `今天已打卡 · 距今年结束还有 ${daysToYearEnd} 天`
              : '今天还没打卡，点右上角按钮记一笔'}
        </div>
      )}
    </div>
  );
}
