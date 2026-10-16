/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  publicDir: false,
  build: {
    outDir: '..', // sportsgap/index.html + sportsgap/assets/ (GitHub Pages: /sportsgap/)
    emptyOutDir: false,
    assetsDir: 'assets',
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
