import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000', // Altere para a porta correta onde o seu backend Express está rodando (ex: 3000 ou 5000)
        changeOrigin: true,
        secure: false,
      },
    },
  },
});