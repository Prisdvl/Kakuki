-- Kakuki 演示数据（由 seed/build-seed.mjs 生成，幂等可重复执行）
-- 演示账号：Prisdvl / ***REDACTED***（管理员）· demo / demo123456（普通用户）

DELETE FROM article_likes; DELETE FROM talk_likes; DELETE FROM sqlite_sequence WHERE name IN ('articles','comments','talks','projects','categories','article_likes','talk_likes');
DELETE FROM comments; DELETE FROM talks; DELETE FROM projects; DELETE FROM articles; DELETE FROM categories;

INSERT OR IGNORE INTO users (username, password, nickname, avatar, is_staff, is_superuser, date_joined) VALUES ('Prisdvl', 'pbkdf2_sha256$100000$1a90fcbdb34571f90a$25aXEVTm+SLwZOAa8qXfhxrA+lwbismO5nc5YAyfYQI=', 'Prisdvl', '/github-avatar.jpg', 1, 1, '2026-05-15T13:58:02Z');
INSERT OR IGNORE INTO users (username, password, nickname, avatar, is_staff, is_superuser, date_joined) VALUES ('demo', 'pbkdf2_sha256$100000$c1ca58ac35c0ae79ae$JS6XtSLGUXpkATZLAza9/Z00h0ScDgjHUVTu98B18tU=', 'Demo', '/github-avatar.jpg', 0, 0, '2026-05-15T13:58:02Z');

INSERT INTO categories (id, name, description) VALUES (1, '前端开发', 'Web 前端技术：React、Vue、工程化与性能优化');
INSERT INTO categories (id, name, description) VALUES (2, '后端开发', '服务端技术：Django、数据库设计与 API 架构');
INSERT INTO categories (id, name, description) VALUES (3, '算法刷题', 'LeetCode 刷题笔记与算法思考');
INSERT INTO categories (id, name, description) VALUES (4, '折腾记录', '环境配置、工具链、踩坑与填坑实录');

INSERT INTO articles (id, title, content, summary, category_id, author_id, views, is_top, created_at, updated_at) VALUES (1, '用 React 18 + Vite 打造玻璃拟态博客首页', '# 前言

个人博客的首页是访客的第一印象。这次我用 **React 18 + Vite + Tailwind CSS** 重构了首页，
整体采用玻璃拟态（Glassmorphism）设计语言。

## 技术选型

| 需求 | 方案 | 理由 |
|------|------|------|
| 构建工具 | Vite | 秒级冷启动、原生 ESM |
| 状态管理 | Zustand | 轻量、无模板代码 |
| 样式 | Tailwind + CSS 变量 | 主题切换零成本 |

## 毛玻璃卡片实现

核心只有一个 `backdrop-filter`：

```css
.glass {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(16px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
}
```

## 鼠标跟随光效

用 CSS 变量记录鼠标位置，`requestAnimationFrame` 节流更新：

```jsx
const onMouseMove = (e) => {
  if (ticking) return;
  ticking = true;
  pendingX = (e.clientX / window.innerWidth) * 100;
  requestAnimationFrame(update);
};
```

> 小技巧：光效元素的 `opacity` 联合 `visibilitychange` 处理，
> 页面切到后台时隐藏光效可以省下不少合成开销。

## 小结

- 视觉先行，性能兜底
- 动画尽量走 `transform` 与 `opacity`
- 主题系统用 CSS 变量驱动，切换只需改一组变量

后续我还会分享音乐播放器和 LeetCode 热力图的实现，敬请期待！', '从零搭建玻璃拟态风格首页：毛玻璃卡片、鼠标跟随光效、主题色提取，一次前端视觉架构的完整实践。', 1, 1, 862, 1, '2026-09-06T13:58:02Z', '2026-09-06T13:58:02Z');
INSERT INTO articles (id, title, content, summary, category_id, author_id, views, is_top, created_at, updated_at) VALUES (2, 'DRF 统一响应格式与全局异常处理设计', '# 为什么要统一响应格式？

前端同学最痛苦的莫过于每个接口返回结构都不一样。我们在 DRF 中通过两步实现统一：

## 1. 全局异常处理器

```python
def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return Response({''code'': 500, ''message'': str(exc), ''data'': None},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    return Response({''code'': response.status_code,
                     ''message'': response.data, ''data'': None},
                    status=response.status_code)
```

## 2. 视图层统一包装

所有视图返回 `{''code'': 200, ''message'': ''ok'', ''data'': {...}}` 三段式结构。

## 点赞接口的幂等设计

点赞/取消点赞做成同一个 POST 接口，第二次调用即为取消：

```python
like, created = ArticleLike.objects.get_or_create(
    article=article, user=user, ip_address=ip)
if not created:
    like.delete()
```

- 登录用户按 `user` 去重
- 游客按 `IP` 去重
- 数据库层用联合唯一约束兜底

这样前端不需要维护两个接口，状态永远由服务端返回的 `liked` 字段决定。', '前后端分离项目里，统一 {code, message, data} 响应结构与全局异常处理器是工程化的第一步。', 2, 1, 534, 0, '2026-09-07T13:58:02Z', '2026-09-07T13:58:02Z');
INSERT INTO articles (id, title, content, summary, category_id, author_id, views, is_top, created_at, updated_at) VALUES (3, 'LeetCode 刷题半年复盘：从暴力到最优解的思维跃迁', '# 半年刷题复盘

博客首页有一个 LeetCode 提交热力图，它背后的数据通过 GraphQL 接口实时拉取。

## 常见解题模板

### 双指针

```python
def two_sum_sorted(nums, target):
    left, right = 0, len(nums) - 1
    while left < right:
        s = nums[left] + nums[right]
        if s == target:
            return [left, right]
        elif s < target:
            left += 1
        else:
            right -= 1
    return []
```

### 滑动窗口

```python
def length_of_longest_substring(s: str) -> int:
    window, left, ans = set(), 0, 0
    for right, ch in enumerate(s):
        while ch in window:
            window.remove(s[left]); left += 1
        window.add(ch)
        ans = max(ans, right - left + 1)
    return ans
```

## 一点感悟

1. 先想暴力解，再想优化——不要一上来就背最优解
2. 每道题写完写一句话总结「这题的核心观察是什么」
3. 坚持比聪明重要，热力图会替你说话', '坚持刷题 180 天的复盘：双指针、滑动窗口、动态规划的解题模板，以及如何用热力图可视化坚持的力量。', 3, 1, 743, 0, '2026-09-08T13:58:02Z', '2026-09-08T13:58:02Z');
INSERT INTO articles (id, title, content, summary, category_id, author_id, views, is_top, created_at, updated_at) VALUES (4, 'MySQL 索引优化实战：把查询从 800ms 降到 12ms', '# 慢查询治理实录

文章列表页在数据量上来之后查询变慢，EXPLAIN 一看全表扫描。

## 问题定位

```sql
EXPLAIN SELECT id, title FROM blog_article
WHERE category_id = 3 AND is_top = 0
ORDER BY created_at DESC LIMIT 10;
```

`type=ALL, rows=58000`，典型的全表扫描。

## 复合索引设计

最左前缀原则：等值条件放前面，排序字段放后面。

```sql
ALTER TABLE blog_article
ADD INDEX idx_cat_top_created (category_id, is_top, created_at);
```

## 优化效果

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| 耗时 | 800ms | 12ms |
| 扫描行数 | 58000 | 10 |

> 索引不是越多越好，写多读少的表要权衡写入放大。

Django 中对应的 Meta 写法：

```python
class Meta:
    indexes = [
        models.Index(fields=[''category'', ''-created_at'']),
    ]
```', '一次真实的慢查询治理：复合索引设计、覆盖索引、EXPLAIN 分析，查询耗时从 800ms 降到 12ms。', 2, 1, 421, 0, '2026-09-09T13:58:02Z', '2026-09-09T13:58:02Z');
INSERT INTO articles (id, title, content, summary, category_id, author_id, views, is_top, created_at, updated_at) VALUES (5, 'Vite 5 迁移踩坑记：从 40s 到 1.2s 的构建提速', '# 从 Webpack 到 Vite 5

冷启动从 **40s** 到 **1.2s**，体验提升是质变的。

## 依赖预构建

Vite 用 esbuild 预构建 CommonJS 依赖：

```js
// vite.config.js
optimizeDeps: {
  include: [''antd'', ''react-markdown'', ''highlight.js''],
}
```

## 开发代理

后端接口统一走 `/api` 前缀代理，避免 CORS 烦恼：

```js
server: {
  proxy: {
    ''/api'': { target: ''http://127.0.0.1:8000'', changeOrigin: true },
  },
}
```

## 路由级代码分割

```jsx
const ArticleDetail = lazy(() => import(''./pages/article/ArticleDetailPage''));
```

配合 `<Suspense>` 骨架屏，首屏体积直接砍半。

## 踩坑清单

1. `process.env` 要换成 `import.meta.env`
2. CSS Modules 文件名必须 `.module.css`
3. require 动态拼接图片路径不再可用，改用 `new URL()`', '把老项目从 Webpack 迁到 Vite 5 的完整记录：依赖预构建、代理配置、分包策略，构建时间从 40s 降到 1.2s。', 4, 1, 389, 0, '2026-09-10T13:58:02Z', '2026-09-10T13:58:02Z');
INSERT INTO articles (id, title, content, summary, category_id, author_id, views, is_top, created_at, updated_at) VALUES (6, '用 Zustand + Web Audio 打造丝滑的在线音乐播放器', '# 在线音乐播放器设计

## 为什么需要后端代理？

浏览器直连网易云 API 会有 CORS 与防盗链问题，所以用 Django 做了一层代理并加内存缓存：

```python
_cache = {}
CACHE_TTL = 300  # 5 分钟

def _cached(key, fetch):
    hit = _cache.get(key)
    if hit and time.time() - hit[0] < CACHE_TTL:
        return hit[1]
    data = fetch()
    _cache[key] = (time.time(), data)
    return data
```

## 歌词同步算法

LRC 歌词是 `[mm:ss.xx]歌词文本` 格式。播放时二分查找当前时间对应的行：

```js
function findLyricIndex(time, lyrics) {
  let lo = 0, hi = lyrics.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lyrics[mid].time <= time) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}
```

## 全局状态：Zustand

播放器状态跨页面保持，切换页面音乐不断：

```js
const useMusicStore = create((set) => ({
  isPlaying: false,
  playlist: [],
  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
}));
```

- 单例 `Audio` 实例挂在 store 外部
- 进度条点击 seek、拖拽音量
- 歌词淡入淡出动画用 `key` 重触发 CSS animation', '音乐播放器是博客最亮眼的模块：网易云 API 代理、歌词滚动同步、全局状态管理，技术细节全部拆解。', 1, 1, 668, 0, '2026-09-11T13:58:02Z', '2026-09-11T13:58:02Z');

INSERT INTO comments (id, article_id, user_id, content, parent_id, created_at) VALUES (1, 1, 1, '写得太细了！想问一下毛玻璃在 Safari 上的兼容性怎么样？', NULL, '2026-09-10T13:58:02Z');
INSERT INTO comments (id, article_id, user_id, content, parent_id, created_at) VALUES (2, 1, 1, 'Safari 需要 -webkit-backdrop-filter 前缀，文中代码已兼容。', NULL, '2026-09-11T13:58:02Z');
INSERT INTO comments (id, article_id, user_id, content, parent_id, created_at) VALUES (3, 2, 1, '统一响应格式这块深有同感，每个接口结构不一样真的痛苦。', NULL, '2026-09-10T13:58:02Z');
INSERT INTO comments (id, article_id, user_id, content, parent_id, created_at) VALUES (4, 4, 1, 'EXPLAIN 一看 type=ALL 确实扎心，索引设计太重要了。', NULL, '2026-09-11T13:58:02Z');
INSERT INTO comments (id, article_id, user_id, content, parent_id, created_at) VALUES (5, 6, 1, '歌词同步用二分查找这个思路学到了！', NULL, '2026-09-10T13:58:02Z');

INSERT INTO talks (id, content, author_id, views, created_at) VALUES (1, '最近在学 Rust，所有权系统设计得真精妙，编译器即文档。', 1, 20, '2026-09-12T13:58:02Z');
INSERT INTO talks (id, content, author_id, views, created_at) VALUES (2, '把博客改造成了个人展示站，从设计到上线全程记录，欢迎围观。', 1, 27, '2026-09-11T13:58:02Z');
INSERT INTO talks (id, content, author_id, views, created_at) VALUES (3, '推荐一本好书：《重构：改善既有代码的设计》，二十年不过时。', 1, 34, '2026-09-10T13:58:02Z');
INSERT INTO talks (id, content, author_id, views, created_at) VALUES (4, '深色模式是护眼还是护心情？我的答案是：都护。', 1, 41, '2026-09-09T13:58:02Z');
INSERT INTO talks (id, content, author_id, views, created_at) VALUES (5, '今天给热力图加了入场动画，看着格子一个个长出来莫名解压。', 1, 48, '2026-09-08T13:58:02Z');

INSERT INTO projects (id, name, description, url, repo_url, tech_stack, is_featured, sort_order, created_at) VALUES (1, 'Kakuki Blog', '本项目：Django + React 全栈个人博客，玻璃拟态设计、在线音乐播放器、LeetCode 数据可视化。', '', '', 'React,Django,DRF,MySQL', 1, 0, '2026-08-13T13:58:02Z');
INSERT INTO projects (id, name, description, url, repo_url, tech_stack, is_featured, sort_order, created_at) VALUES (2, 'AI Chatbot', '基于大模型 API 的智能对话机器人，支持多轮上下文与流式输出。', '', '', 'Python,FastAPI,WebSocket', 0, 1, '2026-08-18T13:58:02Z');
INSERT INTO projects (id, name, description, url, repo_url, tech_stack, is_featured, sort_order, created_at) VALUES (3, 'LeetCode Tracker', '自动同步刷题记录的数据看板，支持难度分布与连续打卡统计。', '', '', 'React,ECharts,GitHub Actions', 0, 2, '2026-08-23T13:58:02Z');
INSERT INTO projects (id, name, description, url, repo_url, tech_stack, is_featured, sort_order, created_at) VALUES (4, 'Music Player', '独立版在线音乐播放器，支持自定义歌单与歌词高亮。', '', '', 'Vue,Express,SQLite', 0, 3, '2026-08-28T13:58:02Z');

INSERT INTO article_likes (article_id, user_id, ip_address, created_at) VALUES (1, NULL, '203.0.113.7', '2026-09-11T13:58:02Z'), (2, NULL, '203.0.113.9', '2026-09-11T13:58:02Z'), (3, NULL, '198.51.100.4', '2026-09-10T13:58:02Z');
INSERT INTO talk_likes (talk_id, user_id, ip_address, created_at) VALUES (1, NULL, '203.0.113.7', '2026-09-11T13:58:02Z'), (2, NULL, '198.51.100.8', '2026-09-10T13:58:02Z');
