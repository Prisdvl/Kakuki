import { useEffect, useState } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { message } from 'antd';
import { probeLocalHelper, triggerLocalSync, isLocalHost } from '../utils/syncHelper';

const LAST_SYNC_KEY = 'kakuki-focus-last-sync';

/**
 * 手动同步按钮（PrisTimer 专注时长）
 *
 * 机制（2026-09 同步重构）：静态/定时脚本已废弃。同步只在**你自己电脑上
 * 打开站点**时可用：点击 → 探测本机助手（local-sync/helper.py，
 * http://127.0.0.1:8787/health）→ 把登录态 JWT 交给助手 → 助手读 PrisTimer
 * 并按日聚合上传到 /api/v1/focus/sync/。成功后向全局广播
 * 'kakuki:focus-updated'，学习卡/状态栏自动局部刷新；同时记录最近同步时间。
 *
 * 线上（非本机）打开：按钮提示"请在本机打开站点后同步"。
 */
export default function SyncButton({ variant = 'card' }) {
  // helper: 'unknown' | 'online' | 'offline' | 'probing'
  const [helper, setHelper] = useState('unknown');
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(() => {
    try { return localStorage.getItem(LAST_SYNC_KEY) || ''; } catch { return ''; }
  });

  const local = isLocalHost();

  useEffect(() => {
    if (!local) { setHelper('offline'); return; }
    let alive = true;
    probeLocalHelper().then((info) => {
      if (!alive) return;
      setHelper(info ? 'online' : 'offline');
    });
    return () => { alive = false; };
  }, [local]);

  const handleClick = async () => {
    if (syncing) return;
    if (!local) {
      message.info('同步功能仅在你本机打开站点时可用（需要读取本机 PrisTimer 数据）');
      return;
    }
    if (helper === 'offline') {
      message.warning('未检测到本地同步助手，请先运行：python local-sync/helper.py');
      return;
    }
    setSyncing(true);
    try {
      const data = await triggerLocalSync();
      const now = (() => {
        try { return new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'); } catch { return ''; }
      })();
      try { localStorage.setItem(LAST_SYNC_KEY, now); } catch { /* ignore */ }
      setLastSync(now);
      if (data.synced_days > 0) {
        message.success(`同步完成：${data.synced_days} 天 / ${data.total_minutes} 分钟 / ${data.sessions} 段`);
      } else {
        message.success('同步完成：没有新的专注记录');
      }
      // 触发学习卡 / 状态栏局部刷新（既有事件契约）
      window.dispatchEvent(new CustomEvent('kakuki:focus-updated'));
    } catch (err) {
      message.error(err?.message || '同步失败，请确认本机助手正在运行');
    } finally {
      setSyncing(false);
    }
  };

  const isNav = variant === 'nav';

  return (
    <button
      onClick={handleClick}
      disabled={syncing}
      className={isNav ? 'ui-btn ui-btn-ghost ui-btn-sm sync-btn' : 'ui-btn ui-btn-outline ui-btn-sm sync-btn'}
      title={lastSync ? `上次同步：${lastSync}` : '将本机 PrisTimer 专注时长上传到站点'}
    >
      {syncing ? <RefreshCw size={13} className="spin" /> : local ? <RefreshCw size={13} /> : <AlertTriangle size={13} />}
      {isNav ? '同步' : '同步'}
      {lastSync && !isNav && <span className="sync-btn-last" data-testid="sync-last">· {lastSync}</span>}
    </button>
  );
}