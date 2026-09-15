# Operations & Deployment Runbook

This runbook covers operational procedures, deployment workflows, health monitoring, common incident remediations, and escalation paths for MaintenanceSystemApp.

---

## 1. Deployment Procedures

### Architecture Overview
- **Backend**: Node.js/Express service connecting to MongoDB, serving REST APIs and managing multi-tenant media uploads.
- **Frontend**: Single Page Application (SPA) / Progressive Web App (PWA) built with React and Vite.

### Step-by-Step Backend Deployment (Cloud/PaaS e.g. Render, Railway, AWS ECS)
1. **Configure Environment Variables**:
   Set production variables in the cloud provider's secret manager:
   - `NODE_ENV=production`
   - `PORT=5001` (or provider's dynamic `$PORT`)
   - `MONGO_URI=<production_mongodb_connection_string>`
   - `JWT_SECRET=<strong_32+_char_secret>`
   - `FRONTEND_URL=https://<your-frontend-domain.com>`
2. **Reverse Proxy Configuration**:
   The backend relies on `app.set('trust proxy', 1)`. If deploying behind multiple proxy hops (e.g. Cloudflare -> AWS ALB -> Node), verify IP forwarding headers for rate limiting.
3. **Build & Startup**:
   - Install dependencies: `npm ci --omit=dev`
   - Syntax verification: `npm run build`
   - Initial database setup (if new environment): `npm run seed`
   - Start process: `npm start` (or managed via PM2 / systemd / Docker)

### Step-by-Step Frontend Deployment (Static Host / CDN e.g. Vercel, Netlify, Cloudflare Pages, S3)
1. **Configure Build Environment**:
   - Set `VITE_API_URL=https://<your-api-domain.com>/api` (or configure reverse proxy rewrites)
2. **Compile Assets**:
   ```bash
   cd frontend
   npm ci
   npm run build
   ```
3. **Deploy Artifacts**:
   - Deploy contents of `frontend/dist/` to static hosting.
4. **Configure SPA Rewrite**:
   - Ensure all non-asset routes rewrite to `/index.html` (e.g. `/* -> /index.html 200` in Netlify/Render/Vercel configuration).

---

## 2. Health Checks & Monitoring

<!-- AUTO-GENERATED:HEALTH_START -->
### Endpoints

| Endpoint | Method | Access | Success Response | Failure Response |
|----------|--------|--------|------------------|------------------|
| `/health` | `GET` | Public | `200 OK` (database connected) | `503 Service Unavailable` (database disconnected) |
| `/api/health` | `GET` | Public | `200 OK` (database connected) | `503 Service Unavailable` (database disconnected) |

### Sample Response (`200 OK`)
```json
{
  "status": "healthy",
  "timestamp": "2026-09-14T12:00:00.000Z",
  "database": "connected"
}
```

### Sample Response (`503 Degraded`)
```json
{
  "status": "degraded",
  "timestamp": "2026-09-14T12:00:00.000Z",
  "database": "disconnected"
}
```
<!-- AUTO-GENERATED:HEALTH_END -->

### Uptime Monitoring Configuration
- **Check URL**: `https://<api-domain>/health`
- **Interval**: Every 30 to 60 seconds
- **Timeout**: 5000 ms
- **Healthy Status Code**: `200`
- **Alert Trigger**: 2 consecutive non-200 responses or timeout

---

## 3. Common Issues and Fixes

### 1. CORS Blocked (`Not allowed by CORS`)
- **Symptom**: Browser console displays `Access to XMLHttpRequest at '...' from origin '...' has been blocked by CORS policy`.
- **Cause**: The incoming request origin is not listed in `FRONTEND_URL`.
- **Fix**: Update `FRONTEND_URL` in backend environment settings to include the frontend domain (without trailing slashes), separated by commas:
  ```env
  FRONTEND_URL=https://app.example.com,https://staging.example.com
  ```
  Restart backend service to apply.

### 2. Database Disconnected (`status: degraded / 503`)
- **Symptom**: `/health` returns 503, API endpoints return 500 or timeout.
- **Cause**: MongoDB service down, unreachable network, IP access list in MongoDB Atlas blocking backend server, or invalid credentials.
- **Fix**:
  1. Inspect backend server logs: `logger.error('MongoDB connection error: ...')`.
  2. Verify Atlas Network Access includes backend server IP or `0.0.0.0/0` with proper authentication.
  3. Validate database URI and password credentials.

### 3. Media Access Forbidden (`403 Forbidden` on `/uploads/:filename`)
- **Symptom**: User cannot load photo or manual attachment.
- **Cause**: Multi-tenant media protection strictly limits file downloads to members of the company that owns the equipment, fault, or user profile.
- **Fix**:
  1. Verify the requesting user is authenticated with a valid cookie / token.
  2. Verify that the requested file is associated with the user's `companyId` in MongoDB.

### 4. Auth Rate Limiting (`429 Too Many Requests`)
- **Symptom**: `Too many attempts from this IP, please try again after 15 minutes` on login or register.
- **Cause**: Express rate limiter exceeded 20 requests within 15 minutes per IP.
- **Fix**: Wait for window to reset (15 minutes). If occurring in production for multiple distinct users sharing a corporate network or reverse proxy, verify `app.set('trust proxy', 1)` is correctly configured.

### 5. Authentication Cookie Missing in Production
- **Symptom**: User logs in successfully but subsequent API requests fail with `401 Unauthorized`.
- **Cause**: In production (`NODE_ENV=production`), auth cookies require `secure: true` (HTTPS) and appropriate `sameSite` policy.
- **Fix**: Ensure HTTPS is enabled across both frontend and backend domains and that frontend Axios client uses `withCredentials: true`.

### 6. PWA Users Get Silently Logged Out After a While (but regular browser tabs are fine)
- **Symptom**: Users who installed the app as a PWA (Add to Home Screen / desktop "Install app") get logged out after some period of use, while the same account in a normal browser tab stays signed in.
- **Cause**: If the frontend and backend are deployed on **different registrable domains** (e.g. a static host's own subdomain like `myapp.vercel.app` for the frontend and a PaaS subdomain like `myapi.onrender.com` for the backend — see `VITE_API_URL=https://<your-api-domain.com>/api` in the frontend deployment steps above), the `refreshToken` cookie set by the backend is, from the frontend's perspective, a **third-party cookie**. Browsers increasingly restrict third-party cookies, and this is enforced *much* more aggressively for installed/standalone PWAs than for a regular browser tab (most notably iOS/macOS Safari's Intelligent Tracking Prevention). The access token (see `backend/constants/auth.js`) still expires normally, but the silent-refresh request that's supposed to renew it finds no valid `refreshToken` cookie to present -- forcing a full re-login. This can also show up as the PDF/photo viewer or media downloads failing intermittently, since those go through the same cookie-backed auth.
- **Fix (recommended)**: Deploy the frontend and backend under the **same registrable domain**, e.g. `app.example.com` for the SPA and `app.example.com/api/*` reverse-proxied to the backend service (or `api.example.com` if your host supports first-party subdomain cookies -- same registrable domain, `Domain=.example.com` cookie scope). This turns the refresh-token cookie into a first-party cookie, sidestepping third-party-cookie restrictions entirely. Concretely:
  - **Vercel**: add a `rewrites` entry routing `/api/*` (and `/uploads/*`) to the backend's URL, then set `VITE_API_URL=/api` (relative) at build time.
  - **Netlify**: add an equivalent proxy redirect in `netlify.toml` (`from = "/api/*"`, `to = "https://<backend>/api/:splat"`, `status = 200`).
  - **Cloudflare Pages/Workers**: a Worker route or Pages Function proxying `/api/*` to the backend origin.
  - Any of these let `VITE_API_URL` stay relative (`/api`), matching `frontend/.env.example`'s default and avoiding the cross-origin cookie problem from the start.
- **Fix (if same-origin isn't possible right now)**: confirm `sameSite: 'none'` + `secure: true` are actually in effect (`NODE_ENV=production` on the backend) and that both domains are served over HTTPS; test specifically in an *installed* PWA, not just a regular tab, since that's where third-party-cookie enforcement is strictest. Expect this to remain unreliable on iOS Safari PWAs regardless -- same-origin deployment is the only fully reliable fix.

---

## 4. Rollback Procedures

### Backend Rollback
1. Identify the previous stable Git commit SHA or release tag:
   ```bash
   git log -n 5 --oneline
   ```
2. Trigger rollback in cloud deployment platform (e.g. Render "Rollback to commit", AWS ECS task revision rollback).
3. If database schema migrations were applied, review if any backward-incompatible field changes occurred and run rollback scripts if available.
4. Verify `/health` returns status `200 OK`.

### Frontend Rollback
1. In the static hosting provider dashboard (e.g., Vercel / Netlify / Cloudflare Pages), select the previous successful deployment and click **Promote to Production** / **Rollback**.
2. Clear CDN cache if necessary.

---

## 5. Alerting & Escalation Paths

| Tier | Role | Responsibilities | Response SLA |
|------|------|------------------|--------------|
| **L1** | On-Call Engineer | Monitor automated alerts from `/health`, investigate initial logs, verify basic connectivity | < 15 minutes |
| **L2** | Core Backend / Platform Lead | Investigate database outages, multi-tenant permission issues, server crashes | < 30 minutes |
| **L3** | Lead Architect / DevOps | Address cluster-wide failures, data corruption, security incidents | Immediate |

### Escalation Triggers
- `/health` endpoint failing for > 3 minutes.
- Global 5xx HTTP response rate exceeding 2% over a 5-minute rolling window.
- Security anomaly or unauthorized multi-tenant data access detected.
