import { defineConfig } from 'vite';

// --- Base path -------------------------------------------------------------
// On a GitHub Pages *project page* the site lives at https://user.github.io/REPO/,
// so the build needs base '/REPO/'. We derive REPO automatically from the
// GITHUB_REPOSITORY env var that GitHub Actions always sets, so it works
// whatever you name the repository — no manual edit needed.
// Locally (and for root domains / Netlify) base stays '/'.
// Override anytime with VITE_BASE (e.g. VITE_BASE=/ for a custom domain).
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1];
const base =
  process.env.VITE_BASE ??
  (process.env.GITHUB_ACTIONS === 'true' && repo ? `/${repo}/` : '/');

export default defineConfig({
  base,
  build: {
    target: 'es2020',
    outDir: 'dist',
    chunkSizeWarningLimit: 1500, // three.js is large; silences noisy warnings
  },
  server: {
    open: true,
  },
});
