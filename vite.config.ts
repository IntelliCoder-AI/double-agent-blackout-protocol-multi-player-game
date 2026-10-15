import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], build: { sourcemap: false, rollupOptions: { output: { manualChunks: { three: ['three', '@react-three/fiber'] } } } }, server: { allowedHosts: ['localhost', '127.0.0.1'] } });
