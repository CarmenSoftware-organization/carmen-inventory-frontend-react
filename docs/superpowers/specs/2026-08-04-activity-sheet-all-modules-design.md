# Activity sheet — ขยายจาก PR ไปทุกโมดูลที่ backend บันทึกกิจกรรมให้

วันที่: 2026-08-04

## ปัญหา

`PrActivitySheet` ([spec รอบก่อน](2026-08-04-activity-timeline-accordion-design.md)) ตอบคำถาม
"ใครแก้อะไรในเอกสารใบนี้บ้าง" ได้ครบแล้ว — ไทม์ไลน์เรียงล่าสุดขึ้นก่อน กางดู diff รายฟิลด์
และรายการสินค้าที่เปลี่ยนได้ แต่**มีอยู่ที่ใบขอซื้อหน้าเดียว**

ขณะที่ backend (`apps/micro-business/src/common/activity/activity-registry.ts`) บันทึก
กิจกรรมให้ **36 entity** อยู่แล้ว — ทั้งเอกสารธุรกรรม (PO/GRN/CN/SR/SI/SO/PC/SC/RFP/PRT)
และข้อมูลหลัก (Product/Vendor/Location/Unit/Currency/Workflow ฯลฯ) ข้อมูลถูกเก็บครบทุกวัน
โดยไม่มีหน้าจอไหนอ่านมันได้เลยนอกจากหน้า Activity Monitor ของ system admin ซึ่งเป็น
ตารางรวมทั้ง BU ไม่ใช่ประวัติของรายการที่ผู้ใช้กำลังดูอยู่

สำหรับข้อมูลหลักปัญหาหนักกว่าเอกสาร เพราะข้อมูลหลัก**ไม่มี workflow history** เลย —
activity จึงเป็นประวัติเดียวที่มี ถ้าใครแก้ exchange rate ผิดวันนี้ ไม่มีหน้าจอไหนบอกได้ว่า
ใครแก้ แก้จากค่าอะไรเป็นอะไร

## ขอบเขต

เปิด activity ให้ **52 จุดเข้าถึง** ครอบ 20 หน้ารายละเอียด + 32 จุดในแถวของ list
โดยไม่แตะ backend เลย (ข้อมูลมีอยู่แล้ว) และไม่เปลี่ยนพฤติกรรมของ sheet

**นอกขอบเขต**

- ไม่แก้ backend — registry, endpoint, permission ทุกอย่างใช้ของเดิม
- ไม่เปลี่ยนหน้าตา/พฤติกรรมของ sheet (ไทม์ไลน์ · accordion · lazy diff คงเดิมทุกอย่าง)
- ไม่แตะ `routes/system-admin/activity-log/` และ `user-activity/` (คนละหน้า คนละรูปแบบ)
- ไม่เปิดให้ 7 list ที่ backend ไม่ได้บันทึก (ดูตารางท้ายหัวข้อ "จุดเข้าถึง")
- ไม่เพิ่ม action column ให้ list ของ PR (`pr-table.tsx` ไม่มีมาแต่แรก และหน้ารายละเอียด
  มีปุ่มอยู่แล้ว)
- ไม่ยุบ `equipment-category` กับ `recipe-equipment-category` ที่ซ้ำกัน (ดู "หนี้ทางเทคนิค")

## การตัดสินใจด้านการออกแบบ

| ประเด็น | ที่เลือก | เหตุผล |
|---|---|---|
| วิธีแชร์ sheet | **mount ตัวเดียวที่ shell เปิดด้วย CustomEvent** (`openActivity()`) | 52 จุดต่อสายเหลือบรรทัดเดียวต่อจุด · `DataGridRowActions` เรียกเองได้ในไฟล์ตัวเอง ทำให้ 27 list ได้เมนูจากการแก้ไฟล์กลางไฟล์เดียว · repo มี pattern นี้อยู่แล้ว (`dispatchPermissionDenied`) |
| จุด mount | `routes/root-layout.tsx` | sheet ต้องใช้ `useBuCode()` ซึ่งมาจาก profile — mount ที่ `providers.tsx` จะได้คอมโพเนนต์ที่มีอยู่แต่ใช้ไม่ได้ในหน้า login · `KeyboardShortcutsDialog` / `MissingDepartmentDialog` mount ที่นี่อยู่แล้ว |
| แยก host กับ sheet เป็นคนละไฟล์ | แยก | ถ้ารวมไฟล์ ตัว listener จะลาก diff renderer 450 บรรทัดเข้ามาใน chunk ของ shell ตลอดแม้ไม่มีใครกดเปิด — host จึง `lazy()` ตัว sheet ตอนเปิดครั้งแรก |
| เมนูในแถว: opt-in หรือ opt-out | **opt-in ต่อ list** | 7 ใน 34 list ที่ใช้ `useConfigTable` เป็น entity ที่ backend ไม่ได้บันทึก — opt-out จะได้เมนูที่กดแล้วว่างเปล่า · การเปิดสวิตช์ทีละไฟล์คือเอกสารประกอบว่าไฟล์นั้นตรวจแล้ว |
| รูปแบบ option | `activity?: { id, label? }` ตัวเดียวคุมทั้งสวิตช์และป้ายชื่อ | สอง option แยกกันเปิดช่องให้เปิดสวิตช์แต่ลืมป้าย |
| หน้าที่ไม่มีฟอร์มเต็ม (13 หน้า) | เข้าจาก **เมนู ⋯ ในแถว** ไม่ใช่ปุ่มใน edit dialog | dialog 11 ไฟล์ต้องแก้เท่ากัน แต่ได้ Sheet ซ้อน Dialog มาแถม (focus trap ซ้อนกัน · Esc ปิดตัวไหนก่อนกำกวม) |
| หน้าฟอร์มเต็ม 19 หน้า | มีปุ่มในหัวหน้า**ด้วย** ไม่ใช่แค่เมนูในแถว | ผู้ใช้ที่เปิดรายละเอียดอยู่แล้วไม่ควรต้องถอยกลับไปที่ list เพื่อดูประวัติของสิ่งที่อยู่ตรงหน้า |
| `FormToolbar` | เพิ่ม prop `activity` ให้มันเรนเดอร์ปุ่มเอง แทนที่จะยัดผ่าน slot `viewActions` เดิม | 7 หน้าจะได้ปุ่มตำแหน่งเดียวกันโดยไม่ก๊อป JSX ซ้ำ 7 ชุด · `viewActions` เป็น slot อิสระ ใครใส่อะไรก็ได้ ตำแหน่งจะเพี้ยนกันเอง |
| namespace ของข้อความ | **`activity` (namespace ใหม่)** ย้ายออกจาก `procurement.purchaseRequest` | ข้อความเดิมเขียนว่า "…to this **request**" ซึ่งผิดทันทีบนหน้า Vendor · เก็บไว้ที่เดิมจะกลายเป็นหน้า Currency ต้องอ่าน key ของใบขอซื้อ |
| หัวข้อ action ที่ขาด | เติม `cancel` · `void` · `print` · `comment` | สี่ตัวนี้เกิดจริงบนหน้าใหม่ (`purchase-orders.cancel`, GRN/SI/SO void, print ทุกใบ, comment 30 โมดูล) — ไม่เติมแล้วหัวข้อค้างเป็นอังกฤษดิบจาก `humanize` แม้ผู้ใช้สลับเป็นไทย |
| `purchase` / `send_back` ใน map เดิม | **ตัดทิ้ง** | คอลัมน์ `action` เป็น enum `enum_activity_action` ซึ่งไม่มีสองค่านี้ (`schema.prisma:699`) → เขียนลง DB ไม่ได้เลย เก็บไว้ = หัวข้อที่ไม่มีวันแสดง |
| สิทธิ์ | ไม่เพิ่ม gate ฝั่ง frontend | backend guard เป็น `AppIdGuard('activityLog.findAll')` ระดับ app entitlement ไม่ใช่ per-user role — frontend ไม่มีสัญญาณให้ตัดสิน |

**ที่ไม่เลือก**

- **แชร์คอมโพเนนต์แล้วส่ง props ทุกจุด** — ตรงไปตรงมาตามรอย PR เป๊ะ ไม่มี global state
  แต่ต้องเขียน `useState` + render + `lazy()` ซ้ำ 52 จุด จุดละ ~12 บรรทัด รวมโค้ดซ้ำ ~600 บรรทัด
  และ `DataGridRowActions` ซึ่งเป็นใบไม้ลึกใน column def จะต้องรับ callback ไล่ขึ้นไป 3 ชั้น
- **React Context `<ActivityProvider>` + `useActivity()`** — type-safe กว่า event และเทสต์ง่ายกว่า
  (ห่อ provider แทน mock `window`) แต่สร้าง pattern ที่สองสำหรับเรื่องเดียวกันในแอปที่มี
  pattern แบบ event อยู่แล้ว คนอ่านโค้ดจะเจอสองวิธีทำ overlay กลาง
- **ปุ่มใน edit dialog ของ 11 หน้า** — อยู่ติดกับข้อมูลที่กำลังดู แต่ได้ overlay ซ้อน overlay
- **เปิดเมนูให้ทุก list แบบ opt-out** — แก้ไฟล์เดียวจบ แต่ 7 list จะมีเมนูที่เปิดแล้วว่าง

## สถาปัตยกรรม

### `components/share/activity-sheet.tsx` (ใหม่ — ย้ายมาจาก `pr-activity-sheet.tsx`)

เนื้อในเหมือนเดิมทั้งหมด เปลี่ยนแค่สัญญาภายนอกให้เป็นกลาง:

```tsx
interface ActivitySheetProps {
  readonly entityId: string | undefined;
  /** เลขที่เอกสารหรือชื่อรายการ — ขึ้นในคำอธิบายหัว sheet */
  readonly label?: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}
```

ไม่รับ `entityType` เพราะ:

- `useActivityLogByRecord` ยิงด้วย `entity_id` ล้วน (UUID ไม่ซ้ำข้ามตาราง)
- `relationLabel()` อ่าน `entity_type` จาก response ของ endpoint รายตัวอยู่แล้ว

ค่าคงที่ภายในที่เปลี่ยน:

```ts
const ACTION_TITLE_KEY: Record<string, string> = {
  create: "actionCreated",
  update: "actionUpdated",
  delete: "actionDeleted",
  save: "actionSaved",
  submit: "actionSubmitted",
  approve: "actionApproved",
  review: "actionReviewed",
  reject: "actionRejected",
  cancel: "actionCancelled",   // ใหม่ — PO
  void: "actionVoided",        // ใหม่ — GRN / SI / SO
  print: "actionPrinted",      // ใหม่ — ทุกใบที่พิมพ์ได้
  comment: "actionCommented",  // ใหม่ — 30 โมดูลที่มี comment
};

const ALERT_ACTIONS = new Set(["delete", "reject", "cancel", "void"]);
```

`purchase` และ `send_back` ออกจากทั้ง `ACTION_TITLE_KEY` และ `ALERT_ACTIONS` ด้วยเหตุผล
เดียวกัน — ค่าทั้งสองไม่มีใน enum ของคอลัมน์ `action` จึงไม่มีทางถูกบันทึกลง DB

### `components/share/activity-sheet-host.tsx` (ใหม่)

```tsx
export const ACTIVITY_SHEET_EVENT = "open-activity";

/** เปิด activity sheet ของรายการหนึ่ง — เรียกได้จากทุกที่ในแอป */
export function openActivity(id: string, label?: string): void;

/** mount ครั้งเดียวที่ `root-layout.tsx` — ฟัง event แล้วเปิด sheet */
export function ActivitySheetHost(): JSX.Element;
```

`ActivitySheetHost` ถือแค่ `useState<{ id: string; label?: string } | null>` กับ listener
และ render `<Suspense>` + `lazy(() => import("./activity-sheet"))` เฉพาะเมื่อ state ไม่ใช่ `null`

### `components/ui/data-grid/` — เมนูในแถว

```
data-grid-row-actions.tsx   +prop activity?: { id: string; label?: string }
                            → เพิ่ม DropdownMenuItem (ไอคอน History) เรียก openActivity ใน onSelect
columns.tsx                 actionColumn รับ option activity?: { id: (row) => …; label?: (row) => … }
use-config-table.ts         ส่ง option ต่อจาก caller ไปยัง actionColumn
```

เรียก `openActivity` ใน `onSelect` (ไม่ใช่ `onClick`) เพื่อให้ Radix ปิดเมนูและคืน focus
ให้เสร็จก่อน Sheet จะ mount — ไม่งั้นสองตัวแย่ง focus กัน

### `components/ui/form-toolbar.tsx`

```tsx
/** เปิดปุ่ม Activity ในแถบปุ่ม — ไม่ส่ง = ไม่มีปุ่ม */
readonly activity?: { id: string; label?: string };
```

ปุ่มวางถัดจาก `viewActions` ใช้ไอคอน `History` และข้อความ `activity.title` แบบเดียวกับ PR

### ที่ถูกลบ

| ไฟล์ | สิ่งที่หาย |
|---|---|
| `routes/procurement/purchase-request/pr-activity-sheet.tsx` | ลบทั้งไฟล์ (ย้ายไป `components/share/`) |
| `routes/procurement/purchase-request/use-pr-form-actions.ts` | state `showActivity` / `setShowActivity` |
| `routes/procurement/purchase-request/pr-form-dialogs.tsx` | `lazy` import + props `showActivity` / `setShowActivity` |
| `routes/procurement/purchase-request/pr-form.tsx` | prop `showActivity={actions.showActivity}` |

`pr-form-actions.tsx` เก็บปุ่มไว้ที่เดิม เปลี่ยน `onClick` เป็น `openActivity(prId, prNo)`
และตัด prop `onActivity` ออก — สุทธิแล้ว PR **ลด** โค้ดลง

## จุดเข้าถึง

### ในหน้า — 20 หน้า

**กลุ่ม A · ผ่าน `FormToolbar` (7 หน้า)** — เพิ่ม prop ที่ `form-toolbar.tsx` ครั้งเดียว
แล้วแต่ละหน้าส่งบรรทัดเดียว

| หน้า | ไฟล์ |
|---|---|
| Department | `routes/config/department/department-form.tsx` |
| Location | `routes/config/location/location-form.tsx` |
| Physical Count | `routes/inventory-management/physical-count/pc-form.tsx` |
| Credit Note | `routes/procurement/credit-note/cn-header.tsx` |
| Goods Receive Note | `routes/procurement/goods-receive-note/grn-header.tsx` |
| PR Template | `routes/procurement/purchase-request-template/prt-form.tsx` |
| Product | `routes/product-management/product/pd-form-toolbar.tsx` |

**กลุ่ม B · header เฉพาะตัว (12 หน้า)** — วางปุ่มเองในไฟล์ header/toolbar ของหน้านั้น

| หน้า | ไฟล์ | ตำแหน่ง |
|---|---|---|
| Purchase Order | `routes/procurement/purchase-order/po-header.tsx` | ต่อจาก `CommentButton` |
| Store Requisition | `routes/store-operation/store-requisition/sr-header.tsx` | ต่อจาก `CommentButton` |
| Inventory Adjustment (SI/SO) | `routes/inventory-management/inventory-adjustment/ia-form-hero.tsx` | ข้าง `PrintDocumentButton` |
| Spot Check | `routes/inventory-management/spot-check/sc-form.tsx` | แถบปุ่มบน |
| Request for Pricing | `routes/vendor-management/request-price-list/rfp-form.tsx` | แถบปุ่มบน |
| Vendor | `routes/vendor-management/vendor/vendor-form.tsx` | แถบปุ่มบน |
| Price List | `routes/vendor-management/price-list/pl-form.tsx` | แถบปุ่มบน |
| Price List Template | `routes/vendor-management/price-list-template/plt-form.tsx` | แถบปุ่มบน |
| Notification Template | `routes/system-admin/notification-template/noti-tmpl-form.tsx` | แถบปุ่มบน |
| Recipe Category | `routes/operation-plan/category/recipe-category-toolbar.tsx` | แถบปุ่มบน |
| Cuisine | `routes/operation-plan/cuisine/cuisine-toolbar.tsx` | แถบปุ่มบน |
| Workflow | `routes/system-admin/workflow/wf-header.tsx` | แถบปุ่มบน |

**PR (1 หน้า)** — `pr-form-actions.tsx` เปลี่ยนไปเรียก `openActivity` (ไม่นับเป็นหน้าใหม่)

### ในแถวของ list — 32 จุด

**ผ่าน `useConfigTable` (27 list)** — เพิ่ม option `activity` หนึ่งบรรทัดต่อไฟล์

| หมวด | list |
|---|---|
| config (11) | adjustment-type · business-type · credit-note-reason · credit-term · currency · delivery-point · department · extra-cost · location · tax-profile · unit |
| inventory (3) | inventory-adjustment · physical-count · spot-check |
| operation-plan (4) | category (recipe-category) · cuisine · equipment-category · recipe-equipment-category |
| procurement (4) | credit-note · goods-receive-note · purchase-order · purchase-request-template |
| system-admin (3) | notification-template · running-code · workflow |
| vendor-management (2) | request-price-list · vendor |

**เรียก `actionColumn()` ตรง ๆ (4 list)** — ส่ง argument เพิ่มหนึ่งตัว

`store-requisition` · `product` · `price-list` · `price-list-template`

**ปุ่มไอคอนในแถว (1 ไฟล์)** — `routes/product-management/category/tree-node.tsx` ใช้ปุ่ม
`Pencil` / `Trash2` เรียงกันไม่ใช่ dropdown จึงเพิ่มปุ่ม `History` ต่อท้าย ครอบทั้งสาม
ระดับของ tree (category · sub-category · item-group)

### ไม่เปิด — 7 list

| list | เหตุผล |
|---|---|
| `config/certification` · `config/eco` | ไม่มีใน registry (vendor certificate / product eco label ถูกบันทึกเป็น `update` ของ vendor/product แทน) |
| `operation-plan/equipment` · `operation-plan/recipe` | ไม่มีใน registry |
| `system-admin/period` | มีแค่ comment ไม่มี CRUD — เปิดไปจะเห็นแต่ประวัติคอมเมนต์ |
| `system-admin/activity-log` · `system-admin/user-activity` | ตัว log เอง — id ของแถวไม่ใช่ entity id |

## i18n

### namespace ใหม่ `activity` (ลบ `procurement.purchaseRequest.activity*` ทิ้ง)

| key | en | th |
|---|---|---|
| `activity.title` | Activity | กิจกรรม |
| `activity.description` | Everything done to this record, newest first | ทุกอย่างที่เกิดขึ้นกับรายการนี้ ล่าสุดขึ้นก่อน |
| `activity.empty` | No activity recorded yet | ยังไม่มีกิจกรรมที่บันทึกไว้ |
| `activity.noChanges` | Nothing changed | ไม่มีอะไรเปลี่ยน |
| `activity.loadError` | Could not load activity | โหลดกิจกรรมไม่สำเร็จ |
| `activity.added` | added | เพิ่ม |
| `activity.removed` | removed | ลบ |
| `activity.updated` | updated | แก้ไข |

### เติมใน namespace `history` เดิม

| key | en | th |
|---|---|---|
| `history.actionCancelled` | Cancelled | ยกเลิกแล้ว |
| `history.actionVoided` | Voided | ยกเลิกใบแล้ว |
| `history.actionPrinted` | Printed | พิมพ์ |
| `history.actionCommented` | Commented | แสดงความเห็น |

ลบ `history.actionPurchased` และ `history.actionSentBack` ออกจากทั้ง en และ th
พร้อมกับที่ตัดออกจาก `ACTION_TITLE_KEY`

## สถานะ · a11y · สิทธิ์

**สถานะ** — โหลด/ว่าง/ผิดพลาด คงของเดิมทั้งหมด (skeleton 4 แถว · ข้อความ muted ·
ข้อความ destructive) ไม่มีสถานะใหม่

**a11y**

- เมนูในแถวเป็น `DropdownMenuItem` (`role="menuitem"`) มีข้อความกำกับไอคอน
- ปุ่มในหน้าเป็น `<Button>` ปกติ มีทั้งไอคอนและข้อความ
- Sheet มี `SheetTitle` / `SheetDescription` อยู่แล้ว
- **จุดที่ต้องยืนยันในเบราว์เซอร์จริง**: เปิดจาก dropdown แล้ว focus ต้องไปที่ Sheet
  ไม่ใช่เด้งกลับปุ่ม ⋯ — jsdom จับไม่ได้

**สิทธิ์** — ไม่เพิ่ม gate ฝั่ง frontend (ตรงกับที่ PR ทำอยู่วันนี้)

ข้อจำกัดที่ยอมรับ: BU ที่ app ไม่มี entitlement `activityLog.findAll` จะเห็นปุ่มแต่กดแล้ว
เจอ error state — frontend ไม่มีสัญญาณให้ซ่อนปุ่มล่วงหน้า ถ้าจะซ่อนต้องให้ backend ส่ง
entitlement มาก่อน

## เทสต์

- ย้าย `routes/procurement/purchase-request/pr-activity-sheet.test.tsx`
  → `components/share/activity-sheet.test.tsx` (เทสต์เดิมล็อกพฤติกรรม "ไม่ยิง request
  จนกว่าจะกาง" ไว้ ห้ามหาย)
- เพิ่มเทสต์ `activity-sheet-host` หนึ่งชุด: dispatch event แล้ว sheet เปิดพร้อม label ถูกต้อง
- ไม่เขียนเทสต์ใหม่นอกเหนือจากนี้ระหว่าง execute plan — ใช้ `bunx tsc --noEmit`,
  `bun run lint`, `bun test:run` (ของเดิมต้องเขียว 100%) และการตรวจในเบราว์เซอร์แทน

## แผนเฟส

| เฟส | เนื้อหา | ผลลัพธ์ที่ตรวจได้ |
|---|---|---|
| 1 | สร้าง `activity-sheet.tsx` + `activity-sheet-host.tsx` · mount ที่ `root-layout` · ย้าย i18n · เติม/ตัด action key · แปลง PR ให้ใช้ `openActivity` | PR ทำงานเหมือนเดิมทุกอย่าง โค้ดลดลง |
| 2 | `data-grid-row-actions` + `columns` + `use-config-table` · เปิดสวิตช์ 27 list + 4 list ที่เรียก `actionColumn` ตรง · `tree-node` | เมนู ⋯ มี Activity ครบ 32 จุด |
| 3 | `form-toolbar` + 7 หน้ากลุ่ม A | ปุ่มขึ้นครบ 7 หน้า |
| 4 | 12 หน้ากลุ่ม B | ปุ่มขึ้นครบ 20 หน้า |
| 5 | ตรวจในเบราว์เซอร์: focus · ไทย/อังกฤษ · dark mode · เอกสารที่มีประวัติจริง (PO20260500006, SR260800001) | ไม่มี console error |

## หนี้ทางเทคนิคที่บันทึกไว้ (ไม่แก้ในงานนี้)

1. `API_ENDPOINTS.EQUIPMENT_CATEGORIES` กับ `API_ENDPOINTS.RECIPE_EQUIPMENT_CATEGORIES`
   ชี้ URL เดียวกัน (`/config/{buCode}/recipe-equipment-categories`) และมีสองหน้า
   (`operation-plan/equipment-category`, `operation-plan/recipe-equipment-category`)
   แสดงข้อมูลชุดเดียวกัน — เปิดสวิตช์ให้ทั้งคู่ไปก่อน ควรยุบทีหลัง
2. `system-admin/period` ถูกบันทึกเฉพาะ comment ไม่มี CRUD — ถ้าอยากได้ประวัติจริง
   ต้องเติม `buildCrudEntity('tb_period', 'periods')` ที่ registry ฝั่ง backend
3. list ของ PR (`pr-table.tsx`) ไม่มี action column ต่างจาก list อื่นทั้งหมด
