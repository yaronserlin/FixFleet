# FixFleet — Functional & Technical Specification

**Product:** FixFleet — a multi-tenant equipment, fault and maintenance management PWA.
**Repository:** `MaintenanceSystemApp` · **Version documented:** 1.0.9 (frontend and backend) · **Baseline commit:** `56eb10f` + uncommitted working tree (parts domain removed, audit fixes) · **Date:** 2026-10-08

| Chapter | Contents |
|---|---|
| [01 — Architecture & Layers](01-architecture-and-layers.md) | Architectural style, system context, layer mapping, RBAC matrix, cross-cutting concerns (auth, tenancy, validation, errors, logging, security, media, PWA, a11y), frontend route map, Tool/Equipment naming legacy. |
| [02 — Database & Schemas](02-database-and-schemas.md) | All 9 collections + GridFS: field dictionaries, constraints, defaults, indexes, TTLs, relationships (ERD), cascade rules, engine-hours derivation, seed data. |
| [03 — Dependencies & Configuration](03-dependencies-and-config.md) | Manifests, npm scripts, every backend/frontend dependency with resolved version and role, all environment variables, configuration files, CI and versioning, assets. |
| [04 — File Inventory](04-file-inventory.md) | File-by-file responsibilities, exports, dependencies and consumers for backend and frontend, plus test-suite inventory. |
| [05 — API & Workflows](05-api-and-workflows.md) | API conventions, error mapping, all endpoints with roles and request/response contracts, 12 end-to-end traces, frontend → backend usage matrix. |

See the **Browsable version** note at the end of this page for the HTML viewer.

---

## 1. Executive Summary

FixFleet lets an organization (typically a farm or fleet operator) track its machines, report and resolve faults, run recurring maintenance programs measured in engine hours and calendar days, keep PDF service manuals, and keep staff informed through in-app and push notifications. Each organization is an isolated tenant created by self-service signup; a platform superadmin oversees all tenants.

| Business capability | Who | Key backend pieces | Key UI pieces |
|---|---|---|---|
| Company signup & sign-in | Public → admin | `authService.register/login`, `Company`, `User`, `RefreshToken` | `LoginComponent/*`, `AuthContext` |
| Session security (rotation, reuse detection, forced password change, reset by email) | All | `authService`, `authMiddleware`, `mailer` | `apiClient`, `ForcePasswordChangePage`, `ResetPasswordPage` |
| Fleet (equipment) registry | Admin (write), staff (read) | `equipmentService`, `Equipment` | `EquipmentsPage`, `EquipmentPage`, `ToolsPanel` |
| Fault reporting with photos | Everyone in a tenant | `faultService.createFault`, GridFS | `CreateFaultDialog`, bottom-nav FAB |
| Fault resolution & engine-hour tracking | Mechanic, admin | `faultService.closeFault`, `syncEquipmentEngineHours` | `CloseFaultDialog`, `FaultList`, `Dashboard` |
| Preventive maintenance programs with checklists | Mechanic, admin | `equipmentService.addSchedule/completeSchedule`, `Maintenance` | `EquipmentMaintenanceTab`, `EquipmentSchedulePage` |
| Service manuals (PDF) | Upload: mechanic/admin; read: all | `equipmentService.addBook`, `/uploads/:id` | `EquipmentBooksTab`, `EquipmentBooksPage`, `PdfViewerDialog` |
| Notifications (fault alerts, announcements) + Web Push | All tenant users | `notificationService`, `pushService`, `Notification`, `PushSubscription` | `NotificationBell`, `NotificationsPage`, `PushNotificationSettings`, `push-sw.js` |
| Company user management | Admin | `userService`, audit | `AdminDashboard`, `UserPanel` |
| Platform administration & audit | Superadmin | `superadminService`, `AuditLog` | `SuperAdminDashboard` |

## 2. Phase 0 — Scale Assessment

| Metric | Value |
|---|---|
| Tracked files | 321 present in the working tree (incl. 30 user-guide images, lockfiles, assets) + 1 new untracked test |
| Backend source files / LOC | 59 / 6 569 (excluding tests) |
| Frontend source files / LOC | 108 / 18 402 (excluding tests; including `push-sw.js`) |
| Test files | 16 backend (≈ 273 cases) · 56 frontend (≈ 459 cases) |
| Database entities | 9 Mongoose models (+ 1 alias) over 9 collections, 5 embedded sub-schemas, 1 GridFS bucket |
| HTTP endpoints | ≈ 76 route registrations (including the `/api/tools` alias and multi-verb routes) across 8 routers + 3 app-level routes |
| Max directory depth | 6 |
| Domains | Identity/sessions, tenancy, fleet, faults, maintenance, manuals/media, notifications/push, platform admin/audit |

**Mode selected: Modular Multi-File** (well above the 25-file threshold, eight domains).

## 3. Architecture at a Glance

```mermaid
flowchart TB
    subgraph FE["frontend/ — React 19 + MUI 9 + Vite 7 PWA"]
        direction TB
        P["pages/* (17)"] --> CMP["components/*"]
        P --> CTX["contexts/* (Auth, Equipment, Fault, Feed, PageRefresh, Theme, Toast)"]
        CTX --> SVC["services/* → apiClient (axios, Bearer, silent refresh)"]
        P --> SVC
        SWK["Service worker (Workbox + push-sw.js)"]
    end
    subgraph BE["backend/ — Express 5 + Mongoose 8"]
        direction TB
        APP["app.js: helmet · cors · sanitize · rate-limit · logger"] --> RT["routes/* (8 routers)"]
        RT --> AMW["authMiddleware · validateObjectId · multer"]
        AMW --> CTL["controllers/* (+ audit)"]
        CTL --> SV["services/* (business rules)"]
        SV --> MDL["models/* (9)"]
        SV --> UT["utils: httpError · logger · mediaStorage · mailer · audit · engineHours"]
    end
    DB[("MongoDB + GridFS")]
    SVC -- "REST /api/*, /uploads/*" --> APP
    MDL --> DB
    UT --> DB
    SV -- "web-push" --> SWK
```

## 4. Project Map

```
MaintenanceSystemApp/
├── backend/                     Express 5 REST API (CommonJS)            → 04 §4.1
│   ├── app.js                   composition root, media route, health
│   ├── config/db.js             Mongo connection + sanitizeFilter
│   ├── constants/               roles, auth, audit, faultStatus, notifications, pagination, rateLimits, scheduleStatus
│   ├── models/                  AuditLog, Company, Equipment(+Tool), Fault, Maintenance, Notification, PushSubscription, RefreshToken, User
│   ├── middleware/              auth, error, sanitize, upload, validation
│   ├── routes/                  auth, equipment(+tool), fault, maintenance, notification, admin, superadmin
│   ├── controllers/             one per router (+ toolController alias, now unused)
│   ├── services/                auth, user, equipment, fault, maintenance, notification, push, superadmin
│   ├── utils/                   audit, equipmentEngineHours, httpError, logger, mailer, mediaStorage
│   ├── scripts/                 createSuperAdmin, migrateUploadsToGridFS
│   ├── seeders/seeder.js        dev demo data
│   └── __tests__/               16 suites + helpers/setup.js
├── frontend/                    React SPA / PWA (ESM)                     → 04 §4.2
│   ├── index.html, vite.config.js, eslint/babel/jest configs
│   ├── public/                  icons, push-sw.js
│   ├── __tests__/               auth/legal page tests
│   └── src/
│       ├── main.jsx, routes.jsx, index.css, theme/, content/
│       ├── constants/           appVersion, audit, faultStatus, roles, routes
│       ├── services/            apiClient + 8 API modules
│       ├── contexts/            8 providers
│       ├── hooks/               4 hooks
│       ├── utils/               5 helper modules
│       ├── pages/               17 pages + 2 aliases
│       └── components/          ~25 component folders
├── docs/                        API.md, ENV.md, RUNBOOK.md, CONTRIBUTING.md, user-guide/, system-spec/ (this)
├── media/                       README screenshots
├── .github/workflows/           CI: frontend lint/test/build, backend syntax check/test
├── .githooks/pre-commit         spec viewer rebuild + shared version bump on main
└── .claude/plans/               historical multi-tenant migration plan
```

## 5. Domain Glossary

| Term | Meaning |
|---|---|
| Company / tenant | An organization; the isolation boundary (`companyId`). |
| Operator | Default tenant role; reports faults, reads manuals. |
| Mechanic | Maintains equipment: resolves faults, runs schedules, uploads manuals. |
| Admin | Tenant administrator; manages users and equipment, sends announcements. |
| Superadmin | Platform operator with no company; manages tenants. |
| Equipment / Tool | A machine (two names for the same entity — see [01 §1.7](01-architecture-and-layers.md#17-naming-legacy-tool-vs-equipment)). |
| Engine hours | Hour-meter reading; drives hour-based maintenance due dates; highest reading wins, and drops back only when the record holding it is reopened or deleted. |
| Maintenance schedule (routine) | Recurring task on a machine with an hour and/or day interval and a checklist. |
| Maintenance record (log) | A completed service entry. |
| Book / manual | A PDF attached to a machine. |
| Announcement | Admin/superadmin broadcast notification. |
| RTR | Refresh-token rotation with reuse detection. |

## 6. Primary Workflows (summary — full traces in [05 §5.3](05-api-and-workflows.md#53-end-to-end-traces))

1. **Signup** — `SignupForm` → `POST /api/auth/register` → Company + admin User + RefreshToken → audit → dashboard.
2. **Fault report** — `CreateFaultDialog` → `POST /api/faults` (multipart) → GridFS photos → Fault + equipment back-reference → per-recipient Notifications for mechanics/admins → Web Push → service worker → live refresh of open tabs.
3. **Fault resolution** — `CloseFaultDialog` → `PATCH /api/faults/:id/close` → closing hours → highest-wins engine-hours sync (reopen/delete can lower it again) → schedule statuses recomputed.
4. **Preventive maintenance** — schedule created → checklist ticked and notes saved on the schedule page → `POST …/complete` → Maintenance record (checklist snapshot + merged notes) → next due recomputed → checklist reset.
5. **User onboarding** — admin creates user (operator, forced change) → first login gated to the password + terms page → all sessions revoked after the change.
6. **Platform oversight** — superadmin stats, company activation (revokes sessions), cross-tenant user role/password/delete, platform announcements, audit trail.

## 7. Audit Observations

Factual findings from reading the code. They do not change the specification above; they mark places where behaviour, comments or configuration disagree, ordered by impact. Re-verified against the working tree on 2026-10-08: ten earlier findings were fixed (password hashes in close/reopen responses, service-worker cookie auth, monotonic engine hours, the unreferenced-media fallback, orphaned photos/notifications/sessions, the fault-code and upload-status mismatches, the unused parts/admin-equipment surface, the unused frontend dependencies, CI and hygiene gaps, and the `updateFault` JSDoc). Operators listing every company fault is now documented as by design ([01 §1.4](01-architecture-and-layers.md#14-authorization-model-rbac)).

| # | Area | Finding | Evidence |
|---|---|---|---|
| 1 | Session availability | The service worker now gets its token by calling `POST /api/auth/refresh`: once per received push (`syncAppBadge`) and twice per tapped notification (`markNotificationRead` then `syncAppBadge`). That route sits behind `authLimiter` (20 requests / 15 min **per IP**, shared with login and register). A burst of pushes, or several users behind one office NAT, exhausts it, and the page's own silent refresh then gets `429`, which `apiClient` handles by clearing the token and redirecting to `/login`. Each call also rotates the refresh token. The worker also hard-codes same-origin `/api/...` URLs, so in a split-origin deployment (absolute `VITE_API_URL`) all three calls miss the API. | `frontend/public/push-sw.js:31`, `:70`, `:146`; `backend/routes/authRoutes.js:43`; `backend/constants/rateLimits.js:14`; `frontend/src/services/apiClient.js:118` |
| 2 | Performance | Fault and equipment lists are unpaginated by default, and the dashboard, the equipment page and `FaultContext` each fetch the full company fault list, refreshed every 30 s while visible. Cost grows linearly with fault history. (`GET /api/equipment` no longer populates faults.) | `backend/services/faultService.js:59`; `frontend/src/pages/Dashboard.jsx:195`; `frontend/src/pages/EquipmentsPage.jsx:54`; `frontend/src/contexts/FaultContext.jsx:23`; `frontend/src/contexts/PageRefreshContext.jsx:40` |
| 3 | Docs drift | The English Terms of Service (v1.3) still list "spare part inventory management" as a core feature; the parts domain was removed. The `syncEquipmentEngineHours` JSDoc says closed faults contribute `closingEngineHours` *and* `engineHours`; the query selects only `closingEngineHours`. | `frontend/src/content/legalDocuments.js:21`; `backend/utils/equipmentEngineHours.js:8`, `:38` |
| 4 | Unused code | `controllers/toolController.js` is no longer imported anywhere: its only consumer was `adminRoutes.js`, whose equipment/tool aliases were removed. `models/Tool.js` still cites it as part of the alias chain. Frontend methods with no caller: `faultsService.getById` and `equipmentService.addChecklistItem` / `deleteChecklistItem`, so `GET /api/faults/:id` and the checklist add/delete endpoints have no UI consumer. | `backend/controllers/toolController.js:1`; `backend/models/Tool.js:5`; `frontend/src/services/faultsService.js:10`; `frontend/src/services/equipmentService.js:114`, `:130` |
| 5 | CI / hygiene | The backend has no linter: no ESLint config and no `lint` script, so CI checks backend syntax and tests only. | `backend/package.json:6`; `.github/workflows/increment-build-version.yml` |

**Browsable version:** open `docs/system-spec/index.html` in a browser. It is generated from these Markdown files by `docs/system-spec/_build/build.mjs` and kept in sync automatically: the pre-commit hook rebuilds and stages it whenever a spec file, the template or the viewer config is committed, and `npm run docs:watch` (repo root) rebuilds it on every save while you edit. One-time setup: `npm install --prefix docs/system-spec/_build`.
