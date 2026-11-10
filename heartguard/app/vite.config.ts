/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  publicDir: false,
  build: {
    outDir: '..', // heartguard/index.html + heartguard/assets/ (GitHub Pages: /heartguard/)
    emptyOutDir: false,
    assetsDir: 'assets',
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
