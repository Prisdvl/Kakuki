import { useState, useEffect } from "react";
import { Row, Col, Pagination, Empty, Input } from "antd";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronRight, Search, ArrowLeft, FileSearch } from "lucide-react";
import { getArchives, getArticles } from "../../api/article";
import { extractList } from "../../api/request";

const { Search: SearchInput } = Input;

const PAGE_SIZE = 10;

export default function ArchivePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = (searchParams.get("q") || "").trim();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

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
          <h2 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "1.25rem" }}>文章归档</h2>
        </Col>
      </Row>
    );
  }

  return (
    <Row gutter={24} className="pt-8">
      <Col xs={24}>
        <h2 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: searching ? "0.5rem" : "1.25rem" }}>
          {searching ? "搜索文章" : "文章归档"}
        </h2>
        {searching && (
          <p style={{ color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
            关键词「{q}」的搜索结果
          </p>
        )}

        {/* 搜索框 */}
        <SearchInput
          placeholder="搜索文章标题与内容..."
          allowClear
          enterButton={<><Search size={14} /> 搜索</>}
          defaultValue={q}
          onSearch={handleSearch}
          style={{ maxWidth: 480, marginBottom: "1.75rem" }}
        />

        {searching ? (
          <>
            {searchLoading ? (
              <p style={{ color: "var(--text-tertiary)", padding: "2rem 0" }}>正在搜索...</p>
            ) : results.length === 0 ? (
              <Empty
                description="没有找到相关文章"
                style={{ padding: "3rem 0" }}
              >
                <Link to="/archive" style={{ color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                  <ArrowLeft size={14} /> 返回全部归档
                </Link>
              </Empty>
            ) : (
              <>
                {results.map((article, ri) => (
                  <Link
                    key={article.id}
                    to={`/article/${article.id}`}
                    className="article-card reveal"
                    style={{ padding: "0.9rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem", '--reveal-i': ri }}
                  >
                    <FileSearch size={15} style={{ color: "var(--accent)", flexShrink: 0 }} />
                    <span style={{ color: "var(--text-primary)", fontSize: "0.95rem", flex: 1, minWidth: 0 }}>
                      {article.title}
                      {article.category?.name && (
                        <span style={{ marginLeft: "0.5rem", fontSize: "0.72rem", color: "var(--text-tertiary)" }}>· {article.category.name}</span>
                      )}
                    </span>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", flexShrink: 0 }}>
                      {article.created_at?.slice(0, 10)}
                    </span>
                    <ChevronRight size={14} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
                  </Link>
                ))}
                {total > PAGE_SIZE && (
                  <Pagination
                    current={page}
                    total={total}
                    pageSize={PAGE_SIZE}
                    onChange={handlePageChange}
                    showSizeChanger={false}
                    style={{ marginTop: "1.5rem", textAlign: "center" }}
                  />
                )}
              </>
            )}
          </>
        ) : data.length === 0 ? (
          <Empty description="还没有文章" style={{ padding: "3rem 0" }} />
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
                              {article.category?.name && (
                                <span className="tl-tag">{article.category.name}</span>
                              )}
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
