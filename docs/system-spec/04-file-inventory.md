# 04 — File Inventory

[← Index](README.md) · [01 Architecture](01-architecture-and-layers.md) · [02 Database](02-database-and-schemas.md) · [03 Dependencies & Config](03-dependencies-and-config.md) · **04 File Inventory** · [05 API & Workflows](05-api-and-workflows.md)

Every tracked source file, grouped by layer. "Used by" lists direct importers. Line counts are as of version 1.0.8. Config, assets and docs are covered in [03 §3.5–3.7](03-dependencies-and-config.md#35-configuration-files); test files in §4.3.

---

## 4.1 Backend (`backend/`, CommonJS)

### 4.1.1 Entry point & config

| File | Lines | Responsibility | Key exports / functions | Depends on | Used by |
|---|---|---|---|---|---|
| `app.js` | 198 | Composition root. Loads env, sets `trust proxy 1`, connects DB (skipped in tests), mounts middleware in order: **helmet → cors → cookieParser → json(10mb) → urlencoded → sanitizeRequest → global rate limit → HTTP logger**. Defines `GET /uploads/:filename` (tenant-aware GridFS streaming: own-company reference → serve; other-company-only → 403; unreferenced → serve) and `/health` + `/api/health`. Mounts 9 routers under `/api/*`; `errorHandler` last. Listens on `PORT` when run directly. | `module.exports = app` | `config/db`, all `routes/*`, `middleware/{auth,error,sanitize}`, `utils/{mediaStorage,logger}`, models `Equipment`, `Fault`, `User`, `constants/rateLimits` | `npm start/dev`, every backend test |
| `config/db.js` | 14 | `connectDB()` — sets `sanitizeFilter`, `mongoose.connect(MONGO_URI)`, `process.exit(1)` on failure. Uses `console`, not `logger`. | `connectDB` | mongoose | `app.js`, `seeders/seeder.js`, `scripts/createSuperAdmin.js` |

### 4.1.2 Constants (`constants/`)

| File | Exports | Business meaning | Used by |
|---|---|---|---|
| `audit.js` | `AUDIT_ACTIONS` (11 actions), `ALL_AUDIT_ACTIONS`, `AUDIT_RETENTION_DAYS = 365` | Audit vocabulary; mirrored by `frontend/src/constants/audit.js`. | `models/AuditLog`, auth/user/superadmin controllers, `superadminService`, seeder |
| `auth.js` | Token lifetimes, cookie max-ages, bcrypt rounds, reuse grace, reset-token TTL | Session policy (rationale for the 60-minute access token documented inline: fewer PWA refreshes). `ACCESS_COOKIE_MAX_AGE` is no longer referenced. | `authService`, `authController`, `userService`, `superadminService`, `createSuperAdmin` |
| `faultStatus.js` | `FAULT_STATUS {OPEN, CLOSED}`, `ALL_FAULT_STATUSES` | Fault lifecycle. | `models/Fault`, `faultService`, `utils/equipmentEngineHours` |
| `notifications.js` | `NOTIFICATION_TYPES`, `ALL_NOTIFICATION_TYPES`, `NOTIFICATION_PAGE_SIZE`, `ANNOUNCEMENT_LIMITS` | Notification kinds and caps. | `models/Notification`, `notificationService` |
| `pagination.js` | `DEFAULT_PAGE`, `DEFAULT_LIMIT`, `MAX_LIMIT` | List paging bounds. | equipment / fault / maintenance / part / superadmin services |
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
| `Part.js` | 33 | `Part` / `parts` | — |
| `PushSubscription.js` | 66 | `PushSubscription` / `pushsubscriptions` | `toWebPushSubscription()` method; unique endpoint. |
| `RefreshToken.js` | 64 | `RefreshToken` / `refreshtokens` | TTL on `expiresAt`; `wasRotated` grace semantics. |
| `Tool.js` | 10 | alias | `module.exports = require('./Equipment')`. |
| `User.js` | 83 | `User` / `users` | `formatUserName` setter + `pre('save')`; conditional `companyId` requirement; `select:false` reset fields; static `User.formatUserName`. |

### 4.1.4 Middleware (`middleware/`)

| File | Lines | Exports | Behaviour | Used by |
|---|---|---|---|---|
| `authMiddleware.js` | 151 | `verifyToken`, `ensureAdmin`, `ensureMechanicOrAdmin`, `ensureSuperAdmin` | `verifyToken`: Bearer-only JWT (HS256) → load user + company on every request → reject inactive company → build `req.user = { userId, _id, name, email, role, companyId, company, mustChangePassword }` → confine superadmin to `SUPERADMIN_PATH_PREFIXES` → enforce the password-change gate. Guards are pure role checks. Responds directly (never `next(err)`). | `app.js`, all route files |
| `errorMiddleware.js` | 78 | `errorHandler` | Central error → HTTP mapping (see [05 §5.1.1](05-api-and-workflows.md#511-global-error-mapping-middlewareerrormiddlewarejs)); 4xx logged as `warn`, others as `error`. | `app.js` |
| `sanitizeMiddleware.js` | 61 | `sanitizeRequest`, `sanitizeInPlace` | Recursively deletes `$`-prefixed / dotted keys from `body`, `query`, `params` in place (Express 5 `req.query` is a getter). | `app.js` |
| `uploadMiddleware.js` | 52 | default `upload` (multer) | Memory storage, 50 MB, MIME allow-list. | `authRoutes` (`single('avatar')`), `equipmentRoutes` (`single('book')`), `faultRoutes` (`array('photos', 5)`) |
| `validationMiddleware.js` | 25 | `validateObjectId(...names)` | 400 on missing/invalid ObjectId params (default `id`). | admin, equipment, fault, maintenance, notification, part, superadmin routes |

### 4.1.5 Routes (`routes/`) — full contract in [05 §5.2](05-api-and-workflows.md#52-endpoint-reference)

| File | Lines | Mount | Router-level middleware | Endpoints |
|---|---|---|---|---|
| `authRoutes.js` | 54 | `/api/auth` | per-route `authLimiter`, `passwordResetLimiter` (keyed by lower-cased email), `verifyToken` on `/me*` | 11 |
| `equipmentRoutes.js` | 53 | `/api/equipment` and `/api/tools` | `verifyToken` | 17 (incl. 3 verbs for `/progress`) |
| `toolRoutes.js` | 1 | `/api/tools` | — | Re-exports `equipmentRoutes`. |
| `faultRoutes.js` | 29 | `/api/faults` | `verifyToken` | 8 |
| `maintenanceRoutes.js` | 19 | `/api/maintenance` | `verifyToken` | 4 |
| `partRoutes.js` | 19 | `/api/parts` | `verifyToken` | 4 |
| `notificationRoutes.js` | 40 | `/api/notifications` | `verifyToken` | 9 |
| `adminRoutes.js` | 41 | `/api/admin` | `verifyToken`, `ensureAdmin` | 12 (4 users + 4 equipment + 4 tools aliases) |
| `superadminRoutes.js` | 40 | `/api/superadmin` | `verifyToken`, `ensureSuperAdmin` | 10 |

### 4.1.6 Controllers (`controllers/`)

Thin adapters: extract `req.user.companyId` / `req.user.userId` / params / body / files → call one service → set the status code → `next(err)` on failure. Audit writes happen here, after the service succeeds.

| File | Lines | Handlers | Extra logic beyond delegation |
|---|---|---|---|
| `authController.js` | 306 | `register`, `login`, `refreshToken`, `logout`, `me`, `updateProfile`, `deleteAccount`, `uploadAvatar`, `changePassword`, `forgotPassword`, `resetPassword` | `getCookieOptions(maxAge, path)` (httpOnly, secure in prod, `sameSite` none/lax, optional domain); `setRefreshCookie` (path `/api/auth`); `clearAuthCookies` (also legacy `token`, `accessToken`); audits `company.registered`, `auth.superadmin_login`, `auth.login_failed` (email ≤ 254 chars), `account.self_deleted`; clears cookies on `TOKEN_REUSE_DETECTED`. |
| `equipmentController.js` | 255 | `getAllTools`, `getToolById`, `createTool`, `updateTool`, `deleteTool`, `addBook`, `deleteBook`, `addSchedule`, `deleteSchedule`, `completeSchedule`, `getSchedule`, `addChecklistItem`, `toggleChecklistItem`, `deleteChecklistItem`, `updateScheduleProgress` | Aliases `getAllEquipment`, `getEquipmentById`, `createEquipment`, `updateEquipment`, `deleteEquipment`. |
| `toolController.js` | 9 | — | Re-exports `equipmentController`. |
| `faultController.js` | 127 | `getAllFaults`, `getFaultById`, `createFault`, `closeFault`, `reopenFault`, `deleteFault`, `updateFault` | `createFault` calls `notificationService.notifyFaultReported` inside its own try/catch (logged, never fails the request). |
| `maintenanceController.js` | 66 | `getAllMaintenance`, `getMaintenanceById`, `createMaintenance`, `deleteMaintenance` | — |
| `partController.js` | 66 | `getAllParts`, `createPart`, `updatePart`, `deletePart` | — |
| `notificationController.js` | 168 | `getMyNotifications`, `getUnreadCount`, `markRead`, `deleteNotification`, `markAllRead`, `sendAnnouncement`, `getPushPublicKey`, `subscribeToPush`, `unsubscribeFromPush` | `subscribeToPush` accepts `{ subscription }` or the raw object; passes `User-Agent`. |
| `userController.js` | 86 | `getAllUsers`, `createUser`, `updateUserRole`, `deleteUser` | Audits `user.created`, `user.role_changed`, `user.deleted`. |
| `superadminController.js` | 93 | `getStats`, `listCompanies`, `getCompany`, `setCompanyStatus`, `listUsers`, `updateUserRole`, `resetUserPassword`, `deleteUser`, `sendAnnouncement`, `listAuditLogs` | `handle(fn, status)` wrapper (JSON, or 204 when the result is `undefined`); audits company status, role change, password reset, deletion, platform announcement. |

### 4.1.7 Services (`services/`) — business logic

| File | Lines | Functions (signature → result) | Business rules implemented | Depends on |
|---|---|---|---|---|
| `authService.js` | 666 | `register(body)` → `{user, tokens}` · `login(body)` · `rotateRefreshToken(raw)` → `{tokens}` · `logout(raw)` · `getProfile(userId)` · `updateProfile(userId, body)` · `uploadAvatar(userId, file)` · `changePassword(userId, body)` → `{mustChangePassword, termsAccepted}` · `deleteAccount(userId, body)` · `requestPasswordReset(body)` · `resetPassword(body)`. Internal: `getRefreshSecret`, `hashToken` (SHA-256), `generateSlug`, `generateTokens(user, companyId, familyId?)`, `shapeUserProfile`. | Signup creates Company + admin (compensating delete on failure); role always admin; terms mandatory, version `1.3`; email regex `^[^\s@]+@[^\s@]+\.[^\s@]+$`; password ≥ 8; email change needs current password; RTR with family revocation and a 30 s rotation-race grace; password change/reset revokes all sessions; forced change skips current password but requires terms; reset token single-use, atomic consume, 30 min; reset link built only from `FRONTEND_URL`; self-delete needs typed `delete <name>` + password and removes tokens, push subscriptions, avatar. | `User`, `Company`, `RefreshToken`, `PushSubscription`, `utils/{httpError, mediaStorage, mailer, logger}`, `constants/{roles, auth}` |
| `userService.js` | 169 | `getAllUsers(companyId)` · `createUser(companyId, body)` · `updateUserRole(companyId, actingUserId, targetUserId, body)` → `{user, previousRole}` · `deleteUser(companyId, actingUserId, targetUserId)` → deleted summary | New users: operator + `mustChangePassword`; role ∈ tenant roles; no self role-change / self-delete; last-admin protection; avatar file cleanup on delete. | `User`, `bcrypt`, `utils/{httpError, mediaStorage}`, `constants/{roles, auth}` |
| `equipmentService.js` | 611 | `filterEquipmentFields(body)` · `getAllTools(companyId, query)` · `getToolById(companyId, id)` · `createTool` · `updateTool` · `deleteTool` · `addBook(companyId, id, file, body)` · `deleteBook` · `addSchedule` · `deleteSchedule` · `completeSchedule(companyId, userId, id, scheduleId, body)` · `getSchedule` · `addChecklistItem` · `toggleChecklistItem` · `deleteChecklistItem` · `updateScheduleProgress` | Field whitelist; detail read re-syncs hours; delete cascades (book files, faults, parts, maintenance); book existence checked before storing the file; schedule next-due computation; completion → Maintenance record + checklist snapshot/reset + notes merge + hours sync. | `Equipment`, `Fault`, `Part`, `Maintenance`, `utils/{equipmentEngineHours, httpError, mediaStorage}`, `constants/{pagination, scheduleStatus}` |
| `faultService.js` | 350 | `getAllFaults(companyId, query, userId)` · `getFaultById` · `createFault(companyId, userId, body, files)` · `closeFault(companyId, userId, id, body)` · `reopenFault` · `deleteFault` · `updateFault(companyId, userId, id, body)` | Tool must belong to the tenant; photos only from uploads; report hours never applied directly; close records `closingEngineHours` and syncs; reopen unsets resolution; delete removes files + back-reference. | `Fault`, `Tool`, `utils/{equipmentEngineHours, httpError, mediaStorage}`, `constants/{pagination, faultStatus}` |
| `maintenanceService.js` | 154 | `getAllMaintenance(companyId, query)` · `getMaintenanceById` · `createMaintenance(companyId, userId, body)` · `deleteMaintenance` | Tool must belong to the tenant; hours sync after create/delete. | `Maintenance`, `Tool`, `utils/{equipmentEngineHours, httpError}` |
| `partService.js` | 163 | `filterPartFields` · `getAllParts` · `createPart` · `updatePart` · `deletePart` | Field whitelist; tool reference must belong to the tenant. | `Part`, `Tool`, `utils/httpError` |
| `notificationService.js` | 414 | `dispatch({companyId, recipients, type, title, body, link, sender, data})` · `notifyFaultReported(fault, reporter)` · `createAnnouncement(companyId, sender, payload)` · `createPlatformAnnouncement(sender, payload)` · `listForUser` · `getUnreadCount` · `markRead` · `deleteNotification` · `markAllRead`. Internal `parseAnnouncement`. | One document per recipient; DB write authoritative, push best-effort; reporter excluded from fault fan-out; sender excluded from broadcast; announcement length caps; explicit empty role list rejected; platform broadcast grouped per company; foreign notification → 404. | `Notification`, `User`, `Company`, `pushService`, `utils/{logger, httpError}`, constants |
| `pushService.js` | 187 | `isPushConfigured()` · `getPublicKey()` · `saveSubscription(companyId, userId, sub, ua)` · `removeSubscription(userId, endpoint)` · `sendToUsers(userIds, payload, notificationIdByUser?)` → `{sent, failed, pruned}` | VAPID configured at module load (invalid keys → disabled, logged); upsert by endpoint (re-homes shared devices); owner-scoped unsubscribe; per-recipient `notificationId` in payload; prune on 404/410; never throws. | `web-push`, `PushSubscription`, `utils/{logger, httpError}` |
| `superadminService.js` | 381 | `getStats()` · `listCompanies(query)` · `getCompany(id)` · `setCompanyActive(id, body)` · `listUsers(query)` · `updateUserRole(actingId, targetId, body)` · `deleteUser(actingId, targetId)` · `resetUserPassword(targetId)` → `{temporaryPassword, user}` · `listAuditLogs(query)`. Internal: `escapeRegex`, `searchRegex`, `pageParams`, `tenantUsersFilter`, `monthlyCounts`, `userActivityByCompany`, `findTenantUser`. | Cross-tenant by design; superadmins excluded from user lists/ops; 12-month zero-filled series; 30-day activity window; top-10 companies; dormant sample of 5; GridFS storage totals; deactivation revokes refresh tokens; temp password = 9 random bytes (base64url) + forced change + session revocation; delegates role/delete to `userService` to keep the last-admin guard. | `User`, `Company`, `RefreshToken`, `AuditLog`, `userService`, bcrypt, crypto, constants |

### 4.1.8 Utilities (`utils/`)

| File | Lines | Exports | Responsibility | Used by |
|---|---|---|---|---|
| `audit.js` | 52 | `recordAudit(req, {action, actor?, companyId?, target?, metadata?})`, `userTarget(user)`, `companyTarget(company)` | Best-effort audit insert (errors logged, never thrown); actor defaults to `req.user`; IP from `req.ip`. | auth, user, superadmin controllers |
| `equipmentEngineHours.js` | 89 | `syncEquipmentEngineHours(toolId, companyId, candidate?)` | Highest-wins engine-hours + schedule status recalculation ([02 §2.14](02-database-and-schemas.md#214-derived-data-engine-hours-synchronization)). Resolves models via `mongoose.models` to avoid require cycles. | equipment, fault, maintenance services |
| `httpError.js` | 27 | `httpError(status, message, extra?)` | Error with `status` (and optional `code`) for the central handler. | all services |
| `logger.js` | 141 | `logger.{error,warn,info,http,debug}` | Leveled, ANSI-coloured console logger; `LOG_LEVEL`; silent in tests unless `TEST_LOGS`. | app, error middleware, services, controllers, mailer |
| `mailer.js` | 49 | `sendMail({to, subject, text, params})` | EmailJS HTTPS send; dev fallback logs; production throws when unconfigured. | `authService` |
| `mediaStorage.js` | 112 | `storeFile`, `getFileInfo`, `openDownloadStream`, `deleteFile`, `idFromUrl` | Lazy `GridFSBucket('uploads')`; idempotent delete; `/uploads/<id>` parsing. | app, auth/user/equipment/fault services, migration script |

### 4.1.9 Scripts & seeders

| File | Lines | Responsibility |
|---|---|---|
| `scripts/createSuperAdmin.js` | 73 | CLI (`util.parseArgs`): validates email; password from `SUPERADMIN_PASSWORD` (≥ 12) or generated; refuses to convert a tenant user; creates a superadmin, or resets its password and revokes its sessions. |
| `scripts/migrateUploadsToGridFS.js` | 118 | One-time: reads `backend/uploads/*`, stores each in GridFS, rewrites `/uploads/<filename>` references in `Fault.photos`, `Equipment.books.fileUrl`, `User.avatar`; idempotent; keeps originals. |
| `seeders/seeder.js` | 266 | Dev-only demo data (two farms + superadmin); see [02 §2.15](02-database-and-schemas.md#215-seed-data-backendseedersseederjs-dev-only). Helpers: `daysAgo`, `daysFromNow`, `service(...)` schedule builder, `createUsers`, `linkFaults`. |

---

## 4.2 Frontend (`frontend/src/`, ESM + JSX)

### 4.2.1 Bootstrap & routing

| File | Lines | Responsibility |
|---|---|---|
| `main.jsx` | 43 | Registers the PWA service worker (hourly + on-foreground update checks); renders `StrictMode > ErrorBoundary > ThemeModeProvider > BrowserRouter > AppRoutes`. |
| `routes.jsx` | 363 | Provider stack `NotificationProvider > AuthProvider > ToolProvider > FaultProvider > PageRefreshProvider > NotificationFeedProvider > (AppLayout + AccessibilityMenu)`. Lazy-loads 17 pages; preloads chunks on idle after login. Guards: `ProtectedRoute`, `RequireStaff` (redirects operators to `/dashboard`), `RequireAdmin` (role prop), `RequirePasswordChange`. `AppLayout` hides navigation on `/login`, `/force-password-change`, `/reset-password`; otherwise renders `Navbar`, `ForcePasswordChangeDialog`, `PullToRefresh` around routes, `LegalFooter`, and a globally-lifted `CreateFaultDialog` opened by the phone FAB. Full route table in [01 §1.6](01-architecture-and-layers.md#16-frontend-route-map). |
| `index.css` | 97 | Global styles (see 03). |
| `theme/index.js` | 518 | `getAppTheme(mode)` — light/dark MUI theme. |
| `content/legalDocuments.js` | 322 | `LEGAL_CONTACT_EMAIL`; Terms of Service v1.3, Privacy Policy v1.3, Accessibility Statement v1.0, each in English and Hebrew; `LEGAL_DOCS`, `getLegalDoc(type, lang)`. |

### 4.2.2 Constants (`constants/`)

| File | Exports | Notes |
|---|---|---|
| `appVersion.js` | `APP_VERSION` | From `package.json`. |
| `audit.js` | `AUDIT_ACTION_INFO` (label + MUI chip colour per action), `describeAudit(log)` | Mirror of backend audit actions. |
| `faultStatus.js` | `FAULT_STATUS`, `ALL_FAULT_STATUSES` | Mirror. |
| `roles.js` | `ROLES`, `ALL_ROLES`, `MECHANIC_OR_ADMIN_ROLES`, `DEFAULT_ROLE`, `isMechanicOrAdmin(role)`, `canUseTenantApi(user)` | `canUseTenantApi` = signed in, not forced-change, not superadmin — gates every tenant fetch. |
| `routes.js` | `ROUTES` (20 static paths), `equipmentDetailRoute`, `equipmentScheduleRoute`, `equipmentDetailTabRoute`, `superadminTabRoute`, `homeRouteFor(user)` | Single source of route strings. |

### 4.2.3 Services (`services/`) — HTTP adapters

| File | Lines | Methods | Notes |
|---|---|---|---|
| `apiClient.js` | 138 | axios instance (`baseURL = VITE_API_URL \|\| '/api'`, `withCredentials`), `setToken(token)`, `shouldRedirectToLogin(path)` | Restores Bearer from `localStorage['token']`; single-flight 401 refresh with request queue; redirects to `/login` except on public paths (`/login`, `/reset-password`, `/terms`, `/privacy`, `/legal`). |
| `adminService.js` | 90 | `getUsers`, `createUser`, `updateUserRole`, `deleteUser`, `getEquipment`, `createEquipment`, `updateEquipment`, `deleteEquipment`, `getTools`, `createTool`, `updateTool`, `deleteTool` | Only the four user methods are used (by `AdminDashboard`). |
| `equipmentService.js` | 152 | `getAll`, `getById`, `create`, `update`, `delete`, `uploadBook(id, formData, {onUploadProgress})`, `deleteBook`, `addSchedule`, `deleteSchedule`, `completeSchedule`, `getSchedule`, `addChecklistItem`, `toggleChecklistItem`, `deleteChecklistItem`, `updateScheduleProgress` (PATCH, falls back to PUT) | Upload timeout 3 min. |
| `toolsService.js` | 4 | re-export of `equipmentService` | Used only by its own test. |
| `faultsService.js` | 53 | `getAll(params)` (normalizes paginated/plain), `getById`, `create(payload)` (FormData when `files`), `close`, `reopen` (PATCH), `update` (PUT), `delete` | — |
| `maintenanceService.js` | 45 | `getMaintenance(params)`, `getMaintenanceById`, `createMaintenance`, `deleteMaintenance` | Only `getMaintenance` and `deleteMaintenance` are used. |
| `notificationsService.js` | 104 | `getAll`, `getUnreadCount`, `markRead`, `markAllRead`, `deleteNotification`, `sendAnnouncement`, `getPushPublicKey`, `subscribeToPush`, `unsubscribeFromPush` | — |
| `superadminService.js` | 73 | `getStats`, `getCompanies`, `getCompany`, `setCompanyActive`, `getUsers`, `updateUserRole`, `resetUserPassword`, `deleteUser`, `getAuditLogs`, `sendAnnouncement` | — |
| `userService.js` | 59 | `getProfile`, `updateProfile`, `deleteAccount(confirmation, currentPassword)`, `changePassword`, `forgotPassword`, `resetPassword(token, newPassword)`, `uploadAvatar(file)` | Returns raw axios responses (callers read `.data`). |

### 4.2.4 State (`contexts/`)

| File | Lines | Provider / hook | State & actions | Side effects |
|---|---|---|---|---|
| `AuthContext.jsx` | 183 | `AuthProvider`, `useAuth` | `user`, `userId`, `loading`, `login(email,pwd \| {email,pwd})`, `signup(...)`, `logout()`, `updateAvatar(file)`, `setUser` | `GET /auth/me` on mount; names normalized with `formatUserName`; navigation after auth. |
| `EquipmentContext.jsx` | 131 | `EquipmentProvider` (`ToolProvider`), `useEquipment` (`useTool`) | `equipment` / `tools` (sorted by `localSerialNumber`, then name), `loading`, `error`, `fetchEquipment`, `create/update/deleteEquipment` (+ Tool aliases) | Fetches when `canUseTenantApi(user)`; `retry()` with backoff; toasts. |
| `ToolContext.jsx` | 9 | re-exports | — | — |
| `FaultContext.jsx` | 141 | `FaultProvider`, `useFault(toolId?)` | `faults` (filtered by tool, sorted open-first then oldest), `fetchFaults`, `createFault`, `updateFault`, `deleteFault`, `closeFault`, `reopenFault` | Same fetch gating; toasts. |
| `NotificationContext.jsx` | 57 | `NotificationProvider`, `useNotify` | `notify.success/error/info/warning(msg)` | Single MUI `Snackbar` (6 s), positioned above the phone bottom nav. |
| `NotificationFeedContext.jsx` | 310 | `NotificationFeedProvider`, `useNotificationFeed` (inert fallback outside the provider) | `notifications`, `unreadCount`, `loading`, `error`, `refresh`, `refreshUnreadCount`, `markRead`, `deleteNotification`, `markAllRead` (optimistic) | 20 s unread poll; refetch on visibility and SW message; Badging API sync; triggers page refresh on new notifications. |
| `PageRefreshContext.jsx` | 149 | `PageRefreshProvider`, `usePageRefresh(fn)`, `usePageRefreshTrigger()` | Set of handlers in a ref; `refresh()` runs all, swallowing individual errors | 30 s poll while visible; refetch on visibility. |
| `ThemeContext.jsx` | 61 | `ThemeModeProvider`, `useThemeMode` | `mode`, `toggleColorMode` | Persists `localStorage['maintenance_app_theme']`; honours `prefers-color-scheme`; sets `<html data-theme>`. |

### 4.2.5 Hooks (`hooks/`)

| File | Lines | Signature | Responsibility |
|---|---|---|---|
| `useAuthenticatedBlobUrl.js` | 82 | `useAuthenticatedBlobUrl(url) → { blobUrl, loading, error }` | Fetches protected media through `apiClient` (Bearer + refresh) as a blob; refuses untrusted origins; revokes object URLs on cleanup. |
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

### 4.2.7 Pages (`pages/`)

| File | Lines | Route(s) | Roles | Responsibility | Data sources |
|---|---|---|---|---|---|
| `Login.jsx` | 23 | `/login` | public | Redirects signed-in users; renders `LoginComponent`. | `useAuth` |
| `Logout.jsx` | 19 | `/logout` | any | Calls `logout()` then navigates to `/login`. | `useAuth` |
| `ResetPasswordPage.jsx` | 167 | `/reset-password?token=` | public | New password + confirm → reset. | `userService.resetPassword` |
| `ForcePasswordChangePage.jsx` | 242 | `/force-password-change` | user with `mustChangePassword` | New password + terms checkbox (opens `LegalModal`). | `userService.changePassword` |
| `LegalPage.jsx` | 188 | `/terms`, `/privacy`, `/legal`, `/accessibility` | public | Tabbed legal documents with EN/HE toggle. | `LEGAL_DOCS` |
| `NotFound.jsx` | 76 | `*` | public | 404 page. | — |
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
| `ConfirmDialog/ConfirmDialog.jsx` | 52 | `({ open, title, message, confirmLabel, … onConfirm, onClose })` | Generic confirmation. |
| `Dashboard/KpiCard.jsx` | 53 | `({ label, value, caption, accentColor, icon, iconBg })` | Metric tile. |
| `DialogComponent/index.jsx` | 64 | `({ open, title, onClose, children, … })` | Generic dialog shell (used by `ToolsPanel`, `UserPanel`). |
| `ErrorComponent/ErrorBoundary.jsx` | 46 | class `ErrorBoundary` | Top-level render-error fallback (`getDerivedStateFromError`, `componentDidCatch`). |
| `ErrorComponent/ErrorComponent.jsx` | 53 | `({ message, onRetry })` | Inline error with retry. |
| `Fault/CloseFaultDialog/CloseFaultDialog.jsx` | 150 | `({ open, onClose, onConfirm, fault, tool, equipment })` | Requires engine hours ≥ 0; optional resolution text; shows last reading; links to equipment. |
| `Fault/CreateFaultDialog/CreateFaultDialog.jsx` | 83 | `({ open, onClose, onSubmit, equipment?, … })` | Dialog wrapper around `CreateFaultForm`. |
| `Fault/FaultCard/FaultCard.jsx` | 210 | `({ fault, onClick, onCloseFault, onReopenFault, onDeleteFault })` | Card with status chip, photo thumbnails, staff-only actions. |
| `Fault/FaultCard/FaultCard.module.css` | 0 | — | Empty stylesheet. |
| `Fault/FaultDetailsDialog/FaultDetailsDialog.jsx` | 281 | `({ open, fault, onClose, … actions })` | Full fault detail with photo viewer and staff actions. |
| `Fault/FaultForms/FaultForms.jsx` | 554 | `CreateFaultForm(props)`, `EditFaultForm(props)` | Equipment select (lockable), code*, engine hours, description*, drag-and-drop photos with previews (`FileThumbnailPreview`). `validateFaultValues` requires tool, code, description. `EditFaultForm` is not rendered anywhere. |
| `Fault/FaultList/FaultList.jsx` | 318 | `({ faults, loading, … actions })` | Responsive list/table of faults for one machine. |
| `Fault/FaultModal/FaultModal.jsx` | 240 | `({ open, fault, onClose, … })` | Dashboard fault detail modal. |
| `Form/Input.jsx` | 79 | `Input.{Email, Text, Number, Url, Password, Select}` | Thin MUI field wrappers (used by `UserForms`). |
| `Form/PasswordField.jsx` | 60 | forwardRef `PasswordField` | Password input with show/hide toggle. |
| `ImageViewer/ImageViewerDialog.jsx` | 227 | `({ open, images, initialIndex, onClose })` | Authenticated image carousel. |
| `Legal/LanguageToggle.jsx` | 22 | `({ lang, onChange, size })` | EN/HE switch. |
| `Legal/LegalFooter.jsx` | 52 | `()` | Footer links + app version; opens `LegalModal`. |
| `Legal/LegalModal.jsx` | 177 | `({ open, onClose, defaultTab })` | Tabbed legal documents. |
| `LoadingComponent/LoadingComponent.jsx` | 43 | `({ message })` | Full-page spinner. |
| `LoginComponent/index.jsx` | 148 | `()` | Landing layout: logo, feature bullets (faults, schedules, manuals), `LoginCard`, footer. |
| `LoginComponent/LoginCard.jsx` | 72 | `()` | Switches between `login`, `signup`, `forgot` modes. |
| `LoginComponent/LoginForm.jsx` | 139 | `({ onForgotPassword })` | Email/password sign-in. |
| `LoginComponent/SignupForm.jsx` | 248 | `()` | Company name, name, email, password, terms checkbox. |
| `LoginComponent/ForgotPasswordForm.jsx` | 134 | `()` | Email request with 60 s resend cooldown. |
| `Logo/Logo.jsx` | 194 | `LogoMark({ size, sx })`, default `Logo(...)` | SVG brand mark and wordmark. |
| `Navbar/index.jsx` | 86 | `({ onOpenCreateFault })` | Role-based nav items (superadmin: Overview/Companies/Users/Audit Log; operator: Dashboard/My Reports/Manuals; mechanic: Dashboard/Equipment/Manuals; admin: + Admin); renders full sidebar (≥ lg), rail (sm–lg), bottom nav (< sm, Admin moved into the account sheet). |
| `Navbar/SidebarNav.jsx` | 171 | `({ variant, display, user, pages })` | Drawer with logo, nav, `NotificationBell` (tenant users), `UserMenu`. |
| `Navbar/BottomNav.jsx` | 280 | `({ display, user, pages, menuPages, onOpenCreateFault })` | Phone tab bar with centre "report fault" FAB, unread badge, account sheet. |
| `Navbar/UserMenu.jsx` | 173 | `({ user })` | Avatar menu: profile, account, logout. |
| `Navbar/navItems.jsx` | 73 | `PAGE_ICON_MAP`, `pageToPath`, `pageIcon`, `pageMenuLabel`, `isPageActive` | Nav label → route/icon mapping. |
| `Navbar/navConstants.js` | 15 | `SIDEBAR_FULL_WIDTH 240`, `SIDEBAR_RAIL_WIDTH 72`, `BOTTOM_NAV_HEIGHT 64` | Layout constants. |
| `Notifications/NotificationBell.jsx` | 152 | `({ tooltipPlacement })` | Bell with badge; popover preview of 6 (unread first); mark all read; link to full page. |
| `Notifications/NotificationItem.jsx` | 143 | `({ notification, onSelect, onDelete, dense })` | One feed row. |
| `Notifications/PushNotificationSettings.jsx` | 107 | `()` | Push toggle with permission/support messaging. |
| `Notifications/SendAnnouncementDialog.jsx` | 210 | `({ open, onClose, onSend, companies? })` | Composer; tenant audiences Everyone/Mechanics/Operators; platform mode adds Admins + company picker. |
| `Notifications/notificationPresentation.jsx` | 97 | `NOTIFICATION_TYPES`, `notificationDisplay(type)`, `sortByUnreadFirst`, `formatRelativeTime` | Presentation helpers. |
| `PdfViewer/PdfViewerDialog.jsx` | 179 | `({ open, onClose, title, fileUrl })` | Authenticated PDF viewer with download. |
| `ProtectedRoute/index.jsx` | 40 | `({ children })` | Auth/loading gate; forced-change redirect; superadmin confined to `/superadmin*`, `/account`, `/logout`. |
| `PullToRefresh/PullToRefresh.jsx` | 56 | `({ onRefresh, disabled, children })` | Indicator wrapper over `usePullToRefresh`. |
| `RequireAdmin/index.jsx` | 19 | `({ children, role = 'admin' })` | Exact-role gate; otherwise redirects to `/equipment`. |
| `Skeletons/Skeletons.jsx` | 252 | `PageHeaderSkeleton`, `FilterBarSkeleton`, `CardGridSkeleton`, `KpiCardsSkeleton`, `ChartCardSkeleton`, `TableSkeleton`, `ListRowsSkeleton`, `DetailBannerSkeleton`, `TabsSkeleton`, `FormSkeleton`, `PageSkeleton` | Loading placeholders. |
| `Skeletons/skeletonA11y.js` | 22 | `skeletonA11yProps(label)` | `role="status"`, `aria-busy`, `aria-label`. |
| `TabPanel/index.jsx` | 27 | `TabPanel(props)` | Generic tab panel (not imported; `EquipmentPage` defines its own). |
| `Tool/EquipmentBooksTab/EquipmentBooksTab.jsx` | 300 | `({ equipment, tool, onRefresh })` | Manual list, upload dialog with progress (PDF, ≤ 50 MB), view, delete (staff). |
| `Tool/EquipmentMaintenanceTab/EquipmentMaintenanceTab.jsx` | 752 | `({ equipment, tool, onRefresh })` | Schedule list with status chips, add schedule (+ checklist builder), delete, complete dialog, navigate to schedule page; service history log with delete. |
| `Tool/EquipmentList/EquipmentList.jsx` | 2 | re-export of `ToolsList` | Alias. |
| `Tool/EquipmentPanel/EquipmentPanel.jsx` | 2 | re-export of `ToolsPanel` | Alias. |
| `Tool/ToolForms/ToolForms.jsx` | 162 | `CreateToolForm`, `UpdateToolForm` (+ `Equipment*` aliases, `EquipmentFormFields`) | Equipment fields form (`name` required). |
| `Tool/ToolsList/ToolsList.jsx` | 325 | `({ tools, viewMode, loading, openFaultsByTool })` | Grid/table of equipment with fault badges. |
| `Tool/ToolsPanel/ToolsPanel.jsx` | 287 | `({ tools, loading, error, onCreate, onUpdate, onDelete })` | Admin equipment management table with search and dialogs. |
| `User/UserForms/UserForms.jsx` | 171 | `CreateUserForm`, `UpdateUserForm`, default `UserForm` | User create form (name, email, password). |
| `User/UserPanel/UserPanel.jsx` | 530 | `({ users, loading, error, onCreate, onDelete, onChangeRole, … })` | Admin user table: search, inline role select with pending state, delete confirm, create dialog; self-protection in the UI. |

### 4.2.9 Service worker

| File | Lines | Responsibility |
|---|---|---|
| `frontend/public/push-sw.js` | 172 | Imported into the Workbox-generated SW. `push` → `showNotification` (tag = type, `renotify`), `syncAppBadge()` (fetches unread count), `notifyOpenClients()` (`postMessage PUSH_NOTIFICATION_RECEIVED`). `notificationclick` → `markNotificationRead(id)` + focus/navigate an existing window or open a new one. Both fetches rely on cookies, which the API does not accept (see [Audit Observations](README.md#7-audit-observations)). |

---

## 4.3 Test Suites

### 4.3.1 Backend (`backend/__tests__/`, Jest + supertest + mongodb-memory-server) — 16 files, ≈ 284 test cases

| File | Tests | Covers |
|---|---|---|
| `helpers/setup.js` | — | `connectTestDB` (memory server with one retry, `sanitizeFilter` on), `closeTestDB`, `uniqueEmail`, `registerCompanyAdmin(app)`, `createCompanyAndUser(overrides)`, `extractRefreshToken(setCookies)`. |
| `auth.test.js` | 48 | register, login, logout, me, profile update, self-delete, avatar, change password, transport-security regressions (no cookie auth), refresh/RTR, forgot/reset. |
| `tenantIsolation.test.js` | 37 | Cross-company isolation for tools, faults, parts, maintenance, users; onboarding security; health. |
| `equipment.test.js` | 28 | CRUD, books, schedules, checklist. |
| `notification.test.js` | 28 | Fault fan-out, announcements, feed, delete, push subscriptions. |
| `superadmin.test.js` | 28 | Superadmin auth/confinement, stats, companies, cross-company users, platform announcements, audit log. |
| `authMiddleware.test.js` | 18 | `verifyToken`, forced-change gate, role guards. |
| `fault.test.js` | 18 | Create/list/get/close/reopen/delete/update. |
| `adminUser.test.js` | 16 | Admin user management and guards. |
| `errorMiddleware.test.js` | 13 | Error mapping for 4xx vs 5xx. |
| `sanitizeMiddleware.test.js` | 12 | Unit + live injection attempt. |
| `part.test.js` | 11 | Part CRUD. |
| `app.test.js` | 9 | Health, CORS, malformed JSON, CastError, `/uploads`. |
| `maintenance.test.js` | 9 | Maintenance CRUD. |
| `logger.test.js` | 6 | Logger levels/formatting. |
| `db.test.js` | 2 | `connectDB` success/failure. |
| `seeder.test.js` | 1 | Production guard. |

### 4.3.2 Frontend (Jest + jsdom + Testing Library) — 57 files, ≈ 479 test cases

| Area | Files (tests) |
|---|---|
| `frontend/__tests__/` | `ForcePasswordChangePage` (3), `ForgotPasswordForm` (1), `LegalDocuments` (8), `LoginCard` (1), `LoginComponent` (1), `LoginForm` (4), `SignupForm` (3) |
| `src/services/` | `apiClient` (10), `adminService` (12), `equipmentService` (16), `faultsService` (12), `maintenanceService` (4), `notificationsService` (9), `toolsService` (5), `userService` (5) |
| `src/contexts/` | `AuthContext` (15), `EquipmentContext` (14), `FaultContext` (16), `NotificationContext` (8), `NotificationFeedContext` (9), `PageRefreshContext` (7), `ThemeContext` (6), `ToolContext` (3) |
| `src/hooks/` | `useForm` (10), `usePushNotifications` (11), `usePullToRefresh` (8), `useAuthenticatedBlobUrl` (2) |
| `src/utils/` | `index` (10), `formatUtils` (10), `mediaUtils` (5), `validate` (17) |
| `src/pages/` | `Dashboard` (21), `EquipmentPage` (17), `AdminDashboard` (11), `SuperAdminDashboard` (10) |
| `src/components/` | `Navbar/BottomNav` (14), `Navbar/SidebarNav` (10), `Navbar/index` (9), `Navbar/navItems` (2), `Fault/FaultDetailsDialog` (13), `Fault/FaultModal` (12), `Fault/FaultCard` (10), `Fault/FaultList` (10), `Fault/CloseFaultDialog` (8), `Fault/CreateFaultDialog` (7), `Tool/ToolForms` (13), `Tool/ToolsList` (9), `Tool/ToolsPanel` (2), `Tool/EquipmentList` (1), `User/UserForms` (10), `Notifications/NotificationBell` (10), `Notifications/SendAnnouncementDialog` (9), `Notifications/notificationPresentation` (8), `AccessibilityMenu` (5), `ProtectedRoute` (5), `PullToRefresh` (4), `Logo` (4) |

Test-case counts are the number of `it(` / `test(` declarations per file (static count, not a test run).
