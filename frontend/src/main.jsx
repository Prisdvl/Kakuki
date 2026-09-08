import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
// 顺序很重要：tokens → glass → motion → globals
// 1) 设计令牌（变量定义）
// 2) 玻璃组件样式（依赖 tokens）
// 3) 动效样式（依赖 tokens）
// 4) 旧 globals（兼容旧类名）
import "./styles/design-tokens.css";
import "./styles/glass.css";
import "./styles/motion.css";
import "./styles/globals.css";
import "highlight.js/styles/atom-one-dark.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);