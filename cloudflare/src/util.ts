/**
 * 通用工具：响应包装 / 分页 / 时间 / client IP / PBKDF2 / JWT（HS256）
 * 全部基于 Workers Web Crypto，与 Node 端 seed 生成逻辑保持一致。
 */
import type { Context } from 'hono';

export type Env = {
  DB: D1Database;
  /** 站内音频库音频二进制（R2，audio/<id>；元数据在 D1 media_tracks；总容量业务层写死 ≤ 10 GiB） */
  MEDIA_R2?: R2Bucket;
  ASSETS?: Fetcher;
  JWT_SECRET_DEV?: string;
  JWT_ISSUER?: string;
  JWT_SECRET?: string;
  /** 本地 PrisTimer 同步脚本的上报令牌 */
  SYNC_TOKEN?: string;
  /** 可选：GitHub 代理用的 PAT，未配置时走匿名配额 + 缓存兜底 */
  GITHUB_TOKEN?: string;
  /** Cloudflare Analytics 凭证（仪表盘「站点流量」区块；token 走 secret，zone id 走 vars） */
  CF_API_TOKEN?: string;
  CF_ZONE_ID?: string;
};

export interface JwtPayload {
  token_type: 'access' | 'refresh';
  user_id: number;
  username: string;
  is_staff: number;
  iat: number;
  exp: number;
  jti: string;
  iss?: string;
}

/* ---------------- 响应包装（对齐 Django {code, message, data}） ---------------- */

export const ok = (data: unknown, code = 200, message = 'ok') =>
  Response.json({ code, message, data }, { status: code === 204 ? 200 : code });

export const ok201 = (data: unknown, message = 'ok') =>
  Response.json({ code: 201, message, data }, { status: 201 });

export const ok204 = (message = '删除成功') =>
  // HTTP 204 不允许 body（workerd 强制），改用 200 + body 内 code:204，前端解析兼容
  Response.json({ code: 204, message, data: null }, { status: 200 });

export const fail = (code: number, message: string, data: unknown = null) =>
  Response.json({ code, message, data }, { status: code });

/* ---------------- 时间 ---------------- */

export const nowIso = (): string => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

/* ---------------- client IP（对齐 blog/utils.client_ip，Cloudflare 优先） ---------------- */

export function clientIp(c: Context): string | null {
  const cf = c.req.header('CF-Connecting-IP');
  if (cf) return cf.trim();
  const fwd = c.req.header('X-Forwarded-For');
  if (fwd) return fwd.split(',')[0].trim();
  return null;
}

/* ---------------- PBKDF2 密码（兼容 Django pbkdf2_sha256 格式） ---------------- */

const PBKDF2_ITERATIONS = 100_000; // Django 默认 600k 在免费版 CPU 限额内不安全，新哈希统一 100k

const b64 = (buf: ArrayBuffer): string => {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
};

const b64decode = (s: string): Uint8Array => {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

const pbkdf2Derive = async (password: string, salt: string, iterations: number): Promise<string> => {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations },
    key,
    256,
  );
  return b64(bits);
};

export async function hashPassword(password: string): Promise<string> {
  const salt = Array.from(crypto.getRandomValues(new Uint8Array(9)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const hash = await pbkdf2Derive(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2_sha256$${PBKDF2_ITERATIONS}$${salt}$${hash}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  try {
    const [algo, iterStr, salt, hashB64] = encoded.split('$');
    if (algo !== 'pbkdf2_sha256' || !iterStr || !salt || !hashB64) return false;
    const derived = await pbkdf2Derive(password, salt, parseInt(iterStr, 10));
    const a = b64decode(derived);
    const b = b64decode(hashB64);
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
  } catch {
    return false;
  }
}

/* ---------------- JWT（HS256，SimpleJWT 风格双令牌） ---------------- */

const getSecret = (env: Env): string => env.JWT_SECRET || env.JWT_SECRET_DEV || 'insecure-default';

const hmacKey = (secret: string): Promise<CryptoKey> =>
  crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);

const b64url = (input: string): string => btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const b64urlDecode = (input: string): string => {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  return atob(input.replace(/-/g, '+').replace(/_/g, '/') + pad);
};

const ACCESS_TTL = 24 * 3600; // 1 天（对齐 SimpleJWT 配置）
const REFRESH_TTL = 7 * 24 * 3600; // 7 天

export async function signToken(
  env: Env,
  tokenType: 'access' | 'refresh',
  user: { id: number; username: string; is_staff: number },
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = {
    token_type: tokenType,
    user_id: user.id,
    username: user.username,
    is_staff: user.is_staff,
    iat: now,
    exp: now + (tokenType === 'access' ? ACCESS_TTL : REFRESH_TTL),
    jti: crypto.randomUUID(),
    iss: env.JWT_ISSUER || 'kakuki',
  };
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(payload));
  const key = await hmacKey(getSecret(env));
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${body}`));
  return `${header}.${body}.${b64url(b64(sig))}`;
}

export async function verifyToken(env: Env, token: string, expect: 'access' | 'refresh'): Promise<JwtPayload | null> {
  try {
    const [header, body, sig] = token.split('.');
    if (!header || !body || !sig) return null;
    const key = await hmacKey(getSecret(env));
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      b64decode(b64urlDecode(sig)),
      new TextEncoder().encode(`${header}.${body}`),
    );
    if (!valid) return null;
    const payload = JSON.parse(b64urlDecode(body)) as JwtPayload;
    if (payload.token_type !== expect) return null;
    if (payload.exp * 1000 < Date.now()) return null;
    if (payload.iss && env.JWT_ISSUER && payload.iss !== env.JWT_ISSUER) return null;
    return payload;
  } catch {
    return null;
  }
}

/* ---------------- DRF 风格分页 ---------------- */

export interface PageParams {
  page: number;
  pageSize: number;
}

export function pageParams(c: Context): PageParams {
  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10) || 1);
  const raw = parseInt(c.req.query('page_size') || '10', 10);
  const pageSize = Math.min(Math.max(raw > 0 ? raw : 10, 1), 100);
  return { page, pageSize };
}

export function paginated<T>(items: T[], total: number, p: PageParams, path: string, query: Record<string, string>): {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
} {
  const last = Math.max(1, Math.ceil(total / p.pageSize));
  const build = (n: number): string | null => {
    if (n < 1 || n > last) return null;
    const qs = new URLSearchParams(query);
    qs.set('page', String(n));
    qs.set('page_size', String(p.pageSize));
    return `${path}?${qs.toString()}`;
  };
  return {
    count: total,
    next: build(p.page + 1),
    previous: build(p.page - 1),
    results: items,
  };
}
