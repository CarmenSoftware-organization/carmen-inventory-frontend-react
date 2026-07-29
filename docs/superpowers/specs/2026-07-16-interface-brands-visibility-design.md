# Interface Brands + Platform Visibility — Design (Phase 1)

Date: 2026-07-16
Status: Draft (design), pending review
Supersedes nothing — extends `2026-07-16-interfaces-config-design.md` (the shipped
Interfaces config, PR #55).

## Why this exists

Two asks:

1. **Separate each brand of an interface into its own config** — instead of one POS config
   with a `vendor` dropdown, POS becomes a category holding brands (Micros, Infrasys,
   Square), each configured on its own.
2. **Let the platform choose which interfaces are visible on the frontend** — a super-admin
   in `carmen-platform` controls, per business unit, which interfaces/brands appear.

### What a validation pass changed

The first cut wanted a fully backend-driven catalog, multi-brand-simultaneous, and
schema-delivered dynamic forms. Validation trimmed that because:

- **No sync engine consumes this config yet** (confirmed). A fully data-driven catalog now
  is plumbing for values nothing reads. Build the minimum that stores intent/credentials for
  the future engine; do not gold-plate.
- **No real customer runs >1 brand per category at once** (confirmed "not now, maybe
  later"). The data model must *allow* multi-brand cheaply, but we do not build the
  multi-instance sync machinery.
- The interfaces feature merged the same day. A 3-repo backend-driven rebuild on fresh code
  is high churn for unproven demand.

The one high-value ask that needs no engine is **#2 (license-gated visibility)** — it only
shows/hides UI. That, plus a cheap Category→Brand restructure, is Phase 1. Everything
expensive is deferred to Phase 2 (flagged at the end).

## Scope

**Phase 1 (this spec):**

- FE Category→Brand two-level model in the inventory app, still a **code registry** and
  **code forms** (no backend catalog, no schema renderer).
- One `tb_application_config` row per `(category, brand)` — naturally multi-brand-capable.
- License-gated visibility: platform sets per-BU entitlement; the gateway (`/api`) surfaces
  the effective enabled keys; the inventory app filters its list by them; the backend
  **enforces** entitlement on the config endpoints (licensing must not be cosmetic).

**Non-goals (Phase 2 — deferred):**

- Backend-driven catalog on `/api` (registry stays in code).
- Schema-delivered dynamic forms (`hybrid C` renderer) — code forms only for the brands we
  ship.
- Multi-brand-simultaneous **sync routing** and multi-instance (two Micros for two
  branches). The storage supports multiple configured brands; the engine that acts on them
  is out of scope.

## Repos touched

| Repo | Role | Backend |
|---|---|---|
| `carmen-inventory-frontend-react` | BU app — renders interface list/forms, reads entitlement | `/api` (carmen-turborepo-backend-v2) |
| `carmen-platform` | super-admin — sets per-BU interface entitlement (license) | source of truth = system side; see below |
| `carmen-turborepo-backend-v2` | gateway `/api` — app_config storage + surfaces effective entitlement + enforces it | — |

Decision #3: the inventory app reads everything through `/api` only — **no cross-backend
read from the BU app**. The platform-side license is the source of truth for entitlement,
but the gateway `/api` is what the BU app talks to, so the gateway exposes the *effective*
entitlement (proxied/aggregated from the license). The BU app never calls `/api-system`.

## Model — Category → Brand

Two levels. A category groups brands; a brand is what gets configured.

```
Accounting (category)  brands: carmen_gl · blueledgers · external
POS        (category)  brands: micros · infrasys · square
PMS        (category)  brands: opera · protel
```

- **One config row per `(category, brand)`**, keyed `interface_<category>_<brand>`
  (e.g. `interface_pos_micros`). This is the whole reason a BU can eventually configure two
  brands at once — two rows — at zero extra model cost.
- The current single-row keys (`interface_pos`, `interface_accounting`, `interface_pms`)
  are replaced by per-brand keys (migration below).
- The old `vendor` / `system` enum **field disappears** from the form body — brand identity
  now comes from the route, not a dropdown.

### Registry (still code, now two-level)

`routes/system-admin/interface/interface-registry.ts` grows a `brands` list per category and
a per-category form. The brand is passed to the form via route param.

```ts
export type BrandDef = {
  readonly key: string;          // "micros"
  readonly configKey: string;    // "interface_pos_micros"
};

export type InterfaceCategoryDef = {
  readonly key: string;          // route param: "pos"
  readonly icon: LucideIcon;
  readonly brands: readonly BrandDef[];
  readonly form: LazyExoticComponent<ComponentType>;  // one form per category, brand from param
};
```

Rejected: bespoke form per brand. Brands within a category share fields (endpoint, api_key,
sync…), so one category form parameterized by brand is the cheap correct choice. If a brand
ever needs a genuinely different form, that is the Phase-2 `hybrid C` override path.

## Visibility = license entitlement

### Source of truth (platform)

`carmen-platform` gains an **Interface Entitlement** control, per business unit. Reuse the
existing **Application api-catalog** pattern verbatim (`ApplicationEdit` grouped selector):

- a catalog of interface keys grouped by category,
- per-BU `allow_all` + a selected `interface_keys: string[]`,
- the same collapsible accordion selector + All/None + fallback grouping.

The catalog of interface keys is small and known — ship it as a constant on both sides (same
split rule as `moduleOf`), exactly like the Application catalog’s client-side fallback. No
new backend catalog generator in Phase 1.

### Delivery to the BU app (`/api`)

The gateway exposes the **effective** enabled keys for the current BU. Prefer extending an
endpoint the app already calls at boot over adding a new one:

```
GET /api/.../me  (or the BU-profile boot call)
  → { ..., enabled_interfaces: string[] }   // e.g. ["pos_micros", "accounting_carmen_gl"]
```

Grain: **per-brand keys** (`<category>_<brand>`), with a category-level `allow_all` on the
platform side expanding to all that category’s brand keys. Per-brand matches the Application
precedent and lets licensing gate a single brand.

### Enforcement (not cosmetic)

Because this is **license** gating, hiding the card is not enough — the config
GET/PUT for a non-entitled key must be refused server-side. In
`carmen-turborepo-backend-v2` app-config controller, gate `interface_*` keys against the
BU’s entitlement: a read or upsert for a key not in `enabled_interfaces` returns 403.
Non-interface keys are unaffected. (This is narrower than the general app-config role-guard
follow-up noted in the prior spec — it only scopes `interface_*`.)

### Default when entitlement is absent

Older gateway deploys will not return `enabled_interfaces`. **Fallback: show all** shipped
categories/brands (current behavior) and skip enforcement when the field is absent — so
nothing breaks before the gateway ships the field. Once present (even empty), it is
authoritative. Log the fallback once.

## Frontend Changes — inventory app

Files under `routes/system-admin/interface/`:

- `interface-registry.ts` — becomes two-level (`InterfaceCategoryDef` + `BrandDef`); add
  `brands` to each category; drop nothing else. `findInterface` gains a `findBrand(category,
  brand)` sibling.
- `interface-list.tsx` — group cards by category; render one card per **entitled** brand
  (filter by `enabled_interfaces`); keep the enabled/disabled badge (derived from the
  brand’s config row as today).
- `interface-detail.route.tsx` → route `/:category/:brand`; resolve category+brand in the
  registry, else inline `ErrorState` (same in-shell convention as today).
- `<category>-interface-form.tsx` (accounting/pos/pms) — remove the `vendor`/`system` enum
  field; take `brand` from `useParams`; use `configKey = interface_<category>_<brand>`.
  Everything else (zod schema minus the enum, `toFormValues`/`toApiValue`, layout) is
  unchanged.
- `use-interface-config.ts` — unchanged; called with the per-brand key.
- **new** `use-interface-entitlement.ts` — reads `enabled_interfaces` from the boot/me hook;
  returns a predicate `isEntitled(categoryKey, brandKey)`; absent → allow all.

Existing files:

- `routes/router.tsx` — the detail route param changes from `:key` to `:category/:brand`.
- `messages/{en,th}.json` — brand labels move under `systemAdmin.interface.<category>.brand.*`;
  drop the old `vendorOption.*` / `system` option blocks.

### TypeScript type change

```ts
// types (me / bu profile)
interface MeResponse {
  // ...existing
  enabled_interfaces?: string[];   // optional — absent on older gateways → show all
}
```

### UI behavior

- List shows only entitled brands, grouped by category. A category with zero entitled brands
  is hidden entirely.
- Opening a brand loads its own config row; save writes only that row (per-brand
  `doc_version`-free upsert, as today).
- De-licensing a brand: its card disappears on next boot; a direct URL to it renders the
  in-shell `ErrorState` (and the backend 403s the config call regardless).

## Frontend Changes — carmen-platform

- New per-BU **Interface Entitlement** section on `BusinessUnitEdit` (or a dedicated
  page/tab), copied from the `ApplicationEdit` grouped api-name selector:
  `allow_all` + grouped-by-category interface-key selector + All/None + filter box.
- `src/services/` — a service writing the BU’s `interface_keys` (+ `allow_all`) to the
  system backend, following the existing service shape.
- `src/types/index.ts` — `InterfaceCatalogGroup` + the BU entitlement fields (optional `?`).
- Interface-key catalog constant mirrored from the inventory registry (same keys), with the
  Application-style client-side grouping fallback.
- Route/nav gated by the existing permission/superAdmin model (new permission e.g.
  `interface_entitlement.update`, or reuse the license/BU permission).

## Backend Changes — carmen-turborepo-backend-v2

1. **Surface `enabled_interfaces`** on the BU boot/me response (effective per-BU entitlement,
   derived from the platform license). Optional field.
2. **Enforce** `interface_*` keys against `enabled_interfaces` in the app-config
   controller: GET/PUT of a non-entitled `interface_*` key → 403. Other keys unaffected.
3. **Secret paths** — extend `secretPathsByKey` so every `interface_*_*` brand key with an
   `api_key` masks/encrypts it. Since brand keys are dynamic, match by pattern
   (`/^interface_(pos|pms)_/`) or register each shipped brand key. The MASK-sentinel retain
   fix from the prior spec already covers them.
4. `defaultByKey` — `interface_<cat>_<brand>: { enabled: false }` for shipped brand keys
   (optional; the FE 404→isNew path still covers gaps).

Platform/system side (whichever service `carmen-platform` writes to): store the per-BU
`interface_keys` + `allow_all` on the license/BU entitlement, and feed the gateway’s
effective `enabled_interfaces`.

## Data migration

Current prod data is minimal (feature merged the same day). For any existing
`interface_<cat>` row whose value carries a `vendor`/`system`, copy it to
`interface_<cat>_<value>` and retire the old key. If a BU has no such row, nothing to do —
the per-brand keys start at `isNew`. A one-off backend script; no runtime dual-read needed
given the tiny dataset. Confirm row count before running; if non-trivial, add a temporary
dual-read fallback in `use-interface-config` (old key → new key) and drop it after migration.

## Security

- **Entitlement is enforced server-side** (backend change 2), not just UI-hidden — license
  integrity requires it. The FE filter is UX only.
- `api_key` per brand is encrypted at rest and masked on read via the extended
  `secretPathsByKey`; the MASK-sentinel retain guard prevents the destroy-on-save bug from
  the prior spec.
- The platform entitlement write is behind the platform permission/superAdmin guard.

## Error handling

| Case | Behavior |
|---|---|
| `:category/:brand` not in registry | inline `ErrorState` (in-shell, per current convention) |
| brand not entitled, direct URL | inline `ErrorState`; backend 403s the config call |
| config 404 (never configured) | `isNew: true` → defaults, no error |
| entitlement field absent (old gateway) | fallback: show all, skip enforcement, log once |
| 500 / 401 / 403 | `ErrorState` + retry |
| save error | `toast.error` from ApiError message |

## Testing

Inventory FE:

1. `interface-registry.test.ts` — two-level integrity: unique category keys, unique brand
   keys within a category, every `configKey === interface_<cat>_<brand>`, every category has
   a form.
2. `use-interface-entitlement.test.ts` — absent field → allow all; present → only listed
   keys entitled; empty array → nothing entitled.
3. `interface-list` — brands filtered by entitlement; category with zero entitled brands
   hidden; enabled badge derivation per brand row.
4. per-category form schema — `vendor`/`system` removed; `toFormValues`/`toApiValue`
   round-trip with the per-brand key.

Backend:

5. entitlement enforcement — GET/PUT of a non-entitled `interface_*` key → 403; entitled key
   passes; non-interface key unaffected.
6. secret paths — `api_key` on a brand key masks on read, encrypts on store; MASK-sentinel
   retain (regression incl. `report_email`).

carmen-platform:

7. entitlement selector — All/None, filter, `allow_all` hides the selector; save posts
   `interface_keys` (+ `allow_all`); fallback grouping when catalog groups absent (mirror
   `ApplicationEdit` tests).

## Definition of done (Phase 1)

- `bunx tsc --noEmit && bun test:run` clean in the inventory repo; platform repo tests pass.
- Interface list shows brands grouped by category, filtered by entitlement.
- A platform super-admin can set per-BU entitlement; changing it hides/shows brands in the
  BU app on next boot.
- Backend 403s config access to non-entitled `interface_*` keys.
- `api_key` never leaves the backend unmasked, never stored plaintext, never destroyed by a
  no-retype save.
- No sync behavior added (out of scope) — config storage + visibility only.

## Phase 2 — deferred (do not build until unblocked)

Gate: build only after **(a)** the sync/integration engine that consumes per-brand config
exists, and/or **(b)** a real customer needs >1 brand per category simultaneously.

- **Backend-driven catalog** on `/api` — categories/brands/visibility from an endpoint;
  registry stops being hardcoded. Adding a brand becomes backend-only.
- **Hybrid C schema forms** — backend delivers a field schema per brand; a generic renderer
  handles simple brands (no FE deploy), code forms override complex ones (mapping tables).
- **Multi-brand sync routing + multi-instance** — the engine that decides which configured
  brand posts what, and support for two instances of one brand (per-branch), with an
  instance id in the key.
