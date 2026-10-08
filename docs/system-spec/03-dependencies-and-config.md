# 03 — Dependencies & Configuration

[← Index](README.md) · [01 Architecture](01-architecture-and-layers.md) · [02 Database](02-database-and-schemas.md) · **03 Dependencies & Config** · [04 File Inventory](04-file-inventory.md) · [05 API & Workflows](05-api-and-workflows.md)

## 3.1 Package Manifests

| Manifest | Package name | Version | Module system | Purpose |
|---|---|---|---|---|
| `package-lock.json` (root) | `MaintenanceSystemApp` | — | — | Empty stub lockfile (`"packages": {}`); there is **no root `package.json`** and no workspace tooling. Each app is installed separately. |
| `backend/package.json` | `backend` | 1.0.8 | CommonJS | Express API. Also declares a non-standard `"defaultLanguage": "en"` key. |
| `backend/package-lock.json` | — | lockfile v3 | — | Pins the backend tree. |
| `frontend/package.json` | `frontend` | 1.0.8 | ESM (`"type": "module"`) | React SPA / PWA. |
| `frontend/package-lock.json` | — | lockfile v3 | — | Pins the frontend tree. |

Frontend and backend versions are kept identical by `.githooks/pre-commit` (see §3.6).

### 3.1.1 npm scripts

| App | Script | Command | Role |
|---|---|---|---|
| backend | `build` | `node --check app.js` | Syntax check only (no bundling/transpile). |
| backend | `start` | `node app.js` | Production start. |
| backend | `dev` | `nodemon app.js` | Hot-reload dev server. |
| backend | `seed` | `node seeders/seeder.js` | Wipe + seed demo data (refuses in production). |
| backend | `create-superadmin` | `node scripts/createSuperAdmin.js` | Create/reset the platform superadmin (`-- --email <e> [--name "<n>"]`). |
| backend | `test` | `jest --runInBand --detectOpenHandles --forceExit` | Integration/unit tests against `mongodb-memory-server`. |
| frontend | `dev` | `vite` | Dev server on :5173 with `/api` and `/uploads` proxied to :5001. |
| frontend | `build` | `vite build` | Production bundle + generated service worker into `dist/`. |
| frontend | `test` | `jest` | jsdom component/unit tests. |
| frontend | `lint` | `eslint .` | Flat-config lint. |
| frontend | `preview` | `vite preview` | Serve the built bundle (port 4173 — allowed by backend dev CORS). |
| frontend | `prepare` | `git config core.hooksPath .githooks \|\| true` | Installs the repo's git hooks on `npm install`. |

---

## 3.2 Backend Dependencies (`backend/package.json`)

Resolved versions come from `backend/package-lock.json`.

| Package | Declared | Resolved | Category | Exact role in the application |
|---|---|---|---|---|
| `express` | ^5.2.1 | 5.2.1 | Framework | HTTP server, routing (`routes/*.js`), JSON/urlencoded parsing; Express 5 async error propagation. |
| `mongoose` | ^8.24.4 | 8.24.4 | Persistence (ODM) | Schemas/models, queries, population, `sanitizeFilter`, `mongoose.trusted`, `mongoose.mongo.GridFSBucket` for media. |
| `jsonwebtoken` | ^9.0.3 | 9.0.3 | Security | Sign/verify HS256 access (60 min) and refresh (7 d) tokens (`authService`, `authMiddleware`). |
| `bcrypt` | ^6.0.0 | 6.0.0 | Security | Password hashing (10 rounds) and comparison; superadmin temporary passwords. |
| `helmet` | ^8.3.0 | 8.3.0 | Security | Security headers; CSP default directives + `frame-ancestors` = self + allowed origins; `crossOriginResourcePolicy: cross-origin` so an SPA on another origin can load media. |
| `cors` | ^2.8.6 | 2.8.6 | Security | Origin allow-list from `FRONTEND_URL` (+ localhost:5173/4173 outside production); `credentials: true` for the refresh cookie. |
| `express-rate-limit` | ^8.7.0 | 8.7.0 | Security | Global limiter (500 / 15 min), auth limiter (20 / 15 min), per-email password-reset limiter (3 / 15 min). |
| `cookie-parser` | ^1.4.7 | 1.4.7 | Utility | Parses the `refreshToken` cookie for `/auth/refresh` and `/auth/logout`. |
| `multer` | ^2.4.0 | 2.4.0 | Utility (uploads) | Multipart parsing to memory buffers; 50 MB limit; MIME filter (jpeg/png/webp/gif/pdf). |
| `web-push` | ^3.6.7 | 3.6.7 | Integration | VAPID-signed Web Push delivery (`pushService.sendToUsers`). |
| `dotenv` | ^17.4.2 | 17.4.2 | Configuration | Loads `backend/.env` in `app.js`, the seeder and both scripts. |
| `jest` *(dev)* | ^30.5.1 | 30.5.1 | Testing | Test runner (`testEnvironment: node`, 30 s timeout). |
| `mongodb-memory-server` *(dev)* | ^11.2.0 | 11.2.0 | Testing | Ephemeral MongoDB per test file; binaries cached in `.mongo-binaries/`. |
| `supertest` *(dev)* | ^7.2.2 | 7.2.2 | Testing | HTTP assertions against the exported `app`. |
| `nodemon` *(dev)* | ^3.1.14 | 3.1.14 | Tooling | `npm run dev` auto-restart. |

**Node built-ins used:** `crypto` (UUIDs, random tokens, SHA-256), `stream.Readable` (GridFS upload), `util.parseArgs` (superadmin CLI), `fs`/`path` (migration script), global `fetch` (EmailJS; requires Node ≥ 18).

---

## 3.3 Frontend Dependencies (`frontend/package.json`)

| Package | Declared | Resolved | Category | Exact role in the application |
|---|---|---|---|---|
| `react` / `react-dom` | ^19.3.0 | 19.3.0 | Framework | UI runtime; `createRoot` in `main.jsx`; `React.lazy` route splitting. |
| `react-router-dom` | ^7.18.3 | 7.18.3 | Routing | `BrowserRouter`, route table in `routes.jsx`, `useParams` / `useSearchParams` / `useNavigate`. |
| `@mui/material` | ^9.4.0 | 9.4.0 | UI kit | All layout and controls; theme via `getAppTheme(mode)`. |
| `@mui/icons-material` | ^9.4.0 | 9.4.0 | UI kit | Icons (nav, notifications, actions). |
| `@emotion/react` | ^11.14.0 | 11.14.0 | Styling (peer) | MUI styling engine. |
| `@emotion/styled` | ^11.14.1 | 11.14.1 | Styling (peer) | Backs MUI `styled()` (e.g. `VisuallyHiddenInput`). |
| `axios` | ^1.20.0 | 1.20.0 | HTTP | `apiClient` instance, interceptors, upload progress, blob downloads. |
| `recharts` | ^3.10.1 | 3.10.1 | Charts | 14-day fault trend (`Dashboard.jsx`), 12-month growth charts (`SuperAdminDashboard.jsx`). |
| `@mui/x-data-grid` | ^9.13.0 | 9.13.0 | UI kit | **Not imported anywhere in `src/`.** |
| `notistack` | ^3.0.2 | 3.0.2 | UI | **Not imported** (toasts use MUI `Snackbar` in `NotificationContext`). |
| `@fullcalendar/react`, `@fullcalendar/daygrid`, `fullcalendar` | ^6.1.21 | 6.1.21 | UI | **Not imported.** |
| `@fontsource/roboto` | ^5.3.0 | 5.3.0 | Fonts | **Not imported** (Inter is loaded from Google Fonts in `index.html`). |
| `dotenv` | ^17.4.2 | 17.4.2 | Config | **Not imported** (Vite reads `.env` natively). |
| `vite` *(dev)* | ^7.3.6 | 7.3.6 | Build | Dev server, proxy, production bundling with `manualChunks` (`vendor`, `mui`). |
| `@vitejs/plugin-react` *(dev)* | ^4.7.0 | 4.7.0 | Build | JSX + Fast Refresh. |
| `vite-plugin-pwa` *(dev)* | ^1.3.0 | 1.3.0 | Build / PWA | Manifest, Workbox `generateSW` (precache `**/*.{js,css,html,ico,png,svg}`), `importScripts: ['push-sw.js']`, `virtual:pwa-register`. |
| `jest` / `babel-jest` / `jest-environment-jsdom` *(dev)* | ^30.5.1 | 30.5.1 | Testing | Test runner, transform, DOM environment. |
| `@babel/preset-env` / `@babel/preset-react` *(dev)* | ^7.29.7 | 7.29.7 | Testing | Transpile for Jest (`babel.config.cjs`), automatic JSX runtime. |
| `@testing-library/react` *(dev)* | ^16.3.3 | 16.3.3 | Testing | Component rendering/queries. |
| `@testing-library/jest-dom` *(dev)* | ^7.0.1 | 7.0.1 | Testing | DOM matchers (`jest.setup.js`). |
| `eslint`, `@eslint/js` *(dev)* | ^9.39.5 | 9.39.5 | Lint | Flat config. |
| `eslint-plugin-react-hooks` *(dev)* | ^5.2.0 | 5.2.0 | Lint | `recommended-latest`. |
| `eslint-plugin-react-refresh` *(dev)* | ^0.5.7 | 0.5.7 | Lint | `only-export-components` (off for `src/contexts/**`). |
| `eslint-plugin-jsx-a11y` *(dev)* | ^6.10.2 | 6.10.2 | Lint / a11y | `flatConfigs.recommended`. |
| `globals` *(dev)* | ^17.12.0 | 17.12.0 | Lint | Browser/node/jest globals. |
| `@types/react`, `@types/react-dom` *(dev)* | ^19.3.0 | 19.3.0 | Tooling | Editor IntelliSense only (no TypeScript build). |

**External runtime resources:** Google Fonts (Inter 400/500/600/700) via `<link>` in `frontend/index.html`; EmailJS REST API (`https://api.emailjs.com/api/v1.0/email/send`) from the backend; browser push services via `web-push`.

---

## 3.4 Environment Variables

### 3.4.1 Backend (`backend/.env`; template `backend/.env.example`)

| Key | Required | Default when unset | Consumed in | Responsibility |
|---|---|---|---|---|
| `PORT` | No | `5001` | `app.js` | HTTP listen port (only when run directly). |
| `NODE_ENV` | No | — | `app.js`, `errorMiddleware`, `authController`, `logger`, `mailer`, rate limiters, seeder | `production`: secure cookies, masked 5xx, no localhost CORS, logger cutoff `warn`, mailer must be configured, seeder refuses. `test`: rate limits off, logs silenced, `connectDB` skipped. |
| `MONGO_URI` | **Yes** | — | `config/db.js`, scripts | MongoDB connection string. Connection failure → `process.exit(1)`. |
| `JWT_SECRET` | **Yes** | — | `authService`, `authMiddleware` | HS256 secret for access tokens (and base of the refresh fallback). |
| `JWT_REFRESH_SECRET` | No | `${JWT_SECRET}_refresh` | `authService.getRefreshSecret` | Separate secret for refresh tokens. Not listed in `.env.example`. |
| `FRONTEND_URL` | Prod: **Yes** | `http://localhost:5173` | `app.js` (CORS + CSP `frame-ancestors`), `authService.requestPasswordReset` | Comma-separated allowed origins (trailing slashes stripped). The **first** entry is the base of password-reset links. |
| `COOKIE_DOMAIN` | No | host-only cookie | `authController.getCookieOptions` | Shared cookie domain (e.g. `.example.com`) for app/API on sibling subdomains; in production it also switches `sameSite` to `none`. |
| `VAPID_PUBLIC_KEY` | No | push disabled | `pushService` | Web Push public key (also served to clients). |
| `VAPID_PRIVATE_KEY` | No | push disabled | `pushService` | Web Push private key. Malformed keys → push disabled with an error log (no crash). |
| `VAPID_SUBJECT` | No | `mailto:admin@example.com` | `pushService` | Contact URI required by the VAPID spec. |
| `EMAILJS_SERVICE_ID` | No* | — | `utils/mailer.js` | EmailJS service. *All four EmailJS keys must be set, otherwise dev logs the email and production throws (logged; the reset endpoint still returns 200). |
| `EMAILJS_TEMPLATE_ID` | No* | — | `utils/mailer.js` | Template receiving `email`, `to_email`, `subject`, `message`, `link`. |
| `EMAILJS_PUBLIC_KEY` | No* | — | `utils/mailer.js` | Sent as `user_id`. |
| `EMAILJS_PRIVATE_KEY` | No* | — | `utils/mailer.js` | Sent as `accessToken`. |
| `LOG_LEVEL` | No | `warn` (prod) / `debug` (other) | `utils/logger.js` | One of `error, warn, info, http, debug`. Not in `.env.example`. |
| `TEST_LOGS` | No | — | `utils/logger.js` | Any value re-enables logging under `NODE_ENV=test`. |
| `SUPERADMIN_PASSWORD` | No | random 18-byte base64url, printed once | `scripts/createSuperAdmin.js` | Explicit superadmin password (min 12 chars). |
| `MONGOMS_DOWNLOAD_DIR` | Test only | set by `__tests__/helpers/setup.js` to `<repo>/.mongo-binaries` | `mongodb-memory-server` | Cache directory for the in-memory MongoDB binary. |

### 3.4.2 Frontend (`frontend/.env`; template `frontend/.env.example`)

| Key | Default | Consumed in | Responsibility |
|---|---|---|---|
| `VITE_API_URL` | `/api` | `services/apiClient.js` (baseURL and refresh URL), `utils/mediaUtils.js#getMediaUrl`, `hooks/useAuthenticatedBlobUrl.js#isTrustedOrigin` | API base. Relative (`/api`) for same-origin/proxy deployments; absolute (`https://api.example.com/api`) for split hosting — media URLs are then rewritten to the API origin. |

In Jest, `import.meta` is rewritten to `{ env: process.env }` by an inline Babel plugin in `frontend/babel.config.cjs`.

---

## 3.5 Configuration Files

| File | Responsibility |
|---|---|
| `backend/config/db.js` | Enables `sanitizeFilter`; connects to `MONGO_URI`; exits the process on failure. |
| `backend/constants/auth.js` | `ACCESS_TOKEN_EXPIRY '60m'`, `REFRESH_TOKEN_EXPIRY '7d'`, `ACCESS_COOKIE_MAX_AGE 3 600 000` (unused since access cookies were removed), `REFRESH_COOKIE_MAX_AGE 604 800 000`, `BCRYPT_SALT_ROUNDS 10`, `REFRESH_REUSE_GRACE_MS 30 000`, `PASSWORD_RESET_TOKEN_TTL_MS 1 800 000`. |
| `backend/constants/rateLimits.js` | `AUTH_RATE_LIMIT {15 min, 20}`, `GENERAL_RATE_LIMIT {15 min, 500}`, `PASSWORD_RESET_RATE_LIMIT {15 min, 3}`. |
| `backend/constants/pagination.js` | `DEFAULT_PAGE 1`, `DEFAULT_LIMIT 20`, `MAX_LIMIT 100`. |
| `backend/constants/notifications.js` | Types, `NOTIFICATION_PAGE_SIZE {DEFAULT 20, MAX 100}`, `ANNOUNCEMENT_LIMITS {TITLE_MAX 120, BODY_MAX 1000}`. |
| `backend/constants/scheduleStatus.js` | Statuses and `DUE_SOON_THRESHOLD_HOURS 20`. |
| `backend/constants/roles.js`, `faultStatus.js`, `audit.js` | Enumerations shared by schemas and services (`AUDIT_RETENTION_DAYS 365`). |
| `backend/jest.config.js` | `testEnvironment: node`, `testMatch: **/__tests__/**/*.test.js`, `testTimeout: 30000`. |
| `frontend/vite.config.js` | React plugin; PWA manifest (name/short_name `FixFleet`, theme `#1976d2`, background `#ffffff`, `display: standalone`, icons 192/512 any + maskable + SVG); Workbox `importScripts: ['push-sw.js']`; dev server `host: true`, port 5173, proxy `/api` and `/uploads` → `http://localhost:5001`; Rollup `manualChunks` `vendor` (react, react-dom, react-router-dom) and `mui` (@mui/material, @mui/icons-material). |
| `frontend/eslint.config.js` | Flat config: recommended JS, react-hooks, react-refresh (vite), jsx-a11y; `no-unused-vars` ignoring `^[A-Z_]`; contexts exempt from `only-export-components`; jest globals for tests. Ignores `dist`, `node_modules`, `coverage`. |
| `frontend/babel.config.cjs` | Jest-only Babel: preset-env (current Node), preset-react (automatic), `import.meta` → `{ env: process.env }`. |
| `frontend/jest.config.js` | jsdom environment, `babel-jest` for `.js/.jsx`, `setupFilesAfterEnv: jest.setup.js`. |
| `frontend/jest.setup.js` | Loads `@testing-library/jest-dom`; polyfills `TextEncoder` / `TextDecoder`. |
| `frontend/index.html` | SPA shell: `theme-color #0F172A`, favicons, Apple PWA meta (standalone — required for iOS Web Push), Inter font, `#root`, `/src/main.jsx`. |
| `frontend/src/index.css` | Global reset, Inter font stack, reduced-motion rules, scrollbars, focus ring `#2563EB`, `#root` fade-in, accessibility classes `.a11y-high-contrast`, `.a11y-underline-links`. |
| `frontend/src/theme/index.js` | `getAppTheme(mode)` — MUI palette (light/dark), typography (Inter), component overrides. |
| `.vscode/settings.json` | Editor chat-tool auto-approve list (`npm run build`, `npx eslint`, `npm test`). Listed in `.gitignore` but tracked. |
| `.gitignore`, `backend/.gitignore`, `frontend/.gitignore` | Ignore `node_modules`, `dist`, `.env*` (except `.env.example`), `uploads/*`, `.mongo-binaries/`, editor files, `.agents/*`, `.claude/*`. |

---

## 3.6 Build, Versioning & CI

| Item | Behaviour |
|---|---|
| `.githooks/pre-commit` | Runs on `main` only. If the staged `frontend/package.json` version equals `HEAD`'s, runs `npm version patch` in `frontend`; otherwise keeps the manual bump. Copies the version into `backend/package.json` and stages both manifests and lockfiles. Skip with `--no-verify`. Enabled by the frontend `prepare` script. |
| `.github/workflows/increment-build-version.yml` | Workflow name "Build". On push to any branch: checkout → `npm ci` → `npm run build` in `frontend/`. **No backend build, no tests, no lint in CI.** |
| App version display | `frontend/src/constants/appVersion.js` reads the `package.json` version → shown in `LegalFooter`. |
| Service-worker updates | `main.jsx` registers the SW (`autoUpdate`) and calls `registration.update()` hourly and on every return to foreground. |

---

## 3.7 Non-source Assets & Tooling Folders

| Path | Content |
|---|---|
| `frontend/public/` | `favicon.svg/.ico/-16x16/-32x32.png`, `apple-touch-icon.png`, `logo.svg`, `pwa-192x192.png`, `pwa-512x512.png`, `pwa-maskable-192x192.png`, `pwa-maskable-512x512.png`, `push-sw.js` (service-worker push handlers). |
| `media/` | `demo.png`, `equipment.png` — README screenshots. |
| `docs/user-guide/` | `index.html` (illustrated end-user guide) + 29 `.webp` screenshots + `fixfleet-mark.svg`. |
| `docs/API.md`, `ENV.md`, `RUNBOOK.md`, `CONTRIBUTING.md` | Hand-written operational docs (pre-existing). |
| `backend/coverage/coverage-summary.json` | Committed, **stale** Istanbul summary (59 % lines) referencing absolute local paths and only part of the current files. |
| `.claude/plans/multi-tenant-migration.md` | Historical design document (2026-09-14) for the multi-tenant migration. |
| `.agents/` | Local AI-agent tooling (agents, rules, skills, workflows) — git-ignored. |
| `test.sock` | Stray Unix socket in the repo root (untracked). |
