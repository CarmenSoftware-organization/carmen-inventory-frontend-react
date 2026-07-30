# Click & Usage Analytics — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เก็บ click event + page view ของผู้ใช้ทุก BU ลงตาราง `tb_activity_event` ใน platform DB พร้อม rollup รายวันและ retention 1 ปี

**Architecture:** Frontend (Vite SPA) ดัก event ด้วย delegated listener → batch → `POST /api/analytics-events` ที่ backend-gateway → RPC ไป micro-business → `createMany` ลง platform DB; micro-cronjobs (Go) ทำ rollup รายวัน + retention

**Tech Stack:** React 19 + React Router 7 + TypeScript (FE) · NestJS + nestjs-zod + Prisma (BE) · Go + gocron + GORM (cron)

**Spec:** `docs/superpowers/specs/2026-07-30-click-analytics-design.md`

## Global Constraints

- **ไม่สร้าง automated test** (กฎ CLAUDE.md ของ user: Skip Automated Tests During Plan Execution) — ห้ามสร้าง `*.test.ts` / `*.spec.ts` / `*_test.go`; ทุก task จบด้วย static check + manual verify แทน
- Static checks ที่ต้องผ่านทุก task: FE `bunx tsc --noEmit` + `bun run lint` · BE `bun run check-types` (turbo, scope ตาม app ที่แก้) · cron `go build ./...`
- **Analytics ห้ามทำแอปพัง** — โค้ด FE ทุกทางเข้าห่อ try/catch, fail เงียบ, ไม่มี toast/error UI
- **ห้ามเก็บค่าจาก input/form** — เก็บเฉพาะ element identity / path / label (กัน PII)
- Wire format เป็น `snake_case` ตรง ๆ (FE repo นี้ใช้ snake_case ใน TS types อยู่แล้ว ไม่มี case converter)
- Limits: FE flush เมื่อครบ 20 events หรือทุก 10s · ≤ 50 events/request · คิว cap 500 · BE รับ ≤ 100 events/request
- Prisma platform: ชื่อ model = ชื่อตารางตรง ๆ (`tb_*`, ไม่มี `@@map`), PK `gen_random_uuid()`, `@db.Timestamptz(6)`
- **ตารางใหม่ทั้งสองต้องเข้า `excludeModels` ของ `LogEventsModule`** ใน micro-business — กัน auto-audit เขียน `tb_activity` ตามทุก insert
- Migration platform DB ชี้ shared dev DB (`dev.blueledgers.com`) — เป็น additive เท่านั้น (ตาราง+enum ใหม่ ไม่แตะของเดิม)
- Commit message: FE repo เป็นภาษาไทย (กฎ repo) · BE/cron เป็น conventional commit อังกฤษตาม convention ของ repo นั้น
- ลำดับ deploy: **BE ก่อน FE** (FE ยิงใส่ endpoint ที่ยังไม่มี → 404 → ทิ้ง batch เงียบ ไม่พัง แต่ข้อมูลหาย) และ AppIdGuard ต้องมี allowlist row ก่อน FE จะส่งได้จริง (ดู Deploy checklist ท้ายไฟล์)

## ค่าที่ต่างจาก spec (จงใจ ตัดสินใจตอนสำรวจโค้ดจริง)

1. **Response 201 + `{ count }`** แทน 204 — เข้า pattern `Result` + `BaseHttpController.respond()` ของ gateway (spec ต้องการแค่ "ตอบเร็ว ไม่มี logic หนัก" ซึ่งยังจริง)
2. **เวลา cron เป็น 03:30 / 04:00 Asia/Bangkok** แทน 02:30/03:00 UTC — scheduler ของ micro-cronjobs รันใน timezone ของ HQ BU (ปกติ Asia/Bangkok) ไม่ใช่ UTC; เจตนาเดิมคือ off-peak ซึ่งตี 3-4 เมืองไทยตอบโจทย์กว่า (ขอบเขต "วัน" ของ rollup ยังเป็น **UTC date** ตามกฎ timezone องค์กร)

---

### Task 1: ตาราง `tb_activity_event` + `tb_activity_event_daily` ใน platform Prisma schema

**Repo:** `carmen-turborepo-backend-v2`

**Files:**
- Modify: `packages/prisma-shared-schema-platform/prisma/schema.prisma` (1111 บรรทัด — เพิ่มท้ายไฟล์)
- Create (generated): `packages/prisma-shared-schema-platform/prisma/migrations/<timestamp>_add_activity_event_tables/migration.sql`

**Interfaces:**
- Produces: Prisma models `tb_activity_event`, `tb_activity_event_daily` และ enum `enum_activity_event_type` (`click` | `page_view`) — export อัตโนมัติจาก `@repo/prisma-shared-schema-platform` หลัง `db:generate`; Task 2 ใช้ `prismaSystem.tb_activity_event.createMany`, Task 3 ใช้ `z.nativeEnum(enum_activity_event_type)`, Task 6-7 ยิง SQL ตรงใส่ตารางทั้งสอง

- [ ] **Step 1: เพิ่ม enum + 2 models ท้าย `schema.prisma`**

```prisma
/// ชนิดของ UI telemetry event ที่ frontend ส่งเข้า POST /api/analytics-events
enum enum_activity_event_type {
  click
  page_view
}

/// Raw UI telemetry (append-only) — ไม่มี soft delete / audit columns โดยตั้งใจ:
/// ปริมาณสูง ไม่แก้ไขราย row มีแต่ retention job ลบเป็นชุด (micro-cronjobs)
model tb_activity_event {
  id           String                   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  event_id     String                   @unique(map: "activityevent_event_id_u") @db.Uuid
  session_id   String
  user_id      String                   @db.Uuid
  bu_code      String?
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

/// สรุปรายวัน (UTC date) — เขียนโดย rollup job ใน micro-cronjobs, เก็บตลอดไป
/// bu_code/element_id ใช้ '' แทน NULL เพื่อให้ unique constraint จับซ้ำได้จริง
/// (Postgres ถือ NULL ≠ NULL ใน unique index)
model tb_activity_event_daily {
  id         String                   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  day        DateTime                 @db.Date
  bu_code    String                   @default("")
  event_type enum_activity_event_type
  page_path  String
  element_id String                   @default("")
  clicks     Int                      @default(0)
  sessions   Int                      @default(0)
  users      Int                      @default(0)

  @@unique([day, bu_code, event_type, page_path, element_id], map: "activityeventdaily_dim_u")
  @@index([day], map: "activityeventdaily_day_idx")
}
```

- [ ] **Step 2: สร้าง migration + generate client**

```bash
cd packages/prisma-shared-schema-platform
bun run db:migrate    # prisma migrate dev --skip-generate — ตั้งชื่อ migration: add_activity_event_tables
bun run db:generate
```

คำเตือน: `SYSTEM_DATABASE_URL` ชี้ shared dev DB — migration นี้ additive ล้วน (CREATE TYPE + CREATE TABLE ×2) ตรวจ `migration.sql` ที่ genให้แน่ใจว่า**ไม่มี** DROP/ALTER ของเดิมก่อนปล่อยรัน

- [ ] **Step 3: Static check**

```bash
cd ../..
bun run build:package
```

Expected: build ผ่าน, generated client มี `tb_activity_event` (เช็คว่ามีไฟล์ `packages/prisma-shared-schema-platform/generated/tb_activity_event.ts` หรือ type ใน client)

- [ ] **Step 4: Manual verify — ตารางเกิดจริง**

```bash
# ผ่าน psql หรือ prisma studio; ตัวอย่าง psql (connection จาก .env ของ package):
psql "$SYSTEM_DATABASE_URL" -c '\d tb_activity_event' -c '\d tb_activity_event_daily'
```

Expected: เห็นคอลัมน์ครบ + index 4 ตัว (raw) / unique 1 ตัว (daily)

- [ ] **Step 5: Commit**

```bash
git add packages/prisma-shared-schema-platform
git commit -m "feat(platform-schema): add tb_activity_event + tb_activity_event_daily for UI analytics"
```

---

### Task 2: micro-business — module `activity-event` (RPC handler + createMany)

**Repo:** `carmen-turborepo-backend-v2`

**Files:**
- Create: `apps/micro-business/src/log/activity-event/activity-event.module.ts`
- Create: `apps/micro-business/src/log/activity-event/activity-event.controller.ts`
- Create: `apps/micro-business/src/log/activity-event/activity-event.service.ts`
- Modify: `apps/micro-business/src/app.module.ts` (import module ~บรรทัด 36 กลุ่ม log, register ~บรรทัด 229, และ `excludeModels` ใน `LogEventsModule.forRootAsync` ~บรรทัด 166-205)

**Interfaces:**
- Consumes: `prismaSystem.tb_activity_event.createMany` (Task 1)
- Produces: RPC handler `{ cmd: 'activity-events.create-batch', service: 'activity-events' }` รับ payload `{ data: { events: [...] }, user_id, ...context }` คืน `MicroserviceResponse` status 201 พร้อม `{ count }` — Task 3 เรียกผ่าน `ClientProxy.send`

- [ ] **Step 1: สร้าง service**

`apps/micro-business/src/log/activity-event/activity-event.service.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common';
import { PrismaClient_SYSTEM } from '@repo/prisma-shared-schema-platform';
import { enum_activity_event_type } from '@repo/prisma-shared-schema-platform';
import { Result, TryCatch } from '@/common';
import { BackendLogger } from '@/common/helpers/backend.logger';

/** รูป event ตามที่ gateway validate แล้ว (Zod ที่ gateway เป็นด่านเดียว — micro เชื่อ payload ตาม pattern เดิม) */
interface IActivityEventInput {
  event_id: string;
  session_id: string;
  bu_code?: string | null;
  event_type: enum_activity_event_type;
  page_path: string;
  element_id?: string | null;
  element_text?: string | null;
  props?: Record<string, unknown>;
  client_ts: string;
}

@Injectable()
export class ActivityEventService {
  private readonly logger: BackendLogger = new BackendLogger(ActivityEventService.name);

  constructor(
    @Inject('PRISMA_SYSTEM')
    private readonly prismaSystem: typeof PrismaClient_SYSTEM,
  ) {}

  @TryCatch
  async createBatch(data: { events: IActivityEventInput[] }, user_id: string): Promise<Result<unknown>> {
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
}
```

หมายเหตุ: `server_ts` ไม่ต้องส่ง — `@default(now())` จัดการ; ถ้า `@TryCatch` / `Result` import path ไม่ตรง ให้ดู import จริงจาก `apps/micro-business/src/log/activity-log/activity-log.service.ts` แล้วใช้ตามนั้น

- [ ] **Step 2: สร้าง controller + module**

`apps/micro-business/src/log/activity-event/activity-event.controller.ts`:

```ts
import { Controller, HttpStatus } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ActivityEventService } from './activity-event.service';
import { BackendLogger } from '@/common/helpers/backend.logger';
import { BaseMicroserviceController, MicroservicePayload, MicroserviceResponse } from '@/common';

@Controller()
export class ActivityEventController extends BaseMicroserviceController {
  private readonly logger: BackendLogger = new BackendLogger(ActivityEventController.name);

  constructor(private readonly activityEventService: ActivityEventService) {
    super();
  }

  @MessagePattern({ cmd: 'activity-events.create-batch', service: 'activity-events' })
  async createBatch(@Payload() payload: MicroservicePayload): Promise<MicroserviceResponse> {
    this.logger.debug({ function: 'createBatch', count: payload.data?.events?.length }, ActivityEventController.name);
    const result = await this.activityEventService.createBatch(payload.data, payload.user_id);
    return this.handleResult(result, HttpStatus.CREATED);
  }
}
```

(ไม่มี `initializePrismaService` — เขียน platform DB อย่างเดียว ไม่แตะ tenant; ไม่ใช้ `runWithAuditContext` — ตารางนี้ถูก exclude จาก auto-audit อยู่แล้วใน Step 3)

`apps/micro-business/src/log/activity-event/activity-event.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { ActivityEventController } from './activity-event.controller';
import { ActivityEventService } from './activity-event.service';
import { PrismaClient_SYSTEM } from '@repo/prisma-shared-schema-platform';

@Module({
  controllers: [ActivityEventController],
  providers: [ActivityEventService, { provide: 'PRISMA_SYSTEM', useValue: PrismaClient_SYSTEM }],
  exports: [ActivityEventService],
})
export class ActivityEventModule {}
```

- [ ] **Step 3: Register ใน `app.module.ts` + กัน auto-audit**

ใน `apps/micro-business/src/app.module.ts`:
1. เพิ่ม `import { ActivityEventModule } from './log/activity-event/activity-event.module';` ข้าง import ของ `ActivityLogModule`
2. เพิ่ม `ActivityEventModule,` ใน `imports` ใต้ comment `// Log modules (from micro-log)` (ข้าง `ActivityLogModule` ~บรรทัด 229)
3. ใน `LogEventsModule.forRootAsync` (~บรรทัด 166-205) แก้ `excludeModels`:

```ts
excludeModels: ['_prisma_migrations', 'tb_activity', 'tb_activity_event', 'tb_activity_event_daily'],
```

- [ ] **Step 4: Static check**

```bash
bun run check-types --filter=micro-business
bun run lint --filter=micro-business
```

Expected: ผ่านทั้งคู่ (ถ้า filter syntax ไม่ตรง ใช้ `cd apps/micro-business && bun run check-types`)

- [ ] **Step 5: Commit**

```bash
git add apps/micro-business
git commit -m "feat(micro-business): activity-event RPC handler writing UI telemetry to platform DB"
```

---

### Task 3: gateway — endpoint `POST /api/analytics-events`

**Repo:** `carmen-turborepo-backend-v2`

**Files:**
- Create: `apps/backend-gateway/src/common/dto/activity-event/activity-event.dto.ts`
- Modify: barrel ที่ export DTO ของ delivery-point (หา: `grep -rn "delivery-point.dto" apps/backend-gateway/src/common` แล้วเพิ่ม export บรรทัดข้างกันสำหรับ `activity-event/activity-event.dto`)
- Create: `apps/backend-gateway/src/application/analytics-events/analytics-events.module.ts`
- Create: `apps/backend-gateway/src/application/analytics-events/analytics-events.controller.ts`
- Create: `apps/backend-gateway/src/application/analytics-events/analytics-events.service.ts`
- Create: `apps/backend-gateway/src/application/analytics-events/swagger/request.ts`
- Modify: `apps/backend-gateway/src/application/route-application.ts` (import + register `AnalyticsEventsModule` — pattern เดียวกับ `ActivityLogsModule` บรรทัด 35, 122)
- Modify: `apps/backend-gateway/src/swagger/tag-groups.ts` (เพิ่ม tag `Application: Analytics` เข้า `SWAGGER_TAGS` + group เดียวกับ Activity Log ใน `SWAGGER_TAG_GROUPS`)

**Interfaces:**
- Consumes: RPC `{ cmd: 'activity-events.create-batch', service: 'activity-events' }` (Task 2); enum `enum_activity_event_type` (Task 1)
- Produces: `POST /api/analytics-events` — Bearer + `x-app-id`, body `{ events: ActivityEvent[] }` (≤100), ตอบ `201 { data: { count } }` — Task 4 (FE) เรียกผ่าน `/api/proxy/api/analytics-events`

- [ ] **Step 1: Zod DTO**

`apps/backend-gateway/src/common/dto/activity-event/activity-event.dto.ts`:

```ts
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { enum_activity_event_type } from '@repo/prisma-shared-schema-platform';

export const ActivityEventSchema = z.object({
  event_id: z.string().uuid().openapi({
    example: '018f2f8e-1b2c-7d3e-9f4a-5b6c7d8e9f0a',
    description: 'Client-generated UUID — dedupe key (retry จาก client ไม่สร้างแถวซ้ำ)',
  }),
  session_id: z.string().min(1).max(64).openapi({
    example: 'b4f6d0aa-9d5e-4c1b-8a7f-2e3d4c5b6a79',
    description: 'Session id ต่อแท็บ (sessionStorage ฝั่ง client)',
  }),
  bu_code: z.string().max(64).nullable().optional().openapi({
    example: 'BU-001',
    description: 'BU ที่ผู้ใช้เลือกอยู่ขณะเกิด event (อาจว่างช่วง profile ยังไม่โหลด)',
  }),
  event_type: z.nativeEnum(enum_activity_event_type).openapi({
    example: enum_activity_event_type.click,
    description: 'ชนิด event',
  }),
  page_path: z.string().min(1).max(512).openapi({
    example: '/procurement/purchase-request/1a2b3c',
    description: 'pathname ขณะเกิด event',
  }),
  element_id: z.string().max(100).nullable().optional().openapi({
    example: 'pr.submit',
    description: 'Identity ของ element (data-track → id → aria-label → text)',
  }),
  element_text: z.string().max(200).nullable().optional().openapi({
    example: 'Submit',
    description: 'Label ที่ผู้ใช้เห็น (ตาม locale ผู้ใช้)',
  }),
  props: z.record(z.unknown()).optional().openapi({
    example: { route_pattern: '/procurement/purchase-request/:id' },
    description: 'ข้อมูลเสริม (route_pattern, data-track-* extras)',
  }),
  client_ts: z.string().datetime({ offset: true }).openapi({
    example: '2026-07-30T04:20:00.000Z',
    description: 'เวลาเกิด event ฝั่ง browser (ISO 8601 UTC)',
  }),
});

export const ActivityEventBatchSchema = z.object({
  events: z.array(ActivityEventSchema).min(1).max(100).openapi({
    description: 'Batch ของ events สูงสุด 100 ต่อ request',
  }),
});

export type IActivityEventBatch = z.infer<typeof ActivityEventBatchSchema>;
export class ActivityEventBatchDto extends createZodDto(ActivityEventBatchSchema) {}
```

- [ ] **Step 2: Service**

`apps/backend-gateway/src/application/analytics-events/analytics-events.service.ts`:

```ts
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import { getGatewayRequestContext } from '@/common/context/gateway-request-context';
import { BackendLogger } from '@/common/helpers/backend.logger';
import { IActivityEventBatch, MicroserviceResponse, Result } from '@/common';

@Injectable()
export class AnalyticsEventsService {
  private readonly logger: BackendLogger = new BackendLogger(AnalyticsEventsService.name);

  constructor(@Inject('BUSINESS_SERVICE') private readonly businessService: ClientProxy) {}

  async createBatch(data: IActivityEventBatch, user_id: string): Promise<Result<unknown>> {
    const res: Observable<MicroserviceResponse> = this.businessService.send(
      { cmd: 'activity-events.create-batch', service: 'activity-events' },
      { data, user_id, ...getGatewayRequestContext() },
    );
    const response = await firstValueFrom(res);
    if (response.response.status !== HttpStatus.CREATED) {
      return Result.fromMicroserviceError(response);
    }
    return Result.ok(response.data);
  }
}
```

(ถ้า `IActivityEventBatch` / `MicroserviceResponse` ไม่ได้อยู่ใน barrel `@/common` ให้ import ตรงจากไฟล์ DTO และดู import `MicroserviceResponse` จาก `activity-logs.service.ts` แล้วใช้ path เดียวกัน)

- [ ] **Step 3: Controller + Swagger request + module**

`apps/backend-gateway/src/application/analytics-events/swagger/request.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';

class ActivityEventRequestItem {
  @ApiProperty({ description: 'Client-generated UUID (dedupe key)', example: '018f2f8e-1b2c-7d3e-9f4a-5b6c7d8e9f0a' })
  event_id: string;
  @ApiProperty({ description: 'Per-tab session id', example: 'b4f6d0aa-9d5e-4c1b-8a7f-2e3d4c5b6a79' })
  session_id: string;
  @ApiProperty({ description: 'Selected BU code', example: 'BU-001', required: false, nullable: true })
  bu_code?: string;
  @ApiProperty({ description: 'Event type', enum: ['click', 'page_view'], example: 'click' })
  event_type: string;
  @ApiProperty({ description: 'Pathname when event occurred', example: '/procurement/purchase-request/1a2b3c' })
  page_path: string;
  @ApiProperty({ description: 'Element identity', example: 'pr.submit', required: false, nullable: true })
  element_id?: string;
  @ApiProperty({ description: 'Visible label', example: 'Submit', required: false, nullable: true })
  element_text?: string;
  @ApiProperty({ description: 'Extra props (route_pattern, data-track-*)', required: false, type: Object })
  props?: Record<string, unknown>;
  @ApiProperty({ description: 'Browser timestamp (ISO 8601 UTC)', example: '2026-07-30T04:20:00.000Z' })
  client_ts: string;
}

export class ActivityEventBatchRequest {
  @ApiProperty({ description: 'Batch of UI telemetry events (max 100)', type: [ActivityEventRequestItem] })
  events: ActivityEventRequestItem[];
}
```

`apps/backend-gateway/src/application/analytics-events/analytics-events.controller.ts` (ลอกโครง decorator จาก `config_delivery-points.controller.ts` `create()`; `@OptionalBuCode()` ดูตัวอย่างการใช้จาก controller ที่ไม่มี `:bu_code` เช่น `dashboard-personal-widgets.controller.ts`):

```ts
import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { KeycloakGuard } from 'src/auth/guards/keycloak.guard';
import { OptionalBuCode } from 'src/auth/decorators/optional-bu-code.decorator';
import { AppIdGuard } from '@/common/guard/app-id.guard';
import { ApiHeaderRequiredXAppId, ApiStdResponse, BaseHttpController, ActivityEventBatchDto } from '@/common';
import { ExtractRequestHeader } from '@/common/helpers/extract_header';
import { BackendLogger } from '@/common/helpers/backend.logger';
import { AnalyticsEventsService } from './analytics-events.service';
import { ActivityEventBatchRequest } from './swagger/request';

@Controller('api/analytics-events')
@ApiTags('Application: Analytics')
@ApiHeaderRequiredXAppId()
@UseGuards(KeycloakGuard)
@ApiBearerAuth()
export class AnalyticsEventsController extends BaseHttpController {
  private readonly logger: BackendLogger = new BackendLogger(AnalyticsEventsController.name);

  constructor(private readonly analyticsEventsService: AnalyticsEventsService) {
    super();
  }

  @Post()
  @OptionalBuCode()
  @UseGuards(new AppIdGuard('analyticsEvent.create'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Ingest UI telemetry events (batch)',
    description:
      'รับ batch ของ click/page_view events จาก frontend สูงสุด 100 ต่อ request — user_id ประทับจาก token ฝั่ง server, dedupe ด้วย event_id',
    operationId: 'analyticsEvents_createBatch',
  })
  @ApiBody({
    type: ActivityEventBatchRequest,
    description: 'UI telemetry batch',
    examples: {
      minimal: {
        summary: 'One click event',
        value: {
          events: [
            {
              event_id: '018f2f8e-1b2c-7d3e-9f4a-5b6c7d8e9f0a',
              session_id: 'b4f6d0aa-9d5e-4c1b-8a7f-2e3d4c5b6a79',
              bu_code: 'BU-001',
              event_type: 'click',
              page_path: '/dashboard',
              element_id: 'sidebar.procurement',
              element_text: 'Procurement',
              client_ts: '2026-07-30T04:20:00.000Z',
            },
          ],
        },
      },
    },
  })
  @ApiStdResponse(undefined, { status: 201, description: 'Events ingested (count = rows inserted, duplicates skipped)' })
  @ApiResponse({ status: 400, description: 'Invalid payload or > 100 events' })
  @ApiResponse({ status: 401, description: 'Missing or invalid Bearer token' })
  async createBatch(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: ActivityEventBatchDto,
  ): Promise<void> {
    const { user_id } = ExtractRequestHeader(req);
    const result = await this.analyticsEventsService.createBatch(body, user_id);
    this.respond(res, result, HttpStatus.CREATED);
  }
}
```

`apps/backend-gateway/src/application/analytics-events/analytics-events.module.ts` (ลอก `activity-logs.module.ts` ทั้งโครง):

```ts
import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { envConfig } from 'src/libs/config.env';
import { rpcClient } from '@repo/nest-http-transport';
import { AnalyticsEventsController } from './analytics-events.controller';
import { AnalyticsEventsService } from './analytics-events.service';

@Module({
  imports: [
    ClientsModule.register([
      rpcClient({
        name: 'BUSINESS_SERVICE',
        host: envConfig.BUSINESS_SERVICE_HOST,
        port: Number(envConfig.BUSINESS_SERVICE_RPC_PORT),
      }),
    ]),
  ],
  controllers: [AnalyticsEventsController],
  providers: [AnalyticsEventsService],
})
export class AnalyticsEventsModule {}
```

- [ ] **Step 4: Register route module + Swagger tag**

1. `apps/backend-gateway/src/application/route-application.ts`: import + เพิ่ม `AnalyticsEventsModule` (ข้าง `ActivityLogsModule`)
2. `apps/backend-gateway/src/swagger/tag-groups.ts`: เพิ่ม `{ name: 'Application: Analytics', description: 'UI telemetry ingest' }` ใน `SWAGGER_TAGS` และใส่ชื่อ tag เข้า group เดียวกับ `Reports: Activity Log` ใน `SWAGGER_TAG_GROUPS`

- [ ] **Step 5: Static check**

```bash
bun run check-types --filter=backend-gateway
bun run lint --filter=backend-gateway
```

- [ ] **Step 6: Manual verify — curl ยิงจริง (local gateway :4000 + micro-business)**

รัน backend ตามปกติ (`bun run dev:base` / `bun run dev:business` ตาม README) แล้ว:

```bash
# 1) login เอา token (test account: admin@zebra.com / 12345678 — dev เท่านั้น)
TOKEN=$(curl -s http://localhost:4000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@zebra.com","password":"12345678"}' | jq -r '.access_token // .data.access_token')

# 2) ยิง batch (x-app-id เอาจาก public/config.local.json ของ FE repo)
curl -s -X POST http://localhost:4000/api/analytics-events \
  -H "Authorization: Bearer $TOKEN" -H 'x-app-id: <X_APP_ID>' -H 'Content-Type: application/json' \
  -d '{"events":[{"event_id":"018f2f8e-1b2c-7d3e-9f4a-5b6c7d8e9f0a","session_id":"s1","bu_code":"BU-001","event_type":"click","page_path":"/dashboard","element_id":"test.button","client_ts":"2026-07-30T04:20:00.000Z"}]}'
# Expected: 201 {"data":{"count":1}} (ครั้งที่สอง event_id เดิม → count:0 = dedupe ทำงาน)

# 3) เกิน 100 events → 400; ไม่มี token → 401
```

ถ้าเจอ 400/403 จาก AppIdGuard: เพิ่ม allowlist row ใน dev DB ก่อน (ดู Deploy checklist) แล้วยิงซ้ำ

- [ ] **Step 7: Commit**

```bash
git add apps/backend-gateway
git commit -m "feat(gateway): POST /api/analytics-events batch ingest endpoint"
```

---

### Task 4: FE — `lib/analytics.ts` (queue/batch/click capture) + endpoint const

**Repo:** `carmen-inventory-frontend-react`

**Files:**
- Modify: `constant/api-endpoints.ts` (เพิ่ม key เรียง alphabet — หลัง `ADJUSTMENT_TYPES`, ก่อน `APPLICATION_ROLES`)
- Create: `lib/analytics.ts`

**Interfaces:**
- Consumes: `httpClient.post(url, body, { keepalive: true })` · `tokenStore.get()` · `getSessionItem`/`setSessionItem` จาก `@/lib/safe-storage`
- Produces (Task 5 ใช้): `startAnalytics(): void` · `stopAnalytics(): void` · `setAnalyticsBuCode(buCode: string | undefined): void` · `trackPageView(pathname: string, routePattern: string): void` · `toRoutePattern(pathname: string, params: Record<string, string | undefined>): string`

- [ ] **Step 1: เพิ่ม endpoint**

ใน `constant/api-endpoints.ts`:

```ts
  /** UI telemetry batch ingest (click + page view) — ดู lib/analytics.ts */
  ANALYTICS_EVENTS: "/api/proxy/api/analytics-events",
```

- [ ] **Step 2: สร้าง `lib/analytics.ts`** (ไฟล์เต็ม)

```ts
/**
 * UI telemetry — ดัก click + page view ทั้งแอป, batch แล้วส่งเข้า POST /api/analytics-events
 *
 * กฎเหล็ก: analytics ห้ามทำแอปพัง — ทุกทางเข้า fail เงียบ ไม่มี error UI
 * ห้ามเก็บค่าจาก input/form (กัน PII) — เก็บเฉพาะ identity ของ element / path / label
 */
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { tokenStore } from "@/lib/auth/token-store";
import { httpClient } from "@/lib/http-client";
import { getSessionItem, setSessionItem } from "@/lib/safe-storage";

const SESSION_KEY = "carmen.analytics.session";
const FLUSH_THRESHOLD = 20;
const FLUSH_INTERVAL_MS = 10_000;
/** เพดานต่อ request — payload ของ keepalive fetch จำกัด ~64KB และ backend รับ ≤100 */
const MAX_BATCH_SIZE = 50;
/** เพดานคิวในหน่วยความจำ — เกินแล้วทิ้งของเก่าสุด */
const MAX_QUEUE_SIZE = 500;
const MAX_ID_LENGTH = 100;
const MAX_TEXT_LENGTH = 200;
const CLICKABLE_SELECTOR = '[data-track], button, a, [role="button"]';

type AnalyticsEventType = "click" | "page_view";

interface AnalyticsEvent {
  event_id: string;
  session_id: string;
  bu_code?: string;
  event_type: AnalyticsEventType;
  page_path: string;
  element_id?: string;
  element_text?: string;
  props?: Record<string, unknown>;
  client_ts: string;
}

let queue: AnalyticsEvent[] = [];
let currentBuCode: string | undefined;
let flushTimer: ReturnType<typeof setInterval> | undefined;
let started = false;
let flushing = false;

/** session ต่อแท็บ รอด reload (sessionStorage) — จบเมื่อปิดแท็บ */
function getSessionId(): string {
  let id = getSessionItem<string>(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    setSessionItem(SESSION_KEY, id);
  }
  return id;
}

/** ป้อน bu_code ปัจจุบันจาก React (AnalyticsBridge) — module นี้อ่าน TanStack Query เองไม่ได้ */
export function setAnalyticsBuCode(buCode: string | undefined): void {
  currentBuCode = buCode;
}

function enqueue(event_type: AnalyticsEventType, fields: Partial<AnalyticsEvent>): void {
  try {
    // เก็บเฉพาะหลัง login — event ก่อนมี token ทิ้ง (endpoint ต้องการ auth)
    if (!started || !tokenStore.get()) return;
    queue.push({
      event_id: crypto.randomUUID(),
      session_id: getSessionId(),
      bu_code: currentBuCode,
      event_type,
      page_path: fields.page_path ?? window.location.pathname,
      element_id: fields.element_id,
      element_text: fields.element_text,
      props: fields.props,
      client_ts: new Date().toISOString(),
    });
    if (queue.length > MAX_QUEUE_SIZE) queue = queue.slice(queue.length - MAX_QUEUE_SIZE);
    if (queue.length >= FLUSH_THRESHOLD) void flush();
  } catch {
    // analytics ห้ามทำแอปพัง
  }
}

export function trackPageView(pathname: string, routePattern: string): void {
  enqueue("page_view", { page_path: pathname, props: { route_pattern: routePattern } });
}

/** identity ของ element: data-track → id → aria-label → text (ตัด 100 ตัวอักษร) */
function deriveElementId(el: HTMLElement): string | undefined {
  const explicit = el.dataset.track;
  if (explicit) return explicit.slice(0, MAX_ID_LENGTH);
  if (el.id) return el.id.slice(0, MAX_ID_LENGTH);
  const aria = el.getAttribute("aria-label");
  if (aria) return aria.slice(0, MAX_ID_LENGTH);
  const text = (el.textContent ?? "").trim();
  return text ? text.slice(0, MAX_ID_LENGTH) : undefined;
}

/** เก็บเฉพาะ data-track-* extras (ไม่กวาด dataset ทั้งก้อน — กัน radix state/ข้อมูลไม่เกี่ยวปนเข้ามา) */
function collectTrackProps(el: HTMLElement): Record<string, unknown> | undefined {
  const entries = Object.entries(el.dataset).filter(([key]) => key !== "track" && key.startsWith("track"));
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function handleDocumentClick(event: MouseEvent): void {
  try {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const el = target.closest<HTMLElement>(CLICKABLE_SELECTOR);
    if (!el) return;
    const text = (el.textContent ?? "").trim();
    enqueue("click", {
      element_id: deriveElementId(el),
      element_text: text ? text.slice(0, MAX_TEXT_LENGTH) : undefined,
      props: collectTrackProps(el),
    });
  } catch {
    // analytics ห้ามทำแอปพัง
  }
}

async function flush(useKeepalive = false): Promise<void> {
  if (flushing || queue.length === 0) return;
  if (!tokenStore.get()) {
    queue = [];
    return;
  }
  flushing = true;
  const batch = queue.slice(0, MAX_BATCH_SIZE);
  queue = queue.slice(batch.length);
  try {
    // ได้ response กลับมา (รวม 4xx/5xx): ถือว่าจบ — ทิ้ง batch ไม่ retry กัน storm
    await httpClient.post(
      API_ENDPOINTS.ANALYTICS_EVENTS,
      { events: batch },
      useKeepalive ? { keepalive: true } : undefined,
    );
  } catch {
    // network/timeout/client-rate-limit: คืน batch เข้าคิวรอรอบหน้า (cap คิวกันบวม)
    queue = batch.concat(queue).slice(0, MAX_QUEUE_SIZE);
  } finally {
    flushing = false;
  }
}

function handleVisibilityChange(): void {
  // แท็บกำลังหาย — flush ทันทีด้วย keepalive (fetch keepalive แนบ Bearer ได้ ต่างจาก sendBeacon)
  if (document.visibilityState === "hidden") void flush(true);
}

/** เริ่มดัก event — idempotent, เรียกจาก AnalyticsBridge ตอน mount (ใน ProtectedShell เท่านั้น) */
export function startAnalytics(): void {
  if (started) return;
  started = true;
  // capture phase — ให้ได้ event แม้ component ข้างในจะ stopPropagation
  document.addEventListener("click", handleDocumentClick, true);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  flushTimer = setInterval(() => void flush(), FLUSH_INTERVAL_MS);
}

export function stopAnalytics(): void {
  if (!started) return;
  started = false;
  document.removeEventListener("click", handleDocumentClick, true);
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  if (flushTimer) clearInterval(flushTimer);
  flushTimer = undefined;
  void flush();
}

/**
 * แปลง pathname เป็น route pattern สำหรับ funnel ข้ามเอกสาร
 * เช่น ("/procurement/purchase-request/1a2b", {id:"1a2b"}) → "/procurement/purchase-request/:id"
 * เทียบทีละ segment เต็ม ๆ (ไม่ substring-replace) กันชนกรณีค่า param ไปพ้องกับ segment อื่น
 */
export function toRoutePattern(pathname: string, params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([key, value]) => key !== "*" && !!value);
  return pathname
    .split("/")
    .map((segment) => {
      const hit = entries.find(([, value]) => value === segment);
      return hit ? `:${hit[0]}` : segment;
    })
    .join("/");
}
```

- [ ] **Step 3: Static check**

```bash
bunx tsc --noEmit && bun run lint
```

- [ ] **Step 4: Commit**

```bash
git add constant/api-endpoints.ts lib/analytics.ts
git commit -m "feat(analytics): โมดูลเก็บ click/page view แบบ batch + endpoint const"
```

---

### Task 5: FE — `AnalyticsBridge` + ต่อเข้า `RootLayout` + verify ใน browser จริง

**Repo:** `carmen-inventory-frontend-react`

**Files:**
- Create: `components/analytics-bridge.tsx`
- Modify: `routes/root-layout.tsx` (render `<AnalyticsBridge />` เพิ่มใน JSX ที่ return — วางเป็น sibling แรกของเนื้อหาเดิม ไม่แตะโครงอื่น)

**Interfaces:**
- Consumes: `startAnalytics` / `stopAnalytics` / `setAnalyticsBuCode` / `trackPageView` / `toRoutePattern` (Task 4) · `useBuCode()` จาก `@/hooks/use-bu-code` · `useLocation`/`useParams` จาก `react-router`
- Produces: page view + click ไหลจริงเมื่อผู้ใช้อยู่ใน ProtectedShell (หลัง login เสมอ — `/login` ไม่ถูก track เพราะ bridge อยู่ใน RootLayout)

- [ ] **Step 1: สร้าง `components/analytics-bridge.tsx`**

```tsx
import { useEffect } from "react";
import { useLocation, useParams } from "react-router";
import { useBuCode } from "@/hooks/use-bu-code";
import {
  setAnalyticsBuCode,
  startAnalytics,
  stopAnalytics,
  toRoutePattern,
  trackPageView,
} from "@/lib/analytics";

/**
 * สะพานเชื่อม React → lib/analytics (module นอก React อ่าน router/query cache เองไม่ได้)
 * — mount ใน RootLayout (ProtectedShell) เท่านั้น จึงเริ่มเก็บหลัง login เสมอ
 */
export function AnalyticsBridge() {
  const buCode = useBuCode();
  const location = useLocation();
  const params = useParams();

  useEffect(() => {
    startAnalytics();
    return () => stopAnalytics();
  }, []);

  useEffect(() => {
    setAnalyticsBuCode(buCode);
  }, [buCode]);

  useEffect(() => {
    trackPageView(location.pathname, toRoutePattern(location.pathname, params));
    // ตั้งใจผูกกับ pathname เท่านั้น — params เปลี่ยนตาม pathname อยู่แล้ว
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return null;
}
```

- [ ] **Step 2: Mount ใน `routes/root-layout.tsx`**

เปิดไฟล์ อ่านโครง JSX เดิม แล้วเพิ่ม `import { AnalyticsBridge } from "@/components/analytics-bridge";` และ render `<AnalyticsBridge />` เป็น child แรกของ element นอกสุดที่ return (ก่อน sidebar/navbar เดิม) — ห้ามแก้โครงอื่น

- [ ] **Step 3: Static check**

```bash
bunx tsc --noEmit && bun run lint
```

- [ ] **Step 4: Manual verify — browser จริง end-to-end (ต้องมี backend local รันอยู่ + Task 1-3 เสร็จ)**

```bash
VITE_DEV_PROXY_TARGET=http://localhost:4000 bun dev
```

เช็คลิสต์ใน browser (login: admin@zebra.com / 12345678):
1. login → เข้า dashboard → เปิด DevTools Network filter `analytics-events` — ภายใน ~10s เห็น POST 201 มี `page_view` ของ `/dashboard`
2. คลิกเมนู sidebar / ปุ่มต่าง ๆ ~5 ครั้ง → batch ถัดไปมี `click` events พร้อม `element_id`/`element_text`
3. เข้าหน้าเอกสาร (เช่น PR รายตัว) → `page_view` มี `props.route_pattern` เป็น `/procurement/purchase-request/:id`
4. reload หน้า → `session_id` เดิม (sessionStorage)
5. คลิกปุ่มแล้วปิดแท็บทันที → เปิด psql เช็คว่า event สุดท้ายถึง DB (keepalive ทำงาน):
   `psql "$SYSTEM_DATABASE_URL" -c "SELECT event_type, page_path, element_id, bu_code, user_id FROM tb_activity_event ORDER BY server_ts DESC LIMIT 10"`
6. Console ต้องไม่มี error จาก analytics เลย; ปิด backend (หยุด gateway) แล้วคลิกต่อ → แอปทำงานปกติ ไม่มี error โผล่
7. logout → คลิกที่หน้า login → Network ต้องไม่มี POST analytics-events

- [ ] **Step 5: Commit**

```bash
git add components/analytics-bridge.tsx routes/root-layout.tsx
git commit -m "feat(analytics): ต่อ AnalyticsBridge เข้า RootLayout เก็บ page view + click จริง"
```

---

### Task 6: micro-cronjobs — rollup executor + seed job

**Repo:** `micro-cronjobs` (Go — scheduler รันใน timezone HQ BU ปกติ Asia/Bangkok; ขอบเขตวันของ rollup เป็น UTC date)

**Files:**
- Modify: `internal/model/cronjob.go` (เพิ่ม config structs ท้ายไฟล์ ข้าง `CleanupJobConfig`)
- Create: `internal/executor/activity_rollup.go`
- Modify: `internal/executor/executor.go` (field + `New(...)` + case ใน switch บรรทัด ~31)
- Modify: `cmd/server/main.go` (~บรรทัด 55 — ส่ง `db.Platform()` + `cfg.PlatformSchema` เข้า `executor.New`)
- Create: `migrations/<ts>_seed_activity_rollup_job.up.sql` + `.down.sql` (`<ts>` จาก `date -u +%Y%m%d%H%M%S`)

**Interfaces:**
- Consumes: ตาราง `"CARMEN_SYSTEM".tb_activity_event` / `tb_activity_event_daily` (Task 1) · `db.Platform() *gorm.DB` · `cfg.PlatformSchema` (env `PLATFORM_SCHEMA`, default `CARMEN_SYSTEM`)
- Produces: job type `activity_rollup` (jobData `{"days_back":2}`) · `executor.New` signature ใหม่: `New(reportURL, notificationURL, dataURL string, db *gorm.DB, platformSchema string, logger *zap.Logger)` — Task 7 เพิ่ม executor ต่อจาก signature นี้ (ไม่แก้ซ้ำ)

- [ ] **Step 1: config struct ใน `internal/model/cronjob.go`** (ท้ายไฟล์ ข้าง `CleanupJobConfig`)

```go
// ActivityRollupJobConfig config ของ job type "activity_rollup"
type ActivityRollupJobConfig struct {
	DaysBack int `json:"days_back"` // จำนวนวัน UTC ย้อนหลังที่ recompute (default 2 — self-heal event ที่มาช้า)
}

// ActivityRetentionJobConfig config ของ job type "activity_retention"
type ActivityRetentionJobConfig struct {
	RetentionDays int `json:"retention_days"` // เก็บ raw กี่วัน (default 365)
	BatchSize     int `json:"batch_size"`     // ลบครั้งละกี่แถว (default 10000)
}
```

- [ ] **Step 2: สร้าง `internal/executor/activity_rollup.go`**

```go
package executor

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/CarmenSoftware/micro-cronjob/internal/model"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// ActivityRollupExecutor สรุป tb_activity_event รายวัน (UTC date) ลง tb_activity_event_daily
// idempotent — upsert ด้วย ON CONFLICT รันซ้ำวันเดิมได้
type ActivityRollupExecutor struct {
	db     *gorm.DB
	schema string
	logger *zap.Logger
}

func NewActivityRollupExecutor(db *gorm.DB, schema string, logger *zap.Logger) *ActivityRollupExecutor {
	return &ActivityRollupExecutor{db: db, schema: schema, logger: logger}
}

func (e *ActivityRollupExecutor) Execute(ctx context.Context, job model.CronJob) error {
	cfg := model.ActivityRollupJobConfig{DaysBack: 2}
	if job.JobConfig != nil {
		b, _ := json.Marshal(job.JobConfig)
		_ = json.Unmarshal(b, &cfg)
	}
	if cfg.DaysBack <= 0 {
		cfg.DaysBack = 2
	}

	nowUTC := time.Now().UTC()
	todayUTC := time.Date(nowUTC.Year(), nowUTC.Month(), nowUTC.Day(), 0, 0, 0, 0, time.UTC)

	// recompute ทีละวันเต็ม (UTC) ย้อนหลัง days_back วัน — วันปัจจุบันยังไม่จบ ไม่แตะ
	for i := 1; i <= cfg.DaysBack; i++ {
		from := todayUTC.AddDate(0, 0, -i)
		to := from.AddDate(0, 0, 1)
		// bu_code/element_id ใช้ COALESCE '' ให้ตรงกับ NOT NULL default ของตาราง daily
		// (unique constraint จับซ้ำได้จริง — NULL ใน unique index ของ Postgres ถือว่าไม่ซ้ำกัน)
		sql := fmt.Sprintf(`
INSERT INTO %q.tb_activity_event_daily (day, bu_code, event_type, page_path, element_id, clicks, sessions, users)
SELECT (server_ts AT TIME ZONE 'UTC')::date,
       COALESCE(bu_code, ''),
       event_type,
       page_path,
       COALESCE(element_id, ''),
       COUNT(*),
       COUNT(DISTINCT session_id),
       COUNT(DISTINCT user_id)
FROM %q.tb_activity_event
WHERE server_ts >= ? AND server_ts < ?
GROUP BY 1, 2, 3, 4, 5
ON CONFLICT (day, bu_code, event_type, page_path, element_id)
DO UPDATE SET clicks = EXCLUDED.clicks, sessions = EXCLUDED.sessions, users = EXCLUDED.users`,
			e.schema, e.schema)

		res := e.db.WithContext(ctx).Exec(sql, from, to)
		if res.Error != nil {
			return fmt.Errorf("activity rollup %s: %w", from.Format("2006-01-02"), res.Error)
		}
		e.logger.Info("activity rollup done",
			zap.String("cronjob_id", job.ID),
			zap.String("day", from.Format("2006-01-02")),
			zap.Int64("rows_upserted", res.RowsAffected))
	}
	return nil
}
```

- [ ] **Step 3: ต่อเข้า `executor.go` + `main.go`**

`internal/executor/executor.go` — เพิ่ม field `activityRollup *ActivityRollupExecutor`, ขยาย `New` เป็น:

```go
func New(reportURL, notificationURL, dataURL string, db *gorm.DB, platformSchema string, logger *zap.Logger) *JobExecutor {
```

(สร้าง `activityRollup: NewActivityRollupExecutor(db, platformSchema, logger)` ใน constructor — คง argument เดิมทั้งหมดไว้ตามลำดับเดิม) แล้วเพิ่ม case ใน switch:

```go
	case "activity_rollup":
		return e.activityRollup.Execute(ctx, job)
```

`cmd/server/main.go` ~บรรทัด 55 — เพิ่ม `db.Platform(), cfg.PlatformSchema` เข้า call `executor.New(...)` (ดูชื่อ method/field จริงของ DB struct ใน `internal/repository/db.go` — `Platform()` — และ config ใน `internal/config/config.go` — `PlatformSchema`)

- [ ] **Step 4: Seed migration**

`migrations/<ts>_seed_activity_rollup_job.up.sql` (pattern เดียวกับ `20260610120000_seed_dashboard_refresh_jobs.up.sql`):

```sql
-- 03:30 เวลา scheduler (HQ BU timezone ปกติ Asia/Bangkok) — off-peak; ขอบเขตวันใน job เป็น UTC
INSERT INTO "CRONJOBS"."Cronjob" (name, "jobType", "cronExpression", "jobData", "isActive")
SELECT 'Activity events daily rollup', 'activity_rollup', '30 3 * * *', '{"days_back":2}'::jsonb, true
WHERE NOT EXISTS (
    SELECT 1 FROM "CRONJOBS"."Cronjob"
    WHERE name = 'Activity events daily rollup' AND "deletedAt" IS NULL
);
```

`.down.sql`:

```sql
DELETE FROM "CRONJOBS"."Cronjob" WHERE "jobType" = 'activity_rollup' AND name = 'Activity events daily rollup';
```

- [ ] **Step 5: Static check + manual verify**

```bash
go build ./... && make migrate-up
```

Verify: seed ข้อมูลทดสอบ 2-3 แถวใน `tb_activity_event` ที่ `server_ts` เป็นเมื่อวาน (psql) → รัน job หนึ่งครั้ง: ดู `internal/handler/cronjob_handler.go` ว่ามี endpoint trigger ทันทีไหม (ถ้ามีใช้ curl ยิง) ไม่มีก็ `make run` แล้วแก้ `cronExpression` ของ row เป็นนาทีถัดไปชั่วคราว (`*/2 * * * *`) รอ log `activity rollup done` → เช็ค `SELECT * FROM "CARMEN_SYSTEM".tb_activity_event_daily` เห็นยอดตรง → แก้ `cronExpression` กลับเป็น `30 3 * * *`

- [ ] **Step 6: Commit**

```bash
git add internal cmd migrations
git commit -m "feat: activity_rollup job aggregating UI telemetry into daily table"
```

---

### Task 7: micro-cronjobs — retention executor + seed job

**Repo:** `micro-cronjobs`

**Files:**
- Create: `internal/executor/activity_retention.go`
- Modify: `internal/executor/executor.go` (field `activityRetention` + case — `New` มี `db`/`platformSchema` แล้วจาก Task 6)
- Create: `migrations/<ts>_seed_activity_retention_job.up.sql` + `.down.sql`

**Interfaces:**
- Consumes: `executor.New(reportURL, notificationURL, dataURL, db, platformSchema, logger)` (Task 6) · ตาราง `"CARMEN_SYSTEM".tb_activity_event` (Task 1) · `model.ActivityRetentionJobConfig` (Task 6 Step 1)
- Produces: job type `activity_retention` (jobData `{"retention_days":365,"batch_size":10000}`)

- [ ] **Step 1: สร้าง `internal/executor/activity_retention.go`**

```go
package executor

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/CarmenSoftware/micro-cronjob/internal/model"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// ActivityRetentionExecutor ลบ raw event ที่เก่ากว่า retention_days เป็น batch เล็ก ๆ กัน lock ยาว
// ตารางสรุป tb_activity_event_daily ไม่ถูกแตะ (เก็บตลอดไป)
type ActivityRetentionExecutor struct {
	db     *gorm.DB
	schema string
	logger *zap.Logger
}

func NewActivityRetentionExecutor(db *gorm.DB, schema string, logger *zap.Logger) *ActivityRetentionExecutor {
	return &ActivityRetentionExecutor{db: db, schema: schema, logger: logger}
}

func (e *ActivityRetentionExecutor) Execute(ctx context.Context, job model.CronJob) error {
	cfg := model.ActivityRetentionJobConfig{RetentionDays: 365, BatchSize: 10000}
	if job.JobConfig != nil {
		b, _ := json.Marshal(job.JobConfig)
		_ = json.Unmarshal(b, &cfg)
	}
	if cfg.RetentionDays <= 0 {
		cfg.RetentionDays = 365
	}
	if cfg.BatchSize <= 0 {
		cfg.BatchSize = 10000
	}

	var totalDeleted int64
	for {
		if err := ctx.Err(); err != nil { // เคารพ job timeout ของ scheduler
			return err
		}
		sql := fmt.Sprintf(`
DELETE FROM %q.tb_activity_event
WHERE id IN (
    SELECT id FROM %q.tb_activity_event
    WHERE server_ts < NOW() - make_interval(days => ?)
    LIMIT ?
)`, e.schema, e.schema)
		res := e.db.WithContext(ctx).Exec(sql, cfg.RetentionDays, cfg.BatchSize)
		if res.Error != nil {
			return fmt.Errorf("activity retention: %w", res.Error)
		}
		totalDeleted += res.RowsAffected
		if res.RowsAffected == 0 {
			break
		}
	}
	e.logger.Info("activity retention done",
		zap.String("cronjob_id", job.ID),
		zap.Int("retention_days", cfg.RetentionDays),
		zap.Int64("rows_deleted", totalDeleted))
	return nil
}
```

- [ ] **Step 2: ต่อเข้า `executor.go`**

เพิ่ม field `activityRetention *ActivityRetentionExecutor`, สร้างใน `New(...)` ด้วย `NewActivityRetentionExecutor(db, platformSchema, logger)` และเพิ่ม case:

```go
	case "activity_retention":
		return e.activityRetention.Execute(ctx, job)
```

- [ ] **Step 3: Seed migration**

`migrations/<ts>_seed_activity_retention_job.up.sql`:

```sql
-- 04:00 เวลา scheduler (หลัง rollup 03:30) — ลบ raw ที่เกิน 365 วัน batch ละ 10,000 แถว
INSERT INTO "CRONJOBS"."Cronjob" (name, "jobType", "cronExpression", "jobData", "isActive")
SELECT 'Activity events retention (365d)', 'activity_retention', '0 4 * * *', '{"retention_days":365,"batch_size":10000}'::jsonb, true
WHERE NOT EXISTS (
    SELECT 1 FROM "CRONJOBS"."Cronjob"
    WHERE name = 'Activity events retention (365d)' AND "deletedAt" IS NULL
);
```

`.down.sql`:

```sql
DELETE FROM "CRONJOBS"."Cronjob" WHERE "jobType" = 'activity_retention' AND name = 'Activity events retention (365d)';
```

- [ ] **Step 4: Static check + manual verify**

```bash
go build ./... && make migrate-up
```

Verify: insert แถวทดสอบที่ `server_ts` เก่ากว่า 365 วัน (psql: `INSERT INTO "CARMEN_SYSTEM".tb_activity_event (event_id, session_id, user_id, event_type, page_path, client_ts, server_ts) VALUES (gen_random_uuid(), 's-old', '<user uuid ใดก็ได้จาก tb_user>', 'click', '/old', NOW() - INTERVAL '400 days', NOW() - INTERVAL '400 days')`) → trigger job แบบเดียวกับ Task 6 Step 5 → log `activity retention done rows_deleted=1` → แถวหายจริง แถวใหม่ ๆ ยังอยู่

- [ ] **Step 5: Commit + README**

เพิ่มแถว `activity_rollup` / `activity_retention` ในตาราง job types ของ `README.md` (ถ้ามีตารางดังกล่าว) แล้ว:

```bash
git add internal migrations README.md
git commit -m "feat: activity_retention job deleting raw UI telemetry older than 365 days"
```

---

## Deploy checklist (ทำตามลำดับ — นอกเหนือจาก task execution)

1. **Backend ก่อนเสมอ:** deploy `carmen-turborepo-backend-v2` (dev: db:migrate platform รันไปแล้วใน Task 1; prod/UAT ต้อง `db:deploy` platform schema ก่อน start)
2. **AppIdGuard allowlist:** เพิ่ม row `tb_application_api` ให้ x-app-id ของ frontend → `api_name = 'analyticsEvent.create'` (ขั้นตอน manual เดียวกับฟีเจอร์ interface-brands ก่อนหน้า) — ถ้าลืม FE จะโดน 4xx และทิ้ง batch เงียบ (แอปไม่พัง แต่ข้อมูลหาย)
3. **Frontend:** deploy ตามปกติ
4. **micro-cronjobs:** deploy (push → GitHub Actions) — migration seed job รันตอน start; ตรวจ log ว่า scheduler รับ 2 jobs ใหม่
5. สัปดาห์แรก: เช็คขนาดตาราง `tb_activity_event` (`SELECT pg_size_pretty(pg_total_relation_size('"CARMEN_SYSTEM".tb_activity_event'))`) และยอดใน `tb_activity_event_daily` ว่า rollup เดินทุกวัน
