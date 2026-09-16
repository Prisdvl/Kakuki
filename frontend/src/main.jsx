import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
// 顺序很重要：tokens → glass → motion → globals → ui
// 1) 设计令牌（唯一变量源：颜色 / 圆角 / 排版 / 间距 / 时长 / 缓动）
// 2) 玻璃组件样式（依赖 tokens）
// 3) 动效样式（依赖 tokens）
// 4) 旧 globals（兼容旧类名，不再新增样式）
// 5) 统一组件层（.ui-*，最后加载以确保新类优先级）
import "./styles/design-tokens.css";
import "./styles/glass.css";
import "./styles/motion.css";
import "./styles/globals.css";
import "./styles/ui.css";
// 6) 功能模块样式（打卡 / 归档时间线 / 设置面板）
import "./styles/checkin.css";
import "./styles/timeline.css";
import "./styles/settings.css";
import "./styles/projects.css";
import "./styles/stats.css";
import "highlight.js/styles/atom-one-dark.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);