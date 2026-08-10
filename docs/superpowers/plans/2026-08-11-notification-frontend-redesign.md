# Notification Frontend Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ทำให้หน้า notification ของ frontend ตรงกับสัญญาใหม่ของ backend v2.1.0 (`doc_type`+`event`, `source`, `paginate`, `summary`) และยกเครื่องให้ REST เป็นแหล่งความจริงเดียวโดยมี WebSocket เป็นแค่สัญญาณ invalidate

**Architecture:** เลิกเก็บรายการแจ้งเตือนไว้ใน `useState` ของ hook แล้วย้ายไปอยู่บน TanStack Query ทั้งหมด — WS ทำหน้าที่เดียวคือ `invalidateQueries` เมื่อมีข้อความเข้า ทุกตัวเลขบนจอ (badge, จำนวนต่อแท็บ) มาจาก `paginate.total` / `summary.unread` ที่ backend คำนวณด้วย predicate ชุดเดียวกับรายการ ไม่ใช่จากการนับแถวที่มองเห็น

**Tech Stack:** React 19 · TypeScript · TanStack Query v5 (`useQuery` / `useInfiniteQuery` / `useMutation`) · React Router 7 · use-intl · Tailwind 4 · Vitest

**Spec:** `docs/superpowers/specs/2026-08-11-notification-frontend-redesign-design.md`

## Global Constraints

- **ห้ามเขียนไฟล์เทสต์ใหม่** (`*.test.ts` / `*.test.tsx`) และ **ห้ามทำ TDD** ในแผนนี้ — ตามข้อตกลงการทำงานของผู้ใช้ งานคือ implement → typecheck → commit เทสต์ที่มีอยู่แล้วสองไฟล์ต้อง **ปรับให้ตรงสัญญาใหม่** (Task 5) ไม่ใช่เพิ่มเคสใหม่
- **gate ของทุก task:** `bunx tsc --noEmit` ต้องผ่าน · `bun run lint` ต้องไม่มี error ใหม่ · หลัง Task 5 เป็นต้นไป `bun test:run` ต้องเขียว 100%
- **ทุก task ต้องทิ้ง tree ที่คอมไพล์ผ่าน** — นี่คือเหตุผลที่ Task 1 เพิ่มฟิลด์ใหม่แบบ additive แล้วค่อยลบฟิลด์เก่าใน Task 6 ห้ามลบ `type` / `category` / `is_sent` / `link` ก่อน Task 6
- **commit message เขียนภาษาไทย** ตาม CLAUDE.md ของโปรเจกต์ · ทำงานบน branch `feature/notification-frontend-redesign` · ห้าม push เอง
- **ห้ามแตะ backend** — `carmen-turborepo-backend-v2` อยู่นอกขอบเขตทั้งหมด
- **ห้ามใส่ `"use no memo";`** ในไฟล์ใดในแผนนี้ — ไม่มี `DataGrid` เข้ามาเกี่ยวข้อง
- ทุกเวลาที่แสดงผลแปลงจาก ISO 8601 UTC ที่ backend ส่งมาด้วย `toLocaleString` ตามกฎ TIMEZONE — ห้าม format ฝั่งอื่น
- ชื่อเอกสารในภาษาไทย/อังกฤษ **ใช้ซ้ำจาก namespace `modules`** ที่มีอยู่แล้ว ห้ามแปลคำใหม่ให้ต่างจากเมนู

## File Structure

| ไฟล์ | ความรับผิดชอบ | Task |
|---|---|---|
| `types/notification.ts` | ชนิดข้อมูลบนสาย: `Notification`, `NotificationDocType`, `NotificationEvent`, `NotificationSource`, `NotificationSummary`, `NotificationListResponse` | 1, 6 |
| `constant/api-endpoints.ts` | เพิ่ม `NOTIFICATIONS_UNREAD` | 1 |
| `messages/{en,th}.json` | namespace `notifications` (แท็บ/ปุ่ม/ป้ายที่ยังไม่มี) | 1 |
| `lib/notification-helpers.tsx` | ตรรกะบริสุทธิ์: doc_type → route / tile / คีย์ i18n และ `formatMessage` | 2, 6 |
| `components/navbar/notification-item-content.tsx` | เนื้อแถวที่ navbar และหน้าเต็มใช้ร่วมกัน | 2 |
| `hooks/use-notification.ts` | ชั้นข้อมูลทั้งหมด: realtime, unread, list, mutations, detail | 3 |
| `components/navbar/notification.tsx` | popover + badge + detail dialog | 2, 3, 6 |
| `routes/notifications/notification-content.tsx` | หน้าเต็ม: แท็บ + โหลดเพิ่ม + อ่านทั้งหมด | 3, 4 |
| `hooks/__tests__/use-notification.test.ts` | ปรับให้ตรง hook ใหม่ | 5 |
| `components/navbar/__tests__/notification.test.tsx` | ปรับให้ตรง shape ใหม่ | 5 |

**การตัดสินที่ล็อกไว้ตรงนี้ (spec กำกวม — แผนเลือกให้ชัด):** แถวในรายการ **ไม่มี** ป้ายชื่อเอกสารแยกต่างหาก เพราะ SubTile บอกชนิดเอกสารอยู่แล้วและ `title` จาก backend ก็ขึ้นต้นด้วยชื่อเอกสารเสมอ — ตรงกับภาพตัวอย่างที่ผู้ใช้อนุมัติ ป้ายชื่อเอกสารที่แปลแล้วอยู่ที่ **detail dialog** ที่เดียว

---

### Task 1: ชั้นชนิดข้อมูล endpoint และ i18n

**Files:**
- Modify: `types/notification.ts` (เขียนทับทั้งไฟล์)
- Modify: `constant/api-endpoints.ts:155` (เพิ่มบรรทัดถัดจาก `NOTIFICATIONS`)
- Modify: `messages/en.json`, `messages/th.json` (เพิ่ม namespace `notifications` ระดับบนสุด)

**Interfaces:**
- Consumes: `PaginatedResponse<T>` จาก `@/types/params`
- Produces: `NotificationDocType`, `NotificationEvent`, `NotificationSource`, `NotificationMetadata`, `Notification`, `NotificationSummary`, `NotificationListResponse` · `API_ENDPOINTS.NOTIFICATIONS_UNREAD: string` · คีย์ i18n `notifications.*`

- [ ] **Step 1: เขียน `types/notification.ts` ใหม่ทั้งไฟล์**

ฟิลด์เก่าสี่ตัวยังอยู่และมี `@deprecated` กำกับ — จะถูกลบใน Task 6 หลังจากไม่มีใครอ้างถึงแล้ว
ห้ามลบตอนนี้ เพราะจะทำให้ 4 ไฟล์คอมไพล์ไม่ผ่านทันที

```ts
import type { PaginatedResponse } from "@/types/params";

/**
 * ชนิดเอกสารที่การแจ้งเตือนอ้างถึง — ตรงกับ `enum_notification_doc_type` ฝั่ง platform schema
 * (`system`/`business_unit` คือประกาศ ไม่ผูกกับเอกสารใด)
 */
export type NotificationDocType =
  | "system"
  | "business_unit"
  | "purchase_request"
  | "purchase_order"
  | "store_requisition"
  | "good_received_note"
  | "credit_note";

/** เหตุการณ์ที่ทำให้เกิดการแจ้งเตือน — ตรงกับ `enum_notification_event` */
export type NotificationEvent = "info" | "workflow" | "comment";

/**
 * แหล่งของแถว — `personal` = `tb_notification`, `broadcast` = `tb_broadcast_notification`
 * ต้องส่งกลับไปใน body ของ mark-read เพื่อให้ backend เขียนลงตารางที่ถูก
 */
export type NotificationSource = "personal" | "broadcast";

/**
 * Metadata ที่ backend แนบมา — write path ใหม่เขียน id เอกสารไว้ที่ `id` เสมอ
 * ส่วนคีย์รายเอกสารเป็นของแถวก่อน redesign ที่ยังค้างอยู่ในฐาน ไม่มีการผลิตใหม่
 */
export interface NotificationMetadata {
  /** id เอกสาร (จาก `doc_id` ของ envelope) — คีย์หลักที่ใช้สร้าง deep-link */
  id?: string | null;
  /** @deprecated คีย์เก่าก่อน redesign — อ่านเป็น fallback ของแถวประวัติเท่านั้น */
  pr_id?: string;
  /** @deprecated ดู `pr_id` */
  po_id?: string;
  /** @deprecated ดู `pr_id` */
  sr_id?: string;
  /** @deprecated ดู `pr_id` */
  grn_id?: string;
  /** @deprecated ดู `pr_id` */
  cn_id?: string;
  action?: string;
  current_stage?: string;
  is_fully_approved?: boolean;
  [key: string]: unknown;
}

/** แถวการแจ้งเตือนหนึ่งใบตามที่ gateway ส่งมา (รวมทั้งแถวส่วนตัวและแถวประกาศ) */
export interface Notification {
  id: string;
  source?: NotificationSource;
  doc_type?: NotificationDocType | null;
  event?: NotificationEvent | null;
  title?: string | null;
  message?: string | null;
  metadata?: NotificationMetadata | null;
  is_read?: boolean;
  /** เวลาที่ถูก emit ขึ้น WS — null = ยังไม่เคย emit (เช่นยังตั้งเวลาอยู่) */
  pushed_at?: string | null;
  scheduled_at?: string | null;
  /** nullable บนสายจริง — ทุกจุดที่แสดงเวลาต้องกันค่าว่าง */
  created_at?: string | null;
  from_user_id?: string | null;
  to_user_id?: string | null;

  /** @deprecated ถูกแทนที่ด้วย `doc_type` + `event` — คอลัมน์ถูก DROP ไปแล้ว ลบใน Task 6 */
  type?: string;
  /** @deprecated ถูกแทนที่ด้วย `source` — คอลัมน์ถูก DROP ไปแล้ว ลบใน Task 6 */
  category?: string;
  /** @deprecated คอลัมน์ถูก DROP ไปแล้ว ลบใน Task 6 */
  is_sent?: boolean;
  /** @deprecated backend ไม่เคยส่งฟิลด์นี้มา ลบใน Task 6 */
  link?: string;
}

/**
 * ค่าสรุปยังไม่ได้อ่าน/อ่านแล้วทั้งชุดผลลัพธ์ — backend สร้างใน try/catch จึงเป็น
 * optional บนสาย **การไม่มีแปลว่า "สร้างค่าสรุปไม่ได้" ไม่ใช่ศูนย์**
 */
export interface NotificationSummary {
  unread: number;
  read: number;
}

/** ซองของ `GET /api/notifications` และ `GET /api/notifications/unread` */
export interface NotificationListResponse
  extends PaginatedResponse<Notification> {
  summary?: NotificationSummary;
}
```

- [ ] **Step 2: เพิ่ม endpoint ของ unread**

ใน `constant/api-endpoints.ts` แทรกบรรทัดถัดจาก `NOTIFICATIONS:` (บรรทัด 155) โดยเรียงตามตัวอักษรเดิม:

```ts
  NOTIFICATIONS: "/api/proxy/api/notifications",
  NOTIFICATIONS_MARK_ALL_READ: "/api/proxy/api/notifications/mark-all-read",
  NOTIFICATIONS_UNREAD: "/api/proxy/api/notifications/unread",
```

- [ ] **Step 3: เพิ่ม namespace `notifications` ใน `messages/en.json`**

วางเป็นคีย์ระดับบนสุด เรียงตามตำแหน่งตัวอักษรของคีย์ระดับบนที่มีอยู่
**ไม่ต้องใส่ชื่อเอกสาร 5 ตัว** — ใช้ซ้ำจาก namespace `modules` ที่มีอยู่แล้ว

```json
"notifications": {
  "docType": {
    "system": "System",
    "businessUnit": "Business Unit"
  },
  "commentLabel": "Comment",
  "tabAll": "All",
  "tabUnread": "Unread",
  "loadMore": "Load more",
  "markAllRead": "Mark all as read",
  "emptyUnreadTitle": "You're all caught up",
  "emptyUnreadDesc": "You have no unread notifications."
}
```

- [ ] **Step 4: เพิ่ม namespace เดียวกันใน `messages/th.json`**

```json
"notifications": {
  "docType": {
    "system": "ระบบ",
    "businessUnit": "หน่วยธุรกิจ"
  },
  "commentLabel": "ความคิดเห็น",
  "tabAll": "ทั้งหมด",
  "tabUnread": "ยังไม่อ่าน",
  "loadMore": "โหลดเพิ่ม",
  "markAllRead": "ทำเครื่องหมายว่าอ่านทั้งหมด",
  "emptyUnreadTitle": "อ่านครบแล้ว",
  "emptyUnreadDesc": "ไม่มีการแจ้งเตือนที่ยังไม่ได้อ่าน"
}
```

- [ ] **Step 5: ตรวจว่าคอมไพล์ผ่านและ JSON ทั้งสองไฟล์มีคีย์ตรงกัน**

```bash
bunx tsc --noEmit
bun run lint
python3 -c "
import json
en=json.load(open('messages/en.json')); th=json.load(open('messages/th.json'))
a=json.dumps(en['notifications'],sort_keys=True); b=json.dumps(th['notifications'],sort_keys=True)
import re
ka=re.findall(r'\"(\w+)\":',a); kb=re.findall(r'\"(\w+)\":',b)
print('keys match:', sorted(ka)==sorted(kb))
"
```
คาดหวัง: tsc เงียบ · lint ไม่มี error ใหม่ · `keys match: True`

- [ ] **Step 6: Commit**

```bash
git add types/notification.ts constant/api-endpoints.ts messages/en.json messages/th.json
git commit -m "feat(notification): ชนิดข้อมูลตามสัญญาใหม่ doc_type/event/source พร้อม endpoint unread และคำแปล

ฟิลด์เดิม type/category/is_sent/link คงไว้ชั่วคราวพร้อม @deprecated
เพื่อให้ tree คอมไพล์ผ่านระหว่างทาง จะถูกลบในขั้นตอนปิดงาน"
```

---

### Task 2: helper ตาม doc_type และแถวที่แสดงผล

**Files:**
- Modify: `lib/notification-helpers.tsx` (เขียนทับทั้งไฟล์)
- Modify: `components/navbar/notification-item-content.tsx`
- Modify: `components/navbar/notification.tsx` (เฉพาะ detail dialog: badge + ตัดปุ่ม Open + ส่ง prop `commentLabel`)

**Interfaces:**
- Consumes: `NotificationDocType`, `Notification`, `NotificationMetadata` จาก Task 1
- Produces:
  - `DOC_TYPE_ROUTES: Record<NotificationDocType, string | null>`
  - `DOC_TYPE_LABEL_KEY: Record<NotificationDocType, string>` — คีย์ i18n **แบบเต็ม** ใช้กับ `useTranslations()` ที่ไม่ระบุ namespace
  - `NOTIFICATION_TILE: Partial<Record<NotificationDocType, NotificationTileRef>>`
  - `getNotificationHref(n: Notification): string | undefined`
  - `formatMessage(message: string | null | undefined)` — เดิม ไม่เปลี่ยนพฤติกรรม
  - `NotificationItemContent` รับ prop เพิ่ม `commentLabel: string`

- [ ] **Step 1: เขียน `lib/notification-helpers.tsx` ใหม่ทั้งไฟล์**

```tsx
import { Link } from "react-router";
import type {
  Notification as NotificationType,
  NotificationDocType,
  NotificationMetadata,
} from "@/types/notification";
import { safeNavigationHref } from "@/lib/utils";

/**
 * doc_type → base path ของหน้ารายละเอียด
 * `null` = ไม่มีหน้าให้ลิงก์ไป (ประกาศระบบ/หน่วยธุรกิจ) → ผู้เรียกเปิด detail dialog แทน
 */
export const DOC_TYPE_ROUTES: Record<NotificationDocType, string | null> = {
  system: null,
  business_unit: null,
  purchase_request: "/procurement/purchase-request",
  purchase_order: "/procurement/purchase-order",
  good_received_note: "/procurement/goods-receive-note",
  credit_note: "/procurement/credit-note",
  store_requisition: "/store-operation/store-requisition",
};

/**
 * doc_type → คีย์ i18n แบบเต็ม (ใช้กับ `useTranslations()` ที่ไม่ระบุ namespace)
 * ชื่อเอกสารยืมจาก namespace `modules` เพื่อให้ตรงกับเมนูเป๊ะ ๆ ไม่แปลซ้ำ
 */
export const DOC_TYPE_LABEL_KEY: Record<NotificationDocType, string> = {
  system: "notifications.docType.system",
  business_unit: "notifications.docType.businessUnit",
  purchase_request: "modules.purchaseRequest",
  purchase_order: "modules.purchaseOrder",
  good_received_note: "modules.goodsReceiveNote",
  credit_note: "modules.creditNote",
  store_requisition: "modules.storeRequisition",
};

export interface NotificationTileRef {
  /** SubTile glyph key (ชื่อ submodule ใน module-list) */
  readonly name: string;
  /** Parent module name → กำหนดจานสีของ tile */
  readonly parent: string;
}

/**
 * Illustrated app-tile (SubTile) ต่อ doc_type — squircle ชุดเดียวกับ sidebar/dashboard
 * doc_type ที่ไม่มีในนี้ (`system`, `business_unit`) ตกไปที่ tile กระดิ่ง
 */
export const NOTIFICATION_TILE: Partial<
  Record<NotificationDocType, NotificationTileRef>
> = {
  purchase_request: { name: "purchaseRequest", parent: "procurement" },
  purchase_order: { name: "purchaseOrder", parent: "procurement" },
  good_received_note: { name: "goodsReceiveNote", parent: "procurement" },
  credit_note: { name: "creditNote", parent: "procurement" },
  store_requisition: { name: "storeRequisition", parent: "storeOperations" },
};

/**
 * คีย์ metadata เก่าต่อ doc_type — ใช้เป็น fallback สำหรับแถวที่เขียนก่อน redesign
 * write path ปัจจุบันเขียน id เอกสารไว้ที่ `metadata.id` เสมอ
 */
const LEGACY_ID_KEY: Partial<Record<NotificationDocType, keyof NotificationMetadata>> = {
  purchase_request: "pr_id",
  purchase_order: "po_id",
  store_requisition: "sr_id",
  good_received_note: "grn_id",
  credit_note: "cn_id",
};

/**
 * คืน href ที่ใช้ navigate เมื่อกดการแจ้งเตือน
 * ลำดับ: route ของ doc_type + (`metadata.id` → คีย์เก่าตาม doc_type) มิฉะนั้น undefined
 * (ผู้เรียก fallback ไปเปิด detail dialog)
 *
 * @param n - แถวการแจ้งเตือน
 * @returns path ภายในแอป หรือ undefined เมื่อไม่มีเอกสารให้เปิด
 */
export function getNotificationHref(n: NotificationType): string | undefined {
  if (!n.doc_type) return undefined;
  const base = DOC_TYPE_ROUTES[n.doc_type];
  if (!base || !n.metadata) return undefined;
  const legacyKey = LEGACY_ID_KEY[n.doc_type];
  const legacyId = legacyKey ? n.metadata[legacyKey] : undefined;
  const entityId = n.metadata.id ?? legacyId;
  return typeof entityId === "string" && entityId
    ? `${base}/${entityId}`
    : undefined;
}

/**
 * แปลง markdown-style `[label](url)` ใน message เป็น `<Link>`
 * (`safeNavigationHref` กรอง URL อันตรายออก)
 *
 * @param message - ข้อความดิบ (รับ null/undefined ได้ → คืน [])
 * @returns array ของ ReactNode
 */
export function formatMessage(message: string | null | undefined) {
  if (!message) return [];
  const parts = message.split(/(\[.*?\]\(.*?\))/g);
  return parts.map((part) => {
    const match = /^\[(.*?)\]\((.*?)\)$/.exec(part);
    if (match) {
      const safeHref = safeNavigationHref(match[2]);
      if (!safeHref) return match[1];
      return (
        <Link
          key={safeHref}
          to={safeHref}
          className="text-primary hover:text-primary/80 font-medium underline underline-offset-2"
          onClick={(e) => e.stopPropagation()}
        >
          {match[1]}
        </Link>
      );
    }
    return part;
  });
}
```

- [ ] **Step 2: อัปเดต `components/navbar/notification-item-content.tsx`**

เปลี่ยนสามจุด: อ่าน tile จาก `doc_type`, ใส่ตราคอมเมนต์เมื่อ `event === "comment"`, กัน `created_at` ว่าง

แทน import เดิม:
```tsx
import { Bell, MessageSquare } from "lucide-react";
```

เพิ่ม prop ใน interface:
```tsx
  /** ป้ายกำกับตราคอมเมนต์ (เช่น t("notifications.commentLabel")) — คู่กับไอคอน */
  readonly commentLabel: string;
```
และรับใน destructuring ของฟังก์ชัน: `commentLabel,`

แทนบล็อกคำนวณเวลาและ tile:
```tsx
  const time = notification.created_at
    ? new Date(notification.created_at).toLocaleString(locale, {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  const tile = notification.doc_type
    ? NOTIFICATION_TILE[notification.doc_type]
    : undefined;
  const isComment = notification.event === "comment";
```

แทนบล็อก tile ทั้งก้อน (`<span className="flex shrink-0 items-center">…</span>`) ด้วย:
```tsx
      {/* Leading app tile — squircle ชุดเดียวกับ sidebar/dashboard
          doc_type ที่ไม่ใช่เอกสาร (system/business_unit) ตกมาที่กระดิ่ง
          event=comment ติดตราเล็กมุมล่างขวาแทนการเพิ่มบรรทัดข้อความ */}
      <span className="relative flex shrink-0 items-center">
        {tile ? (
          <SubTile name={tile.name} parentName={tile.parent} size={36} />
        ) : (
          <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-xl">
            <Bell className="size-4.5" />
          </span>
        )}
        {isComment && (
          <span className="bg-background ring-border absolute -end-0.5 -bottom-0.5 flex size-4 items-center justify-center rounded-full ring-1">
            <MessageSquare
              className="text-muted-foreground size-2.5"
              aria-hidden="true"
            />
            <span className="sr-only">{commentLabel}</span>
          </span>
        )}
      </span>
```

แทนช่องเวลาให้เรนเดอร์เฉพาะเมื่อมีค่า:
```tsx
          {time && (
            <span className="text-muted-foreground shrink-0 text-micro whitespace-nowrap tabular-nums">
              {time}
            </span>
          )}
```

- [ ] **Step 3: อัปเดต detail dialog ใน `components/navbar/notification.tsx`**

เปลี่ยน import ของ helper (ตัด `getBadgeVariant` ออก) และตัด `ExternalLink` ที่ไม่ใช้แล้ว:
```tsx
import { Bell, BellOff, Check, SquareArrowOutUpRight } from "lucide-react";
```
```tsx
import {
  formatMessage,
  getNotificationHref,
  DOC_TYPE_LABEL_KEY,
} from "@/lib/notification-helpers";
```
และตัด `safeNavigationHref` ออกจาก import ของ `@/lib/utils` (เหลือ `cn`, `safeInternalHref`, `sanitizeText`)

ใน `NotificationItem` ส่ง prop ใหม่ให้ `NotificationItemContent` — เพิ่ม `commentLabel` โดยดึงจาก
translator แบบ root scope ที่เพิ่มในคอมโพเนนต์นี้:
```tsx
  const tRoot = useTranslations();
```
```tsx
      <NotificationItemContent
        notification={notification}
        isUnread={isUnread}
        locale={locale}
        unreadLabel={t("unread")}
        commentLabel={tRoot("notifications.commentLabel")}
      />
```

ใน `NotificationDetailDialog` เพิ่ม translator แบบ root scope และแทน badge:
```tsx
  const tRoot = useTranslations();
```
```tsx
          {data && (
            <DialogDescription className="flex items-center gap-2 pt-1 text-micro">
              {data.doc_type && (
                <Badge variant="info-light" size="xs">
                  {tRoot(DOC_TYPE_LABEL_KEY[data.doc_type])}
                </Badge>
              )}
              {data.created_at && (
                <span className="text-muted-foreground tabular-nums">
                  {new Date(data.created_at).toLocaleString()}
                </span>
              )}
            </DialogDescription>
          )}
```

ลบบรรทัด `const externalHref = data ? safeNavigationHref(data.link) : undefined;`
และลบบล็อกปุ่ม Open ทั้งก้อนใน `DialogFooter` (เหลือแค่ปุ่ม Close) — `link` เป็นฟิลด์ที่
backend ไม่เคยส่งมา ปุ่มนี้ไม่มีทางแสดง

- [ ] **Step 4: ตรวจ**

```bash
bunx tsc --noEmit
bun run lint
```
คาดหวัง: เงียบทั้งคู่ (เทสต์จะยังแดงอยู่ — แก้ใน Task 5 ตามแผน)

- [ ] **Step 5: Commit**

```bash
git add lib/notification-helpers.tsx components/navbar/notification-item-content.tsx components/navbar/notification.tsx
git commit -m "feat(notification): map deep-link ไอคอนและป้ายตาม doc_type ครบ 7 ชนิด

รองรับ metadata.id ของ write path ใหม่และคีย์เก่าของแถวประวัติ
เพิ่ม GRN/CN ที่เดิมไม่มี ติดตราคอมเมนต์เมื่อ event=comment
กัน created_at ว่างไม่ให้ขึ้น Invalid Date และตัดปุ่ม Open ที่ backend ไม่เคยส่ง link มา"
```

---

### Task 3: ชั้นข้อมูลบน TanStack Query และการต่อสาย navbar

**Files:**
- Modify: `hooks/use-notification.ts` (เขียนทับทั้งไฟล์)
- Modify: `components/navbar/notification.tsx` (ส่วนที่ต่อ hook)
- Modify: `routes/notifications/notification-content.tsx` (ต่อสายขั้นต่ำให้คอมไพล์ผ่านและตัวเลขถูก — แท็บและโหลดเพิ่มอยู่ใน Task 4)

**Interfaces:**
- Consumes: `Notification`, `NotificationListResponse`, `NotificationSource`, `NotificationSummary` (Task 1)
- Produces:
  - `notificationKeys` — object ของ query key
  - `useNotificationRealtime(userId: string | undefined): { isConnected: boolean }`
  - `useUnreadNotifications(perpage?: number): { notifications: Notification[]; unreadCount: number; isLoading: boolean; error: ApiError | null }`
  - `useNotificationsList(tab: NotificationTab): { items: Notification[]; total: number; summary?: NotificationSummary; isLoading: boolean; error: ApiError | null; hasNextPage: boolean; isFetchingNextPage: boolean; fetchNextPage: () => void }`
  - `useMarkNotificationRead(): UseMutationResult<void, ApiError, { id: string; source?: NotificationSource }>`
  - `useMarkAllNotificationsRead(): UseMutationResult<void, ApiError, void>`
  - `useNotificationDetail(id: string | null | undefined)`
  - `type NotificationTab = "all" | "unread"`

- [ ] **Step 1: เขียน `hooks/use-notification.ts` ใหม่ทั้งไฟล์**

```ts
import { useEffect, useRef, useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useErrorToast } from "@/hooks/use-error-toast";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { CACHE_DYNAMIC, CACHE_NORMAL } from "@/lib/cache-config";
import { ApiError } from "@/lib/api-error";
import { httpClient } from "@/lib/http-client";
import { getRuntimeConfig } from "@/lib/runtime-config";
import type {
  Notification,
  NotificationListResponse,
  NotificationSource,
} from "@/types/notification";

/** แท็บของหน้ารายการ — กำหนด endpoint และ cache key ที่ใช้ */
export type NotificationTab = "all" | "unread";

const PAGE_SIZE = 20;
const POPOVER_SIZE = 10;

/**
 * Query key ทั้งหมดแตกจาก prefix เดียวกัน เพื่อให้ WS invalidate ครั้งเดียวสดทุกที่
 * แคชฝั่ง "ยังไม่อ่าน" ทั้งสองตัว (popover กับแท็บ) อยู่ใต้ `unreadAll` เพื่อให้
 * optimistic update ของ mark-read เขียนถึงพร้อมกันด้วยคำสั่งเดียว
 */
export const notificationKeys = {
  all: [QUERY_KEYS.NOTIFICATIONS] as const,
  unreadAll: [QUERY_KEYS.NOTIFICATIONS, "unread"] as const,
  unreadPopover: (perpage: number) =>
    [QUERY_KEYS.NOTIFICATIONS, "unread", "popover", perpage] as const,
  list: (tab: NotificationTab) =>
    tab === "unread"
      ? ([QUERY_KEYS.NOTIFICATIONS, "unread", "list"] as const)
      : ([QUERY_KEYS.NOTIFICATIONS, "all", "list"] as const),
  detail: (id: string) => [QUERY_KEYS.NOTIFICATION_DETAIL, id] as const,
};

/**
 * อ่าน WS_URL จาก runtime config แบบ lazy — ห้ามอ่านระดับ module
 * (config ยังไม่โหลดตอน module evaluate เช่นใน unit test)
 */
const getWsUrl = (): string | undefined => {
  try {
    return getRuntimeConfig().WS_URL;
  } catch {
    return undefined;
  }
};

/**
 * ดึงรายการหนึ่งหน้าจาก endpoint ที่กำหนด แล้วทำซองให้เป็นรูปเดียวเสมอ
 * `paginate` เติมค่าตั้งต้นเมื่อ backend ไม่ส่งมา ส่วน `summary` ปล่อยเป็น undefined
 * ตามสัญญา — การไม่มีแปลว่า "สร้างค่าสรุปไม่ได้" ไม่ใช่ศูนย์
 *
 * @param url - endpoint ฐาน (`NOTIFICATIONS` หรือ `NOTIFICATIONS_UNREAD`)
 * @param page - เลขหน้าเริ่มที่ 1
 * @param perpage - จำนวนต่อหน้า (backend จำกัดไม่เกิน 100)
 * @returns ซองรายการที่ normalize แล้ว
 */
async function fetchNotificationPage(
  url: string,
  page: number,
  perpage: number,
): Promise<NotificationListResponse> {
  const res = await httpClient.get(`${url}?page=${page}&perpage=${perpage}`);
  if (!res.ok) {
    throw await ApiError.from(res, "Failed to load notifications");
  }
  const json = await res.json();
  const data: Notification[] = Array.isArray(json?.data) ? json.data : [];
  return {
    data,
    paginate: json?.paginate ?? {
      total: data.length,
      page,
      perpage,
      pages: 1,
    },
    summary: json?.summary,
  };
}

type InfiniteShape = { pages: NotificationListResponse[]; pageParams: unknown[] };

/** แยกแคชแบบ infinite ออกจากแคชหน้าเดียว — ทั้งสองอยู่ใต้ prefix `unreadAll` */
function isInfinite(value: unknown): value is InfiniteShape {
  return (
    !!value &&
    typeof value === "object" &&
    Array.isArray((value as InfiniteShape).pages)
  );
}

/** ตัดแถวตาม id ออกจากหนึ่งหน้า พร้อมลด total ให้สอดคล้อง */
function dropRows(
  page: NotificationListResponse,
  ids: Set<string> | "all",
): NotificationListResponse {
  const kept = ids === "all" ? [] : page.data.filter((n) => !ids.has(n.id));
  const removed = page.data.length - kept.length;
  return {
    ...page,
    data: kept,
    paginate: {
      ...page.paginate,
      total:
        ids === "all" ? 0 : Math.max(0, page.paginate.total - removed),
    },
  };
}

/**
 * เขียน optimistic ลงทุกแคชฝั่ง "ยังไม่อ่าน" — ครอบทั้งแคชหน้าเดียวของ popover
 * และแคช infinite ของแท็บยังไม่อ่าน แคชฝั่ง "ทั้งหมด" ไม่แตะ เพราะแถวยังอยู่ที่นั่น
 * (แค่เปลี่ยนเป็นอ่านแล้ว) และจะถูก invalidate ตามหลังอยู่แล้ว
 *
 * @param queryClient - client ปัจจุบัน
 * @param ids - เซตของ id ที่จะตัด หรือ "all" เพื่อล้างทั้งหมด
 */
function dropFromUnreadCaches(
  queryClient: QueryClient,
  ids: Set<string> | "all",
): void {
  queryClient.setQueriesData<unknown>(
    { queryKey: notificationKeys.unreadAll },
    (old) => {
      if (!old) return old;
      if (isInfinite(old)) {
        return { ...old, pages: old.pages.map((p) => dropRows(p, ids)) };
      }
      return dropRows(old as NotificationListResponse, ids);
    },
  );
}

/**
 * เชื่อม WebSocket เพื่อรับสัญญาณว่ามีการแจ้งเตือนใหม่ แล้ว invalidate ทั้งกลุ่ม
 * **hook นี้ไม่ถือรายการเอง** — payload บน WS มีไม่ครบ (ไม่มี created_at/is_read/source)
 * REST เป็นแหล่งความจริงเดียว ดึงใหม่แล้วได้ครบทุกฟิลด์และตัวเลขที่ตรงกันเสมอ
 * reconnect แบบ exponential backoff เพดาน 30 วินาที
 *
 * @param userId - id ผู้ใช้สำหรับ register กับ gateway (undefined = ไม่เชื่อมต่อ)
 * @returns สถานะการเชื่อมต่อ
 * @example
 * useNotificationRealtime(userId);
 */
export function useNotificationRealtime(userId: string | undefined) {
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();
  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const maybeWsUrl = getWsUrl();
    if (!userId || !maybeWsUrl) return;
    const wsUrl: string = maybeWsUrl;

    let unmounted = false;
    let activeWs: WebSocket | null = null;
    reconnectAttempt.current = 0;

    /** สร้างการเชื่อมต่อและผูก handler พร้อม reconnect */
    function connect() {
      const ws = new WebSocket(wsUrl);
      activeWs = ws;

      ws.onopen = () => {
        if (unmounted) {
          ws.close();
          return;
        }
        reconnectAttempt.current = 0;
        setIsConnected(true);
        ws.send(JSON.stringify({ type: "register", user_id: userId }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "notification") {
            queryClient.invalidateQueries({ queryKey: notificationKeys.all });
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (!unmounted) {
          const delay = Math.min(1000 * 2 ** reconnectAttempt.current, 30000);
          reconnectAttempt.current += 1;
          reconnectTimer.current = setTimeout(connect, delay);
        }
      };

      ws.onerror = () => {
        // Connection will be retried via the onclose handler.
      };
    }

    connect();

    return () => {
      unmounted = true;
      clearTimeout(reconnectTimer.current);
      activeWs?.close();
    };
  }, [userId, queryClient]);

  return { isConnected };
}

/**
 * รายการที่ยังไม่ได้อ่านสำหรับ popover บน navbar — คำขอเดียวได้ทั้งแถวที่จะแสดง
 * และเลข badge จาก `paginate.total` (จำนวนยังไม่อ่านทั้งหมด ไม่ใช่แค่หน้านี้)
 *
 * @param perpage - จำนวนแถวที่ popover แสดง
 * @returns แถว จำนวนรวม สถานะโหลด และ error
 * @example
 * const { notifications, unreadCount } = useUnreadNotifications();
 */
export function useUnreadNotifications(perpage: number = POPOVER_SIZE) {
  const query = useQuery<NotificationListResponse, ApiError>({
    queryKey: notificationKeys.unreadPopover(perpage),
    queryFn: () =>
      fetchNotificationPage(API_ENDPOINTS.NOTIFICATIONS_UNREAD, 1, perpage),
    ...CACHE_DYNAMIC,
  });
  return {
    notifications: query.data?.data ?? [],
    unreadCount: query.data?.paginate.total ?? 0,
    isLoading: query.isLoading,
    error: query.error,
  };
}

/**
 * รายการของหน้า `/notifications` แบบโหลดเพิ่มทีละหน้า
 * `tab="all"` → `GET /api/notifications` (มี `summary`)
 * `tab="unread"` → `GET /api/notifications/unread` (ไม่มี `summary` โดยตั้งใจ
 * เพราะจำนวนยังไม่อ่านเท่ากับ `paginate.total` ของ endpoint นั้นพอดี)
 *
 * @param tab - แท็บที่กำลังแสดง
 * @returns แถวที่ต่อกันทุกหน้า ตัวเลขรวม ค่าสรุป และตัวควบคุมการโหลดเพิ่ม
 * @example
 * const { items, total, summary, fetchNextPage, hasNextPage } = useNotificationsList("all");
 */
export function useNotificationsList(tab: NotificationTab) {
  const url =
    tab === "unread"
      ? API_ENDPOINTS.NOTIFICATIONS_UNREAD
      : API_ENDPOINTS.NOTIFICATIONS;
  const query = useInfiniteQuery<NotificationListResponse, ApiError>({
    queryKey: notificationKeys.list(tab),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      fetchNotificationPage(url, pageParam as number, PAGE_SIZE),
    getNextPageParam: (last) =>
      last.paginate.page < last.paginate.pages
        ? last.paginate.page + 1
        : undefined,
    ...CACHE_DYNAMIC,
  });
  const pages = query.data?.pages ?? [];
  return {
    items: pages.flatMap((p) => p.data),
    total: pages[0]?.paginate.total ?? 0,
    summary: pages[0]?.summary,
    isLoading: query.isLoading,
    error: query.error,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: () => void query.fetchNextPage(),
  };
}

/**
 * ทำเครื่องหมายว่าอ่านแล้วหนึ่งใบ — ต้องส่ง `source` ของแถวนั้นกลับไป
 * เพื่อให้ backend เขียนลงตารางที่ถูก (`broadcast` → tb_user_broadcast_action)
 * ไม่ส่ง = backend ถือว่า personal ซึ่งจะทำให้ประกาศกดอ่านไม่ติด
 *
 * @returns mutation ที่รับ `{ id, source }`
 * @example
 * const markRead = useMarkNotificationRead();
 * markRead.mutate({ id: n.id, source: n.source });
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const errorToast = useErrorToast();
  return useMutation<
    void,
    ApiError,
    { id: string; source?: NotificationSource },
    { previous: [readonly unknown[], unknown][] }
  >({
    mutationFn: async ({ id, source }) => {
      const res = await httpClient.put(
        API_ENDPOINTS.NOTIFICATION_MARK_READ(id),
        source ? { source } : undefined,
      );
      if (!res.ok) {
        throw await ApiError.from(res, "Failed to mark notification as read");
      }
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.unreadAll });
      const previous = queryClient.getQueriesData({
        queryKey: notificationKeys.unreadAll,
      });
      dropFromUnreadCaches(queryClient, new Set([id]));
      return { previous };
    },
    onError: (err, _vars, context) => {
      context?.previous.forEach(([key, data]) =>
        queryClient.setQueryData(key, data),
      );
      // err.message เป็นสตริงภาษาอังกฤษที่ dev เขียนไว้ตอน throw — ให้ errorToast
      // แปลงเป็นประโยคของผู้ใช้ตาม error code เหมือนที่อื่นทั้งแอป
      errorToast(err);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * ทำเครื่องหมายว่าอ่านแล้วทั้งหมดของผู้ใช้ปัจจุบัน
 *
 * @returns mutation ที่ไม่รับ argument
 * @example
 * const markAll = useMarkAllNotificationsRead();
 * markAll.mutate();
 */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const errorToast = useErrorToast();
  return useMutation<
    void,
    ApiError,
    void,
    { previous: [readonly unknown[], unknown][] }
  >({
    mutationFn: async () => {
      const res = await httpClient.put(
        API_ENDPOINTS.NOTIFICATIONS_MARK_ALL_READ,
      );
      if (!res.ok) {
        throw await ApiError.from(
          res,
          "Failed to mark all notifications as read",
        );
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.unreadAll });
      const previous = queryClient.getQueriesData({
        queryKey: notificationKeys.unreadAll,
      });
      dropFromUnreadCaches(queryClient, "all");
      return { previous };
    },
    onError: (err, _vars, context) => {
      context?.previous.forEach(([key, data]) =>
        queryClient.setQueryData(key, data),
      );
      errorToast(err);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * รายละเอียดการแจ้งเตือนตาม id ผ่าน `GET /api/notifications/:id`
 * เปิด query เฉพาะเมื่อ id ไม่ว่าง — caller ส่ง null ได้ตอน dialog ปิด
 *
 * @param id - notification id (undefined/null = ปิด query)
 * @returns UseQueryResult ของ `Notification`
 * @example
 * const { data: detail, isLoading, error } = useNotificationDetail(detailId);
 */
export function useNotificationDetail(id: string | null | undefined) {
  return useQuery<Notification, ApiError>({
    queryKey: notificationKeys.detail(id ?? ""),
    queryFn: async () => {
      const res = await httpClient.get(API_ENDPOINTS.NOTIFICATION_BY_ID(id!));
      if (!res.ok) {
        throw await ApiError.from(res, "Failed to load notification detail");
      }
      const json = await res.json();
      return json.data ?? json;
    },
    enabled: !!id,
    ...CACHE_NORMAL,
  });
}
```

- [ ] **Step 2: ต่อสาย `components/navbar/notification.tsx` เข้ากับ hook ใหม่**

แทน import ของ hook:
```tsx
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationDetail,
  useNotificationRealtime,
  useUnreadNotifications,
} from "@/hooks/use-notification";
```

เปลี่ยน signature ของ `NotificationItemProps` ให้ส่งทั้งแถว (ต้องใช้ `source` ตอน mark-read):
```tsx
  readonly onMarkAsRead: (notification: NotificationType) => void;
```
และในตัวคอมโพเนนต์เปลี่ยนสามจุดที่เรียก `onMarkAsRead(notification.id)` เป็น `onMarkAsRead(notification)`

แทนหัวของ `export default function Notification()`:
```tsx
export default function Notification() {
  const t = useTranslations("navbar");
  const tRoot = useTranslations();
  const { userId } = useProfile();
  useNotificationRealtime(userId);
  const { notifications, unreadCount } = useUnreadNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const notificationCount = unreadCount;

  const handleMarkAsRead = (notification: NotificationType) =>
    markRead.mutate({ id: notification.id, source: notification.source });

  const handleShowDetail = (id: string) => {
    setPopoverOpen(false);
    setDetailId(id);
  };
```

แทนปุ่ม Clear all: `onClick={markAllAsRead}` → `onClick={() => markAllRead.mutate()}`
แทน prop ของแถว: `onMarkAsRead={markAsRead}` → `onMarkAsRead={handleMarkAsRead}`

- [ ] **Step 3: ต่อสาย `routes/notifications/notification-content.tsx` ขั้นต่ำ**

แท็บและปุ่มโหลดเพิ่มอยู่ใน Task 4 — ขั้นนี้แค่ทำให้คอมไพล์ผ่านและตัวเลขถูกต้อง

แทนบรรทัดที่เรียก hook และคำนวณ unread:
```tsx
  const { items, total, summary, isLoading, error } =
    useNotificationsList("all");
  const unreadCount = summary?.unread ?? 0;
```

แทน badge จำนวนรวมในหัวหน้า ให้ใช้ `total` แทน `items.length`:
```tsx
        {total > 0 && (
          <Badge variant="secondary" size="sm" className="tabular-nums">
            {total.toLocaleString()}
          </Badge>
        )}
```

ส่ง `commentLabel` ให้ `NotificationItemContent` ใน `NotificationRow` — เพิ่ม translator แบบ root scope:
```tsx
  const tRoot = useTranslations();
```
```tsx
    <NotificationItemContent
      notification={notification}
      isUnread={isUnread}
      locale={locale}
      unreadLabel={t("unread")}
      commentLabel={tRoot("notifications.commentLabel")}
      clampMessage
    />
```

เปลี่ยนการเช็ค href จาก `safeNavigationHref` เป็น `safeInternalHref` ให้ตรงกับ navbar
(deep-link ทั้งหมดเป็น path ภายในแล้ว — นโยบาย internal-only):
```tsx
import { cn, safeInternalHref } from "@/lib/utils";
```
```tsx
  const safeLink = safeInternalHref(getNotificationHref(notification));
```

- [ ] **Step 4: ตรวจ**

```bash
bunx tsc --noEmit
bun run lint
```
คาดหวัง: เงียบทั้งคู่

- [ ] **Step 5: Commit**

```bash
git add hooks/use-notification.ts components/navbar/notification.tsx routes/notifications/notification-content.tsx
git commit -m "refactor(notification): ย้ายชั้นข้อมูลไป TanStack Query ให้ REST เป็นแหล่งความจริงเดียว

WS เหลือหน้าที่เดียวคือ invalidate เพราะ payload บนสายไม่มี created_at/is_read/source
badge อ่านจาก paginate.total ของ /unread จึงถูกตั้งแต่เปิดแอป ไม่ต้องรอ WS
mark-read ส่ง source กลับไปเพื่อให้ประกาศเขียนลงตารางที่ถูก"
```

---

### Task 4: แท็บและการโหลดเพิ่มบนหน้า `/notifications`

**Files:**
- Modify: `routes/notifications/notification-content.tsx`

**Interfaces:**
- Consumes: `useNotificationsList`, `useMarkAllNotificationsRead`, `NotificationTab` (Task 3) · `Tabs`, `TabsList`, `TabsTrigger` จาก `@/components/ui/tabs` · คีย์ i18n `notifications.*` (Task 1)
- Produces: ไม่มี export ใหม่

- [ ] **Step 1: เพิ่ม import ที่ต้องใช้**

```tsx
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useMarkAllNotificationsRead,
  useNotificationsList,
  type NotificationTab,
} from "@/hooks/use-notification";
```

- [ ] **Step 2: เปลี่ยนหัวคอมโพเนนต์ให้ถือ state ของแท็บ**

```tsx
export default function NotificationsContent() {
  const t = useTranslations("navbar");
  const tRoot = useTranslations();
  const locale = useLocale();
  const [tab, setTab] = useState<NotificationTab>("all");
  const {
    items,
    total,
    summary,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useNotificationsList(tab);
  const markAllRead = useMarkAllNotificationsRead();
  const [detailId, setDetailId] = useState<string | null>(null);

  // แท็บ "ทั้งหมด" ให้ summary.unread มา ส่วนแท็บ "ยังไม่อ่าน" ไม่มี summary
  // โดยตั้งใจ (จำนวนยังไม่อ่าน = paginate.total ของ endpoint นั้นพอดี)
  // summary เป็น optional บนสาย — ไม่มี ≠ ศูนย์ จึงถอยไปใช้ total ของแท็บนั้น
  const unreadCount = tab === "unread" ? total : (summary?.unread ?? 0);
```

- [ ] **Step 3: แทนหัวหน้าเดิมด้วยหัว + แท็บ + ปุ่มอ่านทั้งหมด**

แทนทั้งบล็อก `<header>…</header>` ด้วย:
```tsx
      <header className="border-border/60 flex flex-wrap items-center gap-2 border-b pb-2">
        <Bell className="text-muted-foreground size-4" aria-hidden="true" />
        <h1 className="text-lg font-semibold tracking-tight">
          {t("notifications")}
        </h1>
        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as NotificationTab)}
          className="ms-2"
        >
          <TabsList>
            <TabsTrigger value="all">{tRoot("notifications.tabAll")}</TabsTrigger>
            <TabsTrigger value="unread">
              {tRoot("notifications.tabUnread")}
              {unreadCount > 0 && (
                <span className="ms-1.5 tabular-nums">
                  {unreadCount.toLocaleString()}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground ms-auto h-7 text-xs"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            {tRoot("notifications.markAllRead")}
          </Button>
        )}
      </header>
```

- [ ] **Step 4: แทน empty state ให้แยกตามแท็บ และเพิ่มปุ่มโหลดเพิ่ม**

แทนสาขา empty ในรายการ:
```tsx
        ) : items.length === 0 ? (
          <li className="px-4 py-12">
            <EmptyComponent
              icon={BellOff}
              title={
                tab === "unread"
                  ? tRoot("notifications.emptyUnreadTitle")
                  : t("noNotificationsTitle")
              }
              description={
                tab === "unread"
                  ? tRoot("notifications.emptyUnreadDesc")
                  : t("noNotificationsDesc")
              }
            />
          </li>
        ) : (
```

และเพิ่มหลังปิด `</ul>`:
```tsx
      {hasNextPage && (
        <div className="flex justify-center pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchNextPage}
            disabled={isFetchingNextPage}
          >
            {tRoot("notifications.loadMore")}
          </Button>
        </div>
      )}
```

- [ ] **Step 5: ตรวจ**

```bash
bunx tsc --noEmit
bun run lint
```
คาดหวัง: เงียบทั้งคู่

- [ ] **Step 6: Commit**

```bash
git add routes/notifications/notification-content.tsx
git commit -m "feat(notification): แท็บทั้งหมด/ยังไม่อ่าน และปุ่มโหลดเพิ่มบนหน้ารายการ

เดิมหน้านี้เห็นแค่ 20 แถวแรกที่ backend ส่งมาและไม่มีทางไปหน้าถัดไป
ตัวเลขต่อแท็บมาจาก summary/paginate ของ backend ไม่ใช่การนับแถวที่มองเห็น"
```

---

### Task 5: ปรับเทสต์เดิมให้ตรงสัญญาใหม่

**Files:**
- Modify: `hooks/__tests__/use-notification.test.ts`
- Modify: `components/navbar/__tests__/notification.test.tsx`

**Interfaces:**
- Consumes: ทุก export จาก Task 3 และ shape จาก Task 1

**หมายเหตุขอบเขต:** งานนี้คือ **ปรับของเดิมให้ตรงสัญญาใหม่** ห้ามเพิ่มเคสใหม่นอกเหนือจาก
การแปลงเคสเดิมให้ยังครอบคลุมพฤติกรรมเท่าเดิม ห้ามสร้างไฟล์เทสต์ใหม่

- [ ] **Step 1: รันเทสต์เพื่อดูขอบเขตความเสียหายจริง**

```bash
bun test:run hooks/__tests__/use-notification.test.ts components/navbar/__tests__/notification.test.tsx
```
คาดหวัง: แดงทั้งสองไฟล์ — บันทึกรายชื่อเคสที่แดงไว้ใช้เทียบตอนจบ

- [ ] **Step 2: ปรับ `hooks/__tests__/use-notification.test.ts`**

hook เดิมตัวเดียว (`useNotification`) ถูกแทนด้วยหลายตัว ให้แปลงเคสตามตารางนี้ —
คอลัมน์ขวาคือสิ่งที่เคสนั้นต้องยืนยันหลังแก้:

| เคสเดิม | ทำอย่างไร |
|---|---|
| `does not connect when userId is undefined` | เปลี่ยนไปเรียก `useNotificationRealtime` — พฤติกรรมเดิม |
| `connects to WebSocket and registers user on open` | เหมือนเดิม เปลี่ยนแค่ชื่อ hook |
| `receives notifications from WebSocket messages` · `prepends new notifications (newest first)` | ยุบเหลือเคสเดียว: เมื่อได้ `{type:"notification"}` ต้องเรียก `queryClient.invalidateQueries` ด้วย `queryKey: ["notifications"]` (spy ที่ `invalidateQueries` ของ QueryClient ที่ wrapper สร้าง) — **ไม่ต้องยืนยันลำดับแถวอีกแล้ว เพราะ hook ไม่ถือรายการ** |
| `ignores malformed WebSocket messages` · `ignores non-notification message types` | ยืนยันว่า `invalidateQueries` **ไม่ถูกเรียก** |
| `markAsRead calls PUT /read with category and removes the notification` | เปลี่ยนไปทดสอบ `useMarkNotificationRead` — ยืนยัน body ที่ส่งคือ `{ source: "broadcast" }` เมื่อแถวเป็น broadcast และเปลี่ยนชื่อเคสเป็น `...with source...` |
| `markAsRead rolls back and keeps the notification when the request fails` | ยืนยันว่า cache ของ `["notifications","unread",...]` กลับมาเท่าเดิมเมื่อ response ไม่ ok |
| `markAllAsRead …` 4 เคส | ย้ายไป `useMarkAllNotificationsRead` — ตัดเคส `does nothing when userId is undefined` ทิ้ง (hook ใหม่ไม่รับ userId) และตัดเคส `sends a single bulk request regardless of notification count` ทิ้ง (ไม่มีรายการใน hook ให้ผูกจำนวนอีกแล้ว) |
| `receives notifications from custom notification-sent event` | **ลบทิ้ง** — CustomEvent ถูกถอดออกแล้วเพราะไม่มีใครยิงทั้งโปรเจกต์ |
| `sets isConnected to false on WebSocket close` · backoff 2 เคส · `cleans up WebSocket on unmount` · `resets reconnect counter` | คงไว้ทั้งหมด เปลี่ยนแค่ชื่อ hook เป็น `useNotificationRealtime` |

ตัวช่วย render เดิมที่บรรทัด 75 เปลี่ยนเป็น:
```ts
const renderRealtime = (userId: string | undefined) =>
  renderHook(() => useNotificationRealtime(userId), { wrapper });
```

- [ ] **Step 3: ปรับ `components/navbar/__tests__/notification.test.tsx`**

mock ของ hook ที่บรรทัด 45 เปลี่ยนจาก `useNotification` เป็นชุดใหม่:
```tsx
  useNotificationRealtime: () => ({ isConnected: true }),
  useUnreadNotifications: () => ({
    notifications: mockNotifications,
    unreadCount: mockNotifications.length,
    isLoading: false,
    error: null,
  }),
  useMarkNotificationRead: () => ({ mutate: markReadSpy, isPending: false }),
  useMarkAllNotificationsRead: () => ({ mutate: markAllSpy, isPending: false }),
```

fixture ของ notification ทุกตัวในไฟล์: เปลี่ยน `type: "PR"` → `doc_type: "purchase_request"`,
เพิ่ม `source: "personal"`, เปลี่ยน `metadata: { id: "..." }` (คีย์ `pr_id` ใช้ในเคส fallback ได้หนึ่งเคส)

เคสที่ต้องแก้เป็นพิเศษ:

| เคส | แก้อย่างไร |
|---|---|
| `shows the notification type as a badge in the detail dialog` | ยืนยันว่าเห็นข้อความที่แปลแล้ว (`Purchase Request`) ไม่ใช่ `purchase_request` |
| `renders deep-link when notification type is PR/PO/SR with metadata.id` | เปลี่ยนชื่อเป็น doc_type และยืนยัน href ของ `good_received_note` เพิ่มหนึ่งชนิดเพื่อครอบของใหม่ |
| `renders a free-form link when notification has \`link\` but no entity` | **ลบทิ้ง** — `link` ถูกถอดออกแล้ว |
| `calls markAsRead when dismiss button is clicked` | ยืนยันว่า `markReadSpy` ถูกเรียกด้วย `{ id, source }` ไม่ใช่ `id` เปล่า |
| `calls markAllAsRead when Clear all is clicked` | ยืนยัน `markAllSpy` ถูกเรียก |
| เคสที่นับ badge | ตัวเลขมาจาก `unreadCount` ของ mock ไม่ใช่ `notifications.length` ของคอมโพเนนต์ |

- [ ] **Step 4: รันเทสต์จนเขียว**

```bash
bun test:run
```
คาดหวัง: **ผ่านทั้งหมด 0 failed** — ถ้ายังแดง แก้ต่อจนเขียว ห้ามข้าม

- [ ] **Step 5: Commit**

```bash
git add hooks/__tests__/use-notification.test.ts components/navbar/__tests__/notification.test.tsx
git commit -m "test(notification): ปรับเทสต์เดิมให้ตรงสัญญาใหม่และ hook ที่แยกเป็นหลายตัว

เคส WS เปลี่ยนจากยืนยันลำดับแถวเป็นยืนยันการ invalidate
เคส mark-read ยืนยัน body source แทน category
ตัดเคส CustomEvent และ free-form link ที่ของจริงถูกถอดออกแล้ว"
```

---

### Task 6: ตัดฟิลด์ที่เลิกใช้และตรวจด้วยมือ

**Files:**
- Modify: `types/notification.ts` (ลบฟิลด์ `@deprecated` สี่ตัว)

**Interfaces:**
- Produces: `Notification` ที่ไม่มีฟิลด์ที่ backend ลบไปแล้ว

- [ ] **Step 1: ยืนยันว่าไม่มีใครอ้างถึงฟิลด์เก่าแล้ว**

```bash
grep -rn "\.is_sent\|notification\.type\|\.category\b\|notification\.link\|data\.link" \
  --include='*.ts' --include='*.tsx' \
  --exclude-dir=node_modules --exclude-dir=dist \
  types/ hooks/ lib/ components/navbar/ routes/notifications/
```
คาดหวัง: ไม่มีผลลัพธ์ (นอกจากบรรทัดประกาศใน `types/notification.ts` เอง)
ถ้ามี ให้แก้จุดนั้นก่อนแล้วรันซ้ำ

- [ ] **Step 2: ลบฟิลด์ที่เลิกใช้ออกจาก `types/notification.ts`**

ลบสี่บรรทัดพร้อม JSDoc ที่กำกับไว้ท้าย interface `Notification`:
```ts
  /** @deprecated ถูกแทนที่ด้วย `doc_type` + `event` … */
  type?: string;
  /** @deprecated ถูกแทนที่ด้วย `source` … */
  category?: string;
  /** @deprecated คอลัมน์ถูก DROP ไปแล้ว … */
  is_sent?: boolean;
  /** @deprecated backend ไม่เคยส่งฟิลด์นี้มา … */
  link?: string;
```
**คงคีย์ `@deprecated` ใน `NotificationMetadata` ไว้** — คีย์เก่าเหล่านั้นยังมีอยู่จริง
ในแถวประวัติและ `getNotificationHref` ยังอ่านเป็น fallback

- [ ] **Step 3: gate ครบชุด**

```bash
bunx tsc --noEmit && bun run lint && bun test:run
```
คาดหวัง: ผ่านทั้งสามคำสั่ง 0 error 0 failed

- [ ] **Step 4: ตรวจด้วยมือกับ gateway ที่เครื่อง**

```bash
VITE_DEV_PROXY_TARGET=http://localhost:4000 bun dev
```
เดินตามรายการนี้ทีละข้อ (มาจาก spec หัวข้อ 11) — ทุกข้อต้องผ่านก่อนถือว่างานเสร็จ:

1. เปิดแอปแล้ว login → badge บนกระดิ่งแสดงเลขทันทีโดยไม่ต้องรอ WebSocket
2. กดการแจ้งเตือนของ PR / PO / SR / GRN / CN → เข้าหน้ารายละเอียดถูกใบ
3. กด ✓ บนแถวที่เป็น **broadcast** → หายจาก popover เลขลด แล้ว **รีโหลดหน้าต้องยังหายอยู่**
   (ถ้ากลับมา แปลว่า `source` ไม่ได้ถูกส่ง)
4. เข้า `/notifications` แท็บ "ยังไม่อ่าน" → เลขตรงกับ badge บน navbar
5. กด "โหลดเพิ่ม" → ได้แถวถัดไป ไม่ซ้ำกับหน้าก่อน ไม่สลับลำดับ
6. ระหว่างเปิดหน้าค้างไว้ ให้มีการแจ้งเตือนใหม่เข้ามา → แถวโผล่พร้อมเวลาที่ถูกต้อง
   ไม่ใช่ `Invalid Date`
7. console ของเบราว์เซอร์ต้องไม่มี error

- [ ] **Step 5: Commit**

```bash
git add types/notification.ts
git commit -m "chore(notification): ตัดฟิลด์ type/category/is_sent/link ที่ backend ลบไปแล้ว

คีย์เก่าใน metadata ยังอยู่เพราะแถวประวัติในฐานยังมีจริงและ deep-link อ่านเป็น fallback"
```

---

## Self-Review

**Spec coverage** — ทุกหัวข้อของ spec มี task รองรับ:

| spec | task |
|---|---|
| §4 ชั้นชนิดข้อมูล | 1 (เพิ่ม) + 6 (ลบของเก่า) |
| §5 ชั้น hook ทั้ง 6 ตัว | 3 |
| §6 helper (route/tile/label/fallback metadata) | 2 |
| §7 navbar (badge จาก paginate.total, mark-read ส่ง source, ตัดปุ่ม Open) | 2 + 3 |
| §7 หน้า `/notifications` (แท็บ, โหลดเพิ่ม, อ่านทั้งหมด, empty แยกแท็บ) | 4 |
| §7 แถว (tile ตาม doc_type, ตราคอมเมนต์, กัน `created_at` ว่าง) | 2 |
| §8 i18n | 1 |
| §10 เทสต์เดิมต้องเขียว | 5 |
| §11 ตรวจด้วยมือ 7 ข้อ | 6 |
| §12 ต้องขึ้นหลัง backend v2.1.0 | บันทึกไว้ใน spec — ไม่ใช่ขั้นตอนของ implementer |
| §13 นอกขอบเขต | ไม่มี task โดยตั้งใจ |

**ช่องว่างที่รู้ตัวและตัดสินแล้ว:**
- `constant/query-keys.ts` **ไม่ถูกแก้** ต่างจากที่ spec §9 คาดไว้ — คีย์ย่อยทั้งหมดสร้างจาก
  `notificationKeys` ในไฟล์ hook ซึ่งอยู่ติดกับที่ใช้จริง ดีกว่ากระจายไปไฟล์ constant กลาง
- แถวในรายการไม่มีป้ายชื่อเอกสารแยก (ดูเหตุผลในหัวข้อ File Structure)

**Type consistency** — ตรวจแล้ว: `NotificationTab` · `notificationKeys` · `DOC_TYPE_LABEL_KEY` ·
`NOTIFICATION_TILE` (เป็น `Partial<Record<…>>` เพราะ `system`/`business_unit` ไม่มี tile) ·
`getNotificationHref(n: Notification): string | undefined` ·
`NotificationItemContent` prop `commentLabel: string` — ชื่อและชนิดตรงกันทุกจุดที่ถูกอ้างถึงข้าม task

**Placeholder scan** — ไม่มี TBD/TODO ทุก step มีโค้ดหรือคำสั่งจริง
