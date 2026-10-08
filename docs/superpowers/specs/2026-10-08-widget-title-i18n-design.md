# Widget title หลายภาษา (EN default) — design

**วันที่:** 2026-10-08 · **สถานะ:** รอ user รีวิว spec
**repo:** carmen-turborepo-backend-v2 (prisma schema ×2 · gateway · micro-cluster) · micro-data · carmen-platform · carmen-inventory-frontend-react
**FE branch:** `feature/widget-title-i18n`

## 1. เป้าหมาย

title ของ dashboard widget แสดงตามภาษาของ UI (`en` / `th` — `i18n/config.ts`) โดย EN เป็นค่า default

### ข้อตกลงกับผู้ใช้

- **ทั้งสองทาง (C):** ชื่อตั้งต้นของ widget (ชื่อ dataset) แปลตาม locale และถ้ามีคนตั้ง title เองก็ตั้งแยกได้ทีละภาษา
- **ทั้ง 3 ระดับ (A):** template ของ platform (`tb_dashboard_widget_template`), widget ของ BU (`tb_dashboard_bu_widget`) และ widget ส่วนตัว (`tb_dashboard_personal_widget`) ค่าภาษาไทยต้องตามไปตอน deploy template ลง BU
- **รูปข้อมูล jsonb `{ en, th? }` (แนวทาง 2)** ไม่ใช้คอลัมน์ `title_th` แยก
- **rollout แบบ expand/contract** ห้าม `ALTER COLUMN title TYPE jsonb` ตรง ๆ เพราะ GORM (`*string`) และ Prisma client ที่ generate ไว้จะพังทันทีที่ migration รัน
- **API ไม่ break:** `title` (string) ยังอยู่ใน response ข้าง ๆ `title_i18n` ใหม่ (§3)

### นอกขอบเขต

- ขั้น contract (drop `title` string → rename `title_i18n` เป็น `title`) เป็นงานแยก ทำหลังทุก env นิ่งแล้ว
- ภาษาที่สาม รูปข้อมูลรองรับได้ แต่ validator รับแค่ `en` / `th` จนกว่าจะเพิ่มเข้า `SUPPORTED_LOCALES`
- คำแปลของ dataset ที่ผู้ใช้ promote เองจาก SQL Workbench (id ไม่ตายตัว) ให้ fallback ไปใช้ `meta.name`
- mobile (ไม่ใช้ widget)

## 2. Schema (expand)

เพิ่มคอลัมน์ในทั้ง 3 ตาราง:

```sql
ALTER TABLE <table> ADD COLUMN title_i18n jsonb NULL;
UPDATE <table> SET title_i18n = jsonb_build_object('en', title)
  WHERE title IS NOT NULL AND btrim(title) <> '';
```

- `tb_dashboard_widget_template` → `prisma-shared-schema-platform`
- `tb_dashboard_bu_widget`, `tb_dashboard_personal_widget` → `prisma-shared-schema-tenant` (ตาราง tenant ต้องรันทุก BU schema และต้องเช็กด้วยว่า micro-data มี migration ของตัวเองที่แตะตารางเหล่านี้หรือเปล่า — `micro-data/migrations/tenant/`)
- คอลัมน์ `title` เดิม**ไม่แตะ** ระหว่างช่วงเปลี่ยนผ่านทุกการเขียนต้อง dual-write `title = title_i18n.en` เพื่อให้ rollback โค้ดได้โดยข้อมูลไม่หาย

รูปข้อมูล: `{ "en": string, "th"?: string }`
- `en` บังคับเมื่อ object ไม่เป็น null
- key ที่รับได้: `en`, `th` (key อื่นตอบ 422)
- ค่า: trim แล้วยาวไม่เกิน 255 สตริงว่างถือว่าไม่มี key นั้น
- ถ้าตัด key ว่างออกแล้วไม่เหลืออะไรเลย ให้เก็บเป็น `null` (กลับไปใช้ชื่อตั้งต้น)

## 3. API contract

ใช้กับ template (platform), BU widget, personal widget และ system widgets

**Response**
- `title: string | null` — คงไว้ ค่า = `title_i18n?.en ?? title`
- `title_i18n: { en: string; th?: string } | null` — ใหม่

**Request (create / update)**
- `title_i18n` (object หรือ `null`) เป็นช่องทางหลัก ส่งมาเมื่อไหร่ให้ replace ทั้งก้อน
- ถ้าส่งมาแค่ `title` (string, client เก่า) → merge: `{ ...existing, en: title }` เพื่อไม่ให้ client เก่าลบค่า `th` ทิ้ง ถ้า `title` เป็นค่าว่าง/`null` → `title_i18n = null`
- ส่งมาทั้งคู่ → ใช้ `title_i18n` แล้วไม่สนใจ `title`
- ตรวจ validation ที่ gateway (class-validator/zod ตามแบบเดิมของ DTO นั้น ๆ) และตรวจซ้ำใน micro-data / micro-cluster ก่อนเขียน

**เหตุผลที่ไม่เปลี่ยน `title` เป็น object:** ถ้า BE ขึ้นก่อน FE ตัวเก่าจะ render `{widget.title}` ที่เป็น object แล้ว React throw "Objects are not valid as a React child" ทำให้หน้า dashboard พังทั้งหน้า

## 4. เส้นทางของข้อมูลและจุดที่ต้องแก้

| ชั้น | ไฟล์ | งาน |
|---|---|---|
| platform UI | carmen-platform `src/pages/dashboardTemplates/TemplateEditDialog.tsx` + `src/i18n/{en,th}.ts` + `src/types/index.ts` | ช่อง title แยก EN / TH ส่ง `title_i18n` |
| gateway (platform) | `src/common/dto/dashboard-template/dashboard-template.dto.ts`, `platform_dashboard-templates/swagger/response.ts` | DTO + validator + swagger |
| micro-cluster | `src/cluster/dashboard-template/dashboard-template.service.ts` + `.types.ts` | อ่าน/เขียน `title_i18n` + dual-write `title` |
| deploy | gateway `platform_dashboard-templates/dashboard-template-deploy.service.ts` | ส่ง `title_i18n` ต่อไปพร้อม `title` |
| micro-data | `model/dashboard.go` (struct ×4), `db/widget_repo.go:247` (column list), `service/widget_service.go:147` (update fields) | เพิ่ม `TitleI18n` (`datatypes.JSON` / `*json.RawMessage`) + merge ตาม §3 + dual-write |
| gateway (BU / personal) | `application/dashboard-widgets/dashboard-bu-widgets.controller.ts`, `dashboard-personal-widgets.controller.ts` | DTO / swagger ส่งผ่าน `title_i18n` |
| system widgets | `system-widget-cache.service.ts`, `system-widget-config.type.ts`, `system-widgets.controller.ts` | อ่าน `title_i18n` แล้วส่งออกทั้งสองฟิลด์ |
| FE | §5 | |

ต้องเช็ก serializer ของ gateway ทั้ง micro และ gateway `@Serialize` response schema ไม่งั้น GET จะตัด `title_i18n` ทิ้ง (memory: backend-add-field-serializer-gotcha)

## 5. Frontend (รีโปนี้)

### 5.1 Type

`types/dashboard-widget.ts`:

```ts
export interface LocalizedTitle {
  readonly en: string;
  readonly th?: string;
}
```

เพิ่ม `title_i18n?: LocalizedTitle | null` ใน `WidgetConfig`, `CreateWidgetDto`, `UpdateWidgetDto` และ type ของ BU/system widget ที่มี `title` (ไม่ใช้ `LocalizedDashboardText` ของ accounting เพราะตัวนั้นบังคับ `th`)

### 5.2 Helper กลาง

`components/dashboard-widget/widget-title.ts` — `resolveWidgetTitle({ widget, datasetName, locale, translateDataset })` เป็น pure function

ลำดับ fallback:
1. `title_i18n[locale]`
2. `title_i18n.en`
3. `title` — **ยกเว้น**กรณีที่ค่าตรงกับ `datasetName` ทุกตัวอักษร ให้ถือว่า "ยังไม่ได้ตั้งเอง" (widget เก่าที่ถูกแช่ชื่อ dataset ภาษาอังกฤษไว้ตอนสร้าง) แล้วข้ามไปข้อ 4
4. คำแปล `dashboard.datasets.<dataset_id>` (ใช้ `t.has()` ก่อน)
5. `datasetName` (`meta.name` / `dataset.name` จาก catalogue)
6. `dataset_id`

แทนที่ fallback ที่เขียนแยกกันอยู่ตอนนี้:
- `components/dashboard-widget/sortable-widget-item.tsx:112` (`displayTitle` → การ์ด + `aria-label` ×3 + `UnsupportedCard`)
- `components/dashboard-widget/bu-widget-section.tsx:255` (ชื่อใน dialog ยืนยันการลบ)
- `components/dashboard-widget/dashboard-widget-grid.tsx:421` (system / personal grid)

### 5.3 สร้าง widget ไม่แช่ชื่อ dataset

`bu-widget-section.tsx:152,174` เลิกส่ง `title: ds.name` ตอนสร้าง (ปล่อยเป็น null) จุดอื่นที่สร้าง widget (personal grid) ให้ทำแบบเดียวกัน ตรวจด้วย `graft grep "title:"` ในโฟลเดอร์ `components/dashboard-widget` และ `routes/dashboard`

### 5.4 ช่องแก้ title ใน `WidgetConfigDialog`

- เพิ่มส่วน "Title" ไว้บนสุดของ dialog มี input 2 ช่อง คือ **EN** และ **TH (ไม่บังคับ)** placeholder = ชื่อตั้งต้นที่แปลแล้วของ locale นั้น
- ค่าเริ่มต้นมาจาก `widget.title_i18n` ถ้าไม่มีแต่มี `title` ที่ไม่ตรงกับชื่อ dataset → `{ en: title }`
- ตอนบันทึก: trim แล้วถ้าว่างทั้งคู่ → `title_i18n: null` ถ้ามี TH แต่ไม่มี EN → บล็อกปุ่ม Save และแสดงข้อความใต้ช่อง EN
- signature ของ `onSubmit` เพิ่ม `titleI18n` ตัว caller (BU section + personal grid) ส่งต่อเข้า update DTO
- preview ใช้ `resolveWidgetTitle` กับค่าที่กำลังพิมพ์
- ใช้ primitive จาก `components/ui/` (`Input`, `Label`) ห้ามตั้งค่าสี/ขนาดใหม่ที่ call site (`docs/DESIGN.md`)

### 5.5 คำแปล

- `messages/{en,th}.json` เพิ่ม `dashboard.datasets.<dataset_id>` ของ dataset ระบบทุกตัว (ดึงรายการ id จริงจาก catalogue ตอนเขียน plan) dataset id มีจุด (`rfp.active`) ซึ่ง use-intl อ่านเป็น path ซ้อน จึงต้องแปลงเป็น key ที่ไม่มีจุด (เช่นแทน `.` ด้วย `_`) ใน helper
- label ใหม่ของ dialog: `dashboard.savedWidget.title*` (EN/TH, hint, error)
- ห้ามใส่ `{{` `}}` ในข้อความ (ICU, memory: icu-messages-cannot-contain-braces) และต้องผ่าน key-parity test

## 6. ลำดับ deploy

1. migration expand (platform + tenant ทุก BU) — backup ตารางทั้ง 3 ก่อน
2. micro-data + backend-v2 (gateway, micro-cluster)
3. carmen-platform + FE (`vercel --prod`)

ทุกขั้นถอยกลับได้ทีละขั้น ถ้า BE ขึ้นแล้วแต่ FE ยังเป็นตัวเก่า FE เก่าจะอ่าน `title` string ได้ตามปกติ และ client เก่าที่บันทึก title จะไม่ลบค่า TH เพราะเป็น merge (§3)

## 7. การตรวจสอบ

- ตามค่าตั้งของผู้ใช้ plan จะ**ไม่**มีขั้นเขียนเทสต์ใหม่ แต่ต้องรัน typecheck + lint ทุกรีโป และเทสต์เดิมต้องยังผ่าน (FE `bun test:run` · backend `jest` · micro-data `go test ./...`)
- ตรวจด้วยมือ:
  - curl: create/update ด้วย `title_i18n`, ด้วย `title` อย่างเดียว (ต้องไม่ลบ `th`), ด้วย `{th}` อย่างเดียว (ต้อง 422) และ GET ต้องมีทั้ง `title` และ `title_i18n`
  - platform: สร้าง template สองภาษา → deploy ลง BU → BU widget ต้องได้ `title_i18n` ครบ
  - เบราว์เซอร์ (FE) ทั้ง `en` และ `th`: widget ที่ไม่ตั้ง title แสดงชื่อ dataset ที่แปลแล้ว, widget ที่ตั้งเฉพาะ EN แสดง EN ทั้งสองภาษา, widget สองภาษาสลับตาม locale, widget เก่าที่ title = ชื่อ dataset แสดงคำแปล
