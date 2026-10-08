# Environment Variables Reference

This document outlines all environment variables utilized across the FixFleet backend and frontend applications.

---

<!-- AUTO-GENERATED:ENV_START -->
## Backend Environment Variables (`backend/.env`)

| Variable | Required | Description | Default / Example | Valid Values / Notes |
|----------|----------|-------------|-------------------|----------------------|
| `PORT` | No | Network port on which the Express HTTP server listens | `5001` | Any valid open port number |
| `NODE_ENV` | No | Operating environment mode controlling logging verbosity, security policies, and error disclosures | `development` | `development`, `production`, `test` |
| `MONGO_URI` | Yes | MongoDB connection string (local database or remote MongoDB Atlas cluster) | `mongodb://localhost:27017/maintenance_db` | Standard MongoDB connection URI format |
| `JWT_SECRET` | Yes | Cryptographic secret key used for signing and verifying JSON Web Tokens for authentication | `super_secret_jwt_key_change_in_production_32chars` | Strong random string (minimum 32 characters recommended) |
| `JWT_REFRESH_SECRET` | No | Cryptographic secret key used for signing and verifying refresh tokens. Falls back to a derivative of `JWT_SECRET` if unset | `${JWT_SECRET}_refresh` | Strong random string (minimum 32 characters recommended); set explicitly in production so refresh tokens don't share key material with access tokens |
| `FRONTEND_URL` | Yes (in production) | Comma-separated list of allowed origins permitted by CORS and CSP frame-ancestors | `http://localhost:5173` | Fully qualified URL(s) without trailing slash (e.g. `http://localhost:5173,https://app.example.com`). The first entry is also the base URL for password reset links |
| `COOKIE_DOMAIN` | No | Shares auth cookies across subdomains of the same registrable domain (e.g. `app.example.com` + `api.example.com`) by setting the cookie's `Domain` attribute, instead of the default host-only scope. Only needed when the frontend and API are on different subdomains -- see `docs/RUNBOOK.md` issue #6. | unset (host-only cookie) | A leading-dot domain, e.g. `.example.com` |
| `LOG_LEVEL` | No | Minimum severity level `utils/logger.js` emits | `warn` in production, `debug` otherwise | `error`, `warn`, `info`, `http`, `debug` |
| `VAPID_PUBLIC_KEY` | No | Web Push (VAPID) public key. Together with `VAPID_PRIVATE_KEY`, enables PWA push notifications for new fault reports and admin announcements. With either unset, push is disabled and notifications are delivered to the in-app feed only | unset (push disabled) | Base64url key from `npx web-push generate-vapid-keys`; the same value is served to browsers via `GET /api/notifications/push/public-key` |
| `VAPID_PRIVATE_KEY` | No | Web Push (VAPID) private key, paired with `VAPID_PUBLIC_KEY`. Never sent to clients | unset (push disabled) | Base64url key from `npx web-push generate-vapid-keys`; treat as a secret |
| `VAPID_SUBJECT` | No | Contact URI the push service can reach the operator at, as required by the Web Push spec | `mailto:admin@example.com` | A `mailto:` or `https:` URI |
| `EMAILJS_SERVICE_ID` | No | EmailJS service id used to send password reset emails over HTTPS (works on hosts that block SMTP, e.g. Render). With any `EMAILJS_*` var unset, emails are written to the server log instead of sent in dev/test; in production they are not sent at all (an error is logged, never the link) | unset (emails logged in dev) | From dashboard.emailjs.com -> Email Services |
| `EMAILJS_TEMPLATE_ID` | No | EmailJS template id. The template's "To Email" must be `{{email}}`; it receives `{{email}}`, `{{link}}` (the reset link), `{{subject}}` and `{{message}}` (plain-text body) | unset | From dashboard.emailjs.com -> Email Templates |
| `EMAILJS_PUBLIC_KEY` | No | EmailJS public key | unset | Account -> API keys |
| `EMAILJS_PRIVATE_KEY` | No | EmailJS private key; required for server-side sends (also enable Account -> Security -> "Allow EmailJS API for non-browser applications") | unset | Account -> API keys; treat as a secret |
| `TEST_LOGS` | No | When set (any value), re-enables log output while `NODE_ENV=test` (normally suppressed to keep test runs quiet) | unset | Set to any truthy value to see application logs during `npm test` |
| `SUPERADMIN_PASSWORD` | No | Password used by `npm run create-superadmin`. If unset, the script generates one and prints it once. Read only by that script, never by the server | unset (generated) | At least 12 characters (the script refuses shorter) |

---

## Frontend Environment Variables (`frontend/.env`)

| Variable | Required | Description | Default / Example | Valid Values / Notes |
|----------|----------|-------------|-------------------|----------------------|
| `VITE_API_URL` | No | Base URL or relative path used by Axios apiClient to send requests to the backend server | `/api` | `/api` (when proxied via Vite/reverse proxy) or full URL `http://localhost:5001/api` |
<!-- AUTO-GENERATED:ENV_END -->

---

## Configuration Best Practices

- **Never commit `.env` files**: Keep `.env` ignored in `.gitignore`. Only commit `.env.example` templates with non-sensitive defaults.
- **Production Secrets**: Generate a cryptographically secure string for `JWT_SECRET` (e.g., using `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
- **CORS Setup**: In production, ensure `FRONTEND_URL` exactly matches the origin of your deployed frontend without trailing slashes.
