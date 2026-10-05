/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

// 공공데이터 JSON은 caregap/data/ 에 있다(파이썬 스크립트가 생성). 개발 서버에서도 ./data/ 로 열리게 한다.
function serveData(): Plugin {
  const dataDir = path.resolve(__dirname, '../data');
  return {
    name: 'caregap-serve-data',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url || '').split('?')[0];
        const m = url.match(/\/data\/(.+\.json)$/);
        if (!m) return next();
        const file = path.join(dataDir, m[1]);
        if (!file.startsWith(dataDir) || !fs.existsSync(file)) return next();
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        fs.createReadStream(file).pipe(res);
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), serveData()],
  publicDir: false,
  build: {
    outDir: '..', // caregap/index.html + caregap/assets/ (GitHub Pages: /caregap/)
    emptyOutDir: false,
    assetsDir: 'assets',
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
