import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 하위 경로(/korea-now/)에 배포되므로 base를 고정한다.
export default defineConfig({
  plugins: [react()],
  base: '/korea-now/',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
