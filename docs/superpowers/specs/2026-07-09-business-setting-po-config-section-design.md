# Business Setting — PO config section + seeded boolean `po.group-by-pr-comment`

- **Date:** 2026-07-09
- **Status:** Design approved, ready for implementation plan
- **Scope:** `routes/system-admin/business-setting/` (registry only) + `messages/{en,th}.json`
- **Page:** `/system-admin/business-setting`
- **Builds on:** `2026-07-09-business-setting-pr-config-section-design.md` (registry + boolean
  Switch foundation) and `...-si-config-section-design.md` (both merged, PRs #42/#43)

## 1. Problem / Goal

เพิ่มการตั้งค่าใหม่:

- **section ใหม่ชื่อ `PO`** (Purchase Order) แยกจาก PR / SI / Configuration
- **config key `po.group-by-pr-comment`** — boolean
- **label:** "เพิ่มการจัดกลุ่มตาม pr comment" (th) / "Group by PR comment" (en)
- **default (seed):** `false`
- ค่าที่เลือกต้อง persist ผ่าน endpoint เดิม `PATCH /api/business-units`

ตรงกับ pattern ของ `pr.allow-duplicate.product` (boolean → Switch) ทุกประการ — **ไม่มีโค้ด
component/schema ใหม่** ต้องแก้แค่ registry data + i18n

## 2. Decisions (จาก brainstorming)

1. **default = `false`** (ตาม convention config switch + `pr.allow-duplicate.product`)
2. **PO = Purchase Order** (ใช้ทำ section description; title แสดง "PO")
3. boolean → **Switch** (ตาม convention เดิม; `ConfigField` รองรับอยู่แล้ว)
4. value canonical + label i18n (locale-independent value กัน false-dirty — เหมือน PR)

## 3. Architecture

Frontend เท่านั้น. ไม่มีโค้ด logic ใหม่ — reuse ทั้งหมด:
- `mergeSeededConfig` seed item อัตโนมัติ (คัดลอก `datatype`/`defaultValue`)
- `groupConfigForRender` จัด PO เป็น section (แนบ `labelKey`; `options` undefined เพราะ boolean)
- `ConfigField` render `datatype === "boolean"` → Switch (view = ใช่/ไม่)
- component map `configGroups.sections` เดิม render PO section
- `buildPatch` ส่งทั้ง config array เมื่อ toggle

### 3.1 ไฟล์

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `business-setting-config-registry.ts` | เพิ่ม `po` section ใน `CONFIG_SECTIONS` |
| `messages/en.json` / `messages/th.json` | `sections.po` / `sections.poDesc` / `config.poGroupByPrComment` |
| `business-setting-config-registry.test.ts` | เทส PO section (boolean, default false) |

### 3.2 Registry entry

เพิ่มใน `CONFIG_SECTIONS` (ต่อจาก object ของ `si`):

```ts
{
  id: "po",
  titleKey: "sections.po",
  descKey: "sections.poDesc",
  items: [
    {
      key: "po.group-by-pr-comment",
      datatype: "boolean",
      defaultValue: "false",
      label: "Group by PR comment",
      labelKey: "config.poGroupByPrComment",
    },
  ],
}
```

## 4. i18n

เพิ่มใน `messages/{en,th}.json` namespace `businessSetting`:

| key | en | th |
|---|---|---|
| `sections.po` | `PO` | `PO` |
| `sections.poDesc` | `Purchase Order settings for this business unit.` | `การตั้งค่า Purchase Order ของหน่วยธุรกิจนี้` |
| `config.poGroupByPrComment` | `Group by PR comment` | `เพิ่มการจัดกลุ่มตาม pr comment` |

> `config.poGroupByPrComment` เป็น sibling ใต้ `businessSetting.config` ร่วมกับ
> `prAllowDuplicateProduct` / `siCostFrom` / `siCostFromOptions` — ไม่ชนกัน

## 5. Testing

- **registry** (`business-setting-config-registry.test.ts`): PO section (`id: "po"`) มี
  `po.group-by-pr-comment` datatype `boolean`, defaultValue `false`, labelKey
  `config.poGroupByPrComment`
- **regression (ต้องแก้ 1 จุด):** `business-setting-config-registry.test.ts:43` มี
  `expect(groups.sections).toHaveLength(2)` (นับ pr+si) — การเพิ่ม PO ทำให้เป็น 3 → เทสพัง
  แก้ให้ robust: `expect(groups.sections).toHaveLength(CONFIG_SECTIONS.length)` (mergeSeededConfig([])
  seed ทุก section จึงเท่ากับจำนวน section ใน registry เสมอ — ไม่พังอีกเมื่อเพิ่ม config ในอนาคต)
- **regression (ผ่านอยู่แล้ว):** schema `mergeSeededConfig` tests assert แบบ per-key (จาก SI fix)
  จึง robust; test อื่นที่อ้าง `sections[0]`/`other` (เช่น absolute-index) ยังถูก เพราะ pr ยังเป็น
  section แรกและ index ของ backend item ไม่เปลี่ยน

## 6. Verification

- `bunx tsc --noEmit` — 0 errors
- `bun run build` — สำเร็จ
- `bun test:run routes/system-admin/business-setting/` — ผ่านทั้งหมด
- Manual: `/system-admin/business-setting` → เห็น section **PO** พร้อม "เพิ่มการจัดกลุ่มตาม
  pr comment" (view = ใช่/ไม่); Edit → Switch; toggle → Save → reload ค่าคงอยู่; สลับ EN/TH
  label เปลี่ยน และไม่ทำให้ฟอร์ม dirty

## 7. Out of scope / non-goals

- ไม่แก้ backend, hooks, endpoint, form schema, `ConfigField`, component, `mergeSeededConfig`,
  `groupConfigForRender` (reuse ทั้งหมด)
- ไม่นำค่า `po.group-by-pr-comment` ไปใช้จริงที่ flow PO (feature แยก) — spec นี้ครอบคลุมแค่
  UI + persist ของ config
