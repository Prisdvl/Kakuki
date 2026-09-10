import { useEffect, useState } from "react";
import { Row, Col, Progress } from "antd";
import { GithubOutlined, MailOutlined, CodeOutlined } from "@ant-design/icons";
import { BookOpen, FolderTree, MessageSquare, Eye, Flame, Trophy, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { getSiteStats } from "../../api/article";
import leetcodeApi from "../../api/leetcode";
import useCountUp from "../../hooks/useCountUp";

const LEETCODE_USERNAME = 'Likey-e';

function StatItem({ icon: Icon, value, label }) {
  const animated = useCountUp(value);
  return (
    <div className="about-stat">
      <Icon size={15} style={{ color: "var(--accent)" }} />
      <div className="about-stat-value">{animated}</div>
      <div className="about-stat-label">{label}</div>
    </div>
  );
}

const TECH_STACK = [
  { name: "React 18", desc: "前端框架" },
  { name: "Vite 5", desc: "构建工具" },
  { name: "Ant Design", desc: "组件库" },
  { name: "Tailwind CSS", desc: "原子化样式" },
  { name: "Zustand", desc: "状态管理" },
  { name: "Django 4.2", desc: "后端框架" },
  { name: "DRF", desc: "REST API" },
  { name: "MySQL / SQLite", desc: "数据库" },
  { name: "SimpleJWT", desc: "认证" },
  { name: "Swagger", desc: "API 文档" },
];

export default function AboutPage() {
  const [stats, setStats] = useState(null);
  const [lcData, setLcData] = useState(null);

  useEffect(() => {
    getSiteStats()
      .then((res) => setStats(res?.data ?? res ?? null))
      .catch(() => setStats(null));
    leetcodeApi.getAllData(LEETCODE_USERNAME)
      .then((res) => setLcData(res))
      .catch(() => setLcData(null));
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
  const lcRanking = matchedUser?.profile?.ranking || 0;
  const lcStreak = lcData?.streak || 0;
  const lcTotalActive = lcData?.totalActiveDays || 0;

  return (
    <Row gutter={24} className="pt-8">
      <Col xs={24} lg={16}>
        <div className="glass page-enter" style={{ borderRadius: 20, padding: "2rem 2.5rem" }}>
          <div className="text-center mb-6">
            <div style={{
              width: 120, height: 120, borderRadius: "50%",
              margin: "0 auto 1.5rem",
              overflow: "hidden",
              border: "3px solid var(--accent)",
              boxShadow: "0 8px 32px var(--accent-glow)",
            }}>
              <img
                src="/avatar.jpg"
                alt="Prisdvl"
                style={{
                  width: "100%", height: "100%", objectFit: "cover",
                  display: "block",
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling.style.display = 'flex';
                }}
              />
              <div style={{
                display: "none",
                width: "100%", height: "100%",
                background: "linear-gradient(135deg, var(--accent), var(--accent-secondary))",
                alignItems: "center", justifyContent: "center",
                fontSize: "3rem", color: "var(--on-accent)", fontWeight: 700,
              }}>P</div>
            </div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>Prisdvl</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-tertiary)", marginTop: "0.25rem" }}>
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

          <div style={{ color: "var(--text-secondary)", lineHeight: 1.8, fontSize: "0.95rem" }}>
            <p style={{ marginBottom: "1rem" }}>欢迎来到 Kakuki！这是我的个人博客，在这里我会分享技术心得、生活感悟和各种有趣的内容。</p>
            <p style={{ marginBottom: "1rem" }}>我是一名全栈开发者，热爱编程、阅读和创作。这个博客使用 Django + React 构建，采用现代化的前后端分离架构。</p>
            <p style={{ marginBottom: "1rem" }}>如果你有任何问题或建议，欢迎通过以下方式联系我：</p>
            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginTop: "1.5rem" }}>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer"
                style={{ color: "var(--accent)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <GithubOutlined /> github.com/kakuki
              </a>
              <a href="mailto:kakuki@example.com"
                style={{ color: "var(--accent)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <MailOutlined /> kakuki@example.com
              </a>
            </div>
          </div>
        </div>
      </Col>
      <Col xs={0} lg={8}>
        {/* LeetCode 刷题进度 */}
        {matchedUser && (
          <div className="glass page-enter" style={{ borderRadius: 20, padding: "1.5rem", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h4 style={{ fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <CodeOutlined style={{ color: "var(--accent)" }} /> LeetCode
              </h4>
              <a href={`https://leetcode.cn/u/${LEETCODE_USERNAME}/`} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.8rem", color: "var(--text-tertiary)" }}>
                主页
              </a>
            </div>

            <div style={{ textAlign: "center", marginBottom: "1rem" }}>
              <div style={{ position: "relative", width: 110, height: 110, margin: "0 auto 0.5rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Progress type="circle" showInfo={false} percent={lcTotalAll > 0 ? Math.round((lcSolved / lcTotalAll) * 100) : 0} size={110} strokeColor={{ '0%': '#ffb700', '100%': '#00b8a3' }} />
                <div style={{ position: "absolute", textAlign: "center" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>{lcSolved}</div>
                  <div style={{ fontSize: "0.65rem", color: "var(--text-tertiary)" }}>已解答</div>
                </div>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>共 {lcTotalAll} 题</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {[
                { label: "简单", solved: lcEasy, total: lcTotalEasy, color: "#00b8a3" },
                { label: "中等", solved: lcMedium, total: lcTotalMedium, color: "#ffb700" },
                { label: "困难", solved: lcHard, total: lcTotalHard, color: "#ff375f" },
              ].map((d) => {
                const pct = d.total > 0 ? Math.round((d.solved / d.total) * 100) : 0;
                return (
                  <div key={d.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem", fontSize: "0.75rem" }}>
                      <span style={{ color: "var(--text-secondary)" }}>{d.label} {d.solved}/{d.total}</span>
                    </div>
                    <Progress percent={pct} showInfo={false} strokeColor={d.color} size="small" />
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "space-around", marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border)" }}>
              <div style={{ textAlign: "center" }}>
                <Trophy size={14} style={{ color: "var(--accent)" }} />
                <div style={{ fontSize: "0.7rem", color: "var(--text-tertiary)", marginTop: "0.2rem" }}>排名</div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>#{lcRanking.toLocaleString()}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <Zap size={14} style={{ color: "var(--warning)" }} />
                <div style={{ fontSize: "0.7rem", color: "var(--text-tertiary)", marginTop: "0.2rem" }}>连续</div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>{lcStreak} 天</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <Flame size={14} style={{ color: "var(--success)" }} />
                <div style={{ fontSize: "0.7rem", color: "var(--text-tertiary)", marginTop: "0.2rem" }}>活跃</div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>{lcTotalActive} 天</div>
              </div>
            </div>
          </div>
        )}

        <div className="glass reveal" style={{ borderRadius: 20, padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h4 style={{ fontWeight: 600, marginBottom: "1rem", color: "var(--text-primary)" }}>技术栈</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
            {TECH_STACK.map((t) => (
              <div key={t.name} style={{ padding: "0.55rem 0.75rem", borderRadius: 10, background: "var(--bg-tertiary)" }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--accent)" }}>{t.name}</div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-tertiary)" }}>{t.desc}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="glass reveal" style={{ borderRadius: 20, padding: "1.5rem" }}>
          <h4 style={{ fontWeight: 600, marginBottom: "1rem", color: "var(--text-primary)" }}>快速导航</h4>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.75rem", padding: 0 }}>
            <li><Link to="/" style={{ color: "var(--text-secondary)" }}>&larr; 返回首页</Link></li>
            <li><Link to="/archive" style={{ color: "var(--text-secondary)" }}>浏览归档</Link></li>
            <li><Link to="/talks" style={{ color: "var(--text-secondary)" }}>看看杂谈</Link></li>
            <li><Link to="/projects" style={{ color: "var(--text-secondary)" }}>项目展示</Link></li>
          </ul>
        </div>
      </Col>
    </Row>
  );
}
