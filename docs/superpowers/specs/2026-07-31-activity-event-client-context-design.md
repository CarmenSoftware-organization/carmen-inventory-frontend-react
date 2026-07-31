# Activity Event — Client Context (domain / app_id / user_agent) Design

**วันที่:** 2026-07-31
**สถานะ:** รอ review
**Repos ที่เกี่ยวข้อง:** `carmen-turborepo-backend-v2` (schema + ingest), `micro-cronjobs` (rollup)
**ต่อยอดจาก:** `2026-07-30-click-analytics-design.md` (Phase 1 — merged: FE #85, BE #267, cron #1)

## เป้าหมาย

เพิ่มบริบทฝั่ง client ลง `tb_activity_event` เพื่อตอบคำถามที่ Phase 1 ตอบไม่ได้:

1. **event มาจาก deployment/โดเมนไหน** — `uat.carmen.com` vs `demo.carmen.com` vs โดเมนของลูกค้าแต่ละราย
2. **event มาจากแอปไหน** — web SPA / mobile / แอปอื่นที่ลงทะเบียนใน `tb_application`
3. **ผู้ใช้ใช้ browser/อุปกรณ์อะไร** — สำหรับงาน support และตัดสินใจเรื่อง browser support

## การตัดสินใจหลัก (จาก brainstorm)

| ประเด็น | ตัดสินใจ | เหตุผล |
|---|---|---|
| `domain` หมายถึงอะไร | hostname ของหน้าเว็บที่ผู้ใช้เปิด | ต้องการแยก deployment / ลูกค้า ไม่ใช่ email domain หรือโดเมนธุรกิจ |
| ค่าทั้งสามมาจากไหน | **server ประทับจาก header** (`x-app-id`, `Origin`, `User-Agent`) | client ปลอมไม่ได้, payload ต่อ event ไม่โต, **frontend ไม่ต้องแก้/deploy เลย** |
| `user_agent` เก็บรูปไหน | **เก็บสตริงดิบทั้งก้อน ไม่ parse** | ไม่ต้องเพิ่ม dependency ที่ gateway, ไม่ต้อง maintain ตาราง mapping browser, วิเคราะห์ทีหลังด้วย SQL ได้ |
| dimension ของ rollup รายวัน | เพิ่ม `domain` + `app_id` เท่านั้น | `user_agent` ดิบแทบไม่ซ้ำกันเลย ถ้าเป็น dimension แถว daily จะเกือบเท่าจำนวน event ดิบ = rollup หมดความหมาย |
| index บน raw table | ไม่เพิ่ม | insert path เป็นทางร้อนของ telemetry; การวิเคราะห์ยิงที่ daily เป็นหลัก |
| fallback ของ `domain` | ไม่มี (ไม่มี Origin → `NULL`) | browser แนบ `Origin` กับ POST ทุกครั้งอยู่แล้ว; client อื่น (script/native) ปล่อยว่างได้ ไม่ต้อง maintain โค้ด fallback |

## สถาปัตยกรรม

```
Browser (SPA)                     backend-gateway                 micro-business        platform DB
┌──────────────────┐   headers:  ┌───────────────────────────┐   TCP   ┌─────────────┐  ┌──────────────────────┐
│ lib/analytics.ts │ ─ x-app-id ─│ POST /api/analytics-events │ ──────► │ createMany  │─►│ tb_activity_event    │
│ (ไม่แก้อะไรเลย)   │ ─ Origin ───│  AppIdGuard ✓              │ client  │ ประทับค่าเดิม │  │ + app_id/domain/     │
│                  │ ─ User-Agent│  ExtractClientContext()    │ context │ ทุกแถวใน batch│  │   user_agent         │
└──────────────────┘             └───────────────────────────┘         └─────────────┘  └──────────┬───────────┘
                                                                                                   │ cron 03:30
                                                                                     ┌─────────────▼──────────┐
                                                                       micro-cronjobs│ tb_activity_event_daily │
                                                                       rollup        │ + domain, app_id (dim)  │
                                                                                     └────────────────────────┘
```

Zod schema (`ActivityEventSchema`) และ payload ที่ frontend ส่ง **ไม่เปลี่ยน** — ค่าใหม่ทั้งสามถูกประทับฝั่ง server ทั้งหมด เช่นเดียวกับ `user_id` ที่มาจาก token อยู่แล้ว

## ส่วนที่ 1 — Schema (`packages/prisma-shared-schema-platform`)

### `tb_activity_event` (raw) — เพิ่ม 3 คอลัมน์ nullable

| คอลัมน์ | ชนิด | ที่มา | ข้อจำกัด |
|---|---|---|---|
| `app_id` | `UUID NULL` | header `x-app-id` | ผ่าน `AppIdGuard` แล้ว = UUID จริง + อยู่ใน allowlist |
| `domain` | `TEXT NULL` | hostname จาก `Origin` | lowercase, ไม่มี scheme/port, ตัดที่ 253 ตัว |
| `user_agent` | `TEXT NULL` | header `User-Agent` | สตริงดิบ ตัดที่ 512 ตัว |

nullable ทั้งหมด — แถวที่บันทึกไปแล้วก่อน migration ไม่มีค่าเหล่านี้ และ client ที่ไม่ส่ง header ก็ยังต้อง ingest ผ่าน

### `tb_activity_event_daily` (rollup) — เพิ่ม 2 คอลัมน์เป็น dimension

```prisma
domain  String @default("")
app_id  String @default("")   // เก็บ uuid เป็น text — ดูเหตุผลด้านล่าง
```

ทั้งสองเป็น `TEXT NOT NULL DEFAULT ''` เพราะ Postgres ถือว่า `NULL` ในดัชนี unique เป็นค่าที่ไม่ซ้ำกัน — ถ้าปล่อย null ไว้ `ON CONFLICT` ของ rollup จะ dedup ไม่ติดและ upsert กลายเป็น insert ซ้ำทุกวัน ตารางนี้ใช้ `''`-sentinel กับ `bu_code`/`element_id` อยู่แล้วด้วยเหตุผลเดียวกัน `app_id` จึงเป็น `TEXT` (ไม่ใช่ `UUID`) เพื่อใช้ sentinel ตัวเดียวกันได้

unique index เปลี่ยนเป็น:

```
(day, bu_code, domain, app_id, event_type, page_path, element_id)
```

### Migration (idempotent ตาม convention ของ platform schema)

```sql
-- Activity event client context: app_id / domain / user_agent
ALTER TABLE "tb_activity_event" ADD COLUMN IF NOT EXISTS "app_id" UUID;
ALTER TABLE "tb_activity_event" ADD COLUMN IF NOT EXISTS "domain" TEXT;
ALTER TABLE "tb_activity_event" ADD COLUMN IF NOT EXISTS "user_agent" TEXT;

ALTER TABLE "tb_activity_event_daily" ADD COLUMN IF NOT EXISTS "domain" TEXT NOT NULL DEFAULT '';
ALTER TABLE "tb_activity_event_daily" ADD COLUMN IF NOT EXISTS "app_id" TEXT NOT NULL DEFAULT '';

-- แถวสรุปเดิมคำนวณด้วย dimension ชุดเก่า (ได้ domain=''/app_id='' จาก DEFAULT)
-- rollup รอบถัดไปจะ insert แถวใหม่ที่มีค่าจริงโดยไม่ทับของเก่า → นับซ้ำ
-- ล้างทิ้งแล้วให้ rollup สร้างใหม่จาก raw (ฟีเจอร์เพิ่งขึ้น ไม่มีข้อมูลประวัติศาสตร์ให้เสีย)
DELETE FROM "tb_activity_event_daily";

DROP INDEX IF EXISTS "activityeventdaily_dim_u";
CREATE UNIQUE INDEX IF NOT EXISTS "activityeventdaily_dim_u"
  ON "tb_activity_event_daily"("day", "bu_code", "domain", "app_id", "event_type", "page_path", "element_id");
```

**เงื่อนไขการล้าง daily:** ใช้ได้เพราะ raw ยังเก็บครบ (retention 1 ปี) และ daily เพิ่งเริ่มสะสมเมื่อ 2026-07-30 ตอน deploy จริงต้องรัน rollup ย้อนหลังให้ครอบคลุมช่วงที่ raw ยังอยู่ (ตั้ง `days_back` ใน job config ชั่วคราว) ก่อนถือว่าตาราง daily ใช้งานได้

## ส่วนที่ 2 — Ingest (`apps/backend-gateway`)

### Helper ใหม่: `src/common/helpers/extract_client_context.ts`

```ts
export interface ClientContext {
  app_id: string | null;
  domain: string | null;
  user_agent: string | null;
}

export function ExtractClientContext(req: Request): ClientContext
```

กติกา:

- อ่าน `x-app-id` → รับเฉพาะค่าที่เป็น string และตรง UUID regex (ค่าที่ไม่ใช่ UUID จะไม่ถึง handler อยู่แล้วเพราะ `AppIdGuard` แต่ต้อง defensive — ถ้าปล่อยผ่าน Prisma จะ throw ตอน cast `uuid` แล้ว ingest ล้มทั้ง batch)
- อ่าน `origin` → `new URL(origin).hostname` ใน `try/catch`, `.toLowerCase()`, ตัด 253 ตัว, parse ไม่ผ่าน → `null`
- อ่าน `user-agent` → รับเฉพาะ string, ตัด 512 ตัว
- header ที่ Node ส่งมาเป็น `string[]` (ซ้ำหลายครั้ง) ถือว่าไม่น่าเชื่อถือ → `null`
- **ห้าม throw ทุกกรณี** — request ที่ผ่าน guard มาแล้วต้องไม่ล้มเพราะ telemetry

### `analytics-events.controller.ts`

```ts
const { user_id } = ExtractRequestHeader(req);
const client = ExtractClientContext(req);
const result = await this.analyticsEventsService.createBatch(body, user_id, client);
```

### `analytics-events.service.ts`

`createBatch(data, user_id, client)` แนบ `client` ลง TCP payload:

```ts
{ data, user_id, client, ...getGatewayRequestContext() }
```

**จงใจไม่ยัดลง `GatewayRequestContext`** ทั้งที่ context นั้นมี `user_agent` อยู่แล้ว เพราะ AsyncLocalStorage ตัวนั้นถูกแนบไปกับ TCP call ของ **ทุก** microservice ทั้งระบบ การเพิ่ม field ที่มีผู้อ่านรายเดียวเข้าไปคือทำให้ payload ทุก request หนักขึ้นโดยไม่มีใครใช้ ส่งเป็น argument ตรง ๆ ชัดกว่าและเทสง่ายกว่า

## ส่วนที่ 3 — Persist (`apps/micro-business`)

- `MicroservicePayload` เพิ่ม field ทางเลือก `client?: { app_id?, domain?, user_agent? }`
- `activity-event.controller.ts` ส่ง `payload.client` ต่อเข้า service
- `activity-event.service.ts` — `createBatch(data, user_id, client)` ประทับค่าทั้งสามลง **ทุกแถวใน batch** (batch หนึ่งมาจาก request เดียว จึงมี client context ชุดเดียวเสมอ):

```ts
app_id: client?.app_id ?? null,
domain: client?.domain ?? null,
user_agent: client?.user_agent ?? null,
```

`skipDuplicates` ตาม `event_id` ยังทำงานเหมือนเดิม — retry จาก client ไม่สร้างแถวซ้ำ และไม่อัปเดตค่า client context ของแถวเดิม (ยอมรับได้: ค่าเดิมมาจาก request แรกของ session เดียวกัน)

## ส่วนที่ 4 — Rollup (`micro-cronjobs`)

`internal/executor/activity_rollup.go` — เพิ่ม 2 dimension:

```sql
INSERT INTO %q.tb_activity_event_daily
  (day, bu_code, domain, app_id, event_type, page_path, element_id, clicks, sessions, users)
SELECT (server_ts AT TIME ZONE 'UTC')::date,
       COALESCE(bu_code, ''),
       COALESCE(domain, ''),
       COALESCE(app_id::text, ''),
       event_type,
       page_path,
       COALESCE(element_id, ''),
       COUNT(*), COUNT(DISTINCT session_id), COUNT(DISTINCT user_id)
FROM %q.tb_activity_event
WHERE server_ts >= ? AND server_ts < ?
GROUP BY 1, 2, 3, 4, 5, 6, 7
ON CONFLICT (day, bu_code, domain, app_id, event_type, page_path, element_id)
DO UPDATE SET clicks = EXCLUDED.clicks, sessions = EXCLUDED.sessions, users = EXCLUDED.users
```

`activity_retention.go` ไม่เปลี่ยน (ลบตาม `server_ts` เหมือนเดิม)

## สิ่งที่ไม่ทำ (YAGNI)

- **ไม่แตะ frontend** — payload และ Zod schema เท่าเดิม deploy FE ใหม่ไม่จำเป็น
- **ไม่ parse user-agent** เป็น browser/version/OS — เก็บดิบ วิเคราะห์ทีหลังด้วย SQL ได้
- **ไม่เพิ่ม index** บน `tb_activity_event`
- **ไม่มี API อ่านข้อมูล** — ยัง query ตรงผ่าน SQL/BI tool ตาม Phase 1
- **ไม่ backfill** ค่าให้แถวเก่า — ไม่มีแหล่งข้อมูลให้ backfill (header ของ request เก่าไม่ได้ถูกเก็บไว้)

## แผน deploy

1. **รัน migration** บน platform DB — เลี่ยงหน้าต่าง 03:30 น. (Asia/Bangkok) ที่ rollup ทำงาน
2. **deploy backend** (`backend-gateway` + `micro-business`) — schema ใหม่กับ gateway เก่าอยู่ด้วยกันได้ แค่คอลัมน์ว่าง
3. **deploy micro-cronjobs** — ต้องหลัง migration เสมอ เพราะ SQL ใหม่อ้างคอลัมน์ใหม่ ถ้าขึ้นก่อนจะ error ทุกรอบ
4. ตั้ง `days_back` ของ job `activity-rollup` ให้ครอบคลุมช่วงที่ raw ยังอยู่ รันหนึ่งรอบเพื่อสร้าง daily ใหม่ แล้วคืนค่าเดิม

ไม่ต้องแตะ allowlist (`tb_application_api`) — endpoint เดิม ไม่มี API ใหม่

## การตรวจสอบ

Static: `bunx tsc --noEmit` (BE), `go build ./... && go vet ./...` (cronjobs), lint ทั้งสอง repo

Manual (ยิงที่ gateway local :4000):

1. `curl POST /api/analytics-events` พร้อม `Origin: https://uat.carmen.com` + `x-app-id` + `User-Agent` → แถวใน `tb_activity_event` มี `domain='uat.carmen.com'`, `app_id`, `user_agent` ครบ
2. เรียกซ้ำโดย**ไม่ส่ง** `Origin` → ได้ 201 เหมือนเดิม, `domain IS NULL` (ไม่ error)
3. ส่ง `Origin: https://uat.carmen.com:8443/path` → เก็บเฉพาะ `uat.carmen.com` (ตัด scheme/port/path)
4. ส่ง `User-Agent` ยาว 2,000 ตัว → แถวเก็บ 512 ตัว ไม่ error
5. รัน rollup ด้วยมือ → `tb_activity_event_daily` มี `domain`/`app_id` ตรงกับ raw และรันซ้ำแล้วจำนวนแถวไม่เพิ่ม (ON CONFLICT ทำงาน)
6. เปิด SPA จริงในเบราว์เซอร์ คลิกไปมา → แถวใหม่มี `domain` ตรงกับ hostname ที่เปิด และ FE ไม่มี error ใน console
