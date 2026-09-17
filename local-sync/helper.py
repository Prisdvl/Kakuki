#!/usr/bin/env python3
"""
Kakuki 手动同步助手（local-sync）

用途：登录 kakuki.top 后，在「学习时长」卡片 / 设置面板点「同步」按钮时，
网页向本机这个助手发请求；助手读取本机 PrisTimer 数据库（只读），把按日聚合
的专注时长通过登录态 JWT 上传到 Kakuki 后端。

设计（2026-09 同步机制重构后）：
  - 无定时任务、无计划任务、无第三方依赖 —— 只有你手动点「同步」时才工作。
  - 只监听 127.0.0.1，网页是 https://kakuki.top 或 http://localhost:* 都连得上。
  - 鉴权复用网页传来的 Bearer access_token（后端校验 is_staff）。

运行：
    python local-sync/helper.py            # 默认 127.0.0.1:8787
    python local-sync/helper.py --port 9000

接口：
    GET  /health   → {ok, pristimer_db, db_exists}
    POST /sync     → {ok, synced_days, total_minutes, sessions, last_sync}
                     （Authorization: Bearer <access_token>）
"""
import argparse
import json
import os
import sqlite3
import sys
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

# ---------- 配置 ----------
API_BASE = os.environ.get("KAKUKI_API", "https://kakuki.top")
DB_PATH = (
    os.path.expandvars(r"%APPDATA%\com.pristimer.app\pristimer.db")
    if os.name == "nt"
    else os.path.expanduser("~/Library/Application Support/com.pristimer.app/pristimer.db")
)
CST = timezone(timedelta(hours=8))
MIN_SESSION_MS = 10_000  # 单段 <10s 视为噪声（PrisTimer 侧本就不落库）


# ---------- PrisTimer 读取（与旧 sync-pristimer.py 同一口径）----------
def read_sessions(db_path: str):
    """只读方式打开库并取已结束会话；URI mode=ro，绝不写回本机库。"""
    rows = []
    con = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    try:
        cur = con.cursor()
        sql = (
            "SELECT started_at, elapsed_ms, tag FROM session "
            "WHERE state = 'finished' ORDER BY started_at"
        )
        rows = cur.execute(sql).fetchall()
    finally:
        con.close()
    return rows


def aggregate(rows):
    """按本地日期（UTC+8）聚合：总毫秒 / 会话数 / 标签集合。"""
    by_day: dict[str, dict] = {}
    for started_at, elapsed_ms, tag in rows:
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


def upload(days, token: str):
    url = f"{API_BASE.rstrip('/')}/api/v1/focus/sync/"
    payload = json.dumps({"days": days}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
            "User-Agent": "kakuki-local-sync/1.1",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")
    except (urllib.error.URLError, OSError) as e:
        return 0, f"网络错误：{e}"


# ---------- HTTP 服务 ----------
class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):  # 安静一点
        pass

    def _send(self, obj, status=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self._send({"ok": True})

    def do_GET(self):
        if self.path.split("?")[0] == "/health":
            self._send({"ok": True, "pristimer_db": DB_PATH, "db_exists": os.path.exists(DB_PATH)})
            return
        self._send({"ok": False, "message": "not found"}, 404)

    def do_POST(self):
        if self.path.split("?")[0] != "/sync":
            self._send({"ok": False, "message": "not found"}, 404)
            return
        # 读取鉴权头
        token = self.headers.get("Authorization", "")
        if not token.startswith("Bearer ") or len(token) < 20:
            self._send({"ok": False, "message": "缺少有效的登录态令牌（请先登录 kakuki.top 再同步）"}, 401)
            return
        token = token[7:]

        if not os.path.exists(DB_PATH):
            self._send({"ok": False, "message": f"找不到 PrisTimer 数据库：{DB_PATH}"}, 404)
            return

        try:
            rows = read_sessions(DB_PATH)
            days = aggregate(rows)
        except Exception as e:  # noqa: BLE001
            self._send({"ok": False, "message": f"读取 PrisTimer 失败：{e}"}, 500)
            return

        if not days:
            self._send({"ok": True, "message": "没有可同步的专注记录", "synced_days": 0,
                        "total_minutes": 0, "sessions": 0, "last_sync": ""})
            return

        status, text = upload(days, token)
        if status != 200:
            self._send({"ok": False, "message": f"上传失败 HTTP {status}：{text[:200]}"}, status)
            return

        try:
            resp = json.loads(text)
        except Exception:  # noqa: BLE001
            resp = {}
        total_min = sum(d["total_ms"] for d in days) / 60000
        self._send({
            "ok": True,
            "message": "同步完成",
            "synced_days": len(days),
            "total_minutes": round(total_min, 1),
            "sessions": sum(d["session_cnt"] for d in days),
            "last_sync": datetime.now(CST).strftime("%Y-%m-%d %H:%M"),
        })


def main():
    ap = argparse.ArgumentParser(description="Kakuki 本机同步助手（PrisTimer → kakuki.top）")
    ap.add_argument("--host", default="127.0.0.1", help="监听地址（默认仅本机）")
    ap.add_argument("--port", type=int, default=8787, help="监听端口（默认 8787）")
    ap.add_argument("--db", default=DB_PATH, help="PrisTimer 数据库路径")
    args = ap.parse_args()
    global DB_PATH
    DB_PATH = args.db

    print(f"[Kakuki 同步助手] 监听 http://{args.host}:{args.port}")
    print(f"  PrisTimer 数据库: {DB_PATH} ({'存在' if os.path.exists(DB_PATH) else '未找到'})")
    print("  在 kakuki.top 的学习时长卡/设置面板点『同步』即触发；Ctrl+C 退出。")
    sys.stdout.flush()
    ThreadingHTTPServer((args.host, args.port), Handler).serve_forever()


if __name__ == "__main__":
    main()