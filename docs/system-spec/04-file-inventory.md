# 04 — File Inventory

[← Index](README.md) · [01 Architecture](01-architecture-and-layers.md) · [02 Database](02-database-and-schemas.md) · [03 Dependencies & Config](03-dependencies-and-config.md) · **04 File Inventory** · [05 API & Workflows](05-api-and-workflows.md)

Every tracked source file, grouped by layer. "Used by" lists direct importers. Line counts are as of version 1.0.7 (`/VERSION`), commit `f503a4a`, 2026-10-08. Config, assets and docs are covered in [03 §3.5–3.7](03-dependencies-and-config.md#35-configuration-files); test files in §4.3.

---

## 4.1 Backend (`backend/`, CommonJS)

### 4.1.1 Entry point & config

| File | Lines | Responsibility | Key exports / functions | Depends on | Used by |
|---|---|---|---|---|---|
| `app.js` | 197 | Composition root. Loads env, sets `trust proxy 1`, connects DB (skipped in tests), mounts middleware in order: **helmet → cors → cookieParser → json(10mb) → urlencoded → sanitizeRequest → global rate limit → HTTP logger**. Defines `GET /uploads/:filename` (tenant-aware GridFS streaming matched on the exact `/uploads/<id>` reference: own-company reference → serve; other-company-only → 403; unreferenced → 404) and `/health` + `/api/health`. Mounts 8 routers under `/api/*` (plus the `/api/tools` alias); `errorHandler` last. Listens on `PORT` when run directly. | `module.exports = app` | `config/db`, all `routes/*`, `middleware/{auth,error,sanitize}`, `utils/{mediaStorage,logger}`, models `Equipment`, `Fault`, `User`, `constants/rateLimits` | `npm start/dev`, every backend test |
| `config/db.js` | 15 | `connectDB()` — sets `sanitizeFilter`, `mongoose.connect(MONGO_URI)`, logs through `logger`, `process.exit(1)` on failure. | `connectDB` | mongoose, `utils/logger` | `app.js`, `seeders/seeder.js`, `scripts/createSuperAdmin.js` |

### 4.1.2 Constants (`constants/`)

| File | Exports | Business meaning | Used by |
|---|---|---|---|
| `audit.js` | `AUDIT_ACTIONS` (11 actions), `ALL_AUDIT_ACTIONS`, `AUDIT_RETENTION_DAYS = 365` | Audit vocabulary; mirrored by `frontend/src/constants/audit.js`. | `models/AuditLog`, auth/user/superadmin controllers, `superadminService`, seeder |
| `auth.js` | Token lifetimes, refresh-cookie max-age, `CURRENT_TERMS_VERSION`, bcrypt rounds, reuse grace, reset-token TTL, email-verification TTL (24 h) | Session policy (rationale for the 60-minute access token documented inline: fewer PWA refreshes); legal-document version recorded at signup. | `authService`, `authController`, `userService`, `superadminService`, `createSuperAdmin`, `__tests__/termsVersion.test.js` |
| `faultStatus.js` | `FAULT_STATUS {OPEN, CLOSED}`, `ALL_FAULT_STATUSES` | Fault lifecycle. | `models/Fault`, `faultService`, `utils/equipmentEngineHours` |
| `notifications.js` | `NOTIFICATION_TYPES`, `ALL_NOTIFICATION_TYPES`, `NOTIFICATION_PAGE_SIZE`, `ANNOUNCEMENT_LIMITS` | Notification kinds and caps. | `models/Notification`, `notificationService` |
| `pagination.js` | `DEFAULT_PAGE`, `DEFAULT_LIMIT`, `MAX_LIMIT` | List paging bounds. | equipment / fault / maintenance / superadmin services |
| `rateLimits.js` | `AUTH_RATE_LIMIT`, `GENERAL_RATE_LIMIT`, `PASSWORD_RESET_RATE_LIMIT` | Abuse protection. | `app.js`, `routes/authRoutes` |
| `roles.js` | `ROLES`, `ALL_ROLES` (tenant roles), `USER_SCHEMA_ROLES` (+superadmin), `MECHANIC_OR_ADMIN_ROLES`, `DEFAULT_ROLE` | RBAC vocabulary; superadmin excluded from assignable roles. | `models/User`, `authMiddleware`, `authService`, `userService`, `notificationService`, `superadminService`, `authController`, `createSuperAdmin` |
| `scheduleStatus.js` | `SCHEDULE_STATUS`, `ALL_SCHEDULE_STATUSES`, `DUE_SOON_THRESHOLD_HOURS = 20` | Maintenance due-state rule. | `models/Equipment`, `equipmentService`, `utils/equipmentEngineHours` |

### 4.1.3 Models (`models/`) — full field dictionaries in [02](02-database-and-schemas.md)

| File | Lines | Model / collection | Notable logic |
|---|---|---|---|
| `AuditLog.js` | 51 | `AuditLog` / `auditlogs` | Explicit sub-schemas `AuditActorSchema`, `AuditTargetSchema` (prevents Mongoose reading `target.type` as a type declaration); TTL 365 d. |
| `Company.js` | 22 | `Company` / `companies` | Unique slug. |
| `Equipment.js` | 106 | `Equipment` + `Tool` / `tools` | Embedded books, schedules, checklists; registers both model names guarded by `mongoose.models` checks. |
| `Fault.js` | 53 | `Fault` / `faults` | 3 compound tenant indexes. |
| `Maintenance.js` | 43 | `Maintenance` / `maintenances` | Checklist snapshot (`done` default true). |
| `Notification.js` | 62 | `Notification` / `notifications` | Per-recipient design; feed/badge indexes. |
| `PushSubscription.js` | 66 | `PushSubscription` / `pushsubscriptions` | `toWebPushSubscription()` method; unique endpoint. |
| `RefreshToken.js` | 64 | `RefreshToken` / `refreshtokens` | TTL on `expiresAt`; `wasRotated` grace semantics. |
| `Tool.js` | 10 | alias | `module.exports = require('./Equipment')`. |
| `User.js` | 89 | `User` / `users` | `formatUserName` setter + `pre('save')`; conditional `companyId` requirement; `emailVerified` (default `true`); `select: false` on `password`, the reset fields and the email-verification fields; static `User.formatUserName`. |

### 4.1.4 Middleware (`middleware/`)

| File | Lines | Exports | Behaviour | Used by |
|---|---|---|---|---|
| `authMiddleware.js` | 151 | `verifyToken`, `ensureAdmin`, `ensureMechanicOrAdmin`, `ensureSuperAdmin` | `verifyToken`: Bearer-only JWT (HS256) → load user + company on every request → reject inactive company → build `req.user = { userId, _id, name, email, role, companyId, company, mustChangePassword }` → confine superadmin to `SUPERADMIN_PATH_PREFIXES` → enforce the password-change gate. Guards are pure role checks. Responds directly (never `next(err)`). | `app.js`, all route files |
| `errorMiddleware.js` | 78 | `errorHandler` | Central error → HTTP mapping (see [05 §5.1.1](05-api-and-workflows.md#511-global-error-mapping-middlewareerrormiddlewarejs)); 4xx logged as `warn`, others as `error`. | `app.js` |
| `sanitizeMiddleware.js` | 61 | `sanitizeRequest`, `sanitizeInPlace` | Recursively deletes `$`-prefixed / dotted keys from `body`, `query`, `params` in place (Express 5 `req.query` is a getter). | `app.js` |
| `uploadMiddleware.js` | 51 | default `upload` (multer) | Memory storage, 50 MB, MIME allow-list (rejection → `httpError(400)`). | `authRoutes` (`single('avatar')`), `equipmentRoutes` (`single('book')`), `faultRoutes` (`array('photos', 5)`) |
| `validationMiddleware.js` | 25 | `validateObjectId(...names)` | 400 on missing/invalid ObjectId params (default `id`). | admin, equipment, fault, maintenance, notification, superadmin routes |

### 4.1.5 Routes (`routes/`) — full contract in [05 §5.2](05-api-and-workflows.md#52-endpoint-reference)

| File | Lines | Mount | Router-level middleware | Endpoints |
|---|---|---|---|---|
| `authRoutes.js` | 58 | `/api/auth` | per-route `authLimiter`, `passwordResetLimiter` (keyed by lower-cased email; on `/forgot-password` and `/resend-verification`), `verifyToken` on `/me*` | 13 |
| `equipmentRoutes.js` | 53 | `/api/equipment` and `/api/tools` | `verifyToken` | 17 (incl. 3 verbs for `/progress`) |
| `toolRoutes.js` | 1 | `/api/tools` | — | Re-exports `equipmentRoutes`. |
| `faultRoutes.js` | 29 | `/api/faults` | `verifyToken` | 8 |
| `maintenanceRoutes.js` | 15 | `/api/maintenance` | `verifyToken` | 2 |
| `notificationRoutes.js` | 40 | `/api/notifications` | `verifyToken` | 9 |
| `adminRoutes.js` | 23 | `/api/admin` | `verifyToken`, `ensureAdmin` | 4 (users) |
| `superadminRoutes.js` | 40 | `/api/superadmin` | `verifyToken`, `ensureSuperAdmin` | 10 |

### 4.1.6 Controllers (`controllers/`)

Thin adapters: extract `req.user.companyId` / `req.user.userId` / params / body / files → call one service → set the status code → `next(err)` on failure. Audit writes happen here, after the service succeeds.

| File | Lines | Handlers | Extra logic beyond delegation |
|---|---|---|---|
| `authController.js` | 341 | `register`, `verifyEmail`, `resendVerification`, `login`, `refreshToken`, `logout`, `me`, `updateProfile`, `deleteAccount`, `uploadAvatar`, `changePassword`, `forgotPassword`, `resetPassword` | `getCookieOptions(maxAge, path)` (httpOnly, secure in prod, `sameSite` none/lax, optional domain); `setRefreshCookie` (path `/api/auth`); `clearAuthCookies` (also legacy `token`, `accessToken`); `register` sets no cookie (session starts at `verifyEmail`); audits `company.registered`, `auth.superadmin_login`, `auth.login_failed` (email ≤ 254 chars), `account.self_deleted`; clears cookies on `TOKEN_REUSE_DETECTED`. |
| `equipmentController.js` | 255 | `getAllTools`, `getToolById`, `createTool`, `updateTool`, `deleteTool`, `addBook`, `deleteBook`, `addSchedule`, `deleteSchedule`, `completeSchedule`, `getSchedule`, `addChecklistItem`, `toggleChecklistItem`, `deleteChecklistItem`, `updateScheduleProgress` | Aliases `getAllEquipment`, `getEquipmentById`, `createEquipment`, `updateEquipment`, `deleteEquipment`. |
| `toolController.js` | 9 | — | Re-exports `equipmentController`. **No importers** since the `/api/admin/tools` aliases were removed (`toolRoutes.js` re-exports the equipment router instead). |
| `faultController.js` | 127 | `getAllFaults`, `getFaultById`, `createFault`, `closeFault`, `reopenFault`, `deleteFault`, `updateFault` | `createFault` calls `notificationService.notifyFaultReported` inside its own try/catch (logged, never fails the request). |
| `maintenanceController.js` | 34 | `getAllMaintenance`, `deleteMaintenance` | — |
| `notificationController.js` | 168 | `getMyNotifications`, `getUnreadCount`, `markRead`, `deleteNotification`, `markAllRead`, `sendAnnouncement`, `getPushPublicKey`, `subscribeToPush`, `unsubscribeFromPush` | `subscribeToPush` accepts `{ subscription }` or the raw object; passes `User-Agent`. |
| `userController.js` | 86 | `getAllUsers`, `createUser`, `updateUserRole`, `deleteUser` | Audits `user.created`, `user.role_changed`, `user.deleted`. |
| `superadminController.js` | 93 | `getStats`, `listCompanies`, `getCompany`, `setCompanyStatus`, `listUsers`, `updateUserRole`, `resetUserPassword`, `deleteUser`, `sendAnnouncement`, `listAuditLogs` | `handle(fn, status)` wrapper (JSON, or 204 when the result is `undefined`); audits company status, role change, password reset, deletion, platform announcement. |

### 4.1.7 Services (`services/`) — business logic

| File | Lines | Functions (signature → result) | Business rules implemented | Depends on |
|---|---|---|---|---|
| `authService.js` | 746 | `register(body)` → `{user}` · `verifyEmail(body)` → `{user, tokens}` · `resendVerification(body)` · `login(body)` · `rotateRefreshToken(raw)` → `{tokens}` · `logout(raw)` · `getProfile(userId)` · `updateProfile(userId, body)` · `uploadAvatar(userId, file)` · `changePassword(userId, body)` → `{mustChangePassword, termsAccepted}` · `deleteAccount(userId, body)` · `requestPasswordReset(body)` · `resetPassword(body)`. Internal: `getRefreshSecret`, `hashToken` (SHA-256), `generateSlug`, `generateTokens(user, companyId, familyId?)`, `shapeUserProfile`, `appBaseUrl()` (first `FRONTEND_URL` entry), `sendVerificationEmail(user)`. | Signup creates Company + unverified admin (compensating company delete on failure) and emails a 24 h single-use verification link, no session; login refused with 403 `EMAIL_NOT_VERIFIED` until verified; verify consumes the token atomically and signs in; resend is silent for unknown/verified emails; role always admin; terms mandatory, version `CURRENT_TERMS_VERSION` (`1.3`); password loaded only via `.select('+password')` where it is verified; email regex `^[^\s@]+@[^\s@]+\.[^\s@]+$`; password ≥ 8; email change needs current password; RTR with family revocation and a 30 s rotation-race grace; password change/reset revokes all sessions; forced change skips current password but requires terms; reset token single-use, atomic consume, 30 min; reset and verification links built only from `FRONTEND_URL`, never the request `Host`; self-delete needs typed `delete <name>` + password and removes tokens, push subscriptions, avatar. | `User`, `Company`, `RefreshToken`, `PushSubscription`, `utils/{httpError, mediaStorage, mailer, logger}`, `constants/{roles, auth}` |
| `userService.js` | 176 | `getAllUsers(companyId)` · `createUser(companyId, body)` · `updateUserRole(companyId, actingUserId, targetUserId, body)` → `{user, previousRole}` · `deleteUser(companyId, actingUserId, targetUserId)` → deleted summary | New users: operator + `mustChangePassword`; role ∈ tenant roles; no self role-change / self-delete; last-admin protection; delete also removes the user's refresh tokens, push subscriptions and avatar file. | `User`, `RefreshToken`, `PushSubscription`, `bcrypt`, `utils/{httpError, mediaStorage}`, `constants/{roles, auth}` |
| `equipmentService.js` | 627 | `filterEquipmentFields(body)` · `getAllTools(companyId, query)` · `getToolById(companyId, id)` · `createTool` · `updateTool` · `deleteTool` · `addBook(companyId, id, file, body)` · `deleteBook` · `addSchedule` · `deleteSchedule` · `completeSchedule(companyId, userId, id, scheduleId, body)` · `getSchedule` · `addChecklistItem` · `toggleChecklistItem` · `deleteChecklistItem` · `updateScheduleProgress` | Field whitelist; list returns fault ids unpopulated, detail populates faults; detail read re-syncs hours; delete cascades (book files, fault photo files, notifications, faults, maintenance); book existence checked before storing the file; schedule next-due computation; completion → Maintenance record + checklist snapshot/reset + notes merge + hours sync. | `Equipment`, `Fault`, `Maintenance`, `Notification`, mongoose (`trusted`), `utils/{equipmentEngineHours, httpError, mediaStorage}`, `constants/{pagination, scheduleStatus}` |
| `faultService.js` | 357 | `getAllFaults(companyId, query, userId)` · `getFaultById` · `createFault(companyId, userId, body, files)` · `closeFault(companyId, userId, id, body)` · `reopenFault` · `deleteFault` · `updateFault(companyId, userId, id, body)` | Tool must belong to the tenant; photos only from uploads; report hours never applied directly; all reads and close/reopen populate users with `name email role` only (`FAULT_POPULATE_FIELDS`); close records `closingEngineHours` and syncs; reopen/delete/`status: open` pass the removed closing reading to the sync; reopen unsets resolution; delete removes notifications, files and the back-reference. | `Fault`, `Tool`, `Notification`, `utils/{equipmentEngineHours, httpError, mediaStorage}`, `constants/{pagination, faultStatus}` |
| `maintenanceService.js` | 78 | `getAllMaintenance(companyId, query)` · `deleteMaintenance(companyId, id)` | Tenant-scoped list (optional `toolId`); delete re-syncs hours with the deleted reading as `removedReading`. | `Maintenance`, `utils/{equipmentEngineHours, httpError}`, `constants/pagination` |
| `notificationService.js` | 414 | `dispatch({companyId, recipients, type, title, body, link, sender, data})` · `notifyFaultReported(fault, reporter)` · `createAnnouncement(companyId, sender, payload)` · `createPlatformAnnouncement(sender, payload)` · `listForUser` · `getUnreadCount` · `markRead` · `deleteNotification` · `markAllRead`. Internal `parseAnnouncement`. | One document per recipient; DB write authoritative, push best-effort; reporter excluded from fault fan-out; sender excluded from broadcast; announcement length caps; explicit empty role list rejected; platform broadcast grouped per company; foreign notification → 404. | `Notification`, `User`, `Company`, `pushService`, `utils/{logger, httpError}`, constants |
| `pushService.js` | 187 | `isPushConfigured()` · `getPublicKey()` · `saveSubscription(companyId, userId, sub, ua)` · `removeSubscription(userId, endpoint)` · `sendToUsers(userIds, payload, notificationIdByUser?)` → `{sent, failed, pruned}` | VAPID configured at module load (invalid keys → disabled, logged); upsert by endpoint (re-homes shared devices); owner-scoped unsubscribe; per-recipient `notificationId` in payload; prune on 404/410; never throws. | `web-push`, `PushSubscription`, `utils/{logger, httpError}` |
| `superadminService.js` | 381 | `getStats()` · `listCompanies(query)` · `getCompany(id)` · `setCompanyActive(id, body)` · `listUsers(query)` · `updateUserRole(actingId, targetId, body)` · `deleteUser(actingId, targetId)` · `resetUserPassword(targetId)` → `{temporaryPassword, user}` · `listAuditLogs(query)`. Internal: `escapeRegex`, `searchRegex`, `pageParams`, `tenantUsersFilter`, `monthlyCounts`, `userActivityByCompany`, `findTenantUser`. | Cross-tenant by design; superadmins excluded from user lists/ops; 12-month zero-filled series; 30-day activity window; top-10 companies; dormant sample of 5; GridFS storage totals; deactivation revokes refresh tokens; temp password = 9 random bytes (base64url) + forced change + session revocation; delegates role/delete to `userService` to keep the last-admin guard. | `User`, `Company`, `RefreshToken`, `AuditLog`, `userService`, bcrypt, crypto, constants |

### 4.1.8 Utilities (`utils/`)

| File | Lines | Exports | Responsibility | Used by |
|---|---|---|---|---|
| `audit.js` | 52 | `recordAudit(req, {action, actor?, companyId?, target?, metadata?})`, `userTarget(user)`, `companyTarget(company)` | Best-effort audit insert (errors logged, never thrown); actor defaults to `req.user`; IP from `req.ip`. | auth, user, superadmin controllers |
| `equipmentEngineHours.js` | 92 | `syncEquipmentEngineHours(toolId, companyId, candidate?, removedReading?)` | Highest-wins engine-hours (recomputed from the remaining records when `removedReading` was the current value) + schedule status recalculation ([02 §2.13](02-database-and-schemas.md#213-derived-data-engine-hours-synchronization)). Resolves models via `mongoose.models` to avoid require cycles. | equipment, fault, maintenance services |
| `httpError.js` | 27 | `httpError(status, message, extra?)` | Error with `status` (and optional `code`) for the central handler. | all services |
| `logger.js` | 141 | `logger.{error,warn,info,http,debug}` | Leveled, ANSI-coloured console logger; `LOG_LEVEL`; silent in tests unless `TEST_LOGS`. | app, error middleware, services, controllers, mailer |
| `mailer.js` | 49 | `sendMail({to, subject, text, params})` | EmailJS HTTPS send; dev fallback logs; production throws when unconfigured. Sends the password-reset and email-verification messages. | `authService` |
| `mediaStorage.js` | 112 | `storeFile`, `getFileInfo`, `openDownloadStream`, `deleteFile`, `idFromUrl` | Lazy `GridFSBucket('uploads')`; idempotent delete; `/uploads/<id>` parsing. | app, auth/user/equipment/fault services, migration script |

### 4.1.9 Scripts & seeders

| File | Lines | Responsibility |
|---|---|---|
| `scripts/createSuperAdmin.js` | 73 | CLI (`util.parseArgs`): validates email; password from `SUPERADMIN_PASSWORD` (≥ 12) or generated; refuses to convert a tenant user; creates a superadmin, or resets its password and revokes its sessions. |
| `scripts/migrateUploadsToGridFS.js` | 118 | One-time: reads `backend/uploads/*`, stores each in GridFS, rewrites `/uploads/<filename>` references in `Fault.photos`, `Equipment.books.fileUrl`, `User.avatar`; idempotent; keeps originals. |
| `seeders/seeder.js` | 244 | Dev-only demo data (two farms + superadmin); see [02 §2.14](02-database-and-schemas.md#214-seed-data-backendseedersseederjs-dev-only). Helpers: `daysAgo`, `daysFromNow`, `service(...)` schedule builder, `createUsers`, `linkFaults`. |

---

## 4.2 Frontend (`frontend/src/`, ESM + JSX)

### 4.2.1 Bootstrap & routing

| File | Lines | Responsibility |
|---|---|---|
| `main.jsx` | 43 | Registers the PWA service worker (hourly + on-foreground update checks); renders `StrictMode > ErrorBoundary > ThemeModeProvider > BrowserRouter > AppRoutes`. |
| `routes.jsx` | 386 | Provider stack `NotificationProvider > AuthProvider > ToolProvider > FaultProvider > PageRefreshProvider > NotificationFeedProvider > (AppLayout + AccessibilityMenu)`. Lazy-loads 20 pages; preloads chunks on idle after login (incl. `GuidePage`). Guards: `ProtectedRoute`, `RequireStaff` (redirects operators to `/dashboard`), `RequireAdmin` (role prop), `RequirePasswordChange`. `RouteFallback` = `LinearProgress` over `PageSkeleton`. `AppLayout` hides navigation on `HIDE_NAVBAR_PATHS` (`/`, `/login`, `/signup`, `/force-password-change`, `/reset-password`, `/verify-email`), on `PUBLIC_CHROME_PATHS` (`/guide`) when signed out, and whenever `serverDown` is true (then renders a 503 `ErrorPage` "Can't reach FixFleet" with a reload button instead of the routes). Routes are wrapped in an `ErrorBoundary` keyed by pathname, so a page crash keeps the nav and navigating away recovers. Otherwise renders `Navbar`, `ForcePasswordChangeDialog`, `PullToRefresh` around routes, `LegalFooter`, and a globally-lifted `CreateFaultDialog` opened by the phone FAB. Full route table in [01 §1.6](01-architecture-and-layers.md#16-frontend-route-map). |
| `index.css` | 97 | Global styles (see 03). |
| `theme/index.js` | 518 | `getAppTheme(mode)` — light/dark MUI theme. |
| `content/legalDocuments.js` | 325 | `LEGAL_CONTACT_EMAIL`; Terms of Service v1.3, Privacy Policy v1.3, Accessibility Statement v1.0, each in English and Hebrew; `LEGAL_DOCS`, `getLegalDoc(type, lang)`. A header comment ties the terms/privacy version to the backend `CURRENT_TERMS_VERSION`. |

### 4.2.2 Constants (`constants/`)

| File | Exports | Notes |
|---|---|---|
| `appVersion.js` | `APP_VERSION` | `import.meta.env.VITE_APP_VERSION` (injected from `/VERSION` by `vite.config.js`), `'dev'` if unset. |
| `audit.js` | `AUDIT_ACTION_INFO` (label + MUI chip colour per action), `describeAudit(log)` | Mirror of backend audit actions. |
| `faultStatus.js` | `FAULT_STATUS`, `ALL_FAULT_STATUSES` | Mirror. |
| `roles.js` | `ROLES`, `ALL_ROLES`, `MECHANIC_OR_ADMIN_ROLES`, `DEFAULT_ROLE`, `isMechanicOrAdmin(role)`, `canUseTenantApi(user)` | `canUseTenantApi` = signed in, not forced-change, not superadmin — gates every tenant fetch. |
| `routes.js` | `ROUTES` (23 static paths, incl. `SIGNUP`, `GUIDE`, `VERIFY_EMAIL`), `equipmentDetailRoute`, `equipmentScheduleRoute`, `equipmentDetailTabRoute`, `superadminTabRoute`, `homeRouteFor(user)` | Single source of route strings. |

### 4.2.3 Services (`services/`) — HTTP adapters

| File | Lines | Methods | Notes |
|---|---|---|---|
| `apiClient.js` | 162 | axios instance (`baseURL = VITE_API_URL \|\| '/api'`, `withCredentials`), `setToken(token)`, `shouldRedirectToLogin(path)`, `API_ERROR_EVENT` (`'api:error'`), `normalizeApiError(error)` | Restores Bearer from `localStorage['token']`; single-flight 401 refresh with request queue; redirects to `/login` except on public paths (`/`, `/login`, `/signup`, `/reset-password`, `/verify-email`, `/terms`, `/privacy`, `/legal`, `/accessibility`, `/guide`). Every rejection is normalized: server message → `error.message`; network/5xx/429 get friendly text and are broadcast as `api:error`; `ERR_CANCELED` passes through. |
| `adminService.js` | 35 | `getUsers`, `createUser`, `updateUserRole`, `deleteUser` | Used by `AdminDashboard`. |
| `equipmentService.js` | 152 | `getAll`, `getById`, `create`, `update`, `delete`, `uploadBook(id, formData, {onUploadProgress})`, `deleteBook`, `addSchedule`, `deleteSchedule`, `completeSchedule`, `getSchedule`, `addChecklistItem`, `toggleChecklistItem`, `deleteChecklistItem`, `updateScheduleProgress` (PATCH, falls back to PUT) | Upload timeout 3 min. |
| `faultsService.js` | 53 | `getAll(params)` (normalizes paginated/plain), `getById`, `create(payload)` (FormData when `files`), `close`, `reopen` (PATCH), `update` (PUT), `delete` | — |
| `maintenanceService.js` | 27 | `getMaintenance(params)`, `deleteMaintenance(id)` | Used by `EquipmentMaintenanceTab`. |
| `notificationsService.js` | 104 | `getAll`, `getUnreadCount`, `markRead`, `markAllRead`, `deleteNotification`, `sendAnnouncement`, `getPushPublicKey`, `subscribeToPush`, `unsubscribeFromPush` | — |
| `superadminService.js` | 73 | `getStats`, `getCompanies`, `getCompany`, `setCompanyActive`, `getUsers`, `updateUserRole`, `resetUserPassword`, `deleteUser`, `getAuditLogs`, `sendAnnouncement` | — |
| `userService.js` | 66 | `getProfile`, `updateProfile`, `deleteAccount(confirmation, currentPassword)`, `changePassword`, `forgotPassword`, `resetPassword(token, newPassword)`, `resendVerification(email)`, `uploadAvatar(file)` | Returns raw axios responses (callers read `.data`). |

### 4.2.4 State (`contexts/`)

| File | Lines | Provider / hook | State & actions | Side effects |
|---|---|---|---|---|
| `AuthContext.jsx` | 196 | `AuthProvider`, `useAuth` | `user`, `userId`, `loading`, `serverDown`, `login(email,pwd \| {email,pwd})` (rethrows with the server `code`, e.g. `EMAIL_NOT_VERIFIED`), `signup(...)` → `{ email }` (no session), `verifyEmail(token)`, `logout()`, `updateAvatar(file)`, `setUser` | `GET /auth/me` on mount: a network error or 5xx sets `serverDown` and keeps the stored token; a 4xx clears it. `completeSession(data)` (shared by login and verifyEmail) stores the token, normalizes the name with `formatUserName` and navigates. |
| `EquipmentContext.jsx` | 131 | `EquipmentProvider` (`ToolProvider`), `useEquipment` (`useTool`) | `equipment` / `tools` (sorted by `localSerialNumber`, then name), `loading`, `error`, `fetchEquipment`, `create/update/deleteEquipment` (+ Tool aliases) | Fetches when `canUseTenantApi(user)`; `retry()` with backoff; toasts. |
| `ToolContext.jsx` | 9 | re-exports | — | — |
| `FaultContext.jsx` | 141 | `FaultProvider`, `useFault(toolId?)` | `faults` (filtered by tool, sorted open-first then oldest), `fetchFaults`, `createFault`, `updateFault`, `deleteFault`, `closeFault`, `reopenFault` | Same fetch gating; toasts. |
| `NotificationContext.jsx` | 65 | `NotificationProvider`, `useNotify` | `notify.success/error/info/warning(msg)` | Single MUI `Snackbar` (6 s), positioned above the phone bottom nav. Listens for `api:error` window events from `apiClient` and shows them as error toasts. |
| `NotificationFeedContext.jsx` | 310 | `NotificationFeedProvider`, `useNotificationFeed` (inert fallback outside the provider) | `notifications`, `unreadCount`, `loading`, `error`, `refresh`, `refreshUnreadCount`, `markRead`, `deleteNotification`, `markAllRead` (optimistic) | 20 s unread poll; refetch on visibility and SW message; Badging API sync; triggers page refresh on new notifications. |
| `PageRefreshContext.jsx` | 149 | `PageRefreshProvider`, `usePageRefresh(fn)`, `usePageRefreshTrigger()` | Set of handlers in a ref; `refresh()` runs all, swallowing individual errors | 30 s poll while visible; refetch on visibility. |
| `ThemeContext.jsx` | 61 | `ThemeModeProvider`, `useThemeMode` | `mode`, `toggleColorMode` | Persists `localStorage['maintenance_app_theme']`; honours `prefers-color-scheme`; sets `<html data-theme>`. |

### 4.2.5 Hooks (`hooks/`)

| File | Lines | Signature | Responsibility |
|---|---|---|---|
| `useAuthenticatedBlobUrl.js` | 80 | `useAuthenticatedBlobUrl(url) → { blobUrl, loading, error }` | Fetches protected media through `apiClient` (Bearer + refresh) as a blob; refuses untrusted origins; revokes object URLs on cleanup. |
| `useForm.js` | 73 | `useForm({ initialValues, validate, onSubmit }) → { values, errors, isSubmitting, handleChange, handleSubmit, resetForm, setValues }` | Generic form state (checkbox/file aware). |
| `usePullToRefresh.js` | 126 | `usePullToRefresh({ onRefresh, disabled, threshold=70, maxPull=120, getScrollTop }) → { containerRef, pullDistance, refreshing, threshold }` | Touch-gesture pull-to-refresh without libraries. |
| `usePushNotifications.js` | 192 | `usePushNotifications() → { supported, enabled, permission, serverConfigured, busy, ready, subscribe, unsubscribe }`; also exports `urlBase64ToUint8Array`, `browserSupportsPush` | Browser push opt-in/out; reuses existing subscriptions; server-first unsubscribe. |

### 4.2.6 Utilities (`utils/`)

| File | Lines | Exports | Responsibility |
|---|---|---|---|
| `index.js` | 76 | `sortToolsByLocalSerial`, `sortFaultsByOpenAndCreateDate`, `retry(fn, retries=3, delay=500, factor=5)` (no retry on 401/403/404), re-exports `formatUtils` | Collections + resilience. |
| `formatUtils.js` | 48 | `formatUserName`, `getUserInitials` | Mirrors backend name formatting; avatar initials. |
| `mediaUtils.js` | 24 | `getMediaUrl(path)` | Resolves `/uploads/...` against an absolute `VITE_API_URL` origin. |
| `validate.js` | 88 | `isRequired`, `validateEmail`, `validatePassword` (≥ 8), `validateName` (letters/space/hyphen/apostrophe incl. Latin-1), `validateRole`, `validateMinLength` | Client-side validators. |
| `clickableRow.js` | 30 | `clickableRowProps(onActivate, label)`, `stopRowClick` | Accessible clickable MUI table rows. |
| `guideContent.js` | 29 | `GUIDE_SOURCE` (`/user-guide/index.html`), `parseGuide(html)` → `{ html, toc, lede }` | Parses the static user guide with `DOMParser`: keeps `<main>`, strips `script`/`iframe`/`object`/`embed`, rewrites relative image paths to `/user-guide/…`, builds the contents list from `section[id]` + `h2`, reads the `.lede`. |

### 4.2.7 Pages (`pages/`)

| File | Lines | Route(s) | Roles | Responsibility | Data sources |
|---|---|---|---|---|---|
| `HomePage.jsx` | 230 | `/` | public | Landing page: renders at once (does not wait for the session check) and redirects to `homeRouteFor(user)` once a user is known. `PublicHeader`, hero with sign-up / sign-in / guide buttons and a light/dark dashboard screenshot (`/home/dashboard-*.webp`), three feature cards and three role cards linking to guide sections, guide-topic chips, `LegalFooter`. | `useAuth`, `useThemeMode` |
| `GuidePage.jsx` | 184 | `/guide` (deep links `/guide#<section>`) | public; signed-in users see it inside the app layout | Fetches `GUIDE_SOURCE`, renders the parsed guide (`dangerouslySetInnerHTML`, first-party content) styled with the app theme; sticky contents list (desktop) or chip row (mobile) highlighted by an `IntersectionObserver`; skeleton while loading; error alert on fetch failure. | `fetch`, `parseGuide`, `useAuth` |
| `Login.jsx` | 23 | `/login`, `/signup` | public | Redirects signed-in users; renders `LoginComponent`. | `useAuth` |
| `VerifyEmailPage.jsx` | 75 | `/verify-email?token=` | public | Calls `verifyEmail(token)` once (`useRef` guard against StrictMode); skeleton while verifying; invalid/expired message with a **Sign in** button on failure. | `useAuth().verifyEmail` |
| `Logout.jsx` | 19 | `/logout` | any | Calls `logout()` then navigates to `/login`; shows `PageSkeleton label="Signing out"`. | `useAuth` |
| `ResetPasswordPage.jsx` | 167 | `/reset-password?token=` | public | New password + confirm → reset. | `userService.resetPassword` |
| `ForcePasswordChangePage.jsx` | 242 | `/force-password-change` | user with `mustChangePassword` | New password + terms checkbox (opens `LegalModal`). | `userService.changePassword` |
| `LegalPage.jsx` | 188 | `/terms`, `/privacy`, `/legal`, `/accessibility` | public | Tabbed legal documents with EN/HE toggle. | `LEGAL_DOCS` |
| `NotFound.jsx` | 17 | `*` | public | 404 via `ErrorPage` ("Back to Dashboard"). | — |
| `ErrorPage.jsx` | 90 | — (layout) | — | Shared full-page error layout `({ code, title, message, actions })`, `role="alert"`; actions take `to` (router link) or `href`/`onClick`. Used by `NotFound`, `ErrorBoundary` and the `serverDown` state in `routes.jsx`. | — |
| `Dashboard.jsx` | 859 | `/dashboard` | tenant users | **Operator view**: hero, own-report list, quick links (My Reports, Manuals, Account). **Staff view**: KPI cards (total/open/closed faults, fleet operational = fleet − equipment with open faults), 14-day Reported vs Resolved chart (Recharts), filterable/searchable fault list with close/reopen/delete; local Create/Close/Confirm dialogs. Sub-components `DashboardSkeleton`, `FilterBar`, `FaultEmptyState`. | `faultsService.getAll`, `equipmentService.getAll`, contexts |
| `EquipmentsPage.jsx` (`ToolsPage.jsx` re-export) | 259 | `/equipment` (`/tools` redirects) | mechanic, admin | Fleet directory: search, status filter (all / faults / operational), grid/table toggle, open-fault badges; admin create dialog (`CreateToolForm`). | `useEquipment`, `faultsService.getAll` |
| `EquipmentPage.jsx` (`ToolPage.jsx` re-export) | 425 | `/equipment/:id`, `/tools/:id` | mechanic, admin | Machine detail with tabs Faults / Maintenance / Manuals (`?tab=faults\|maintenance\|books`); fault actions via dialogs. | `equipmentService.getById`, `useFault(id)` |
| `EquipmentSchedulePage.jsx` | 461 | `/equipment/:id/schedules/:scheduleId` (+ `/tools/...`) | mechanic, admin | Checklist toggling, in-progress notes, complete-service dialog with incomplete-checklist confirmation. | `equipmentService.getSchedule / toggleChecklistItem / updateScheduleProgress / completeSchedule` |
| `EquipmentBooksPage.jsx` | 340 | `/manuals` (`/books` redirects) | all tenant users | Library of all equipment that has manuals; search; opens `PdfViewerDialog`. | `equipmentService.getAll` |
| `OperatorReportsPage.jsx` | 287 | `/my-reports` | all tenant users | Operators: own faults (`mine=1`); staff: all faults; search/status filter; create fault; details dialog. | `faultsService.getAll / create` |
| `ProfilePage.jsx` | 346 | `/profile` | tenant users | Profile summary card with role colour, own fault statistics and list linking to equipment. | `faultsService.getAll({ mine: 1 })` |
| `AccountPage.jsx` | 564 | `/account` | all (incl. superadmin) | Avatar upload, name/email edit (password for email change), password change with strength meter, theme toggle, push settings (tenant users only), logout, account deletion dialog. | `userService.*`, `useAuth`, `useThemeMode` |
| `NotificationsPage.jsx` | 169 | `/notifications` | tenant users | Full feed with all/unread filter, mark all read, delete with confirm, click-through to `link`. | `useNotificationFeed` |
| `AdminDashboard.jsx` | 255 | `/admin` | admin | Users panel (create, role change, delete) + equipment panel (CRUD via context) + "Send Announcement". | `adminService` (users), `useTool` |
| `SuperAdminDashboard.jsx` | 1 079 | `/superadmin/:tab?` (`''`, `companies`, `users`, `audit`) | superadmin | **Overview**: KPI cards, 12-month growth charts, attention card (inactive/dormant), recent signups, recent activity. **Companies**: searchable table, activate/deactivate with confirm, users dialog. **Users**: debounced search, company/role filters, paginated table, role change, password reset (shows temp password once), delete. **Audit**: filters (action, company, search), paginated log, details dialog. Platform announcement dialog. | `superadminService.*` |

### 4.2.8 Components (`components/`)

| File | Lines | Exports (props) | Responsibility |
|---|---|---|---|
| `AccessibilityMenu/AccessibilityMenu.jsx` | 156 | `AccessibilityMenu()` | Floating FAB: font size 100/110/125/150 %, high contrast, underline links; auto-lifts above bottom obstacles. |
| `AccessibilityMenu/accessibilityPrefs.js` | 51 | `STORAGE_KEY`, `FONT_STEPS`, `DEFAULTS`, `EDGE_GAP`, `computeBottomOffset`, `measureBottomOffset`, `loadPrefs`, `applyPrefs` | Persistence (`localStorage['accessibility-preferences']`) and placement math. |
| `Auth/ForcePasswordChangeDialog.jsx` | 224 | default `()` | In-layout modal equivalent of the forced-change page. |
| `Auth/ResendVerificationButton.jsx` | 41 | `({ email })` | Calls `userService.resendVerification`; label states `Resend email` → `Sending…` → `Email sent` (disabled) / `Failed, retry`. Used in `SignupForm` and `LoginForm`. |
| `ConfirmDialog/ConfirmDialog.jsx` | 52 | `({ open, title, message, confirmLabel, … onConfirm, onClose })` | Generic confirmation. |
| `Dashboard/KpiCard.jsx` | 53 | `({ label, value, caption, accentColor, icon, iconBg })` | Metric tile. |
| `DialogComponent/index.jsx` | 64 | `({ open, title, onClose, children, … })` | Generic dialog shell (used by `ToolsPanel`, `UserPanel`). |
| `ErrorComponent/ErrorBoundary.jsx` | 42 | class `ErrorBoundary` | Render-error fallback showing `ErrorPage` ("Something went wrong", **Try again** reloads, **Go home** → `/`). Mounted at the root in `main.jsx` and around the routes in `routes.jsx` (keyed by pathname). |
| `ErrorComponent/ErrorComponent.jsx` | 53 | `({ message, onRetry })` | Inline error with retry. |
| `Fault/CloseFaultDialog/CloseFaultDialog.jsx` | 150 | `({ open, onClose, onConfirm, fault, tool, equipment })` | Requires engine hours ≥ 0; optional resolution text; shows last reading; links to equipment. |
| `Fault/CreateFaultDialog/CreateFaultDialog.jsx` | 83 | `({ open, onClose, onSubmit, equipment?, … })` | Dialog wrapper around `CreateFaultForm`. |
| `Fault/FaultCard/FaultCard.jsx` | 210 | `({ fault, onClick, onCloseFault, onReopenFault, onDeleteFault })` | Card with status chip, photo thumbnails, staff-only actions. |
| `Fault/FaultDetailsDialog/FaultDetailsDialog.jsx` | 281 | `({ open, fault, onClose, … actions })` | Full fault detail with photo viewer and staff actions. |
| `Fault/FaultForms/FaultForms.jsx` | 437 | `CreateFaultForm(props)` | Equipment select (lockable), code (optional), engine hours, description*, drag-and-drop photos with previews (`FileThumbnailPreview`). `validateFaultValues` requires tool and description. |
| `Fault/FaultList/FaultList.jsx` | 318 | `({ faults, loading, … actions })` | Responsive list/table of faults for one machine. |
| `Fault/FaultModal/FaultModal.jsx` | 240 | `({ open, fault, onClose, … })` | Dashboard fault detail modal. |
| `Form/Input.jsx` | 79 | `Input.{Email, Text, Number, Url, Password, Select}` | Thin MUI field wrappers (used by `UserForms`). |
| `Form/PasswordField.jsx` | 60 | forwardRef `PasswordField` | Password input with show/hide toggle. |
| `ImageViewer/ImageViewerDialog.jsx` | 234 | `({ open, images, initialIndex, onClose })` | Authenticated image carousel; rectangular `Skeleton` (`role="status"`) while loading. |
| `Legal/LanguageToggle.jsx` | 22 | `({ lang, onChange, size })` | EN/HE switch. |
| `Legal/LegalFooter.jsx` | 52 | `()` | Footer links + app version; opens `LegalModal`. |
| `Legal/LegalModal.jsx` | 177 | `({ open, onClose, defaultTab })` | Tabbed legal documents. |
| `LoginComponent/index.jsx` | 149 | `()` | Sign-in layout: logo (links to `/`), feature bullets (faults, schedules, manuals), `LoginCard`, footer. |
| `LoginComponent/LoginCard.jsx` | 83 | `()` | Sign-up form on `/signup`, sign-in on `/login`; "forgot password" is a local step within `/login`. The toggle button navigates between the two routes. |
| `LoginComponent/LoginForm.jsx` | 144 | `({ onForgotPassword })` | Email/password sign-in; on `EMAIL_NOT_VERIFIED` the error alert carries a `ResendVerificationButton`. |
| `LoginComponent/SignupForm.jsx` | 263 | `()` | Company name, name, email, password, terms checkbox; after success the form is replaced by a "Check your inbox at …" alert with a `ResendVerificationButton`. |
| `LoginComponent/ForgotPasswordForm.jsx` | 134 | `()` | Email request with 60 s resend cooldown. |
| `Logo/Logo.jsx` | 194 | `LogoMark({ size, sx })`, default `Logo(...)` | SVG brand mark and wordmark. |
| `Navbar/index.jsx` | 86 | `({ onOpenCreateFault })` | Role-based nav items (superadmin: Overview/Companies/Users/Audit Log; operator: Dashboard/My Reports/Manuals; mechanic: Dashboard/Equipment/Manuals; admin: + Admin); renders full sidebar (≥ lg), rail (sm–lg), bottom nav (< sm, Admin moved into the account sheet). |
| `Navbar/SidebarNav.jsx` | 171 | `({ variant, display, user, pages })` | Drawer with logo, nav, `NotificationBell` (tenant users), `UserMenu`. |
| `Navbar/BottomNav.jsx` | 285 | `({ display, user, pages, menuPages, onOpenCreateFault })` | Phone tab bar with centre "report fault" FAB, unread badge, account sheet (includes **User Guide** → `/guide`). |
| `Navbar/UserMenu.jsx` | 181 | `({ user })` | Avatar menu: profile, account, User Guide, logout. |
| `Navbar/navItems.jsx` | 73 | `PAGE_ICON_MAP`, `pageToPath`, `pageIcon`, `pageMenuLabel`, `isPageActive` | Nav label → route/icon mapping. |
| `Navbar/navConstants.js` | 15 | `SIDEBAR_FULL_WIDTH 240`, `SIDEBAR_RAIL_WIDTH 72`, `BOTTOM_NAV_HEIGHT 64` | Layout constants. |
| `Notifications/NotificationBell.jsx` | 152 | `({ tooltipPlacement })` | Bell with badge; popover preview of 6 (unread first); mark all read; link to full page. |
| `Notifications/NotificationItem.jsx` | 143 | `({ notification, onSelect, onDelete, dense })` | One feed row. |
| `Notifications/PushNotificationSettings.jsx` | 107 | `()` | Push toggle with permission/support messaging. |
| `Notifications/SendAnnouncementDialog.jsx` | 210 | `({ open, onClose, onSend, companies? })` | Composer; tenant audiences Everyone/Mechanics/Operators; platform mode adds Admins + company picker. |
| `Notifications/notificationPresentation.jsx` | 97 | `NOTIFICATION_TYPES`, `notificationDisplay(type)`, `sortByUnreadFirst`, `formatRelativeTime` | Presentation helpers. |
| `PdfViewer/PdfViewerDialog.jsx` | 178 | `({ open, onClose, title, fileUrl })` | Authenticated PDF viewer with download; `Skeleton` (`role="status"`) while loading. |
| `ProtectedRoute/index.jsx` | 40 | `({ children })` | Auth/loading gate (`PageSkeleton` while loading); forced-change redirect; superadmin confined to `/superadmin*`, `/account`, `/logout`. |
| `PublicHeader/PublicHeader.jsx` | 54 | `()` | Sticky header for signed-out pages (home, guide): logo → `/`, User guide link, light/dark toggle, Sign in, Sign up. |
| `PublicHeader/publicLayout.js` | 4 | `PUBLIC_CONTAINER` | Shared page-width container (`maxWidth 1100`) for the public pages. |
| `PullToRefresh/PullToRefresh.jsx` | 56 | `({ onRefresh, disabled, children })` | Indicator wrapper over `usePullToRefresh`. |
| `RequireAdmin/index.jsx` | 19 | `({ children, role = 'admin' })` | Exact-role gate; otherwise redirects to `/equipment`. |
| `Skeletons/Skeletons.jsx` | 252 | `PageHeaderSkeleton`, `FilterBarSkeleton`, `CardGridSkeleton`, `KpiCardsSkeleton`, `ChartCardSkeleton`, `TableSkeleton`, `ListRowsSkeleton`, `DetailBannerSkeleton`, `TabsSkeleton`, `FormSkeleton`, `PageSkeleton` | Loading placeholders. |
| `Skeletons/skeletonA11y.js` | 22 | `skeletonA11yProps(label)` | `role="status"`, `aria-busy`, `aria-label`. |
| `Tool/EquipmentBooksTab/EquipmentBooksTab.jsx` | 300 | `({ equipment, tool, onRefresh })` | Manual list, upload dialog with progress (PDF, ≤ 50 MB), view, delete (staff). |
| `Tool/EquipmentMaintenanceTab/EquipmentMaintenanceTab.jsx` | 752 | `({ equipment, tool, onRefresh })` | Schedule list with status chips, add schedule (+ checklist builder), delete, complete dialog, navigate to schedule page; service history log with delete. |
| `Tool/EquipmentList/EquipmentList.jsx` | 2 | re-export of `ToolsList` | Alias. |
| `Tool/EquipmentPanel/EquipmentPanel.jsx` | 2 | re-export of `ToolsPanel` | Alias. |
| `Tool/ToolForms/ToolForms.jsx` | 162 | `CreateToolForm`, `UpdateToolForm` (+ `Equipment*` aliases, `EquipmentFormFields`) | Equipment fields form (`name` required). |
| `Tool/ToolsList/ToolsList.jsx` | 325 | `({ tools, viewMode, loading, openFaultsByTool })` | Grid/table of equipment with fault badges. |
| `Tool/ToolsPanel/ToolsPanel.jsx` | 287 | `({ tools, loading, error, onCreate, onUpdate, onDelete })` | Admin equipment management table with search and dialogs. |
| `User/UserForms/UserForms.jsx` | 160 | `CreateUserForm`, default `UserForm` | User create form (name, email, password). |
| `User/UserPanel/UserPanel.jsx` | 530 | `({ users, loading, error, onCreate, onDelete, onChangeRole, … })` | Admin user table: search, inline role select with pending state, delete confirm, create dialog; self-protection in the UI. |

### 4.2.9 Service worker

| File | Lines | Responsibility |
|---|---|---|
| `frontend/public/push-sw.js` | 193 | Imported into the Workbox-generated SW. `getAccessToken()` trades the `refreshToken` cookie for an access token via `POST /api/auth/refresh` (rotating the refresh token). `push` → `showNotification` (tag = type, `renotify`), `syncAppBadge()` (Bearer `GET /api/notifications/unread-count`), `notifyOpenClients()` (`postMessage PUSH_NOTIFICATION_RECEIVED`). `notificationclick` → `markNotificationRead(id)` (Bearer `PATCH …/read`, then `syncAppBadge`) + focus/navigate an existing window or open a new one. Each push costs one refresh call and each tap two, all counted by the per-IP auth limiter (see [Audit Observations](README.md#7-audit-observations)). |

---

## 4.3 Test Suites

### 4.3.1 Backend (`backend/__tests__/`, Jest + supertest + mongodb-memory-server) — 16 files, ≈ 277 test cases

| File | Tests | Covers |
|---|---|---|
| `helpers/setup.js` | — | `connectTestDB` (memory server with one retry, `sanitizeFilter` on), `closeTestDB`, `uniqueEmail`, `registerCompanyAdmin(app)` (registers, then verifies the email; `res` is the verify-email response), `verifyRegisteredEmail(app, email)` (plants a known token hash and calls `/verify-email`), `createCompanyAndUser(overrides)`, `extractRefreshToken(setCookies)`. |
| `auth.test.js` | 52 | register, email verification (no session on register, 403 until verified, single-use link, uniform resend response), login, logout, me, profile update, self-delete, avatar, change password, transport-security regressions (no cookie auth), refresh/RTR, forgot/reset. |
| `tenantIsolation.test.js` | 34 | Cross-company isolation for tools, faults, maintenance (logged via schedule completion), users; onboarding security; health. |
| `equipment.test.js` | 29 | CRUD (delete removes fault photos and notifications), books, schedules, checklist. |
| `notification.test.js` | 28 | Fault fan-out, announcements, feed, delete, push subscriptions. |
| `superadmin.test.js` | 28 | Superadmin auth/confinement, stats, companies, cross-company users, platform announcements, audit log. |
| `authMiddleware.test.js` | 18 | `verifyToken`, forced-change gate, role guards. |
| `fault.test.js` | 22 | Create (rejected MIME → 400)/list/get/close/reopen/delete/update; no password hashes on close/reopen; engine hours drop or hold on reopen. |
| `adminUser.test.js` | 17 | Admin user management and guards; deletion removes sessions and push subscriptions. |
| `errorMiddleware.test.js` | 13 | Error mapping for 4xx vs 5xx. |
| `sanitizeMiddleware.test.js` | 12 | Unit + live injection attempt. |
| `app.test.js` | 10 | Health, CORS, malformed JSON, CastError, `/uploads` (own avatar served, unreferenced file 404). |
| `maintenance.test.js` | 4 | List by tool + pagination, delete, engine hours drop when the deleted record held the reading. |
| `logger.test.js` | 6 | Logger levels/formatting. |
| `db.test.js` | 2 | `connectDB` success/failure (logger mocked). |
| `termsVersion.test.js` | 1 | `CURRENT_TERMS_VERSION` equals the four terms/privacy `version` fields in `legalDocuments.js`. |
| `seeder.test.js` | 1 | Production guard. |

### 4.3.2 Frontend (Jest + jsdom + Testing Library) — 58 files, ≈ 477 test cases

| Area | Files (tests) |
|---|---|
| `frontend/__tests__/` | `ForcePasswordChangePage` (3), `ForgotPasswordForm` (1), `LegalDocuments` (8), `LoginCard` (3), `LoginComponent` (2), `LoginForm` (4), `SignupForm` (4) |
| `src/services/` | `apiClient` (14), `adminService` (4), `equipmentService` (15), `faultsService` (12), `maintenanceService` (2), `notificationsService` (9), `userService` (5) |
| `src/contexts/` | `AuthContext` (17), `EquipmentContext` (14), `FaultContext` (16), `NotificationContext` (8), `NotificationFeedContext` (9), `PageRefreshContext` (7), `ThemeContext` (6), `ToolContext` (3) |
| `src/hooks/` | `useForm` (10), `usePushNotifications` (11), `usePullToRefresh` (8), `useAuthenticatedBlobUrl` (2) |
| `src/utils/` | `index` (10), `formatUtils` (10), `mediaUtils` (5), `validate` (17) |
| `src/pages/` | `Dashboard` (21), `EquipmentPage` (17), `AdminDashboard` (11), `SuperAdminDashboard` (10), `GuidePage` (4, incl. `parseGuide`), `HomePage` (4) |
| `src/components/` | `Navbar/BottomNav` (14), `Navbar/SidebarNav` (10), `Navbar/index` (9), `Navbar/navItems` (2), `Fault/FaultDetailsDialog` (13), `Fault/FaultModal` (12), `Fault/FaultCard` (10), `Fault/FaultList` (10), `Fault/CloseFaultDialog` (8), `Fault/CreateFaultDialog` (7), `Tool/ToolForms` (13), `Tool/ToolsList` (9), `Tool/ToolsPanel` (2), `Tool/EquipmentList` (1), `User/UserForms` (6), `Notifications/NotificationBell` (10), `Notifications/SendAnnouncementDialog` (9), `Notifications/notificationPresentation` (8), `AccessibilityMenu` (5), `ProtectedRoute` (5), `PullToRefresh` (4), `Logo` (4) |

Test-case counts are the number of `it(` / `test(` declarations per file (static count, not a test run).
