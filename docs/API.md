# REST API Specification

This document provides the complete API specification for the MaintenanceSystemApp backend service, derived from the route controllers and middleware.

---

## General Architecture

- **Base Path**: `/api`
- **Layering**: `routes/` → `controllers/` (thin: parse request, call service, shape response) → `services/` (business logic and data access) → `models/` (Mongoose schemas). Centralized error handling lives in `middleware/errorMiddleware.js`; NoSQL-operator sanitization (`middleware/sanitizeMiddleware.js`) runs on every request body/query/params before it reaches a route handler.
- **Authentication**: JWT token transmitted via HTTP-only cookie (`token`) or Authorization header.
- **Multi-Tenancy**: Tenant isolation is enforced across all resources based on the authenticated user's `companyId`.
- **Role-Based Access Control**:
  - `admin`: Full administrative access (users, company equipment, configurations).
  - `mechanic`: Can manage equipment books/schedules, log maintenance, manage faults, and manage spare parts.
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

---

### 2. Authentication (`/api/auth`)

| Method | Path | Auth Required | Minimum Role | Description |
|--------|------|---------------|--------------|-------------|
| `POST` | `/api/auth/register` | No | None | Register new user account (Rate limited: 20 req/15min) |
| `POST` | `/api/auth/login` | No | None | Authenticate user credentials and set auth cookie (Rate limited) |
| `POST` | `/api/auth/logout` | No | None | Clear authentication cookie |
| `GET` | `/api/auth/me` | Yes | Any | Retrieve current authenticated user profile |
| `PUT` | `/api/auth/me` | Yes | Any | Update current user profile (name, phone, language, etc.) |
| `POST` | `/api/auth/me/avatar` | Yes | Any | Upload profile picture avatar (`multipart/form-data`, file key: `avatar`) |
| `POST` | `/api/auth/me/change-password` | Yes | Any | Change account password (requires `oldPassword` and `newPassword`) |

---

### 3. Equipment & Maintenance Schedules (`/api/equipment` & `/api/tools`)

*Note: `/api/tools` is maintained as a backward-compatible alias for `/api/equipment`.*

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
| `GET` | `/api/faults` | Yes | Any | List company faults (supports query filters for equipment, status, priority) |
| `GET` | `/api/faults/:id` | Yes | Any | Get fault report details |
| `POST` | `/api/faults` | Yes | Any | Report a new fault (supports up to 5 photos via `multipart/form-data`, key: `photos`) |
| `PUT` | `/api/faults/:id` | Yes | Mechanic | Update fault details |
| `PATCH` | `/api/faults/:id/close` | Yes | Mechanic | Mark fault as resolved and closed |
| `PATCH` | `/api/faults/:id/reopen` | Yes | Mechanic | Reopen previously closed fault |
| `DELETE` | `/api/faults/:id` | Yes | Mechanic | Delete fault report |

---

### 5. Notifications (`/api/notifications`)

*Every endpoint here reads or writes only the requesting user's own notifications, except the admin broadcast.*

| Method | Path | Auth Required | Minimum Role | Description |
|--------|------|---------------|--------------|-------------|
| `GET` | `/api/notifications` | Yes | Any | List own notifications, newest first (`page`, `limit`, `unreadOnly`) |
| `GET` | `/api/notifications/unread-count` | Yes | Any | Unread badge count (cheap; polled by the client) |
| `PATCH` | `/api/notifications/:id/read` | Yes | Any | Mark one own notification read (idempotent) |
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
| `GET` | `/api/maintenance/:id` | Yes | Any | Get specific maintenance record |
| `POST` | `/api/maintenance` | Yes | Mechanic | Create a maintenance record |
| `DELETE` | `/api/maintenance/:id` | Yes | Mechanic | Delete a maintenance record |

---

### 7. Spare Parts Inventory (`/api/parts`)

| Method | Path | Auth Required | Minimum Role | Description |
|--------|------|---------------|--------------|-------------|
| `GET` | `/api/parts` | Yes | Any | List spare parts inventory |
| `POST` | `/api/parts` | Yes | Mechanic | Add new spare part |
| `PUT` | `/api/parts/:id` | Yes | Mechanic | Update spare part details/quantity |
| `DELETE` | `/api/parts/:id` | Yes | Mechanic | Remove spare part from inventory |

---

### 8. Administration (`/api/admin`)

*All admin endpoints require an authenticated user with `admin` role.*

| Method | Path | Auth Required | Minimum Role | Description |
|--------|------|---------------|--------------|-------------|
| `GET` | `/api/admin/users` | Yes | Admin | List all user accounts within the company |
| `POST` | `/api/admin/users` | Yes | Admin | Create a new user account within the company |
| `PATCH` | `/api/admin/users/:id/role` | Yes | Admin | Update user account role (`admin`, `mechanic`, `operator`) |
| `DELETE` | `/api/admin/users/:id` | Yes | Admin | Delete user account |
| `GET` | `/api/admin/equipment` | Yes | Admin | List company equipment |
| `POST` | `/api/admin/equipment` | Yes | Admin | Create company equipment |
| `PUT` | `/api/admin/equipment/:id` | Yes | Admin | Update company equipment |
| `DELETE` | `/api/admin/equipment/:id` | Yes | Admin | Delete company equipment |
<!-- AUTO-GENERATED:API_END -->
