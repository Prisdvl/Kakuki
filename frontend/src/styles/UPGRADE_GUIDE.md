/**
 * 磨砂液态玻璃 · 设计系统升级说明
 * ====================================
 *
 * 本次升级涉及 5 个文件，覆盖设计令牌、玻璃组件库、动画库、Tailwind 对齐、Antd 主题接入。
 * 所有改动都向下兼容（保留 .btn-glass / .glass / .glass-card 等旧类名），
 * 新代码可直接使用语义化的 .glass-elevated / .glass-floating / .glass-button / .glass-pill。
 *
 * ============================================================
 * 一、设计令牌（design-tokens.css）
 * ============================================================
 * 新文件：frontend/src/styles/design-tokens.css
 *
 * 集中 6 类可复用变量：
 *   - 颜色基线：--bg-*, --text-*, --accent-*, --success/warning/error/info
 *   - 磨砂玻璃：--glass-bg, --glass-blur, --glass-saturate, --glass-tint,
 *               --glass-specular, --glass-edge, --glass-inner-shadow,
 *               --glass-shadow, --glass-shadow-hover
 *   - 圆角：    --radius-sm/md/lg/xl/2xl/full
 *   - 阴影：    --shadow-z0/z1/z2/z3/z4, --shadow-accent
 *   - 动画：    --motion-instant/fast/base/slow/slower/page
 *               --ease-standard/decelerate/accelerate/spring
 *               --t-color/transform/shadow/opacity/default（速记）
 *   - 层级：    --z-base/nav/drawer/modal/toast/overlay
 *
 * 使用：
 *   .my-card {
 *     background: var(--glass-bg);
 *     backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
 *     box-shadow: var(--shadow-z2);
 *     transition: var(--t-default);
 *   }
 *
 * 暗黑模式：.dark 选择器下全部覆盖；prefers-reduced-motion 自动归零时长。
 *
 * ============================================================
 * 二、磨砂液态玻璃组件库（glass.css）
 * ============================================================
 * 新文件：frontend/src/styles/glass.css
 *
 * 6 个玻璃变体（全部仅过渡 transform / opacity / box-shadow，零 layout）：
 *
 *   .glass             基础玻璃面板（中性容器）
 *   .glass-elevated    浮起玻璃卡片（hover 自动上浮 + 折射高光跟随鼠标）
 *   .glass-floating    悬浮液态玻璃（带液态呼吸动画 + 边缘高光流转）
 *   .glass-card        内容卡片玻璃（标题+正文+元信息）
 *   .glass-pill        胶囊玻璃（徽章 / 标签 / 状态）
 *   .glass-button      按钮玻璃（带按压反馈）
 *   .glass-button-solid 主色实心按钮（带 shine sweep 高光扫过）
 *
 * 兼容性：.btn-glass / .btn-glass-solid / .glass / .glass-card 旧类名
 *         自动复用新规则，无需批量替换旧代码。
 *
 * 鼠标折射：组件监听 onMouseMove 并设置
 *   e.currentTarget.style.setProperty('--refraction-x', `${x}%`);
 *   e.currentTarget.style.setProperty('--refraction-y', `${y}%`);
 * 见 components/ArticleCard/index.jsx 示例。
 *
 * ============================================================
 * 三、动画与过渡库（motion.css）
 * ============================================================
 * 新文件：frontend/src/styles/motion.css
 *
 * 7 种入场动画（CSS 类 + 可选 --delay 自定义属性）：
 *
 *   .fade-up       淡入 + 上滑（24px）       -- 最常用
 *   .fade-down     淡入 + 下滑
 *   .fade-in       纯淡入
 *   .scale-in      缩放进入（spring 缓动）
 *   .slide-left    从右滑入
 *   .slide-right   从左滑入
 *   .blur-in       从模糊到清晰（Hero 标题首选）
 *
 * 滚动入场：
 *   .reveal           初始隐藏，添加 .visible 进入视口时显现
 *   .stagger > *      自动按 --i 索引递增 --delay
 *
 * 微交互：
 *   .icon-spin-hover  旋转图标（180° / 360°）
 *   .lift-on-hover    上浮 + 按压
 *
 * 关键帧统一管理：fadeUp / fadeDown / scaleIn / slideLeft / blurIn /
 *                  pageEnter / float-y / float-x / spin / shimmer / pulse
 *
 * 全部走合成层：transform: translate3d(..., 0) 而非 translate，
 * 触发 GPU 加速，滚动 / 动画期间主线程几乎不阻塞。
 *
 * ============================================================
 * 四、Tailwind 对齐（tailwind.config.js）
 * ============================================================
 *
 * 同步 design-tokens 到 Tailwind：
 *   transitionDuration: { instant, fast, base, slow, slower, page }
 *   transitionTimingFunction: { standard, decelerate, accelerate, spring }
 *   boxShadow: { z1, z2, z3, z4, accent }
 *   borderRadius: { sm, md, lg, xl, 2xl }
 *   keyframes + animation: fade-in-up / fade-in / scale-in / blur-in
 *
 * 用法（与 CSS 类混用）：
 *   <div className="transition-all duration-base ease-standard
 *                   hover:shadow-z3 hover:-translate-y-1">
 *
 * ============================================================
 * 五、Antd ConfigProvider 主题接入（App.jsx）
 * ============================================================
 *
 *   - borderRadius / borderRadiusSM / borderRadiusLG 与 --radius-* 对齐
 *   - motionDurationFast / Mid / Slow 与 --motion-* 对齐
 *   - motionEaseIn / Out / InOut 与 --ease-* 对齐
 *   - 控制高度从 44 → 40（更克制），主色按钮带 glow 阴影
 *
 * ============================================================
 * 六、滚动入场 Hook（hooks/useScrollReveal.js）
 * ============================================================
 *
 * 新文件：frontend/src/hooks/useScrollReveal.js
 *
 * 封装 IntersectionObserver + MutationObserver + 后台标签兜底，
 * 复用 AppLayout 与各页面，避免每页重复 50+ 行监听代码。
 *
 * 用法：
 *   import { useScrollReveal } from '../../hooks/useScrollReveal';
 *   useScrollReveal();                              // 默认监听 .reveal
 *   useScrollReveal({ selector: '.fade-up' });      // 自定义选择器
 *   useScrollReveal({ threshold: 0.2, deps: [path] }); // 自定义阈值与依赖
 *
 * ============================================================
 * 七、ArticleCard 重构（components/ArticleCard/index.jsx）
 * ============================================================
 *
 *   - 弃用 Antd Card（自带浏览器样式难覆盖、过渡卡顿）
 *   - 改用 .glass-elevated（自带液态玻璃 + 折射 + GPU 优化）
 *   - onMouseMove 实时设置 --refraction-x/y
 *   - 图片缩放通过 transform 触发，hover 1.06× 缩放
 *   - 标题颜色 0.18s 过渡，hover 变 accent
 *   - 封装 stagger-item 进入动画，配合 useScrollReveal 自动播放
 *
 * ============================================================
 * 八、性能与可用性总结
 * ============================================================
 *
 * 性能：
 *   ✓ 全部过渡仅触发 transform / opacity（合成层）
 *   ✓ will-change 标记动画期间即将变化元素
 *   ✓ contain: layout style paint 隔离子组件重排
 *   ✓ 鼠标光标跟启用 rAF 节流（1 帧最多 1 次写入）
 *   ✓ IntersectionObserver 替代 scroll 事件触发入场
 *   ✓ 滚动监听带 50ms 节流 + 0.4% 阈值去抖，避免 setState 抖动
 *   ✓ backdrop-filter 浏览器不支持时降级为纯色半透明
 *
 * 可用性：
 *   ✓ prefers-reduced-motion: 全局将时长归零并禁用装饰性动画
 *   ✓ 焦点态保留（border-color transition + accent glow）
 *   ✓ 颜色对比度：暗黑模式玻璃边框 0.1 透明度，过滤层 0.65，文字对比 ≥ AA
 *   ✓ 触摸设备：保留 hover 视觉反馈（不会"卡住"在 hover 态）
 *
 * 视觉统一：
 *   ✓ 颜色、阴影、圆角、动画时长、缓动全部从 design-tokens 消费
 *   ✓ Tailwind / Antd / 自定义 CSS 三套体系 token 对齐
 *   ✓ 玻璃变体形成清晰层级（base / elevated / floating / card / pill / button）
 *
 * ============================================================
 * 九、迁移指引
 * ============================================================
 *
 * 1. 在 main.jsx 中按顺序引入：
 *      import './styles/design-tokens.css';
 *      import './styles/glass.css';
 *      import './styles/motion.css';
 *      import './styles/globals.css';   // 兼容旧类名，保留
 *
 * 2. 推荐：新组件用 .glass-elevated / .glass-button / .glass-pill
 *         旧组件可继续用 .glass / .glass-card / .btn-glass（已自动升级）
 *
 * 3. 推荐：用 useScrollReveal 替换各页自建的 IntersectionObserver 代码
 *
 * 4. 推荐：动画类用 .fade-up / .blur-in 等替代散写的 animation: pageEnter ...
 *
 * 5. 推荐：阴影/圆角/动画时长通过 Tailwind 类（duration-base ease-standard shadow-z2）
 *         或 CSS 变量（var(--motion-base) var(--ease-standard) var(--shadow-z2)）
 *         消费，禁止散写具体数值。
 *
 * 6. 暗黑模式：保留现有 .dark 类切换机制，token 自动响应。
 */