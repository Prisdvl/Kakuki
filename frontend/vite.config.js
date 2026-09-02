import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 可选：运行 ANALYZE=true npm run build 时生成包体积报告
const analyzePlugin = async () => {
  if (process.env.ANALYZE !== 'true') return null
  try {
    const { visualizer } = await import('rollup-plugin-visualizer')
    return visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/stats.html',
    })
  } catch {
    return null
  }
}

// 兼容 npm / pnpm / yarn 的包名提取
function getPackageName(id) {
  const match = id.match(/node_modules\/(?:\.pnpm\/[^/]+\/node_modules\/)?((?:@[^/]+\/)?[^/]+)/)
  return match?.[1]
}

const reactEcosystem = new Set([
  'react',
  'react-dom',
  'react-router',
  'react-router-dom',
  '@remix-run/router',
  'scheduler',
  'loose-envify',
])

export default defineConfig(async () => ({
  plugins: [react(), await analyzePlugin()].filter(Boolean),
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/media': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/music-api': {
        target: 'https://163api.qijieya.cn',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/music-api/, ''),
      },
      '/leetcode-api': {
        target: 'https://leetcode.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/leetcode-api/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://leetcode.com/',
          'Origin': 'https://leetcode.com',
        },
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          const pkg = getPackageName(id)
          // React 生态统一打包，避免 scheduler/loose-envify 等依赖落入 vendor 形成循环
          if (reactEcosystem.has(pkg)) return 'react'
          if (pkg === 'lucide-react') return 'icons'
          if (pkg === 'zustand') return 'state'
          if (pkg === 'axios') return 'http'
          if (pkg === '@ant-design/icons') return 'antd-icons'
          if (pkg === 'antd') {
            // 仅拆分体积大且相对独立的 Table，避免循环依赖
            if (id.includes('/table')) return 'antd-table'
            return 'antd'
          }
          return 'vendor'
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
}))
