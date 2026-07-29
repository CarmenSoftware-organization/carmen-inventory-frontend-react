# Interfaces Config — Design

Date: 2026-07-16
Status: Approved (design), pending implementation plan

## Goal

Add an **Interfaces** configuration area under `/system-admin` that stores settings for
Carmen's connections to external systems — **Accounting**, **POS**, and **PMS**.

Scope is **config storage only**. The page reads and writes configuration; it does not
run syncs, test connections, or show sync history. Any actual posting/interfacing is done
elsewhere (backend jobs, existing procedures) and is out of scope here.

The interface list starts at three entries and must be cheap to extend later.

## Domain grounding

The three interfaces are not invented — they exist in the Carmen product today (per
`kb-carmen`):

- **PMS Interface** — `contents/carmen/ar/AR-posting_pms.md`: "post ข้อมูล City Ledger และ
  Credit Card จากระบบ PMS แบบ API". The user's "HMS" is this PMS interface.
- **Receiving Interface (AP)** — `contents/carmen/changelog/sep2024.md`: "in case user not
  set up default account code and department code for vendor, system will not shows error
  message but will use default value from interface configuration instead".
- **GL / PMS interface mapping** — `contents/carmen/changelog/nov2024.md`: "General Ledger
  → Procedure → PMS Interface", a *mapping* screen kept separate from interface config.

Because legacy Carmen already separates interface **config** from interface **mapping**,
v1 stores scalar fields only. Mapping tables are explicitly deferred.

## Config fields

All three share an `enabled` boolean. Field names below are the JSON keys stored in
`tb_application_config.value`.

### `interface_accounting`

| Field | Type | Notes |
|---|---|---|
| `enabled` | boolean | |
| `system` | enum | `carmen_gl` \| `blueledgers` \| `external` |
| `default_account_code` | string | Fallback when vendor has none (per KB) |
| `default_department_code` | string | Fallback when vendor has none (per KB) |
| `default_invoice_value` | string | Fallback when vendor has none (per KB). **See open question below** |
| `export_format` | enum | `csv` \| `xml` \| `json` |
| `endpoint` | string | |
| `posting_frequency` | enum | `manual` \| `daily` \| `monthly` |

### `interface_pos`

| Field | Type | Notes |
|---|---|---|
| `enabled` | boolean | |
| `vendor` | enum | `micros` \| `infrasys` \| `square` \| `other` |
| `endpoint` | string | |
| `api_key` | string | **secret** — encrypted at rest, masked on read |
| `sync_frequency` | enum | `manual` \| `hourly` \| `daily` |
| `default_location_code` | string | |
| `consumption_posting` | enum | `recipe` \| `direct` |

### `interface_pms`

| Field | Type | Notes |
|---|---|---|
| `enabled` | boolean | |
| `vendor` | enum | `opera` \| `protel` \| `other` |
| `endpoint` | string | |
| `api_key` | string | **secret** — encrypted at rest, masked on read |
| `property_code` | string | |
| `post_city_ledger` | boolean | per KB |
| `post_credit_card` | boolean | per KB |

### Open question — `default_invoice_value`

`default_account_code` and `default_department_code` are unambiguous: the KB names them as
codes and the app has matching concepts. `default_invoice_value` is not. The KB says only
"if Vendor not set default invoice value then system will use value from Interface
configuration" without stating what the value is — it could be an amount, a valuation
basis, or a tax/discount default.

This spec assumes a **free-text string** so it can hold whatever the AP posting side
expects. If Carmen AP treats it as a number or a fixed set of options, the field type and
its zod schema change; nothing else in this design moves. Worth confirming with someone who
knows the AP receiving flow before implementation — otherwise implement as a string.

## Storage

One `tb_application_config` row per interface, keyed `interface_accounting`,
`interface_pos`, `interface_pms`. Rejected alternative: a single `interfaces` blob key —
saving one interface would rewrite the whole value (lost update across interfaces) and
force a shared `doc_version`.

Backend accepts these keys today: `validateValue()` (app-config.service.ts:172) returns
unknown-key values as-is, and `KEY_REGEX = /^[a-zA-Z0-9_.-]+$/` (line 8) admits them.

## Architecture

Registry supplies **list metadata only**; each interface owns its own form, schema, and
submit logic. Rejected alternative: a fully data-driven registry with a generic field
renderer — it is cheaper per new interface but cannot express a mapping table, which the
KB shows is coming. Paying one component file per interface avoids that rewrite.

### New files — `routes/system-admin/interface/`

```
interface-registry.ts          metadata: key, configKey, icon, lazy form
interface.route.tsx            list  → export Component
interface-list.tsx             card grid + enabled badge
interface-detail.route.tsx     /:key → resolve registry, else NotFound
interface-page-layout.tsx      shared header (title/desc/Save) + skeleton + ErrorState
use-interface-config.ts        wraps useAppConfigByKey + useUpsertAppConfig
accounting-interface-form.tsx  form + zod schema (self-contained, per config-email)
pos-interface-form.tsx
pms-interface-form.tsx
```

Registry shape:

```ts
export type InterfaceDef = {
  readonly key: string;        // route param: "accounting" | "pos" | "pms"
  readonly configKey: string;  // app_config key: "interface_accounting"
  readonly icon: LucideIcon;
  readonly form: LazyExoticComponent<ComponentType>;
};
```

Each `*-interface-form.tsx` is a self-contained page component owning its `useForm`, zod
schema, and submit — mirroring `config-email-component.tsx`. Only two things are shared:
`useInterfaceConfig(configKey)` and `InterfacePageLayout`. A shell owning form state would
require a generic schema, which is the rejected data-driven approach.

`InterfacePageLayout` is **presentational only** — it holds no form state. It takes
`{ title, description, onSave, isSaving, isLoading, isError, onRetry, children }` and
renders the header, Save button, skeleton, and `ErrorState`. The form component owns
`useForm` and passes its own `handleSubmit` in as `onSave`. The Save button living in the
layout while submit logic lives in the form is intentional and is the only coupling
between them.

### Existing files touched (frontend)

- `hooks/use-app-config.ts` — add `useAppConfigs()` list hook (the `APP_CONFIGS` endpoint
  exists in `constant/api-endpoints.ts:35`; no hook consumes it yet)
- `routes/router.tsx` — two routes under the `system-admin` section parent:
  `interface` and `interface/:key`
- `routes/system-admin/landing-types.ts` — module entry in chapter `config`, new `VisualKey`
- `routes/system-admin/landing-visuals.tsx` — visual case for the new key
- `messages/{en,th}.json` — namespace `systemAdmin.interface.*`

## Data flow

```
List   /system-admin/interface
  useAppConfigs() → AppConfig[] → Map by key
  INTERFACES.map(def => card{ icon, title,
    enabled: map.get(def.configKey)?.value.enabled === true })
  no row → disabled (not an error)

Detail /system-admin/interface/:key
  useParams().key → INTERFACES.find(...) → not found → NotFound
  <Suspense fallback={skeleton}><def.form /></Suspense>

Form
  useInterfaceConfig("interface_accounting") → { data, isLoading, isNew, save, isSaving }
  useForm + zodResolver(schema); reset(toFormValues(data.value)) when data arrives
  submit → save(toApiValue(values)) → toast
```

`useUpsertAppConfig` already invalidates `[QUERY_KEYS.APP_CONFIGS]`, so the list badge
refreshes after save with no extra work.

`useInterfaceConfig(configKey)` treats a 404 as `isNew: true`, not an error, and
surfaces genuine failures (500/401) for `ErrorState`.

## Backend changes — `carmen-turborepo-backend-v2`

`apps/micro-business/src/app-config/app-config.service.ts`

### 1. Secret path registry (replaces hardcoded `report_email`)

Today both guards are pinned to one key and one path:

```ts
maskSensitiveFields(key, value)    // line 109: if (key !== 'report_email' ...) return value;
encryptSensitiveFields(key, value) // line 123: same guard, path v.smtp.password
```

Replace with a per-key path table, walked generically:

```ts
private readonly secretPathsByKey: Record<string, readonly string[][]> = {
  report_email:  [['smtp', 'password']],
  interface_pos: [['api_key']],
  interface_pms: [['api_key']],
};
```

Adding a future interface with a secret becomes one entry.

### 2. MASK sentinel guard on upsert — also fixes a live bug

This is a **pre-existing defect in Config Email**, found while designing:

```
PREFIX = 'enc:v1:'           crypto.util.ts:18
MASK   = '***ENCRYPTED***'   app-config.service.ts:9
isEncrypted(v) = v.startsWith(PREFIX)      crypto.util.ts:105
```

`'***ENCRYPTED***'.startsWith('enc:v1:')` is **false**, so:

1. GET masks `smtp.password` to `***ENCRYPTED***`
2. the form loads MASK into the password input
3. the user edits another field and saves without retyping the password
4. `encryptSensitiveFields` sees `!isEncrypted(MASK)` → true
5. it encrypts the literal string `***ENCRYPTED***` and overwrites the row
6. the real SMTP password is destroyed

Any user who opens Config Email and saves without retyping the password breaks system
email today. Copying the pattern to `api_key` would reproduce it exactly.

Fix: in `upsert`, when an incoming secret equals `MASK`, retain the stored value instead
of overwriting it. After change 1 both keys share this path, so `report_email` is fixed
alongside the new interface keys.

If the caller posts MASK and there is **no** stored secret to restore — the row was
deleted while their form was open — `upsert` throws rather than persisting anything.
Storing the literal mask would destroy the secret; storing `''` would persist a row that
fails its own schema, breaking report email with a confusing error and letting a POS
interface authenticate with an empty key. Neither is acceptable, so refuse the write.

### 3. `schemaByKey` — add zod schemas for the three interface keys

Not strictly required (unknown keys pass through) but without it validation is
client-side only.

### 4. `defaultByKey` — add `interface_*: { enabled: false }`

Removes the first-load 404 at the source. The frontend 404 handling stays regardless, to
cover business units and deploys where the default is not yet present.

## Error handling

| Case | Behavior |
|---|---|
| general route error | `/system-admin` parent already carries `RouteErrorBoundaryAdapter` — nothing new |
| `:key` not in registry | inline `ErrorState` ("Interface not found") — the detail route is nested inside `RootLayout`, so it must NOT use the full-page `NotFoundComponent` (which brings its own `min-h-screen` header/logo/footer and would double the shell chrome). Matches the department/role edit convention of an inline `ErrorState` when a record is missing inside the shell. |
| config 404 (never configured) | `isNew: true` → form shows defaults, no error UI |
| 500 / 401 | `ErrorState` + retry (per default-setting) |
| save error | `toast.error` from the ApiError message (per config-email) |
| unsaved edits on exit | `useDiscardConfirm` + `useNavigationGuard` (per default-setting) |

## Accepted limitations / follow-ups

- **No optimistic locking on app_config.** The `AppConfig` type carries no `doc_version`
  and upsert does not send one, so two admins editing the same interface is a silent
  last-write-wins — unlike BU config, which gets a 409. Fixing it means changing the API
  contract for every app_config consumer (print config, signature, approval flow,
  report_email). Interface edits are rare; the risk is accepted. **Follow-up.**
- **No role guard on app-config endpoints.** `@UseGuards(KeycloakGuard)` only
  (`config_app-config.controller.ts:45`), so any authenticated user in the business unit
  can GET app-config. Backend changes 1 and 2 close the main exposure by encrypting
  `api_key` at rest and masking it on read. Adding a role guard affects every key using
  this endpoint and is a separate piece of work. **Follow-up.**
- **Mapping tables deferred.** v1 is scalar fields only, matching legacy Carmen's split
  between interface config and interface mapping.

## Testing

Frontend:

1. `interface-registry.test.ts` — unique keys, `configKey` starts with `interface_`, every
   def has a form (per `company-profile-config-registry.test.ts`)
2. `use-interface-config.test.ts` — **highest value; the only genuinely new logic**:
   404 → `isNew: true` and not an error; 500 → `isError: true`
3. schema tests per interface — `toFormValues`/`toApiValue` round-trip, zod validation
   (per `company-profile-form-schema.test.ts`)
4. `interface-list` — enabled/disabled badge derivation; missing row → disabled

Backend, extending `app-config.service.spec.ts`:

5. MASK sentinel — upsert with `api_key === '***ENCRYPTED***'` leaves the stored value
   untouched; a new value is encrypted on store and masked on read. **Includes a
   `report_email` regression case**, since change 2 is the bug fix and without a test
   pinning it the defect can return.

## Definition of done

- `bunx tsc --noEmit && bun test:run` clean in the frontend repo
- backend `app-config.service.spec.ts` passes with the new cases
- all three interfaces reachable from the system-admin landing `config` chapter
- saving an interface updates the list badge without a manual refresh
- `api_key` never leaves the backend unmasked, and is never stored in plaintext
