import { useEffect, useState } from 'react';
import { RefreshCw, Check, AlertTriangle } from 'lucide-react';
import { message, Modal } from 'antd';
import { probeLocalHelper, triggerLocalSync, isLocalHost } from '../utils/syncHelper';
import checkinApi from '../api/checkin';

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
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState(null);
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
      const syncData = await triggerLocalSync();
      const now = (() => {
        try { return new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'); } catch { return ''; }
      })();
      try { localStorage.setItem(LAST_SYNC_KEY, now); } catch { /* ignore */ }
      setLastSync(now);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 1400);

      // 强刷所有专注展示（状态栏 / 学习卡 / 仪表盘）
      window.dispatchEvent(new CustomEvent('kakuki:focus-updated'));

      // 拉取最新总览，组装结果面板（可见、可留痕）
      let summary = null;
      try {
        const res = await checkinApi.focusSummary(7);
        summary = res?.data ?? null;
      } catch { /* 拉取失败也不影响结果面板 */ }
      setResult({
        sync: syncData,
        summary,
        time: now,
      });
      setShowResult(true);

      if (syncData.synced_days > 0) {
        message.success(`同步完成：${syncData.synced_days} 天 / ${syncData.total_minutes} 分钟 / ${syncData.sessions} 段`);
      } else {
        message.success('同步完成：没有新的专注记录');
      }
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
        {showResult && result && (
          <SyncResult result={result} onClose={() => setShowResult(false)} />
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
      {showResult && result && (
        <SyncResult result={result} onClose={() => setShowResult(false)} />
      )}
    </>
  );
}

/** 同步结果面板：本次新增 + 当前今日/本周/累计 + 上次同步时间 */
function SyncResult({ result, onClose }) {
  const { sync, summary, time } = result;
  const fmt = (min) => {
    if (min == null || Number.isNaN(min)) return '—';
    if (min < 60) return `${min} 分钟`;
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return m ? `${h} 小时 ${m} 分` : `${h} 小时`;
  };
  const today = summary?.today_minutes ?? (summary?.today_ms != null ? Math.round(summary.today_ms / 60000) : null);
  const week = summary?.week_minutes ?? null;
  const total = summary?.total_minutes ?? null;

  return (
    <Modal
      open
      onCancel={onClose}
      footer={null}
      width={400}
      title="同步结果"
      centered
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.7rem 0.9rem', borderRadius: '12px',
          background: 'color-mix(in srgb, var(--success) 10%, transparent)',
          border: '1px solid color-mix(in srgb, var(--success) 30%, transparent)',
          color: 'var(--success)', fontWeight: 600, fontSize: '0.9rem',
        }}>
          <Check size={16} /> 同步成功
        </div>

        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: '0.35rem' }}>本次同步</div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem',
          }}>
            <Row label="新增天数" value={`${sync?.synced_days ?? 0} 天`} />
            <Row label="专注时长" value={`${sync?.total_minutes ?? 0} 分钟`} />
            <Row label="会话" value={`${sync?.sessions ?? 0} 段`} />
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: '0.35rem' }}>当前总览</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            <Row label="今日" value={fmt(today)} />
            <Row label="本周" value={fmt(week)} />
            <Row label="累计" value={fmt(total)} />
          </div>
        </div>

        <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
          上次同步：{time}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="ui-btn ui-btn-sm ui-btn-primary" onClick={onClose}>知道了</button>
        </div>
      </div>
    </Modal>
  );
}

function Row({ label, value }) {
  return (
    <div style={{
      padding: '0.5rem 0.6rem', borderRadius: '10px',
      background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>{label}</div>
    </div>
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