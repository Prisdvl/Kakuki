import { useState, useEffect } from "react";
import { Row, Col, Pagination, Empty, Input } from "antd";
import { Link, useSearchParams } from "react-router-dom";
import { Calendar, ChevronRight, Search, ArrowLeft, FileSearch } from "lucide-react";
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
          <h2 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.5rem" }}>文章归档</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>按时间线回顾所有写过的东西。</p>
        </Col>
      </Row>
    );
  }

  return (
    <Row gutter={24} className="pt-8">
      <Col xs={24}>
        <h2 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          {searching ? "搜索文章" : "文章归档"}
        </h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
          {searching ? `关键词「${q}」的搜索结果` : "按时间线回顾所有写过的东西。"}
        </p>

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
          data.map((yearGroup, gi) => (
            <div key={yearGroup.year} className="mb-8 reveal" style={{ '--reveal-i': gi }}>
              <h3 style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--accent)", marginBottom: "1rem" }}>
                {yearGroup.year}
              </h3>
              {yearGroup.months?.map((monthGroup) => (
                <div key={monthGroup.month} className="ml-6 mb-6">
                  <h4 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
                    {monthGroup.month} 月
                  </h4>
                  <div style={{ borderLeft: "2px solid var(--border)", paddingLeft: "1rem" }}>
                    {monthGroup.articles?.map((article) => (
                      <div key={article.id} className="mb-3" style={{ position: "relative" }}>
                        <div style={{ position: "absolute", left: "-1.35rem", top: "0.5rem", width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", opacity: 0.5 }} />
                        <Link to={`/article/${article.id}`} className="article-card" style={{ padding: "0.75rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <Calendar size={14} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
                          <span style={{ fontSize: "0.85rem", color: "var(--text-tertiary)", flexShrink: 0 }}>{article.created_at?.slice(5, 10)}</span>
                          <span style={{ color: "var(--text-primary)", fontSize: "0.95rem" }}>{article.title}</span>
                          <ChevronRight size={14} style={{ color: "var(--text-tertiary)", marginLeft: "auto", flexShrink: 0 }} />
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </Col>
    </Row>
  );
}
