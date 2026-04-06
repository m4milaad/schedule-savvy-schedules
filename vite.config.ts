import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";

/**
 * Custom Vite plugin that runs after the production build completes.
 * Replaces __SUPABASE_URL__ and __BUILD_HASH__ placeholders in the
 * service worker with real values (env var + unique build hash).
 */
function serviceWorkerInject(mode: string): Plugin {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  return {
    name: "service-worker-inject",
    apply: "build",
    closeBundle() {
      const swPath = path.resolve(__dirname, "dist/service-worker.js");
      if (!fs.existsSync(swPath)) return;

      let content = fs.readFileSync(swPath, "utf-8");
      const buildHash =
        env.VITE_BUILD_HASH ||
        process.env.GITHUB_SHA?.slice(0, 12) ||
        "local-build";
      content = content
        .replace(/__SUPABASE_URL__/g, env.VITE_SUPABASE_URL || "")
        .replace(/__BUILD_HASH__/g, buildHash);
      fs.writeFileSync(swPath, content);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: './', 
  server: {
    host: "::",
    port: 8080,
    fs: {
      // Exclude android folder from Vite's file system access
      deny: ['**/android/**']
    }
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    serviceWorkerInject(mode),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'radix-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-dropdown-menu',
          ],
          'supabase': ['@supabase/supabase-js'],
          'utils': ['date-fns', 'clsx', 'tailwind-merge'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: mode === 'development',
  },
  optimizeDeps: {
    // Exclude android folder from dependency optimization
    exclude: ['android']
  },
}));
