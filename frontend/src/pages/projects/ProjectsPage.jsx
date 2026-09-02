import { useState, useEffect } from "react";
import { ExternalLink, Code2, Rocket } from "lucide-react";
import { getProjects } from "../../api/project";
import { extractList } from "../../api/request";

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProjects()
      .then((res) => setProjects(extractList(res)))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ paddingTop: "2rem", maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" }}>项目</h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: "2.5rem" }}>我参与和开发的一些有趣的项目。</p>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1.25rem" }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="glass shimmer" style={{ height: 200, borderRadius: 20 }} />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="glass" style={{ textAlign: "center", padding: "4rem 2rem", borderRadius: 20, color: "var(--text-tertiary)" }}>
          <Rocket size={40} style={{ margin: "0 auto 1rem", opacity: 0.35 }} />
          <p>暂无项目数据，可在 Django Admin 后台添加</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1.25rem" }}>
          {projects.map((p, i) => (
            <a
              key={p.id}
              href={p.url || p.repo_url || "#"}
              target={p.url || p.repo_url ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="project-card glass reveal"
              style={{ transitionDelay: `${i * 70}ms` }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
                  <Code2 size={22} />
                </div>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  {p.is_featured && (
                    <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--accent)", background: "var(--accent-soft)", padding: "0.15rem 0.55rem", borderRadius: 999 }}>
                      精选
                    </span>
                  )}
                  {(p.url || p.repo_url) && <ExternalLink size={16} style={{ color: "var(--text-tertiary)" }} />}
                </div>
              </div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-primary)" }}>{p.name}</h3>
              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: "1.6", marginBottom: "1rem" }}>{p.description}</p>
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                {(p.tech_list || []).map((t) => (
                  <span key={t} style={{ padding: "0.15rem 0.55rem", borderRadius: 6, fontSize: "0.75rem", fontWeight: 500, background: "var(--accent-soft)", color: "var(--accent)" }}>{t}</span>
                ))}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
