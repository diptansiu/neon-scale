# Deployment — NEON//SCALE

## Hosting: GitHub Pages (free, no credit card)

Repository: https://github.com/diptansiu/neon-scale
Production URL: https://diptansiu.github.io/neon-scale/

### CI/CD (GitHub Actions)

`.github/workflows/deploy.yml` runs on every push to `master`:
1. `npm ci` (install dependencies)
2. `npm run build` (TypeScript check + Vite production build → `dist/`)
3. `actions/upload-pages-artifact@v3` (upload `dist/`)
4. `actions/deploy-pages@v4` (publish to GitHub Pages)

### Vite base path

`vite.config.ts` sets `base: "/neon-scale/"` in production (GitHub Pages project site) and `base: "/"` in dev, so assets load correctly on `https://diptansiu.github.io/neon-scale/`.

### One-time manual step: enable GitHub Pages

The GitHub REST API cannot create a first Pages site. You must enable it once in the repo UI:

1. Go to https://github.com/diptansiu/neon-scale/settings/pages
2. Under "Build and deployment" → "Source", select **GitHub Actions**.
3. Click **Save**.

After that, every push to `master` automatically builds and deploys. No credentials, no credit card, no paid tier.

### Headers

Vite `preview`/`dev` sets `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` (needed for SharedArrayBuffer/WebGPU in some contexts). GitHub Pages serves static assets; WASM is served with the correct MIME type by the platform.

### Model downloads

The Real-ESRGAN model (~67 MB fp32) is downloaded from Hugging Face on first use and cached in IndexedDB. Subsequent uses work offline after the PWA assets are cached.
