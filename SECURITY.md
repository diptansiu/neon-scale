# Security Policy — NEON//SCALE

## Supported versions
Only the latest `master` branch is actively maintained.

## Security overview

- **No server-side processing by default.** Local AI runs entirely in the browser; no user images are uploaded unless the user explicitly chooses Cloud AI and grants consent.
- **No secrets in frontend.** No Hugging Face tokens, API keys, or credentials are embedded in frontend code or the public build.
- **Cloud AI is optional and consent-gated.** A privacy dialog must be confirmed before the first cloud upload. The user can always stay in Local AI mode.
- **File validation.** Uploaded files are validated by MIME type (`image/*`), size (≤25 MB), and dimension (≤8192 px). Invalid/corrupt images are rejected.
- **No image retention by the app.** Processed images are held only in browser memory and served via revocable object URLs. They are not stored on any application server.
- **Cloud provider (Hugging Face ZeroGPU)** may temporarily store uploaded images and results per its own retention policy; this is disclosed in the consent dialog.
- **Dependencies kept minimal.** Production deps: `onnxruntime-web`, `react`, `react-dom`, `idb`.

## Vulnerability reporting

There is no security contact or bounty program. If you find a security issue, open a public issue in the repository or contact the repository owner.

## Dependency scanning

Run `npm audit` to review known vulnerabilities in the dependency tree. Do not blindly upgrade major packages; evaluate breaking changes first.

## Scope
This is a personal, zero-budget project. It does not process sensitive data unless the user chooses to upload it.
