import { useEffect, useState } from "react";
import { Row, Col, Progress } from "antd";
import { GithubOutlined, CodeOutlined } from "@ant-design/icons";
import { BookOpen, FolderTree, MessageSquare, Eye, Flame, Trophy, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { getSiteStats } from "../../api/article";
import checkinApi from "../../api/checkin";
import leetcodeApi from "../../api/leetcode";
import useCountUp from "../../hooks/useCountUp";

const LEETCODE_USERNAME = 'Likey-e';

function StatItem({ icon: Icon, value, label }) {
  const animated = useCountUp(value);
  return (
    <div className="about-stat ui-stat">
      <Icon size={15} className="about-stat-icon" />
      <div className="about-stat-value ui-stat-value">{animated}</div>
      <div className="about-stat-label ui-stat-label">{label}</div>
    </div>
  );
}

const TECH_STACK = [
  { name: "React 18", desc: "前端框架" },
  { name: "Vite 5", desc: "构建工具" },
  { name: "Ant Design", desc: "组件库" },
  { name: "Tailwind CSS", desc: "原子化样式" },
  { name: "Zustand", desc: "状态管理" },
  { name: "Hono", desc: "边缘后端" },
  { name: "Cloudflare Workers", desc: "站点部署" },
  { name: "D1 / KV", desc: "数据库与存储" },
  { name: "Web Audio API", desc: "频谱分析" },
  { name: "Playwright", desc: "实机验证" },
];

export default function AboutPage() {
  const [stats, setStats] = useState(null);
  const [lcData, setLcData] = useState(null);
  const [checkin, setCheckin] = useState(null);

  useEffect(() => {
    getSiteStats()
      .then((res) => setStats(res?.data ?? res ?? null))
      .catch(() => setStats(null));
    leetcodeApi.getAllData(LEETCODE_USERNAME)
      .then((res) => setLcData(res))
      .catch(() => setLcData(null));
    // 打卡数据走自建接口（与首页打卡卡同源），
    // 不再读 LeetCode 代理的 streak / totalActiveDays —— 该接口没有这两个字段，恒为 0。
    checkinApi.summary(365)
      .then((res) => setCheckin(res?.data ?? res ?? null))
      .catch(() => setCheckin(null));
  }, []);

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
  const lcMaxStreak = checkin?.max_streak ?? 0;
  const lcActiveDays = checkin?.total_days ?? 0;
  const lcTotalCount = checkin?.total_count ?? 0;

  return (
    <Row gutter={24} className="pt-8 about-page">
      <Col xs={24} lg={16}>
        <div className="ui-card ui-pad-lg about-main-card page-enter">
          <div className="text-center mb-6">
            <div className="about-avatar">
              <img
                src="/avatar.jpg"
                alt="Prisdvl"
                className="about-avatar-img"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling.style.display = 'flex';
                }}
              />
              <div className="about-avatar-fallback">P</div>
            </div>
            <h2 className="about-name">Prisdvl</h2>
            <p className="about-tagline">
              全栈开发者 · 热爱代码与创造
            </p>
          </div>

          {/* 真实站点统计 */}
          {stats && (
            <div className="about-stats-grid">
              <StatItem icon={BookOpen} value={stats.article_count} label="文章" />
              <StatItem icon={FolderTree} value={stats.category_count} label="分类" />
              <StatItem icon={MessageSquare} value={stats.comment_count} label="评论" />
              <StatItem icon={Eye} value={stats.total_views} label="总阅读" />
              <StatItem icon={Flame} value={stats.running_days} label="运行天数" />
            </div>
          )}

          <div className="about-bio">
            <p>欢迎来到 Kakuki！这是我的个人网站，在这里我会分享技术心得、生活感悟和各种有趣的内容。</p>
            <p>我是一名全栈开发者，热爱编程、阅读和创作。这个站点使用 React 18 + Vite + Hono 构建，部署在 Cloudflare Workers（D1 + KV），包含在线音乐播放器、LeetCode 追踪与仪表盘工具。</p>
            <p>如果你有任何问题或建议，欢迎通过以下方式联系我：</p>
            <div className="about-contact">
              <a href="https://github.com/Prisdvl" target="_blank" rel="noopener noreferrer"
                className="ui-btn ui-btn-primary ui-btn-sm">
                <GithubOutlined /> github.com/Prisdvl
              </a>
            </div>
          </div>
        </div>
      </Col>
      <Col xs={0} lg={8}>
        {/* LeetCode 刷题进度 */}
        {matchedUser && (
          <div className="ui-card ui-pad about-side-card page-enter">
            <div className="ui-card-head">
              <h4 className="ui-card-title">
                <CodeOutlined /> LeetCode
              </h4>
              <a href={`https://leetcode.cn/u/${LEETCODE_USERNAME}/`} target="_blank" rel="noopener noreferrer" className="ui-card-link ui-card-sub">
                主页
              </a>
            </div>

            <div className="about-lc-center">
              <div className="about-lc-ring">
                <Progress type="circle" showInfo={false} percent={lcTotalAll > 0 ? Math.round((lcSolved / lcTotalAll) * 100) : 0} size={110} strokeColor={{ '0%': 'var(--leetcode-medium)', '100%': 'var(--leetcode-easy)' }} />
                <div className="about-lc-center-text">
                  <div className="about-lc-solved">{lcSolved}</div>
                  <div className="about-lc-solved-label">已解答</div>
                </div>
              </div>
              <div className="about-lc-total">共 {lcTotalAll} 题</div>
            </div>

            <div className="about-lc-diffs">
              {[
                { label: "简单", solved: lcEasy, total: lcTotalEasy, color: 'var(--leetcode-easy)' },
                { label: "中等", solved: lcMedium, total: lcTotalMedium, color: 'var(--leetcode-medium)' },
                { label: "困难", solved: lcHard, total: lcTotalHard, color: 'var(--leetcode-hard)' },
              ].map((d) => {
                const pct = d.total > 0 ? Math.round((d.solved / d.total) * 100) : 0;
                return (
                  <div key={d.label}>
                    <div className="about-lc-diff-row">
                      <span className="about-lc-diff-label">{d.label} {d.solved}/{d.total}</span>
                    </div>
                    <Progress percent={pct} showInfo={false} strokeColor={d.color} size="small" />
                  </div>
                );
              })}
            </div>

            <div className="about-lc-foot">
              <div className="about-lc-foot-item">
                <Trophy size={14} className="about-lc-foot-icon" />
                <div className="about-lc-foot-label">最长连续</div>
                <div className="about-lc-foot-value">{lcMaxStreak} 天</div>
              </div>
              <div className="about-lc-foot-item">
                <Flame size={14} className="about-lc-foot-icon about-lc-foot-icon-success" />
                <div className="about-lc-foot-label">打卡天数</div>
                <div className="about-lc-foot-value">{lcActiveDays} 天</div>
              </div>
              <div className="about-lc-foot-item">
                <Zap size={14} className="about-lc-foot-icon about-lc-foot-icon-warning" />
                <div className="about-lc-foot-label">累计题数</div>
                <div className="about-lc-foot-value">{lcTotalCount} 题</div>
              </div>
            </div>
          </div>
        )}

        <div className="ui-card ui-pad about-side-card">
          <h4 className="ui-card-title about-side-title">技术栈</h4>
          <div className="about-tech-grid">
            {TECH_STACK.map((t) => (
              <div key={t.name} className="about-tech-tile">
                {/* bg-tertiary 叠玻璃底偏暗，accent/tertiary 字都不达标，用 primary/secondary */}
                <div className="about-tech-name">{t.name}</div>
                <div className="about-tech-desc">{t.desc}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="ui-card ui-pad about-side-card">
          <h4 className="ui-card-title about-side-title">快速导航</h4>
          <ul className="about-nav-list">
            <li><Link to="/" className="ui-card-link">&larr; 返回首页</Link></li>
            <li><Link to="/archive" className="ui-card-link">浏览归档</Link></li>
            <li><Link to="/talks" className="ui-card-link">看看杂谈</Link></li>
            <li><Link to="/projects" className="ui-card-link">项目展示</Link></li>
          </ul>
        </div>
      </Col>
    </Row>
  );
}
