import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vitest config lives alongside Vite config so the scoring tests run with the
// same module resolution as the app.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
