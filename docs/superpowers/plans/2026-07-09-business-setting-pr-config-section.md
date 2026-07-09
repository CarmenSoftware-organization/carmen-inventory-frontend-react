# Business Setting PR Config Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เพิ่ม section **PR** พร้อม config `pr.allow-duplicate.product` (boolean/Switch) ในหน้า `/system-admin/business-setting` โดย frontend seed เอง และ persist ผ่าน `PATCH /api/business-units` เดิม

**Architecture:** frontend นิยาม config เป็น **registry จัดกลุ่มตาม section**; ฟังก์ชัน pure `mergeSeededConfig` เอา seeded item มา merge เข้ากับ `data.config` จาก backend (seed เฉพาะ key ที่ยังไม่มี) แล้วให้ `toFormValues` ใช้ merged array; `buildPatch` เดิมส่งทั้ง config array เมื่อ toggle; ฟังก์ชัน pure `groupConfigForRender` จัด items เป็นกลุ่มพร้อม absolute index ให้ component render หลาย `SettingSection`

**Tech Stack:** React 19, TypeScript, react-hook-form + zod, TanStack Query, use-intl, Vitest + @testing-library/react (jsdom), Tailwind, bun

## Global Constraints

- **Frontend only** — ห้ามแก้ backend, `hooks/use-business-unit.ts`, `constant/api-endpoints.ts`
- **Endpoint เดิม** — persist ผ่าน `PATCH /api/business-units` ผ่าน `useUpdateBusinessUnit` (ไม่แตะ)
- **datatype `"boolean"` → Switch** — คง convention เดิมของ `ConfigField`; ห้ามเปลี่ยนเป็น Checkbox
- **Canonical label locale-independent** — seeded item เก็บ `label` (EN) คงที่ เพื่อกัน false-dirty ตอนสลับ locale; display ใช้ i18n แยกต่างหาก
- **i18n ทั้ง en + th** — ทุกข้อความใหม่ต้องมีทั้งสองไฟล์ `messages/{en,th}.json`
- **ไฟล์ colocated** ใน `routes/system-admin/business-setting/`
- **สื่อสารกับ user เป็นภาษาไทย**; code/commit เป็นอังกฤษ
- **Verify ก่อนจบทุก task ใหญ่:** `bunx tsc --noEmit` และ `bun test:run` ต้องผ่าน
- config value เป็น **string เสมอ** (`"true"`/`"false"`) ตาม `BusinessUnitConfigItem`
- branch ปัจจุบัน: `feat/business-setting-pr-config-section`

---

### Task 1: Config registry (ข้อมูล seeded + section)

สร้าง registry เป็น single source of truth ของ config ที่ frontend seed จัดกลุ่มตาม section

**Files:**
- Create: `routes/system-admin/business-setting/business-setting-config-registry.ts`
- Test: `routes/system-admin/business-setting/business-setting-config-registry.test.ts`

**Interfaces:**
- Consumes: `BusinessUnitConfigItem` จาก `@/types/business-unit`
- Produces:
  - `interface SeededConfigItem { key: string; datatype: string; defaultValue: string; label: string; labelKey: string }`
  - `interface ConfigSection { id: string; titleKey: string; descKey: string; items: SeededConfigItem[] }`
  - `const CONFIG_SECTIONS: readonly ConfigSection[]`
  - `const SEEDED_ITEMS: readonly SeededConfigItem[]`
  - `const SEEDED_KEYS: ReadonlySet<string>`
  - (Task 3 จะเพิ่ม `groupConfigForRender` ในไฟล์เดียวกัน)

- [ ] **Step 1: เขียน failing test**

สร้าง `routes/system-admin/business-setting/business-setting-config-registry.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  CONFIG_SECTIONS,
  SEEDED_ITEMS,
  SEEDED_KEYS,
} from "./business-setting-config-registry";

describe("config registry", () => {
  it("SEEDED_ITEMS flattens every section's items", () => {
    const count = CONFIG_SECTIONS.reduce((n, s) => n + s.items.length, 0);
    expect(SEEDED_ITEMS).toHaveLength(count);
  });

  it("has no duplicate keys", () => {
    expect(SEEDED_KEYS.size).toBe(SEEDED_ITEMS.length);
  });

  it("registers pr.allow-duplicate.product as boolean defaulting to false", () => {
    const pr = SEEDED_ITEMS.find((i) => i.key === "pr.allow-duplicate.product");
    expect(pr).toBeDefined();
    expect(pr?.datatype).toBe("boolean");
    expect(pr?.defaultValue).toBe("false");
    expect(pr?.labelKey).toBe("config.prAllowDuplicateProduct");
  });

  it("puts the PR item under a section with id 'pr'", () => {
    const pr = CONFIG_SECTIONS.find((s) => s.id === "pr");
    expect(pr).toBeDefined();
    expect(pr?.items.some((i) => i.key === "pr.allow-duplicate.product")).toBe(
      true,
    );
  });
});
```

- [ ] **Step 2: รัน test ให้ fail**

Run: `bun test:run routes/system-admin/business-setting/business-setting-config-registry.test.ts`
Expected: FAIL — `Failed to resolve import "./business-setting-config-registry"` (ยังไม่มีไฟล์)

- [ ] **Step 3: สร้าง registry**

สร้าง `routes/system-admin/business-setting/business-setting-config-registry.ts` (ยังไม่ต้อง import `BusinessUnitConfigItem` — Task 3 จะเพิ่มตอนที่ `groupConfigForRender` ใช้จริง):

```ts
/**
 * รายการ config ที่ frontend "seed" — แสดงเสมอแม้ backend ยังไม่มีค่า
 * (default = defaultValue) พอ user เปิดแล้ว save ค่าจะถูกเขียนลง backend
 */
export interface SeededConfigItem {
  /** key จริงที่ backend ใช้ */
  key: string;
  /** ชนิดข้อมูล — "boolean" → ConfigField render เป็น Switch */
  datatype: string;
  /** ค่าเริ่มต้น (string เสมอ ตาม BusinessUnitConfigItem) */
  defaultValue: string;
  /** label canonical (EN) ที่ persist ลง backend — locale-independent กัน false-dirty */
  label: string;
  /** i18n key สำหรับ "แสดงผล" (relative ต่อ namespace businessSetting) */
  labelKey: string;
}

/** section ที่จัดกลุ่ม seeded config items */
export interface ConfigSection {
  /** id ภายใน (ไม่แสดงผล) */
  id: string;
  /** i18n key ของหัวข้อ (relative ต่อ businessSetting) */
  titleKey: string;
  /** i18n key ของคำอธิบาย */
  descKey: string;
  items: SeededConfigItem[];
}

/** registry ของ config ที่ frontend seed จัดกลุ่มตาม section */
export const CONFIG_SECTIONS: readonly ConfigSection[] = [
  {
    id: "pr",
    titleKey: "sections.pr",
    descKey: "sections.prDesc",
    items: [
      {
        key: "pr.allow-duplicate.product",
        datatype: "boolean",
        defaultValue: "false",
        label: "Allow selecting duplicate products",
        labelKey: "config.prAllowDuplicateProduct",
      },
    ],
  },
];

/** seeded items ทั้งหมด flatten จากทุก section */
export const SEEDED_ITEMS: readonly SeededConfigItem[] =
  CONFIG_SECTIONS.flatMap((s) => s.items);

/** เซ็ตของ key ที่ registry เป็นเจ้าของ (ใช้ partition ตอน render) */
export const SEEDED_KEYS: ReadonlySet<string> = new Set(
  SEEDED_ITEMS.map((i) => i.key),
);
```

- [ ] **Step 4: รัน test ให้ผ่าน**

Run: `bun test:run routes/system-admin/business-setting/business-setting-config-registry.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add routes/system-admin/business-setting/business-setting-config-registry.ts \
        routes/system-admin/business-setting/business-setting-config-registry.test.ts
git commit -m "feat(business-setting): add seeded config registry with PR section"
```

---

### Task 2: `mergeSeededConfig` + wire into `toFormValues`

merge seeded items เข้ากับ config จาก backend (seed เฉพาะ key ที่ยังไม่มี) และให้ฟอร์มใช้ merged array

**Files:**
- Modify: `routes/system-admin/business-setting/business-setting-form-schema.ts`
- Test: `routes/system-admin/business-setting/business-setting-form-schema.test.ts`

**Interfaces:**
- Consumes: `SEEDED_ITEMS` จาก `./business-setting-config-registry`; `normalizeConfig`, `toFormValues`, `buildPatch` เดิม
- Produces: `export function mergeSeededConfig(items: BusinessUnitConfigItem[]): BusinessUnitConfigItem[]`

- [ ] **Step 1: เขียน failing test**

เพิ่มลงท้าย `business-setting-form-schema.test.ts` (ก่อน import เพิ่ม `mergeSeededConfig`, `normalizeConfig`):

แก้บรรทัด import บนสุดของไฟล์เทสจาก:
```ts
import { toFormValues, buildPatch } from "./business-setting-form-schema";
```
เป็น:
```ts
import {
  toFormValues,
  buildPatch,
  mergeSeededConfig,
  normalizeConfig,
} from "./business-setting-form-schema";
import type { BusinessUnitConfigItem } from "@/types/business-unit";
```

แล้วเพิ่ม describe block ใหม่ท้ายไฟล์:

```ts
describe("mergeSeededConfig", () => {
  it("seeds the PR item when backend config is empty ({})", () => {
    const merged = mergeSeededConfig(normalizeConfig({}));
    expect(merged).toEqual([
      {
        key: "pr.allow-duplicate.product",
        label: "Allow selecting duplicate products",
        datatype: "boolean",
        value: "false",
      },
    ]);
  });

  it("does not duplicate when backend already has the key", () => {
    const backend: BusinessUnitConfigItem[] = [
      {
        key: "pr.allow-duplicate.product",
        label: "L",
        datatype: "boolean",
        value: "true",
      },
    ];
    expect(mergeSeededConfig(backend)).toEqual(backend);
  });

  it("keeps unknown backend items and appends seeded items after them", () => {
    const backend: BusinessUnitConfigItem[] = [
      { key: "x.unknown", label: "X", datatype: "string", value: "1" },
    ];
    const merged = mergeSeededConfig(backend);
    expect(merged).toHaveLength(2);
    expect(merged[0]).toEqual(backend[0]);
    expect(merged[1].key).toBe("pr.allow-duplicate.product");
  });
});

describe("buildPatch — seeded config", () => {
  it("does not send config when the seeded item is untouched", () => {
    const original = toFormValues(baseData); // baseData.config = {} → seeded to [pr false]
    expect(buildPatch({ ...original }, original).config).toBeUndefined();
  });

  it("sends the whole config array when the PR switch is toggled on", () => {
    const original = toFormValues(baseData);
    const values = {
      ...original,
      config: [{ ...original.config[0], value: "true" }],
    };
    expect(buildPatch(values, original)).toEqual({
      config: [
        {
          key: "pr.allow-duplicate.product",
          label: "Allow selecting duplicate products",
          datatype: "boolean",
          value: "true",
        },
      ],
    });
  });
});
```

- [ ] **Step 2: รัน test ให้ fail**

Run: `bun test:run routes/system-admin/business-setting/business-setting-form-schema.test.ts`
Expected: FAIL — `mergeSeededConfig is not a function` / import ไม่เจอ

- [ ] **Step 3: เพิ่ม `mergeSeededConfig` และ wire เข้า `toFormValues`**

ใน `business-setting-form-schema.ts` เพิ่ม import ท้ายบล็อก import บนสุด:

```ts
import { SEEDED_ITEMS } from "./business-setting-config-registry";
```

เพิ่มฟังก์ชันใหม่ **ใต้** `normalizeConfig` (หลังบรรทัดปิดของ `normalizeConfig`):

```ts
/**
 * merge seeded config (จาก registry) เข้ากับ config จาก backend
 *
 * seed เฉพาะ key ที่ backend ยังไม่มี — ต่อท้าย ใช้ defaultValue + canonical label
 * pure/locale-independent → diff เสถียร (ไม่ false-dirty ตอนสลับ locale)
 *
 * @param items - config items จาก backend (ผ่าน normalizeConfig แล้ว)
 * @returns config items ที่รวม seeded items ที่ยังขาด
 */
export function mergeSeededConfig(
  items: BusinessUnitConfigItem[],
): BusinessUnitConfigItem[] {
  const existing = new Set(items.map((i) => i.key));
  const seeded = SEEDED_ITEMS.filter((s) => !existing.has(s.key)).map((s) => ({
    key: s.key,
    label: s.label,
    datatype: s.datatype,
    value: s.defaultValue,
  }));
  return [...items, ...seeded];
}
```

แก้ `toFormValues` — เปลี่ยนบรรทัด config จาก:

```ts
    config: normalizeConfig(data.config),
```
เป็น:
```ts
    config: mergeSeededConfig(normalizeConfig(data.config)),
```

- [ ] **Step 4: รัน test ให้ผ่าน**

Run: `bun test:run routes/system-admin/business-setting/business-setting-form-schema.test.ts`
Expected: PASS (เทสเดิม 6 + ใหม่ 5 = 11 tests); ยืนยัน "คืน patch ว่างเมื่อไม่มีอะไรเปลี่ยน" ยังผ่าน

- [ ] **Step 5: Commit**

```bash
git add routes/system-admin/business-setting/business-setting-form-schema.ts \
        routes/system-admin/business-setting/business-setting-form-schema.test.ts
git commit -m "feat(business-setting): merge seeded config into form values"
```

---

### Task 3: `groupConfigForRender` (จัดกลุ่ม items พร้อม absolute index)

ฟังก์ชัน pure ที่ partition merged config เป็นกลุ่มตาม registry section (พร้อม absolute index + labelKey) ให้ component render

**Files:**
- Modify: `routes/system-admin/business-setting/business-setting-config-registry.ts`
- Test: `routes/system-admin/business-setting/business-setting-config-registry.test.ts`

**Interfaces:**
- Consumes: `CONFIG_SECTIONS`, `SEEDED_KEYS`, `BusinessUnitConfigItem`; `mergeSeededConfig` จาก schema (ในเทส)
- Produces:
  - `interface ConfigSectionEntry { item: BusinessUnitConfigItem; index: number; labelKey: string }`
  - `interface ConfigOtherEntry { item: BusinessUnitConfigItem; index: number }`
  - `interface ConfigRenderSection { id: string; titleKey: string; descKey: string; entries: ConfigSectionEntry[] }`
  - `interface ConfigRenderGroups { sections: ConfigRenderSection[]; other: ConfigOtherEntry[] }`
  - `function groupConfigForRender(items: readonly BusinessUnitConfigItem[]): ConfigRenderGroups`

- [ ] **Step 1: เขียน failing test**

เพิ่มลงท้าย `business-setting-config-registry.test.ts`. แก้ import บนสุดของไฟล์เทสให้รวม `groupConfigForRender` และ `mergeSeededConfig`:

```ts
import { describe, it, expect } from "vitest";
import {
  CONFIG_SECTIONS,
  SEEDED_ITEMS,
  SEEDED_KEYS,
  groupConfigForRender,
} from "./business-setting-config-registry";
import { mergeSeededConfig } from "./business-setting-form-schema";
import type { BusinessUnitConfigItem } from "@/types/business-unit";
```

เพิ่ม describe block:

```ts
describe("groupConfigForRender", () => {
  it("puts the seeded PR item in the pr section with absolute index and labelKey", () => {
    const merged = mergeSeededConfig([]); // → [pr] at index 0
    const groups = groupConfigForRender(merged);
    expect(groups.sections).toHaveLength(1);
    expect(groups.sections[0].id).toBe("pr");
    expect(groups.sections[0].entries).toHaveLength(1);
    expect(groups.sections[0].entries[0].index).toBe(0);
    expect(groups.sections[0].entries[0].item.key).toBe(
      "pr.allow-duplicate.product",
    );
    expect(groups.sections[0].entries[0].labelKey).toBe(
      "config.prAllowDuplicateProduct",
    );
    expect(groups.other).toHaveLength(0);
  });

  it("keeps unknown backend items in 'other' and preserves absolute indices", () => {
    const backend: BusinessUnitConfigItem[] = [
      { key: "x.unknown", label: "X", datatype: "string", value: "1" },
    ];
    const merged = mergeSeededConfig(backend); // [x.unknown(0), pr(1)]
    const groups = groupConfigForRender(merged);
    expect(groups.other).toHaveLength(1);
    expect(groups.other[0].index).toBe(0);
    expect(groups.other[0].item.key).toBe("x.unknown");
    expect(groups.sections[0].entries[0].index).toBe(1);
  });

  it("omits a section when none of its items are present", () => {
    const groups = groupConfigForRender([]); // no items at all
    expect(groups.sections).toHaveLength(0);
    expect(groups.other).toHaveLength(0);
  });
});
```

- [ ] **Step 2: รัน test ให้ fail**

Run: `bun test:run routes/system-admin/business-setting/business-setting-config-registry.test.ts`
Expected: FAIL — `groupConfigForRender is not exported` / undefined

- [ ] **Step 3: เพิ่ม `groupConfigForRender` ใน registry**

ใน `business-setting-config-registry.ts` เพิ่ม import บนสุดของไฟล์ (บรรทัดแรก):

```ts
import type { BusinessUnitConfigItem } from "@/types/business-unit";
```

แล้วเพิ่มโค้ดนี้ท้ายไฟล์:

```ts
/** entry ของ config ใน section — เก็บ absolute index (สำหรับ RHF path) + labelKey */
export interface ConfigSectionEntry {
  item: BusinessUnitConfigItem;
  /** index ใน merged config array — ใช้กับ RHF path `config.${index}.value` */
  index: number;
  /** i18n key สำหรับ display label (จาก registry) */
  labelKey: string;
}

/** entry ของ config ที่ไม่อยู่ใน registry section (backend-only) */
export interface ConfigOtherEntry {
  item: BusinessUnitConfigItem;
  index: number;
}

/** section ที่พร้อม render (มี entry อย่างน้อย 1) */
export interface ConfigRenderSection {
  id: string;
  titleKey: string;
  descKey: string;
  entries: ConfigSectionEntry[];
}

/** ผลของการจัดกลุ่ม config เพื่อ render */
export interface ConfigRenderGroups {
  /** section จาก registry ที่มี entry (ตามลำดับ registry) */
  sections: ConfigRenderSection[];
  /** items ที่ไม่อยู่ใน registry section → section "Configuration" เดิม */
  other: ConfigOtherEntry[];
}

/**
 * จัดกลุ่ม merged config items เพื่อ render
 *
 * คำนวณ absolute index ก่อน partition เพราะ RHF ผูกด้วย `config.${index}.value`
 * ที่ต้องอ้าง index ใน merged array (ไม่ใช่ index หลัง filter)
 *
 * @param items - merged config array (จาก mergeSeededConfig)
 * @returns กลุ่ม section (registry) + other (backend-only)
 */
export function groupConfigForRender(
  items: readonly BusinessUnitConfigItem[],
): ConfigRenderGroups {
  const indexed = items.map((item, index) => ({ item, index }));

  const sections: ConfigRenderSection[] = CONFIG_SECTIONS.map((section) => {
    const entries: ConfigSectionEntry[] = [];
    for (const seeded of section.items) {
      const found = indexed.find((e) => e.item.key === seeded.key);
      if (found) {
        entries.push({ ...found, labelKey: seeded.labelKey });
      }
    }
    return {
      id: section.id,
      titleKey: section.titleKey,
      descKey: section.descKey,
      entries,
    };
  }).filter((s) => s.entries.length > 0);

  const other: ConfigOtherEntry[] = indexed.filter(
    (e) => !SEEDED_KEYS.has(e.item.key),
  );

  return { sections, other };
}
```

- [ ] **Step 4: รัน test ให้ผ่าน**

Run: `bun test:run routes/system-admin/business-setting/business-setting-config-registry.test.ts`
Expected: PASS (Task 1 4 tests + Task 3 3 tests = 7 tests)

- [ ] **Step 5: Commit**

```bash
git add routes/system-admin/business-setting/business-setting-config-registry.ts \
        routes/system-admin/business-setting/business-setting-config-registry.test.ts
git commit -m "feat(business-setting): group config items by section for rendering"
```

---

### Task 4: `ConfigField` label override + i18n messages

เพิ่ม prop `label?` ให้ `ConfigField` (override display label ด้วย i18n) และเพิ่มข้อความ i18n ของ section PR + label

**Files:**
- Modify: `routes/system-admin/business-setting/business-setting-ui.tsx`
- Modify: `messages/en.json`, `messages/th.json`
- Test: `routes/system-admin/business-setting/business-setting-ui.test.tsx` (สร้างใหม่)

**Interfaces:**
- Consumes: `BusinessUnitConfigItem`, `BusinessSettingFormValues`, RHF `UseFormReturn`
- Produces: `ConfigField` รับ prop เพิ่ม `readonly label?: string` — ถ้ามีจะ override `item.label` ตอนแสดง (ทั้ง view/edit); ไม่มี → fallback `item.label`

- [ ] **Step 1: เขียน failing test**

สร้าง `routes/system-admin/business-setting/business-setting-ui.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { ConfigField } from "./business-setting-ui";
import type { BusinessSettingFormValues } from "./business-setting-form-schema";
import type { BusinessUnitConfigItem } from "@/types/business-unit";

const boolItem: BusinessUnitConfigItem = {
  key: "pr.allow-duplicate.product",
  label: "Allow selecting duplicate products",
  datatype: "boolean",
  value: "true",
};

/** harness: RHF form ที่มี config[0] = item ที่ส่งเข้ามา */
function Harness({
  editing,
  item,
  label,
}: {
  readonly editing: boolean;
  readonly item: BusinessUnitConfigItem;
  readonly label?: string;
}) {
  const form = useForm<BusinessSettingFormValues>({
    defaultValues: { config: [item] },
  });
  return (
    <ConfigField
      editing={editing}
      form={form}
      index={0}
      item={item}
      yesLabel="Yes"
      noLabel="No"
      label={label}
    />
  );
}

describe("ConfigField", () => {
  it("view: renders the label override instead of item.label", () => {
    render(
      <Harness
        editing={false}
        item={boolItem}
        label="อนุญาตให้เลือก product ซ้ำกันได้"
      />,
    );
    expect(
      screen.getByText("อนุญาตให้เลือก product ซ้ำกันได้"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Allow selecting duplicate products"),
    ).not.toBeInTheDocument();
    // value "true" → yesLabel
    expect(screen.getByText("Yes")).toBeInTheDocument();
  });

  it("edit: boolean item renders a Switch", () => {
    render(<Harness editing item={boolItem} label="X" />);
    expect(screen.getByRole("switch")).toBeInTheDocument();
  });

  it("falls back to item.label when no override is given", () => {
    render(<Harness editing={false} item={boolItem} />);
    expect(
      screen.getByText("Allow selecting duplicate products"),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: รัน test ให้ fail**

Run: `bun test:run routes/system-admin/business-setting/business-setting-ui.test.tsx`
Expected: FAIL — test แรกล้ม เพราะ ConfigField ยังไม่รองรับ prop `label` (ยังแสดง `item.label` = "Allow selecting duplicate products")

- [ ] **Step 3: เพิ่ม prop `label` ให้ `ConfigField`**

ใน `business-setting-ui.tsx` แก้ signature และการใช้ label ของ `ConfigField`. เปลี่ยนบล็อกจาก:

```tsx
export function ConfigField({
  editing,
  form,
  index,
  item,
  yesLabel,
  noLabel,
}: {
  readonly editing: boolean;
  readonly form: Form;
  readonly index: number;
  readonly item: BusinessUnitConfigItem;
  readonly yesLabel: string;
  readonly noLabel: string;
}) {
  const isBool = item.datatype === "boolean";
  const name = `config.${index}.value` as FormName;

  if (!editing) {
    return (
      <SettingField
        label={item.label}
        description={item.key}
        value={isBool ? (item.value === "true" ? yesLabel : noLabel) : item.value}
      />
    );
  }

  if (isBool) {
    return (
      <EditShell label={item.label} description={item.key}>
```

เป็น:

```tsx
export function ConfigField({
  editing,
  form,
  index,
  item,
  yesLabel,
  noLabel,
  label,
}: {
  readonly editing: boolean;
  readonly form: Form;
  readonly index: number;
  readonly item: BusinessUnitConfigItem;
  readonly yesLabel: string;
  readonly noLabel: string;
  /** override display label (เช่น i18n ของ seeded item); ไม่มี → ใช้ item.label */
  readonly label?: string;
}) {
  const isBool = item.datatype === "boolean";
  const name = `config.${index}.value` as FormName;
  const displayLabel = label ?? item.label;

  if (!editing) {
    return (
      <SettingField
        label={displayLabel}
        description={item.key}
        value={isBool ? (item.value === "true" ? yesLabel : noLabel) : item.value}
      />
    );
  }

  if (isBool) {
    return (
      <EditShell label={displayLabel} description={item.key}>
```

และแก้บรรทัดสุดท้ายของ ConfigField (กรณี non-boolean edit) จาก:

```tsx
  return (
    <EditShell label={item.label} description={item.key} htmlFor={name}>
      <Input {...form.register(name)} className="h-8 text-sm" />
    </EditShell>
  );
```
เป็น:
```tsx
  return (
    <EditShell label={displayLabel} description={item.key} htmlFor={name}>
      <Input {...form.register(name)} className="h-8 text-sm" />
    </EditShell>
  );
```

- [ ] **Step 4: รัน test ให้ผ่าน**

Run: `bun test:run routes/system-admin/business-setting/business-setting-ui.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: เพิ่ม i18n — `messages/en.json`**

แก้บล็อก `businessSetting.sections` — เปลี่ยน 2 บรรทัดสุดท้ายของ sections จาก:

```json
      "config": "Configuration",
      "configDesc": "Feature switches and settings for this business unit."
    },
```
เป็น:
```json
      "config": "Configuration",
      "configDesc": "Feature switches and settings for this business unit.",
      "pr": "PR",
      "prDesc": "Purchase Request settings for this business unit."
    },
```

แล้วเพิ่ม config object — เปลี่ยนบล็อกท้าย `businessSetting` จาก:

```json
    "configEmpty": "No configuration settings.",
    "yes": "Yes",
    "no": "No"
  },
```
เป็น:
```json
    "configEmpty": "No configuration settings.",
    "yes": "Yes",
    "no": "No",
    "config": {
      "prAllowDuplicateProduct": "Allow selecting duplicate products"
    }
  },
```

- [ ] **Step 6: เพิ่ม i18n — `messages/th.json`**

แก้บล็อก `businessSetting.sections` — เปลี่ยนจาก:

```json
      "config": "การตั้งค่า",
      "configDesc": "สวิตช์ฟีเจอร์และการตั้งค่าของหน่วยธุรกิจนี้"
    },
```
เป็น:
```json
      "config": "การตั้งค่า",
      "configDesc": "สวิตช์ฟีเจอร์และการตั้งค่าของหน่วยธุรกิจนี้",
      "pr": "PR",
      "prDesc": "การตั้งค่า Purchase Request ของหน่วยธุรกิจนี้"
    },
```

แล้วเพิ่ม config object — เปลี่ยนจาก:

```json
    "configEmpty": "ไม่มีการตั้งค่า",
    "yes": "ใช่",
    "no": "ไม่"
  },
```
เป็น:
```json
    "configEmpty": "ไม่มีการตั้งค่า",
    "yes": "ใช่",
    "no": "ไม่",
    "config": {
      "prAllowDuplicateProduct": "อนุญาตให้เลือก product ซ้ำกันได้"
    }
  },
```

- [ ] **Step 7: ยืนยัน JSON ถูกต้อง + เทสยังผ่าน**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); JSON.parse(require('fs').readFileSync('messages/th.json','utf8')); console.log('json ok')"`
Expected: `json ok`

Run: `bun test:run routes/system-admin/business-setting/business-setting-ui.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 8: Commit**

```bash
git add routes/system-admin/business-setting/business-setting-ui.tsx \
        routes/system-admin/business-setting/business-setting-ui.test.tsx \
        messages/en.json messages/th.json
git commit -m "feat(business-setting): support config label override + PR i18n"
```

---

### Task 5: Component wiring — render PR section

ให้ `BusinessSettingComponent` ใช้ `mergeSeededConfig` + `groupConfigForRender` render section PR (+ section Configuration เดิมสำหรับ backend-only items)

**Files:**
- Modify: `routes/system-admin/business-setting/business-setting-component.tsx`

**Interfaces:**
- Consumes: `mergeSeededConfig` จาก `./business-setting-form-schema`; `groupConfigForRender` จาก `./business-setting-config-registry`; `normalizeConfig` เดิม; `ConfigField` (มี prop `label`), `SettingSection`
- Produces: (UI เท่านั้น — ไม่มี export ใหม่)

- [ ] **Step 1: อัปเดต import**

ใน `business-setting-component.tsx` แก้บล็อก import ของ form-schema จาก:

```tsx
import {
  createBusinessSettingSchema,
  toFormValues,
  buildPatch,
  normalizeConfig,
  type BusinessSettingFormValues,
} from "./business-setting-form-schema";
```
เป็น:
```tsx
import {
  createBusinessSettingSchema,
  toFormValues,
  buildPatch,
  normalizeConfig,
  mergeSeededConfig,
  type BusinessSettingFormValues,
} from "./business-setting-form-schema";
import { groupConfigForRender } from "./business-setting-config-registry";
```

- [ ] **Step 2: คำนวณ config groups แทน configItems**

เปลี่ยนบรรทัด:

```tsx
  const configItems = data ? normalizeConfig(data.config) : [];
```
เป็น:
```tsx
  const configGroups = data
    ? groupConfigForRender(mergeSeededConfig(normalizeConfig(data.config)))
    : { sections: [], other: [] };
```

- [ ] **Step 3: แก้ render ของ Config section**

แทนบล็อก `{/* Config */}` ทั้งก้อน (จาก `<SettingSection title={t("sections.config")}...>` ถึง `</SettingSection>` ที่ปิด Config section) ด้วย:

```tsx
          {/* Registry sections (เช่น PR) — seeded config จัดกลุ่มตาม section */}
          {configGroups.sections.map((section) => (
            <SettingSection
              key={section.id}
              title={t(section.titleKey)}
              description={t(section.descKey)}
            >
              {section.entries.map((entry) => (
                <ConfigField
                  key={entry.item.key}
                  editing={editing}
                  form={form}
                  index={entry.index}
                  item={entry.item}
                  label={t(entry.labelKey)}
                  yesLabel={t("yes")}
                  noLabel={t("no")}
                />
              ))}
            </SettingSection>
          ))}

          {/* Configuration — config จาก backend ที่ไม่อยู่ใน registry section */}
          <SettingSection
            title={t("sections.config")}
            description={t("sections.configDesc")}
          >
            {configGroups.other.length === 0 ? (
              <p className="text-muted-foreground/70 text-sm sm:col-span-2">
                {t("configEmpty")}
              </p>
            ) : (
              configGroups.other.map((entry) => (
                <ConfigField
                  key={entry.item.key}
                  editing={editing}
                  form={form}
                  index={entry.index}
                  item={entry.item}
                  yesLabel={t("yes")}
                  noLabel={t("no")}
                />
              ))
            )}
          </SettingSection>
```

> หมายเหตุ: PR section จะ render **เหนือ** Configuration section (ลำดับ registry ก่อน แล้วตามด้วย generic)

- [ ] **Step 4: ตรวจ type + lint + เทสทั้งชุด**

Run: `bunx tsc --noEmit`
Expected: ไม่มี error

Run: `bun run lint`
Expected: ไม่มี error/warning ใหม่

Run: `bun test:run routes/system-admin/business-setting/`
Expected: PASS ทั้งหมด (registry 7 + schema 11 + ui 3)

- [ ] **Step 5: Manual verification (dev server)**

Run: `VITE_DEV_PROXY_TARGET=http://localhost:4000 bun dev` แล้วเปิด `http://localhost:3000/system-admin/business-setting`

ตรวจ:
1. เห็น section **PR** พร้อมแถว "อนุญาตให้เลือก product ซ้ำกันได้" (view = แสดง ใช่/ไม่ = "ไม่")
2. กด **Edit** → PR แสดง **Switch**; เปิด Switch → กด **Save** → toast สำเร็จ
3. **Reload** หน้า → ค่ายังเป็นเปิด (persisted ลง backend จริง)
4. สลับภาษา **EN/TH** (ปุ่ม locale) → label เปลี่ยนตามภาษา และหน้าไม่ขึ้นสถานะ dirty/discard
5. ไม่มี console error

- [ ] **Step 6: Commit**

```bash
git add routes/system-admin/business-setting/business-setting-component.tsx
git commit -m "feat(business-setting): render PR config section on the page"
```

---

## Self-Review (ผู้เขียน plan ตรวจกับ spec)

**Spec coverage:**
- §2.1 Frontend seed → Task 1 (registry) + Task 2 (mergeSeededConfig) ✅
- §2.2 Registry แบ่ง section → Task 1 (CONFIG_SECTIONS) + Task 3 (grouping) + Task 5 (render) ✅
- §2.3 Switch (datatype boolean) → Task 4 (ConfigField ยังใช้ Switch) ✅
- §2.4 i18n en+th → Task 4 (Step 5-6) ✅
- §4.1 mergeSeededConfig pure/idempotent/ไม่รบกวนจน opt-in → Task 2 (tests ครบ 3 เคส + buildPatch 2 เคส) ✅
- §4.2 persist → Task 2 buildPatch (whole array) + Task 5 manual verify ✅
- §5 grouping + absolute index + label override → Task 3 (index test) + Task 4 (label prop) + Task 5 (render) ✅
- §6 i18n keys ตรง (`sections.pr`, `sections.prDesc`, `config.prAllowDuplicateProduct`) → Task 4 + registry titleKey/labelKey ตรงกัน ✅
- §7 Testing + regression → Task 2 (regression "patch ว่าง"), Task 1/3/4 tests ✅
- §8 Verification (tsc/test/lint + manual) → Task 5 Step 4-5 ✅
- §9 Out of scope (ไม่แตะ backend/hook/endpoint, ไม่เปลี่ยนเป็น Checkbox) → constraints + task ไม่แตะไฟล์เหล่านั้น ✅

**Placeholder scan:** ไม่มี TBD/TODO/"handle edge cases" — ทุก step มี code จริง ✅

**Type consistency:** `SeededConfigItem`/`ConfigSection`/`CONFIG_SECTIONS`/`SEEDED_ITEMS`/`SEEDED_KEYS` (Task 1) ↔ `mergeSeededConfig` ใช้ `SEEDED_ITEMS` (Task 2) ↔ `groupConfigForRender`/`ConfigSectionEntry.labelKey`/`ConfigRenderGroups` (Task 3) ↔ `ConfigField` prop `label?` (Task 4) ↔ component ใช้ `entry.index`/`entry.labelKey`/`configGroups.sections|other` (Task 5) — ชื่อและ type ตรงกันตลอด ✅

หมายเหตุ deviation จาก spec: spec เดิมพูดถึง `getSeededItem(key)` แต่ plan ใช้ `ConfigSectionEntry.labelKey` (แนบ labelKey ตอน group) ซึ่งสะอาดกว่า (ไม่ต้อง lookup ซ้ำ + เลี่ยง `t("")`) — ครอบคลุม requirement เดียวกัน
