-- Kakuki D1 schema（对照 Django models 设计，SQLite 方言）
-- 执行：wrangler d1 execute kakuki-db --file schema.sql

CREATE TABLE IF NOT EXISTS users (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  username     TEXT    NOT NULL UNIQUE,
  password     TEXT    NOT NULL,              -- pbkdf2_sha256$<iters>$<salt>$<b64hash>
  email        TEXT    NOT NULL DEFAULT '',
  nickname     TEXT    NOT NULL DEFAULT '',
  avatar       TEXT,                          -- URL；NULL = 未设置
  bio          TEXT    NOT NULL DEFAULT '',
  is_staff     INTEGER NOT NULL DEFAULT 0,
  is_superuser INTEGER NOT NULL DEFAULT 0,
  date_joined  TEXT    NOT NULL               -- ISO 8601 UTC
);

CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS articles (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT    NOT NULL,
  content     TEXT    NOT NULL,
  summary     TEXT    NOT NULL DEFAULT '',
  cover_image TEXT,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  author_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  views       INTEGER NOT NULL DEFAULT 0,
  is_top      INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL,
  updated_at  TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_articles_list     ON articles(is_top DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category_id);
CREATE INDEX IF NOT EXISTS idx_articles_author   ON articles(author_id);

CREATE TABLE IF NOT EXISTS comments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT    NOT NULL,
  parent_id  INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  created_at TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_comments_article ON comments(article_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent  ON comments(parent_id);

CREATE TABLE IF NOT EXISTS talks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  content    TEXT    NOT NULL,
  author_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  views      INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_talks_created ON talks(created_at DESC);

CREATE TABLE IF NOT EXISTS projects (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  description TEXT    NOT NULL,
  url         TEXT    NOT NULL DEFAULT '',
  repo_url    TEXT    NOT NULL DEFAULT '',
  tech_stack  TEXT    NOT NULL DEFAULT '',
  cover_image TEXT,
  is_featured INTEGER NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0,    -- 对外字段名仍为 order
  created_at  TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS article_likes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  ip_address TEXT,
  created_at TEXT    NOT NULL
);
-- Django UniqueConstraint 语义：NULL 不参与唯一性 → partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS uniq_article_like_user ON article_likes(article_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_article_like_ip   ON article_likes(article_id, ip_address) WHERE ip_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_article_likes_article ON article_likes(article_id);

CREATE TABLE IF NOT EXISTS talk_likes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  talk_id    INTEGER NOT NULL REFERENCES talks(id) ON DELETE CASCADE,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  ip_address TEXT,
  created_at TEXT    NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_talk_like_user ON talk_likes(talk_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_talk_like_ip   ON talk_likes(talk_id, ip_address) WHERE ip_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_talk_likes_talk ON talk_likes(talk_id);

-- 匿名限流（固定窗口，120/min）：key = ip|yyyyMMddHHmm
CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT    NOT NULL,
  window_start INTEGER NOT NULL,
  count        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

-- ============================================================
-- 每日打卡（替代 LeetCode 自动同步：历史数据导入为初始记录，之后手动打卡）
-- ============================================================
CREATE TABLE IF NOT EXISTS checkins (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  date       TEXT    NOT NULL UNIQUE,        -- yyyy-MM-dd（本地日期）
  count      INTEGER NOT NULL DEFAULT 1,     -- 当日完成题数（历史导入用，手动打卡默认 1）
  note       TEXT    NOT NULL DEFAULT '',    -- 备注（如刷了什么题）
  source     TEXT    NOT NULL DEFAULT 'manual', -- manual=手动打卡 / import=历史导入
  created_at TEXT    NOT NULL                -- ISO 8601
);
CREATE INDEX IF NOT EXISTS idx_checkins_date ON checkins(date DESC);

-- ============================================================
-- 专注时长（由本地 PrisTimer 同步脚本上报，按日聚合）
-- ============================================================
CREATE TABLE IF NOT EXISTS focus_stats (
  date        TEXT    NOT NULL PRIMARY KEY,  -- yyyy-MM-dd（本地日期）
  total_ms    INTEGER NOT NULL DEFAULT 0,    -- 当日专注总毫秒（仅 finished 会话 elapsed_ms 之和）
  session_cnt INTEGER NOT NULL DEFAULT 0,    -- 当日会话数
  tags        TEXT    NOT NULL DEFAULT '',   -- JSON 数组：当日涉及的专注标签
  updated_at  TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_focus_stats_date ON focus_stats(date DESC);
