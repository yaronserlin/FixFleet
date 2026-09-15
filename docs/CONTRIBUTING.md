# Contributing to MaintenanceSystemApp

Thank you for contributing to MaintenanceSystemApp! This guide details how to set up your local development environment, project scripts, testing guidelines, and submission workflow.

---

## 1. Development Environment Setup

### Prerequisites
- **Node.js**: v18.0.0+ or v20.0.0+ LTS recommended
- **npm**: v9.0.0+
- **MongoDB**: Local instance running on `localhost:27017` or a remote MongoDB Atlas cluster URI

### Clone and Install Dependencies
The repository is organized into `backend/` and `frontend/` applications:

```bash
# Clone the repository
git clone https://github.com/yaronserlin/MaintenanceSystemApp.git
cd MaintenanceSystemApp

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Environment Configuration
Copy the template `.env.example` files to `.env` in both packages:

```bash
# Backend configuration
cp backend/.env.example backend/.env

# Frontend configuration
cp frontend/.env.example frontend/.env
```

Review and configure the variables (see [docs/ENV.md](ENV.md) for full descriptions).

### Database Seeding
To populate your local database with initial test data (sample company, admin/mechanic/operator accounts, equipment, parts, and maintenance schedules):

```bash
cd backend
npm run seed
```

---

## 2. Available Scripts

<!-- AUTO-GENERATED:SCRIPTS_START -->
### Backend Scripts (`backend/package.json`)

| Command | Script / Command Line | Description |
|---------|-----------------------|-------------|
| `npm run dev` | `nodemon app.js` | Start backend server in development mode with automatic restart on file changes |
| `npm start` | `node app.js` | Start backend server in production mode |
| `npm run build` | `node --check app.js` | Perform syntax and validity check on backend entry point |
| `npm run seed` | `node seeders/seeder.js` | Seed MongoDB database with initial sample users, equipment, parts, and schedules |
| `npm test` | `jest --runInBand --detectOpenHandles --forceExit` | Execute backend test suite using in-memory MongoDB and Supertest |

### Frontend Scripts (`frontend/package.json`)

| Command | Script / Command Line | Description |
|---------|-----------------------|-------------|
| `npm run dev` | `vite` | Start Vite development server with Hot Module Replacement (HMR) on port 5173 |
| `npm run build` | `vite build` | Build optimized production bundle with Rollup chunk splitting to `dist/` |
| `npm run preview` | `vite preview` | Locally preview the generated production build |
| `npm run lint` | `eslint .` | Run ESLint static analysis across frontend source files |
| `npm test` | `jest` | Run frontend component and unit test suite with jsdom environment |
<!-- AUTO-GENERATED:SCRIPTS_END -->

---

## 3. Testing Procedures

### Running Backend Tests
Backend tests use Jest, `supertest`, and `mongodb-memory-server` to execute against an isolated in-memory database:

```bash
cd backend
npm test
```

When creating new backend tests:
- Place test files under `backend/__tests__/` (e.g. `backend/__tests__/<feature>.test.js`).
- Use helper utilities in `backend/__tests__/helpers/` for database setup and token generation (`connectTestDB`/`closeTestDB`/`registerCompanyAdmin`/`createCompanyAndUser`/`uniqueEmail`).
- Prefer direct unit tests of `services/*.js` and `middleware/*.js` functions for business-logic and edge-case coverage (fast, precise failures); use the existing controller-level HTTP integration style (via `supertest`) for end-to-end route behavior. Both styles coexist in this suite.
- Ensure all queries verify tenant isolation (`companyId`).

### Running Frontend Tests
Frontend tests use Jest with `@testing-library/react` and `jest-environment-jsdom`:

```bash
cd frontend
npm test
```

When creating new frontend tests:
- Place test files under `frontend/__tests__/` (login/legal-flow tests) or co-located next to their source as `Component.test.jsx` / `module.test.js` (the pattern used for most components, hooks, services, and contexts) — both conventions are in active use, pick whichever matches the nearest existing sibling test.
- Mock the network boundary (`apiClient`/`axios`), not internal implementation details.
- Query by role/label/text (React Testing Library), not by implementation detail like class names.

---

## 4. Code Style & Linting

- Frontend code style is enforced via ESLint 9 flat configuration (`frontend/eslint.config.js`).
- Run linting before committing:
  ```bash
  cd frontend
  npm run lint
  ```
- Backend follows standard Node.js/CommonJS conventions. Run syntax check:
  ```bash
  cd backend
  npm run build
  ```

---

## 5. PR Submission Checklist

Before opening a pull request, ensure all of the following checks pass:

- [ ] Backend syntax check passes: `cd backend && npm run build`
- [ ] Backend tests pass: `cd backend && npm test`
- [ ] Frontend linter passes: `cd frontend && npm run lint`
- [ ] Frontend tests pass: `cd frontend && npm test`
- [ ] Frontend production build succeeds: `cd frontend && npm run build`
- [ ] New or modified environment variables are documented in `.env.example` and `docs/ENV.md`
- [ ] API changes are documented in `docs/API.md`
- [ ] Multi-tenant isolation is maintained (every MongoDB query filters by `companyId`)
- [ ] Commit messages follow conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`)
