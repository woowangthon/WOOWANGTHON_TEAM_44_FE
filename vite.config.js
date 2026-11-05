import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 로컬: BE의 npm run dev(3001)로 /api 프록시. 배포: VITE_API_BASE에 BE 주소
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:3001' } },
});
