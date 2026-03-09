import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Inline design tokens — the Sass preprocessor runs before Vite resolves aliases,
        // so @import with '@' or relative paths can cause infinite loops/hangs.
        // Inlining is the most reliable way to share tokens across all SFCs.
        additionalData: `
          $color-bg-base: #0a0e1a;
          $color-bg-surface: #111827;
          $color-bg-elevated: #1f2937;
          $color-primary-400: #818cf8;
          $color-primary-500: #6366f1;
          $color-primary-600: #4f46e5;
          $color-accent-300: #67e8f9;
          $color-accent-400: #22d3ee;
          $color-success: #4ade80;
          $color-warning: #fbbf24;
          $color-danger: #f87171;
          $color-text-primary: #f9fafb;
          $color-text-muted: #6b7280;
          $gravity-kana-color: rgba(99, 102, 241, 0.10);
          $radius-sm: 0.375rem;
          $radius-md: 0.75rem;
          $radius-lg: 1.25rem;
          $radius-xl: 2rem;
          $ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
          $ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
          $ease-gravity: cubic-bezier(0.1, 0.3, 0.6, 1.0);
        `
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      // 開發時代理 API 請求到 Node 伺服器
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
