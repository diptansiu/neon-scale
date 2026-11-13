# Deployment

Static hosting only. Build with `npm run build`, deploy `dist/`.

Recommended headers:
- Cross-Origin-Opener-Policy: same-origin
- Cross-Origin-Embedder-Policy: require-corp

Options: GitHub Pages, Cloudflare Pages, Netlify free tier. Ensure WASM assets served with correct MIME. Model downloads from HuggingFace require network on first use; cached afterward.