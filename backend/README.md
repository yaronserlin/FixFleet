# FixFleet Backend

Express 5 REST API over MongoDB (Mongoose 8). It handles multi-tenant data (every query is scoped by `companyId`), JWT auth in HTTP-only cookies, GridFS media storage, and Web Push notifications. For the project overview and full-stack quickstart, see the [root README](../README.md).

## Quick Start

```bash
npm install
cp .env.example .env   # set MONGO_URI and JWT_SECRET at minimum
npm run seed           # optional: sample company, users, equipment, parts, schedules
npm run dev            # http://localhost:5001
```

Check it's up: `curl http://localhost:5001/health` should return `"status": "healthy"`.

## Scripts

<!-- AUTO-GENERATED:SCRIPTS_START -->
| Command | Script | Description |
|---------|--------|-------------|
| `npm run dev` | `nodemon app.js` | Start with auto-restart on file changes |
| `npm start` | `node app.js` | Start for production |
| `npm run build` | `node --check app.js` | Syntax check of the entry point (there is no compile step) |
| `npm run seed` | `node seeders/seeder.js` | Seed MongoDB with sample data |
| `npm run create-superadmin` | `node scripts/createSuperAdmin.js` | Create or reset a platform superadmin (`-- --email <email> [--name "<name>"]`); the only way to make one |
| `npm test` | `jest --runInBand --detectOpenHandles --forceExit` | Jest + Supertest against an in-memory MongoDB |
<!-- AUTO-GENERATED:SCRIPTS_END -->

One-off: `node scripts/migrateUploadsToGridFS.js` moves legacy `uploads/` disk files into GridFS (safe to re-run; see [docs/RUNBOOK.md](../docs/RUNBOOK.md)).

## Environment

Required: `MONGO_URI` and `JWT_SECRET`. `FRONTEND_URL` is also required in production. Push notifications (`VAPID_*`) and password-reset email (`EMAILJS_*`) are optional; the app runs without them. The full reference is in [docs/ENV.md](../docs/ENV.md).

## Architecture

Requests flow `routes/` → `controllers/` → `services/` → `models/`. Controllers stay thin: they parse the request, call a service, and shape the response. Business logic and data access live in `services/`.

```
app.js         # Express setup: helmet, CORS, sanitize, rate limit, /health, /uploads, route mounts
config/        # MongoDB connection
constants/     # Roles, auth/token settings, rate limits, fault/schedule status, pagination
controllers/   # HTTP layer
middleware/    # verifyToken/role guards, ObjectId validation, upload (multer), sanitize, error handler
models/        # Mongoose schemas (Company, User, Equipment, Fault, Maintenance, Part, Notification, ...)
routes/        # Route declarations; see docs/API.md for the full endpoint list
services/      # Business logic, including notification fan-out and Web Push
utils/         # logger, GridFS mediaStorage, EmailJS mailer, httpError
seeders/       # Sample data
scripts/       # One-off operational scripts
__tests__/     # Unit and integration tests (helpers/setup.js for DB + users)
```

Errors: throw `httpError(status, message)` from a service and the central `errorMiddleware` shapes the response.

## Tests

`npm test` starts an in-memory MongoDB (binaries are cached in `.mongo-binaries/`), so you don't need a running database. Put new tests in `__tests__/<feature>.test.js` and use the helpers in `__tests__/helpers/setup.js`. Every test touching data should assert tenant isolation. Set `TEST_LOGS=1` to see app logs during a run.

## API & Operations

- Endpoints, roles, rate limits: [docs/API.md](../docs/API.md)
- Deployment, health checks, troubleshooting: [docs/RUNBOOK.md](../docs/RUNBOOK.md)
