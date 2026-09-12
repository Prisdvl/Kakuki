/**
 * 认证模块：register / login / refresh / me / change-password
 * 行为对齐 Django 版（users/views.py + SimpleJWT）：
 * - login/refresh 返回裸 JSON（不包装）
 * - 其余接口 {code, message, data} 包装
 * - 认证用户资料字段：id, username, nickname, email, avatar, bio, is_staff, date_joined
 */
import { Hono } from 'hono';
import type { Env, JwtPayload } from './util';
import { fail, hashPassword, nowIso, ok, ok201, signToken, verifyPassword, verifyToken } from './util';

export interface UserRow {
  id: number;
  username: string;
  password: string;
  email: string;
  nickname: string;
  avatar: string | null;
  bio: string;
  is_staff: number;
  is_superuser: number;
  date_joined: string;
}

export const profileOf = (u: UserRow) => ({
  id: u.id,
  username: u.username,
  nickname: u.nickname,
  email: u.email,
  avatar: u.avatar,
  bio: u.bio,
  is_staff: !!u.is_staff,
  date_joined: u.date_joined,
});

const USER_BY = 'SELECT * FROM users WHERE ';

export async function getUserById(db: Env['DB'], id: number): Promise<UserRow | null> {
  return (await db.prepare(`${USER_BY}id = ?1`).bind(id).first<UserRow>()) ?? null;
}

async function getUserByUsername(db: Env['DB'], username: string): Promise<UserRow | null> {
  return (await db.prepare(`${USER_BY}username = ?1`).bind(username).first<UserRow>()) ?? null;
}

/** 从 Authorization: Bearer 解析 access token 并加载用户；无效返回 null */
export async function authUser(c: { env: Env; req: { header: (k: string) => string | undefined } }): Promise<UserRow | null> {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const payload = await verifyToken(c.env, auth.slice(7), 'access');
  if (!payload) return null;
  return getUserById(c.env.DB, payload.user_id);
}

// workerd 禁止在全局作用域构造响应，改用工厂函数
const invalidCredentials = () => fail(401, 'No active account found with the given credentials', { code: 'token_not_valid' });
const tokenInvalid = () => fail(401, 'Token is invalid or expired', { code: 'token_not_valid' });

export const authRoutes = new Hono<{ Bindings: Env }>()

  .post('/auth/register/', async (c) => {
    const body = await c.req.json().catch(() => ({} as Record<string, unknown>));
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const nickname = typeof body.nickname === 'string' && body.nickname.trim() ? body.nickname.trim() : username;

    const errors: Record<string, string[]> = {};
    if (!username) errors.username = ['该字段是必填项。'];
    else if (username.length > 150) errors.username = ['确保该字段包含的字符不超过 150 个。'];
    if (!password) errors.password = ['该字段是必填项。'];
    else if (password.length < 6) errors.password = ['密码长度至少 6 位。'];
    if (Object.keys(errors).length) return fail(400, 'Invalid input.', errors);

    if (await getUserByUsername(c.env.DB, username)) {
      return fail(400, 'Invalid input.', { username: ['具有 username 的 用户 已存在。'] });
    }

    const hashed = await hashPassword(password);
    const res = await c.env.DB.prepare(
      'INSERT INTO users (username, password, email, nickname, is_staff, is_superuser, date_joined) VALUES (?1, ?2, ?3, ?4, 0, 0, ?5)',
    )
      .bind(username, hashed, email, nickname, nowIso())
      .run();
    const user = await getUserById(c.env.DB, res.meta.last_row_id as number);
    return ok201(profileOf(user!), '注册成功');
  })

  .post('/auth/login/', async (c) => {
    const body = await c.req.json().catch(() => ({} as Record<string, unknown>));
    const username = typeof body.username === 'string' ? body.username : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const user = username ? await getUserByUsername(c.env.DB, username) : null;
    if (!user || !(await verifyPassword(password, user.password))) return invalidCredentials();
    const access = await signToken(c.env, 'access', user);
    const refresh = await signToken(c.env, 'refresh', user);
    return Response.json({ access, refresh });
  })

  .post('/auth/refresh/', async (c) => {
    const body = await c.req.json().catch(() => ({} as Record<string, unknown>));
    const refresh = typeof body.refresh === 'string' ? body.refresh : '';
    const payload: JwtPayload | null = refresh ? await verifyToken(c.env, refresh, 'refresh') : null;
    if (!payload) return tokenInvalid();
    const user = await getUserById(c.env.DB, payload.user_id);
    if (!user) return tokenInvalid();
    const access = await signToken(c.env, 'access', user);
    return Response.json({ access });
  })

  .get('/auth/me/', async (c) => {
    const user = await authUser(c);
    if (!user) return tokenInvalid();
    return ok(profileOf(user));
  })

  .put('/auth/me/', async (c) => {
    const user = await authUser(c);
    if (!user) return tokenInvalid();
    const body = (await c.req.json().catch(() => ({} as Record<string, unknown>))) as Record<string, unknown>;
    const nickname = typeof body.nickname === 'string' ? body.nickname : user.nickname;
    const email = typeof body.email === 'string' ? body.email : user.email;
    const bio = typeof body.bio === 'string' ? body.bio : user.bio;
    const avatar =
      body.avatar === null ? null : typeof body.avatar === 'string' && body.avatar ? body.avatar : user.avatar;
    await c.env.DB.prepare('UPDATE users SET nickname = ?1, email = ?2, bio = ?3, avatar = ?4 WHERE id = ?5')
      .bind(nickname, email, bio, avatar, user.id)
      .run();
    const fresh = await getUserById(c.env.DB, user.id);
    return ok(profileOf(fresh!), 200, '更新成功');
  })

  .post('/auth/change-password/', async (c) => {
    const user = await authUser(c);
    if (!user) return tokenInvalid();
    const body = (await c.req.json().catch(() => ({} as Record<string, unknown>))) as Record<string, unknown>;
    const oldPassword = typeof body.old_password === 'string' ? body.old_password : '';
    const newPassword = typeof body.new_password === 'string' ? body.new_password : '';
    if (!newPassword || newPassword.length < 6) {
      return fail(400, 'Invalid input.', { new_password: ['确保该字段至少包含 6 个字符。'] });
    }
    if (!(await verifyPassword(oldPassword, user.password))) {
      return fail(400, '原密码错误');
    }
    const hashed = await hashPassword(newPassword);
    await c.env.DB.prepare('UPDATE users SET password = ?1 WHERE id = ?2').bind(hashed, user.id).run();
    return ok(null, 200, '密码修改成功');
  });
