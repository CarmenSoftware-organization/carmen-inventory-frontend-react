# Notification Frontend Redesign — Design

- วันที่: 2026-08-11
- สถานะ: อนุมัติแล้ว รอเขียน implementation plan
- ขอบเขต: `carmen-inventory-frontend-react` เท่านั้น
- ต้นทาง: `carmen-turborepo-backend-v2` PR #324 (`feature/notification-redesign`, ตัดเป็น v2.1.0)
  spec ฝั่ง backend อยู่ที่ `carmen-turborepo-backend-v2/docs/superpowers/specs/2026-08-10-notification-redesign-design.md`

## 1. ปัญหา

backend ยกเครื่อง notification ทั้งท่อแล้ว สัญญาบนสายเปลี่ยน แต่ frontend ยังอ่านของเดิม
ผลคือหน้าจอไม่ error ตรง ๆ แต่ทำงานผิดเงียบ ๆ ทุกจุด ทุกข้อยืนยันจากโค้ดจริงทั้งสองฝั่ง ไม่ใช่การคาดเดา

| จุด | เดิม | ใหม่ | อาการตอนนี้ |
|---|---|---|---|
| ชนิดเอกสาร | `type: "PR"\|"PO"\|"SR"` (VarChar) | `doc_type` (enum 7 ค่า) + `event` (enum 3 ค่า) | `getNotificationHref()` คืน `undefined` ทุกใบ → **deep-link ตายทั้งระบบ** · `NOTIFICATION_TILE[type]` ไม่ match → ไอคอนกลายเป็นกระดิ่งหมด · badge ใน detail dialog เรนเดอร์ `undefined` |
| body ของ mark-read | `{ category }` | `{ source: 'personal' \| 'broadcast' }` | คอลัมน์ `category` ถูก DROP ไปแล้ว → gateway อ่าน `source` ไม่เจอ → route ไปตาราง personal เสมอ → **กดอ่าน broadcast ไม่ติด** |
| envelope ของ list | `{ data }` | `{ data, paginate, summary }` | นับ unread จาก 20 แถวแรกที่ backend ส่งมา → เลขผิด · ไม่มีทางเห็นหน้า 2 |
| payload บน WS | (รูปเดิม) | `{id,title,message,doc_type,event,metadata,user_id}` | ไม่มี `created_at`/`is_read`/`source` → navbar โชว์ **`Invalid Date`** ทันทีที่มีแจ้งเตือนเข้า และแถวนั้นกด mark-read ไม่ถูกตาราง |
| id เอกสารใน metadata | `metadata.pr_id` / `po_id` / `sr_id` | `metadata.id` (จาก `doc_id` ของ envelope) | write path ใหม่ (`buildMetadata`) เขียน `id: input.doc_id` เท่านั้น dispatcher ส่ง `metadata: { action }` มาด้วย — คีย์ `*_id` ไม่ถูกผลิตอีกแล้ว แถวเก่ายังมี |
| คอลัมน์ที่ถูกลบ | `type`, `category`, `is_sent` | — | ยังประกาศอยู่ใน `types/notification.ts` |

นอกจากนั้นยังมีของเดิมที่พังอยู่ก่อนแล้วและงานนี้แก้ไปพร้อมกัน:

- `useNotification` ถือรายการไว้ใน `useState` ที่ป้อนด้วย WS อย่างเดียว **ไม่เคย fetch ตอนเปิดแอปเลย**
  badge จึงเป็น 0 เสมอจนกว่าจะมีใครส่งแจ้งเตือนเข้ามาระหว่างที่หน้าเปิดค้างอยู่
- CustomEvent `notification-sent` ไม่มีใครยิงเลยทั้งโปรเจกต์ มีแต่ hook คอยฟังกับเทสต์ของตัวเอง
- `notification.link` backend ไม่เคยส่งมา ทั้ง serializer และ swagger DTO ไม่มีฟิลด์นี้ →
  ปุ่ม "Open" ใน detail dialog เป็นปุ่มที่ไม่มีวันโผล่

## 2. หลักการออกแบบ

**REST คือแหล่งความจริงเดียว WS เป็นแค่สัญญาณว่า "มีของใหม่ ไปดึงมา"**

payload บน WS มี 6 ฟิลด์ ส่วนแถวจาก REST มี 12 ฟิลด์พร้อม `source`/`is_read`/`created_at`
ถ้าเอา payload WS ยัดเข้ารายการตรง ๆ จะได้แถวพิการที่เรนเดอร์เวลาไม่ได้และ mark-read ไม่ถูกตาราง
การให้ WS ทำหน้าที่ invalidate อย่างเดียวตัดปัญหาทั้งชุดนี้ที่ราก และทำให้ `summary.unread`
กับรายการที่เห็นตรงกันเสมอโดยอัตโนมัติ ต้นทุนคือ refetch ของ query ที่ active อยู่ต่อการแจ้งเตือน
หนึ่งใบ (ปกติ 1 คำขอ — มีแค่ popover; เป็น 2 เมื่อเปิดหน้า `/notifications` ค้างไว้พร้อมกัน) ซึ่งยอมรับได้

**ไม่แตะ backend ในงานนี้** — สัญญาที่ backend ให้มาเพียงพอต่อทุกอย่างที่หน้าจอต้องการแล้ว

**เลขทุกตัวบนจอมาจาก backend ไม่ใช่จากการนับแถวที่มองเห็น** — `summary.unread` และ
`paginate.total` ถูกคำนวณจาก predicate ชุดเดียวกับรายการ การนับเองฝั่ง client จะผิดทันทีที่มีหน้า 2

## 3. สัญญา API ที่ยึด

ยืนยันจาก `apps/backend-gateway/src/notification/notification.controller.ts`,
`swagger/response.ts`, `apps/micro-notification/src/notification/notification-query.service.ts`
และ swagger ของ gateway ที่รันอยู่จริง (`GET http://localhost:4000/swagger/json`)

| endpoint | query | คืน |
|---|---|---|
| `GET /api/notifications` | `page`, `perpage` (ดีฟอลต์ 1/20, เพดาน 100) | `{ data[], paginate, summary }` |
| `GET /api/notifications/unread` | `page`, `perpage` | `{ data[], paginate }` — **ไม่มี `summary` โดยตั้งใจ** เพราะ `unread` จะเท่ากับ `paginate.total` เป๊ะ |
| `GET /api/notifications/recent` | `page`, `perpage` (30 วันล่าสุด) | `{ data[], paginate, summary }` — งานนี้ไม่ใช้ |
| `GET /api/notifications/:id` | — | แถวเดียว |
| `PUT /api/notifications/:id/read` | body `{ source?: 'personal' \| 'broadcast' }` | ok |
| `PUT /api/notifications/mark-all-read` | — | ok |

`paginate` = `{ total, page, perpage, pages }` (ตรงกับ `PaginatedResponse` ใน `types/params.ts` อยู่แล้ว)
`summary` = `{ unread: number, read: number }` — **optional บนสาย** การไม่มีแปลว่า "สร้างค่าสรุปไม่ได้"
ไม่ใช่ศูนย์ (backend สร้างใน `try/catch` เพื่อไม่ให้ค่าสรุปทำรายการล่ม) frontend ต้องรับมือกรณีไม่มีได้

รูปข้อความบน WS (`notification-native.gateway.ts` → `emitNotification`) — ไม่เปลี่ยน handshake:
client ส่ง `{type:"register", user_id}` แล้วรับ `{type:"notification", data:{...}}`

## 4. ชั้นชนิดข้อมูล — `types/notification.ts`

```ts
/** ชนิดเอกสารที่การแจ้งเตือนอ้างถึง — ตรงกับ enum_notification_doc_type ฝั่ง platform schema */
export type NotificationDocType =
  | "system"
  | "business_unit"
  | "purchase_request"
  | "purchase_order"
  | "store_requisition"
  | "good_received_note"
  | "credit_note";

/** เหตุการณ์ที่ทำให้เกิดการแจ้งเตือน — ตรงกับ enum_notification_event */
export type NotificationEvent = "info" | "workflow" | "comment";

/** แถวส่วนตัว (tb_notification) หรือแถวประกาศ (tb_broadcast_notification) — ใช้ route mark-read */
export type NotificationSource = "personal" | "broadcast";

export interface NotificationMetadata {
  /** id เอกสาร — write path ใหม่เขียนที่นี่เสมอ (จาก doc_id ของ envelope) */
  id?: string | null;
  /** คีย์เก่าก่อน redesign — เหลือไว้อ่านแถวประวัติเท่านั้น ไม่มีการผลิตใหม่ */
  pr_id?: string; po_id?: string; sr_id?: string; grn_id?: string; cn_id?: string;
  action?: string;
  current_stage?: string;
  is_fully_approved?: boolean;
  [key: string]: unknown;
}

export interface Notification {
  id: string;
  source?: NotificationSource;
  doc_type?: NotificationDocType | null;
  event?: NotificationEvent | null;
  title?: string | null;
  message?: string | null;
  metadata?: NotificationMetadata | null;
  is_read?: boolean;
  pushed_at?: string | null;
  scheduled_at?: string | null;
  created_at?: string | null;
  from_user_id?: string | null;
  to_user_id?: string | null;
}

export interface NotificationSummary { unread: number; read: number }

export interface NotificationListResponse extends PaginatedResponse<Notification> {
  summary?: NotificationSummary;
}
```

**ลบออก:** `NotificationCategory` · `NotificationEntityType` · ฟิลด์ `type` · `category` · `is_sent` · `link`

`created_at` เป็น nullable บนสายจริง (swagger ประกาศ `nullable: true`) จึงประกาศให้ตรง
และทุกจุดที่เรนเดอร์เวลาต้องกันค่าว่าง — นี่คือรากของ `Invalid Date` ที่เจอ

## 5. ชั้น hook — เขียน `hooks/use-notification.ts` ใหม่ทั้งไฟล์

| hook | หน้าที่ | endpoint |
|---|---|---|
| `useNotificationRealtime(userId)` | เปิด WS คง exponential backoff เดิม (เพดาน 30 วิ) พอได้ `type:"notification"` → `invalidateQueries({ queryKey: [QUERY_KEYS.NOTIFICATIONS] })` **ไม่ถือ state รายการเองอีกต่อไป** | WS |
| `useUnreadNotifications(perpage = 10)` | ป้อน popover ของ navbar — ได้ทั้งแถวและ **เลข badge จาก `paginate.total`** ในคำขอเดียว | `GET /unread` |
| `useNotificationsList(tab)` | `useInfiniteQuery` ของหน้า `/notifications` — `tab="all"` → `GET /`, `tab="unread"` → `GET /unread` คืน `{ items, summary, total, fetchNextPage, hasNextPage }` | `GET /` หรือ `GET /unread` |
| `useMarkNotificationRead()` | mutation ส่ง `{ source }` จากแถว optimistic ตัดแถวออกจาก cache ของ `/unread` + ลด `paginate.total` และ `summary.unread` rollback เมื่อพลาด | `PUT /:id/read` |
| `useMarkAllNotificationsRead()` | mutation + optimistic ล้าง `/unread` | `PUT /mark-all-read` |
| `useNotificationDetail(id)` | คงพฤติกรรมเดิม เปลี่ยนแค่ชนิดข้อมูล | `GET /:id` |

QUERY_KEYS: ทุกคีย์แตกจาก prefix `QUERY_KEYS.NOTIFICATIONS` เดียวกัน (`[NOTIFICATIONS, "unread", page]`,
`[NOTIFICATIONS, "list", tab]`, `[NOTIFICATION_DETAIL, id]`) เพื่อให้ WS invalidate ครั้งเดียวสดทั้งหมด

**พฤติกรรม mark-read ที่เปลี่ยน:** เดิม navbar กรองแถวออกจาก `useState` ของตัวเอง
ใหม่คือ optimistic update บน cache ของ react-query แล้ว invalidate ตาม — ผลที่ผู้ใช้เห็นเหมือนเดิม
(กดแล้วหายจาก popover ทันที) แต่เลข badge กับหน้า `/notifications` อัปเดตตามไปด้วยโดยไม่ต้องรีเฟรช

**ลบ:** listener ของ CustomEvent `notification-sent` ทั้งก้อน (ไม่มีใครยิง)

## 6. `lib/notification-helpers.tsx`

```ts
/** doc_type → base path ของหน้ารายละเอียด — null = ไม่มีหน้าให้ลิงก์ไป */
export const DOC_TYPE_ROUTES: Record<NotificationDocType, string | null> = {
  system: null,
  business_unit: null,
  purchase_request:   "/procurement/purchase-request",
  purchase_order:     "/procurement/purchase-order",
  good_received_note: "/procurement/goods-receive-note",
  credit_note:        "/procurement/credit-note",
  store_requisition:  "/store-operation/store-requisition",
};
```

ทุกเส้นทางยืนยันแล้วว่ามีจริงใน `routes/router.tsx` (บรรทัด 104–116, 166–168)

- `getNotificationHref(n)` — `DOC_TYPE_ROUTES[n.doc_type]` + id จาก `metadata.id` ก่อน
  แล้วค่อย fallback คีย์เก่าตาม doc_type (`pr_id`/`po_id`/`sr_id`/`grn_id`/`cn_id`) สำหรับแถวประวัติ
- `NOTIFICATION_TILE` — map `doc_type` → SubTile glyph ที่มีอยู่แล้วทั้ง 5 ตัว
  (`purchaseRequest`, `purchaseOrder`, `storeRequisition`, `goodsReceiveNote`, `creditNote`)
  `system`/`business_unit` ไม่มี tile → ตกไปที่กระดิ่ง
- `docTypeLabelKey(docType)` — คืน i18n key ของชื่อเอกสาร
- `formatMessage` — คงเดิมทั้งหมด (รวม `safeNavigationHref` ที่กรอง URL อันตราย)

**ลบ:** `isEntityType` · `ENTITY_ROUTES` · `METADATA_ID_KEY` · `getBadgeVariant` และชนิด
`NotificationBadgeVariant` (แทนด้วยป้ายข้อความที่แปลแล้ว ไม่ใช่สีตามชนิดเอกสาร)

## 7. UI

### navbar (`components/navbar/notification.tsx`)

- badge = `paginate.total` จาก `GET /unread` — เลขที่ถูกต้องตั้งแต่วินาทีแรกที่เปิดแอป
  (เดิมเป็น 0 จนกว่าจะมี WS เข้า)
- popover แสดง 10 แถวล่าสุดที่ยังไม่อ่าน + ปุ่ม "อ่านทั้งหมด" + ลิงก์ไปหน้าเต็ม — โครงเดิม
- ปุ่ม ✓ ต่อแถวเรียก `useMarkNotificationRead()` พร้อมส่ง `source` ของแถวนั้น
- detail dialog: badge เปลี่ยนจาก `{data.type}` ดิบเป็นชื่อเอกสารที่แปลแล้ว · **ตัดปุ่ม "Open"
  (external link) ทิ้ง** เพราะ backend ไม่เคยส่ง `link` มา ปุ่มนั้นไม่มีทางแสดงอยู่แล้ว

### หน้า `/notifications` (`routes/notifications/notification-content.tsx`)

- แท็บสองอันพร้อมตัวเลข: `ทั้งหมด` = `paginate.total` ของ `GET /` ·
  `ยังไม่อ่าน` = `summary.unread` ของ `GET /` เมื่อมี ไม่มีก็ถอยไปใช้ `paginate.total` ของ `GET /unread`
  (`summary` เป็น optional บนสาย — ห้ามตีความว่าไม่มี = 0)
- ปุ่ม "ทำเครื่องหมายว่าอ่านทั้งหมด" ในหัวหน้า แสดงเมื่อจำนวนยังไม่อ่าน > 0
- รายการ + ปุ่ม **โหลดเพิ่ม** ท้ายรายการ (`useInfiniteQuery`, `hasNextPage` จาก `paginate`)
- empty state แยกต่อแท็บ ("ยังไม่มีการแจ้งเตือน" vs "อ่านครบแล้ว")
- state ของแท็บไม่ต้องขึ้น URL (เป็น feed ไม่ใช่ list ที่ต้องแชร์ลิงก์)

### แถว (`components/navbar/notification-item-content.tsx`)

- SubTile ตาม `doc_type` + **ตราคอมเมนต์เล็กมุมขวาล่างของ tile เมื่อ `event === "comment"`**
- ป้ายชื่อเอกสารแปลแล้ว (`ใบขอซื้อ` / `Purchase Request`) ไม่ใช่ enum ดิบ
- `created_at` ว่าง → ไม่เรนเดอร์ช่องเวลา ไม่ใช่เรนเดอร์ `Invalid Date`
- จุดน้ำเงินสถานะยังไม่อ่านและการ clamp ข้อความ — คงเดิม

## 8. i18n — `messages/{en,th}.json`

namespace ใหม่ `notifications` รวมคีย์ที่ปัจจุบันปนอยู่ใน `navbar`:

- `docType.system` · `docType.businessUnit` · `docType.purchaseRequest` · `docType.purchaseOrder`
  · `docType.storeRequisition` · `docType.goodReceivedNote` · `docType.creditNote`
- `event.comment` (ใช้เป็น aria-label ของตราคอมเมนต์)
- `tabs.all` · `tabs.unread` · `loadMore` · `markAllRead` · `emptyAll` · `emptyUnread`

คีย์เดิมใน `navbar` ที่ยังใช้จากที่อื่น (`notifications`, `unread`, `dismiss`, `viewAllTooltip`)
คงไว้ที่เดิม ไม่ย้าย เพื่อไม่ให้กระทบคอมโพเนนต์อื่น

## 9. ไฟล์ที่แตะ

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `types/notification.ts` | เขียนใหม่ตามหัวข้อ 4 |
| `hooks/use-notification.ts` | เขียนใหม่ทั้งไฟล์ตามหัวข้อ 5 |
| `lib/notification-helpers.tsx` | map ใหม่ตามหัวข้อ 6 |
| `constant/query-keys.ts` | คีย์ย่อยใต้ prefix `NOTIFICATIONS` |
| `constant/api-endpoints.ts` | เพิ่ม `NOTIFICATIONS_UNREAD` |
| `components/navbar/notification.tsx` | ต่อ hook ใหม่ · badge จาก `paginate.total` · ตัดปุ่ม Open |
| `components/navbar/notification-item-content.tsx` | tile/ป้าย/ตราคอมเมนต์/กัน `created_at` ว่าง |
| `routes/notifications/notification-content.tsx` | แท็บ + โหลดเพิ่ม + อ่านทั้งหมด |
| `messages/en.json`, `messages/th.json` | namespace `notifications` |
| `hooks/__tests__/use-notification.test.ts` | ปรับ mock/assertion ให้ตรงสัญญาใหม่ |
| `components/navbar/__tests__/notification.test.tsx` | เหมือนกัน |

## 10. เทสต์

เทสต์เดิมสองไฟล์ (584 + 295 บรรทัด) mock ตาม shape เดิมทั้งคู่ จะแดงยกชุดแน่นอน

ตามข้อตกลงการทำงานของโปรเจกต์นี้ **ไม่เขียนเคสใหม่ในงานนี้** แต่ต้องมี task ปรับ mock และ
assertion เดิมให้ตรงสัญญาใหม่ — `bun test:run` ต้องเขียว 100% ก่อน merge ไม่ใช่ทางเลือก

gate: `bun run typecheck && bun run lint && bun test:run`

## 11. การตรวจด้วยมือ

ตรวจกับ gateway ที่เครื่อง (`VITE_DEV_PROXY_TARGET=http://localhost:4000 bun dev`) —
ยืนยันแล้วว่า gateway ตัวนี้รันสัญญาใหม่ (swagger มี `enum_notification_doc_type`
และ `NotificationSummaryDto`)

1. เปิดแอป → badge แสดงเลข unread ทันทีโดยไม่ต้องรอ WS
2. กดเข้า notification ของ PR/PO/SR/GRN/CN → เข้าหน้ารายละเอียดถูกใบ
3. กด ✓ บนแถว **broadcast** → หายจาก popover และเลขลด แล้วรีโหลดยังหายอยู่ (พิสูจน์ว่า `source` ส่งถูก)
4. แท็บ "ยังไม่อ่าน" → เลขตรงกับ badge
5. กด "โหลดเพิ่ม" → ได้แถวถัดไป ไม่ซ้ำ ไม่สลับลำดับ
6. ส่งแจ้งเตือนใหม่ระหว่างเปิดหน้าอยู่ → แถวโผล่พร้อมเวลาที่ถูกต้อง ไม่ใช่ `Invalid Date`
7. console ต้องไม่มี error

## 12. ความเข้ากันได้และการนำขึ้น

**FE ชุดนี้ต้องขึ้นหลัง backend v2.1.0 เท่านั้น** — backend รุ่นก่อนหน้าไม่มี `doc_type`/`source`/`summary`
หน้าจะไม่พังแต่จะกลายเป็นรายการไร้ป้ายไร้ลิงก์และ badge เป็นศูนย์ ก่อน deploy แต่ละ environment
ต้องเช็คว่า gateway ของ environment นั้นรันสัญญาใหม่แล้ว (ดู `GET <gateway>/swagger/json`
ว่ามี `enum_notification_doc_type`) — ยืนยันแล้วเฉพาะ gateway ที่เครื่อง ส่วน dev/uat เข้าไม่ถึงจากที่นี่
ต้องเช็คตอน deploy

แถวประวัติในฐานถูก backfill `type` → `doc_type`/`event` ไปแล้วตาม migration ของ backend
ส่วน `metadata` คีย์เก่ายังอยู่ครบ — fallback ในหัวข้อ 6 จึงครอบทั้งแถวเก่าและแถวใหม่

## 13. สิ่งที่จงใจไม่ทำ

- **ฟอร์มสร้าง broadcast + `end_at`** — spec ฝั่ง backend ระบุว่า frontend ต้องเพิ่มช่องนี้
  แต่รีโปนี้ไม่มี UI สร้าง broadcast เลย (ค้นทั้งโปรเจกต์ไม่พบ) หน้าจอนั้นอยู่ที่ `carmen-platform`
  ถ้าที่นั่นยังไม่ได้เพิ่ม `end_at` การสร้างประกาศจะถูกปฏิเสธ — **ต้องแจ้งทีมนั้น เป็นงานแยก**
- **dismiss broadcast** — backend มีคอลัมน์และ filter แล้วแต่ยังไม่มี endpoint ให้เขียน
- **`GET /recent`** — แท็บ "ทั้งหมด" ใช้ `GET /` ซึ่งครอบคลุมกว่า ไม่ต้องมีมุมมอง 30 วัน
- **user preference ปิดรับแจ้งเตือนรายประเภท** · **channel เพิ่ม (SMS/push/LINE)** — ไม่อยู่ในสัญญา backend
- **`notification-template` ใน system-admin** — คนละเรื่อง (tenant schema) ไม่ถูกกระทบ
- **แก้ไข backend** — ไม่แตะ

## 14. ข้อสมมติที่ตัดสินไปแล้ว

- **ตัดปุ่ม "Open" ในหน้า detail** — เป็นโค้ดตาย backend ไม่เคยส่ง `link` มา ถ้าภายหลังต้องการ
  ลิงก์ภายนอกจริง ให้ backend ใส่มาใน `metadata` แล้วค่อยเปิดปุ่มกลับ
- **แท็บไม่ผูกกับ URL** — เป็น feed ไม่ใช่ list ที่ต้องส่งลิงก์ให้กัน
- **badge นับจาก `/unread` ไม่ใช่ `summary`** — `/unread` ให้ทั้งแถวสำหรับ popover และเลขรวม
  ในคำขอเดียว ส่วน `summary` ต้องยิง `GET /` ซึ่ง popover ไม่ได้ใช้ข้อมูลนั้น
