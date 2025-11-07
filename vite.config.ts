import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, join } from 'path';
import {
  copyFileSync,
  mkdirSync,
  existsSync,
  cpSync,
  renameSync,
  readdirSync,
  statSync,
  rmdirSync,
  readFileSync,
  writeFileSync,
} from 'fs';

const browser = process.env.BROWSER || 'chrome';
const isDev = process.env.NODE_ENV !== 'production';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-extension-files',
      closeBundle() {
        const distPath = resolve(__dirname, `dist/${browser}`);
        mkdirSync(distPath, { recursive: true });

        const srcUiPath = join(distPath, 'src', 'ui');
        if (existsSync(srcUiPath)) {
          const files = readdirSync(srcUiPath);
          files.forEach((file) => {
            const srcFile = join(srcUiPath, file);
            const destFile = join(distPath, file);
            if (statSync(srcFile).isFile()) {
              renameSync(srcFile, destFile);
            }
          });

          const srcDir = join(distPath, 'src');
          if (existsSync(srcDir)) {
            rmdirSync(srcDir, { recursive: true });
          }
        }

        const baseManifestPath = resolve(__dirname, 'manifests/base.json');
        const browserManifestPath = resolve(
          __dirname,
          `manifests/${browser === 'firefox' ? 'firefox' : 'chrome'}.json`
        );

        const baseManifest = JSON.parse(readFileSync(baseManifestPath, 'utf-8'));
        const browserManifest = JSON.parse(
          readFileSync(browserManifestPath, 'utf-8')
        );

        const mergedManifest = { ...baseManifest, ...browserManifest };

        writeFileSync(
          resolve(distPath, 'manifest.json'),
          JSON.stringify(mergedManifest, null, 2)
        );

        const iconsPath = resolve(__dirname, 'public/icons');
        if (existsSync(iconsPath)) {
          const iconsDistPath = resolve(distPath, 'icons');
          mkdirSync(iconsDistPath, { recursive: true });
          cpSync(iconsPath, iconsDistPath, { recursive: true });
        }
      },
    },
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: `dist/${browser}`,
    emptyOutDir: true,
    sourcemap: isDev ? 'inline' : false,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background/index.ts'),
        popup: resolve(__dirname, 'src/ui/popup.html'),
        tags: resolve(__dirname, 'src/ui/tags.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.html')) {
            return '[name][extname]';
          }
          return '[name][extname]';
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
  },
});
