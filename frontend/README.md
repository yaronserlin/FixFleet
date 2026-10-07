# FixFleet Frontend

React 19 + Vite single-page app, installable as a PWA (`vite-plugin-pwa`). UI is MUI v9; routing is React Router v7. For the project overview and full-stack quickstart, see the [root README](../README.md).

## Quick Start

```bash
npm install            # also runs `prepare`, which enables the repo's git hooks
cp .env.example .env
npm run dev            # http://localhost:5173
```

The backend must be running on port 5001. In dev, Vite proxies `/api` and `/uploads` to `http://localhost:5001` (see `vite.config.js`), so the default `VITE_API_URL=/api` works without CORS setup.

## Scripts

<!-- AUTO-GENERATED:SCRIPTS_START -->
| Command | Script | Description |
|---------|--------|-------------|
| `npm run dev` | `vite` | Dev server with HMR on port 5173 (listens on all interfaces) |
| `npm run build` | `vite build` | Production bundle to `dist/` (vendor and MUI split into separate chunks) |
| `npm run preview` | `vite preview` | Serve the built `dist/` locally |
| `npm run lint` | `eslint .` | ESLint 9 flat config (`eslint.config.js`), including `jsx-a11y` and React hooks rules |
| `npm test` | `jest` | Jest + React Testing Library in jsdom |
| `npm run prepare` | `git config core.hooksPath .githooks \|\| true` | Runs on `npm install`; enables the version-bump pre-commit hook |
<!-- AUTO-GENERATED:SCRIPTS_END -->

## Environment

<!-- AUTO-GENERATED:ENV_START -->
| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `VITE_API_URL` | No | Base URL for the Axios `apiClient` | `/api` (relative, works with the dev proxy or a reverse-proxy rewrite) |
<!-- AUTO-GENERATED:ENV_END -->

`VITE_*` values are baked in at build time; rebuild after changing them. See [docs/ENV.md](../docs/ENV.md).

## Layout

```
src/
├── main.jsx, routes.jsx  # App entry and route table
├── components/           # Feature components (Fault, Tool, User, Auth, dialogs, ...)
├── pages/                # Route-level pages (Dashboard, AdminDashboard, EquipmentPage, ...)
├── contexts/             # Auth, Equipment, Fault, Notification, Theme, Tool providers
├── hooks/                # useForm, usePullToRefresh, usePushNotifications, useAuthenticatedBlobUrl
├── services/             # apiClient (Axios + auth refresh interceptor) and per-resource API wrappers
├── constants/            # Roles, fault status, route paths, app version
├── content/              # Legal document text
├── theme/                # MUI theme
└── utils/                # Formatting, validation, media URL helpers
```

## Tests

Tests sit next to their source (`Foo.test.jsx`). The login and legal-flow tests are in `__tests__/`. Mock the network boundary (`apiClient`), and query by role, label, or text. More detail is in [docs/CONTRIBUTING.md](../docs/CONTRIBUTING.md#3-testing-procedures).

## Deployment

Run `npm ci && npm run build`, deploy `dist/` to any static host, and rewrite every non-asset route to `/index.html`. Proxying `/api` and `/uploads` through the frontend domain avoids third-party-cookie logouts in installed PWAs; see [docs/RUNBOOK.md](../docs/RUNBOOK.md).
