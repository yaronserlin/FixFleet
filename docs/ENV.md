# Environment Variables Reference

This document outlines all environment variables utilized across the MaintenanceSystemApp backend and frontend applications.

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
| `FRONTEND_URL` | Yes (in production) | Comma-separated list of allowed origins permitted by CORS and CSP frame-ancestors | `http://localhost:5173` | Fully qualified URL(s) without trailing slash (e.g. `http://localhost:5173,https://app.example.com`) |
| `LOG_LEVEL` | No | Minimum severity level `utils/logger.js` emits | `warn` in production, `debug` otherwise | `error`, `warn`, `info`, `http`, `debug` |
| `TEST_LOGS` | No | When set (any value), re-enables log output while `NODE_ENV=test` (normally suppressed to keep test runs quiet) | unset | Set to any truthy value to see application logs during `npm test` |

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
