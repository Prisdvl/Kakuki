import { useEffect, useState } from 'react';
import {
  BarChart3, FolderTree, MessageSquare, Eye, Flame,
} from 'lucide-react';
import { getSiteStats } from '../../api/article';
import { extractList } from '../../api/request';

/**
 * 站点统计汇总卡（首页可添加组件之一）
 * 数据来自现有站点统计接口 /api/v1/stats/，零新依赖。
 */
function useSiteStats() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    getSiteStats()
      .then((res) => setStats(res?.data ?? res ?? null))
      .catch(() => setStats(null));
  }, []);
  return stats;
}

export default function SiteStatsCard() {
  const stats = useSiteStats();
  const items = [
    { icon: BarChart3, label: '文章', value: stats?.article_count ?? '—' },
    { icon: FolderTree, label: '分类', value: stats?.category_count ?? '—' },
    { icon: MessageSquare, label: '评论', value: stats?.comment_count ?? '—' },
    { icon: Eye, label: '总阅读', value: stats?.total_views ?? '—' },
    { icon: Flame, label: '运行天数', value: stats?.running_days ?? '—' },
  ];

  return (
    <div className="ui-card ui-pad ui-flex-col ui-h-full">
      <div className="ui-card-head">
        <h3 className="ui-card-title">
          <BarChart3 size={18} /> 站点统计
        </h3>
      </div>
      {!stats ? (
        <div className="ui-empty ui-empty-inline ui-flex-1">
          <span className="ui-empty-text">加载统计中…</span>
        </div>
      ) : (
        <div className="site-stats-grid ui-flex-1">
          {items.map((s) => (
            <div key={s.label} className="ui-stat">
              <s.icon size={14} className="about-stat-icon" />
              <div className="ui-stat-value">{s.value}</div>
              <div className="ui-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}