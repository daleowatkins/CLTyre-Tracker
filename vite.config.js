import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
base: '/CLTyre-Tracker/', // REPLACE THIS with your GitHub repository name, e.g. '/tyre-tracker/'
})
