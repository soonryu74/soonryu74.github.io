/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  publicDir: false,
  build: {
    outDir: '..', // bokji/index.html + bokji/assets/ (GitHub Pages: /bokji/)
    emptyOutDir: false,
    assetsDir: 'assets',
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
