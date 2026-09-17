/**
 * 打卡与专注模块
 *
 * - checkins   : 每日刷题打卡。历史数据（LeetCode calendar）一次性导入为初始记录，
 *                此后由用户手动打卡。date 唯一，重复打卡幂等（不报错，返回当日记录）。
 * - focus_stats: 每日专注时长，由本地 PrisTimer 同步（本机助手 / 旧脚本）上报聚合结果（按日 PK 覆盖）。
 *
 * 权限：读接口公开（首页卡片 / 状态栏），写接口需要认证（打卡）或 SYNC_TOKEN（脚本上报）。
 */
import { Hono } from 'hono';
import type { Env } from './util';
import { fail, nowIso, ok, ok201 } from './util';
import { authUser } from './auth';

interface CheckinRow {
  id: number;
  date: string;
  count: number;
  note: string;
  source: string;
  created_at: string;
}

interface FocusRow {
  date: string;
  total_ms: number;
  session_cnt: number;
  tags: string;
  updated_at: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 本地日期（UTC+8）：打卡以老大的自然日为界，而非 UTC */
const localDate = (d = new Date()): string => {
  const t = new Date(d.getTime() + 8 * 3600 * 1000);
  return t.toISOString().slice(0, 10);
};

const shiftDate = (iso: string, days: number): string => {
  const t = new Date(`${iso}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + days);
  return t.toISOString().slice(0, 10);
};

const checkinOut = (r: CheckinRow) => ({
  id: r.id,
  date: r.date,
  count: r.count,
  note: r.note,
  source: r.source,
  created_at: r.created_at,
});

/** 连续打卡天数：从今天（或昨天）向前数不中断的天数 */
function computeStreak(dates: Set<string>, today: string): number {
  // 今天未打卡时，从昨天开始算（当天还没到，不应清零）
  let cursor = dates.has(today) ? today : shiftDate(today, -1);
  let streak = 0;
  while (dates.has(cursor)) {
    streak += 1;
    cursor = shiftDate(cursor, -1);
  }
  return streak;
}

/** 最长连续打卡（历史记录用） */
function computeMaxStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...dates].sort();
  let best = 1;
  let cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === shiftDate(sorted[i - 1], 1)) cur += 1;
    else cur = 1;
    if (cur > best) best = cur;
  }
  return best;
}

export const checkinRoutes = new Hono<{ Bindings: Env }>()

  /** 打卡总览：今日状态 + 连续天数 + 累计 + 日历（近 N 天，默认 365） */
  .get('/checkin/summary/', async (c) => {
    const days = Math.min(730, Math.max(30, Number(c.req.query('days') || 365)));
    const today = localDate();
    const from = shiftDate(today, -(days - 1));

    const rows = await c.env.DB
      .prepare('SELECT * FROM checkins WHERE date >= ?1 ORDER BY date DESC')
      .bind(from)
      .all<CheckinRow>();
    const list = rows.results ?? [];

    // 全量日期集合用于计算累计与最长连续
    const all = await c.env.DB
      .prepare('SELECT date FROM checkins ORDER BY date')
      .all<{ date: string }>();
    const allDates = (all.results ?? []).map((r) => r.date);
    const dateSet = new Set(allDates);

    return ok({
      today,
      checked_today: dateSet.has(today),
      today_count: list.find((r) => r.date === today)?.count ?? 0,
      streak: computeStreak(dateSet, today),
      max_streak: computeMaxStreak(allDates),
      total_days: allDates.length,
      total_count: list.reduce((s, r) => s + (r.count || 0), 0),
      calendar: list.map(checkinOut),
    });
  })

  /** 打卡日历区间（前端热力图专用，轻量返回 date -> count） */
  .get('/checkin/calendar/', async (c) => {
    const from = c.req.query('from') || shiftDate(localDate(), -364);
    const to = c.req.query('to') || localDate();
    if (!DATE_RE.test(from) || !DATE_RE.test(to)) return fail(400, '日期格式应为 yyyy-MM-dd');

    const rows = await c.env.DB
      .prepare('SELECT date, count FROM checkins WHERE date BETWEEN ?1 AND ?2 ORDER BY date')
      .bind(from, to)
      .all<{ date: string; count: number }>();

    const map: Record<string, number> = {};
    for (const r of rows.results ?? []) map[r.date] = r.count;
    return ok({ from, to, calendar: map });
  })

  /** 手动打卡（幂等：当日已打卡则返回已有记录） */
  .post('/checkin/', async (c) => {
    const me = await authUser(c);
    if (!me) return fail(401, 'Authentication credentials were not provided.');

    let body: { date?: string; count?: number; note?: string } = {};
    try {
      body = await c.req.json();
    } catch {
      body = {};
    }
    const date = body.date && DATE_RE.test(body.date) ? body.date : localDate();
    const count = Math.max(1, Math.min(100, Number(body.count) || 1));
    const note = String(body.note ?? '').slice(0, 500);

    const existing = await c.env.DB
      .prepare('SELECT * FROM checkins WHERE date = ?1')
      .bind(date)
      .first<CheckinRow>();
    // 幂等：已打卡直接把已有记录返回（如带 note/count 则更新）
    if (existing) {
      if (note || count !== existing.count) {
        await c.env.DB
          .prepare('UPDATE checkins SET count = ?1, note = ?2 WHERE date = ?3')
          .bind(count, note || existing.note, date)
          .run();
        return ok({ ...checkinOut(existing), count, note: note || existing.note }, 200, '打卡已更新');
      }
      return ok(checkinOut(existing), 200, '今日已打卡');
    }

    await c.env.DB
      .prepare('INSERT INTO checkins (date, count, note, source, created_at) VALUES (?1, ?2, ?3, ?4, ?5)')
      .bind(date, count, note, 'manual', nowIso())
      .run();

    const created = await c.env.DB
      .prepare('SELECT * FROM checkins WHERE date = ?1')
      .bind(date)
      .first<CheckinRow>();
    return ok201(checkinOut(created!), '打卡成功');
  })

  /** 取消打卡（仅限手动打卡的记录） */
  .delete('/checkin/:date/', async (c) => {
    const me = await authUser(c);
    if (!me) return fail(401, 'Authentication credentials were not provided.');
    const date = c.req.param('date');
    if (!DATE_RE.test(date)) return fail(400, '日期格式应为 yyyy-MM-dd');
    await c.env.DB.prepare('DELETE FROM checkins WHERE date = ?1').bind(date).run();
    return ok(null, 200, '已取消打卡');
  })

  /** 历史数据导入（一次性；date 已存在则跳过，不覆盖手动打卡） */
  .post('/checkin/import/', async (c) => {
    const me = await authUser(c);
    if (!me) return fail(401, 'Authentication credentials were not provided.');

    let body: { records?: { date: string; count?: number }[] } = {};
    try {
      body = await c.req.json();
    } catch {
      return fail(400, '请求体应为 JSON');
    }
    const records = Array.isArray(body.records) ? body.records : [];
    if (records.length === 0) return fail(400, 'records 为空');

    let inserted = 0;
    let skipped = 0;
    const stmt = c.env.DB.prepare(
      'INSERT OR IGNORE INTO checkins (date, count, note, source, created_at) VALUES (?1, ?2, ?3, ?4, ?5)'
    );
    const batch = [];
    for (const r of records) {
      if (!r?.date || !DATE_RE.test(r.date)) continue;
      const count = Math.max(1, Math.min(100, Number(r.count) || 1));
      batch.push(stmt.bind(r.date, count, 'LeetCode 历史导入', 'import', nowIso()));
    }
    if (batch.length > 0) {
      // D1 batch 上限 100 条/批
      for (let i = 0; i < batch.length; i += 100) {
        const res = await c.env.DB.batch(batch.slice(i, i + 100));
        for (const r of res) {
          if ((r.meta?.changes ?? 0) > 0) inserted += 1;
          else skipped += 1;
        }
      }
    }
    return ok({ inserted, skipped, total: batch.length }, 200, '导入完成');
  })

  /* ---------------- 专注时长（PrisTimer 同步） ---------------- */

  /** 专注总览：今日 + 近 N 天趋势 + 累计 */
  .get('/focus/summary/', async (c) => {
    const days = Math.min(365, Math.max(7, Number(c.req.query('days') || 30)));
    const today = localDate();
    const from = shiftDate(today, -(days - 1));

    const rows = await c.env.DB
      .prepare('SELECT * FROM focus_stats WHERE date >= ?1 ORDER BY date DESC')
      .bind(from)
      .all<FocusRow>();
    const list = rows.results ?? [];

    const agg = await c.env.DB
      .prepare('SELECT COALESCE(SUM(total_ms), 0) AS total, COALESCE(SUM(session_cnt), 0) AS cnt, COUNT(*) AS days FROM focus_stats')
      .first<{ total: number; cnt: number; days: number }>();

    const todayRow = list.find((r) => r.date === today);
    const out = (r: FocusRow) => ({
      date: r.date,
      total_ms: r.total_ms,
      total_minutes: Math.round(r.total_ms / 60000),
      session_cnt: r.session_cnt,
      tags: r.tags ? JSON.parse(r.tags) : [],
    });

    return ok({
      today,
      today_ms: todayRow?.total_ms ?? 0,
      today_minutes: Math.round((todayRow?.total_ms ?? 0) / 60000),
      today_sessions: todayRow?.session_cnt ?? 0,
      total_ms: agg?.total ?? 0,
      total_minutes: Math.round((agg?.total ?? 0) / 60000),
      total_sessions: agg?.cnt ?? 0,
      total_days: agg?.days ?? 0,
      recent: list.map(out),
    });
  })

  /** 专注数据上报。
   * 鉴权二选一：
   *  - X-Sync-Token（旧版本机脚本，兼容保留）
   *  - Bearer JWT（本机助手 local-sync/helper.py 用登录态 access token，站长身份）
   * 2026-09 同步机制重构：由登录后手动「同步」按钮触发，不再有定时脚本。 */
  .post('/focus/sync/', async (c) => {
    const given = c.req.header('X-Sync-Token');
    let authorized = false;
    if (c.env.SYNC_TOKEN && given && given === c.env.SYNC_TOKEN) {
      authorized = true;
    } else {
      const user = await authUser(c);
      if (user && user.is_staff) authorized = true;
    }
    if (!authorized) return fail(401, '同步令牌无效或未登录站长');

    let body: { days?: { date: string; total_ms: number; session_cnt?: number; tags?: string[] }[] } = {};
    try {
      body = await c.req.json();
    } catch {
      return fail(400, '请求体应为 JSON');
    }
    const days = Array.isArray(body.days) ? body.days : [];
    if (days.length === 0) return fail(400, 'days 为空');

    const stmt = c.env.DB.prepare(
      `INSERT INTO focus_stats (date, total_ms, session_cnt, tags, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)
       ON CONFLICT(date) DO UPDATE SET total_ms = ?2, session_cnt = ?3, tags = ?4, updated_at = ?5`
    );
    const batch = [];
    for (const d of days) {
      if (!d?.date || !DATE_RE.test(d.date)) continue;
      const totalMs = Math.max(0, Math.round(Number(d.total_ms) || 0));
      const cnt = Math.max(0, Math.round(Number(d.session_cnt) || 0));
      const tags = JSON.stringify(Array.isArray(d.tags) ? d.tags.slice(0, 20) : []);
      batch.push(stmt.bind(d.date, totalMs, cnt, tags, nowIso()));
    }
    if (batch.length > 0) {
      for (let i = 0; i < batch.length; i += 100) {
        await c.env.DB.batch(batch.slice(i, i + 100));
      }
    }
    return ok({ synced: batch.length }, 200, '同步完成');
  });
