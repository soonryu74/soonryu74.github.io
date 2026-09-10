import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 하위 경로(/edu/lms/)에 배포되므로 base를 고정한다. korea-now와 같은 방식.
export default defineConfig({
  plugins: [react()],
  base: '/edu/lms/',
  build: { outDir: 'dist', sourcemap: false },
})
