#!/usr/bin/env python3
"""
PrisTimer → Kakuki 专注时长同步脚本

读取本地 PrisTimer 的 SQLite 库（只读，不写回 —— 外部写库有 SQLITE_BUSY_SNAPSHOT
风险，正是当年启动闪退的根因），按日聚合已结束会话的专注时长，上报到 kakuki.top。

使用：
    python scripts/sync-pristimer.py                # 同步全部历史
    python scripts/sync-pristimer.py --days 30      # 只同步最近 30 天
    python scripts/sync-pristimer.py --dry-run      # 只打印，不上报

配置（优先级：环境变量 > 同目录 .sync-token 文件）：
    KAKUKI_SYNC_TOKEN  上报令牌（必需，可通过 --set-token 写入 .sync-token 文件）
    KAKUKI_API         上报地址（可选，默认 https://kakuki.top）

数据口径（严格遵循 PrisTimer 锚点模型）：
    - 只取 state = 'finished' 的会话
    - 专注时长 = elapsed_ms（累计值，非 ended_at - started_at，避免把暂停算进去）
    - 单段 <10s 的会话不入库（PrisTimer 侧规则，此处按 elapsed_ms 兜底过滤 <10000）
    - 日期归属：按 started_at 的本地日期（UTC+8）
"""
import argparse
import json
import os
import socket
import sqlite3
import sys
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

# ---------- 配置 ----------
DB_PATH = os.path.expandvars(
    r"%APPDATA%\com.pristimer.app\pristimer.db"
) if os.name == "nt" else os.path.expanduser(
    "~/Library/Application Support/com.pristimer.app/pristimer.db"
)

API_BASE = os.environ.get("KAKUKI_API", "https://kakuki.top")

# 令牌来源：环境变量优先，其次脚本同目录的 .sync-token（免每次设置环境变量）
TOKEN_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".sync-token")


def load_token() -> str:
    tok = os.environ.get("KAKUKI_SYNC_TOKEN", "").strip()
    if tok:
        return tok
    try:
        with open(TOKEN_FILE, "r", encoding="utf-8") as f:
            return f.read().strip()
    except OSError:
        return ""


SYNC_TOKEN = load_token()

CST = timezone(timedelta(hours=8))
MIN_SESSION_MS = 10_000  # 单段 <10s 视为噪声（PrisTimer 侧本就不落库）


def read_sessions(db_path: str, since_ms: int | None):
    """只读方式打开库并取会话。用 URI mode=ro，绝不写回本机库。"""
    if not os.path.exists(db_path):
        sys.exit(f"[错误] 找不到 PrisTimer 数据库：{db_path}")

    con = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    try:
        cur = con.cursor()
        sql = (
            "SELECT started_at, elapsed_ms, tag, kind FROM session "
            "WHERE state = 'finished'"
        )
        if since_ms is not None:
            sql += " AND started_at >= ?"
            cur.execute(sql + " ORDER BY started_at", (since_ms,))
        else:
            cur.execute(sql + " ORDER BY started_at")
        return cur.fetchall()
    finally:
        con.close()


def aggregate(rows):
    """按本地日期（UTC+8）聚合：总毫秒 / 会话数 / 标签集合。"""
    by_day: dict[str, dict] = {}
    for started_at, elapsed_ms, tag, _kind in rows:
        if not started_at:
            continue
        ms = int(elapsed_ms or 0)
        if ms < MIN_SESSION_MS:
            continue
        day = datetime.fromtimestamp(started_at / 1000, CST).strftime("%Y-%m-%d")
        slot = by_day.setdefault(day, {"total_ms": 0, "session_cnt": 0, "tags": set()})
        slot["total_ms"] += ms
        slot["session_cnt"] += 1
        if tag:
            slot["tags"].add(tag)

    days = []
    for day in sorted(by_day):
        slot = by_day[day]
        days.append(
            {
                "date": day,
                "total_ms": slot["total_ms"],
                "session_cnt": slot["session_cnt"],
                "tags": sorted(slot["tags"]),
            }
        )
    return days


def upload(days):
    url = f"{API_BASE.rstrip('/')}/api/v1/focus/sync/"
    payload = json.dumps({"days": days}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "X-Sync-Token": SYNC_TOKEN,
            "User-Agent": "kakuki-pristimer-sync/1.0",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")
    except (urllib.error.URLError, socket.timeout) as e:
        return 0, f"网络错误：{e}"


def main():
    ap = argparse.ArgumentParser(description="同步 PrisTimer 专注时长到 kakuki.top")
    ap.add_argument("--days", type=int, default=0, help="只同步最近 N 天（0=全部）")
    ap.add_argument("--dry-run", action="store_true", help="只打印，不上报")
    ap.add_argument("--db", default=DB_PATH, help="PrisTimer 数据库路径")
    ap.add_argument("--set-token", metavar="TOKEN",
                    help="把上报令牌写入 scripts/.sync-token，之后无需再设环境变量")
    args = ap.parse_args()

    if args.set_token:
        with open(TOKEN_FILE, "w", encoding="utf-8") as f:
            f.write(args.set_token.strip())
        print(f"[完成] 令牌已写入 {TOKEN_FILE}")
        return

    since_ms = None
    if args.days > 0:
        cutoff = datetime.now(CST) - timedelta(days=args.days)
        since_ms = int(cutoff.timestamp() * 1000)

    rows = read_sessions(args.db, since_ms)
    days = aggregate(rows)

    if not days:
        print("[提示] 没有可同步的专注记录。")
        return

    total_min = sum(d["total_ms"] for d in days) / 60000
    print(f"[读取] {len(rows)} 条会话 → {len(days)} 天，合计 {total_min:.1f} 分钟")
    for d in days[-7:]:
        print(
            f"  {d['date']}  {d['total_ms'] / 60000:6.1f} 分钟  "
            f"{d['session_cnt']:>2} 段  {','.join(d['tags']) or '-'}"
        )
    if len(days) > 7:
        print(f"  ...（更早 {len(days) - 7} 天略）")

    if args.dry_run:
        print("\n[dry-run] 未上报。")
        return

    if not SYNC_TOKEN:
        sys.exit("\n[错误] 未设置 KAKUKI_SYNC_TOKEN 环境变量，无法上报。")

    status, text = upload(days)
    if status == 200:
        print(f"\n[成功] 已同步 {len(days)} 天数据 → {API_BASE}")
    else:
        sys.exit(f"\n[失败] HTTP {status}：{text[:300]}")


if __name__ == "__main__":
    main()
