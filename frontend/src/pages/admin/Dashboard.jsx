import { useState, useEffect } from "react";
import { Card, Row, Col, Statistic, Progress, Tag, Empty, Spin } from "antd";
import {
  FileTextOutlined, FolderOutlined, MessageOutlined,
  EyeOutlined, ThunderboltOutlined, HeartOutlined, TeamOutlined,
  CodeOutlined, FireOutlined, TrophyOutlined, CheckCircleOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";
import { getSiteStats, getArticles } from "../../api/article";
import { extractList } from "../../api/request";
import checkinApi from "../../api/checkin";
import leetcodeApi from "../../api/leetcode";

const LEETCODE_USERNAME = 'Likey-e';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [hot, setHot] = useState([]);
  const [lcData, setLcData] = useState(null);
  const [lcLoading, setLcLoading] = useState(true);
  const [checkin, setCheckin] = useState(null);

  useEffect(() => {
    getSiteStats()
      .then((res) => setStats(res?.data ?? res ?? null))
      .catch(() => setStats(null));
    getArticles({ page_size: 5, ordering: '-created_at' })
      .then((res) => setRecent(extractList(res)))
      .catch(() => setRecent([]));
    getArticles({ page_size: 5, ordering: '-views' })
      .then((res) => setHot(extractList(res)))
      .catch(() => setHot([]));
    leetcodeApi.getAllData(LEETCODE_USERNAME)
      .then((res) => { setLcData(res); setLcLoading(false); })
      .catch(() => { setLcData(null); setLcLoading(false); });
    checkinApi.summary(365)
      .then((res) => setCheckin(res?.data ?? res ?? null))
      .catch(() => setCheckin(null));
  }, []);

  const items = [
    { title: "文章总数", value: stats?.article_count, icon: <FileTextOutlined />, color: "var(--accent)" },
    { title: "分类数量", value: stats?.category_count, icon: <FolderOutlined />, color: "#8884d8" },
    { title: "评论数量", value: stats?.comment_count, icon: <MessageOutlined />, color: "#ffc658" },
    { title: "总阅读量", value: stats?.total_views, icon: <EyeOutlined />, color: "#ff7300" },
    { title: "运行天数", value: stats?.running_days, icon: <ThunderboltOutlined />, color: "#413ca0" },
    { title: "文章点赞", value: stats?.article_like_count, icon: <HeartOutlined />, color: "#eb2f96" },
    { title: "杂谈数量", value: stats?.talk_count, icon: <MessageOutlined />, color: "#00b8a3" },
    { title: "项目数量", value: stats?.project_count, icon: <CodeOutlined />, color: "#2dd4bf" },
    { title: "用户数量", value: stats?.user_count, icon: <TeamOutlined />, color: "#8b5cf6" },
  ];

  // LeetCode 数据解析
  const matchedUser = lcData?.profile?.matchedUser;
  const allQuestions = lcData?.profile?.allQuestionsCount || [];
  const acNums = matchedUser?.submitStatsGlobal?.acSubmissionNum || [];
  const lcSolved = acNums.find((s) => s.difficulty === 'All')?.count || 0;
  const lcEasy = acNums.find((s) => s.difficulty === 'Easy')?.count || 0;
  const lcMedium = acNums.find((s) => s.difficulty === 'Medium')?.count || 0;
  const lcHard = acNums.find((s) => s.difficulty === 'Hard')?.count || 0;
  const lcTotalAll = allQuestions.find((s) => s.difficulty === 'All')?.count || 3400;
  const lcTotalEasy = allQuestions.find((s) => s.difficulty === 'Easy')?.count || 850;
  const lcTotalMedium = allQuestions.find((s) => s.difficulty === 'Medium')?.count || 1750;
  const lcTotalHard = allQuestions.find((s) => s.difficulty === 'Hard')?.count || 800;
  // 打卡数据走自建接口：LeetCode 代理没有 streak / totalActiveDays 字段，
  // ranking 也恒为 0，展示 "#0 排名" 属于假数据，故改用本地打卡统计。
  const lcMaxStreak = checkin?.max_streak ?? 0;
  const lcActiveDays = checkin?.total_days ?? 0;

  const lcBar = (solved, total, color) => {
    const pct = total > 0 ? Math.round((solved / total) * 100) : 0;
    return (
      <div className="admin-lc-bar">
        <div className="admin-lc-bar-row">
          <span style={{ color: 'var(--text-secondary)' }}>{solved} / {total}</span>
          <span style={{ color, fontWeight: 600 }}>{pct}%</span>
        </div>
        {/* Progress(type="line") 把 strokeColor 写进 SVG stroke 属性，var() 在那里不生效，
            必须给字面色值；圆环型走 CSS background，才能用 var(--leetcode-*)。 */}
        <Progress percent={pct} showInfo={false} strokeColor={color} size="small" />
      </div>
    );
  };

  return (
    <div className="admin-page">
      <h2 className="admin-page-title">控制台</h2>

      {/* 统计卡片网格 */}
      <Row gutter={[16, 16]}>
        {items.map((it) => (
          <Col xs={12} lg={6} xl={4} key={it.title}>
            <Card className="hover:shadow-lg transition-shadow admin-stat-card" bodyStyle={{ padding: '1.25rem' }}>
              <div className="flex items-center" style={{ gap: '0.75rem' }}>
                <div className="admin-stat-icon" style={{ color: it.color, background: `${it.color}15` }}>
                  {it.icon}
                </div>
                <div>
                  <div className="admin-stat-value" style={{ color: 'var(--text-primary)' }}>
                    {it.value ?? 0}
                  </div>
                  <div className="admin-stat-label">{it.title}</div>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* LeetCode 刷题概览 */}
      <Card
        title={<span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CodeOutlined style={{ color: 'var(--accent)' }} /> LeetCode 刷题概览</span>}
        extra={
          <a href={`https://leetcode.cn/u/${LEETCODE_USERNAME}/`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem' }}>
            查看主页
          </a>
        }
        className="mt-6"
      >
        {lcLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}><Spin tip="加载 LeetCode 数据..." /></div>
        ) : matchedUser ? (
          <Row gutter={[24, 16]}>
            {/* 总进度 */}
            <Col xs={24} md={8}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: 120, height: 120, margin: '0 auto 0.5rem',
                  position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Progress
                    type="circle"
                    percent={lcTotalAll > 0 ? Math.round((lcSolved / lcTotalAll) * 100) : 0}
                    size={120}
                    strokeColor={{ '0%': 'var(--leetcode-medium)', '100%': 'var(--leetcode-easy)' }}
                  />
                  <div style={{ position: 'absolute', textAlign: 'center' }}>
                    <div className="admin-lc-solved">{lcSolved}</div>
                    <div className="admin-lc-solved-label">已解答</div>
                  </div>
                </div>
                <div className="admin-lc-total">共 {lcTotalAll} 题</div>
              </div>
            </Col>

            {/* 难度分布 */}
            <Col xs={24} md={10}>
              <h4 className="admin-lc-subtitle">难度分布</h4>
              {/* Progress(type="line") 的 strokeColor 落到 SVG stroke 属性，不能写 var()，
                  这里的字面色值对应 --leetcode-easy/medium/hard 的亮色主题基线 */}
              {lcBar(lcEasy, lcTotalEasy, 'var(--leetcode-easy-hex)')}
              {lcBar(lcMedium, lcTotalMedium, 'var(--leetcode-medium-hex)')}
              {lcBar(lcHard, lcTotalHard, 'var(--leetcode-hard-hex)')}
            </Col>

            {/* 关键指标 */}
            <Col xs={24} md={6}>
              <div className="admin-lc-metrics">
                <div className="admin-lc-metric">
                  <TrophyOutlined className="admin-lc-metric-icon" style={{ color: 'var(--accent)' }} />
                  <div>
                    <div className="admin-lc-metric-label">最长连续</div>
                    <div className="admin-lc-metric-value">{lcMaxStreak} 天</div>
                  </div>
                </div>
                <div className="admin-lc-metric">
                  <FireOutlined className="admin-lc-metric-icon" style={{ color: 'var(--warning)' }} />
                  <div>
                    <div className="admin-lc-metric-label">打卡天数</div>
                    <div className="admin-lc-metric-value">{lcActiveDays} 天</div>
                  </div>
                </div>
                <div className="admin-lc-metric">
                  <CheckCircleOutlined className="admin-lc-metric-icon" style={{ color: 'var(--success)' }} />
                  <div>
                    <div className="admin-lc-metric-label">总通过</div>
                    <div className="admin-lc-metric-value">{lcSolved} 题</div>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        ) : (
          <Empty description="暂无 LeetCode 数据" />
        )}
      </Card>

      {/* 最近发布 + 热门文章 */}
      <Row gutter={[16, 16]} className="mt-6">
        <Col xs={24} lg={12}>
          <Card title="最近发布" extra={<Link to="/admin/articles">管理文章</Link>}>
            {recent.length === 0 ? (
              <p className="admin-list-empty">还没有文章，去发布第一篇吧</p>
            ) : (
              <ul className="admin-list">
                {recent.map((a) => (
                  <li key={a.id} className="admin-list-item">
                    <Link to={`/article/${a.id}`} className="admin-list-link">
                      {a.title}
                    </Link>
                    <span className="admin-list-meta">
                      {a.created_at?.slice(0, 10)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="热门文章（按阅读量）" extra={<Tag color="orange"><FireOutlined /> Top 5</Tag>}>
            {hot.length === 0 ? (
              <p className="admin-list-empty">暂无数据</p>
            ) : (
              <ul className="admin-list">
                {hot.map((a, i) => (
                  <li key={a.id} className="admin-list-item">
                    <div className="admin-list-lead">
                      <span className={`admin-rank ${i < 3 ? 'is-top' : ''}`}>{i + 1}</span>
                      <Link to={`/article/${a.id}`} className="admin-list-link">
                        {a.title}
                      </Link>
                    </div>
                    <span className="admin-list-meta">
                      <EyeOutlined /> {a.views}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
