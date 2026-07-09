# Business Setting — PR config section + seeded `pr.allow-duplicate.product`

- **Date:** 2026-07-09
- **Status:** Design approved, ready for implementation plan
- **Scope:** `routes/system-admin/business-setting/` (frontend only) + `messages/{en,th}.json`
- **Page:** `/system-admin/business-setting`

## 1. Problem / Goal

หน้า Business Setting มี section **"Configuration"** ที่ render config ทั้งหมดแบบ
data-driven จาก `data.config` ที่ backend ส่งมา (array ของ
`{ key, label, datatype, value }`). ถ้า backend ไม่ส่ง key ใดมา key นั้นจะไม่ปรากฏบน UI เลย

เราต้องการเพิ่มการตั้งค่าใหม่:

- **section ใหม่ชื่อ `PR`** (Purchase Request) แยกจาก section "Configuration"
- **config key `pr.allow-duplicate.product`**
- **label:** "อนุญาตให้เลือก product ซ้ำกันได้" (th) / "Allow selecting duplicate products" (en)
- **datatype `boolean`** → render เป็น **Switch** (ตาม convention เดิมของ boolean config)
- ค่าที่เลือกต้องถูก **รวมเข้า `config` array ใน payload** และ persist ผ่าน endpoint เดิม
  `PATCH /api/business-units`

ข้อจำกัดปัจจุบัน: config เป็น backend-driven ล้วน ดังนั้น key ที่ backend ยังไม่รู้จักจะไม่โผล่
เราจึงต้องให้ **frontend เป็นผู้ seed** config key นี้

## 2. Decisions (จาก brainstorming)

1. **Frontend seed เอง** — frontend นิยาม config key นี้เป็น "known config" แสดง Switch
   เสมอแม้ backend ยังไม่มีค่า (default `false`) พอ user เปิดแล้ว save ค่าจะถูกเขียนลง
   backend ผ่าน endpoint เดิม (idempotent หลังจากนั้น)
2. **Registry แบ่งตาม section** — สร้าง registry ของ seeded config ที่จัดกลุ่มตาม section
   (เช่น `PR` → `[pr.allow-duplicate.product]`) ขยาย key/section ในอนาคตได้โดยแก้แค่ array
3. **Switch ตาม convention เดิม** — คง `datatype: "boolean"` → `ConfigField` render เป็น Switch
   (มี `checkbox.tsx` ในระบบ แต่ไม่ใช้ เพื่อความสม่ำเสมอกับ boolean config อื่น)
4. **i18n ทั้ง en + th** — label แสดงผลมาจาก `messages/{en,th}.json`

## 3. Architecture

Frontend เท่านั้น ไม่แตะ backend / hook / endpoint. ทั้งหมด colocated ใน
`routes/system-admin/business-setting/`

### 3.1 ไฟล์

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `business-setting-config-registry.ts` | **ใหม่** — registry ของ seeded config จัดกลุ่มตาม section |
| `business-setting-form-schema.ts` | เพิ่ม `mergeSeededConfig`; ให้ `toFormValues` ใช้ merged array |
| `business-setting-component.tsx` | render config เป็นกลุ่มตาม section (partition merged items) |
| `business-setting-ui.tsx` | `ConfigField` รับ prop `label?` (override display label ด้วย i18n) |
| `messages/en.json` / `messages/th.json` | เพิ่ม `businessSetting.sections.pr` / `sections.prDesc` / `config.prAllowDuplicateProduct` |
| `business-setting-form-schema.test.ts` | เพิ่มเทส `mergeSeededConfig` + `buildPatch` กับ seeded item |

### 3.2 Registry (`business-setting-config-registry.ts`)

Single source of truth ของ config ที่ frontend seed:

```ts
export interface SeededConfigItem {
  /** key จริงที่ backend ใช้ */
  key: string;                // "pr.allow-duplicate.product"
  /** ชนิดข้อมูล — "boolean" → Switch (ตาม ConfigField เดิม) */
  datatype: string;           // "boolean"
  /** ค่าเริ่มต้น (string เสมอ ตาม BusinessUnitConfigItem) */
  defaultValue: string;       // "false"
  /** label canonical (EN) ที่ persist ลง backend — locale-independent เพื่อกัน false-dirty */
  label: string;              // "Allow selecting duplicate products"
  /** i18n key สำหรับ "แสดงผล" (relative ต่อ namespace businessSetting) */
  labelKey: string;           // "config.prAllowDuplicateProduct"
}

export interface ConfigSection {
  /** id ภายใน (ไม่แสดงผล) */
  id: string;                 // "pr"
  /** i18n key ของหัวข้อ section (relative ต่อ businessSetting) */
  titleKey: string;           // "sections.pr"
  /** i18n key ของคำอธิบาย section */
  descKey: string;            // "sections.prDesc"
  items: SeededConfigItem[];
}

export const CONFIG_SECTIONS: ConfigSection[] = [
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
```

พร้อม helper ที่ derive จาก registry:

- `SEEDED_ITEMS: SeededConfigItem[]` — flatten ทุก item จากทุก section
- `SEEDED_KEYS: Set<string>` — เซ็ตของ key ที่ registry เป็นเจ้าของ (ใช้ partition ตอน render)
- ฟังก์ชัน lookup: `key → { labelKey } | undefined` (ใช้ resolve display label)

## 4. Data flow

```
GET /api/business-units → data.config  ({} หรือ [ ...items ])
        │
        ▼  mergeSeededConfig( normalizeConfig(data.config) )
   [ ...backend items,  ...seeded items ที่ backend ยังไม่มี key ]
        │                              (seeded item ใช้ defaultValue "false", label canonical)
        ▼
   toFormValues(data).config = merged array
        │   form.values = toFormValues(data)  →  original = toFormValues(data)  →  ไม่ dirty ถ้าไม่แตะ
        │
        │   user toggle Switch → form: config.N.value = "true"
        ▼
   buildPatch(values, original):  JSON.stringify diff ทั้ง config array
        │   (โค้ดเดิมอยู่แล้ว — ส่งทั้ง array เมื่อ item ใดเปลี่ยน)
        ▼
   PATCH /api/business-units  { config: [ ...ทั้ง array รวม PR item ], doc_version }
```

### 4.1 `mergeSeededConfig` (pure)

```ts
export function mergeSeededConfig(
  items: BusinessUnitConfigItem[],
): BusinessUnitConfigItem[] {
  const existing = new Set(items.map((i) => i.key));
  const seeded = SEEDED_ITEMS
    .filter((s) => !existing.has(s.key))
    .map((s) => ({
      key: s.key,
      label: s.label,          // canonical — display จะ override ด้วย i18n
      datatype: s.datatype,
      value: s.defaultValue,
    }));
  return [...items, ...seeded];
}
```

**คุณสมบัติสำคัญ:**

- **Pure / locale-independent** — ไม่พึ่ง `t()`; canonical label คงที่ → diff เสถียร ไม่เกิด
  false-dirty ตอนสลับ locale
- **Idempotent** — ถ้า backend มี key แล้ว (เพราะเคย save) จะใช้ค่าจาก backend ไม่ seed ซ้ำ
- **ไม่รบกวน backend จนกว่า opt-in** — ถ้า user ไม่แตะ checkbox, `values.config === original.config`
  (ทั้งคู่ merged เหมือนกัน) → `buildPatch` ไม่ใส่ `config` ใน payload
- **ลำดับ:** seeded items ต่อท้าย backend items เสมอ (deterministic)

### 4.2 การ persist

- ครั้งแรกที่ user เปิด Switch แล้ว save → ส่งทั้ง config array (backend items เดิม + PR item = `"true"`)
- PATCH replace config array ทั้งก้อน → คง items เดิมไว้ + เพิ่ม PR item
- GET รอบถัดไป backend คืน PR item กลับมา → `mergeSeededConfig` เห็นว่ามี key แล้ว → ไม่ seed ซ้ำ

## 5. Rendering (grouping ตาม section)

เปลี่ยน section "Configuration" เดี่ยว → partition merged items แล้ว render หลายกล่อง

### 5.1 อัลกอริทึม

1. `const merged = mergeSeededConfig(normalizeConfig(data.config))`
2. แนบ **absolute index** ก่อน filter: `merged.map((item, index) => ({ item, index }))`
   (RHF ผูกด้วย `config.${index}.value` โดย index ต้องอ้าง merged array — จึงคำนวณก่อน partition)
3. สำหรับแต่ละ `ConfigSection` ใน registry: filter entries ที่ `SEEDED_KEYS`/section เป็นเจ้าของ →
   render `<SettingSection title={t(section.titleKey)} description={t(section.descKey)}>` (แสดงเฉพาะ
   section ที่มี entry)
4. section "Configuration" เดิม: render entries ที่ key **ไม่อยู่** ใน `SEEDED_KEYS`
   (backend items ที่ไม่รู้จัก — backward-compat) โดยคงข้อความ `configEmpty` เมื่อว่าง

### 5.2 `ConfigField` prop `label?`

- เพิ่ม optional prop `label?: string` ที่ override `item.label` ตอนแสดงผล (ทั้ง view และ edit)
- component ส่ง `label={t(item.labelKey)}` สำหรับ seeded item; backend item ที่ไม่รู้จักไม่ส่ง →
  fallback ไปที่ `item.label` เดิม
- `datatype === "boolean"` ยัง render **Switch** เหมือนเดิม; `description` ยังเป็น `item.key`
  (แสดง `pr.allow-duplicate.product` เป็น helper text)

## 6. i18n

เพิ่มใน `messages/{en,th}.json` namespace `businessSetting`:

| key | en | th |
|---|---|---|
| `sections.pr` | `PR` | `PR` |
| `sections.prDesc` | `Purchase Request settings for this business unit.` | `การตั้งค่า Purchase Request ของหน่วยธุรกิจนี้` |
| `config.prAllowDuplicateProduct` | `Allow selecting duplicate products` | `อนุญาตให้เลือก product ซ้ำกันได้` |

> หมายเหตุ: en ของ `config.prAllowDuplicateProduct` ตรงกับ canonical `label` ใน registry โดยตั้งใจ —
> คนละบทบาท (display i18n vs data-at-rest ที่ persist ลง backend) ยอมรับ duplication เล็กน้อยนี้

## 7. Testing

เพิ่มใน `business-setting-form-schema.test.ts` (Vitest):

- **`mergeSeededConfig`**
  - backend `config: {}` (ผ่าน `normalizeConfig` → `[]`) → ผลมี PR item, `value === "false"`,
    `label` = canonical
  - backend มี `pr.allow-duplicate.product` อยู่แล้ว (`value: "true"`) → ไม่ seed ซ้ำ, ใช้ค่า backend
  - backend มี item อื่นที่ไม่รู้จัก → คงไว้ + ต่อท้ายด้วย seeded item
- **`buildPatch` กับ seeded item**
  - ไม่แตะ PR → `buildPatch(original, original)` ไม่มี key `config`
  - toggle PR (`config.N.value = "true"`) → payload มี `config` เป็น array ที่ PR item = `"true"`
- **regression:** เทสเดิมทั้งหมดต้องยังผ่าน (โดยเฉพาะ "คืน patch ว่างเมื่อไม่มีอะไรเปลี่ยน" —
  แม้ `config: {}` จะถูก seed แต่ original == values จึงไม่ dirty)

## 8. Verification

- `bunx tsc --noEmit` และ `bun test:run` ต้องผ่านทั้งหมด
- `bun run lint` ผ่าน
- Manual: `/system-admin/business-setting` → เห็น section **PR** พร้อม Switch "อนุญาตให้เลือก
  product ซ้ำกันได้" (view = แสดง ใช่/ไม่); กด Edit → เปิด Switch → Save → toast สำเร็จ; reload
  แล้วค่ายังคงอยู่ (persisted); สลับภาษา en/th แล้ว label เปลี่ยนตาม และไม่ทำให้ฟอร์ม dirty

## 9. Out of scope / non-goals

- ไม่แก้ backend, `use-business-unit.ts`, `API_ENDPOINTS`
- ไม่เปลี่ยน boolean config เดิมจาก Switch → Checkbox
- ไม่ทำ generic namespace-prefix grouping (ใช้ registry ที่ระบุ section ชัดเจนแทน)
- ยังไม่นำค่า `pr.allow-duplicate.product` ไปบังคับใช้ที่หน้า PR จริง (เป็น feature แยก) —
  spec นี้ครอบคลุมแค่ UI + persist ของ config เท่านั้น
```
