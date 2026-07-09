# Design: Move SQL Workbench to carmen-platform

- **Date:** 2026-07-09
- **Status:** Approved (pending implementation plan)
- **Repos touched:** `carmen-inventory-frontend-react` (source — removal) and
  `../carmen-platform` (target — new feature). Implementation is primarily in
  carmen-platform.

## 1. Context & motivation

The SQL Workbench page (`/system-admin/query-dataset`) in
`carmen-inventory-frontend-react` lets an operator run ad-hoc queries and create
views / stored procedures / functions against a tenant database. It is a
platform-administration tool, not an inventory feature, so it belongs in the
platform admin app (`../carmen-platform`), where cluster / business-unit / user
administration already lives.

This is a **true move**: the page is removed from inventory-react entirely and
re-created in carmen-platform, adapted to that app's conventions.

## 2. Goals / non-goals

**Goals**

- Re-create the SQL Workbench in carmen-platform following its existing patterns
  (axios service + component state, CodeMirror, shadcn/ui, relative imports).
- Let a platform admin pick which business unit the SQL runs against (the app has
  no single "current BU").
- Gate access with a new platform RBAC permission (not only super-admin).
- Remove the feature and all its now-dead dependencies from inventory-react.

**Non-goals**

- No change to the backend SQL endpoints or their server-side authorization.
- No new query features beyond what the source page already does (run, save
  view/procedure/function, drop, browse db objects).
- No persistence of the selected BU across sessions (YAGNI).

## 3. Decisions (locked)

| Topic | Decision |
|---|---|
| Disposition | **Move** — delete from inventory-react, add to platform |
| BU targeting | **Dropdown on the page**, sourced from `businessUnitService` |
| Data layer | **axios service + `useState`** (no react-query — matches platform) |
| SQL editor | **CodeMirror 6 + `@codemirror/lang-sql`** (reuse `XmlEditor` setup; no Monaco) |
| Access control | **New platform permission** `sql_workbench.read` / `sql_workbench.manage` |

## 4. What the source page does (reference)

`routes/system-admin/query-dataset/` in inventory-react:

- `query-dataset-component.tsx` (orchestrator): run SQL, save as
  view/stored_procedure/function, drop a loaded object.
- `sql-editor.tsx`: Monaco editor + `sql-formatter` + `next-themes`, schema-aware
  autocomplete, Cmd/Ctrl+Enter to run.
- `result-panel.tsx`: result table + CSV export.
- `db-object-tree.tsx`: sidebar tree of views / procedures / functions.
- `hooks/use-sql-query.ts`: TanStack Query + `httpClient`, calls
  `/api/config/{buCode}/sql-query/*`.
- `lib/sql-validator.ts`: client-side safety validator (blocks
  DROP/TRUNCATE/GRANT/… and multi-statement where disallowed).

## 5. Target architecture in carmen-platform

### 5.1 File layout

Follow the `businessUnitEdit/` decomposition pattern (orchestrator page +
focused sub-components):

```
src/pages/sqlWorkbench/
  SqlWorkbench.tsx      Orchestrator: BU selector, form state, run/save/drop, permission gates
  SqlEditor.tsx         CodeMirror 6 + lang-sql (replaces Monaco)
  ResultPanel.tsx       Result table + CSV export (src/utils/csvExport)
  DbObjectTree.tsx      Sidebar tree of db objects
src/services/sqlQueryService.ts   axios: dbObjects / definition / execute / save / drop
src/utils/sqlValidator.ts         Copied validator (pure)
src/utils/sqlValidator.test.ts    New unit tests (source had none)
src/components/ui/select.tsx      New shadcn Select primitive (+ @radix-ui/react-select)
src/types/index.ts                Add SQL types (DbObject, SqlExecuteResult, SaveDdlInput, …)
```

### 5.2 Data layer (`sqlQueryService.ts`)

No react-query. A plain axios service mirroring the existing entity services
(e.g. `clusterService.ts`), returning parsed data and letting callers handle
loading/error. Endpoint base follows the same convention as existing services —
the SQL endpoints live under the `/api` proxy (tenant backend), not `/api-system`:

| Function | Call |
|---|---|
| `getDbObjects(buCode)` | `GET /api/config/{buCode}/sql-query/db-objects` |
| `getDefinition(buCode, {type, schema, name})` | `GET /api/config/{buCode}/sql-query/db-objects/definition?type=…&schema=…&name=…` |
| `executeSql(buCode, sqlText)` | `POST /api/config/{buCode}/sql-query/execute` |
| `saveDdl(buCode, input)` | `POST /api/config/{buCode}/sql-query/save` |
| `dropObject(buCode, {type, schema, name})` | `DELETE /api/config/{buCode}/sql-query/db-objects?type=…&schema=…&name=…` |

> Confirm the exact proxied path against swagger during implementation — the
> inventory app reaches these as `httpClient` `/api/proxy/api/config/…`, which
> rewrites to backend `/api/config/…`. The platform's axios instance + Vite `/api`
> proxy must resolve to the same backend path.

`SqlWorkbench.tsx` holds component state in place of the query hooks:
`buCode`, `dbObjects`, `formName`, `formSqlText`, `formQueryType`,
`loadedObject`, `executeResult`, `executeError`, `isRunning`, `isSaving`,
`isDropping`, `loadingObjectKey`. Mutations use `try/catch` + `sonner` toasts;
after a successful save/drop the db-object list is re-fetched.

### 5.3 BU selector

A `Select` at the top of the page lists business units from `businessUnitService`.
The chosen `buCode` is held in component state. Until a BU is selected, the db
tree, run, and save actions are disabled with a "Select a business unit to begin"
prompt. Selection is not persisted across sessions.

### 5.4 SQL editor (CodeMirror)

Re-use `XmlEditor.tsx`'s CodeMirror 6 setup (state, view, history, search,
custom `EditorView.theme` — the app has no `next-themes`) and swap the language
extension for `@codemirror/lang-sql`. Provide:

- Syntax highlighting for SQL.
- Schema-aware autocomplete fed from `dbObjects` (lang-sql accepts a
  `schema: { table: [columns] }` map).
- Cmd/Ctrl+Enter to run.
- A "Format" button via `sql-formatter` (editor-agnostic).

### 5.5 Validation

Copy `sql-validator.ts` → `src/utils/sqlValidator.ts` unchanged. It runs
client-side only (its `typeof window === "undefined"` guard is satisfied in the
browser and in jsdom tests). It is UI feedback only; the backend remains the
authorization source of truth.

### 5.6 Permission model

Two new platform permissions in the `resource.action` style:

| Key | Grants |
|---|---|
| `sql_workbench.read` | Open the page, browse the db-object tree, run read-only queries (SELECT/EXPLAIN) |
| `sql_workbench.manage` | Save (create view/procedure/function) and Drop (DDL that mutates the DB) |

Gating:

- **Route** (`src/App.tsx`): `PrivateRoute requiredPermission="sql_workbench.read"`.
- **Save / Drop buttons**: hidden or disabled unless `hasPermission("sql_workbench.manage")`.
- **Sidebar nav** (`Layout.tsx`): gated on `sql_workbench.read`.
- **Super admin**: bypasses both automatically (`checkPermission` returns `true`
  when `is_super_admin`).

Frontend enablement for dev: add both keys to
`DEV_MOCK_EFFECTIVE_PERMISSIONS.platform` in `src/utils/permissions.ts` so
dev/local works before the backend seeds them.

### 5.7 Routing & navigation

- Route: `/sql-workbench` → `SqlWorkbench`, wrapped in `PrivateRoute` as above,
  added to `src/App.tsx`.
- Sidebar: a nav item in `allNavItems` (`src/components/Layout.tsx`) under the
  **Platform** group, `permission: "sql_workbench.read"`, icon `Database`
  (lucide). Replaces the source's `ModuleTileIcon` header art with a plain
  `Database` icon.

## 6. Removal from inventory-react

Dependencies are isolated (verified — nothing else imports them):

- Delete `routes/system-admin/query-dataset/` (all 5 files).
- Delete `hooks/use-sql-query.ts`.
- Delete `lib/sql-validator.ts`.
- Remove the route registration at `routes/router.tsx` (the `query-dataset` child).
- Remove the `queryDataset` entry in `constant/module-list.ts`.
- Remove the `query` tile in `routes/system-admin/landing-types.ts`.
- Remove the `SQL_QUERY_*` endpoint builders in `constant/api-endpoints.ts`.

## 7. New dependencies (carmen-platform)

- `@codemirror/lang-sql` — SQL language for the editor.
- `@radix-ui/react-select` — backing for the new shadcn `select.tsx`.
- `sql-formatter` — the "Format SQL" button (editor-agnostic).

(The `@codemirror/*` core, `sonner`, `lucide-react`, and `@tanstack/react-table`
are already present.)

## 8. Testing & verification

- `src/utils/sqlValidator.test.ts` (Vitest): allowed leading keywords, forbidden
  keywords (DROP/TRUNCATE/…), multi-statement rejection, comment/string/dollar-
  quote handling. High value — the source had no tests.
- `src/pages/sqlWorkbench/SqlWorkbench.test.tsx`: smoke test — `vi.mock`
  `sqlQueryService` + `businessUnitService`, keep routing real via `MemoryRouter`;
  assert BU-gated empty state, run flow, and that Save/Drop hide without
  `sql_workbench.manage`.
- Both repos: build / `tsc --noEmit` and unit tests pass clean
  (`bun run build`, `bun run test`).

## 9. Known dependencies & open items

- **Backend permission seed (blocking for production RBAC):** the platform
  backend (NestJS/Prisma) must add `sql_workbench.read` and
  `sql_workbench.manage` to its permission catalog (served by
  `GET /api-system/platform/permissions`) so they can be assigned to roles and
  appear in RoleEdit / PermissionCatalog. Until then the frontend relies on the
  dev mock and super-admin. Coordinate with the backend team.
- **Backend SQL endpoints:** the tenant SQL endpoints
  (`/api/config/{buCode}/sql-query/*`) must be reachable from the platform app's
  backend target and enforce their own server-side authorization. The frontend
  permission is a UI gate only.
- **CORS / proxy:** confirm the platform Vite `/api` proxy and the axios base URL
  resolve to a backend that serves the SQL endpoints (same gateway the inventory
  app used).

## 10. Out of scope (YAGNI)

- Persisting the selected BU across reloads.
- Query history / saved snippets beyond the existing save-as-object flow.
- Granularity beyond `read` / `manage` (e.g. separate `execute` vs `save` vs
  `drop`) — collapse or expand only if a concrete need appears.
