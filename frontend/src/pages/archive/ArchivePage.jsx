import { useState, useEffect } from "react";
import { Row, Col, Pagination, Empty, Input } from "antd";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { ChevronRight, Search, ArrowLeft, FileSearch, Edit3 } from "lucide-react";
import { getArchives, getArticles, getCategories } from "../../api/article";
import { extractList } from "../../api/request";
import useUserStore from "../../store/userStore";

const { Search: SearchInput } = Input;

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

  // 分类（从分类页整合进归档：搜索、分类都在这一页完成）
  const [categories, setCategories] = useState([]);
  const [activeCat, setActiveCat] = useState(null);
  const [catArticles, setCatArticles] = useState([]);
  const [catLoading, setCatLoading] = useState(false);

  // 搜索态
  const [searching, setSearching] = useState(q.length > 0);
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    getCategories().then((res) => setCategories(extractList(res))).catch(() => {});
  }, []);

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

  // 分类筛选：选中非空分类时拉取该分类文章
  useEffect(() => {
    if (!activeCat) { setCatArticles([]); return; }
    setCatLoading(true);
    getArticles({ category: activeCat, page_size: 50 })
      .then((res) => setCatArticles(extractList(res)))
      .catch(() => setCatArticles([]))
      .finally(() => setCatLoading(false));
  }, [activeCat]);

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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: searching ? "0.5rem" : "1.25rem" }}>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 700, margin: 0 }}>
            {searching ? "搜索文章" : activeCat ? "分类文章" : "文章归档"}
          </h2>
          {isStaff && (
            <button
              className="glass-button"
              onClick={() => navigate("/admin/articles/new")}
              title="用富编辑器写新文章"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", flexShrink: 0 }}
            >
              <Edit3 size={14} /> 写文章
            </button>
          )}
        </div>
        {searching && (
          <p style={{ color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
            关键词「{q}」的搜索结果
          </p>
        )}
        {activeCat && !searching && (
          <p style={{ color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
            分类「{categories.find((c) => c.id === activeCat)?.name}」· {catArticles.length} 篇
          </p>
        )}

        {/* 搜索框 */}
        <SearchInput
          placeholder="搜索文章标题与内容..."
          allowClear
          enterButton={<><Search size={14} /> 搜索</>}
          defaultValue={q}
          onSearch={handleSearch}
          style={{ maxWidth: 480, marginBottom: "1rem" }}
        />

        {/* 分类 chips（原独立「分类」页整合至此） */}
        {!searching && categories.length > 0 && (
          <div className="category-chip-container" style={{ marginBottom: "1.75rem" }}>
            <button
              className={`category-chip ${!activeCat ? "active" : ""}`}
              onClick={() => setActiveCat(null)}
            >
              全部
              <span className="category-chip-count">{categories.length}</span>
            </button>
            {categories.map((cat) => {
              const count = cat.article_count || 0;
              return (
                <button
                  key={cat.id}
                  className={`category-chip ${activeCat === cat.id ? "active" : ""}`}
                  onClick={() => setActiveCat(activeCat === cat.id ? null : cat.id)}
                >
                  {cat.name}
                  {count > 0 && <span className="category-chip-count">{count}</span>}
                </button>
              );
            })}
          </div>
        )}

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
        ) : activeCat ? (
          catLoading ? (
            <p style={{ color: "var(--text-tertiary)", padding: "2rem 0" }}>加载中...</p>
          ) : catArticles.length === 0 ? (
            <Empty description="该分类下暂无文章" style={{ padding: "3rem 0" }} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {catArticles.map((article, i) => (
                <Link
                  key={article.id}
                  to={`/article/${article.id}`}
                  className="article-card reveal"
                  style={{ padding: "0.9rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem", '--reveal-i': i }}
                >
                  <span style={{ color: "var(--text-primary)", fontSize: "0.95rem", flex: 1, minWidth: 0 }}>{article.title}</span>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", flexShrink: 0 }}>
                    {article.created_at?.slice(0, 10)}
                  </span>
                  <ChevronRight size={14} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
                </Link>
              ))}
            </div>
          )
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
