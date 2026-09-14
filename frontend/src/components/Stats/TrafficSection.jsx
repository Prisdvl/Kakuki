import { useEffect, useState } from "react";
import {
  Globe, Users, HardDrive, CalendarRange, TrendingUp, RefreshCw,
} from "lucide-react";
import TiltCard from "../TiltCard";
import statsApi from "../../api/stats";

/* ============================================================
 * 站点流量区块 —— 原「数据」页（/stats）已并入仪表盘
 *
 * 数据源：Cloudflare Analytics，经 Worker 代理（5 分钟缓存）
 * 契约：GET /stats/traffic/?days=7
 *
 * 本组件是 .dashboard-grid 的直接子节点集合（Fragment 不产生 DOM），
 * 因此自带 span-3 / span-12 栅格类，与仪表盘其余卡片共用一套排版。
 * ============================================================ */

/** 数字格式化：1.2k / 3.4M / 1.1G */
function fmtNum(n) {
  if (n == null || isNaN(n)) return '0';
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'G';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
  return String(n);
}

function fmtBytes(b) {
  if (b == null || isNaN(b)) return '0 B';
  if (b >= 1024 ** 3) return (b / 1024 ** 3).toFixed(2) + ' GB';
  if (b >= 1024 ** 2) return (b / 1024 ** 2).toFixed(1) + ' MB';
  if (b >= 1024) return (b / 1024).toFixed(1) + ' KB';
  return b + ' B';
}

function fmtDate(iso) {
  if (!iso) return '';
  return iso.slice(5).replace('-', '/'); // yyyy-MM-dd -> MM/dd
}

/** 纯 SVG 柱状图：近 N 天请求量趋势（不引入图表库） */
function TrendChart({ series }) {
  const list = series || [];
  const W = 600;
  const H = 200;
  const padX = 8;
  const padTop = 16;
  const padBottom = 28;
  const max = Math.max(1, ...list.map((d) => d.requests));

  if (list.length === 0) return null;

  const bw = (W - padX * 2) / list.length;
  const barW = Math.max(4, Math.min(36, bw * 0.62));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="stats-chart"
      role="img"
      aria-label="请求量趋势图"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* 顶部峰值刻度 */}
      <text x={padX} y={12} className="stats-chart-axis" fontSize="11">{fmtNum(max)}</text>
      <text x={padX} y={H - padBottom + 16} className="stats-chart-axis" fontSize="11">0</text>

      {list.map((d, i) => {
        const h = (d.requests / max) * (H - padTop - padBottom);
        const x = padX + i * bw + (bw - barW) / 2;
        const y = H - padBottom - h;
        return (
          <g key={d.date}>
            <rect x={x} y={y} width={barW} height={h} rx={Math.min(3, barW / 2)} className="stats-bar">
              <title>{`${d.date}: ${fmtNum(d.requests)} 请求 / ${fmtNum(d.uniques)} 访客`}</title>
            </rect>
            {list.length <= 15 && (
              <text
                x={x + barW / 2}
                y={H - padBottom + 14}
                textAnchor="middle"
                className="stats-chart-axis"
                fontSize="10"
              >
                {fmtDate(d.date)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** 指标卡（外层 TiltCard 提供玻璃底座，这里只负责排版） */
function MetricTile({ icon: Icon, label, value, sub }) {
  return (
    <TiltCard className="span-3">
      <div className="glass mouse-glow reveal stats-metric">
        <span className="stats-metric-icon"><Icon size={16} /></span>
        <div className="stats-metric-body">
          <div className="stats-metric-value">{value}</div>
          <div className="stats-metric-label">{label}</div>
          {sub && <div className="stats-metric-sub">{sub}</div>}
        </div>
      </div>
    </TiltCard>
  );
}

export default function TrafficSection() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    statsApi
      .traffic(days)
      .then((res) => {
        if (!alive) return;
        setData(res?.data ?? res ?? null);
      })
      .catch((e) => {
        if (!alive) return;
        const msg = e?.response?.data?.message || e?.message || '请求失败';
        setError(msg);
        setData(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [days]);

  const series = data?.series ?? [];
  const totals = data?.totals ?? {};
  const isStale = data?.source === 'stale';
  const isEmpty = data?.source === 'empty' || series.length === 0;

  const sourceNote = loading
    ? '正在读取 Cloudflare Analytics…'
    : isStale
      ? 'Cloudflare Analytics · 缓存'
      : data?.source === 'live'
        ? 'Cloudflare Analytics · 实时'
        : 'Cloudflare Analytics';

  return (
    <>
      {/* 区块标题 + 时间范围切换 */}
      <div className="stats-head-row">
        <h2 className="stats-head-title">
          <Globe size={16} /> 站点流量
        </h2>
        <div className="stats-head-side">
          <span className="stats-head-note">{sourceNote}</span>
          <div className="stats-range">
            {[7, 30].map((d) => (
              <button
                key={d}
                type="button"
                className={`stats-range-btn${days === d ? ' active' : ''}`}
                onClick={() => setDays(d)}
              >
                近 {d} 天
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        [0, 1, 2, 3].map((i) => <div key={i} className="stats-skeleton shimmer span-3" />)
      ) : error && !data ? (
        <TiltCard className="span-12">
          <div className="glass mouse-glow reveal stats-empty">
            <RefreshCw size={32} style={{ opacity: 0.35 }} />
            <p>流量数据暂时不可用</p>
            <span className="stats-empty-hint">原因：{error}</span>
          </div>
        </TiltCard>
      ) : (
        <>
          <MetricTile
            icon={Globe}
            label={`近 ${days} 天总请求`}
            value={fmtNum(totals.requests)}
            sub={data?.source === 'live' ? '实时' : '缓存'}
          />
          <MetricTile
            icon={Users}
            label="独立访客"
            value={fmtNum(totals.uniques)}
            sub="按 IP 去重"
          />
          <MetricTile
            icon={HardDrive}
            label="带宽"
            value={fmtBytes(totals.bytes)}
            sub="请求传输字节"
          />
          <MetricTile
            icon={CalendarRange}
            label="统计区间"
            value={
              series.length
                ? `${fmtDate(series[0].date)} ~ ${fmtDate(series[series.length - 1].date)}`
                : '—'
            }
            sub={`${series.length} 天`}
          />

          {isEmpty ? (
            <TiltCard className="span-12">
              <div className="glass mouse-glow reveal stats-empty">
                <TrendingUp size={32} style={{ opacity: 0.35 }} />
                <p>还没有足够的流量数据</p>
              </div>
            </TiltCard>
          ) : (
            <TiltCard className="span-12">
              <div className="glass mouse-glow reveal stats-panel">
                <h3 className="stats-section-title">
                  <TrendingUp size={15} /> 请求量趋势
                </h3>
                <TrendChart series={series} />
              </div>
            </TiltCard>
          )}

          {isStale && (
            <p className="stats-stale span-12">当前显示缓存数据（Cloudflare Analytics 暂时不可达）</p>
          )}
        </>
      )}
    </>
  );
}
