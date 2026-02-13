import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Vite 配置文件中访问 process.env 是安全的
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
const host = (process.env as { TAURI_DEV_HOST?: string }).TAURI_DEV_HOST;

// 检测是否为 E2E 测试环境
const isE2ETest = process.env.E2E_TEST === 'true' || process.env.npm_lifecycle_event?.includes('e2e');

console.log('[Vite Config] isE2ETest:', isE2ETest, 'E2E_TEST:', process.env.E2E_TEST);

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [react()],

  // E2E 测试时使用 Mock 替换 Tauri API
  resolve: isE2ETest ? {
    alias: {
      '@tauri-apps/api/core': path.resolve(__dirname, './src/test/mocks/tauri-api.ts'),
    }
  } : undefined,

  // 定义全局变量，用于前端检测 E2E 测试模式
  define: isE2ETest ? {
    'import.meta.env.VITE_E2E_TEST': JSON.stringify('true'),
  } : {},

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host !== undefined ? host : false,
    hmr: host !== undefined
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
