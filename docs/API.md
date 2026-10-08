# REST API Specification

This document provides the complete API specification for the FixFleet backend service, derived from the route controllers and middleware.

---

## General Architecture

- **Base Path**: `/api`
- **Layering**: `routes/` → `controllers/` (thin: parse request, call service, shape response) → `services/` (business logic and data access) → `models/` (Mongoose schemas). Centralized error handling lives in `middleware/errorMiddleware.js`; NoSQL-operator sanitization (`middleware/sanitizeMiddleware.js`) runs on every request body/query/params before it reaches a route handler.
- **Authentication**: JWT token transmitted via HTTP-only cookie (`token`) or Authorization header.
- **Multi-Tenancy**: Tenant isolation is enforced across all resources based on the authenticated user's `companyId`.
- **Role-Based Access Control**:
  - `admin`: Full administrative access (users, company equipment, configurations).
  - `mechanic`: Can manage equipment books/schedules, log maintenance, and manage faults.
  - `operator` / standard user: Can view equipment, report faults, and view assigned maintenance tasks.

---

<!-- AUTO-GENERATED:API_START -->
## Endpoints Reference

### 1. System & Health

| Method | Path | Auth Required | Minimum Role | Description |
|--------|------|---------------|--------------|-------------|
| `GET` | `/health` | No | None | System health check (MongoDB connectivity status) |
| `GET` | `/api/health` | No | None | Health check alias for cloud monitors and load balancers |
| `GET` | `/uploads/:filename` | Yes | Authenticated | Protected media download; enforces company tenant ownership |

*Every route shares a baseline rate limit of 500 req/15min per IP (`GENERAL_RATE_LIMIT`, `backend/constants/rateLimits.js`); auth routes add a stricter limiter on top.*

---

### 2. Authentication (`/api/auth`)

| Method | Path | Auth Required | Minimum Role | Description |
|--------|------|---------------|--------------|-------------|
| `POST` | `/api/auth/register` | No | None | Create a company and its admin account (`{ companyName, name, email, password, agreeToTerms }`). Returns `201 { message, email, user }` with **no session**: the admin starts unverified and is emailed a verification link valid for 24 hours (Rate limited: 20 req/15min) |
| `POST` | `/api/auth/verify-email` | No | None | Complete signup with the token from the emailed link (`{ token }`); single-use. Marks the email verified and signs the user in: `200 { accessToken, token, user }` + `refreshToken` cookie. `400` if the link is invalid, expired or already used (Rate limited) |
| `POST` | `/api/auth/resend-verification` | No | None | Re-send the verification email (`{ email }`); always 200 with the same message, so it can't reveal which emails have accounts. Shares the 3 req/15min per-email limit with `forgot-password` (Rate limited per IP, plus per email) |
| `POST` | `/api/auth/login` | No | None | Authenticate user credentials and set the refresh cookie (Rate limited). `403` with `code: EMAIL_NOT_VERIFIED` until a self-service signup has verified its email |
| `POST` | `/api/auth/refresh` | No | None | Rotate access/refresh tokens from the `refreshToken` cookie (Rate limited); revokes the session family on reuse-attack detection |
| `POST` | `/api/auth/forgot-password` | No | None | Email a password reset link (`{ email }`); always 200 with a generic message so it can't reveal which emails have accounts (Rate limited per IP, plus 3 req/15min per email) |
| `POST` | `/api/auth/reset-password` | No | None | Set a new password with a reset token (`{ token, newPassword }`); the token is single-use and expires after 30 minutes; revokes all sessions (Rate limited) |
| `POST` | `/api/auth/logout` | No | None | Clear authentication cookie |
| `GET` | `/api/auth/me` | Yes | Any | Retrieve current authenticated user profile |
| `PUT` | `/api/auth/me` | Yes | Any | Update current user profile (`{ name, email, currentPassword }`; `currentPassword` required only when the email changes) |
| `DELETE` | `/api/auth/me` | Yes | Any | Delete own account (`{ confirmation: "delete <name>", currentPassword }`; confirmation is case-insensitive, password must match); removes sessions, push subscriptions, and avatar, then clears auth cookies |
| `POST` | `/api/auth/me/avatar` | Yes | Any | Upload profile picture avatar (`multipart/form-data`, file key: `avatar`) |
| `POST` | `/api/auth/me/change-password` | Yes | Any | Change account password (`{ currentPassword, newPassword }`; `currentPassword` is not required during a forced first-login change, which instead requires `agreeToTerms` if terms were not yet accepted); revokes all sessions |

---

### 3. Equipment & Maintenance Schedules (`/api/equipment` & `/api/tools`)

*Note: `/api/tools` is maintained as a backward-compatible alias for `/api/equipment`. `.../progress` also accepts `PUT` and `POST`.*

| Method | Path | Auth Required | Minimum Role | Description |
|--------|------|---------------|--------------|-------------|
| `GET` | `/api/equipment` | Yes | Any | List all equipment belonging to the user's company |
| `GET` | `/api/equipment/:id` | Yes | Any | Retrieve equipment details by ID |
| `POST` | `/api/equipment` | Yes | Admin | Create new equipment record |
| `PUT` | `/api/equipment/:id` | Yes | Admin | Update existing equipment record |
| `DELETE` | `/api/equipment/:id` | Yes | Admin | Delete equipment record |
| `POST` | `/api/equipment/:id/books` | Yes | Mechanic | Upload equipment documentation/manual (`multipart/form-data`, key: `book`) |
| `DELETE` | `/api/equipment/:id/books/:bookId` | Yes | Mechanic | Delete equipment documentation manual |
| `POST` | `/api/equipment/:id/schedules` | Yes | Mechanic | Add maintenance schedule to equipment |
| `GET` | `/api/equipment/:id/schedules/:scheduleId` | Yes | Any | Retrieve specific maintenance schedule |
| `DELETE` | `/api/equipment/:id/schedules/:scheduleId` | Yes | Mechanic | Delete maintenance schedule |
| `POST` | `/api/equipment/:id/schedules/:scheduleId/complete` | Yes | Mechanic | Record completion of a maintenance schedule run |
| `PATCH` | `/api/equipment/:id/schedules/:scheduleId/progress` | Yes | Mechanic | Update maintenance schedule execution progress |
| `POST` | `/api/equipment/:id/schedules/:scheduleId/checklist` | Yes | Mechanic | Add checklist task item to schedule |
| `PATCH` | `/api/equipment/:id/schedules/:scheduleId/checklist/:itemId` | Yes | Mechanic | Toggle checklist item completion status |
| `DELETE` | `/api/equipment/:id/schedules/:scheduleId/checklist/:itemId` | Yes | Mechanic | Remove item from schedule checklist |

---

### 4. Fault Reports (`/api/faults`)

| Method | Path | Auth Required | Minimum Role | Description |
|--------|------|---------------|--------------|-------------|
| `GET` | `/api/faults` | Yes | Any | List company faults (query: `status`, `page`/`limit`; `mine=1` returns only faults the caller reported). Operators can list every fault in their company by design; the UI narrows them to their own reports |
| `GET` | `/api/faults/:id` | Yes | Any | Get fault report details |
| `POST` | `/api/faults` | Yes | Any | Report a new fault (supports up to 5 photos via `multipart/form-data`, key: `photos`; photo URL strings in the body are ignored) |
| `PUT` | `/api/faults/:id` | Yes | Mechanic | Update fault details |
| `PATCH` | `/api/faults/:id/close` | Yes | Mechanic | Mark fault as resolved and closed |
| `PATCH` | `/api/faults/:id/reopen` | Yes | Mechanic | Reopen previously closed fault (`PUT` also accepted) |
| `DELETE` | `/api/faults/:id` | Yes | Mechanic | Delete fault report |

---

### 5. Notifications (`/api/notifications`)

*Every endpoint here reads or writes only the requesting user's own notifications, except the admin broadcast.*

| Method | Path | Auth Required | Minimum Role | Description |
|--------|------|---------------|--------------|-------------|
| `GET` | `/api/notifications` | Yes | Any | List own notifications, newest first (`page`, `limit`, `unreadOnly`) |
| `GET` | `/api/notifications/unread-count` | Yes | Any | Unread badge count (cheap; polled by the client) |
| `PATCH` | `/api/notifications/:id/read` | Yes | Any | Mark one own notification read (idempotent) |
| `DELETE` | `/api/notifications/:id` | Yes | Any | Delete one own notification (`404` if not found or not owned) |
| `POST` | `/api/notifications/read-all` | Yes | Any | Mark every own unread notification read |
| `GET` | `/api/notifications/push/public-key` | Yes | Any | VAPID public key, plus whether push is configured server-side |
| `POST` | `/api/notifications/push/subscriptions` | Yes | Any | Register this browser's push endpoint (upsert, keyed on endpoint) |
| `DELETE` | `/api/notifications/push/subscriptions` | Yes | Any | Forget this browser's push endpoint (body: `endpoint`) |
| `POST` | `/api/notifications/announcements` | Yes | Admin | Broadcast to users in the admin's own company (`title`, `body`, optional `roles`) |

**Automatic notifications.** `POST /api/faults` fans out a `fault_reported`
notification to every `mechanic` and `admin` in the reporting user's company,
excluding the reporter. A notification is stored per recipient and is also
delivered as a Web Push message to each of that user's registered browsers.

**Push is optional.** With no `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`
configured (see [ENV.md](ENV.md)), push is disabled and
`GET /api/notifications/push/public-key` reports `enabled: false`; the in-app
feed continues to work unchanged.

---

### 6. Maintenance History (`/api/maintenance`)

| Method | Path | Auth Required | Minimum Role | Description |
|--------|------|---------------|--------------|-------------|
| `GET` | `/api/maintenance` | Yes | Any | List maintenance history records for company |
| `DELETE` | `/api/maintenance/:id` | Yes | Mechanic | Delete a maintenance record |

Records are created by completing a schedule task (`POST /api/equipment/:id/schedules/:scheduleId/complete`).

---

### 7. Administration (`/api/admin`)

*All admin endpoints require an authenticated user with `admin` role. Equipment is managed through `/api/equipment` (admin-only for create/update/delete).*

| Method | Path | Auth Required | Minimum Role | Description |
|--------|------|---------------|--------------|-------------|
| `GET` | `/api/admin/users` | Yes | Admin | List all user accounts within the company |
| `POST` | `/api/admin/users` | Yes | Admin | Create a new user account within the company |
| `PATCH` | `/api/admin/users/:id/role` | Yes | Admin | Update user account role (`admin`, `mechanic`, `operator`) |
| `DELETE` | `/api/admin/users/:id` | Yes | Admin | Delete user account |

---

### 8. Platform Administration (`/api/superadmin`)

*Requires the platform-level `superadmin` role. A superadmin has no company and is refused (403) on every tenant route; it may only use `/api/auth/*`, `/api/superadmin/*` and `/uploads/*`. Superadmins are created with `npm run create-superadmin -- --email <email>` (backend), never through the API.*

| Method | Path | Auth Required | Minimum Role | Description |
|--------|------|---------------|--------------|-------------|
| `GET` | `/api/superadmin/stats` | Yes | Superadmin | Platform KPIs (companies, accounts, active users, storage), 12-month growth, largest companies, dormant/deactivated companies |
| `GET` | `/api/superadmin/companies` | Yes | Superadmin | All companies with account count and last activity (`?search=`) |
| `GET` | `/api/superadmin/companies/:id` | Yes | Superadmin | One company and its users |
| `PATCH` | `/api/superadmin/companies/:id/status` | Yes | Superadmin | Activate/deactivate a company (`{ isActive }`); deactivating revokes its sessions |
| `GET` | `/api/superadmin/users` | Yes | Superadmin | Tenant users across companies (`?search=&companyId=&role=&page=&limit=`) |
| `PATCH` | `/api/superadmin/users/:id/role` | Yes | Superadmin | Change a tenant user's role (company last-admin guard applies) |
| `POST` | `/api/superadmin/users/:id/reset-password` | Yes | Superadmin | Issue a one-time temporary password and force a change at next login |
| `DELETE` | `/api/superadmin/users/:id` | Yes | Superadmin | Delete a tenant user (company last-admin guard applies) |
| `POST` | `/api/superadmin/announcements` | Yes | Superadmin | Announce to all active companies, or `companyIds`, optionally filtered by `roles` |
| `GET` | `/api/superadmin/audit-logs` | Yes | Superadmin | Audit trail, newest first (`?action=&companyId=&search=&page=&limit=`) |

**Audit log.** Append-only, kept 365 days (TTL index). Recorded events: company registered / activated / deactivated; user created / role changed / deleted / password reset (by a company admin or a superadmin); account self-deleted; superadmin sign-in; failed sign-in (attempted email + IP). Ordinary tenant sign-ins are not recorded; they only update `User.lastActiveAt`.
<!-- AUTO-GENERATED:API_END -->
