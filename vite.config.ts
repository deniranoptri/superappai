import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';

// Trik agar __dirname bisa berjalan normal di sistem ES Module (type: "module")
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  // loadEnv membaca environment variable dari sistem (termasuk Netlify)
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    // Hapus tailwindcss() dari daftar plugin karena Tailwind v3 pakai PostCSS
    plugins: [react()], 
    
    define: {
      // Ini sudah benar! Ini yang bikin process.env.GEMINI_API_KEY di App.tsx kamu bisa terbaca
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    
    resolve: {
      alias: {
        // Alias '@' biasanya diarahkan ke folder './src', bukan '.' root
        '@': path.resolve(__dirname, './src'),
      },
    },
    
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
