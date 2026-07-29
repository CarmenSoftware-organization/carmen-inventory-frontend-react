# Plan: Interface Brands + Platform Visibility (Phase 1)

**Spec**: `docs/superpowers/specs/2026-07-16-interface-brands-visibility-design.md`
**Epic**: none
**Created**: 2026-07-16
**Status**: draft

> Saved under `docs/superpowers/plans/` (this repo's convention), not `.planning/plans/`.

## Scope reminder

Phase 1 only: Category→Brand (code registry/forms) + license-gated visibility, config
storage + visibility only, **no sync behavior**. Phase 2 (backend catalog, schema forms,
multi-brand engine) is deferred — see the spec.

### Deliberate deviation from the spec

The spec names the platform/system license as the source of truth and the gateway as a
pass-through. To keep Phase 1 to **one backend**, this plan **stores entitlement on the
gateway** (`carmen-turborepo-backend-v2`), written through a platform-guarded admin
endpoint that `carmen-platform` calls over `/api`. Wiring it to the real system-side license
record is a follow-up. Everything else matches the spec. This keeps enforcement, surfacing,
and storage in the same service the BU app already talks to (decision #3: BU app stays on
`/api` only).

### Repos

| Repo | Stack | Role |
|---|---|---|
| `carmen-turborepo-backend-v2` | NestJS gateway (`/api`) | entitlement store + admin endpoints + profile surface + enforcement + secret paths + migration |
| `carmen-platform` | Vite React (`/api-system` + `/api`) | per-BU entitlement selector on BU edit |
| `carmen-inventory-frontend-react` | Vite React (`/api`) | Category→Brand list/forms + entitlement filter |

## Brands (concrete)

| Category | Brands | Config keys |
|---|---|---|
| `accounting` | `carmen_gl`, `blueledgers`, `external` | `interface_accounting_<brand>` |
| `pos` | `micros`, `infrasys`, `square` | `interface_pos_<brand>` |
| `pms` | `opera`, `protel` | `interface_pms_<brand>` |

Entitlement key = `<category>_<brand>` (e.g. `pos_micros`), no `interface_` prefix — matches
`enabled_interfaces: string[]` on the profile.

---

## Architecture

### Components

| Component | Repo | Type | Purpose |
|---|---|---|---|
| InterfaceEntitlement store + endpoints | gateway | Controller/Service | admin get/set per-BU entitlement (platform-guarded) |
| Profile `enabled_interfaces` | gateway | DTO/Service | surface effective entitlement on `/api/user/profile` |
| `interface_*` enforcement | gateway | Controller guard | 403 config access to non-entitled keys |
| Secret-path pattern match | gateway | Service | mask/encrypt `api_key` on dynamic brand keys |
| Migration script | gateway | one-off | `interface_<cat>` → `interface_<cat>_<vendor>` |
| `interfaceEntitlementService` | platform | Service | read/write entitlement via `/api` |
| `InterfaceEntitlementSection` | platform | Component | grouped selector on BU edit (mirrors `ApplicationEdit`) |
| interface-key catalog + grouping | platform | util/const | mirror `apiCatalog.ts` |
| Two-level registry | inventory | module | `InterfaceCategoryDef` + `BrandDef` |
| `use-interface-entitlement` | inventory | hook | `isEntitled(cat, brand)` from `useProfile()` |
| category forms (×3) | inventory | Component | brand from route, no vendor enum, per-brand key |

### File locations (new)

| File | Repo / dir | Purpose |
|---|---|---|
| `interface-entitlement.controller.ts` / `.service.ts` | gateway (system module) | admin get/set + derive for profile |
| migration script | gateway `scripts/` | key rename |
| `src/services/interfaceEntitlementService.ts` | platform | get/set entitlement |
| `src/pages/businessUnitEdit/sections/InterfaceEntitlementSection.tsx` | platform | selector |
| `src/utils/interfaceCatalog.ts` | platform | keys + `groupInterfaceKeys` |
| `hooks/use-interface-entitlement.ts` | inventory | entitlement predicate |

### Files changed (existing)

| File | Repo | Change | Why |
|---|---|---|---|
| user-profile service/DTO | gateway | add `enabled_interfaces` | delivery to BU app |
| `app-config.service.ts` | gateway | `secretPathsByKey` pattern match + `defaultByKey` brand keys + enforce | secrets + gating |
| `businessUnitEdit/types.ts` + `BusinessUnitEdit.tsx` | platform | entitlement fields + wire section | UI |
| `src/types/index.ts` | platform | `InterfaceCatalogGroup` (optional) | types |
| `interface-registry.ts` | inventory | two-level | brands |
| `interface-list.tsx` | inventory | group by category + entitlement filter | visibility |
| `interface-detail.route.tsx` + `routes/router.tsx` | inventory | route `:category/:brand` | brand routing |
| `accounting/pos/pms-interface-form.tsx` | inventory | drop enum, brand from param, per-brand key | brand config |
| `types/profile.ts` + `hooks/use-profile.ts` | inventory | expose `enabled_interfaces?` | entitlement source |
| `messages/{en,th}.json` | inventory | brand label blocks; drop `vendorOption`/`system` | i18n |

---

## Tasks

### Phase 1 — Gateway entitlement (`carmen-turborepo-backend-v2`) — foundation

| # | Task | Files |
|---|---|---|
| 1 | Entitlement store + platform-guarded `GET/PUT interface-entitlement?bu_code=` returning/accepting `{ allow_all, keys[] }` | entitlement controller + service |
| 2 | Add `enabled_interfaces: string[]` to `/api/user/profile` (expand `allow_all` to all brand keys; absent-safe) | profile service + DTO |
| 3 | Enforce `interface_*` in app-config controller: GET/PUT of a key whose `<cat>_<brand>` ∉ entitlement → 403; non-`interface_` keys untouched | app-config controller |
| 4 | `secretPathsByKey` match `interface_(pos|pms)_*` → `['api_key']`; `defaultByKey` for brand keys; verify MASK-retain covers them | `app-config.service.ts` |
| 5 | Migration: `interface_<cat>` row → `interface_<cat>_<vendor|system value>`; retire old key (confirm row count first) | migration script |

### Phase 2 — Platform selector (`carmen-platform`) — depends on Phase 1 (#1)

| # | Task | Files |
|---|---|---|
| 6 | `interfaceCatalog.ts` — interface-key constant grouped by category + `groupInterfaceKeys` fallback (mirror `apiCatalog.ts`) | `src/utils/interfaceCatalog.ts` |
| 7 | `interfaceEntitlementService.ts` — `get(buId)` / `save(buId, { allow_all, keys })` over `/api` | `src/services/interfaceEntitlementService.ts` |
| 8 | `InterfaceEntitlementSection.tsx` — grouped accordion selector (All/None, filter, `allow_all` hides selector), wired into `BusinessUnitEdit` | section + `BusinessUnitEdit.tsx` |
| 9 | Types + permission/nav gating (e.g. `interface_entitlement.update` or reuse BU permission) | `types/index.ts` + route/nav |

### Phase 3 — Inventory FE (`carmen-inventory-frontend-react`) — parallel-capable (fallback show-all)

| # | Task | Files |
|---|---|---|
| 10 | Registry two-level: `InterfaceCategoryDef` + `BrandDef` + `brands` per category + `findBrand` | `interface-registry.ts` |
| 11 | `types/profile.ts` add `enabled_interfaces?`; expose via `use-profile.ts`; new `use-interface-entitlement.ts` (`isEntitled`, absent → all) | 3 files |
| 12 | Route `:category/:brand`; `interface-detail.route.tsx` resolve category+brand, else inline `ErrorState` | route file + `router.tsx` |
| 13 | `interface-list.tsx` — group cards by category, filter brands by `isEntitled`, hide empty category, per-brand enabled badge | `interface-list.tsx` |
| 14 | Category forms — drop `vendor`/`system` enum, `brand` from `useParams`, key `interface_<cat>_<brand>` | accounting/pos/pms form (3 files) |
| 15 | i18n — brand label blocks under `systemAdmin.interface.<cat>.brand.*`; drop `vendorOption`/`system` | `messages/{en,th}.json` |

### Phase 4 — Tests

| # | Task | Files |
|---|---|---|
| 16 | Inventory: registry 2-level integrity; `use-interface-entitlement` (absent→all, list→subset, empty→none); list filter; form schema round-trip | test files |
| 17 | Gateway: enforcement 403; secret paths + MASK-retain regression (incl. `report_email`) | `app-config.service.spec.ts` (+ entitlement spec) |
| 18 | Platform: selector All/None, filter, `allow_all`, save payload, fallback grouping (mirror `ApplicationEdit` tests) | section test |

---

## Parallel vs sequential

| Parallel group | Tasks | Why |
|---|---|---|
| A (inventory restructure) | 10 → then 12,13,14 · 11 · 15 | independent of gateway (entitlement filter uses fallback until #2 lands) |
| B (gateway) | 1 → 2,3 · 4 · 5 | #2/#3 need #1's store; #4/#5 independent |

| Sequential | Depends on | Why |
|---|---|---|
| Phase 2 (6–9) | Phase 1 #1 | selector calls the entitlement endpoints |
| Task 13 filter (live) | Phase 1 #2 | consumes `enabled_interfaces` — **integration point** (works on fallback before then) |
| Tasks 12,13,14 | Task 10 | need the two-level registry shape |
| Task 3 (enforce) | Task 1 | reads the entitlement store |

Suggested PR split: **PR1 = Phase 1 (gateway)**, **PR2 = Phase 3+16 (inventory)**, **PR3 =
Phase 2+18 (platform)**. PR2 ships safely ahead of PR1 via the show-all fallback.

---

## Testing plan (traces to spec)

| Layer | Test | Spec ref |
|---|---|---|
| Data/registry | 2-level keys unique, `configKey` shape, form present | Model |
| Business/hook | entitlement predicate absent/subset/empty | Default when absent |
| Enforcement | 403 non-entitled `interface_*`, other keys pass | Enforcement |
| Secrets | mask on read, encrypt on store, MASK-retain (+`report_email` regression) | Security |
| UI (inventory) | brands filtered, empty category hidden, badge per brand | Frontend Changes |
| UI (platform) | All/None, filter, `allow_all`, save payload, fallback grouping | Frontend Changes — platform |
| Migration | old key → per-brand key | Data migration |

---

## Gate 2 checklist

**Architecture**
- [x] Follows existing patterns (Application api-catalog reuse; app_config storage; profile-derived BU context; in-shell `ErrorState`)
- [x] Layer discipline: BU app reads `/api` only; enforcement server-side; FE filter cosmetic
- [x] Files in correct dirs (sections/, hooks/, utils/, docs/superpowers/)

**Task breakdown**
- [x] All changed files listed; all new files located
- [x] Each task ≤ 3 files / one commit
- [x] Dependencies explicit; parallel vs sequential marked; integration point flagged

**Testing**
- [x] Data/registry, business/hook, enforcement, secrets, UI (both), migration covered
- [x] Edge cases from spec (absent entitlement, non-retype save, direct URL to de-licensed brand) in the plan

**Gate 2: passed.**

## Open items (confirm during build)

- Gateway must expose the entitlement admin endpoints under a **platform/super-admin guard**,
  not the open app-config endpoint (self-grant risk).
- `default_invoice_value` type still open from the prior spec (does not block this phase).
- Real system-side **license** wiring is a follow-up; Phase 1 stores entitlement gateway-side.
