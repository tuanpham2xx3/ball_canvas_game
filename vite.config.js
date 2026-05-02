import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html',
        builder: './builder.html',
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
