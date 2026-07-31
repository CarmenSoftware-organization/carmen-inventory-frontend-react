# Activity Event Client Context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เก็บ `domain` (hostname), `app_id` (x-app-id) และ `user_agent` ของ client ลง `tb_activity_event` โดยประทับค่าฝั่ง server จาก HTTP header และเพิ่ม `domain`/`app_id` เป็น dimension ของตารางสรุปรายวัน

**Architecture:** gateway อ่าน 3 header (`x-app-id`, `Origin`, `User-Agent`) ที่ endpoint `POST /api/analytics-events` แปลงเป็น `ClientContext` แล้วส่งเป็น argument ผ่าน TCP ไปให้ micro-business ประทับลงทุกแถวของ batch — payload ที่ frontend ส่งและ Zod schema ไม่เปลี่ยน จึงไม่ต้องแตะ frontend repo เลย ฝั่ง rollup (Go) เพิ่ม 2 dimension ใน SQL ของ job `activity_rollup`

**Tech Stack:** NestJS + Prisma (PostgreSQL platform schema) · Go 1.x + GORM (micro-cronjobs) · bun

**Spec:** `docs/superpowers/specs/2026-07-31-activity-event-client-context-design.md`

## Global Constraints

- **ห้ามแตะ frontend repo** (`carmen-inventory-frontend-react`) — payload และ `ActivityEventSchema` (Zod) เท่าเดิม ค่าใหม่ทั้งหมด server-stamped
- **ไม่เขียน automated test** ในแผนนี้ (ตาม working preference ของ user) — ใช้ static check + manual verification แทน; ห้ามสร้างไฟล์ `*.spec.ts` / `*_test.go`
- **Telemetry ห้ามทำ request ล้ม** — โค้ดที่อ่าน header ต้องไม่ throw ทุกกรณี (header หาย/เพี้ยน/ซ้ำ → `null`)
- ความยาวสูงสุดก่อนเขียน DB: `domain` = 253 ตัวอักษร, `user_agent` = 512 ตัวอักษร
- `tb_activity_event_daily` **ไม่มี** `user_agent` — dimension ใหม่คือ `domain` + `app_id` เท่านั้น
- ตาราง daily ใช้ `TEXT NOT NULL DEFAULT ''` เป็น sentinel (ห้าม nullable — `NULL` ทำให้ `ON CONFLICT` dedup ไม่ติด)
- ไม่เพิ่ม index ใหม่บน `tb_activity_event` (insert path เป็น hot path)
- ทุก repo แตกงานจาก `main` เป็น branch ชื่อ `feature/activity-event-client-context`
- Commit message: **ภาษาอังกฤษ** (convention ของ `carmen-turborepo-backend-v2` และ `micro-cronjobs`)
- Comment ในโค้ดใหม่: อธิบายเหตุผล (why) ตามสไตล์ไฟล์ข้างเคียง — ไฟล์ analytics เดิมใช้คอมเมนต์ไทย/อังกฤษปนตามบริบท ให้ตามไฟล์ที่กำลังแก้

## File Structure

**`carmen-turborepo-backend-v2`** (Task 1–3)

| ไฟล์ | หน้าที่ |
|---|---|
| `packages/prisma-shared-schema-platform/prisma/schema.prisma` | เพิ่มคอลัมน์ใน 2 model + เปลี่ยน `@@unique` ของ daily |
| `packages/prisma-shared-schema-platform/prisma/migrations/20260731000000_activity_event_client_context/migration.sql` | **สร้างใหม่** — ALTER TABLE + ล้าง daily + สร้าง unique index ใหม่ |
| `apps/backend-gateway/src/common/helpers/extract_client_context.ts` | **สร้างใหม่** — แปลง header → `ClientContext` (หน้าที่เดียว, ไม่มี side effect) |
| `apps/backend-gateway/src/application/analytics-events/analytics-events.controller.ts` | เรียก helper แล้วส่งต่อ service |
| `apps/backend-gateway/src/application/analytics-events/analytics-events.service.ts` | แนบ `client` ลง TCP payload |
| `apps/micro-business/src/common/interfaces/microservice-payload.interface.ts` | ประกาศ field `client` |
| `apps/micro-business/src/log/activity-event/activity-event.controller.ts` | ส่ง `payload.client` ต่อ |
| `apps/micro-business/src/log/activity-event/activity-event.service.ts` | ประทับ 3 ค่าลงทุกแถวของ batch |

**`micro-cronjobs`** (Task 4)

| ไฟล์ | หน้าที่ |
|---|---|
| `internal/executor/activity_rollup.go` | เพิ่ม `domain`/`app_id` ใน SELECT / GROUP BY / ON CONFLICT |

---

### Task 1: Schema + migration (platform DB)

**Files:**
- Modify: `packages/prisma-shared-schema-platform/prisma/schema.prisma` (model `tb_activity_event`, `tb_activity_event_daily`)
- Create: `packages/prisma-shared-schema-platform/prisma/migrations/20260731000000_activity_event_client_context/migration.sql`

**Interfaces:**
- Consumes: —
- Produces: คอลัมน์ `tb_activity_event.app_id` (uuid, null), `.domain` (text, null), `.user_agent` (text, null); `tb_activity_event_daily.domain` / `.app_id` (text, not null, default `''`); unique index `activityeventdaily_dim_u` = `(day, bu_code, domain, app_id, event_type, page_path, element_id)` — Task 2–4 อ้างชื่อคอลัมน์เหล่านี้

- [ ] **Step 1: แตก branch ใน repo backend**

```bash
cd ../carmen-turborepo-backend-v2
git checkout main && git pull
git checkout -b feature/activity-event-client-context
```

- [ ] **Step 2: แก้ model `tb_activity_event` ใน `prisma/schema.prisma`**

แทนที่ model เดิมทั้งก้อนด้วย (คอลัมน์ใหม่ 3 ตัววางต่อจาก `bu_code`):

```prisma
model tb_activity_event {
  id           String                   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  event_id     String                   @unique(map: "activityevent_event_id_u") @db.Uuid
  session_id   String
  user_id      String                   @db.Uuid
  bu_code      String?
  app_id       String?                  @db.Uuid
  domain       String?
  user_agent   String?
  event_type   enum_activity_event_type
  page_path    String
  element_id   String?
  element_text String?
  props        Json?                    @default("{}") @db.JsonB
  client_ts    DateTime                 @db.Timestamptz(6)
  server_ts    DateTime                 @default(now()) @db.Timestamptz(6)

  @@index([server_ts], map: "activityevent_server_ts_idx")
  @@index([bu_code, server_ts], map: "activityevent_bu_server_ts_idx")
  @@index([user_id, server_ts], map: "activityevent_user_server_ts_idx")
}
```

- [ ] **Step 3: แก้ model `tb_activity_event_daily` ในไฟล์เดียวกัน**

แทนที่ model เดิมทั้งก้อนด้วย:

```prisma
model tb_activity_event_daily {
  id         String                   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  day        DateTime                 @db.Date
  bu_code    String                   @default("")
  domain     String                   @default("")
  app_id     String                   @default("")
  event_type enum_activity_event_type
  page_path  String
  element_id String                   @default("")
  clicks     Int                      @default(0)
  sessions   Int                      @default(0)
  users      Int                      @default(0)

  @@unique([day, bu_code, domain, app_id, event_type, page_path, element_id], map: "activityeventdaily_dim_u")
  @@index([day], map: "activityeventdaily_day_idx")
}
```

`app_id` ที่นี่เป็น `String` ธรรมดา (ไม่ใช่ `@db.Uuid`) โดยตั้งใจ — dimension table ใช้ `''` เป็น sentinel แทน NULL เพราะ Postgres มอง NULL ในดัชนี unique เป็นค่าไม่ซ้ำกัน ทำให้ `ON CONFLICT` ของ rollup dedup ไม่ติด

- [ ] **Step 4: สร้างไฟล์ migration**

สร้าง `packages/prisma-shared-schema-platform/prisma/migrations/20260731000000_activity_event_client_context/migration.sql`:

```sql
-- Activity event client context: app_id / domain / user_agent
-- Idempotent per platform-schema convention (survives partial application on drifted DB)
ALTER TABLE "tb_activity_event" ADD COLUMN IF NOT EXISTS "app_id" UUID;
ALTER TABLE "tb_activity_event" ADD COLUMN IF NOT EXISTS "domain" TEXT;
ALTER TABLE "tb_activity_event" ADD COLUMN IF NOT EXISTS "user_agent" TEXT;

ALTER TABLE "tb_activity_event_daily" ADD COLUMN IF NOT EXISTS "domain" TEXT NOT NULL DEFAULT '';
ALTER TABLE "tb_activity_event_daily" ADD COLUMN IF NOT EXISTS "app_id" TEXT NOT NULL DEFAULT '';

-- แถวสรุปเดิมคำนวณด้วย dimension ชุดเก่า (ได้ domain=''/app_id='' จาก DEFAULT)
-- rollup รอบถัดไปจะ insert แถวใหม่ที่มีค่าจริงโดยไม่ทับของเก่า → นับซ้ำ
-- ล้างทิ้งแล้วให้ rollup สร้างใหม่จาก raw (raw retention 365 วัน ยังเก็บครบ)
DELETE FROM "tb_activity_event_daily";

DROP INDEX IF EXISTS "activityeventdaily_dim_u";
CREATE UNIQUE INDEX IF NOT EXISTS "activityeventdaily_dim_u"
  ON "tb_activity_event_daily"("day", "bu_code", "domain", "app_id", "event_type", "page_path", "element_id");
```

- [ ] **Step 5: generate Prisma client แล้ว type-check**

```bash
cd packages/prisma-shared-schema-platform
bun run db:generate
cd ../..
bunx tsc --noEmit -p apps/micro-business/tsconfig.json
```

Expected: `db:generate` สำเร็จ (ไม่ต้องต่อ DB), tsc ไม่มี error — คอลัมน์ใหม่เป็น optional ทั้งหมดจึงยังไม่มีที่ไหนพัง

- [ ] **Step 6: Commit**

```bash
git add packages/prisma-shared-schema-platform/prisma/schema.prisma \
        packages/prisma-shared-schema-platform/prisma/migrations/20260731000000_activity_event_client_context
git commit -m "feat(platform-schema): add app_id/domain/user_agent to tb_activity_event + domain/app_id rollup dimensions"
```

---

### Task 2: Gateway — อ่าน header เป็น ClientContext

**Files:**
- Create: `apps/backend-gateway/src/common/helpers/extract_client_context.ts`
- Modify: `apps/backend-gateway/src/application/analytics-events/analytics-events.controller.ts` (ส่วน import + method `createBatch`)
- Modify: `apps/backend-gateway/src/application/analytics-events/analytics-events.service.ts` (signature + payload ของ `createBatch`)

**Interfaces:**
- Consumes: คอลัมน์จาก Task 1 (ยังไม่ได้ใช้ตรง ๆ ในไฟล์เหล่านี้)
- Produces:
  - `interface ClientContext { app_id: string | null; domain: string | null; user_agent: string | null }`
  - `function ExtractClientContext(req): ClientContext`
  - `AnalyticsEventsService.createBatch(data: IActivityEventBatch, user_id: string, client: ClientContext): Promise<Result<unknown>>`
  - TCP payload มี field `client` (Task 3 อ่านจากตรงนี้)

- [ ] **Step 1: สร้าง helper `extract_client_context.ts`**

```ts
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_DOMAIN_LENGTH = 253; // ความยาวสูงสุดของ DNS name
const MAX_USER_AGENT_LENGTH = 512;

/**
 * Client context stamped by the gateway from request headers (analytics ingest)
 * บริบทฝั่ง client ที่ gateway ประทับจาก header ของคำขอ (สำหรับ analytics ingest)
 */
export interface ClientContext {
  app_id: string | null;
  domain: string | null;
  user_agent: string | null;
}

/**
 * Read a header as a trimmed non-empty string, rejecting duplicated (array) headers
 * อ่าน header เป็นสตริงที่ไม่ว่าง โดยปฏิเสธ header ที่ส่งซ้ำ (เป็น array)
 * @param headers - Request headers object / อ็อบเจกต์ header ของคำขอ
 * @param name - Lowercase header name / ชื่อ header ตัวพิมพ์เล็ก
 * @returns Header value or null / ค่าของ header หรือ null
 */
function readHeader(headers: Record<string, unknown>, name: string): string | null {
  const value = headers?.[name];
  if (typeof value !== 'string') return null; // array = ส่งซ้ำหลายครั้ง ถือว่าเชื่อไม่ได้
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * Extract app id, origin hostname and user agent from request headers for telemetry rows
 * ดึง app id, hostname จาก Origin และ user agent จาก header เพื่อบันทึกลงแถว telemetry
 *
 * Never throws — a malformed header must not fail a request that already passed the guards.
 * ห้าม throw เด็ดขาด — header ที่ผิดรูปต้องไม่ทำให้คำขอที่ผ่าน guard มาแล้วล้ม
 * @param req - HTTP request object / อ็อบเจกต์คำขอ HTTP
 * @returns Client context with null for anything missing or unusable / บริบท client โดยค่าที่ขาดหรือใช้ไม่ได้เป็น null
 */
export function ExtractClientContext(req: { headers?: Record<string, unknown> }): ClientContext {
  const headers = req?.headers ?? {};

  const rawAppId = readHeader(headers, 'x-app-id');
  const rawOrigin = readHeader(headers, 'origin');
  const rawUserAgent = readHeader(headers, 'user-agent');

  let domain: string | null = null;
  if (rawOrigin) {
    try {
      // เก็บเฉพาะ hostname — ตัด scheme/port/path ออก เพื่อให้ค่าเทียบกันได้ระหว่าง deployment
      domain = new URL(rawOrigin).hostname.toLowerCase().slice(0, MAX_DOMAIN_LENGTH) || null;
    } catch {
      domain = null; // Origin เพี้ยน — telemetry ห้ามทำคำขอล้ม
    }
  }

  return {
    // AppIdGuard ตรวจ UUID มาแล้ว แต่ต้องกันไว้อีกชั้น: ค่าที่ไม่ใช่ UUID จะทำให้ Prisma throw ตอน cast แล้วล้มทั้ง batch
    app_id: rawAppId && UUID_REGEX.test(rawAppId) ? rawAppId : null,
    domain,
    user_agent: rawUserAgent ? rawUserAgent.slice(0, MAX_USER_AGENT_LENGTH) : null,
  };
}
```

- [ ] **Step 2: เรียก helper ใน controller**

ใน `analytics-events.controller.ts` เพิ่ม import ต่อจากบรรทัด import ของ `ExtractRequestHeader`:

```ts
import { ExtractClientContext } from '@/common/helpers/extract_client_context';
```

แล้วแทนที่เนื้อ method `createBatch` (บล็อกสองบรรทัดสุดท้ายก่อน `this.respond`):

```ts
    const { user_id } = ExtractRequestHeader(req);
    const client = ExtractClientContext(req);
    const result = await this.analyticsEventsService.createBatch(body, user_id, client);
    this.respond(res, result, HttpStatus.CREATED);
```

- [ ] **Step 3: ส่ง `client` ต่อใน service**

ใน `analytics-events.service.ts` เพิ่ม import:

```ts
import { ClientContext } from '@/common/helpers/extract_client_context';
```

แล้วแก้ method `createBatch` เป็น:

```ts
  /**
   * Sends a batch of UI telemetry events to the business microservice for dedupe + insert
   * ส่ง batch ของ UI telemetry events ไปยังไมโครเซอร์วิสธุรกิจเพื่อ dedupe และบันทึก
   * @param data - Batch of activity events / batch ของ activity events
   * @param user_id - User ID from token / รหัสผู้ใช้จาก token
   * @param client - Client context stamped from request headers / บริบท client ที่ประทับจาก header
   * @returns Result wrapping the inserted count / Result ที่ห่อจำนวนแถวที่บันทึก
   */
  async createBatch(data: IActivityEventBatch, user_id: string, client: ClientContext): Promise<Result<unknown>> {
    const res: Observable<MicroserviceResponse> = this.businessService.send(
      { cmd: 'activity-events.create-batch', service: 'activity-events' },
      { data, user_id, client, ...getGatewayRequestContext() },
    );
```

(ส่วนที่เหลือของ method เดิมไม่เปลี่ยน)

จงใจไม่ยัด `client` ลง `getGatewayRequestContext()` เพราะ context นั้นถูกแนบไปกับ TCP call ของทุก microservice ทั้งระบบ — field ที่มีผู้อ่านรายเดียวไม่ควรทำให้ payload ของทุก request หนักขึ้น

- [ ] **Step 4: Type-check + lint**

```bash
cd ../carmen-turborepo-backend-v2
bunx tsc --noEmit -p apps/backend-gateway/tsconfig.json
```

Expected: ไม่มี error

- [ ] **Step 5: Commit**

```bash
git add apps/backend-gateway/src/common/helpers/extract_client_context.ts \
        apps/backend-gateway/src/application/analytics-events/analytics-events.controller.ts \
        apps/backend-gateway/src/application/analytics-events/analytics-events.service.ts
git commit -m "feat(gateway): stamp app_id/domain/user_agent from headers onto analytics ingest"
```

---

### Task 3: micro-business — เขียนค่าลงทุกแถวของ batch

**Files:**
- Modify: `apps/micro-business/src/common/interfaces/microservice-payload.interface.ts` (เพิ่ม field `client`)
- Modify: `apps/micro-business/src/log/activity-event/activity-event.controller.ts` (ส่ง `payload.client`)
- Modify: `apps/micro-business/src/log/activity-event/activity-event.service.ts` (signature + mapping)

**Interfaces:**
- Consumes: TCP payload field `client: { app_id, domain, user_agent }` จาก Task 2 · คอลัมน์ DB จาก Task 1
- Produces: `ActivityEventService.createBatch(data, user_id, client?): Promise<Result<unknown>>` — แถวใน `tb_activity_event` มีค่าทั้งสาม

- [ ] **Step 1: ประกาศ field `client` ใน `MicroservicePayload`**

ใน `microservice-payload.interface.ts` เพิ่มต่อจากบล็อก `// Audit context` (หลังบรรทัด `user_agent?: string;`):

```ts
  /** Client context stamped by the gateway from request headers (analytics ingest) */
  client?: {
    app_id?: string | null;
    domain?: string | null;
    user_agent?: string | null;
  };
```

- [ ] **Step 2: ส่ง `payload.client` ต่อใน controller**

ใน `activity-event.controller.ts` แก้บรรทัดที่เรียก service เป็น:

```ts
    const result = await this.activityEventService.createBatch(payload.data, payload.user_id, payload.client);
```

และเติมบรรทัด `@param` ใน JSDoc ของ method ให้ตรง:

```ts
   * @param payload - Contains data.events array, user_id and client context / ประกอบด้วยอาร์เรย์ data.events, user_id และบริบท client
```

- [ ] **Step 3: ประทับค่าใน service**

ใน `activity-event.service.ts` เพิ่ม interface ต่อจาก `IActivityEventInput`:

```ts
/** บริบท client ที่ gateway ประทับจาก header — ค่าเดียวกันทั้ง batch เพราะมาจาก request เดียว */
interface IClientContext {
  app_id?: string | null;
  domain?: string | null;
  user_agent?: string | null;
}
```

แก้ signature และ mapping ของ `createBatch`:

```ts
  /**
   * Batch-insert activity events, skipping duplicates by event_id for idempotent retries
   * เพิ่ม activity event เป็นชุด โดยข้ามรายการที่ event_id ซ้ำ เพื่อรองรับการ retry แบบ idempotent
   * @param data - Object containing the events array / ออบเจกต์ที่มีอาร์เรย์ events
   * @param data.events - Events to insert / รายการ event ที่จะเพิ่ม
   * @param user_id - User ID the events belong to / ID ผู้ใช้ที่เป็นเจ้าของ event เหล่านี้
   * @param client - Client context from the gateway / บริบท client จาก gateway
   * @returns Count of rows inserted / จำนวนแถวที่เพิ่มสำเร็จ
   */
  @TryCatch
  async createBatch(
    data: { events: IActivityEventInput[] },
    user_id: string,
    client?: IClientContext,
  ): Promise<Result<unknown>> {
    const events = data?.events ?? [];
    if (events.length === 0) {
      return Result.ok({ count: 0 });
    }
    const result = await this.prismaSystem.tb_activity_event.createMany({
      data: events.map((e) => ({
        event_id: e.event_id,
        session_id: e.session_id,
        user_id,
        bu_code: e.bu_code ?? null,
        // client context เหมือนกันทุกแถว — batch หนึ่งมาจาก request เดียว
        app_id: client?.app_id ?? null,
        domain: client?.domain ?? null,
        user_agent: client?.user_agent ?? null,
        event_type: e.event_type,
        page_path: e.page_path,
        element_id: e.element_id ?? null,
        element_text: e.element_text ?? null,
        props: (e.props ?? {}) as object,
        client_ts: new Date(e.client_ts).toISOString(),
      })),
      skipDuplicates: true, // idempotency ผ่าน unique(event_id) — client retry ไม่สร้างแถวซ้ำ
    });
    return Result.ok({ count: result.count });
  }
```

- [ ] **Step 4: Type-check**

```bash
cd ../carmen-turborepo-backend-v2
bunx tsc --noEmit -p apps/micro-business/tsconfig.json
```

Expected: ไม่มี error (ถ้าฟ้องว่าไม่รู้จัก `app_id`/`domain`/`user_agent` แปลว่า Step 5 ของ Task 1 (`db:generate`) ยังไม่ได้รัน — รันแล้วลองใหม่)

- [ ] **Step 5: Commit**

```bash
git add apps/micro-business/src/common/interfaces/microservice-payload.interface.ts \
        apps/micro-business/src/log/activity-event/activity-event.controller.ts \
        apps/micro-business/src/log/activity-event/activity-event.service.ts
git commit -m "feat(micro-business): persist client context (app_id/domain/user_agent) on activity events"
```

---

### Task 4: Rollup — เพิ่ม domain/app_id เป็น dimension

**Files:**
- Modify: `micro-cronjobs/internal/executor/activity_rollup.go` (ตัวแปร `sql` ใน `Execute`)

**Interfaces:**
- Consumes: คอลัมน์ `domain`/`app_id` จาก Task 1 (ทั้ง raw และ daily) + unique index `activityeventdaily_dim_u` ชุดใหม่
- Produces: แถวใน `tb_activity_event_daily` ที่แยกตาม `domain` และ `app_id`

- [ ] **Step 1: แตก branch ใน repo micro-cronjobs**

```bash
cd ../micro-cronjobs
git checkout main && git pull
git checkout -b feature/activity-event-client-context
```

- [ ] **Step 2: แก้ SQL ใน `activity_rollup.go`**

แทนที่บล็อก `sql := fmt.Sprintf(...)` ทั้งก้อน (คอมเมนต์เหนือมันด้วย) ด้วย:

```go
		// bu_code/element_id/domain/app_id use COALESCE '' to match the daily
		// table's NOT NULL default — Postgres unique indexes treat NULLs as
		// distinct, so without this the ON CONFLICT dedup wouldn't catch repeat
		// rows. user_agent is deliberately NOT a dimension: raw UA strings are
		// near-unique per device and would blow the daily table up to raw size.
		sql := fmt.Sprintf(`
INSERT INTO %q.tb_activity_event_daily (day, bu_code, domain, app_id, event_type, page_path, element_id, clicks, sessions, users)
SELECT (server_ts AT TIME ZONE 'UTC')::date,
       COALESCE(bu_code, ''),
       COALESCE(domain, ''),
       COALESCE(app_id::text, ''),
       event_type,
       page_path,
       COALESCE(element_id, ''),
       COUNT(*),
       COUNT(DISTINCT session_id),
       COUNT(DISTINCT user_id)
FROM %q.tb_activity_event
WHERE server_ts >= ? AND server_ts < ?
GROUP BY 1, 2, 3, 4, 5, 6, 7
ON CONFLICT (day, bu_code, domain, app_id, event_type, page_path, element_id)
DO UPDATE SET clicks = EXCLUDED.clicks, sessions = EXCLUDED.sessions, users = EXCLUDED.users`,
			e.schema, e.schema)
```

- [ ] **Step 3: Build + vet**

```bash
cd ../micro-cronjobs
go build ./... && go vet ./...
```

Expected: ไม่มี output (สำเร็จทั้งคู่)

- [ ] **Step 4: Commit**

```bash
git add internal/executor/activity_rollup.go
git commit -m "feat: roll up activity events by domain and app_id"
```

---

### Task 5: Manual verification บน local/dev

**Files:** ไม่แก้ไฟล์ — เป็นการตรวจของจริง

**Interfaces:**
- Consumes: ทุกอย่างจาก Task 1–4

> ⚠️ **DB ที่ `:4000` ชี้ dev ที่ทีมใช้ร่วมกัน** — migration นี้มี `DELETE FROM tb_activity_event_daily` ให้ dump ตารางเก็บไว้ก่อนเสมอ:
> `pg_dump -t tb_activity_event_daily "$DATABASE_URL" > /tmp/daily-backup-$(date +%F).sql`

- [ ] **Step 1: apply migration**

```bash
cd ../carmen-turborepo-backend-v2/packages/prisma-shared-schema-platform
bun run db:deploy
```

Expected: migration `20260731000000_activity_event_client_context` ขึ้นสถานะ applied

- [ ] **Step 2: สตาร์ท gateway + micro-business แล้วยิง event ที่มี header ครบ**

ขอ token จาก gateway ก่อน (บัญชี dev — `X_APP_ID` อ่านได้จาก `public/config.local.json` ของ frontend repo):

```bash
APP_ID=$(node -p "require('../carmen-inventory-frontend-react/public/config.local.json').X_APP_ID")
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "x-app-id: $APP_ID" -H "Content-Type: application/json" \
  -d '{"email":"admin@zebra.com","password":"12345678"}' | node -p "JSON.parse(require('fs').readFileSync(0)).access_token")
```

ถ้า path ของ token ในคำตอบไม่ตรง ให้ยิง login แล้วดู JSON เต็ม ๆ ก่อนแล้วค่อยดึง field ที่ถูกต้อง จากนั้นยิง event:

```bash
curl -i -X POST http://localhost:4000/api/analytics-events \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-app-id: $APP_ID" \
  -H "Origin: https://uat.carmen.com" \
  -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36" \
  -H "Content-Type: application/json" \
  -d '{"events":[{"event_id":"11111111-1111-4111-8111-111111111111","session_id":"verify-1","event_type":"click","page_path":"/verify","element_id":"verify.full","client_ts":"2026-07-31T03:00:00.000Z"}]}'
```

Expected: `201` และแถวใน DB:

```sql
SELECT domain, app_id, left(user_agent, 30) FROM tb_activity_event WHERE session_id = 'verify-1';
-- uat.carmen.com | <APP_ID> | Mozilla/5.0 (Macintosh; Intel
```

- [ ] **Step 3: ยิงซ้ำโดยไม่ส่ง Origin (ต้องไม่ error)**

ใช้คำสั่งเดิมแต่ตัด `-H "Origin: ..."` ออก และเปลี่ยน `event_id` เป็น `22222222-2222-4222-8222-222222222222`, `session_id` เป็น `verify-2`

Expected: `201` และ

```sql
SELECT domain IS NULL AS domain_is_null, app_id IS NOT NULL AS has_app FROM tb_activity_event WHERE session_id = 'verify-2';
-- t | t
```

- [ ] **Step 4: ตรวจการตัด scheme/port/path ของ Origin และการตัดความยาว UA**

ยิงอีกครั้งด้วย `event_id` `33333333-3333-4333-8333-333333333333`, `session_id` `verify-3`, `-H "Origin: https://uat.carmen.com:8443"` และ User-Agent ยาวเกิน 512 ตัว:

```bash
LONG_UA=$(printf 'A%.0s' {1..2000})
```

Expected:

```sql
SELECT domain, length(user_agent) FROM tb_activity_event WHERE session_id = 'verify-3';
-- uat.carmen.com | 512
```

- [ ] **Step 5: รัน rollup ด้วยมือแล้วตรวจ dimension ใหม่**

```bash
cd ../micro-cronjobs && make build && ./bin/micro-cronjob &   # ต้องมี .env ชี้ dev DB
curl -s http://localhost:6016/api/cronjobs | grep -o '"id":"[^"]*","name":"[^"]*activity[^"]*"'
curl -X POST http://localhost:6016/api/cronjobs/<activity_rollup_id>/execute
```

Expected: log `activity rollup done` และ

```sql
SELECT day, domain, app_id, clicks FROM tb_activity_event_daily ORDER BY day DESC LIMIT 10;
-- มีแถวที่ domain = 'uat.carmen.com' และ app_id ตรงกับ raw
```

รัน execute ซ้ำอีกรอบ → จำนวนแถวใน `tb_activity_event_daily` ต้อง**ไม่เพิ่ม** (พิสูจน์ว่า `ON CONFLICT` ชุดใหม่ dedup ติด):

```sql
SELECT count(*) FROM tb_activity_event_daily;
```

- [ ] **Step 6: ตรวจของจริงผ่านเบราว์เซอร์**

เปิด SPA (`bun dev` ที่ frontend repo, proxy ไป :4000) → login → คลิกเมนูสัก 20 ครั้งให้ถึง flush threshold → รอไม่เกิน 10 วินาที

Expected: console ไม่มี error และ

```sql
SELECT domain, left(user_agent, 20), count(*) FROM tb_activity_event
WHERE server_ts > now() - interval '5 minutes' GROUP BY 1, 2;
-- domain = 'localhost' (หรือ hostname ที่เปิดจริง), user_agent = UA ของเบราว์เซอร์ที่ใช้
```

- [ ] **Step 7: ลบแถวทดสอบ**

```sql
DELETE FROM tb_activity_event WHERE session_id IN ('verify-1','verify-2','verify-3');
```

- [ ] **Step 8: เปิด PR ทั้งสอง repo**

```bash
cd ../carmen-turborepo-backend-v2 && git push -u origin feature/activity-event-client-context && gh pr create --fill
cd ../micro-cronjobs && git push -u origin feature/activity-event-client-context && gh pr create --fill
```

ใน PR body ของฝั่ง backend ต้องระบุลำดับ deploy: **migration → backend (gateway + micro-business) → micro-cronjobs** และเตือนว่า migration ล้างตาราง daily (ให้ตั้ง `days_back` ของ job `activity_rollup` ให้ครอบคลุมช่วงที่ raw ยังอยู่ รันหนึ่งรอบ แล้วคืนค่าเดิม) พร้อมเลี่ยงหน้าต่าง 03:30 น. ที่ rollup ทำงานตามตาราง
