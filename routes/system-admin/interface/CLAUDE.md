# Interfaces config (`/system-admin/interface`)

Per-BU config for connections to external systems — **Accounting**, **POS**, **PMS**
(the customer's "HMS"). Config storage only; no sync/test-connection.

- **Registry (`interface-registry.ts`)** holds *list metadata only* — `key` (route param),
  `configKey` (`interface_<key>`), `icon`, and a `lazy()` form. Each interface owns its own
  form + zod schema (`<name>-interface-form.tsx`), NOT a shared schema. **Add an interface** =
  one registry entry + one form file (+ its i18n block, + a backend `secretPathsByKey` path if
  it has a secret). A future interface can render anything (e.g. a mapping table) without
  touching the others.
- **Shared bits:** `use-interface-config.ts` (wraps `useAppConfigByKey`/`useUpsertAppConfig`;
  maps 404 → `isNew`, not an error), `interface-page-layout.tsx` (presentational shell +
  nav-guard, takes `isDirty`, holds no form state), `interface-fields.tsx`
  (`TextField`/`EnumField`/`ToggleField` — label+value, not schema-driven). Forms derive
  dropdown options from `schema.shape.<field>.options` so options and validation can't drift.
- **Storage:** one `tb_application_config` row per interface. The backend
  (`carmen-turborepo-backend-v2`) encrypts+masks the `api_key` secret via a generic
  `secretPathsByKey` registry; a never-configured interface returns `{ enabled: false }`
  (not 404). **Prod/UAT must set `SECRET_ENCRYPTION_KEY`** or any secret-bearing save (incl.
  the pre-existing `report_email`) 400s.
- **List-envelope gotcha:** the app-config *list* endpoint returns `{ data: { items, count } }`
  — the array is at `json.data.items`, NOT `json.data` (which is the array only in a mental
  model, never in reality). The *single-key* GET's `json.data` IS the row. `useAppConfigs`
  reads `.items`; any new list hook must too. A test mocking a bare `{ data: [...] }` passes
  while the real page crashes — verify list features in a real browser.
