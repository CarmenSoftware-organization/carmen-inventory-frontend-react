# List Filter Sheet + Saved Views — Design

วันที่: 2026-07-29 · สถานะ: อนุมัติ design แล้ว (รอ implementation plan)

## เป้าหมาย

ทุกหน้า list (~40 หน้า) มี **filter sheet มาตรฐานเดียวกัน** และผู้ใช้**บันทึกชุด filter เป็น
saved view** ได้ 2 ระดับ:

- **User view** — ส่วนตัว ติดตัวข้ามเครื่อง (เก็บ `tb_application_user_config`)
- **BU view** — ทุกคนใน BU เห็น (เก็บ `tb_application_config`, admin ของ BU จัดการ)

## การตัดสินใจที่ปิดไปแล้ว

| ประเด็น | ตัดสินใจ |
|---|---|
| รูปแบบ saved views | หลายชุด ตั้งชื่อได้ ต่อหน้า ต่อ scope (user/BU) |
| User-level storage | ทำ backend API ใหม่ (mirror `app-config`) — ไม่ใช้ localStorage |
| ขอบเขต | spec เดียวครอบทุกหน้า (plan แบ่ง wave) |
| รูปแบบ sheet | curated fields ต่อหน้า (declare ผ่าน registry) — โครงสร้างข้อมูลเผื่อโหมด advanced ทีหลัง |
| สิทธิ์ BU view | `useCan().isAdmin` (system_level ของ BU) เท่านั้นที่สร้าง/แก้/ลบ |
| Default view | **ไม่มี** — เปิดหน้ามาไม่ apply view อัตโนมัติ ผู้ใช้เลือกจาก dropdown เอง |
| SavedView เก็บอะไร | `filters` + `sort` (ไม่รวม perpage / column visibility) |
| Apply semantics | live-apply (แตะ control = query ทันที) ตามพฤติกรรมปัจจุบัน |

## ข้อเท็จจริงของระบบเดิม (สำรวจ + ยืนยันแล้ว)

- filter state อยู่ใน **URL query** (`hooks/use-list-page-state.ts` + `useURL` รายตัวต่อหน้า)
  → URL เป็น source of truth เดิม และ**ยังเป็นต่อไป** ใน design นี้
- ค่าใน URL ส่วนใหญ่เป็น **backend clause เต็มรูป** อยู่แล้ว เช่น
  `department_id|string:id1,id2`, `pr_date|date_range:from,to`, `is_active|bool:true`
  ยกเว้นบางหน้าเก็บ CSV ดิบ (MultiSelectFilter) แล้วห่อ clause เองตอน query
- **Separator ยืนยันแล้ว:** gateway `parseFilterString`
  (`carmen-turborepo-backend-v2 apps/backend-gateway/src/shared-dto/paginate.dto.ts:18`)
  split ทั้ง `;` และ `,` — ชิ้นที่ไม่มี `:` เป็น continuation ของ key ก่อนหน้า (กติกา IN)
  ดังนั้น `;` ที่ frontend join อยู่ถูกต้อง และ comma ภายใน `date_range` รอด
  ข้อจำกัดสืบเนื่อง: **ค่า filter ห้ามมี `;` และชิ้น continuation ห้ามมี `:`** (uuid/date ปลอดภัย)
- operator ที่ micro-business parser รองรับ: `bool` `number` `date` `date_range`
  `contains/like` `enum` + comma→IN (`apps/micro-business/src/libs/paginate.query.ts:305`)
  ไม่มี `!=` `>` `<` — โหมด advanced ในอนาคตต้องแตะ backend
- ตาราง `tb_application_user_config` **มีใน prisma schema แล้ว**
  (`packages/prisma-shared-schema-tenant/prisma/schema.prisma:5300`,
  unique `[user_id, key, deleted_at]`) แต่**ยังไม่มี API** — ต้องสร้าง
- หน้า list แบ่งเป็น 2 กลุ่ม: 19 หน้าใช้ `components/templates/config-list-template.tsx`,
  ~21 หน้า custom (PR/PO/GRN/CN/SR/Product/Vendor/User/…) ต่างมี sheet/toolbar ของตัวเอง
- control ที่ใช้จริงมี 5 ตระกูล: StatusFilter, MultiSelectFilter, lookup
  (`components/filter/filter-{department,requester,stage,workflow}.tsx` ฯลฯ),
  FilterDate (date_range), FilterStage

## สถาปัตยกรรม Frontend

### 1) Field registry ต่อหน้า — `<feature>-filter-fields.ts`

```ts
// ตัวอย่าง: routes/procurement/purchase-request/pr-filter-fields.ts
export const PR_FILTER_FIELDS: FilterFieldDef[] = [
  { key: "filter", control: "status", labelKey: "common.status", options: PR_STATUS_OPTIONS },
  { key: "workflow_current_stage", control: "stage", labelKey: "procurement.purchaseRequest.stage" },
  { key: "workflow", control: "workflow", labelKey: "field.workflow", workflowType: WORKFLOW_TYPE.PR },
  { key: "department", control: "department", labelKey: "field.department" },
  { key: "user_id", control: "requester", labelKey: "common.requester" },
  { key: "pr_date", control: "date-range", labelKey: "field.prDate", fieldKey: "pr_date" },
];
```

`FilterFieldDef` (type ใหม่ใน `types/list-filter.ts`):

- `key` — ชื่อ URL param (ตรงกับที่หน้าใช้อยู่เดิม → migrate แล้ว deep link เก่าไม่พัง)
- `control` — ชนิด control ในตัว: `status` | `multi-select` | `date-range` |
  `department` | `requester` | `stage` | `workflow` | `custom`
- `labelKey` — i18n key สำหรับ label ใน sheet + ป้าย chip
- ต่อ control: `options`, `fieldKey`, `workflowType`, และ `render(value, onChange)`
  สำหรับ `custom` (escape hatch ของหน้า ที่มี control เฉพาะทาง เช่น from/to location)
- `toClause?(value): string` — แปลงค่า URL → backend clause; ค่า default คือ
  ส่งผ่านตรง (สำหรับ field ที่ URL เก็บ clause เต็มอยู่แล้ว) — field แบบ CSV ดิบ
  ต้องประกาศ (เช่น `(v) => v && \`doc_status|enum:${v}\``)

จาก registry เดียว framework ผลิต: sheet UI · active chips · filter string ·
saved-view payload · การเขียน/อ่าน URL

### 2) Hook กลาง — `hooks/use-list-filters.ts`

```ts
const lf = useListFilters({
  pageKey: LIST_PAGE_KEYS.PR,      // constant ใหม่ — ไม่ผูก route path/i18n
  fields: PR_FILTER_FIELDS,
  defaultSort: "pr_no:desc",
});
// lf.values: Record<key, string>       ← อ่านจาก URL (useURL ต่อ field)
// lf.setValue(key, v) / lf.clearAll()  ← เขียน URL + reset page
// lf.filterParam: string | undefined   ← clause ทุก field join ";"
// lf.sortParam: string                 ← sort ปัจจุบัน (URL > defaultSort — view ถูกเขียนลง URL ตอน apply แล้ว)
// lf.activeFilters: ActiveFilter[]     ← chips ป้อน ActiveFilterBar เดิม
// lf.view: { current, isDirty, apply, clear, saveAs, update, rename, remove,
//            userViews, buViews, isLoading, error }
```

- ภายในใช้ `useURL` ต่อ field + `useListPageState` เดิม — ไม่มี state layer ใหม่
- `pageKey` มาจาก `constant/list-page-keys.ts` (string คงที่ เช่น `"pr"`, `"grn"`,
  `"config_currency"`) — rename route/namespace ได้โดย view ลูกค้าไม่หาย

### 3) Components ใหม่ (`components/list-filter/`)

- **`list-filter-sheet.tsx`** — sheet เดียวใช้ทั้ง desktop (side ขวา `w-80 sm:w-96`
  แบบ `pr-filter-sheet` เดิม) และ mobile (side ล่าง ผ่าน `useIsMobile`)
  render field ตาม registry, footer: [ล้างทั้งหมด] [บันทึกเป็น view] [เสร็จ]
  trigger มี badge นับ filter ที่ active
- **`view-selector.tsx`** — dropdown ข้าง search:
  แถว "ไม่ใช้ view" · กลุ่ม "View ของฉัน" · กลุ่ม "View ของ BU" ·
  แถวท้าย "＋ บันทึก filter ปัจจุบันเป็น view"
  เมนู ⋯ ต่อ view: เปลี่ยนชื่อ / อัปเดตด้วย filter ปัจจุบัน / ลบ
  (BU view: ⋯ แสดงเฉพาะ admin)
- **`save-view-dialog.tsx`** — ช่องชื่อ + scope radio (ส่วนตัว / ทั้ง BU เฉพาะ admin)
  ชื่อซ้ำใน scope เดียวกัน → ถามทับหรือเปลี่ยนชื่อ

### 4) Saved view ใน URL — param `sv`

- เลือก view → เขียน `filters` + `sort` ของ view ลง URL **ทั้งชุด (ทับ ไม่ merge)**
  พร้อม `sv=<viewId>` → deep link/back ทำงานเอง
- ใช้ชื่อ `sv` เพราะ `view` ถูกหน้า PR ใช้แล้ว (tab my-pending/all-document)
- `sv` ชี้ view ที่ถูกลบ/ไม่พบ → toast แจ้ง แล้วล้าง `sv` เงียบๆ (ไม่ error)

### 5) Dirty state

- เทียบ `values + sort ปัจจุบัน` กับ `view.filters + view.sort` ทุก render
  โดย **normalize ค่าว่าง ≡ ไม่มี key** (กัน dirty ปลอมจากการล้างค่ากลับ)
- dirty → trigger แสดง "«ชื่อ view» (แก้ไขแล้ว)" + dropdown เพิ่ม 3 action:
  อัปเดต view นี้ (ตามสิทธิ์) / บันทึกเป็น view ใหม่ / ย้อนกลับเป็นค่าของ view
- "ล้างทั้งหมด" ใน ActiveFilterBar → ล้าง filter ทุกตัว **และ** `sv`

## Data model

```ts
// types/list-view.ts
interface SavedView {
  id: string;                       // uuid ฝั่ง client (crypto.randomUUID)
  name: string;
  filters: Record<string, string>;  // key = URL param, value = ค่าตามที่อยู่ใน URL
  sort?: string;                    // "pr_date:desc"
  created_at: string;               // ISO UTC
  created_by_id?: string;
}
interface ListViewsConfigValue { views: SavedView[] }
```

- **เก็บค่าดิบต่อ field ไม่ใช่ filter string สำเร็จรูป** — grammar backend เปลี่ยน
  หรือเพิ่มโหมด advanced ทีหลังได้โดยไม่ migrate ข้อมูลลูกค้า
- **1 config key ต่อ 1 หน้า ต่อ 1 scope**: `list_views_<pageKey>` — จำกัดรัศมี
  ชนกันของการเซฟทับทั้งก้อน (OCC `doc_version` ยังคุมชั้นในสุด)
- cap 50 views ต่อ key — บังคับทั้ง client และ **server**

| | BU view | User view |
|---|---|---|
| ตาราง | `tb_application_config` | `tb_application_user_config` |
| API | มีแล้ว (`useAppConfigByKey`/`useUpsertAppConfig`) | **สร้างใหม่** |
| endpoint | `/api/config/:bu_code/app-config/:key` | `/api/config/:bu_code/app-user-config/:key` |
| เขียนได้ | admin ของ BU (บังคับฝั่ง server ด้วย) | เจ้าของ (user_id จาก JWT) |

## งาน Backend (carmen-turborepo-backend-v2)

ไม่ต้อง migrate DB — ตารางมีแล้ว ทำแค่ทางเข้า mirror จาก `app-config` เดิม:

1. `apps/micro-business/src/app-user-config/` — module + controller + service
   (`GET`/`PUT` by key; where เติม `user_id` เสมอ; ไม่เคยมี row → คืน
   `{ views: [] }` ไม่ใช่ 404 ตาม pattern interface config)
2. `apps/backend-gateway/src/config/config_app-user-config/` — controller + module
   + 1 entry ใน `config/route-config.ts`
3. frontend hook ใหม่ `hooks/use-app-user-config.ts` (mirror `use-app-config.ts`)

**Security invariants:**
- `user_id` มาจาก JWT เท่านั้น — ไม่รับจาก path/body/query
- PUT `list_views_*` บน `app-config` (BU scope): server ตรวจ admin ของ BU
- server ตรวจ shape ของ value (zod: `views` array ≤ 50, ชื่อ ≤ 120 ตัวอักษร,
  `filters` เป็น Record<string,string>) — กัน payload มั่วเข้าตารางกลาง

## การกระจายเข้า ~40 หน้า

| กลุ่ม | วิธี | งานต่อหน้า |
|---|---|---|
| 19 หน้า `ConfigListTemplate` | template รับ prop ใหม่ `pageKey` + `filterFields` แล้ว render ViewSelector + sheet เอง (path `statusOptions` เดิมยังเป็น fallback สำหรับหน้าที่ยังไม่ migrate) | เพิ่ม 2 props + ไฟล์ fields ~15 บรรทัด |
| ~21 หน้า custom | แทน bespoke sheet ด้วย `useListFilters` + `<ListFilterSheet>` + `<ViewSelector>` | แทนที่ sheet เดิม — PR/GRN/SR หนักสุด |

Plan แบ่ง wave: (0) backend API → (1) framework + types + hooks + components
→ (2) นำร่อง PR + 1 หน้า config + browser verify → (3) กวาดที่เหลือเป็นชุดขนาน
→ (4) ลบ bespoke sheet เดิมที่ถูกแทน

## Edge cases

- โหลด views ล้มเหลว → dropdown แสดงแถว "โหลดไม่สำเร็จ — ลองใหม่";
  filter ปกติใช้ได้ไม่ผูกกัน
- ยังไม่มี view → empty state ใน dropdown "ยังไม่มี view — ตั้ง filter แล้วกดบันทึก"
- OCC ชน (`doc_version`) → refetch + retry อัตโนมัติ 1 ครั้ง; ไม่ผ่าน → toast
- BU view ถูก admin แก้ระหว่างที่ user เปิดค้าง → ค่าใหม่มาตอน refetch ปกติ
  (CACHE_STATIC + invalidate หลัง save) ไม่ทำ realtime
- สลับ BU → views เป็นของ BU ใหม่เอง (query key มี buCode อยู่แล้วทั้งสอง hook)

## i18n

namespace ใหม่ `listView` ใน `messages/{en,th}.json` — ชื่อปุ่ม/เมนู/dialog/toast/
empty state ทั้งหมด; label ของ field ใช้ key เดิมที่หน้านั้นมีอยู่แล้ว

## การทดสอบ

- unit: clause encoder ต่อ control type (รวม date_range/IN), dirty comparison
  (เคส normalize ค่าว่าง), `useListFilters`, cap 50
- component: `ListFilterSheet` render จาก registry ครบทุก control,
  `ViewSelector` ครบสถานะ (empty/loading/error/dirty/admin-vs-user)
- backend: controller/service spec mirror ของ app-config + เคส user_id จาก JWT
- **browser จริงกับ gateway :4000**: PR + 1 หน้า config — save/apply/dirty/
  delete/BU-scope/reload/deep-link (`sv`) — บทเรียน list-envelope: jsdom ไม่พอ

## นอกขอบเขต (จงใจ)

- โหมด advanced (field+operator+value builder) — โครงข้อมูลรองรับแล้ว แต่ยังไม่ทำ
- default view อัตโนมัติเมื่อเปิดหน้า (ตัดสินใจ: ไม่มี)
- เก็บ perpage / column visibility ใน view
- แชร์ view ข้าม BU / export-import view
- realtime sync ของ BU view
