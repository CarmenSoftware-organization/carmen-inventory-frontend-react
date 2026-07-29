# Carmen GL Interface — Legacy Carmen 4 Config Fields — Design

Date: 2026-07-22
Status: Approved (design), pending spec review
Extends `2026-07-16-interfaces-config-design.md` and
`2026-07-16-interface-brands-visibility-design.md` (Category→Brand registry, PR #55/#56).

## Why this exists

The `carmen_gl` brand under the Accounting interface currently shares the generic
accounting form (default account/department codes, export format, posting frequency).
The real Carmen 4 legacy integration is configured with a different, concrete field set
(seen in the legacy Carmen 4 config screen):

- **API Server** — base URL of the Carmen 4 API (e.g. `https://dev.carmen4.com/carmen.api/`)
- **Authorize Token** — a secret bearer-style token
- **Account Code / Department / Vendor** — three relative endpoint paths under the API
  server (`api/interface/accountCode`, `api/interface/department`, `api/interface/vendor`)
- **Options** — "Set account mapping for all items" and "Allow posting the transfer to GL"

This spec replaces the carmen_gl form with exactly that field set. The generic accounting
form stays as-is for `blueledgers` and `external`.

## Decisions (from brainstorm)

1. **Scope: carmen_gl only.** blueledgers/external keep the existing generic form. This
   requires the registry to support a per-brand form override (approach A below).
2. **Backend included.** `carmen-turborepo-backend-v2` gets the new Zod schema and a
   secret path so `authorize_token` is encrypted at rest and masked on GET — same
   machinery as the POS/PMS `api_key`.
3. **Field set = the legacy screen only** (plus the standard `enabled` toggle). None of
   the old generic accounting fields remain on the carmen_gl form.

### Approaches considered

- **A. Brand-level form override in the registry (chosen)** — `BrandDef` gains an
  optional `form`; the detail route renders `brandDef.form ?? categoryDef.form`. Additive,
  matches the registry's stated philosophy ("a future interface can render anything
  without touching the others").
- **B. Branch inside `accounting-interface-form.tsx`** — rejected: two schemas in one
  file, harder to test, breaks "each form owns its schema".
- **C. Split every accounting brand into its own form** — rejected: YAGNI; duplicates the
  generic form twice for no behavior change.

## Config shape

Stored in `tb_application_config` under the existing key
`interface_accounting_carmen_gl` (one row per business unit; key unchanged).

| Field (snake_case) | Type | Default | Notes |
|---|---|---|---|
| `enabled` | boolean | `false` | standard interface toggle |
| `api_server` | string | `""` | placeholder `https://dev.carmen4.com/carmen.api/` |
| `authorize_token` | string | `""` | **secret** — encrypted at rest, masked on GET |
| `account_code_path` | string | `"api/interface/accountCode"` | relative to `api_server` |
| `department_path` | string | `"api/interface/department"` | relative to `api_server` |
| `vendor_path` | string | `"api/interface/vendor"` | relative to `api_server` |
| `set_account_mapping_all_items` | boolean | `true` | checked in the legacy screen |
| `allow_posting_transfer_to_gl` | boolean | `false` | |

All fields are non-optional in the schema; the three paths default to the standard legacy
values so a fresh form is usable with only server + token filled in.

## Frontend changes (`carmen-inventory-frontend-react`)

Files under `routes/system-admin/interface/`:

1. **`interface-registry.ts`** — `BrandDef` gains
   `readonly form?: LazyExoticComponent<ComponentType>`. The accounting category's
   `carmen_gl` brand sets `form: lazy(() => import("./carmen-gl-interface-form"))`.
   `findCategory`/`findBrand` unchanged.
2. **`interface-detail.route.tsx`** — `const Form = brandDef.form ?? categoryDef.form;`
   (one-line change; entitlement/not-found logic untouched).
3. **`carmen-gl-interface-form.tsx` (new)** — follows the PMS form pattern exactly:
   - `carmenGlSchema` (zod) + `EMPTY_CARMEN_GL` + `toFormValues` + `toApiValue` exported
     for tests.
   - `useInterfaceConfig("interface_accounting_carmen_gl")` — brand is static here; still
     read `useParams().brand` only for the title, consistent with siblings.
   - Layout: `InterfacePageLayout` with three `SettingSection`s:
     - **Connection** — `enabled` toggle, `api_server` (full-width text),
       `authorize_token` (`type="password"` + reuse `t("apiKeyHint")` retention hint).
     - **Data endpoints** — the three path text fields.
     - **Options** — the two toggles.
4. **`carmen-gl-interface-form.test.ts` (new)** — schema/`toFormValues`/`toApiValue`
   round-trip tests, incl. "old generic-shape row parses to defaults" (zod strips unknown
   keys over the `EMPTY` spread).
5. **`interface-registry.test.ts`** — assert carmen_gl resolves the override form and
   other brands fall back to the category form.
6. **i18n `messages/{en,th}.json`** — new block
   `systemAdmin.interface.accounting.carmenGl.*` (section titles/descs, field labels,
   option labels). Existing accounting keys untouched.

No data migration: an old-shape `interface_accounting_carmen_gl` row safe-parses to
defaults on load (unknown keys stripped, missing keys from `EMPTY`), and the first Save
writes the new shape.

## Backend changes (`carmen-turborepo-backend-v2`)

All in `apps/micro-business/src/app-config/app-config.service.ts` (+ its spec):

1. **New `InterfaceAccountingCarmenGlSchema`** — mirrors the table above (all fields
   required, booleans/strings; no Prisma enum needed).
2. **`validateValue()`** — match `interface_accounting_carmen_gl` **exactly, before** the
   generic `^interface_accounting(_.+)?$` pattern, so carmen_gl validates against the new
   schema and other accounting brands keep `InterfaceAccountingSchema`.
3. **`secretPathsFor()`** — add
   `if (key === 'interface_accounting_carmen_gl') return [['authorize_token']];`
   Exact-key match on purpose: other accounting brands have no secret, and a broad
   category pattern would mask any same-named field on them unintentionally.
   Encrypt/mask/`retainMaskedSecrets` then work unchanged.
4. **`defaultFor()`** — already covers the key (`{ enabled: false }`); no change.
5. **Spec tests** — new-schema validation (accept/reject), `authorize_token`
   encrypted on save, masked on GET, mask echoed back retains the stored token, and the
   generic accounting schema still applies to `interface_accounting_blueledgers`.

**Verification step (not expected to need code):** confirm the gateway's app-config
response `@Serialize` schema passes `value` through as a whole JSON object (per the known
add-field serializer gotcha). If it enumerates fields, add the new ones there too.

## Error handling

- Saving with a secret requires `SECRET_ENCRYPTION_KEY` on the backend (existing
  constraint; prod/UAT deploy note).
- Untouched token field posts the mask back; backend restores the stored secret
  (existing `retainMaskedSecrets` behavior — throws only if the stored row vanished).
- Frontend form has no required-field validation beyond types: an empty `api_server` is
  storable (config-storage-only feature; no sync engine consumes it yet, consistent with
  the interfaces-config spec).

## Testing

- Frontend: `bunx tsc --noEmit && bun test:run` clean; new tests listed above.
- Backend: app-config service spec additions above; existing suite stays green.

## Out of scope

- Any sync/connection-test behavior against the Carmen 4 API (config storage only).
- Changes to the generic accounting form, POS, PMS, or the platform visibility flow.
- Migrating stored generic-shape carmen_gl rows (lazy schema evolution instead).
