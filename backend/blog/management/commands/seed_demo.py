"""
演示数据种子命令：python manage.py seed_demo
一键创建演示账号、分类、标签、文章（Markdown）、评论、杂谈、项目。
幂等：已存在同名数据时跳过；加 --flush 可先清除演示数据。
"""
import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model

from blog.models import (
    Category, Tag, Article, Comment, Talk, Project,
)

User = get_user_model()

DEMO_ADMIN = {'username': 'admin', 'password': 'admin123456', 'nickname': 'Prisdvl'}
DEMO_USER = {'username': 'demo', 'password': 'demo123456', 'nickname': '演示用户'}


class Command(BaseCommand):
    help = '创建参赛演示数据（账号/文章/评论/杂谈/项目）'

    def add_arguments(self, parser):
        parser.add_argument('--flush', action='store_true', help='先删除已有演示数据')

    def handle(self, *args, **options):
        if options['flush']:
            Article.objects.all().delete()
            Comment.objects.all().delete()
            Talk.objects.all().delete()
            Project.objects.all().delete()
            Category.objects.all().delete()
            Tag.objects.all().delete()
            self.stdout.write(self.style.WARNING('已清除全部博客数据'))

        admin = self._ensure_user(DEMO_ADMIN, is_staff=True, is_superuser=True)
        demo = self._ensure_user(DEMO_USER)

        categories = self._seed_categories()
        tags = self._seed_tags()
        articles = self._seed_articles(admin, categories, tags)
        self._seed_comments(articles, admin, demo)
        self._seed_talks(admin)
        self._seed_projects()

        self.stdout.write(self.style.SUCCESS(
            f'演示数据就绪！管理员: {DEMO_ADMIN["username"]} / {DEMO_ADMIN["password"]}，'
            f'普通用户: {DEMO_USER["username"]} / {DEMO_USER["password"]}'
        ))

    def _ensure_user(self, info, **extra):
        user, created = User.objects.get_or_create(
            username=info['username'],
            defaults={'nickname': info['nickname'], **extra},
        )
        if created:
            user.set_password(info['password'])
            user.save()
            self.stdout.write(f'创建用户 {user.username}')
        return user

    def _seed_categories(self):
        data = [
            ('前端开发', 'Web 前端技术：React、Vue、工程化与性能优化'),
            ('后端开发', '服务端技术：Django、数据库设计与 API 架构'),
            ('算法刷题', 'LeetCode 刷题笔记与算法思考'),
            ('折腾记录', '环境配置、工具链、踩坑与填坑实录'),
        ]
        cats = []
        for name, desc in data:
            cat, _ = Category.objects.get_or_create(name=name, defaults={'description': desc})
            cats.append(cat)
        return cats

    def _seed_tags(self):
        names = ['React', 'Django', 'DRF', 'TypeScript', 'Python', '性能优化', 'Vite', 'MySQL']
        return [Tag.objects.get_or_create(name=n)[0] for n in names]

    def _seed_articles(self, author, categories, tags):
        now = timezone.now()
        articles_md = [
            {
                'title': '用 React 18 + Vite 打造玻璃拟态博客首页',
                'category': categories[0], 'tags': [tags[0], tags[6]],
                'is_top': True,
                'summary': '从零搭建玻璃拟态风格首页：毛玻璃卡片、鼠标跟随光效、主题色提取，一次前端视觉架构的完整实践。',
                'content': """# 前言

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

后续我还会分享音乐播放器和 LeetCode 热力图的实现，敬请期待！""",
            },
            {
                'title': 'DRF 统一响应格式与全局异常处理设计',
                'category': categories[1], 'tags': [tags[1], tags[2], tags[7]],
                'summary': '前后端分离项目里，统一 {code, message, data} 响应结构与全局异常处理器是工程化的第一步。',
                'content': """# 为什么要统一响应格式？

前端同学最痛苦的莫过于每个接口返回结构都不一样。我们在 DRF 中通过两步实现统一：

## 1. 全局异常处理器

```python
def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return Response({'code': 500, 'message': str(exc), 'data': None},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    return Response({'code': response.status_code,
                     'message': response.data, 'data': None},
                    status=response.status_code)
```

## 2. 视图层统一包装

所有视图返回 `{'code': 200, 'message': 'ok', 'data': {...}}` 三段式结构。

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

这样前端不需要维护两个接口，状态永远由服务端返回的 `liked` 字段决定。""",
            },
            {
                'title': 'LeetCode 刷题半年复盘：从暴力到最优解的思维跃迁',
                'category': categories[2], 'tags': [tags[4]],
                'summary': '坚持刷题 180 天的复盘：双指针、滑动窗口、动态规划的解题模板，以及如何用热力图可视化坚持的力量。',
                'content': """# 半年刷题复盘

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
3. 坚持比聪明重要，热力图会替你说话""",
            },
            {
                'title': 'MySQL 索引优化实战：把查询从 800ms 降到 12ms',
                'category': categories[1], 'tags': [tags[7], tags[5]],
                'summary': '一次真实的慢查询治理：复合索引设计、覆盖索引、EXPLAIN 分析，查询耗时从 800ms 降到 12ms。',
                'content': """# 慢查询治理实录

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
        models.Index(fields=['category', '-created_at']),
    ]
```""",
            },
            {
                'title': 'Vite 5 迁移踩坑记：从 40s 到 1.2s 的构建提速',
                'category': categories[3], 'tags': [tags[6], tags[3], tags[5]],
                'summary': '把老项目从 Webpack 迁到 Vite 5 的完整记录：依赖预构建、代理配置、分包策略，构建时间从 40s 降到 1.2s。',
                'content': """# 从 Webpack 到 Vite 5

冷启动从 **40s** 到 **1.2s**，体验提升是质变的。

## 依赖预构建

Vite 用 esbuild 预构建 CommonJS 依赖：

```js
// vite.config.js
optimizeDeps: {
  include: ['antd', 'react-markdown', 'highlight.js'],
}
```

## 开发代理

后端接口统一走 `/api` 前缀代理，避免 CORS 烦恼：

```js
server: {
  proxy: {
    '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
  },
}
```

## 路由级代码分割

```jsx
const ArticleDetail = lazy(() => import('./pages/article/ArticleDetailPage'));
```

配合 `<Suspense>` 骨架屏，首屏体积直接砍半。

## 踩坑清单

1. `process.env` 要换成 `import.meta.env`
2. CSS Modules 文件名必须 `.module.css`
3. require 动态拼接图片路径不再可用，改用 `new URL()`""",
            },
            {
                'title': '用 Zustand + Web Audio 打造丝滑的在线音乐播放器',
                'category': categories[0], 'tags': [tags[0], tags[4]],
                'summary': '音乐播放器是博客最亮眼的模块：网易云 API 代理、歌词滚动同步、全局状态管理，技术细节全部拆解。',
                'content': """# 在线音乐播放器设计

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
- 歌词淡入淡出动画用 `key` 重触发 CSS animation""",
            },
        ]
        created = []
        for i, item in enumerate(articles_md):
            article, was_created = Article.objects.get_or_create(
                title=item['title'],
                defaults={
                    'content': item['content'],
                    'summary': item['summary'],
                    'category': item['category'],
                    'author': author,
                    'is_top': item.get('is_top', False),
                    'views': random.randint(80, 900),
                    'created_at': now - timedelta(days=6 - i),
                },
            )
            article.tags.set(item['tags'])
            created.append(article)
        return created

    def _seed_comments(self, articles, admin, demo):
        pairs = [
            (0, demo, '写得太细了！想问一下毛玻璃在 Safari 上的兼容性怎么样？'),
            (0, admin, 'Safari 需要 -webkit-backdrop-filter 前缀，文中代码已兼容。'),
            (1, demo, '统一响应格式这块深有同感，每个接口结构不一样真的痛苦。'),
            (3, demo, 'EXPLAIN 一看 type=ALL 确实扎心，索引设计太重要了。'),
            (5, demo, '歌词同步用二分查找这个思路学到了！'),
        ]
        for idx, user, content in pairs:
            article = articles[idx]
            parent, _ = Comment.objects.get_or_create(
                article=article, user=user, content=content)
            if user == demo:
                Comment.objects.get_or_create(
                    article=article, user=admin, parent=parent,
                    content='感谢支持！有问题欢迎继续交流～')

    def _seed_talks(self, author):
        items = [
            '最近在学 Rust，所有权系统设计得真精妙，编译器即文档。',
            '把博客改造成了个人展示站，从设计到上线全程记录，欢迎围观。',
            '推荐一本好书：《重构：改善既有代码的设计》，二十年不过时。',
            '深色模式是护眼还是护心情？我的答案是：都护。',
            '今天给热力图加了入场动画，看着格子一个个长出来莫名解压。',
        ]
        for i, content in enumerate(items):
            Talk.objects.get_or_create(
                content=content,
                defaults={'author': author,
                          'created_at': timezone.now() - timedelta(days=i)})

    def _seed_projects(self):
        items = [
            ('Kakuki Blog', '本项目：Django + React 全栈个人博客，玻璃拟态设计、在线音乐播放器、LeetCode 数据可视化。', 'React,Django,DRF,MySQL', True, 0),
            ('AI Chatbot', '基于大模型 API 的智能对话机器人，支持多轮上下文与流式输出。', 'Python,FastAPI,WebSocket', False, 1),
            ('LeetCode Tracker', '自动同步刷题记录的数据看板，支持难度分布与连续打卡统计。', 'React,ECharts,GitHub Actions', False, 2),
            ('Music Player', '独立版在线音乐播放器，支持自定义歌单与歌词高亮。', 'Vue,Express,SQLite', False, 3),
        ]
        for name, desc, tech, featured, order in items:
            Project.objects.get_or_create(
                name=name,
                defaults={'description': desc, 'tech_stack': tech,
                          'is_featured': featured, 'order': order})
