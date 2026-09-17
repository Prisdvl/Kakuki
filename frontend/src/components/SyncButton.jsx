import { useEffect, useState } from 'react';
import { RefreshCw, Check, AlertTriangle } from 'lucide-react';
import { message, Modal } from 'antd';
import { probeLocalHelper, triggerLocalSync, isLocalHost } from '../utils/syncHelper';

const LAST_SYNC_KEY = 'kakuki-focus-last-sync';

/**
 * 手动同步按钮（PrisTimer 专注时长）
 *
 * 机制（2026-09 同步重构）：静态/定时脚本已废弃。同步仅在你**本机打开**站点时可用：
 *  点击 → 探测本机助手（local-sync/helper.py @ 127.0.0.1:8787）→ 把登录态 JWT 交给
 *  助手 → 助手读 PrisTimer 按日聚合上传 /api/v1/focus/sync/。
 *
 * 状态反馈：
 *  - 线上站点点击 → 引导弹窗（说明为什么需要本机 + 运行步骤）
 *  - 本机但助手未运行 → 引导弹窗（运行命令 + 一键重新检测）
 *  - 同步中 → 按钮旋转
 *  - 成功 → message 明细 + 按钮短暂「✓」+ 记录上次同步时间 + 派发 kakuki:focus-updated
 *  - 失败 → message 具体原因
 */
export default function SyncButton({ variant = 'card' }) {
  const [helper, setHelper] = useState('unknown'); // unknown | online | offline
  const [syncing, setSyncing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [fresh, setFresh] = useState(true); // 刚挂载探测未完成前不允许点击
  const [lastSync, setLastSync] = useState(() => {
    try { return localStorage.getItem(LAST_SYNC_KEY) || ''; } catch { return ''; }
  });

  const local = isLocalHost();

  const probe = async () => {
    setFresh(true);
    const info = await probeLocalHelper();
    setHelper(info ? 'online' : 'offline');
    setFresh(false);
    return info ? 'online' : 'offline';
  };

  useEffect(() => {
    if (!local) {
      setHelper('offline');
      setFresh(false);
      return;
    }
    probe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  const handleClick = async () => {
    if (syncing) return;
    if (!local) {
      setShowGuide(true);
      return;
    }
    if (fresh) return;

    if (helper === 'offline') {
      // 先重新探测一次（用户可能刚启动助手）
      const state = await probe();
      if (state === 'offline') {
        setShowGuide(true);
        return;
      }
    }

    setSyncing(true);
    try {
      const data = await triggerLocalSync();
      const now = (() => {
        try { return new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'); } catch { return ''; }
      })();
      try { localStorage.setItem(LAST_SYNC_KEY, now); } catch { /* ignore */ }
      setLastSync(now);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 1400);
      if (data.synced_days > 0) {
        message.success(`同步完成：${data.synced_days} 天 / ${data.total_minutes} 分钟 / ${data.sessions} 段`);
      } else {
        message.success('同步完成：没有新的专注记录');
      }
      window.dispatchEvent(new CustomEvent('kakuki:focus-updated'));
    } catch (err) {
      message.error(err?.message || '同步失败，请确认本机助手正在运行');
    } finally {
      setSyncing(false);
    }
  };

  const isNav = variant === 'nav';

  if (isNav) {
    return (
      <>
        <button
          onClick={handleClick}
          disabled={syncing}
          className={`theme-toggle sync-nav-btn ${success ? 'sync-done' : ''}`}
          aria-label="同步专注时长"
          title={lastSync ? `同步专注时长（上次：${lastSync}）` : '同步专注时长'}
        >
          {syncing ? <RefreshCw size={16} className="spin" /> : success ? <Check size={16} /> : <RefreshCw size={16} />}
        </button>
        {showGuide && (
          <SyncGuide
            running={helper === 'online'}
            onClose={() => setShowGuide(false)}
            onRetry={async () => {
              const s = await probe();
              if (s === 'online') { setShowGuide(false); handleClick(); }
            }}
          />
        )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={syncing}
        className={`ui-btn ui-btn-outline ui-btn-sm sync-btn ${success ? 'sync-done' : ''}`}
        title={lastSync ? `上次同步：${lastSync}` : '将本机 PrisTimer 专注时长上传到站点'}
      >
        {syncing ? <RefreshCw size={13} className="spin" /> : success ? <Check size={13} /> : local ? <RefreshCw size={13} /> : <AlertTriangle size={13} />}
        {success ? '已同步' : '同步'}
        {lastSync && !syncing && <span className="sync-btn-last">· {lastSync}</span>}
      </button>
      {showGuide && (
        <SyncGuide
          running={helper === 'online'}
          onClose={() => setShowGuide(false)}
          onRetry={async () => {
            const s = await probe();
            if (s === 'online') { setShowGuide(false); handleClick(); }
          }}
        />
      )}
    </>
  );
}

/** 引导弹窗：解释为何需要本机 + 运行方式 + 重新检测 */
function SyncGuide({ running, onClose, onRetry }) {
  return (
    <Modal
      open
      onCancel={onClose}
      footer={null}
      width={420}
      title="同步专注时长"
      centered
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', paddingTop: '0.25rem' }}>
        {running ? (
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            PrisTimer 数据只存在于你本机的数据库里，网页本身读不到。
            请在本机打开站点后点击同步。
          </p>
        ) : (
          <>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              PrisTimer 数据只存在于你本机的数据库里。需要先在本机运行同步助手：
            </p>
            <pre style={{
              background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
              borderRadius: '10px', padding: '0.6rem 0.8rem', fontSize: '0.8rem',
              fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', overflow: 'auto',
            }}>
              python local-sync/helper.py
            </pre>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
              然后在本机（localhost）打开本站并登录，再点「同步」即可。
            </p>
          </>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
          <button className="ui-btn ui-btn-sm" onClick={onClose}>关闭</button>
          {!running && (
            <button className="ui-btn ui-btn-sm ui-btn-outline" onClick={onRetry}>
              <RefreshCw size={13} /> 重新检测
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}