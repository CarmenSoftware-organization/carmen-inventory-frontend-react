# Split operational config into a "Default Setting" page & rename "Business Setting" → "Company Profile"

**Date:** 2026-07-10
**Status:** Approved — ready for implementation plan

## Problem

`/system-admin/business-setting` is a single form that mixes two concerns:

1. **Business-unit identity & formatting** — General, Hotel, Company, Branding,
   Date & Time, Number Formats (top-level BU fields).
2. **Operational config** — the frontend-seeded PR / SI / PO toggles & dropdowns
   that live in the BU's `config` array (rendered from `CONFIG_SECTIONS`).

We want to separate these: move the operational config to a new dedicated page
**"Default Setting"**, and rename the remaining identity/formatting page to
**"Company Profile"**.

## Goals

- New page **Default Setting** at `/system-admin/default-setting`, placed
  immediately after Company Profile in the system-admin menu, rendering only the
  PR / SI / PO operational config.
- Rename the existing page **Business Setting → Company Profile**, including its
  route **path**, **folder**, and **files** — not just the display label.
- No change to persistence behavior: both pages read/write the **same BU record**
  via `useBusinessUnit` / `useUpdateBusinessUnit` and `PATCH /api/business-units`.
  Optimistic locking (`doc_version`) is unchanged.

## Non-goals

- No backend changes. Config remains frontend-seeded in the registry and persists
  in the BU `config` array exactly as today.
- No new abstraction/hoist of shared form machinery into `system-admin/shared/`
  (considered and rejected — see Alternatives). The one-directional import from
  `default-setting` → `company-profile` is accepted.
- No behavioral change to any config value; this is a UI reorganization + rename.

## Design

### File layout

Rename the existing folder and split out the config registry:

```
routes/system-admin/
  company-profile/                       ← renamed from business-setting/
    company-profile.route.tsx            ← renamed
    company-profile-component.tsx        ← renamed; remove the config-sections block
    company-profile-ui.tsx               ← renamed; keep ALL field components incl. ConfigField
    company-profile-options.ts           ← renamed
    company-profile-form-schema.ts       ← renamed; helpers unchanged
    company-profile-ui.test.tsx          ← renamed; drop config-section assertions
    company-profile-form-schema.test.ts  ← renamed
  default-setting/                        ← new
    default-setting.route.tsx
    default-setting-component.tsx
    default-setting-config-registry.ts       ← moved from business-setting-config-registry.ts
    default-setting-config-registry.test.ts  ← moved & renamed
```

**Dependency direction:** `default-setting-component.tsx` imports:
- `ConfigField` from `../company-profile/company-profile-ui`
- `createBusinessSettingSchema`, `toFormValues`, `buildPatch`, `mergeSeededConfig`,
  `normalizeConfig`, `BusinessSettingFormValues` from
  `../company-profile/company-profile-form-schema`
- `useBusinessUnit`, `useUpdateBusinessUnit` from `@/hooks/use-business-unit` (global)
- `groupConfigForRender`, `resolveConfigOptions`, registry types from its own
  `./default-setting-config-registry`

The config registry moves into `default-setting/` because, after the split,
`company-profile` no longer renders config (so it no longer needs the registry).
`company-profile-form-schema.ts`'s `mergeSeededConfig`/`normalizeConfig` continue
to round-trip the `config` array in the shared form values harmlessly (the
company-profile page keeps `config` in its form state but never renders or dirties
it, so it is never patched from that page).

### New component: `default-setting-component.tsx`

Same skeleton as the current business-setting component, trimmed to config only:

- `useForm` with `createBusinessSettingSchema` + `values: toFormValues(data)`.
  The form still holds the whole BU; only config fields are rendered, so
  `buildPatch(values, toFormValues(data))` yields **only** changed `config` items.
- `editing` state, Edit / Save / Cancel buttons, `useDiscardConfirm`,
  `useNavigationGuard`, `DiscardDialog` — identical wiring to company-profile.
- Body renders:
  `groupConfigForRender(mergeSeededConfig(normalizeConfig(data.config))).sections`
  → `<SettingSection>` per section → `<ConfigField>` per entry (the exact block
  currently at `business-setting-component.tsx` lines ~681–710).
- `onSubmit`: same as today — build patch, no-op if empty, otherwise
  `update.mutate({ ...patch, doc_version: data.doc_version })` with success/error
  toasts. Page header title/description use the new `defaultSetting` namespace.
- Loading skeleton: a small `SettingSectionSkeleton` sized to the config sections
  (e.g. three single-field sections) rather than the full BU skeleton.

`company-profile-component.tsx` deletes the config-sections block (and the already
commented-out "Configuration"/`other` block) plus the now-unused registry imports
(`groupConfigForRender`, `resolveConfigOptions`) and the `configGroups` computation.

### Routing (`routes/router.tsx`)

Under the `system-admin` section children:

- Replace
  `{ path: "business-setting", lazy: () => import("./system-admin/business-setting/business-setting.route") }`
  with
  `{ path: "company-profile", lazy: () => import("./system-admin/company-profile/company-profile.route") }`.
- Add
  `{ path: "default-setting", lazy: () => import("./system-admin/default-setting/default-setting.route") }`
  immediately after it.
- Add a redirect so existing bookmarks don't 404:
  `{ path: "business-setting", element: <Navigate to="/system-admin/company-profile" replace /> }`
  (import `Navigate` from `react-router`).

### Menu (`constant/module-list.ts`)

- Change the `businessSetting` sub-module to `name: "companyProfile"`,
  `path: "/system-admin/company-profile"` (keep the `Briefcase` icon and
  `PERMISSIONS.system_configuration.view`).
- Add a new sub-module immediately after it:
  `{ name: "defaultSetting", path: "/system-admin/default-setting",
  icon: SlidersHorizontal, permission: PERMISSIONS.system_configuration.view }`
  (import `SlidersHorizontal` from `lucide-react`).

### i18n (`messages/en.json` + `messages/th.json`)

- Rename the top-level namespace `businessSetting` → `companyProfile`. Remove from
  it the config-only keys: `sections.pr`, `sections.prDesc`, `sections.si`,
  `sections.siDesc`, `sections.po`, `sections.poDesc`, `sections.config`,
  `sections.configDesc`, `configEmpty`, and the whole `config` object.
- Add a new top-level namespace `defaultSetting` containing:
  - `pageDescription` (new copy describing operational defaults),
  - action strings copied from the old namespace: `edit`, `save`, `cancel`,
    `saved`, `saveError`, `loadError`, `yes`, `no`,
  - `sections`: `pr`, `prDesc`, `si`, `siDesc`, `po`, `poDesc`,
  - `config`: `prAllowDuplicateProduct`, `siCostFrom`, `siCostFromOptions`,
    `poGroupByPrComment` (moved verbatim).
- In the `modules` namespace: rename key `businessSetting` → `companyProfile`
  with value **"Company Profile" / "ข้อมูลบริษัท"**, and add
  `defaultSetting` = **"Default Setting" / "ค่าเริ่มต้น"**.
- Update component `useTranslations("businessSetting")` → `"companyProfile"` and
  `tm("businessSetting")` → `tm("companyProfile")` in company-profile; the new
  component uses `useTranslations("defaultSetting")`.

### Skill + memory updates

- `.claude/skills/add-business-setting-config/SKILL.md`: update the file table and
  page references to point at
  `routes/system-admin/default-setting/default-setting-config-registry.ts`, the
  `defaultSetting.sections.*` / `defaultSetting.config.*` i18n keys, and the page
  `/system-admin/default-setting`. (Skill folder name kept as-is.)
- Memory `business-setting-config-registry.md`: update the registry location and
  the page it renders on.

### Tests

- Move `business-setting-config-registry.test.ts` →
  `default-setting-config-registry.test.ts`, update the import path.
- `company-profile-ui.test.tsx`: drop any assertions about PR/SI/PO config
  sections (they no longer render on that page).
- Add a smoke test for `default-setting-component`: renders the PR/SI/PO config
  fields and, on save, patches **only** the `config` field (assert the mutation
  payload has no identity/format keys).
- `bunx tsc --noEmit && bun run lint && bun test:run` must be clean.

## Alternatives considered

- **Hoist shared schema + `ConfigField` into `system-admin/shared/`** so neither
  page imports the other. Cleaner boundaries, but `company-profile-form-schema.ts`
  is intertwined with the whole-BU form and can't cleanly be reduced to a
  config-only slice; the churn (move + re-test three shared files) outweighs the
  benefit for a one-directional, small import. Rejected per YAGNI; can be done
  later if a third consumer appears.
- **Config-only form schema** on the new page (a `z.object({ config: ... })`
  slice) instead of reusing the whole-BU schema. Avoids carrying unused fields,
  but duplicates `buildPatch`/`toFormValues` logic that is already tested.
  Rejected — reusing the whole form is simpler and provably patches only `config`.
- **Label-only rename** (keep `/system-admin/business-setting`). Explicitly
  rejected by the user in favor of renaming path + folder.

## Risks

- Renaming the route path breaks existing links; mitigated by the
  `business-setting → company-profile` redirect route.
- The `default-setting → company-profile` import is a mild cross-feature coupling;
  accepted and documented above.
- i18n split must keep every field/section key resolvable; the fields (109 keys)
  stay entirely in `companyProfile`, so only the ~10 config/section keys move.
