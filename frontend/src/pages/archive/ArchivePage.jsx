import { useState, useEffect } from "react";
import { Row, Col, Pagination, Empty, Input } from "antd";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { ChevronRight, Search, ArrowLeft, FileSearch, Edit3 } from "lucide-react";
import { getArchives, getArticles } from "../../api/article";
import { extractList } from "../../api/request";
import useUserStore from "../../store/userStore";

const PAGE_SIZE = 10;

export default function ArchivePage() {
  const searchParams = useSearchParams()[0];
  const setSearchParams = useSearchParams()[1];
  const navigate = useNavigate();
  const q = (searchParams.get("q") || "").trim();
  const isLoggedIn = useUserStore((s) => s.isLoggedIn);
  const isStaff = isLoggedIn && useUserStore((s) => s.user)?.is_staff;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // 搜索框输入态（搜索键已融合进框内，回车即搜）
  const [kw, setKw] = useState(q);
  useEffect(() => { setKw(q); }, [q]);

  // 搜索态
  const [searching, setSearching] = useState(q.length > 0);
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchLoading, setSearchLoading] = useState(false);

  // 归档：无搜索词时加载
  useEffect(() => {
    if (q) {
      // 搜索模式下不需要加载归档列表，确保 loading 尽快置 false，
      // 否则首次直接访问 /archive?q=... 会永远停在加载分支
      setLoading(false);
      return;
    }
    setLoading(true);
    getArchives()
      .then((res) => setData(extractList(res)))
      .catch((err) => console.warn("Failed to load archives:", err.message))
      .finally(() => setLoading(false));
  }, [q]);

  // 搜索：URL 带 ?q= 时执行全文搜索
  useEffect(() => {
    if (!q) {
      setSearching(false);
      setResults([]);
      setTotal(0);
      setPage(1);
      return;
    }
    setSearching(true);
    setSearchLoading(true);
    setPage(1);
    getArticles({ search: q, page: 1, page_size: PAGE_SIZE })
      .then((res) => {
        setResults(extractList(res));
        setTotal(res?.data?.count ?? res?.count ?? results.length);
      })
      .catch((err) => console.warn("Search failed:", err.message))
      .finally(() => setSearchLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // 搜索结果翻页
  const handlePageChange = (p) => {
    setPage(p);
    setSearchLoading(true);
    getArticles({ search: q, page: p, page_size: PAGE_SIZE })
      .then((res) => {
        setResults(extractList(res));
        setTotal(res?.data?.count ?? res?.count ?? results.length);
      })
      .catch(() => {})
      .finally(() => setSearchLoading(false));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 页内重新搜索
  const handleSearch = (value) => {
    const keyword = (value || "").trim();
    if (keyword) setSearchParams({ q: keyword });
  };

  if (loading) {
    return (
      <Row gutter={24} className="pt-8">
        <Col xs={24}>
          <h2 className="ui-page-title archive-title">文章归档</h2>
        </Col>
      </Row>
    );
  }

  return (
    <Row gutter={24} className="pt-8">
      <Col xs={24}>
        <div className="archive-head">
          <h2 className="ui-page-title">
            {searching ? "搜索文章" : "文章归档"}
          </h2>
          {isStaff && (
            <button
              className="ui-btn ui-btn-sm"
              onClick={() => navigate("/admin/articles/new")}
              title="用富编辑器写新文章"
            >
              <Edit3 size={14} /> 写文章
            </button>
          )}
        </div>
        {searching && (
          <p className="archive-search-note">
            关键词「{q}」的搜索结果
          </p>
        )}

        {/* 搜索框（液态玻璃；搜索入口已融合进框内，回车即搜） */}
        <Input
          className="archive-search"
          placeholder="搜索文章标题与内容..."
          allowClear
          prefix={<Search size={15} style={{ color: "var(--text-tertiary)" }} />}
          value={kw}
          onChange={(e) => setKw(e.target.value)}
          onPressEnter={() => handleSearch(kw)}
        />

        {searching ? (
          <>
            {searchLoading ? (
              <div className="ui-empty archive-empty">
                <span className="ui-empty-text">正在搜索…</span>
              </div>
            ) : results.length === 0 ? (
              <Empty
                description="没有找到相关文章"
                className="archive-empty"
              >
                <Link to="/archive" className="ui-card-link">
                  <ArrowLeft size={14} /> 返回全部归档
                </Link>
              </Empty>
            ) : (
              <>
                {results.map((article, ri) => (
                  <Link
                    key={article.id}
                    to={`/article/${article.id}`}
                    className="article-card archive-result-row reveal"
                    style={{ '--reveal-i': ri }}
                  >
                    <FileSearch size={15} className="archive-result-icon" />
                    <span className="archive-result-title">
                      {article.title}
                    </span>
                    <span className="archive-result-date">
                      {article.created_at?.slice(0, 10)}
                    </span>
                    <ChevronRight size={14} className="archive-result-arrow" />
                  </Link>
                ))}
                {total > PAGE_SIZE && (
                  <Pagination
                    current={page}
                    total={total}
                    pageSize={PAGE_SIZE}
                    onChange={handlePageChange}
                    showSizeChanger={false}
                    className="archive-pagination"
                  />
                )}
              </>
            )}
          </>
        ) : data.length === 0 ? (
          <Empty description="还没有文章" className="archive-empty" />
        ) : (
          <div className="tl-root">
            {data.map((yearGroup, gi) => (
              <section
                key={yearGroup.year}
                className="tl-year reveal"
                style={{ '--reveal-i': gi }}
              >
                {/* 年份节点：轴线上的实心大点 + 年份 */}
                <header className="tl-year-head">
                  <span className="tl-node tl-node-year" aria-hidden="true" />
                  <h3 className="tl-year-label">{yearGroup.year}</h3>
                  <span className="tl-year-count">
                    {yearGroup.months?.reduce((s, m) => s + (m.articles?.length || 0), 0) || 0} 篇
                  </span>
                </header>

                <div className="tl-body">
                  {yearGroup.months?.map((monthGroup) => (
                    <div key={monthGroup.month} className="tl-month">
                      <div className="tl-month-head">
                        <span className="tl-node tl-node-month" aria-hidden="true" />
                        <span className="tl-month-label">
                          {String(monthGroup.month).padStart(2, "0")} 月
                        </span>
                        <span className="tl-month-count">{monthGroup.articles?.length || 0}</span>
                      </div>

                      <ul className="tl-list">
                        {monthGroup.articles?.map((article) => (
                          <li key={article.id} className="tl-item">
                            <span className="tl-node tl-node-dot" aria-hidden="true" />
                            <Link to={`/article/${article.id}`} className="tl-link">
                              <span className="tl-date">{article.created_at?.slice(5, 10)}</span>
                              <span className="tl-title">{article.title}</span>
                              <ChevronRight size={14} className="tl-arrow" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </Col>
    </Row>
  );
}