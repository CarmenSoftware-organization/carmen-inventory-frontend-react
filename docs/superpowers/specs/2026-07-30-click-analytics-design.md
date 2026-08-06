# Click & Usage Analytics — Phase 1 Design

**วันที่:** 2026-07-30
**สถานะ:** รอ review
**Repos ที่เกี่ยวข้อง:** `carmen-inventory-frontend-react` (capture), `carmen-turborepo-backend-v2` (ingest + storage), `micro-cronjobs` (rollup + retention)

## เป้าหมาย

เก็บ click event และ page view ของผู้ใช้ทุก BU ลง database เพื่อรองรับการวิเคราะห์ 4 ด้าน:

1. **Feature usage** — ฟีเจอร์/หน้าไหนถูกใช้บ่อย ใครใช้ BU ไหนใช้
2. **Workflow / funnel** — พฤติกรรมการทำงานเป็นลำดับขั้น (เช่น สร้าง PR → approve → PO)
3. **Audit** — ใครคลิกอะไรเมื่อไหร่ (เสริมข้อมูล audit ที่มีอยู่ ไม่ใช่แหล่ง audit หลัก)
4. **Debug / support** — ดูลำดับการกระทำของผู้ใช้ก่อนเจอปัญหา

**Phase 1 (spec นี้):** เก็บข้อมูล + query ตรงผ่าน SQL/BI tool
**Phase 2 (นอก scope):** dashboard ใน `/system-admin`, funnel UI, ปุ่มเปิด/ปิดราย BU

## การตัดสินใจหลัก (จาก brainstorm)

| ประเด็น | ตัดสินใจ | เหตุผล |
|---|---|---|
| Build vs buy | สร้างเองใน Carmen backend | ข้อมูลอยู่ในมือ, join กับบริบทธุรกิจได้, ตอบโจทย์ audit |
| Capture scope | Auto-capture click + page view | หน้าเยอะมาก การไล่ mark `data-track` ทุกปุ่มเป็นงานใหญ่ |
| ที่เก็บข้อมูล | ตารางกลางใน **platform DB** + คอลัมน์ `bu_code` | migrate ครั้งเดียว (ไม่ต้องไล่ทุก tenant BU), วิเคราะห์ข้าม BU ได้, ไม่เบียด DB ธุรกิจ |
| Retention | raw 1 ปี → เหลือสรุปรายวัน | รองรับ audit ย้อนหลังข้ามปีงบประมาณ |

## สถาปัตยกรรม

```
Browser (SPA)                    backend-gateway            micro-business         platform DB
┌──────────────────┐   Bearer    ┌───────────────┐   TCP    ┌──────────────┐   ┌─────────────────────┐
│ lib/analytics.ts  │ ─────────► │ POST           │ ───────► │ โดเมน logging │──►│ tb_activity_event    │
│ click + page view │  batch ≤50 │ /analytics-    │  zod ✓   │ createMany    │   │ (append-only)        │
│ queue → flush     │  keepalive │ events         │  user_id │ skipDuplicates│   └─────────┬───────────┘
└──────────────────┘             └───────────────┘  จาก token└──────────────┘             │ cron รายวัน
                                                                            ┌─────────────▼───────────┐
                                                              micro-cronjobs│ tb_activity_event_daily  │
                                                              rollup+retain │ (สรุป, เก็บตลอดไป)        │
                                                                            └─────────────────────────┘
```

## ส่วนที่ 1 — Frontend capture (`carmen-inventory-frontend-react`)

ไฟล์ใหม่ `lib/analytics.ts` (+ `lib/analytics.test.ts`) ตาม convention ไฟล์แบนใน `lib/`

### Click capture

- Delegated listener ตัวเดียว: `document.addEventListener("click", ...)` — ดักเฉพาะ click ที่ `closest()` ตกบน `button`, `a`, `[role="button"]` หรือ `[data-track]`
- `element_id` derive ตามลำดับ: `data-track` → `id` attribute → `aria-label` → text content (trim, ตัดที่ 100 ตัวอักษร)
- `data-*` attributes อื่นบน element เก็บเข้า `props`
- **ข้อควรรู้เรื่อง locale:** `element_text`/label ที่ derive จาก text จะเป็นภาษาตาม locale ของผู้ใช้ (ไทย/อังกฤษ) — นักวิเคราะห์ควรยึด `page_path` + `element_id` เป็นหลัก; ปุ่มสำคัญค่อยทยอยเติม `data-track` เพื่อได้ชื่อ semantic คงที่ (เช่น `pr.submit`) ภายหลังได้โดยไม่ต้องแก้ระบบ

### Page view capture

- ผ่าน bridge component (`components/analytics-bridge.tsx`) mount ใน `RootLayout` (ProtectedShell) — ใช้ `useLocation()` ยิง event `page_view` เมื่อ `pathname` เปลี่ยน (แก้จากร่างแรกที่ใช้ `router.subscribe` ใน `main.tsx` — bridge ได้ทั้งการเริ่มหลัง login โดยอัตโนมัติ และเข้าถึง `useParams` สำหรับ route pattern)
- `props.route_pattern` เก็บ route pattern แบบ normalize (เช่น `/procurement/purchase-request/:id`) โดยเทียบ `useParams` กับ pathname ทีละ segment — จำเป็นสำหรับ funnel ข้ามเอกสาร

### Session & identity

- `session_id`: `crypto.randomUUID()` เก็บใน `sessionStorage` (`carmen.analytics.session`) — รอด reload, จบเมื่อปิดแท็บ
- `event_id`: `crypto.randomUUID()` ต่อ event — ใช้ dedupe ฝั่ง server
- `bu_code`: แนบค่า BU ที่ผู้ใช้เลือกอยู่ขณะเกิด event
- `user_id` **ไม่ส่งจาก client** — server ประทับจาก token เอง

### Batching & delivery

- คิวในหน่วยความจำ: flush เมื่อครบ 20 events หรือทุก 10 วินาที (อย่างใดถึงก่อน)
- Flush ทันทีเมื่อ `visibilitychange → hidden`
- ส่งด้วย `fetch(..., { keepalive: true })` ผ่าน `lib/http-client.ts` ปกติ (แนบ Bearer + `x-app-id` ให้อยู่แล้ว) — **ไม่ใช้ `navigator.sendBeacon`** เพราะแนบ Authorization header ไม่ได้
- เพดาน batch ≤ 50 events ต่อ request (payload ของ keepalive fetch จำกัด ~64KB)
- เริ่มเก็บหลัง login สำเร็จเท่านั้น — event ที่เกิดก่อนมี token ถูกทิ้ง (หน้า `/login` ไม่ถูก track)

### หลักการเหล็ก: analytics ห้ามทำแอปพัง

- ทุก call ห่อ try/catch — ความล้มเหลวเงียบ ไม่มี toast ไม่มี error boundary
- Network ล้มเหลว: requeue batch กลับคิว, คิว cap 500 events (เกินแล้วทิ้งของเก่าสุด) กันหน่วยความจำบวม
- Server ตอบ 4xx: ทิ้ง batch ไม่ retry (payload ผิดรูป retry ไปก็ผิดเหมือนเดิม)
- 401 กลาง flush: ทิ้งเงียบ (กลไก refresh token ของ http-client จัดการรอบถัดไปเอง)
- **ไม่เก็บค่าจาก input/form เด็ดขาด** — เก็บเฉพาะ identity ของ element, path, label (กัน PII/ข้อมูลธุรกิจรั่วเข้า analytics)

## ส่วนที่ 2 — Backend ingest (`carmen-turborepo-backend-v2`)

### Endpoint

- `POST /api/analytics-events` ที่ backend-gateway — ฝั่ง frontend เพิ่ม `API_ENDPOINTS.ANALYTICS_EVENTS = "/api/proxy/api/analytics-events"` (ตาม convention `/api/proxy/api/<rest>` เดิม) — ไม่มี `bu_code` ใน path เพราะแต่ละ event ใน batch พก `bu_code` ของตัวเอง (batch อาจคร่อมจังหวะสลับ BU)
- Guard ตามปกติ: `KeycloakGuard` (ไม่ต้องมี permission พิเศษ — ผู้ใช้ login แล้วส่งได้ทุกคน)
- **คนละตัวกับ activity-logs ที่มีอยู่แล้ว** (`/api/:bu_code/activity-logs` = audit log การแก้ไขราย entity ฝั่ง server) — `tb_activity_event` เป็น telemetry ฝั่ง UI เท่านั้น ไม่แทนที่กัน
- Body: `{ events: [...] }` — Zod validate, **สูงสุด 100 events ต่อ request** เกินตอบ 400
- ต่อ event: `event_id` (uuid), `session_id`, `bu_code`, `event_type` (`click` | `page_view`), `page_path` (ตัด 512), `element_id`/`element_text` (ตัด 100/200), `props` (jsonb), `client_ts` (ISO 8601 UTC)
- **`user_id` ประทับจาก token ฝั่ง server** — ไม่รับจาก payload; `server_ts` ประทับตอน insert
- Gateway → TCP → **micro-business** (อยู่ร่วมโดเมน logging เดิม) → เขียนผ่าน platform Prisma client
- Insert ด้วย `createMany({ skipDuplicates: true })` อาศัย unique index บน `event_id` → client retry ไม่สร้าง duplicate
- ตอบ `201` + `{ count }` ทันทีหลัง insert — ห้ามมี logic หนักขวางทาง (ปรับจากร่างแรกที่ระบุ 204 ให้เข้า pattern `Result` + `respond()` ของ gateway)

### ตาราง `tb_activity_event` (prisma-shared-schema-platform)

| คอลัมน์ | ชนิด | หมายเหตุ |
|---|---|---|
| `id` | uuid PK `gen_random_uuid()` | ตาม convention backend |
| `event_id` | uuid, **unique** | client สร้าง — idempotency |
| `session_id` | text | |
| `user_id` | uuid | จาก token |
| `bu_code` | text | |
| `event_type` | text | `click` / `page_view` (Prisma enum) |
| `page_path` | text | |
| `element_id` | text? | |
| `element_text` | text? | |
| `props` | jsonb, default `{}` | รวม `route_pattern`, `data-*` extras |
| `client_ts` | timestamptz | เวลาที่ browser |
| `server_ts` | timestamptz, default `now()` | เวลาที่ server รับ |

Index: unique(`event_id`), (`server_ts`), (`bu_code`, `server_ts`), (`user_id`, `server_ts`)

**ข้อยกเว้นจาก convention องค์กร (ตั้งใจ):** ตารางนี้ไม่มี soft delete (`deleted_at`) และไม่มี audit columns (`created_by_id` ฯลฯ) — เป็นตาราง append-only ปริมาณสูง ไม่มีการแก้ไขราย row มีแต่ retention job ลบเป็นชุด; `server_ts` ทำหน้าที่ `created_at` อยู่แล้ว

## ส่วนที่ 3 — Rollup + retention (`micro-cronjobs`)

### ตารางสรุป `tb_activity_event_daily`

คอลัมน์: `day` (date), `bu_code`, `event_type`, `page_path`, `element_id`, `clicks` (count), `sessions` (distinct session), `users` (distinct user) — unique บน (`day`, `bu_code`, `event_type`, `page_path`, `element_id`)

### Cron jobs (รันใน micro-cronjobs)

หมายเหตุ: scheduler ของ micro-cronjobs รันใน timezone ของ HQ BU (ปกติ Asia/Bangkok) ไม่ใช่ UTC — เวลาข้างล่างจึงเป็นเวลา scheduler ส่วน**ขอบเขต "วัน" ของข้อมูลสรุปเป็น UTC date** ตามกฎ timezone องค์กร

1. **Rollup รายวัน** (03:30 เวลา scheduler): recompute สรุปของ 2 วัน UTC ล่าสุดที่จบแล้ว (self-heal event ที่มาช้า) upsert ด้วย ON CONFLICT — idempotent รันซ้ำได้
2. **Retention** (04:00 เวลา scheduler): ลบ raw event ที่ `server_ts` เก่ากว่า **365 วัน** — ลบเป็น batch ครั้งละ 10,000 rows กัน lock ยาว
3. ตารางสรุปเก็บตลอดไป (ขนาดเล็ก)

**ต้องเปิด retention job พร้อมกับ tracking ตั้งแต่วันแรก** — ไม่ใช่ค่อยตามแก้ทีหลัง

## การทดสอบ

หมายเหตุการ execute: ตามกฎ workflow ของ user (Skip Automated Tests During Plan Execution) — Phase 1 implement โดย**ไม่สร้าง test file** ใช้ static checks + manual/browser verify เป็นหลัก; รายการ unit test ข้างล่างคงไว้เป็น coverage ที่ควรมีหากตัดสินใจเติม test ภายหลัง

- **Frontend unit (Vitest):** derive `element_id` ตามลำดับ priority, queue/flush ตาม threshold+interval, cap 500, requeue เมื่อ network fail, ทิ้งเมื่อ 4xx, ไม่ track ก่อน auth
- **Backend:** Zod schema (เกิน 100 → 400, ISO ts ผิดรูป → 400), service test (`user_id` มาจาก token ไม่ใช่ payload, skipDuplicates)
- **Browser verify (ตามกฎ repo):** เปิดแอปจริง คลิก/เปลี่ยนหน้า → เช็ค network batch, reload → session เดิม, ปิดแท็บ → batch สุดท้ายถึง server, console ไม่มี error

## เกณฑ์ความสำเร็จ

1. คลิกปุ่ม/เปลี่ยนหน้าในแอป → row ปรากฏใน `tb_activity_event` พร้อม `user_id`, `bu_code`, `session_id` ถูกต้อง
2. ปิดแท็บทันทีหลังคลิก → event ไม่หาย (keepalive flush ทำงาน)
3. Retry จาก network เดิม ๆ ไม่สร้าง row ซ้ำ (dedupe ด้วย `event_id`)
4. แอปทำงานปกติแม้ endpoint analytics ล่ม — ไม่มี error โผล่ถึงผู้ใช้
5. Query สรุปการใช้งานราย BU/หน้า/ปุ่ม ได้จาก `tb_activity_event_daily`

## นอก scope (Phase 2 และหลังจากนั้น)

- Dashboard/กราฟใน `/system-admin`
- Funnel UI, session replay
- ปุ่มเปิด/ปิด tracking ราย BU (`tb_application_config`)
- การเติม `data-track` semantic names ให้ปุ่มสำคัญ (ทำได้เรื่อย ๆ หลัง Phase 1 ขึ้น โดยไม่ต้องแก้ระบบ)
