import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' делает все пути к файлам относительными —
// благодаря этому сборка будет работать на GitHub Pages
// в любом репозитории, без ручной правки пути.
export default defineConfig({
  plugins: [react()],
  base: './',
})
