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
import leetcodeApi from "../../api/leetcode";

const LEETCODE_USERNAME = 'Likey-e';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [hot, setHot] = useState([]);
  const [lcData, setLcData] = useState(null);
  const [lcLoading, setLcLoading] = useState(true);

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
  const lcRanking = matchedUser?.profile?.ranking || 0;
  const lcStreak = lcData?.streak || 0;

  const lcBar = (solved, total, color) => {
    const pct = total > 0 ? Math.round((solved / total) * 100) : 0;
    return (
      <div style={{ marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem', fontSize: '0.8rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>{solved} / {total}</span>
          <span style={{ color, fontWeight: 600 }}>{pct}%</span>
        </div>
        <Progress percent={pct} showInfo={false} strokeColor={color} size="small" />
      </div>
    );
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">控制台</h2>

      {/* 统计卡片网格 */}
      <Row gutter={[16, 16]}>
        {items.map((it) => (
          <Col xs={12} lg={6} xl={4} key={it.title}>
            <Card className="hover:shadow-lg transition-shadow" bodyStyle={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${it.color}15`, color: it.color, fontSize: '1.1rem',
                }}>
                  {it.icon}
                </div>
                <div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                    {it.value ?? 0}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>{it.title}</div>
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
                    strokeColor={{ '0%': '#ffb700', '100%': '#00b8a3' }}
                  />
                  <div style={{ position: 'absolute', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)' }}>{lcSolved}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>已解答</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>共 {lcTotalAll} 题</div>
              </div>
            </Col>

            {/* 难度分布 */}
            <Col xs={24} md={10}>
              <h4 style={{ marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>难度分布</h4>
              {lcBar(lcEasy, lcTotalEasy, '#00b8a3')}
              {lcBar(lcMedium, lcTotalMedium, '#ffb700')}
              {lcBar(lcHard, lcTotalHard, '#ff375f')}
            </Col>

            {/* 关键指标 */}
            <Col xs={24} md={6}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrophyOutlined style={{ color: 'var(--accent)', fontSize: '1.1rem' }} />
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>全球排名</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>#{lcRanking.toLocaleString()}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FireOutlined style={{ color: 'var(--warning)', fontSize: '1.1rem' }} />
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>连续刷题</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{lcStreak} 天</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircleOutlined style={{ color: 'var(--success)', fontSize: '1.1rem' }} />
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>总通过</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{lcSolved} 题</div>
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
              <p style={{ color: 'var(--text-tertiary)', margin: 0 }}>还没有文章，去发布第一篇吧</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {recent.map((a) => (
                  <li key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '0.4rem 0', borderBottom: '1px solid var(--border)' }}>
                    <Link to={`/article/${a.id}`} style={{ color: 'var(--text-primary)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.title}
                    </Link>
                    <span style={{ flexShrink: 0, fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
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
              <p style={{ color: 'var(--text-tertiary)', margin: 0 }}>暂无数据</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {hot.map((a, i) => (
                  <li key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '0.4rem 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                      <span style={{
                        flexShrink: 0, width: 22, height: 22, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.72rem', fontWeight: 700,
                        background: i < 3 ? 'var(--accent)' : 'var(--bg-tertiary)',
                        color: i < 3 ? '#fff' : 'var(--text-tertiary)',
                      }}>{i + 1}</span>
                      <Link to={`/article/${a.id}`} style={{ color: 'var(--text-primary)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.title}
                      </Link>
                    </div>
                    <span style={{ flexShrink: 0, fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
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
