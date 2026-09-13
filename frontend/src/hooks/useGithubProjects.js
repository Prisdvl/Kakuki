import { useEffect, useState } from 'react';
import githubApi from '../api/github';

/**
 * 真实项目数据源：GitHub 仓库
 *
 * 取值规则：
 *  - 只要自有仓库（排除 fork），fork 不算个人产出
 *  - 排除空仓库与有描述为空且无语言的仓，避免出现"光秃秃的卡片"
 *  - 按最近更新排序，并允许通过 PINNED 指定置顶顺序
 *
 * 数据源走**本站 Worker 代理**（/api/v1/github/repos/:login/），不直连 GitHub：
 * 浏览器直连用的是未认证配额（60 次/小时/IP），访客几次刷新就打满后全部 403。
 * 这里再叠一层 localStorage 缓存，网络失败时回退到 FALLBACK 快照。
 */
const GH_USER = 'Prisdvl';
const CACHE_KEY = 'kakuki-github-repos';
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6h：仓库清单变化不频繁

/** 置顶顺序（按仓库名），未列出的按更新时间排在后面 */
const PINNED = ['PrisTimer', 'Kakuki', 'homework-grading-system', 'prisdvl-nvim-config'];

/** 语言 → 展示色（与 GitHub 语言色板一致，未知语言用中性灰） */
export const LANG_COLORS = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Vue: '#41b883',
  Rust: '#dea584',
  Lua: '#000080',
  C: '#555555',
  'C++': '#f34b7d',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Shell: '#89e051',
  Java: '#b07219',
  Go: '#00ADD8',
};

/** 兜底快照：2026-09-12 抓取的 GitHub 真实数据 */
const FALLBACK = [
  {
    id: 'PrisTimer',
    name: 'PrisTimer',
    description: 'Tauri 2 + Rust + Vue 3 的液态玻璃风格专注计时器，支持多任务标签、会话统计与本地持久化。',
    language: 'Vue',
    tech_list: ['Tauri 2', 'Rust', 'Vue 3'],
    repo_url: 'https://github.com/Prisdvl/PrisTimer',
    url: '',
    stars: 0,
    updated_at: '',
    is_featured: true,
    source: 'github',
  },
  {
    id: 'Kakuki',
    name: 'Kakuki',
    description: '本站源码：个人博客全栈实现，含文章、归档、音乐播放器与可视化看板。',
    language: 'JavaScript',
    tech_list: ['Django', 'React', 'MySQL'],
    repo_url: 'https://github.com/Prisdvl/Kakuki',
    url: 'https://kakuki.top',
    stars: 0,
    updated_at: '',
    is_featured: true,
    source: 'github',
  },
  {
    id: 'homework-grading-system',
    name: 'homework-grading-system',
    description: '作业批改系统，面向教师端的作业收集、批改与成绩统计流程。',
    language: 'Python',
    tech_list: ['Python'],
    repo_url: 'https://github.com/Prisdvl/homework-grading-system',
    url: '',
    stars: 1,
    updated_at: '',
    is_featured: false,
    source: 'github',
  },
  {
    id: 'prisdvl-nvim-config',
    name: 'prisdvl-nvim-config',
    description: '我的 Neovim 配置，面向 C/C++ 开发，集成 LSP、调试与模糊查找。',
    language: 'Lua',
    tech_list: ['Lua', 'Neovim'],
    repo_url: 'https://github.com/Prisdvl/prisdvl-nvim-config',
    url: '',
    stars: 0,
    updated_at: '',
    is_featured: false,
    source: 'github',
  },
];

/** 仓库描述兜底：GitHub 上为空或编码损坏时用人工描述，避免卡片出现乱码/空白 */
const DESC_FALLBACK = {
  Kakuki: '本站源码：个人博客全栈实现，含文章、归档、音乐播放器与可视化看板。',
  'homework-grading-system': '作业批改系统，面向教师端的作业收集、批改与成绩统计流程。',
  PrisTimer: 'Tauri 2 + Rust + Vue 3 的液态玻璃风格专注计时器，支持多任务标签、会话统计与本地持久化。',
  'prisdvl-nvim-config': '我的 Neovim 配置，面向 C/C++ 开发，集成 LSP、调试与模糊查找。',
};

/**
 * 判断描述是否可用：空、纯问号、或含连续 3 个以上问号（编码损坏特征）
 * 都视为不可用，回退到人工描述。
 */
function cleanDescription(name, raw) {
  const d = (raw || '').trim();
  const broken = !d || /\?\?\?/.test(d) || /^\?+$/.test(d);
  if (broken) return DESC_FALLBACK[name] || '';
  return d;
}

/** 由仓库名推导展示用技术标签（GitHub 只给单一 language，标签更有信息量） */
function deriveTech(repo) {
  const lang = repo.language;
  const tags = [];
  if (lang) tags.push(lang);
  const name = (repo.name || '').toLowerCase();
  const desc = (repo.description || '').toLowerCase();
  if (name.includes('pristimer') || desc.includes('tauri')) {
    if (!tags.includes('Rust')) tags.push('Rust');
  }
  // 仓库里同时含 backend/(Django) 与 cloudflare/(Hono)，对外展示以线上实际架构为准
  if (name.includes('kakuki')) tags.push('React', 'Hono', 'Cloudflare');
  if (name.includes('nvim')) tags.push('Neovim');
  return tags.slice(0, 4);
}

function normalize(repos) {
  return repos
    .filter((r) => !r.fork && !r.archived)
    .map((r) => ({
      id: r.name,
      name: r.name,
      description: cleanDescription(r.name, r.description),
      language: r.language || '',
      tech_list: deriveTech(r),
      repo_url: r.html_url,
      url: r.homepage || '',
      stars: r.stargazers_count || 0,
      updated_at: r.updated_at || '',
      is_featured: PINNED.indexOf(r.name) === 0,
      source: 'github',
    }))
    .sort((a, b) => {
      const ai = PINNED.indexOf(a.name);
      const bi = PINNED.indexOf(b.name);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return (b.updated_at || '').localeCompare(a.updated_at || '');
    });
}

function readCache() {
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (raw && Date.now() - raw.ts < CACHE_TTL && Array.isArray(raw.data) && raw.data.length) {
      return raw.data;
    }
  } catch { /* ignore */ }
  return null;
}

/**
 * 拉取真实项目列表。
 * @returns {{ projects: Array, loading: boolean, error: string, stale: boolean }}
 */
export function useGithubProjects() {
  const [projects, setProjects] = useState(() => readCache() || FALLBACK);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stale, setStale] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const cached = readCache();
    if (cached) {
      setProjects(cached);
      setStale(false);
      setLoading(false);
    }

    githubApi
      .repos(GH_USER)
      .then((data) => {
        if (cancelled || !Array.isArray(data)) return;
        const list = normalize(data);
        if (list.length === 0) return;
        setProjects(list);
        setStale(false);
        setError('');
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: list }));
        } catch { /* 配额满则放弃缓存 */ }
      })
      .catch((e) => {
        if (cancelled) return;
        setError(String(e?.message || e));
        // 已有缓存或兜底快照，页面照常可用
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  return { projects, loading, error, stale };
}

export default useGithubProjects;
