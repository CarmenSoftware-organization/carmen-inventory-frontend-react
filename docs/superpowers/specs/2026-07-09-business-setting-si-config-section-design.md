# Business Setting — SI config section + seeded enum `si.cost-from`

- **Date:** 2026-07-09
- **Status:** Design approved, ready for implementation plan
- **Scope:** `routes/system-admin/business-setting/` (frontend only) + `messages/{en,th}.json`
- **Page:** `/system-admin/business-setting`
- **Builds on:** `2026-07-09-business-setting-pr-config-section-design.md` (registry + seeded config
  foundation, merged in PR #42)

## 1. Problem / Goal

เพิ่มการตั้งค่าใหม่ในหน้า Business Setting:

- **section ใหม่ชื่อ `SI`** (Stock In) แยกจาก section PR / Configuration
- **config key `si.cost-from`** — enum (เลือกจากรายการ)
- **label:** "ราคาเริ่มต้นสำหรับสินค้าที่เพิ่มเข้าไป" (th) / "Default price for added items" (en)
- **ค่าที่เลือกได้ (canonical, snake_case):** `average`, `last_receiving`, `last_cost`
  แต่ละ option มี display label แบบ i18n (en+th)
- **เงื่อนไข:** option `average` แสดงใน dropdown **เฉพาะเมื่อ** BU มี
  `calculation_method === "average"`; ถ้าไม่ใช่ ให้เหลือเฉพาะ `last_receiving` / `last_cost`
  (แต่ถ้าค่าที่ backend เก็บไว้เป็น `average` อยู่แล้ว ยังคงแสดงค่าเดิม — ไม่ทำข้อมูลหาย)
- **default (seed):** `last_cost` (static, ใช้ได้ทุก BU)
- ค่าที่เลือกต้องถูกรวมเข้า `config` array และ persist ผ่าน endpoint เดิม
  `PATCH /api/business-units`

นี่เป็น **config type ใหม่ (enum/select)** ตัวแรก — เดิม `ConfigField` รองรับแค่ `boolean` → Switch
และ string → text input

## 2. Decisions (จาก brainstorming)

1. **value snake_case + label i18n** — เก็บค่า canonical (`average`/`last_receiving`/`last_cost`),
   display เป็น i18n (locale-independent value กัน false-dirty ตอนสลับ locale — เหมือน PR pattern)
2. **ซ่อน option `average` เมื่อ `calculation_method !== "average"`** แต่คงค่าที่ backend เก็บไว้
   (option ที่ value ตรงกับค่าปัจจุบันจะไม่ถูกตัดออก)
3. **default = `last_cost`** (static — ไม่ผูกกับ calc method เพื่อความเรียบง่าย)
4. **SI = Stock In** (ใช้ทำ section description; title แสดง "SI")

## 3. Architecture

Frontend เท่านั้น ไม่แตะ backend / hooks / endpoint / schema. ต่อยอดจาก registry เดิม
ทั้งหมด colocated ใน `routes/system-admin/business-setting/`

### 3.1 ไฟล์

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `business-setting-config-registry.ts` | เพิ่ม `ConfigOption`; field `options?` ใน `SeededConfigItem`; SI section; `resolveConfigOptions`; field `options?` ใน `ConfigSectionEntry`; wire options ใน `groupConfigForRender` |
| `business-setting-ui.tsx` | `ConfigField` รับ prop `options?`; เพิ่ม branch `datatype === "enum"` (view = label i18n, edit = Select) |
| `business-setting-component.tsx` | สำหรับ enum entry: resolve options ด้วย `resolveConfigOptions` + `data.calculation_method` แล้วส่งเข้า `ConfigField` |
| `messages/en.json` / `messages/th.json` | `sections.si` / `sections.siDesc` / `config.siCostFrom` / `config.siCostFromOptions.{average,lastReceiving,lastCost}` |
| `*-config-registry.test.ts` / `*-form-schema.test.ts` / `*-ui.test.tsx` | เทส registry + resolveConfigOptions + merge + grouping + ConfigField enum |

`mergeSeededConfig` (schema) **ไม่ต้องแก้** — มันคัดลอก `datatype` + `defaultValue` จาก registry อยู่แล้ว
(`options` ไม่เก็บใน config array — อยู่แค่ใน registry)

### 3.2 Registry types

```ts
/** option ของ enum config */
export interface ConfigOption {
  /** ค่าที่เก็บ (canonical snake_case, locale-independent) */
  value: string;
  /** i18n key ของ label option (relative ต่อ businessSetting) */
  labelKey: string;
  /** แสดง option นี้เฉพาะเมื่อ BU.calculation_method === ค่านี้ (undefined = แสดงเสมอ) */
  visibleWhenCalcMethod?: string;
}

// SeededConfigItem เพิ่ม field:
//   /** สำหรับ datatype "enum" — รายการ option ตามลำดับที่แสดง */
//   readonly options?: ConfigOption[];
```

SI section เพิ่มใน `CONFIG_SECTIONS` (ต่อจาก `pr`):

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
        { value: "average", labelKey: "config.siCostFromOptions.average", visibleWhenCalcMethod: "average" },
        { value: "last_receiving", labelKey: "config.siCostFromOptions.lastReceiving" },
        { value: "last_cost", labelKey: "config.siCostFromOptions.lastCost" },
      ],
    },
  ],
}
```

### 3.3 `resolveConfigOptions` (pure)

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

## 4. Data flow

```
GET /api/business-units → data.config
        │
        ▼  mergeSeededConfig(normalizeConfig(data.config))   (ไม่เปลี่ยนจากเดิม)
   [ ...backend, { key:"si.cost-from", label, datatype:"enum", value:"last_cost" } ]
        │                                       (seed ด้วย defaultValue; options ไม่อยู่ใน array)
        ▼  groupConfigForRender  → ConfigSectionEntry { item, index, labelKey, options? }
        │                                       (options มาจาก registry seeded item)
        ▼  component (มี data.calculation_method + t)
   enum entry → resolveConfigOptions(entry.options, data.calculation_method, entry.item.value)
                  .map(o => ({ value: o.value, label: t(o.labelKey) }))   → prop `options`
        │
        │  user เลือกค่าใหม่ใน Select → config.N.value เปลี่ยน
        ▼  buildPatch(values, original)  (เดิม — JSON diff ทั้ง config array)
   PATCH /api/business-units { config: [ ...ทั้ง array ], doc_version }
```

**คุณสมบัติที่ยังคงเดิม (จาก PR foundation):** seed แบบ pure/locale-independent, ไม่รบกวน backend
จนกว่า user จะแก้ (untouched → `buildPatch` ไม่ส่ง `config`), absolute index ถูกต้อง

## 5. `groupConfigForRender` (แนบ options)

`ConfigSectionEntry` เพิ่ม field:
```ts
  /** สำหรับ enum — options จาก registry (undefined = ไม่ใช่ enum) */
  readonly options?: ConfigOption[];
```
ใน `groupConfigForRender` ตอน push entry แนบ `options: seeded.options` เพิ่มจาก `labelKey` เดิม:
```ts
entries.push({ ...found, labelKey: seeded.labelKey, options: seeded.options });
```

## 6. `ConfigField` (enum branch)

เพิ่ม prop:
```ts
  /** สำหรับ enum — options ที่ resolve แล้ว (value + label i18n) */
  readonly options?: readonly { value: string; label: string }[];
```
ตรรกะ (เพิ่มจาก boolean/text เดิม):
- `const isEnum = item.datatype === "enum" && options != null && options.length > 0;`
- **view mode, enum:** แสดง `options.find(o => o.value === item.value)?.label ?? item.value`
- **edit mode, enum:** render `<Select>` (Radix — import อยู่แล้วในไฟล์) ผูก RHF ผ่าน `Controller`
  บน `config.${index}.value`; แต่ละ `SelectItem` ใช้ `option.value` + แสดง `option.label`
- enum ที่ไม่มี options (เช่น backend-only) → fallback เป็น text input เดิม
- boolean ยัง Switch, string ยัง text input (ไม่เปลี่ยน)

## 7. Rendering (component)

`configGroups.sections.map` เดิม — สำหรับแต่ละ entry ที่มี `options` (enum):
```tsx
const resolved = entry.options
  ? resolveConfigOptions(entry.options, data.calculation_method, entry.item.value)
      .map((o) => ({ value: o.value, label: t(o.labelKey) }))
  : undefined;
// <ConfigField ... label={t(entry.labelKey)} options={resolved} />
```
entry ที่ไม่มี options (เช่น PR boolean) → `options` เป็น undefined, ConfigField ทำงานเดิม
SI section แสดงถัดจาก PR (ตามลำดับ `CONFIG_SECTIONS`) เหนือ section Configuration

## 8. i18n

เพิ่มใน `messages/{en,th}.json` namespace `businessSetting`:

| key | en | th |
|---|---|---|
| `sections.si` | `SI` | `SI` |
| `sections.siDesc` | `Stock In settings for this business unit.` | `การตั้งค่า Stock In ของหน่วยธุรกิจนี้` |
| `config.siCostFrom` | `Default price for added items` | `ราคาเริ่มต้นสำหรับสินค้าที่เพิ่มเข้าไป` |
| `config.siCostFromOptions.average` | `Average` | `เฉลี่ย` |
| `config.siCostFromOptions.lastReceiving` | `Last receiving` | `รับล่าสุด` |
| `config.siCostFromOptions.lastCost` | `Last cost` | `ต้นทุนล่าสุด` |

> `config.siCostFrom` (string) และ `config.siCostFromOptions` (object) เป็น sibling ใต้
> `businessSetting.config` — อยู่ร่วมกับ `config.prAllowDuplicateProduct` (จาก PR) ได้ ไม่ชนกัน

## 9. Testing

- **registry** (`*-config-registry.test.ts`)
  - SI section (`id: "si"`) มี `si.cost-from` datatype `enum`, defaultValue `last_cost`,
    options 3 ตัวเรียงถูก, `average` มี `visibleWhenCalcMethod: "average"`
  - **`resolveConfigOptions`**:
    - `calc = "average"` → คืน 3 options
    - `calc = "fifo"`, current `last_cost` → ตัด `average` → 2 options (`last_receiving`, `last_cost`)
    - `calc = "fifo"`, current `average` → คง `average` (value match) → 3 options
    - `calc = null`, current `last_cost` → ตัด `average` → 2 options
  - **`groupConfigForRender`**: SI entry มี `options` (จาก registry) + `labelKey`; entry ที่ไม่ใช่
    enum (PR) มี `options === undefined`
- **schema** (`*-form-schema.test.ts`)
  - `mergeSeededConfig` seed `si.cost-from` = `{ datatype:"enum", value:"last_cost", ... }`
    เมื่อ backend ไม่มี key
- **`ConfigField`** (`*-ui.test.tsx`, RTL)
  - enum view: แสดง label i18n ของค่าปัจจุบัน (ส่ง options ที่ resolve แล้ว)
  - enum edit: render select (`role="combobox"`) — มี options ตามที่ส่ง
  - enum ไม่มี options → fallback text input (ไม่ crash)
  - boolean/string เดิมยังผ่าน (regression)
- **regression:** เทส PR + เทสเดิมทั้งหมดต้องยังผ่าน

## 10. Verification

- `bunx tsc --noEmit` — ไม่มี error (baseline หลัง PR #42 = 0 error)
- `bun run build` — สำเร็จ
- `bun test:run routes/system-admin/business-setting/` — ผ่านทั้งหมด
- `bun run lint` — ไฟล์ที่แตะไม่มี error ใหม่ (หมายเหตุ: repo มี pre-existing lint errors ใน
  `vendor-management/*` ที่ทำให้ CI `verify` แดงอยู่ก่อนแล้ว — ไม่เกี่ยวกับงานนี้)
- Manual: `/system-admin/business-setting` → เห็น section **SI** พร้อม "ราคาเริ่มต้นสำหรับสินค้าที่
  เพิ่มเข้าไป"; view แสดง label i18n; Edit → Select; BU ที่ calc method = average เห็น 3 ตัวเลือก
  (มี "เฉลี่ย"), BU อื่นเห็น 2 ตัวเลือก; เลือก → Save → reload ค่าคงอยู่; สลับ EN/TH label เปลี่ยน
  และไม่ทำให้ฟอร์ม dirty

## 11. Out of scope / non-goals

- ไม่แก้ backend, `use-business-unit.ts`, `API_ENDPOINTS`, form schema (`BusinessSettingFormValues`)
- ไม่สร้าง generic condition engine — ใช้เงื่อนไข `visibleWhenCalcMethod` เฉพาะ enum option
- ไม่นำค่า `si.cost-from` ไปใช้จริงที่ flow Stock In (เป็น feature แยก) — spec นี้ครอบคลุมแค่
  UI + persist ของ config
- ไม่เปลี่ยน boolean config (PR) จาก Switch → อย่างอื่น
```
