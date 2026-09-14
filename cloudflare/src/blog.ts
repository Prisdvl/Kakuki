/**
 * 业务模块：categories / articles / archives / comments / likes / talks / projects / stats
 * 行为对齐 Django 版 blog/views.py + serializers.py：
 * - list 类响应 {code, message, data}（data 为数组或 DRF 分页结构）
 * - detail/create/delete 同包装；like 返回 {liked, like_count}
 * - 点赞去重：登录按 user_id，游客按 IP（partial unique index 兜底）
 */
import { Hono, type Context } from 'hono';
import type { Env } from './util';
import { clientIp, fail, nowIso, ok, ok201, ok204, pageParams, paginated } from './util';
import { authUser, type UserRow } from './auth';

type Row = Record<string, unknown>;

const num = (v: unknown): number => (typeof v === 'number' ? v : 0);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/**
 * 请求体解析：兼容 JSON 与 multipart/form-data。
 * 前端编辑器用 FormData 提交（封面图字段），Workers 版此前只读 JSON，
 * 导致管理端发布文章一律 400（E2E 链路测试暴露）。
 * 文件部分（cover_image 的 File）暂不支持云端存储，忽略之——与迁移前行为一致。
 */
async function readBodyLoose(c: { req: { header: (k: string) => string | undefined; json: () => Promise<unknown>; formData: () => Promise<FormData> } }): Promise<Record<string, unknown>> {
  const ct = c.req.header('content-type') || '';
  if (ct.includes('multipart/form-data')) {
    const fd = await c.req.formData().catch(() => null);
    if (!fd) return {};
    const out: Record<string, unknown> = {};
    for (const [k, v] of fd.entries()) {
      if (typeof v === 'string') out[k] = v;
    }
    return out;
  }
  return (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
}
// 匿名身份兜底：本地 dev 无 CF-Connecting-IP 时与 Django REMOTE_ADDR 行为对齐
const anonIp = (c: Context): string => clientIp(c) ?? 'unknown';

const categoryNested = (r: Row) =>
  r.cat_id == null
    ? null
    : { id: r.cat_id, name: r.cat_name, description: r.cat_desc, article_count: num(r.cat_article_count) };

const ARTICLE_LIST_FIELDS = `
  a.id, a.title, a.summary, a.cover_image, a.views, a.is_top, a.created_at, a.updated_at,
  a.category_id AS cat_id, c.name AS cat_name, c.description AS cat_desc,
  (SELECT COUNT(*) FROM articles x WHERE x.category_id = a.category_id) AS cat_article_count,
  u.nickname AS author_nickname,
  (SELECT COUNT(*) FROM comments cm WHERE cm.article_id = a.id) AS comment_count,
  (SELECT COUNT(*) FROM article_likes l WHERE l.article_id = a.id) AS like_count`;

const ARTICLE_JOIN = `
  FROM articles a
  LEFT JOIN categories c ON c.id = a.category_id
  LEFT JOIN users u ON u.id = a.author_id`;

const articleListItem = (r: Row) => ({
  id: r.id,
  title: r.title,
  summary: r.summary,
  cover_image: r.cover_image,
  category: categoryNested(r),
  author_name: r.author_nickname,
  views: r.views,
  is_top: !!r.is_top,
  comment_count: r.comment_count,
  like_count: r.like_count,
  created_at: r.created_at,
  updated_at: r.updated_at,
});

const ORDERING_MAP: Record<string, string> = {
  created_at: 'a.created_at ASC',
  '-created_at': 'a.created_at DESC',
  views: 'a.views ASC',
  '-views': 'a.views DESC',
};

export const blogRoutes = new Hono<{ Bindings: Env }>()

  /* ---------------- Categories ---------------- */
  .get('/categories/', async (c) => {
    const rows = await c.env.DB.prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM articles a WHERE a.category_id = c.id) AS article_count
       FROM categories c ORDER BY article_count DESC, c.id ASC`,
    ).all<Row>();
    const data = rows.results.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      article_count: r.article_count,
    }));
    return ok(data);
  })

  .get('/categories/manage/', async (c) => {
    const user = await authUser(c);
    if (!user) return fail(401, '身份认证信息未提供。');
    if (!user.is_staff) return fail(403, '仅站长账号可执行此操作');
    const rows = await c.env.DB.prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM articles a WHERE a.category_id = c.id) AS article_count
       FROM categories c ORDER BY article_count DESC, c.id ASC`,
    ).all<Row>();
    return ok(rows.results.map((r) => ({ id: r.id, name: r.name, description: r.description, article_count: r.article_count })));
  })

  .post('/categories/manage/', async (c) => {
    const user = await authUser(c);
    if (!user) return fail(401, '身份认证信息未提供。');
    if (!user.is_staff) return fail(403, '仅站长账号可执行此操作');
    const body = (await c.req.json().catch(() => ({}))) as Row;
    const name = str(body.name).trim();
    if (!name) return fail(400, 'Invalid input.', { name: ['该字段是必填项。'] });
    const dup = await c.env.DB.prepare('SELECT id FROM categories WHERE name = ?1').bind(name).first();
    if (dup) return fail(400, 'Invalid input.', { name: ['具有 name 的 分类 已存在。'] });
    const res = await c.env.DB.prepare('INSERT INTO categories (name, description) VALUES (?1, ?2)')
      .bind(name, str(body.description))
      .run();
    const row = await c.env.DB.prepare(
      'SELECT c.*, (SELECT COUNT(*) FROM articles a WHERE a.category_id = c.id) AS article_count FROM categories c WHERE c.id = ?1',
    )
      .bind(res.meta.last_row_id as number)
      .first<Row>();
    return ok201({ id: row!.id, name: row!.name, description: row!.description, article_count: row!.article_count });
  })

  .put('/categories/manage/:id/', async (c) => {
    const user = await authUser(c);
    if (!user) return fail(401, '身份认证信息未提供。');
    if (!user.is_staff) return fail(403, '仅站长账号可执行此操作');
    const id = Number(c.req.param('id'));
    const body = (await c.req.json().catch(() => ({}))) as Row;
    const row = await c.env.DB.prepare('SELECT * FROM categories WHERE id = ?1').bind(id).first<Row>();
    if (!row) return fail(404, '未找到。');
    const name = str(body.name).trim() || str(row.name);
    const description = typeof body.description === 'string' ? body.description : str(row.description);
    await c.env.DB.prepare('UPDATE categories SET name = ?1, description = ?2 WHERE id = ?3').bind(name, description, id).run();
    const fresh = await c.env.DB.prepare(
      'SELECT c.*, (SELECT COUNT(*) FROM articles a WHERE a.category_id = c.id) AS article_count FROM categories c WHERE c.id = ?1',
    )
      .bind(id)
      .first<Row>();
    return ok({ id: fresh!.id, name: fresh!.name, description: fresh!.description, article_count: fresh!.article_count }, 200, '更新成功');
  })

  .delete('/categories/manage/:id/', async (c) => {
    const user = await authUser(c);
    if (!user) return fail(401, '身份认证信息未提供。');
    if (!user.is_staff) return fail(403, '仅站长账号可执行此操作');
    const id = Number(c.req.param('id'));
    const res = await c.env.DB.prepare('DELETE FROM categories WHERE id = ?1').bind(id).run();
    if (!res.meta.changes) return fail(404, '未找到。');
    return ok204('删除成功');
  })

  /* ---------------- Articles ---------------- */
  .get('/articles/', async (c) => {
    const p = pageParams(c);
    const where: string[] = [];
    const binds: unknown[] = [];
    const search = c.req.query('search');
    if (search) {
      where.push('(a.title LIKE ?1 OR a.content LIKE ?1)');
      binds.push(`%${search}%`);
    }
    const categoryId = c.req.query('category');
    if (categoryId && /^\d+$/.test(categoryId)) {
      binds.push(Number(categoryId));
      where.push(`a.category_id = ?${binds.length}`);
    }
    const year = c.req.query('year');
    if (year && /^\d{4}$/.test(year)) {
      binds.push(year);
      where.push(`CAST(strftime('%Y', a.created_at) AS INTEGER) = ?${binds.length}`);
    }
    const month = c.req.query('month');
    if (month && /^\d{1,2}$/.test(month)) {
      binds.push(Number(month));
      where.push(`CAST(strftime('%m', a.created_at) AS INTEGER) = ?${binds.length}`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const orderSql = ORDERING_MAP[c.req.query('ordering') ?? ''] ?? 'a.is_top DESC, a.created_at DESC';

    const total = await c.env.DB.prepare(`SELECT COUNT(*) AS n ${ARTICLE_JOIN} ${whereSql}`)
      .bind(...binds)
      .first<Row>();
    const rows = await c.env.DB.prepare(
      `SELECT ${ARTICLE_LIST_FIELDS} ${ARTICLE_JOIN} ${whereSql} ORDER BY ${orderSql} LIMIT ?${binds.length + 1} OFFSET ?${binds.length + 2}`,
    )
      .bind(...binds, p.pageSize, (p.page - 1) * p.pageSize)
      .all<Row>();

    const url = new URL(c.req.url);
    const query: Record<string, string> = {};
    url.searchParams.forEach((v, k) => {
      if (k !== 'page' && k !== 'page_size') query[k] = v;
    });
    return ok(paginated(rows.results.map(articleListItem), num(total?.n), p, url.pathname, query));
  })

  .get('/articles/:id/', async (c) => {
    const id = Number(c.req.param('id'));
    const row = await c.env.DB.prepare(
      `SELECT a.*, u.nickname AS author_nickname, u.id AS author_id2, c.name AS cat_name, c.description AS cat_desc,
        (SELECT COUNT(*) FROM articles x WHERE x.category_id = a.category_id) AS cat_article_count,
        (SELECT COUNT(*) FROM comments cm WHERE cm.article_id = a.id) AS comment_count,
        (SELECT COUNT(*) FROM article_likes l WHERE l.article_id = a.id) AS like_count
       ${ARTICLE_JOIN.replace('LEFT JOIN users u ON u.id = a.author_id', 'LEFT JOIN users u ON u.id = a.author_id')}
       WHERE a.id = ?1`,
    )
      .bind(id)
      .first<Row>();
    if (!row) return fail(404, '未找到。');

    await c.env.DB.prepare('UPDATE articles SET views = views + 1 WHERE id = ?1').bind(id).run();

    const user = await authUser(c);
    let liked = false;
    if (user) {
      liked = !!(await c.env.DB.prepare('SELECT id FROM article_likes WHERE article_id = ?1 AND user_id = ?2').bind(id, user.id).first());
    } else {
      const ip = anonIp(c);
      liked = ip ? !!(await c.env.DB.prepare('SELECT id FROM article_likes WHERE article_id = ?1 AND ip_address = ?2').bind(id, ip).first()) : false;
    }
    const views = num(row.views) + 1;
    return ok({
      id: row.id,
      title: row.title,
      content: row.content,
      summary: row.summary,
      cover_image: row.cover_image,
      category: categoryNested(row),
      author_name: row.author_nickname,
      author_id: row.author_id2,
      views,
      is_top: !!row.is_top,
      comment_count: row.comment_count,
      like_count: row.like_count,
      created_at: row.created_at,
      updated_at: row.updated_at,
      liked,
    });
  })

  .post('/articles/create/', async (c) => {
    const user = await authUser(c);
    if (!user) return fail(401, '身份认证信息未提供。');
    if (!user.is_staff) return fail(403, '仅站长账号可执行此操作');
    const body = await readBodyLoose(c);
    const title = str(body.title).trim();
    const content = str(body.content);
    const errors: Record<string, string[]> = {};
    if (!title) errors.title = ['该字段是必填项。'];
    else if (title.length > 200) errors.title = ['确保该字段包含的字符不超过 200 个。'];
    if (!content) errors.content = ['该字段是必填项。'];
    if (Object.keys(errors).length) return fail(400, 'Invalid input.', errors);

    let categoryId: number | null = null;
    if (body.category != null) {
      const cid = Number(body.category);
      const cat = await c.env.DB.prepare('SELECT id FROM categories WHERE id = ?1').bind(cid).first();
      if (!cat) return fail(400, 'Invalid input.', { category: [`无效的主键 "${body.category}" —— 对象不存在。`] });
      categoryId = cid;
    }
    const now = nowIso();
    const summary = str(body.summary).slice(0, 500);
    const res = await c.env.DB.prepare(
      'INSERT INTO articles (title, content, summary, cover_image, category_id, author_id, is_top, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)',
    )
      .bind(title, content, summary, body.cover_image == null ? null : str(body.cover_image), categoryId, user.id, body.is_top ? 1 : 0, now)
      .run();
    const articleId = res.meta.last_row_id as number;
    return ok201({ id: articleId, title, content, summary, cover_image: body.cover_image ?? null, category: categoryId, is_top: !!body.is_top }, '发布成功');
  })

  .put('/articles/:id/edit/', async (c) => {
    const user = await authUser(c);
    if (!user) return fail(401, '身份认证信息未提供。');
    if (!user.is_staff) return fail(403, '仅站长账号可执行此操作');
    const id = Number(c.req.param('id'));
    const row = await c.env.DB.prepare('SELECT * FROM articles WHERE id = ?1').bind(id).first<Row>();
    if (!row) return fail(404, '未找到。');
    const body = await readBodyLoose(c);
    const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : str(row.title);
    const content = typeof body.content === 'string' ? body.content : str(row.content);
    const summary = typeof body.summary === 'string' ? body.summary.slice(0, 500) : str(row.summary);
    const cover = body.cover_image === null ? null : typeof body.cover_image === 'string' && body.cover_image ? body.cover_image : row.cover_image;
    let categoryId = row.category_id as number | null;
    if (body.category !== undefined) {
      if (body.category === null) categoryId = null;
      else {
        const cid = Number(body.category);
        const cat = await c.env.DB.prepare('SELECT id FROM categories WHERE id = ?1').bind(cid).first();
        if (!cat) return fail(400, 'Invalid input.', { category: [`无效的主键 "${body.category}" —— 对象不存在。`] });
        categoryId = cid;
      }
    }
    const isTop = body.is_top === undefined ? row.is_top : body.is_top ? 1 : 0;
    await c.env.DB.prepare(
      'UPDATE articles SET title = ?1, content = ?2, summary = ?3, cover_image = ?4, category_id = ?5, is_top = ?6, updated_at = ?7 WHERE id = ?8',
    )
      .bind(title, content, summary, cover, categoryId, isTop, nowIso(), id)
      .run();
    return ok({ id, title, content, summary, cover_image: cover, category: categoryId, is_top: !!isTop }, 200, '更新成功');
  })

  .delete('/articles/:id/delete/', async (c) => {
    const user = await authUser(c);
    if (!user) return fail(401, '身份认证信息未提供。');
    if (!user.is_staff) return fail(403, '仅站长账号可执行此操作');
    const res = await c.env.DB.prepare('DELETE FROM articles WHERE id = ?1').bind(Number(c.req.param('id'))).run();
    if (!res.meta.changes) return fail(404, '未找到。');
    return ok204('删除成功');
  })

  /* ---------------- Archive ---------------- */
  .get('/archives/', async (c) => {
    const rows = await c.env.DB.prepare('SELECT id, title, created_at FROM articles ORDER BY created_at DESC').all<Row>();
    const result: Array<{ year: number; months: Array<{ month: number; articles: Row[] }> }> = [];
    const yearIndex = new Map<number, { year: number; months: Array<{ month: number; articles: Row[] }> }>();
    const monthIndex = new Map<string, { month: number; articles: Row[] }>();
    for (const r of rows.results) {
      const d = new Date(str(r.created_at));
      const year = d.getUTCFullYear();
      const month = d.getUTCMonth() + 1;
      let yearEntry = yearIndex.get(year);
      if (!yearEntry) {
        yearEntry = { year, months: [] };
        yearIndex.set(year, yearEntry);
        result.push(yearEntry);
      }
      const key = `${year}-${month}`;
      let monthEntry = monthIndex.get(key);
      if (!monthEntry) {
        monthEntry = { month, articles: [] };
        monthIndex.set(key, monthEntry);
        yearEntry.months.push(monthEntry);
      }
      monthEntry.articles.push({ id: r.id, title: r.title, created_at: r.created_at });
    }
    return ok(result);
  })

  /* ---------------- Comments ---------------- */
  .get('/articles/:id/comments/', async (c) => {
    const articleId = Number(c.req.param('id'));
    const tops = await c.env.DB.prepare(
      `SELECT cm.id, cm.article_id, cm.content, cm.parent_id, cm.created_at, u.id AS user_id, u.nickname AS user_nickname, u.username AS user_username, u.avatar AS user_avatar
       FROM comments cm JOIN users u ON u.id = cm.user_id
       WHERE cm.article_id = ?1 AND cm.parent_id IS NULL
       ORDER BY cm.created_at DESC`,
    )
      .bind(articleId)
      .all<Row>();
    const serialize = async (r: Row, withReplies: boolean): Promise<Row> => {
      const base: Row = {
        id: r.id,
        article: r.article_id,
        user_id: r.user_id,
        user_name: r.user_nickname,
        user_avatar: r.user_avatar,
        content: r.content,
        parent: r.parent_id,
        created_at: r.created_at,
      };
      if (!withReplies) return base;
      const replies = await c.env.DB.prepare(
        `SELECT cm.id, cm.article_id, cm.content, cm.parent_id, cm.created_at, u.id AS user_id, u.nickname AS user_nickname, u.username AS user_username, u.avatar AS user_avatar
         FROM comments cm JOIN users u ON u.id = cm.user_id
         WHERE cm.parent_id = ?1 ORDER BY cm.created_at DESC`,
      )
        .bind(r.id)
        .all<Row>();
      const repliesArr: Row[] = [];
      for (const rep of replies.results) repliesArr.push(await serialize(rep, false));
      base.replies = repliesArr;
      return base;
    };
    const data: Row[] = [];
    for (const r of tops.results) data.push(await serialize(r, true));
    return ok(data);
  })

  .post('/comments/create/', async (c) => {
    const user = await authUser(c);
    if (!user) return fail(401, '身份认证信息未提供。');
    const body = (await c.req.json().catch(() => ({}))) as Row;
    const articleId = Number(body.article);
    const content = str(body.content);
    if (!articleId || Number.isNaN(articleId)) return fail(400, 'Invalid input.', { article: ['该字段是必填项。'] });
    if (!content) return fail(400, 'Invalid input.', { content: ['该字段是必填项。'] });
    const article = await c.env.DB.prepare('SELECT id FROM articles WHERE id = ?1').bind(articleId).first();
    if (!article) return fail(400, 'Invalid input.', { article: [`无效的主键 "${body.article}" —— 对象不存在。`] });
    let parentId: number | null = null;
    if (body.parent != null) {
      const pid = Number(body.parent);
      const parent = await c.env.DB.prepare('SELECT id FROM comments WHERE id = ?1').bind(pid).first();
      if (!parent) return fail(400, 'Invalid input.', { parent: [`无效的主键 "${body.parent}" —— 对象不存在。`] });
      parentId = pid;
    }
    const res = await c.env.DB.prepare(
      'INSERT INTO comments (article_id, user_id, content, parent_id, created_at) VALUES (?1, ?2, ?3, ?4, ?5)',
    )
      .bind(articleId, user.id, content, parentId, nowIso())
      .run();
    return ok201({ id: res.meta.last_row_id as number, article: articleId, content, parent: parentId }, '评论成功');
  })

  .delete('/comments/:id/delete/', async (c) => {
    const user = await authUser(c);
    if (!user) return fail(401, '身份认证信息未提供。');
    const id = Number(c.req.param('id'));
    const row = await c.env.DB.prepare('SELECT user_id FROM comments WHERE id = ?1').bind(id).first<Row>();
    if (!row) return fail(404, '未找到。');
    if (num(row.user_id) !== user.id && !user.is_staff) return fail(403, '无权删除');
    await c.env.DB.prepare('DELETE FROM comments WHERE id = ?1').bind(id).run();
    return ok204('删除成功');
  })

  /* ---------------- Likes（toggle） ---------------- */
  .post('/articles/:id/like/', async (c) => {
    const id = Number(c.req.param('id'));
    const article = await c.env.DB.prepare('SELECT id FROM articles WHERE id = ?1').bind(id).first();
    if (!article) return fail(404, '文章不存在');
    const user = await authUser(c);
    const ip = user ? null : anonIp(c);
    return toggleLike(c.env.DB, 'article_likes', 'article_id', id, user, ip);
  })

  .post('/talks/:id/like/', async (c) => {
    const id = Number(c.req.param('id'));
    const talk = await c.env.DB.prepare('SELECT id FROM talks WHERE id = ?1').bind(id).first();
    if (!talk) return fail(404, '杂谈不存在');
    const user = await authUser(c);
    const ip = user ? null : anonIp(c);
    return toggleLike(c.env.DB, 'talk_likes', 'talk_id', id, user, ip);
  })

  /* ---------------- Talks ---------------- */
  .get('/talks/', async (c) => {
    const p = pageParams(c);
    const user = await authUser(c);
    const uid = user?.id ?? null;
    const ip = user ? null : anonIp(c);
    const total = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM talks').first<Row>();
    const rows = await c.env.DB.prepare(
      `SELECT t.id, t.content, t.created_at, u.nickname AS author_nickname,
        (SELECT COUNT(*) FROM talk_likes tl WHERE tl.talk_id = t.id) AS like_count,
        EXISTS(SELECT 1 FROM talk_likes x WHERE x.talk_id = t.id AND ((?1 IS NOT NULL AND x.user_id = ?1) OR (?1 IS NULL AND ?2 IS NOT NULL AND x.ip_address = ?2))) AS liked
       FROM talks t JOIN users u ON u.id = t.author_id
       ORDER BY t.created_at DESC LIMIT ?3 OFFSET ?4`,
    )
      .bind(uid, ip, p.pageSize, (p.page - 1) * p.pageSize)
      .all<Row>();
    const results = rows.results.map((r) => ({
      id: r.id,
      content: r.content,
      author_name: r.author_nickname,
      like_count: r.like_count,
      liked: !!r.liked,
      created_at: r.created_at,
    }));
    const url = new URL(c.req.url);
    const query: Record<string, string> = {};
    url.searchParams.forEach((v, k) => {
      if (k !== 'page' && k !== 'page_size') query[k] = v;
    });
    return ok(paginated(results, num(total?.n), p, url.pathname, query));
  })

  .post('/talks/create/', async (c) => {
    const user = await authUser(c);
    if (!user) return fail(401, '身份认证信息未提供。');
    if (!user.is_staff) return fail(403, '仅站长账号可执行此操作');
    const body = (await c.req.json().catch(() => ({}))) as Row;
    const content = str(body.content);
    if (!content) return fail(400, 'Invalid input.', { content: ['该字段是必填项。'] });
    if (content.length > 500) return fail(400, 'Invalid input.', { content: ['确保该字段包含的字符不超过 500 个。'] });
    const res = await c.env.DB.prepare('INSERT INTO talks (content, author_id, created_at) VALUES (?1, ?2, ?3)')
      .bind(content, user.id, nowIso())
      .run();
    return ok201(
      { id: res.meta.last_row_id as number, content, author_name: user.nickname, like_count: 0, liked: false, created_at: nowIso() },
      '发布成功',
    );
  })

  .delete('/talks/:id/delete/', async (c) => {
    const user = await authUser(c);
    if (!user) return fail(401, '身份认证信息未提供。');
    if (!user.is_staff) return fail(403, '仅站长账号可执行此操作');
    const res = await c.env.DB.prepare('DELETE FROM talks WHERE id = ?1').bind(Number(c.req.param('id'))).run();
    if (!res.meta.changes) return fail(404, '未找到。');
    return ok204('删除成功');
  })

  /* ---------------- Projects ---------------- */
  .get('/projects/', async (c) => {
    const rows = await c.env.DB.prepare(
      'SELECT * FROM projects ORDER BY is_featured DESC, sort_order ASC, created_at DESC',
    ).all<Row>();
    const data = rows.results.map(projectItem);
    return ok(data);
  })

  .get('/projects/manage/', async (c) => {
    const user = await authUser(c);
    if (!user) return fail(401, '身份认证信息未提供。');
    if (!user.is_staff) return fail(403, '仅站长账号可执行此操作');
    const rows = await c.env.DB.prepare('SELECT * FROM projects ORDER BY is_featured DESC, sort_order ASC, created_at DESC').all<Row>();
    return ok(rows.results.map(projectItem));
  })

  .post('/projects/manage/', async (c) => {
    const user = await authUser(c);
    if (!user) return fail(401, '身份认证信息未提供。');
    if (!user.is_staff) return fail(403, '仅站长账号可执行此操作');
    const body = (await c.req.json().catch(() => ({}))) as Row;
    const name = str(body.name).trim();
    const description = str(body.description);
    if (!name) return fail(400, 'Invalid input.', { name: ['该字段是必填项。'] });
    if (!description) return fail(400, 'Invalid input.', { description: ['该字段是必填项。'] });
    const res = await c.env.DB.prepare(
      'INSERT INTO projects (name, description, url, repo_url, tech_stack, cover_image, is_featured, sort_order, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)',
    )
      .bind(
        name,
        description,
        str(body.url),
        str(body.repo_url),
        str(body.tech_stack),
        body.cover_image == null ? null : str(body.cover_image),
        body.is_featured ? 1 : 0,
        num(body.order) || num(body.sort_order),
        nowIso(),
      )
      .run();
    const row = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?1').bind(res.meta.last_row_id as number).first<Row>();
    return ok201(projectItem(row!), '创建成功');
  })

  .put('/projects/manage/:id/', async (c) => {
    const user = await authUser(c);
    if (!user) return fail(401, '身份认证信息未提供。');
    if (!user.is_staff) return fail(403, '仅站长账号可执行此操作');
    const id = Number(c.req.param('id'));
    const row = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?1').bind(id).first<Row>();
    if (!row) return fail(404, '未找到。');
    const body = (await c.req.json().catch(() => ({}))) as Row;
    const merged = {
      name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : str(row.name),
      description: typeof body.description === 'string' ? body.description : str(row.description),
      url: typeof body.url === 'string' ? body.url : str(row.url),
      repo_url: typeof body.repo_url === 'string' ? body.repo_url : str(row.repo_url),
      tech_stack: typeof body.tech_stack === 'string' ? body.tech_stack : str(row.tech_stack),
      cover_image: body.cover_image === null ? null : typeof body.cover_image === 'string' && body.cover_image ? body.cover_image : row.cover_image,
      is_featured: body.is_featured === undefined ? row.is_featured : body.is_featured ? 1 : 0,
      sort_order: body.order !== undefined ? num(body.order) : body.sort_order !== undefined ? num(body.sort_order) : num(row.sort_order),
    };
    await c.env.DB.prepare(
      'UPDATE projects SET name=?1, description=?2, url=?3, repo_url=?4, tech_stack=?5, cover_image=?6, is_featured=?7, sort_order=?8 WHERE id=?9',
    )
      .bind(merged.name, merged.description, merged.url, merged.repo_url, merged.tech_stack, merged.cover_image, merged.is_featured, merged.sort_order, id)
      .run();
    const fresh = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?1').bind(id).first<Row>();
    return ok(projectItem(fresh!), 200, '更新成功');
  })

  .delete('/projects/manage/:id/', async (c) => {
    const user = await authUser(c);
    if (!user) return fail(401, '身份认证信息未提供。');
    if (!user.is_staff) return fail(403, '仅站长账号可执行此操作');
    const res = await c.env.DB.prepare('DELETE FROM projects WHERE id = ?1').bind(Number(c.req.param('id'))).run();
    if (!res.meta.changes) return fail(404, '未找到。');
    return ok204('删除成功');
  })

  /* ---------------- Site stats ---------------- */
  .get('/stats/', async (c) => {
    const db = c.env.DB;
    const one = async (sql: string): Promise<number> => num((await db.prepare(sql).first<Row>())?.n);
    const [articleCount, categoryCount, commentCount, talkCount, projectCount, articleLikeCount, talkLikeCount, userCount, totalViews] =
      await Promise.all([
        one('SELECT COUNT(*) AS n FROM articles'),
        one('SELECT COUNT(*) AS n FROM categories'),
        one('SELECT COUNT(*) AS n FROM comments'),
        one('SELECT COUNT(*) AS n FROM talks'),
        one('SELECT COUNT(*) AS n FROM projects'),
        one('SELECT COUNT(*) AS n FROM article_likes'),
        one('SELECT COUNT(*) AS n FROM talk_likes'),
        one('SELECT COUNT(*) AS n FROM users'),
        one('SELECT COALESCE(SUM(views), 0) AS n FROM articles'),
      ]);
    // 站点年龄基准 = kakuki.top 在 Cloudflare 激活的时刻，与前端状态栏
    // AppLayout.StatusUptime 的 DEPLOY_ISO 保持一致（2026-09-12T12:52:03Z ≡ 北京时间 20:52:03）。
    // （更早的实现取 MIN(articles.created_at)，那是"最早一篇文章距今天数"，与技术栈迁移无关，
    //   会与状态栏的运行时长对不上。两处口径必须同源。）
    const SITE_LAUNCH_MS = Date.parse('2026-09-12T12:52:03Z');
    const runningDays = Math.max(Math.floor((Date.now() - SITE_LAUNCH_MS) / 86_400_000), 1);
    return ok({
      article_count: articleCount,
      category_count: categoryCount,
      comment_count: commentCount,
      talk_count: talkCount,
      project_count: projectCount,
      article_like_count: articleLikeCount,
      talk_like_count: talkLikeCount,
      total_views: totalViews,
      running_days: runningDays,
      user_count: userCount,
    });
  });

/* ---------------- helpers ---------------- */

async function toggleLike(
  db: Env['DB'],
  table: 'article_likes' | 'talk_likes',
  fk: 'article_id' | 'talk_id',
  targetId: number,
  user: UserRow | null,
  ip: string | null,
): Promise<Response> {
  const existing = user
    ? await db.prepare(`SELECT id FROM ${table} WHERE ${fk} = ?1 AND user_id = ?2`).bind(targetId, user.id).first<Row>()
    : ip
      ? await db.prepare(`SELECT id FROM ${table} WHERE ${fk} = ?1 AND ip_address = ?2`).bind(targetId, ip).first<Row>()
      : null;
  if (existing) {
    await db.prepare(`DELETE FROM ${table} WHERE id = ?1`).bind(existing.id).run();
    var liked = false;
  } else {
    await db
      .prepare(`INSERT INTO ${table} (${fk}, user_id, ip_address, created_at) VALUES (?1, ?2, ?3, ?4)`)
      .bind(targetId, user?.id ?? null, ip, nowIso())
      .run();
    liked = true;
  }
  const count = await db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${fk} = ?1`).bind(targetId).first<Row>();
  return ok({ liked, like_count: num(count?.n) });
}

const projectItem = (r: Row) => ({
  id: r.id,
  name: r.name,
  description: r.description,
  url: r.url,
  repo_url: r.repo_url,
  tech_stack: r.tech_stack,
  tech_list: str(r.tech_stack)
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean),
  cover_image: r.cover_image,
  is_featured: !!r.is_featured,
  order: r.sort_order,
  created_at: r.created_at,
});
