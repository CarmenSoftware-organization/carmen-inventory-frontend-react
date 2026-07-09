# Business Setting SI Config Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เพิ่ม section **SI** (Stock In) พร้อม enum config `si.cost-from` ในหน้า `/system-admin/business-setting` โดย option `average` แสดงเฉพาะเมื่อ BU ใช้ average costing และ persist ผ่าน `PATCH /api/business-units` เดิม

**Architecture:** ต่อยอด registry ของ seeded config (จาก PR #42) โดยเพิ่ม **enum config type** — `SeededConfigItem.options` + pure `resolveConfigOptions` (filter option ตาม `calculation_method`); `ConfigField` เพิ่ม branch enum (view = label i18n, edit = Radix Select); component resolve options แล้วส่งให้ ConfigField. `mergeSeededConfig`/`buildPatch`/absolute-index เดิมใช้ต่อได้โดยไม่แก้

**Tech Stack:** React 19, TypeScript, react-hook-form, use-intl, Radix Select, Vitest + @testing-library/react (jsdom), bun

## Global Constraints

- **Frontend only** — ห้ามแก้ backend, `hooks/use-business-unit.ts`, `constant/api-endpoints.ts`, หรือ form schema (`BusinessSettingFormValues`)
- **Endpoint เดิม** — persist ผ่าน `PATCH /api/business-units` (ไม่แตะ hook)
- **value canonical snake_case** — เก็บ `average` / `last_receiving` / `last_cost` (locale-independent); display เป็น i18n
- **เงื่อนไข average** — option `average` แสดงเฉพาะเมื่อ `data.calculation_method === "average"`; **แต่คงค่าที่ backend เก็บไว้** (option ที่ `value === currentValue` ไม่ถูกตัด)
- **default (seed) = `last_cost`** (static)
- **SI = Stock In** — section title แสดง "SI"; description อ้าง Stock In
- **datatype `"enum"` → Radix Select**; `"boolean"` ยัง Switch; string ยัง text input
- **i18n ทั้ง en + th** สำหรับทุกข้อความใหม่
- ไฟล์ colocated ใน `routes/system-admin/business-setting/`
- config value เป็น **string เสมอ** (`BusinessUnitConfigItem`)
- `mergeSeededConfig` **ไม่ต้องแก้** (คัดลอก datatype + defaultValue อยู่แล้ว)
- **สื่อสารกับ user เป็นภาษาไทย**; code/commit เป็นอังกฤษ
- branch: `feat/business-setting-si-config-section`
- baseline หลัง PR #42: `bunx tsc --noEmit` = 0 errors, `bun run build` เขียว
- **Verify ก่อนจบทุก task:** `bunx tsc --noEmit` และ `bun test:run` ต้องผ่าน

---

### Task 1: Registry — enum option type + SI section + `resolveConfigOptions`

**Files:**
- Modify: `routes/system-admin/business-setting/business-setting-config-registry.ts`
- Test: `routes/system-admin/business-setting/business-setting-config-registry.test.ts`

**Interfaces:**
- Consumes: `CONFIG_SECTIONS`, `SEEDED_ITEMS`, `SEEDED_KEYS` (เดิม)
- Produces:
  - `interface ConfigOption { value: string; labelKey: string; visibleWhenCalcMethod?: string }`
  - `SeededConfigItem` เพิ่ม field `options?: ConfigOption[]`
  - SI section ใน `CONFIG_SECTIONS` (`id: "si"`)
  - `function resolveConfigOptions(options: readonly ConfigOption[], calculationMethod: string | null | undefined, currentValue: string): ConfigOption[]`

- [ ] **Step 1: เขียน failing test**

เพิ่มลงท้าย `business-setting-config-registry.test.ts`. อัปเดต import บนสุดให้รวม `CONFIG_SECTIONS` (มีอยู่แล้ว) และ `resolveConfigOptions`:

```ts
import {
  CONFIG_SECTIONS,
  SEEDED_ITEMS,
  SEEDED_KEYS,
  groupConfigForRender,
  resolveConfigOptions,
} from "./business-setting-config-registry";
```

แล้วเพิ่ม describe blocks:

```ts
describe("SI config registry", () => {
  it("registers si.cost-from as an enum defaulting to last_cost under section 'si'", () => {
    const si = CONFIG_SECTIONS.find((s) => s.id === "si");
    expect(si).toBeDefined();
    const item = si?.items.find((i) => i.key === "si.cost-from");
    expect(item).toBeDefined();
    expect(item?.datatype).toBe("enum");
    expect(item?.defaultValue).toBe("last_cost");
    expect(item?.labelKey).toBe("config.siCostFrom");
  });

  it("declares 3 options in order, with average gated on average costing", () => {
    const item = SEEDED_ITEMS.find((i) => i.key === "si.cost-from");
    expect(item?.options?.map((o) => o.value)).toEqual([
      "average",
      "last_receiving",
      "last_cost",
    ]);
    const avg = item?.options?.find((o) => o.value === "average");
    expect(avg?.visibleWhenCalcMethod).toBe("average");
    expect(avg?.labelKey).toBe("config.siCostFromOptions.average");
    // non-conditional options have no gate
    expect(
      item?.options?.find((o) => o.value === "last_cost")?.visibleWhenCalcMethod,
    ).toBeUndefined();
  });
});

describe("resolveConfigOptions", () => {
  const opts = [
    { value: "average", labelKey: "a", visibleWhenCalcMethod: "average" },
    { value: "last_receiving", labelKey: "b" },
    { value: "last_cost", labelKey: "c" },
  ];

  it("shows all options when calc method is average", () => {
    expect(
      resolveConfigOptions(opts, "average", "last_cost").map((o) => o.value),
    ).toEqual(["average", "last_receiving", "last_cost"]);
  });

  it("hides average when calc method is not average", () => {
    expect(
      resolveConfigOptions(opts, "fifo", "last_cost").map((o) => o.value),
    ).toEqual(["last_receiving", "last_cost"]);
  });

  it("hides average when calc method is null", () => {
    expect(
      resolveConfigOptions(opts, null, "last_cost").map((o) => o.value),
    ).toEqual(["last_receiving", "last_cost"]);
  });

  it("keeps average when it is the stored current value even if calc method differs", () => {
    expect(
      resolveConfigOptions(opts, "fifo", "average").map((o) => o.value),
    ).toEqual(["average", "last_receiving", "last_cost"]);
  });
});
```

- [ ] **Step 2: รัน test ให้ fail**

Run: `bun test:run routes/system-admin/business-setting/business-setting-config-registry.test.ts`
Expected: FAIL — `resolveConfigOptions` ไม่ถูก export / SI section ไม่มี

- [ ] **Step 3: แก้ registry**

ใน `business-setting-config-registry.ts`:

(3a) เพิ่ม `ConfigOption` interface **เหนือ** `SeededConfigItem`:

```ts
/** option ของ enum config (datatype "enum") */
export interface ConfigOption {
  /** ค่าที่เก็บ (canonical snake_case, locale-independent) */
  value: string;
  /** i18n key ของ label option (relative ต่อ businessSetting) */
  labelKey: string;
  /** แสดง option นี้เฉพาะเมื่อ BU.calculation_method === ค่านี้ (undefined = แสดงเสมอ) */
  visibleWhenCalcMethod?: string;
}
```

(3b) เพิ่ม field `options?` ใน `SeededConfigItem` (ต่อจาก `labelKey`):

```ts
  /** i18n key สำหรับ "แสดงผล" (relative ต่อ namespace businessSetting) */
  labelKey: string;
  /** สำหรับ datatype "enum" — รายการ option ตามลำดับที่แสดง */
  options?: ConfigOption[];
}
```

(3c) เพิ่ม SI section ใน `CONFIG_SECTIONS` (ต่อจาก object ของ `pr`, ก่อน `]` ปิด array):

```ts
  {
    id: "si",
    titleKey: "sections.si",
    descKey: "sections.siDesc",
    items: [
      {
        key: "si.cost-from",
        datatype: "enum",
        defaultValue: "last_cost",
        label: "Default price for added items",
        labelKey: "config.siCostFrom",
        options: [
          {
            value: "average",
            labelKey: "config.siCostFromOptions.average",
            visibleWhenCalcMethod: "average",
          },
          {
            value: "last_receiving",
            labelKey: "config.siCostFromOptions.lastReceiving",
          },
          {
            value: "last_cost",
            labelKey: "config.siCostFromOptions.lastCost",
          },
        ],
      },
    ],
  },
```

(3d) เพิ่มฟังก์ชัน `resolveConfigOptions` (ท้ายไฟล์ หรือใต้ `SEEDED_KEYS`):

```ts
/**
 * คืน options ที่ควรแสดงใน dropdown — ตัด option ที่มี visibleWhenCalcMethod
 * ไม่ตรงกับ calculationMethod ยกเว้น option ที่ value === currentValue
 * (คงค่าที่ backend เก็บไว้ ไม่ทำข้อมูลหาย)
 *
 * @param options - จาก registry (ConfigOption[])
 * @param calculationMethod - BU.calculation_method (อาจเป็น null)
 * @param currentValue - ค่าปัจจุบันของ config item
 */
export function resolveConfigOptions(
  options: readonly ConfigOption[],
  calculationMethod: string | null | undefined,
  currentValue: string,
): ConfigOption[] {
  return options.filter(
    (o) =>
      !o.visibleWhenCalcMethod ||
      o.visibleWhenCalcMethod === calculationMethod ||
      o.value === currentValue,
  );
}
```

- [ ] **Step 4: รัน test ให้ผ่าน**

Run: `bun test:run routes/system-admin/business-setting/business-setting-config-registry.test.ts`
Expected: PASS (เทสเดิม 7 + ใหม่ 6 = 13 tests)

- [ ] **Step 5: Commit**

```bash
git add routes/system-admin/business-setting/business-setting-config-registry.ts \
        routes/system-admin/business-setting/business-setting-config-registry.test.ts
git commit -m "feat(business-setting): add SI enum config registry + resolveConfigOptions"
```

---

### Task 2: `groupConfigForRender` attaches enum options

**Files:**
- Modify: `routes/system-admin/business-setting/business-setting-config-registry.ts`
- Test: `routes/system-admin/business-setting/business-setting-config-registry.test.ts`

**Interfaces:**
- Consumes: `CONFIG_SECTIONS`, `mergeSeededConfig` (จาก schema, ในเทส)
- Produces: `ConfigSectionEntry` เพิ่ม field `options?: ConfigOption[]`; `groupConfigForRender` แนบ `options` จาก registry seeded item

- [ ] **Step 1: เขียน failing test**

เพิ่ม describe block ใน `business-setting-config-registry.test.ts` (import `mergeSeededConfig` มีอยู่แล้วจากเทส Task-3 เดิมของ PR; ถ้ายังไม่มีให้เพิ่ม `import { mergeSeededConfig } from "./business-setting-form-schema";`):

```ts
describe("groupConfigForRender — enum options", () => {
  it("attaches registry options to the SI enum entry", () => {
    const merged = mergeSeededConfig([]); // seeds ทั้ง PR + SI
    const groups = groupConfigForRender(merged);
    const si = groups.sections.find((s) => s.id === "si");
    expect(si).toBeDefined();
    const entry = si?.entries.find((e) => e.item.key === "si.cost-from");
    expect(entry?.options?.map((o) => o.value)).toEqual([
      "average",
      "last_receiving",
      "last_cost",
    ]);
  });

  it("leaves options undefined for non-enum (boolean PR) entries", () => {
    const merged = mergeSeededConfig([]);
    const groups = groupConfigForRender(merged);
    const pr = groups.sections.find((s) => s.id === "pr");
    const entry = pr?.entries.find(
      (e) => e.item.key === "pr.allow-duplicate.product",
    );
    expect(entry?.options).toBeUndefined();
  });
});
```

- [ ] **Step 2: รัน test ให้ fail**

Run: `bun test:run routes/system-admin/business-setting/business-setting-config-registry.test.ts`
Expected: FAIL — `entry.options` undefined สำหรับ SI (ยังไม่ได้แนบ)

- [ ] **Step 3: แนบ options ใน grouping**

(3a) เพิ่ม field `options?` ใน `ConfigSectionEntry` (ต่อจาก `labelKey`):

```ts
  /** i18n key สำหรับ display label (จาก registry) */
  labelKey: string;
  /** สำหรับ enum — options จาก registry (undefined = ไม่ใช่ enum) */
  options?: ConfigOption[];
}
```

(3b) ใน `groupConfigForRender` แก้บรรทัด push entry จาก:

```ts
        entries.push({ ...found, labelKey: seeded.labelKey });
```
เป็น:
```ts
        entries.push({ ...found, labelKey: seeded.labelKey, options: seeded.options });
```

- [ ] **Step 4: รัน test ให้ผ่าน**

Run: `bun test:run routes/system-admin/business-setting/business-setting-config-registry.test.ts`
Expected: PASS (Task 1 13 + Task 2 2 = 15 tests)

- [ ] **Step 5: Commit**

```bash
git add routes/system-admin/business-setting/business-setting-config-registry.ts \
        routes/system-admin/business-setting/business-setting-config-registry.test.ts
git commit -m "feat(business-setting): carry enum options through group entries"
```

---

### Task 3: `ConfigField` enum branch (view label + edit Select)

**Files:**
- Modify: `routes/system-admin/business-setting/business-setting-ui.tsx`
- Test: `routes/system-admin/business-setting/business-setting-ui.test.tsx`

**Interfaces:**
- Consumes: `BusinessUnitConfigItem`, RHF form, Radix `Select`/`SelectContent`/`SelectItem`/`SelectTrigger`/`SelectValue` (import อยู่แล้วในไฟล์)
- Produces: `ConfigField` รับ prop `options?: readonly { value: string; label: string }[]`; render Select เมื่อ `datatype === "enum"` และมี options

- [ ] **Step 1: เขียน failing test**

ใน `business-setting-ui.test.tsx` (1) เพิ่ม fixtures + (2) ขยาย `Harness` ให้รับ `options` + (3) เพิ่ม describe block.

แก้ `Harness` — เพิ่ม prop `options`:

```tsx
function Harness({
  editing,
  item,
  label,
  options,
}: {
  readonly editing: boolean;
  readonly item: BusinessUnitConfigItem;
  readonly label?: string;
  readonly options?: readonly { value: string; label: string }[];
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
      options={options}
    />
  );
}
```

เพิ่ม fixtures + tests:

```tsx
const enumItem: BusinessUnitConfigItem = {
  key: "si.cost-from",
  label: "Default price for added items",
  datatype: "enum",
  value: "last_cost",
};
const enumOptions = [
  { value: "last_receiving", label: "Last receiving" },
  { value: "last_cost", label: "Last cost" },
];

describe("ConfigField — enum", () => {
  it("view: shows the label of the current value (not the raw value)", () => {
    render(<Harness editing={false} item={enumItem} options={enumOptions} />);
    expect(screen.getByText("Last cost")).toBeInTheDocument();
    expect(screen.queryByText("last_cost")).not.toBeInTheDocument();
  });

  it("edit: renders a Select (combobox), not a text input", () => {
    render(<Harness editing item={enumItem} options={enumOptions} />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("enum without options falls back to a text input", () => {
    render(<Harness editing item={enumItem} />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
});
```

> หมายเหตุ: เทส edit ยืนยันแค่ว่า branch เลือก **combobox** (Radix `SelectTrigger` มี `role="combobox"`) ไม่เปิด dropdown — เลี่ยงความ flaky ของ Radix portal ใน jsdom. การแสดง label ของค่าปัจจุบันครอบคลุมโดยเทส view mode แล้ว (plain DOM)

- [ ] **Step 2: รัน test ให้ fail**

Run: `bun test:run routes/system-admin/business-setting/business-setting-ui.test.tsx`
Expected: FAIL — edit enum ยัง render text input (`role="textbox"`) เพราะ ConfigField ยังไม่มี branch enum

- [ ] **Step 3: เพิ่ม branch enum ใน `ConfigField`**

แทน `ConfigField` ทั้งฟังก์ชันด้วยเวอร์ชันนี้ (เพิ่ม prop `options` + `isEnum` + branch view/edit enum; boolean/text เดิมไม่เปลี่ยน):

```tsx
export function ConfigField({
  editing,
  form,
  index,
  item,
  yesLabel,
  noLabel,
  label,
  options,
}: {
  readonly editing: boolean;
  readonly form: Form;
  readonly index: number;
  readonly item: BusinessUnitConfigItem;
  readonly yesLabel: string;
  readonly noLabel: string;
  /** override display label (เช่น i18n ของ seeded item); ไม่มี → ใช้ item.label */
  readonly label?: string;
  /** สำหรับ enum — options ที่ resolve แล้ว (value + label i18n) */
  readonly options?: readonly { value: string; label: string }[];
}) {
  const isBool = item.datatype === "boolean";
  const isEnum =
    item.datatype === "enum" && options != null && options.length > 0;
  const name = `config.${index}.value` as FormName;
  const displayLabel = label ?? item.label;

  if (!editing) {
    let displayValue: string;
    if (isBool) {
      displayValue = item.value === "true" ? yesLabel : noLabel;
    } else if (isEnum) {
      displayValue =
        options.find((o) => o.value === item.value)?.label ?? item.value;
    } else {
      displayValue = item.value;
    }
    return (
      <SettingField
        label={displayLabel}
        description={item.key}
        value={displayValue}
      />
    );
  }

  if (isBool) {
    return (
      <EditShell label={displayLabel} description={item.key}>
        <Controller
          control={form.control}
          name={name}
          render={({ field }) => (
            <Switch
              checked={field.value === "true"}
              onCheckedChange={(v) => field.onChange(v ? "true" : "false")}
            />
          )}
        />
      </EditShell>
    );
  }

  if (isEnum) {
    return (
      <EditShell label={displayLabel} description={item.key} htmlFor={name}>
        <Controller
          control={form.control}
          name={name}
          render={({ field }) => (
            <Select
              value={typeof field.value === "string" ? field.value : ""}
              onValueChange={field.onChange}
            >
              <SelectTrigger id={name} size="sm" className="w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-sm">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </EditShell>
    );
  }

  return (
    <EditShell label={displayLabel} description={item.key} htmlFor={name}>
      <Input {...form.register(name)} className="h-8 text-sm" />
    </EditShell>
  );
}
```

- [ ] **Step 4: รัน test ให้ผ่าน**

Run: `bun test:run routes/system-admin/business-setting/business-setting-ui.test.tsx`
Expected: PASS (เทสเดิม 4 + ใหม่ 3 = 7 tests)

- [ ] **Step 5: Commit**

```bash
git add routes/system-admin/business-setting/business-setting-ui.tsx \
        routes/system-admin/business-setting/business-setting-ui.test.tsx
git commit -m "feat(business-setting): render enum config as a Select in ConfigField"
```

---

### Task 4: i18n + component wiring (render SI + resolve options)

**Files:**
- Modify: `messages/en.json`, `messages/th.json`
- Modify: `routes/system-admin/business-setting/business-setting-component.tsx`

**Interfaces:**
- Consumes: `groupConfigForRender`, `resolveConfigOptions` (registry); `ConfigField` prop `options` (Task 3); `data.calculation_method`
- Produces: (UI + i18n — ไม่มี export ใหม่)

- [ ] **Step 1: เพิ่ม i18n — `messages/en.json`**

(1a) ใน `businessSetting.sections` แก้ 2 บรรทัดสุดท้าย (pr/prDesc) — เพิ่ม si/siDesc:

จาก:
```json
      "pr": "PR",
      "prDesc": "Purchase Request settings for this business unit."
    },
```
เป็น:
```json
      "pr": "PR",
      "prDesc": "Purchase Request settings for this business unit.",
      "si": "SI",
      "siDesc": "Stock In settings for this business unit."
    },
```

(1b) ใน `businessSetting.config` เพิ่ม siCostFrom + siCostFromOptions — จาก:
```json
    "config": {
      "prAllowDuplicateProduct": "Allow selecting duplicate products"
    }
```
เป็น:
```json
    "config": {
      "prAllowDuplicateProduct": "Allow selecting duplicate products",
      "siCostFrom": "Default price for added items",
      "siCostFromOptions": {
        "average": "Average",
        "lastReceiving": "Last receiving",
        "lastCost": "Last cost"
      }
    }
```

- [ ] **Step 2: เพิ่ม i18n — `messages/th.json`**

(2a) `businessSetting.sections` — จาก:
```json
      "pr": "PR",
      "prDesc": "การตั้งค่า Purchase Request ของหน่วยธุรกิจนี้"
    },
```
เป็น:
```json
      "pr": "PR",
      "prDesc": "การตั้งค่า Purchase Request ของหน่วยธุรกิจนี้",
      "si": "SI",
      "siDesc": "การตั้งค่า Stock In ของหน่วยธุรกิจนี้"
    },
```

(2b) `businessSetting.config` — จาก:
```json
    "config": {
      "prAllowDuplicateProduct": "อนุญาตให้เลือก product ซ้ำกันได้"
    }
```
เป็น:
```json
    "config": {
      "prAllowDuplicateProduct": "อนุญาตให้เลือก product ซ้ำกันได้",
      "siCostFrom": "ราคาเริ่มต้นสำหรับสินค้าที่เพิ่มเข้าไป",
      "siCostFromOptions": {
        "average": "เฉลี่ย",
        "lastReceiving": "รับล่าสุด",
        "lastCost": "ต้นทุนล่าสุด"
      }
    }
```

- [ ] **Step 3: ยืนยัน JSON valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8'));JSON.parse(require('fs').readFileSync('messages/th.json','utf8'));console.log('json ok')"`
Expected: `json ok`

- [ ] **Step 4: wire component — import `resolveConfigOptions`**

ใน `business-setting-component.tsx` แก้ import registry จาก:
```tsx
import { groupConfigForRender } from "./business-setting-config-registry";
```
เป็น:
```tsx
import {
  groupConfigForRender,
  resolveConfigOptions,
} from "./business-setting-config-registry";
```

- [ ] **Step 5: wire component — resolve options ต่อ enum entry**

ใน block `{/* Registry sections ... */}` แก้ `section.entries.map` จาก:

```tsx
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
```
เป็น:
```tsx
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
```

> `data` อยู่ใน scope แล้ว (ทั้ง block อยู่ใต้ `{!isError && !isBusy && data && (...)}`). entry ที่ไม่ใช่ enum (PR) → `entry.options` undefined → `options` undefined → ConfigField ทำงานเดิม

- [ ] **Step 6: ตรวจ type + lint + เทสทั้งชุด**

Run: `bunx tsc --noEmit`
Expected: 0 errors

Run: `bun run lint 2>&1 | grep -iE "business-setting|messages" | grep error || echo "no lint errors in our files"`
Expected: `no lint errors in our files` (pre-existing lint errors ใน `vendor-management/*` ไม่เกี่ยว)

Run: `bun test:run routes/system-admin/business-setting/`
Expected: PASS ทั้งหมด (registry 15 + schema เดิม + ui 7)

- [ ] **Step 7: Manual verification (dev server)**

> subagent ทำ headless ไม่ได้ — controller/user เป็นคนตรวจ. ผู้ทำ implementation ให้ **ข้าม step นี้**

เปิด `/system-admin/business-setting`:
1. เห็น section **SI** พร้อม "ราคาเริ่มต้นสำหรับสินค้าที่เพิ่มเข้าไป" (view แสดง label เช่น "ต้นทุนล่าสุด")
2. กด **Edit** → SI เป็น **Select**; BU ที่ calc method = average → เห็น 3 ตัวเลือก (มี "เฉลี่ย"); BU อื่น → 2 ตัวเลือก
3. เลือกค่า → **Save** → toast สำเร็จ; **reload** → ค่าคงอยู่
4. สลับ **EN/TH** → label + option เปลี่ยนภาษา และไม่ทำให้ฟอร์ม dirty
5. ไม่มี console error

- [ ] **Step 8: Commit**

```bash
git add messages/en.json messages/th.json \
        routes/system-admin/business-setting/business-setting-component.tsx
git commit -m "feat(business-setting): render SI enum config section with conditional options"
```

---

## Self-Review (ผู้เขียน plan ตรวจกับ spec)

**Spec coverage:**
- §2.1 value snake_case + label i18n → Task 1 (options เก็บ value canonical + labelKey) + Task 4 (i18n) ✅
- §2.2 ซ่อน average เมื่อ calc≠average, คงค่าที่เก็บไว้ → Task 1 `resolveConfigOptions` (4 เคสครบ รวม value-match) ✅
- §2.3 default last_cost → Task 1 (defaultValue) ✅
- §2.4 SI = Stock In → Task 4 (siDesc) ✅
- §3.2/3.3 registry types + resolveConfigOptions → Task 1 ✅
- §4 data flow (mergeSeededConfig ไม่แก้) → Task 2 test ใช้ mergeSeededConfig seed SI ✅
- §5 groupConfigForRender แนบ options → Task 2 ✅
- §6 ConfigField enum branch (view label / edit Select / fallback) → Task 3 (3 เทสครบ) ✅
- §7 component resolve + pass options → Task 4 ✅
- §8 i18n keys ตรง (`sections.si/siDesc`, `config.siCostFrom`, `config.siCostFromOptions.*`) → Task 4 + registry labelKey ตรงกัน ✅
- §9 testing (registry/resolve/merge/group/ConfigField/regression) → Task 1–3 ✅
- §10 verification (tsc/build/lint/manual) → Task 4 Step 6–7 ✅
- §11 out of scope (ไม่แตะ backend/hook/endpoint/schema, ไม่ทำ generic engine) → constraints + tasks ไม่แตะไฟล์เหล่านั้น ✅

**Placeholder scan:** ไม่มี TBD/TODO — ทุก step มี code จริง ✅

**Type consistency:** `ConfigOption` (Task 1) ↔ `SeededConfigItem.options` (Task 1) ↔ `ConfigSectionEntry.options` (Task 2) ↔ `resolveConfigOptions` param/return (Task 1) ↔ `ConfigField` prop `options: {value,label}[]` (Task 3) ↔ component map `o.value`/`t(o.labelKey)` (Task 4). ชื่อ i18n key ใน registry (`config.siCostFrom`, `config.siCostFromOptions.average/lastReceiving/lastCost`) ตรงกับ Task 4 ทุกตัว ✅

**หมายเหตุ:** ConfigField prop `options` เป็น `{value,label}` (resolve แล้ว) ต่างจาก registry `ConfigOption` (`value,labelKey,...`) โดยตั้งใจ — component เป็นตัวแปลง labelKey → label ผ่าน `t()` (แยก concern: registry pure/i18n-agnostic, component ทำ i18n)
