# Default Setting Page Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the operational config (PR/SI/PO) out of `/system-admin/business-setting` into a new `/system-admin/default-setting` page, and rename the existing page to Company Profile (path + folder + files + label).

**Architecture:** Both pages read/write the **same** business-unit record via `useBusinessUnit`/`useUpdateBusinessUnit` and `PATCH /api/business-units`. Task 1 is a pure rename (`business-setting` → `company-profile`, incl. the i18n namespace). Task 2 extracts the config section into a thin new `default-setting` page that imports the shared schema/UI/registry from `company-profile` (one-directional dependency). Task 3 updates the config skill + memory docs.

**Tech Stack:** Vite + React 19, React Router 7 data router, react-hook-form + zod, TanStack Query, `use-intl` i18n (messages in `messages/{en,th}.json`), Vitest, Tailwind 4. Package manager: `bun`.

## Global Constraints

- Communicate with the user in **Thai**; code / commit messages / PR text in English.
- Follow the **colocated route** convention: `routes/<module>/<feature>/<feature>.route.tsx` exporting `Component`, components/hooks/tests flat beside it. Import from `react-router` and `use-intl` directly (ESLint blocks `next*` imports).
- Config is **frontend-seeded** in the registry and persists in the BU `config` array — **no backend changes**.
- The config registry file **stays in `company-profile/`** (its `SEEDED_ITEMS` is consumed by `company-profile-form-schema.ts`); `default-setting` imports it. Keep the dependency strictly `default-setting → company-profile`.
- Every registry `titleKey`/`descKey`/`labelKey` is **relative** (e.g. `"sections.pr"`, `"config.prAllowDuplicateProduct"`) and must resolve under the `defaultSetting` namespace after Task 2 — do not add a namespace prefix to registry values.
- `bunx tsc --noEmit && bun run lint && bun test:run` must be clean after every task (baseline: **403 tests passing**).
- Commit after each task. Branch is `feat/default-setting-page-split` (already created).

---

### Task 1: Rename `business-setting/` → `company-profile/` (folder, files, i18n namespace, label, route/menu path)

Pure rename. After this task the page still shows everything (including config) but lives at `/system-admin/company-profile` and is labeled **Company Profile**. Old URL redirects.

**Files:**
- Rename (git mv), then edit internal imports:
  - `routes/system-admin/business-setting/business-setting.route.tsx` → `routes/system-admin/company-profile/company-profile.route.tsx`
  - `…/business-setting-component.tsx` → `…/company-profile/company-profile-component.tsx`
  - `…/business-setting-ui.tsx` → `…/company-profile/company-profile-ui.tsx`
  - `…/business-setting-options.ts` → `…/company-profile/company-profile-options.ts`
  - `…/business-setting-form-schema.ts` → `…/company-profile/company-profile-form-schema.ts`
  - `…/business-setting-config-registry.ts` → `…/company-profile/company-profile-config-registry.ts`
  - `…/business-setting-ui.test.tsx` → `…/company-profile/company-profile-ui.test.tsx`
  - `…/business-setting-form-schema.test.ts` → `…/company-profile/company-profile-form-schema.test.ts`
  - `…/business-setting-config-registry.test.ts` → `…/company-profile/company-profile-config-registry.test.ts`
- Modify: `routes/router.tsx:205`
- Modify: `constant/module-list.ts:426-427`
- Modify: `messages/en.json` (top-level `businessSetting` key + `modules.businessSetting`)
- Modify: `messages/th.json` (same two keys)

**Interfaces:**
- Produces (folder `company-profile/`): `company-profile-form-schema.ts` exports `createBusinessSettingSchema(tv, tf)`, `toFormValues(data)`, `buildPatch(values, original)`, `mergeSeededConfig(items)`, `normalizeConfig(config)`, type `BusinessSettingFormValues`. `company-profile-ui.tsx` exports `SettingField`, `EditableField`, `SelectField`, `NumberFormatField`, `ConfigField`. `company-profile-config-registry.ts` exports `CONFIG_SECTIONS`, `SEEDED_ITEMS`, `SEEDED_KEYS`, `groupConfigForRender(items)`, `resolveConfigOptions(options, calcMethod, currentValue)`. `company-profile.route.tsx` exports `Component`.
- i18n namespace `businessSetting` → renamed to `companyProfile`; module label key `modules.businessSetting` → `modules.companyProfile`.

- [ ] **Step 1: Rename the folder and files with git**

```bash
cd routes/system-admin
git mv business-setting company-profile
cd company-profile
git mv business-setting.route.tsx            company-profile.route.tsx
git mv business-setting-component.tsx        company-profile-component.tsx
git mv business-setting-ui.tsx               company-profile-ui.tsx
git mv business-setting-options.ts           company-profile-options.ts
git mv business-setting-form-schema.ts       company-profile-form-schema.ts
git mv business-setting-config-registry.ts   company-profile-config-registry.ts
git mv business-setting-ui.test.tsx          company-profile-ui.test.tsx
git mv business-setting-form-schema.test.ts  company-profile-form-schema.test.ts
git mv business-setting-config-registry.test.ts company-profile-config-registry.test.ts
cd ../../..
```

- [ ] **Step 2: Fix internal import specifiers in the renamed files**

Update every `./business-setting-*` relative import to `./company-profile-*`:

- `company-profile/company-profile.route.tsx`: `import BusinessSettingComponent from "./business-setting-component";` → `from "./company-profile-component";`
- `company-profile/company-profile-component.tsx` import block:
  - `from "./business-setting-ui"` → `from "./company-profile-ui"`
  - `from "./business-setting-options"` → `from "./company-profile-options"`
  - `from "./business-setting-form-schema"` → `from "./company-profile-form-schema"`
  - `from "./business-setting-config-registry"` → `from "./company-profile-config-registry"`
- `company-profile/company-profile-ui.tsx`: `from "./business-setting-form-schema"` → `from "./company-profile-form-schema"`
- `company-profile/company-profile-form-schema.ts`: `from "./business-setting-config-registry"` → `from "./company-profile-config-registry"`
- `company-profile/company-profile-ui.test.tsx`: `from "./business-setting-ui"` → `from "./company-profile-ui"`; `from "./business-setting-form-schema"` → `from "./company-profile-form-schema"`
- `company-profile/company-profile-form-schema.test.ts`: `from "./business-setting-form-schema"` → `from "./company-profile-form-schema"`
- `company-profile/company-profile-config-registry.test.ts`: `from "./business-setting-config-registry"` → `from "./company-profile-config-registry"`; `from "./business-setting-form-schema"` → `from "./company-profile-form-schema"`

Quick way to catch them all:

```bash
grep -rn "business-setting" routes/system-admin/company-profile/
```

Expected after edits: **no matches** except possibly none. Fix any remaining.

- [ ] **Step 3: Point the i18n namespace usages in the component at `companyProfile`**

In `routes/system-admin/company-profile/company-profile-component.tsx`, change the four namespace references:

```tsx
const t = useTranslations("companyProfile");            // was "businessSetting"
const tf = useTranslations("companyProfile.fields");    // was "businessSetting.fields"
```
```tsx
{tm("companyProfile")}                                  // was tm("businessSetting"), inside <h1>
```
And in the `BrandImage` helper at the bottom of the same file:
```tsx
const t = useTranslations("companyProfile");            // was "businessSetting"
```
(`tm` stays `useTranslations("modules")`; `tv` stays `useTranslations("validation")`.)

- [ ] **Step 4: Rename the i18n namespace key in both message files**

In `messages/en.json`, rename the top-level key (line 2):
```json
  "businessSetting": {
```
→
```json
  "companyProfile": {
```
And the module label under `modules` (currently `"businessSetting": "Business Setting"`):
```json
    "companyProfile": "Company Profile",
```
Do the identical two edits in `messages/th.json`: top-level `"businessSetting": {` → `"companyProfile": {`, and `modules` label `"ตั้งค่าธุรกิจ"` → key `"companyProfile": "ข้อมูลบริษัท"`.

Verify each file still parses:
```bash
node -e "require('./messages/en.json');require('./messages/th.json');console.log('json ok')"
```
Expected: `json ok`

- [ ] **Step 5: Update the router path, lazy import, and add a redirect**

In `routes/router.tsx`, replace the business-setting child (line ~205) and add a redirect. `Navigate` is already imported at the top.

```tsx
{ path: "company-profile", lazy: () => import("./system-admin/company-profile/company-profile.route") },
{ path: "business-setting", element: <Navigate to="/system-admin/company-profile" replace /> },
```

- [ ] **Step 6: Update the sidebar menu entry**

In `constant/module-list.ts`, the `systemAdmin` sub-module currently at lines ~425-430:
```ts
      {
        name: "businessSetting",
        path: "/system-admin/business-setting",
        icon: Briefcase,
        permission: PERMISSIONS.system_configuration.view,
      },
```
Change `name` and `path` (keep the `Briefcase` icon):
```ts
      {
        name: "companyProfile",
        path: "/system-admin/company-profile",
        icon: Briefcase,
        permission: PERMISSIONS.system_configuration.view,
      },
```

- [ ] **Step 7: Typecheck, lint, and run the full test suite**

```bash
bunx tsc --noEmit && bun run lint && bun test:run
```
Expected: tsc clean, lint clean, **403 tests passing**. (The renamed test files still assert the same behavior.)

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: rename business-setting page to company-profile (folder, route, i18n namespace, label)"
```

---

### Task 2: Extract config into a new `default-setting/` page + `defaultSetting` i18n namespace + menu entry

After this task, `/system-admin/company-profile` shows only identity/formatting; the PR/SI/PO config lives at `/system-admin/default-setting`.

**Files:**
- Create: `routes/system-admin/default-setting/default-setting.route.tsx`
- Create: `routes/system-admin/default-setting/default-setting-component.tsx`
- Modify: `routes/system-admin/company-profile/company-profile-component.tsx` (remove the config block + now-unused imports)
- Modify: `routes/router.tsx` (add the `default-setting` child route)
- Modify: `constant/module-list.ts` (add the `defaultSetting` sub-module after `companyProfile`)
- Modify: `messages/en.json` and `messages/th.json` (add `defaultSetting` namespace + `modules.defaultSetting`; remove the config-only keys from `companyProfile`)

**Interfaces:**
- Consumes from Task 1: `ConfigField` (company-profile-ui); `createBusinessSettingSchema`, `toFormValues`, `buildPatch`, `mergeSeededConfig`, `normalizeConfig`, `BusinessSettingFormValues` (company-profile-form-schema); `groupConfigForRender`, `resolveConfigOptions` (company-profile-config-registry); `useBusinessUnit`, `useUpdateBusinessUnit` (`@/hooks/use-business-unit`); `SettingSection`, `SettingSectionSkeleton` (`@/components/ui/setting-section`).
- Produces: `default-setting.route.tsx` exports `Component`; new i18n namespace `defaultSetting` (with `sections.{pr,si,po,*Desc}`, `config.*`, action strings) and `modules.defaultSetting`.

- [ ] **Step 1: Add the `defaultSetting` i18n namespace and `modules.defaultSetting` (both files)**

In `messages/en.json`, add a new top-level namespace (place it right after the `companyProfile` block for readability):
```json
  "defaultSetting": {
    "pageDescription": "Operational default settings for the current business unit.",
    "loadError": "Failed to load business unit settings.",
    "edit": "Edit",
    "save": "Save",
    "cancel": "Cancel",
    "saved": "Business unit updated",
    "saveError": "Failed to save changes",
    "yes": "Yes",
    "no": "No",
    "sections": {
      "pr": "PR",
      "prDesc": "Purchase Request settings for this business unit.",
      "si": "SI",
      "siDesc": "Stock In settings for this business unit.",
      "po": "PO",
      "poDesc": "Purchase Order settings for this business unit."
    },
    "config": {
      "prAllowDuplicateProduct": "Allow selecting duplicate products",
      "siCostFrom": "Default price for added items",
      "siCostFromOptions": {
        "average": "Average",
        "lastReceiving": "Last receiving",
        "lastCost": "Last cost"
      },
      "poGroupByPrComment": "Group by PR comment"
    }
  },
```
And under `modules`, add:
```json
    "defaultSetting": "Default Setting",
```

In `messages/th.json`, add the mirror namespace:
```json
  "defaultSetting": {
    "pageDescription": "การตั้งค่าเริ่มต้นการทำงานของหน่วยธุรกิจปัจจุบัน",
    "loadError": "โหลดการตั้งค่าหน่วยธุรกิจไม่สำเร็จ",
    "edit": "แก้ไข",
    "save": "บันทึก",
    "cancel": "ยกเลิก",
    "saved": "อัปเดตหน่วยธุรกิจแล้ว",
    "saveError": "บันทึกการเปลี่ยนแปลงไม่สำเร็จ",
    "yes": "ใช่",
    "no": "ไม่",
    "sections": {
      "pr": "PR",
      "prDesc": "การตั้งค่า Purchase Request ของหน่วยธุรกิจนี้",
      "si": "SI",
      "siDesc": "การตั้งค่า Stock In ของหน่วยธุรกิจนี้",
      "po": "PO",
      "poDesc": "การตั้งค่า Purchase Order ของหน่วยธุรกิจนี้"
    },
    "config": {
      "prAllowDuplicateProduct": "อนุญาตให้เลือก product ซ้ำกันได้",
      "siCostFrom": "ราคาเริ่มต้นสำหรับสินค้าที่เพิ่มเข้าไป",
      "siCostFromOptions": {
        "average": "เฉลี่ย",
        "lastReceiving": "รับล่าสุด",
        "lastCost": "ต้นทุนล่าสุด"
      },
      "poGroupByPrComment": "เพิ่มการจัดกลุ่มตาม pr comment"
    }
  },
```
And under `modules`:
```json
    "defaultSetting": "ค่าเริ่มต้น",
```

- [ ] **Step 2: Remove the config-only keys from the `companyProfile` namespace (both files)**

In **both** `messages/en.json` and `messages/th.json`, inside the `companyProfile` namespace:
- Delete from `companyProfile.sections`: `config`, `configDesc`, `pr`, `prDesc`, `si`, `siDesc`, `po`, `poDesc` (keep `general`…`numberFormats`).
- Delete the top-level `companyProfile.configEmpty` key.
- Delete the entire `companyProfile.config` object.

Verify both files still parse and the keys are gone:
```bash
node -e "const en=require('./messages/en.json'),th=require('./messages/th.json');
for(const m of [['en',en],['th',th]]){const b=m[1].companyProfile;
if(b.config||b.configEmpty||b.sections.pr||b.sections.config) throw new Error(m[0]+': stray config key');
if(!m[1].defaultSetting.config.poGroupByPrComment) throw new Error(m[0]+': defaultSetting missing');
if(!m[1].modules.defaultSetting||!m[1].modules.companyProfile) throw new Error(m[0]+': modules label missing');}
console.log('i18n split ok');"
```
Expected: `i18n split ok`

- [ ] **Step 3: Create the new page component**

Create `routes/system-admin/default-setting/default-setting-component.tsx`:

```tsx
import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { useProfile } from "@/hooks/use-profile";
import { useDiscardConfirm } from "@/hooks/use-discard-confirm";
import { useNavigationGuard } from "@/hooks/use-navigation-guard";
import {
  useBusinessUnit,
  useUpdateBusinessUnit,
} from "@/hooks/use-business-unit";
import {
  SettingSection,
  SettingSectionSkeleton,
} from "@/components/ui/setting-section";
import { ConfigField } from "../company-profile/company-profile-ui";
import {
  createBusinessSettingSchema,
  toFormValues,
  buildPatch,
  normalizeConfig,
  mergeSeededConfig,
  type BusinessSettingFormValues,
} from "../company-profile/company-profile-form-schema";
import {
  groupConfigForRender,
  resolveConfigOptions,
} from "../company-profile/company-profile-config-registry";

/**
 * หน้า Default Setting (system-admin) — แสดง/แก้ไข operational config (PR/SI/PO)
 * ของ business unit ปัจจุบัน (จาก `useProfile().defaultBu`)
 *
 * config เก็บใน BU record เดียวกับหน้า Company Profile (field `config`) — save
 * ยิง `PATCH api/business-units` เฉพาะ field ที่เปลี่ยน (หน้านี้แก้แค่ config)
 * โหมด view = read-only, กด Edit → field กลายเป็น input (toggle ในหน้าเดียว)
 *
 * @returns React element ของหน้า default setting
 */
export default function DefaultSettingComponent() {
  const tm = useTranslations("modules");
  const t = useTranslations("defaultSetting");
  const tv = useTranslations("validation");
  const tf = useTranslations("companyProfile.fields");
  const { defaultBu, isProfileReady } = useProfile();
  const buId = defaultBu?.id;
  const { data, isLoading, isError, refetch } = useBusinessUnit(buId);
  const update = useUpdateBusinessUnit(buId);
  const [editing, setEditing] = useState(false);

  const form = useForm<BusinessSettingFormValues>({
    resolver: zodResolver(
      createBusinessSettingSchema(tv, tf),
    ) as Resolver<BusinessSettingFormValues>,
    values: data ? toFormValues(data) : undefined,
  });

  const configGroups = data
    ? groupConfigForRender(mergeSeededConfig(normalizeConfig(data.config)))
    : { sections: [], other: [] };
  const isBusy = !isProfileReady || isLoading;

  // มีการแก้ค้าง (dirty) ระหว่างโหมด edit → กัน discard โดยไม่ได้ตั้งใจ
  const hasUnsaved = editing && form.formState.isDirty;
  const discard = useDiscardConfirm({
    isDirty: hasUnsaved,
    isPending: update.isPending,
  });
  const navGuard = useNavigationGuard(hasUnsaved);

  const exitEdit = () => {
    if (data) form.reset(toFormValues(data));
    setEditing(false);
  };
  const handleEdit = () => {
    if (data) form.reset(toFormValues(data));
    setEditing(true);
  };
  const handleCancel = () => discard.confirm(exitEdit);

  const onSubmit = form.handleSubmit((values) => {
    if (!data) return;
    const patch = buildPatch(values, toFormValues(data));
    if (Object.keys(patch).length === 0) {
      setEditing(false);
      return;
    }
    // แนบ doc_version (optimistic lock) กัน 409 version ค้าง
    update.mutate(
      { ...patch, doc_version: data.doc_version },
      {
        onSuccess: () => {
          toast.success(t("saved"));
          setEditing(false);
        },
        onError: (e) => toast.error(e.message || t("saveError")),
      },
    );
  });

  return (
    <div className="mx-auto max-w-4xl p-[max(1rem,env(safe-area-inset-bottom))]">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            {tm("defaultSetting")}
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {t("pageDescription")}
          </p>
        </div>
        {!isError && !isBusy && data && (
          <div className="flex shrink-0 items-center gap-2">
            {editing ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={update.isPending}
                >
                  <X className="size-3.5" aria-hidden="true" />
                  {t("cancel")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={onSubmit}
                  disabled={update.isPending}
                >
                  {update.isPending ? (
                    <Loader2
                      className="size-3.5 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Save className="size-3.5" aria-hidden="true" />
                  )}
                  {t("save")}
                </Button>
              </>
            ) : (
              <Button type="button" size="sm" onClick={handleEdit}>
                <Pencil className="size-3.5" aria-hidden="true" />
                {t("edit")}
              </Button>
            )}
          </div>
        )}
      </header>

      {isError && (
        <ErrorState message={t("loadError")} onRetry={() => refetch()} />
      )}

      {!isError && isBusy && (
        <div>
          <SettingSectionSkeleton first fields={["half"]} />
          <SettingSectionSkeleton fields={["half"]} />
          <SettingSectionSkeleton fields={["half"]} />
        </div>
      )}

      {!isError && !isBusy && data && (
        <form onSubmit={onSubmit}>
          {configGroups.sections.map((section, i) => (
            <SettingSection
              key={section.id}
              first={i === 0}
              title={t(section.titleKey)}
              description={t(section.descKey)}
            >
              {section.entries.map((entry) => {
                const options = entry.options
                  ? resolveConfigOptions(
                      entry.options,
                      data.calculation_method,
                      entry.item.value,
                    ).map((o) => ({ value: o.value, label: t(o.labelKey) }))
                  : undefined;
                return (
                  <ConfigField
                    key={entry.item.key}
                    editing={editing}
                    form={form}
                    index={entry.index}
                    item={entry.item}
                    label={t(entry.labelKey)}
                    yesLabel={t("yes")}
                    noLabel={t("no")}
                    options={options}
                  />
                );
              })}
            </SettingSection>
          ))}
        </form>
      )}

      {/* Cancel ตอนมีการแก้ค้าง */}
      <DiscardDialog {...discard.dialogProps} variant="warning" />
      {/* นำทางออก/กด back ระหว่างแก้ค้าง */}
      <DiscardDialog
        open={navGuard.isOpen}
        onOpenChange={(o) => {
          if (!o) navGuard.cancel();
        }}
        onConfirm={navGuard.confirm}
        onCancel={navGuard.cancel}
        variant="warning"
      />
    </div>
  );
}
```

- [ ] **Step 4: Create the route file**

Create `routes/system-admin/default-setting/default-setting.route.tsx`:

```tsx
import DefaultSettingComponent from "./default-setting-component";

export function Component() {
  return <DefaultSettingComponent />;
}
```

- [ ] **Step 5: Remove the config block and now-unused imports from `company-profile-component.tsx`**

In `routes/system-admin/company-profile/company-profile-component.tsx`:

(a) Delete the registry import block:
```tsx
import {
  groupConfigForRender,
  resolveConfigOptions,
} from "./company-profile-config-registry";
```

(b) Trim the form-schema import to drop the now-unused `normalizeConfig` and `mergeSeededConfig`:
```tsx
import {
  createBusinessSettingSchema,
  toFormValues,
  buildPatch,
  type BusinessSettingFormValues,
} from "./company-profile-form-schema";
```

(c) Delete the `configGroups` computation:
```tsx
  const configGroups = data
    ? groupConfigForRender(mergeSeededConfig(normalizeConfig(data.config)))
    : { sections: [], other: [] };
```

(d) Delete the entire config-render JSX block — the `{configGroups.sections.map(...)}` registry sections **and** the commented-out `{/* Configuration … */}` block that follows it (everything from the `{/* Registry sections (เช่น PR) … */}` comment down to just before the closing `</form>`).

- [ ] **Step 6: Register the new route**

In `routes/router.tsx`, add the `default-setting` child immediately after the `company-profile` route (and before/after the redirect line):
```tsx
{ path: "default-setting", lazy: () => import("./system-admin/default-setting/default-setting.route") },
```

- [ ] **Step 7: Add the sidebar menu entry**

In `constant/module-list.ts`, insert a new sub-module **immediately after** the `companyProfile` entry. `SlidersHorizontal` is already imported.
```ts
      {
        name: "defaultSetting",
        path: "/system-admin/default-setting",
        icon: SlidersHorizontal,
        permission: PERMISSIONS.system_configuration.view,
      },
```

- [ ] **Step 8: Typecheck, lint, and run the full test suite**

```bash
bunx tsc --noEmit && bun run lint && bun test:run
```
Expected: tsc clean (no unused-import errors in `company-profile-component.tsx`), lint clean, **403 tests passing**.

- [ ] **Step 9: Manual smoke check (optional but recommended)**

```bash
VITE_DEV_PROXY_TARGET=http://localhost:4000 bun dev
```
Log in, then verify:
- `/system-admin/company-profile` renders General/Hotel/Company/Branding/Date & Time/Number Formats and **no** PR/SI/PO section. Menu label reads "Company Profile" / "ข้อมูลบริษัท".
- `/system-admin/default-setting` renders the PR/SI/PO config; Edit → toggle a switch → Save shows the success toast. Menu label reads "Default Setting" / "ค่าเริ่มต้น".
- Visiting the old `/system-admin/business-setting` redirects to `/system-admin/company-profile`.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add default-setting page for PR/SI/PO operational config"
```

---

### Task 3: Update the `add-business-setting-config` skill + memory docs

The config registry moved folders and now renders on a different page; the skill and memory that document "how to add a config option" must point at the new locations.

**Files:**
- Modify: `.claude/skills/add-business-setting-config/SKILL.md`
- Modify: `/Users/samutpra/.claude/projects/-Users-samutpra-GitHub-carmensoftware-organize-carmen-inventory-frontend-react/memory/business-setting-config-registry.md`
- Modify: `/Users/samutpra/.claude/projects/-Users-samutpra-GitHub-carmensoftware-organize-carmen-inventory-frontend-react/memory/MEMORY.md` (only if the pointer line's text is now inaccurate)

**Interfaces:** Docs only — no code, no exported symbols.

- [ ] **Step 1: Update `SKILL.md`**

In `.claude/skills/add-business-setting-config/SKILL.md`, update the file paths and page references:
- The `description` and Overview text: config options now render on **`/system-admin/default-setting`** (not `/system-admin/business-setting`).
- The "Files you touch" table: change
  `routes/system-admin/business-setting/business-setting-config-registry.ts`
  → `routes/system-admin/company-profile/company-profile-config-registry.ts`,
  and change the i18n path from `businessSetting.sections.*` / `businessSetting.config.*`
  → `defaultSetting.sections.*` / `defaultSetting.config.*`.
- The "Do not touch" list: rename `business-setting-ui.tsx` → `company-profile-ui.tsx`,
  `business-setting-component.tsx` → (the config now lives in
  `default-setting/default-setting-component.tsx`; the registry is rendered there),
  `business-setting-form-schema.ts` → `company-profile-form-schema.ts`.
- The registry test path: `business-setting-config-registry.test.ts`
  → `company-profile-config-registry.test.ts`.

(Skill folder name stays `add-business-setting-config`.)

- [ ] **Step 2: Update the memory note**

In `…/memory/business-setting-config-registry.md`, update the registry file path to `routes/system-admin/company-profile/company-profile-config-registry.ts`, the i18n namespace to `defaultSetting`, and note that config renders on `/system-admin/default-setting` (not business-setting). If the `MEMORY.md` index line's hook text names the old page/path, update just that line to match; otherwise leave `MEMORY.md` unchanged.

- [ ] **Step 3: Verify nothing else references the old registry path**

```bash
grep -rn "business-setting-config-registry\|/system-admin/business-setting" .claude/ docs/ 2>/dev/null | grep -v "/plans/\|/specs/"
```
Expected: no stray references in `.claude/` (spec/plan docs under `docs/` may keep their historical mentions).

- [ ] **Step 4: Re-run the suite (safety) and commit**

```bash
bun test:run
git add -A
git commit -m "docs: point add-business-setting-config skill + memory at new config location"
```

---

## Self-Review

**Spec coverage:**
- New Default Setting page at `/system-admin/default-setting`, after Company Profile in the menu → Task 2 (Steps 3-7). ✓
- Rename Business Setting → Company Profile incl. path/folder/files → Task 1. ✓
- Same BU record + `PATCH`, unchanged optimistic lock → default-setting-component reuses `useUpdateBusinessUnit` + `buildPatch` + `doc_version` → Task 2 Step 3. ✓
- Registry stays in `company-profile/` (refined decision) → Task 1 Step 1 + Global Constraints. ✓
- Redirect from old path → Task 1 Step 5. ✓
- i18n namespace split + module labels → Task 1 Steps 3-4, Task 2 Steps 1-2. ✓
- Skill + memory updates → Task 3. ✓
- Tests: rename + keep green, no new heavy render test (convention) → Task 1 Step 7, Task 2 Step 8. ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code; no "similar to Task N". ✓

**Type/name consistency:** `createBusinessSettingSchema`, `toFormValues`, `buildPatch`, `mergeSeededConfig`, `normalizeConfig`, `BusinessSettingFormValues`, `ConfigField`, `groupConfigForRender`, `resolveConfigOptions`, `SettingSection`, `SettingSectionSkeleton` all referenced with the same signatures/props as their definitions (verified against the current source). Menu `name` keys (`companyProfile`, `defaultSetting`) match the `modules.*` i18n keys added. Registry relative keys (`sections.pr`, `config.*`) resolve under the `defaultSetting` namespace where the new component reads them. ✓
