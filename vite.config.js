import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: "/shopping-list-app/" // שינוי לפי שם הרפו שלך
})
