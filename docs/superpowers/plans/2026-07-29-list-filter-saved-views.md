# List Filter Sheet + Saved Views — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ทุกหน้า list มี filter sheet มาตรฐาน + saved views 2 ระดับ (user ผ่าน API ใหม่บน `tb_application_user_config`, BU ผ่าน `app-config` เดิม) ตาม spec `docs/superpowers/specs/2026-07-29-list-filter-saved-views-design.md`

**Architecture:** field registry ต่อหน้า (`FilterFieldDef[]`) → hook กลาง `useListFilters` (URL เป็น source of truth) → components กลาง (`ListFilterSheet`, `ViewSelector`, `SaveViewDialog`) → rollout เป็น wave (backend → framework → pilot → sweep → cleanup)

**Tech Stack:** FE: Vite + React Router 7 + TanStack Query + use-intl + zod · BE: NestJS (micro-business TCP + backend-gateway HTTP) + Prisma tenant schema

## Global Constraints

- **สอง repo:** backend = `/Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2` (branch `feature/app-user-config-api`), frontend = repo นี้ (branch `feature/list-filter-saved-views`) — สร้าง branch จาก main ก่อนเริ่ม task แรกของแต่ละ repo
- **ไม่มี TDD ritual** (กติกา CLAUDE.md ส่วนกลางของ user): ลำดับคือ implement → static check → commit — **ห้าม**สร้างไฟล์ `*.test.ts`/`*.spec.ts` นอกจากที่ task ระบุ (มี 1 ไฟล์: Task 6 มาจาก spec ที่อนุมัติ) — ตรวจของจริงด้วย browser (Task 18)
- **Static check FE:** `bunx tsc --noEmit` (และ `bun test:run <ไฟล์>` เฉพาะ task ที่มี test) · **BE:** `bunx turbo run build --filter=micro-business --filter=backend-gateway`
- **Commit message ภาษาไทย** + ลงท้าย `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`
- **Naming:** FE code camelCase, ค่าที่เก็บ/ส่ง (JSON keys ของ SavedView) snake_case ตามชั้น API — `filters` เป็น Record ของ URL param ตรงตัว
- config key รูปแบบ `list_views_<pageKey>` · pageKey จาก `constant/list-page-keys.ts` เท่านั้น · cap **50 views ต่อ key** บังคับทั้ง client และ server · ชื่อ view ≤ **120** ตัวอักษร
- **user_id ฝั่ง backend มาจาก JWT header (`ExtractRequestHeader`) เท่านั้น** — ห้ามรับจาก path/body/query
- URL param ใหม่ของ saved view คือ **`sv`** (ห้ามใช้ `view` — ชนกับ tab ของหน้า PR)
- ค่า filter ห้ามมี `;` และชิ้น continuation ห้ามมี `:` (ข้อจำกัด parser ฝั่ง gateway — ดู spec)

---

## Wave 0 — Backend API (repo: carmen-turborepo-backend-v2)

### Task 1: Zod schema กลางสำหรับ list views + validate ใน app-config เดิม (BU scope)

**Files:**
- Create: `apps/micro-business/src/common/schemas/list-views.schema.ts`
- Modify: `apps/micro-business/src/app-config/app-config.service.ts` (เมธอด `validateValue`, ~บรรทัด 285-330)

**Interfaces:**
- Produces: `ListViewsSchema` (zod), `SavedViewSchema`, `LIST_VIEWS_KEY_REGEX = /^list_views_[a-z0-9_]+$/` — Task 2 ใช้ต่อ

- [ ] **Step 1: สร้าง schema กลาง**

```ts
// apps/micro-business/src/common/schemas/list-views.schema.ts
import { z } from 'zod';

/** Key ของ saved list views: list_views_<pageKey> (pageKey จาก frontend constant) */
export const LIST_VIEWS_KEY_REGEX = /^list_views_[a-z0-9_]+$/;

/**
 * Saved view หนึ่งชุดของหน้า list — filters เก็บค่า URL param ดิบต่อ field
 * (ไม่ใช่ filter string สำเร็จรูป) เพื่อให้ backend เปลี่ยน grammar ได้โดยไม่ migrate
 */
export const SavedViewSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120),
  filters: z.record(z.string(), z.string()),
  sort: z.string().max(200).optional(),
  created_at: z.string(),
  created_by_id: z.string().uuid().optional(),
});

export const ListViewsSchema = z.object({
  views: z.array(SavedViewSchema).max(50),
});
```

- [ ] **Step 2: ต่อเข้า `validateValue` ของ app-config เดิม**

ใน `app-config.service.ts` — import แล้วเพิ่ม pattern-match ก่อน `schemaByKey` lookup (วางไว้ใกล้ๆ เงื่อนไข interface):

```ts
import { ListViewsSchema, LIST_VIEWS_KEY_REGEX } from '@/common/schemas/list-views.schema';
```

ในตัวเลือก schema (ternary chain เดิม) เพิ่มเงื่อนไขแรกสุด:

```ts
    const schema =
      LIST_VIEWS_KEY_REGEX.test(key)
        ? ListViewsSchema
        : key === 'interface_accounting_carmen_gl'
          ? InterfaceAccountingCarmenGlSchema
          : /* ...chain เดิมไม่แตะ... */
```

- [ ] **Step 3: Build ตรวจ type**

Run: `bunx turbo run build --filter=micro-business`
Expected: ผ่าน ไม่มี TS error

- [ ] **Step 4: Commit**

```bash
git add apps/micro-business/src/common/schemas/list-views.schema.ts apps/micro-business/src/app-config/app-config.service.ts
git commit -m "feat(app-config): validate ค่า list_views_* ด้วย zod (cap 50, ชื่อ ≤120)"
```

### Task 2: micro-business `app-user-config` module (get/upsert scoped ด้วย user_id)

**Files:**
- Create: `apps/micro-business/src/app-user-config/app-user-config.service.ts`
- Create: `apps/micro-business/src/app-user-config/app-user-config.controller.ts`
- Create: `apps/micro-business/src/app-user-config/app-user-config.module.ts`
- Modify: `apps/micro-business/src/app.module.ts` (import + เพิ่มใน `imports`, ดู `AppConfigModule` บรรทัด ~148/205 เป็นแบบ)

**Interfaces:**
- Consumes: `ListViewsSchema`, `LIST_VIEWS_KEY_REGEX` จาก Task 1; `TenantService.prismaTenantInstance(bu_code, user_id)` (pattern เดียวกับ `app-config.service.ts`)
- Produces: TCP patterns `{ cmd: 'appUserConfig.get', service: 'business' }` และ `{ cmd: 'appUserConfig.upsert', service: 'business' }` — Task 3 เรียก

- [ ] **Step 1: Service**

```ts
// apps/micro-business/src/app-user-config/app-user-config.service.ts
import { Injectable } from '@nestjs/common';
import { TenantService } from '@/tenant/tenant.service';
import { ListViewsSchema, LIST_VIEWS_KEY_REGEX } from '@/common/schemas/list-views.schema';

const ROW_SELECT = {
  id: true,
  key: true,
  value: true,
  created_at: true,
  created_by_id: true,
  updated_at: true,
  updated_by_id: true,
} as const;

/**
 * Per-user application config (tb_application_user_config) — ตอนนี้ allow-list
 * เฉพาะ key list_views_* (saved filter views ของหน้า list) key อื่น 400
 * user_id มาจาก JWT ของ gateway เสมอ — row ถูก scope ด้วย user_id ทุก query
 */
@Injectable()
export class AppUserConfigService {
  constructor(private readonly tenantService: TenantService) {}

  private assertKey(key: string) {
    if (!LIST_VIEWS_KEY_REGEX.test(key)) throw new Error('Invalid key format');
  }

  /** ไม่เคยมี row → คืน default { views: [] } (ไม่ใช่ 404) ตาม pattern interface config */
  async get(bu_code: string, user_id: string, key: string) {
    this.assertKey(key);
    if (!user_id) throw new Error('user_id is required');
    const prisma = await this.tenantService.prismaTenantInstance(bu_code, user_id);
    const row = await prisma.tb_application_user_config.findFirst({
      where: { user_id, key, deleted_at: null },
      select: ROW_SELECT,
    });
    if (!row) {
      return {
        id: null, key, value: { views: [] },
        created_at: null, created_by_id: null, updated_at: null, updated_by_id: null,
      };
    }
    return row;
  }

  async upsert(bu_code: string, user_id: string, key: string, value: unknown) {
    this.assertKey(key);
    if (!user_id) throw new Error('user_id is required');

    const parsed = ListViewsSchema.safeParse(value);
    if (!parsed.success) {
      throw new Error(
        `Invalid ${key} value: ${parsed.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; ')}`,
      );
    }

    const prisma = await this.tenantService.prismaTenantInstance(bu_code, user_id);
    const existing = await prisma.tb_application_user_config.findFirst({
      where: { user_id, key, deleted_at: null },
      select: { id: true },
    });

    // Prisma @db.Timestamptz ต้องการ ISO string (ตาม CLAUDE.md backend)
    const nowIso = new Date().toISOString();

    return existing
      ? prisma.tb_application_user_config.update({
          where: { id: existing.id },
          data: { value: parsed.data, updated_at: nowIso, updated_by_id: user_id },
          select: ROW_SELECT,
        })
      : prisma.tb_application_user_config.create({
          data: { user_id, key, value: parsed.data, created_at: nowIso, created_by_id: user_id },
          select: ROW_SELECT,
        });
  }
}
```

- [ ] **Step 2: Controller (TCP)** — โครงเดียวกับ `app-config.controller.ts` (error → `{ status, error, details }`)

```ts
// apps/micro-business/src/app-user-config/app-user-config.controller.ts
import { Controller, Logger } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { AppUserConfigService } from './app-user-config.service';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** TCP handlers ของ per-user config — user_id ใน payload มาจาก gateway (JWT) เท่านั้น */
@Controller()
export class AppUserConfigController {
  private readonly logger = new Logger(AppUserConfigController.name);

  constructor(private readonly service: AppUserConfigService) {}

  @MessagePattern({ cmd: 'appUserConfig.get', service: 'business' })
  async get(data: { bu_code: string; user_id: string; key: string }) {
    try {
      const item = await this.service.get(data.bu_code, data.user_id, data.key);
      return { status: 200, data: item };
    } catch (error) {
      return { status: 400, error: 'Failed to get app user config', details: errMsg(error) };
    }
  }

  @MessagePattern({ cmd: 'appUserConfig.upsert', service: 'business' })
  async upsert(data: { bu_code: string; user_id: string; key: string; value: unknown }) {
    try {
      const item = await this.service.upsert(data.bu_code, data.user_id, data.key, data.value);
      return { status: 200, data: item };
    } catch (error) {
      this.logger.error(
        `appUserConfig.upsert failed for bu=${data.bu_code} key=${data.key} user=${data.user_id}: ${errMsg(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      return { status: 400, error: 'Failed to upsert app user config', details: errMsg(error) };
    }
  }
}
```

- [ ] **Step 3: Module + register ใน app.module**

```ts
// apps/micro-business/src/app-user-config/app-user-config.module.ts
import { Module } from '@nestjs/common';
import { AppUserConfigController } from './app-user-config.controller';
import { AppUserConfigService } from './app-user-config.service';
import { TenantModule } from '@/tenant/tenant.module';

/** โมดูล per-user application config (saved list views) */
@Module({
  imports: [TenantModule],
  controllers: [AppUserConfigController],
  providers: [AppUserConfigService],
})
export class AppUserConfigModule {}
```

ใน `app.module.ts`: `import { AppUserConfigModule } from './app-user-config/app-user-config.module';` + เพิ่ม `AppUserConfigModule,` ใน `imports` ติดกับ `AppConfigModule`

- [ ] **Step 4: Build** — `bunx turbo run build --filter=micro-business` → ผ่าน

- [ ] **Step 5: Commit**

```bash
git add apps/micro-business/src/app-user-config apps/micro-business/src/app.module.ts
git commit -m "feat(micro-business): app-user-config module — saved list views ต่อ user"
```

### Task 3: gateway `config_app-user-config` (HTTP GET/PUT) + admin guard สำหรับ BU scope

**Files:**
- Create: `apps/backend-gateway/src/config/config_app-user-config/config_app-user-config.service.ts`
- Create: `apps/backend-gateway/src/config/config_app-user-config/config_app-user-config.controller.ts`
- Create: `apps/backend-gateway/src/config/config_app-user-config/config_app-user-config.module.ts`
- Modify: `apps/backend-gateway/src/config/route-config.ts` (import + เพิ่มใน imports array — ดู `ConfigAppConfigModule` บรรทัด 58/123 เป็นแบบ)
- Modify: `apps/backend-gateway/src/config/config_app-config/config_app-config.controller.ts` (admin guard เฉพาะ key `list_views_*` ใน `upsert`/`delete`)

**Interfaces:**
- Consumes: TCP patterns จาก Task 2; `ExtractRequestHeader`, `BaseHttpController`, `KeycloakGuard`, `Result`, `httpStatusToErrorCode`, `getGatewayRequestContext`, `rpcClient` (ทั้งหมดตามที่ `config_app-config` ใช้)
- Produces: HTTP `GET|PUT /api/config/:bu_code/app-user-config/:key` — frontend Task 7 เรียก

- [ ] **Step 1: Service** — ลอกโครง `config_app-config.service.ts` แบบตัด entitlement ออก

```ts
// apps/backend-gateway/src/config/config_app-user-config/config_app-user-config.service.ts
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import { Result } from '@/common';
import { BackendLogger } from 'src/common/helpers/backend.logger';
import { httpStatusToErrorCode } from 'src/common/helpers/http-status-to-error-code';
import { getGatewayRequestContext } from '@/common/context/gateway-request-context';

interface MicroResponse {
  status: number;
  data?: unknown;
  error?: string;
  details?: string;
}

/** Gateway proxy ของ per-user config (saved list views) → micro-business ผ่าน TCP */
@Injectable()
export class ConfigAppUserConfigService {
  private readonly logger: BackendLogger = new BackendLogger(ConfigAppUserConfigService.name);

  constructor(@Inject('BUSINESS_SERVICE') private readonly businessService: ClientProxy) {}

  private async call(cmd: string, payload: Record<string, unknown>): Promise<Result<unknown>> {
    const obs: Observable<MicroResponse> = this.businessService.send(
      { cmd, service: 'business' },
      { ...payload, ...getGatewayRequestContext() },
    );
    const response = await firstValueFrom(obs);
    if (response.status !== HttpStatus.OK) {
      const message = response.details
        ? `${response.error || 'Request failed'}: ${response.details}`
        : response.error || 'Request failed';
      return Result.error(message, httpStatusToErrorCode(response.status));
    }
    return Result.ok(response.data);
  }

  async get(bu_code: string, user_id: string, key: string) {
    return this.call('appUserConfig.get', { bu_code, user_id, key });
  }

  async upsert(bu_code: string, user_id: string, key: string, value: unknown) {
    return this.call('appUserConfig.upsert', { bu_code, user_id, key, value });
  }
}
```

- [ ] **Step 2: Controller** — โครง swagger/guard ตาม `config_app-config.controller.ts` (KeycloakGuard + ApiHeaderRequiredXAppId + BaseHttpController) route `api/config/:bu_code/app-user-config` มีแค่ `@Get(':key')` และ `@Put(':key')` — **user_id จาก `ExtractRequestHeader(req)` เท่านั้น**:

```ts
  @Get(':key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get per-user config entry by key (current user)',
    description: 'Returns the tb_application_user_config row of the CURRENT user by key. Missing row returns { views: [] } default.\n\nดู config ต่อ user (ผู้ใช้ปัจจุบัน) ตาม key — ไม่เคยมีคืน default',
    operationId: 'configAppUserConfig_get',
  })
  async get(
    @Req() req: Request,
    @Res() res: Response,
    @Param('bu_code') bu_code: string,
    @Param('key') key: string,
  ): Promise<void> {
    const { user_id } = ExtractRequestHeader(req);
    const result = await this.service.get(bu_code, user_id, key);
    this.respond(res, result);
  }

  @Put(':key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Upsert per-user config entry (current user)',
    description: 'Upserts tb_application_user_config for the CURRENT user. Only list_views_* keys accepted.\n\nบันทึก config ต่อ user — รับเฉพาะ key list_views_*',
    operationId: 'configAppUserConfig_upsert',
  })
  async upsert(
    @Req() req: Request,
    @Res() res: Response,
    @Param('bu_code') bu_code: string,
    @Param('key') key: string,
    @Body() body: { value: unknown },
  ): Promise<void> {
    const { user_id } = ExtractRequestHeader(req);
    const result = await this.service.upsert(bu_code, user_id, key, body?.value);
    this.respond(res, result);
  }
```

- [ ] **Step 3: Module + route-config** — module ลอก `config_app-config.module.ts` (rpcClient BUSINESS_SERVICE, ตัด PlatformBuInterfaceModule); route-config.ts เพิ่ม import + `ConfigAppUserConfigModule,` ใน imports

- [ ] **Step 4: Admin guard บน BU scope** — ใน `config_app-config.controller.ts` เมธอด `upsert` และ `delete` เพิ่มเช็คก่อนเรียก service (pattern การอ่าน `x-bu-datas` ดูจาก `purchase-requests.controller.ts` ~บรรทัด 197):

```ts
    if (/^list_views_/.test(key)) {
      const buDatasHeader = req.headers['x-bu-datas'] as string | undefined;
      const userData: { role?: string } = buDatasHeader ? JSON.parse(buDatasHeader) : {};
      if (userData.role !== 'admin') {
        this.respond(res, Result.error('Only BU admin can modify shared list views', httpStatusToErrorCode(HttpStatus.FORBIDDEN)));
        return;
      }
    }
```

หมายเหตุ implementer: ตรวจค่า role จริงใน header ด้วยการ log ครั้งเดียวตอน browser verify (Task 18) — ถ้า field ชื่ออื่น (`system_level`) ให้แก้ตามจริง

- [ ] **Step 5: Build** — `bunx turbo run build --filter=backend-gateway` → ผ่าน

- [ ] **Step 6: Commit**

```bash
git add apps/backend-gateway/src/config
git commit -m "feat(gateway): app-user-config endpoints + admin guard สำหรับ BU list views"
```

---

## Wave 1 — Frontend framework (repo นี้)

### Task 4: Types + constants + endpoints

**Files:**
- Create: `types/list-view.ts`
- Create: `types/list-filter.ts`
- Create: `constant/list-page-keys.ts`
- Modify: `constant/api-endpoints.ts` (เพิ่มใต้ `APP_CONFIG_*` ~บรรทัด 35)
- Modify: `constant/query-keys.ts` (เพิ่มใกล้ `APP_CONFIGS` บรรทัด 123)

**Interfaces:**
- Produces: `SavedView`, `ListViewsConfigValue`, `ViewScope`, `MAX_VIEWS_PER_KEY`, `listViewsConfigKey()`, `FilterFieldDef`, `LIST_PAGE_KEYS`, `API_ENDPOINTS.APP_USER_CONFIG_BY_KEY`, `QUERY_KEYS.APP_USER_CONFIGS` — ทุก task ถัดไปใช้

- [ ] **Step 1: `types/list-view.ts`**

```ts
/** Saved view หนึ่งชุดของหน้า list — filters เก็บค่า URL param ดิบต่อ field */
export interface SavedView {
  id: string;
  name: string;
  /** key = ชื่อ URL param (เช่น "filter", "department"), value = ค่าตามที่อยู่ใน URL */
  filters: Record<string, string>;
  /** "field:asc|desc" — optional, ไม่มี = ใช้ default sort ของหน้า */
  sort?: string;
  created_at: string; // ISO UTC
  created_by_id?: string;
}

export interface ListViewsConfigValue {
  views: SavedView[];
}

export type ViewScope = "user" | "bu";

export const MAX_VIEWS_PER_KEY = 50;

/** config key ของ saved views: list_views_<pageKey> (ใช้ทั้ง BU และ user scope) */
export const listViewsConfigKey = (pageKey: string) => `list_views_${pageKey}`;
```

- [ ] **Step 2: `types/list-filter.ts`**

```ts
import type { ReactNode } from "react";
import type { WORKFLOW_TYPE } from "@/types/workflows";

interface FilterFieldBase {
  /** ชื่อ URL param — ต้องตรงกับที่หน้าเดิมใช้ เพื่อไม่หัก deep link เก่า */
  readonly key: string;
  /** i18n key เต็ม เช่น "common.status" (แปลด้วย useTranslations() แบบไม่ระบุ namespace) */
  readonly labelKey: string;
  /**
   * แปลงค่า URL → backend filter clause — default คือส่งผ่านตรง
   * (ใช้กับ field ที่ URL เก็บ clause เต็มอยู่แล้ว เช่น "is_active|bool:true")
   * field แบบ CSV ดิบต้องประกาศเอง เช่น (v) => `doc_status|enum:${v}`
   */
  readonly toClause?: (value: string) => string;
}

/** นิยาม field หนึ่งตัวใน filter sheet ของหน้า list */
export type FilterFieldDef =
  | (FilterFieldBase & {
      readonly control: "status";
      readonly options?: { labelKey: string; value: string }[];
    })
  | (FilterFieldBase & {
      readonly control: "multi-select";
      readonly options: { labelKey: string; value: string }[];
      readonly searchable?: boolean;
    })
  | (FilterFieldBase & { readonly control: "date-range"; readonly fieldKey: string })
  | (FilterFieldBase & { readonly control: "department" })
  | (FilterFieldBase & { readonly control: "requester" })
  | (FilterFieldBase & { readonly control: "stage"; readonly stages: string[] })
  | (FilterFieldBase & { readonly control: "workflow"; readonly workflowType: WORKFLOW_TYPE })
  | (FilterFieldBase & {
      readonly control: "custom";
      readonly render: (value: string, onChange: (v: string) => void) => ReactNode;
    });
```

หมายเหตุ: field ที่ต้องพึ่งข้อมูล runtime (เช่น `stages` จาก API) ให้หน้า build fields ด้วย `useMemo` ใน component — **ชุด `key` ต้อง stable ทุก render** (เปลี่ยนได้เฉพาะ closure ข้างใน)

- [ ] **Step 3: `constant/list-page-keys.ts`** — ครบทั้ง 40 หน้า

```ts
/**
 * pageKey ของ saved list views — เป็น identity ถาวรต่อหน้า
 * ห้ามผูกกับ route path / i18n namespace (rename ได้โดย view ผู้ใช้ไม่หาย)
 * ห้ามเปลี่ยนค่าที่ ship แล้ว — จะทำให้ view ที่บันทึกไว้หายทั้งลูกค้า
 */
export const LIST_PAGE_KEYS = {
  // config
  ADJUSTMENT_TYPE: "adjustment_type",
  BUSINESS_TYPE: "business_type",
  CERTIFICATION: "certification",
  CREDIT_NOTE_REASON: "credit_note_reason",
  CREDIT_TERM: "credit_term",
  CURRENCY: "currency",
  DELIVERY_POINT: "delivery_point",
  DEPARTMENT: "department",
  ECO: "eco",
  EXCHANGE_RATE: "exchange_rate",
  EXTRA_COST: "extra_cost",
  LOCATION: "location",
  TAX_PROFILE: "tax_profile",
  UNIT: "unit",
  // inventory-management
  INVENTORY_ADJUSTMENT: "inventory_adjustment",
  PHYSICAL_COUNT: "physical_count",
  SPOT_CHECK: "spot_check",
  INVENTORY_TRANSACTION: "inventory_transaction",
  // operation-plan
  RECIPE: "recipe",
  RECIPE_CATEGORY: "recipe_category",
  CUISINE: "cuisine",
  EQUIPMENT: "equipment",
  EQUIPMENT_CATEGORY: "equipment_category",
  RECIPE_EQUIPMENT_CATEGORY: "recipe_equipment_category",
  // procurement
  PURCHASE_REQUEST: "pr",
  PURCHASE_ORDER: "po",
  GOODS_RECEIVE_NOTE: "grn",
  CREDIT_NOTE: "cn",
  PURCHASE_REQUEST_TEMPLATE: "prt",
  APPROVAL: "approval",
  // product-management
  PRODUCT: "product",
  // report
  REPORT_LIST: "report_list",
  REPORT_HISTORY: "report_history",
  // store-operation
  STORE_REQUISITION: "sr",
  WASTAGE_REPORTING: "wastage",
  // system-admin
  USER: "user",
  ROLE: "role",
  WORKFLOW: "workflow",
  DOCUMENT: "document",
  PERIOD: "period",
  RUNNING_CODE: "running_code",
  NOTIFICATION_TEMPLATE: "notification_template",
  ACTIVITY_LOG: "activity_log",
  USER_ACTIVITY: "user_activity",
  // vendor-management
  VENDOR: "vendor",
  PRICE_LIST: "price_list",
  PRICE_LIST_TEMPLATE: "price_list_template",
  REQUEST_PRICE_LIST: "rfp",
} as const;

export type ListPageKey = (typeof LIST_PAGE_KEYS)[keyof typeof LIST_PAGE_KEYS];
```

- [ ] **Step 4: endpoints + query keys**

`constant/api-endpoints.ts` (เรียงตามตัวอักษรใต้ APP_CONFIG_TEST_EMAIL):

```ts
  APP_USER_CONFIG_BY_KEY: (buCode: string, key: string) =>
    `/api/proxy/api/config/${buCode}/app-user-config/${key}`,
```

`constant/query-keys.ts`:

```ts
  APP_USER_CONFIGS: "app-user-configs",
```

- [ ] **Step 5: ตรวจ + commit**

Run: `bunx tsc --noEmit` → ผ่าน

```bash
git add types/list-view.ts types/list-filter.ts constant/list-page-keys.ts constant/api-endpoints.ts constant/query-keys.ts
git commit -m "feat(list-filter): types + page keys + endpoint ของ saved views"
```

### Task 5: URL batch writer — `setURLParams`

**Files:**
- Modify: `hooks/use-url.ts`

**Interfaces:**
- Produces: `setURLParams(entries: Record<string, string>): void` — เขียน/ลบหลาย param ใน `replaceState` เดียว + dispatch `useurl:change` ครั้งเดียว (Task 8 ใช้ตอน apply view)

- [ ] **Step 1: เพิ่ม export ใน `use-url.ts`** — refactor ท่อนเขียน URL ของ `updateValue` (บรรทัด 72-94) เป็นฟังก์ชันกลางแล้วให้ทั้งคู่ใช้:

```ts
/**
 * เขียน/ลบหลาย query param ใน replaceState ครั้งเดียว (ค่าว่าง = ลบ param)
 * แล้ว dispatch useurl:change ครั้งเดียว — ใช้ตอน apply saved view เพื่อไม่ยิง
 * event/render ทีละ param
 */
export function setURLParams(entries: Record<string, string>): void {
  const url = new URL(window.location.href);
  for (const [k, v] of Object.entries(entries)) {
    if (v) {
      url.searchParams.set(k, v);
    } else {
      url.searchParams.delete(k);
    }
  }
  const search = Array.from(url.searchParams.entries())
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  const nextHref = `${url.origin}${url.pathname}${search ? `?${search}` : ""}${url.hash}`;
  if (nextHref !== window.location.href) {
    window.history.replaceState({ ...window.history.state }, "", nextHref);
    window.dispatchEvent(new CustomEvent(URL_CHANGE_EVENT));
  }
}
```

แล้วให้ `updateValue` เดิมเรียก `setURLParams({ [paramName]: newValue })` แทนโค้ดซ้ำ (คง `onUpdate?.(newValue)` ไว้ท้ายเหมือนเดิม)

- [ ] **Step 2: ตรวจ + commit**

Run: `bunx tsc --noEmit && bun test:run hooks` → ผ่าน (มี test เดิมของ hooks อยู่ ต้องไม่พัง)

```bash
git add hooks/use-url.ts
git commit -m "feat(use-url): setURLParams เขียนหลาย param อะตอมมิก"
```

### Task 6: Encoder + dirty compare (pure logic + unit test ตาม spec)

**Files:**
- Create: `lib/list-filter-encode.ts`
- Test: `lib/__tests__/list-filter-encode.test.ts`

**Interfaces:**
- Consumes: `FilterFieldDef` (Task 4)
- Produces: `encodeFilterParam(fields, values): string | undefined`, `viewMatchesCurrent(view, values, sort): boolean` — Task 8 ใช้

- [ ] **Step 1: Implement**

```ts
// lib/list-filter-encode.ts
import type { FilterFieldDef } from "@/types/list-filter";
import type { SavedView } from "@/types/list-view";

/**
 * รวมค่า filter ของทุก field เป็น backend filter string (join ";")
 * field ที่ค่าว่างถูกข้าม — ไม่มีสัก field คืน undefined
 */
export function encodeFilterParam(
  fields: readonly FilterFieldDef[],
  values: Record<string, string>,
): string | undefined {
  const clauses = fields
    .map((f) => {
      const v = values[f.key]?.trim();
      if (!v) return "";
      return f.toClause ? f.toClause(v) : v;
    })
    .filter(Boolean);
  return clauses.length > 0 ? clauses.join(";") : undefined;
}

/** ตัด key ที่ค่าว่างออก — ค่าว่าง ≡ ไม่มี key (กัน dirty ปลอม) */
function normalize(record: Record<string, string | undefined>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(record).filter(([, v]) => !!v && v.trim() !== ""),
  ) as Record<string, string>;
}

/** view ตรงกับ filter + sort ปัจจุบันหรือไม่ (ใช้คำนวณ dirty state) */
export function viewMatchesCurrent(
  view: SavedView,
  values: Record<string, string>,
  sort: string,
): boolean {
  const a = normalize(view.filters);
  const b = normalize(values);
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if ((a[k] ?? "") !== (b[k] ?? "")) return false;
  }
  return (view.sort ?? "") === (sort ?? "");
}
```

- [ ] **Step 2: Unit test** (ไฟล์ test เดียวที่ spec กำหนด)

```ts
// lib/__tests__/list-filter-encode.test.ts
import { describe, expect, it } from "vitest";
import { encodeFilterParam, viewMatchesCurrent } from "../list-filter-encode";
import type { FilterFieldDef } from "@/types/list-filter";
import type { SavedView } from "@/types/list-view";

const fields: FilterFieldDef[] = [
  { key: "filter", control: "status", labelKey: "common.status" },
  {
    key: "cn_status",
    control: "multi-select",
    labelKey: "x",
    options: [],
    toClause: (v) => `doc_status|enum:${v}`,
  },
  { key: "pr_date", control: "date-range", labelKey: "x", fieldKey: "pr_date" },
];

function view(overrides: Partial<SavedView>): SavedView {
  return { id: "v1", name: "test", filters: {}, created_at: "2026-07-29T00:00:00Z", ...overrides };
}

describe("encodeFilterParam", () => {
  it("ส่งผ่าน clause เต็มตรงๆ และข้าม field ว่าง", () => {
    expect(
      encodeFilterParam(fields, { filter: "is_active|bool:true", cn_status: "", pr_date: "" }),
    ).toBe("is_active|bool:true");
  });

  it("ห่อค่า CSV ด้วย toClause", () => {
    expect(encodeFilterParam(fields, { filter: "", cn_status: "draft,posted", pr_date: "" })).toBe(
      "doc_status|enum:draft,posted",
    );
  });

  it("join หลาย field ด้วย ; และ comma ใน date_range รอด", () => {
    expect(
      encodeFilterParam(fields, {
        filter: "is_active|bool:true",
        cn_status: "",
        pr_date: "pr_date|date_range:2026-01-01,2026-01-31",
      }),
    ).toBe("is_active|bool:true;pr_date|date_range:2026-01-01,2026-01-31");
  });

  it("ทุก field ว่าง → undefined", () => {
    expect(encodeFilterParam(fields, {})).toBeUndefined();
  });
});

describe("viewMatchesCurrent", () => {
  it("ค่าว่างเทียบเท่าไม่มี key (ไม่ dirty ปลอม)", () => {
    const v = view({ filters: { filter: "is_active|bool:true" } });
    expect(viewMatchesCurrent(v, { filter: "is_active|bool:true", pr_date: "" }, "")).toBe(true);
  });

  it("ค่าต่าง → dirty", () => {
    const v = view({ filters: { filter: "is_active|bool:true" } });
    expect(viewMatchesCurrent(v, { filter: "is_active|bool:false" }, "")).toBe(false);
  });

  it("sort ต่าง → dirty / sort undefined เทียบเท่า \"\"", () => {
    const v = view({ filters: {}, sort: "pr_no:desc" });
    expect(viewMatchesCurrent(v, {}, "pr_no:desc")).toBe(true);
    expect(viewMatchesCurrent(v, {}, "")).toBe(false);
    expect(viewMatchesCurrent(view({ filters: {} }), {}, "")).toBe(true);
  });
});
```

- [ ] **Step 3: รัน + commit**

Run: `bun test:run lib/__tests__/list-filter-encode.test.ts && bunx tsc --noEmit` → ผ่านทั้งคู่

```bash
git add lib/list-filter-encode.ts lib/__tests__/list-filter-encode.test.ts
git commit -m "feat(list-filter): encoder + dirty compare พร้อม unit test"
```

### Task 7: Hook `use-app-user-config`

**Files:**
- Create: `hooks/use-app-user-config.ts`

**Interfaces:**
- Consumes: `API_ENDPOINTS.APP_USER_CONFIG_BY_KEY`, `QUERY_KEYS.APP_USER_CONFIGS` (Task 4)
- Produces: `useAppUserConfigByKey(key)` → query ของ `AppConfig`-shaped row (`json.data` คือ row ตรงๆ ไม่ใช่ items), `useUpsertAppUserConfig()` → mutation `{ key, value }` — Task 8 ใช้

- [ ] **Step 1: Implement** — mirror `hooks/use-app-config.ts` (`useAppConfigByKey`/`useUpsertAppConfig` บรรทัด 11-60) ต่างแค่ endpoint + query key:

```ts
import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { httpClient } from "@/lib/http-client";
import { ApiError } from "@/lib/api-error";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { CACHE_STATIC } from "@/lib/cache-config";
import type { AppConfig } from "@/types/app-config";

/**
 * Config ต่อ user ปัจจุบัน (tb_application_user_config) — key เดียว
 * ไม่เคยบันทึกจะได้ default { views: [] } จาก backend (ไม่ 404)
 */
export function useAppUserConfigByKey(key: string | undefined) {
  const buCode = useBuCode();
  return useQuery<AppConfig>({
    queryKey: [QUERY_KEYS.APP_USER_CONFIGS, buCode, key],
    queryFn: async () => {
      const res = await httpClient.get(
        API_ENDPOINTS.APP_USER_CONFIG_BY_KEY(buCode!, key!),
      );
      if (!res.ok) throw await ApiError.from(res, "Failed to fetch app user config");
      const json = await res.json();
      return json.data;
    },
    ...CACHE_STATIC,
    enabled: !!buCode && !!key,
  });
}

export function useUpsertAppUserConfig() {
  return useApiMutation<{ key: string; value: Record<string, unknown> }>({
    mutationFn: ({ key, value }, buCode) =>
      httpClient.put(API_ENDPOINTS.APP_USER_CONFIG_BY_KEY(buCode, key), { value }),
    invalidateKeys: [QUERY_KEYS.APP_USER_CONFIGS],
    errorMessage: "Failed to save app user config",
  });
}
```

- [ ] **Step 2: ตรวจ + commit**

Run: `bunx tsc --noEmit` → ผ่าน

```bash
git add hooks/use-app-user-config.ts
git commit -m "feat(list-filter): hook app-user-config (GET/PUT ต่อ user)"
```

### Task 8: Hooks `use-list-views` + `use-list-filters`

**Files:**
- Create: `hooks/use-list-views.ts`
- Create: `hooks/use-list-filters.ts`

**Interfaces:**
- Consumes: Task 4-7 ทั้งหมด + `useListPageState`, `useCan`, `useProfile`
- Produces (Task 9-13, 15-17 ใช้):

```ts
// use-list-views
interface UseListViewsResult {
  userViews: SavedView[];
  buViews: SavedView[];
  isLoading: boolean;
  error: Error | null;
  canManageBu: boolean; // useCan().isAdmin
  saveAs: (name: string, scope: ViewScope, snapshot: { filters: Record<string, string>; sort?: string }) => Promise<SavedView>;
  update: (viewId: string, scope: ViewScope, snapshot: { filters: Record<string, string>; sort?: string }) => Promise<void>;
  rename: (viewId: string, scope: ViewScope, name: string) => Promise<void>;
  remove: (viewId: string, scope: ViewScope) => Promise<void>;
}
export function useListViews(pageKey: ListPageKey): UseListViewsResult;

// use-list-filters
interface UseListFiltersOptions {
  pageKey: ListPageKey;
  fields: readonly FilterFieldDef[];
  defaultSort?: string;
}
interface UseListFiltersResult {
  values: Record<string, string>;
  setValue: (key: string, value: string) => void;   // เขียน URL + ล้าง page
  clearAll: () => void;                              // ล้างทุก field + sv + page
  filterParam: string | undefined;                   // encodeFilterParam(...)
  sortParam: string;                                 // URL sort ดิบ ("" = default)
  activeFilters: ActiveFilter[];                     // chips ต่อ field ที่มีค่า
  view: {
    current: SavedView | null;                       // จาก sv param (หาไม่เจอ = null)
    scope: ViewScope | null;
    isDirty: boolean;
    apply: (view: SavedView) => void;                // เขียน filters+sort+sv อะตอมมิก
    clear: () => void;                               // ล้าง sv (คง filter ไว้)
    revert: () => void;                              // เขียนค่า view ทับ URL อีกรอบ
  } & UseListViewsResult;
}
export function useListFilters(options: UseListFiltersOptions): UseListFiltersResult;
```

- [ ] **Step 1: `use-list-views.ts`** — รวม 2 sources + mutations แบบ read-modify-write:

```ts
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { useAppConfigByKey, useUpsertAppConfig } from "@/hooks/use-app-config";
import { useAppUserConfigByKey, useUpsertAppUserConfig } from "@/hooks/use-app-user-config";
import { useCan } from "@/hooks/use-can";
import { useProfile } from "@/hooks/use-profile";
import {
  listViewsConfigKey,
  MAX_VIEWS_PER_KEY,
  type ListViewsConfigValue,
  type SavedView,
  type ViewScope,
} from "@/types/list-view";
import type { ListPageKey } from "@/constant/list-page-keys";
```

โครงหลัก (implementer เขียนตามนี้ครบทุกเมธอด):

```ts
export function useListViews(pageKey: ListPageKey) {
  const key = listViewsConfigKey(pageKey);
  const buQuery = useAppConfigByKey(key);
  const userQuery = useAppUserConfigByKey(key);
  const upsertBu = useUpsertAppConfig();
  const upsertUser = useUpsertAppUserConfig();
  const { isAdmin } = useCan();
  const { userId } = useProfile();
  const t = useTranslations("listView");

  const readViews = (value: unknown): SavedView[] =>
    ((value as ListViewsConfigValue | undefined)?.views ?? []);

  const buViews = readViews(buQuery.data?.value);
  const userViews = readViews(userQuery.data?.value);

  // read-modify-write: อ่านค่าปัจจุบันจาก cache (refetch ก่อนถ้า stale ผ่าน
  // queryClient.fetchQuery ไม่จำเป็น — CACHE_STATIC + invalidate หลัง save เพียงพอ
  // เพราะ backend เป็น last-write-wins ต่อ key และ key แยกต่อหน้า/ต่อ user แล้ว)
  const writeViews = async (scope: ViewScope, next: SavedView[]) => {
    if (next.length > MAX_VIEWS_PER_KEY) {
      toast.error(t("limitReached", { max: MAX_VIEWS_PER_KEY }));
      throw new Error("view limit reached");
    }
    const value = { views: next } satisfies ListViewsConfigValue;
    if (scope === "bu") {
      await upsertBu.mutateAsync({ key, value });
    } else {
      await upsertUser.mutateAsync({ key, value });
    }
  };

  const saveAs = async (name, scope, snapshot) => {
    const base = scope === "bu" ? buViews : userViews;
    const view: SavedView = {
      id: crypto.randomUUID(),
      name,
      filters: snapshot.filters,
      sort: snapshot.sort,
      created_at: new Date().toISOString(),
      created_by_id: userId,
    };
    await writeViews(scope, [...base, view]);
    toast.success(t("saved", { name }));
    return view;
  };
  // update(viewId, scope, snapshot): map แทนที่ filters/sort ของตัวที่ id ตรง
  // rename(viewId, scope, name): map แทนที่ name
  // remove(viewId, scope): filter ตัวที่ id ตรงออก + toast t("deleted")
  // ...
  return { userViews, buViews, isLoading: buQuery.isLoading || userQuery.isLoading,
           error: buQuery.error ?? userQuery.error, canManageBu: isAdmin,
           saveAs, update, rename, remove };
}
```

- [ ] **Step 2: `use-list-filters.ts`** — อ่านทุก field ด้วย `useSyncExternalStore` **ตัวเดียว** (ห้ามเรียก `useURL` ใน loop — ผิด rules-of-hooks):

```ts
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useTranslations } from "use-intl";
import { setURLParams } from "@/hooks/use-url";
import { useURL } from "@/hooks/use-url";
import { useListPageState } from "@/hooks/use-list-page-state";
import { useListViews } from "@/hooks/use-list-views";
import { encodeFilterParam, viewMatchesCurrent } from "@/lib/list-filter-encode";
import type { ActiveFilter } from "@/components/ui/active-filter-bar";
import type { FilterFieldDef } from "@/types/list-filter";
import type { SavedView, ViewScope } from "@/types/list-view";
import type { ListPageKey } from "@/constant/list-page-keys";

const URL_CHANGE_EVENT = "useurl:change"; // ให้ export จาก use-url.ts แทนการซ้ำ string

function useURLValues(keys: readonly string[]): Record<string, string> {
  const subscribe = useCallback((cb: () => void) => {
    window.addEventListener("popstate", cb);
    window.addEventListener(URL_CHANGE_EVENT, cb);
    return () => {
      window.removeEventListener("popstate", cb);
      window.removeEventListener(URL_CHANGE_EVENT, cb);
    };
  }, []);
  // snapshot เป็น string เพื่อ referential stability — parse ด้วย useMemo
  const keyList = keys.join(" ");
  const snapshot = useSyncExternalStore(
    subscribe,
    () => {
      const sp = new URLSearchParams(window.location.search);
      return keys.map((k) => sp.get(k) ?? "").join(" ");
    },
    () => keys.map(() => "").join(" "),
  );
  return useMemo(() => {
    const parts = snapshot.split(" ");
    const ks = keyList.split(" ");
    return Object.fromEntries(ks.map((k, i) => [k, parts[i] ?? ""]));
  }, [snapshot, keyList]);
}
```

ตัว hook หลัก:

```ts
export function useListFilters({ pageKey, fields, defaultSort }: UseListFiltersOptions) {
  const t = useTranslations(); // แปลด้วย full key (labelKey)
  const fieldKeys = useMemo(() => fields.map((f) => f.key), [fields]);
  const values = useURLValues(fieldKeys);
  const [sortRaw] = useURL("sort");
  const [sv] = useURL("sv");
  const views = useListViews(pageKey);

  const setValue = (key: string, value: string) =>
    setURLParams({ [key]: value, page: "" });

  const clearAll = () =>
    setURLParams({
      ...Object.fromEntries(fieldKeys.map((k) => [k, ""])),
      sv: "",
      page: "",
    });

  const filterParam = encodeFilterParam(fields, values);

  const activeFilters: ActiveFilter[] = fields
    .filter((f) => !!values[f.key]?.trim())
    .map((f) => ({
      key: f.key,
      label: t(f.labelKey),
      onRemove: () => setValue(f.key, ""),
    }));

  const current: SavedView | null = sv
    ? [...views.userViews, ...views.buViews].find((v) => v.id === sv) ?? null
    : null;
  const scope: ViewScope | null = current
    ? views.userViews.some((v) => v.id === current.id) ? "user" : "bu"
    : null;
  const isDirty = !!current && !viewMatchesCurrent(current, values, sortRaw);

  const apply = (view: SavedView) =>
    setURLParams({
      ...Object.fromEntries(fieldKeys.map((k) => [k, ""])), // ล้างก่อน — apply คือทับทั้งชุด
      ...view.filters,
      sort: view.sort ?? "",
      sv: view.id,
      page: "",
    });
  const clear = () => setURLParams({ sv: "" });
  const revert = () => { if (current) apply(current); };

  return {
    values, setValue, clearAll, filterParam,
    sortParam: sortRaw,
    activeFilters,
    view: { current, scope, isDirty, apply, clear, revert, ...views },
  };
}
```

พร้อมกันนี้ export `URL_CHANGE_EVENT` จาก `use-url.ts` แล้ว import แทน string ซ้ำ

- [ ] **Step 3: กรณี `sv` ชี้ view ที่ถูกลบ** — ใน `useListFilters` เพิ่ม effect: เมื่อ `sv` มีค่า, `views.isLoading === false`, และหาไม่เจอ → `toast.info(t("listView.viewNotFound"))` + `setURLParams({ sv: "" })` (ยิงครั้งเดียวด้วย `useRef` guard)

- [ ] **Step 4: ตรวจ + commit**

Run: `bunx tsc --noEmit` → ผ่าน

```bash
git add hooks/use-list-views.ts hooks/use-list-filters.ts hooks/use-url.ts
git commit -m "feat(list-filter): useListFilters + useListViews (URL เป็น source of truth)"
```

### Task 9: i18n namespace `listView`

**Files:**
- Modify: `messages/en.json`, `messages/th.json` (เพิ่ม top-level namespace)

**Interfaces:**
- Produces: key ทั้งหมดที่ component Task 10-13 ใช้ผ่าน `useTranslations("listView")`

- [ ] **Step 1: เพิ่ม block (en / th คู่กัน)**

```jsonc
// messages/en.json — เพิ่ม top-level "listView"
"listView": {
  "view": "View",
  "noView": "No view",
  "myViews": "My views",
  "buViews": "Business unit views",
  "saveCurrent": "Save current filters as view",
  "saveAsTitle": "Save view",
  "name": "View name",
  "scope": "Visibility",
  "scopeUser": "Only me",
  "scopeBu": "Everyone in this business unit",
  "save": "Save",
  "modified": "(modified)",
  "updateView": "Update this view",
  "saveAsNew": "Save as new view",
  "revert": "Revert to view",
  "rename": "Rename",
  "delete": "Delete",
  "deleteConfirm": "Delete view \"{name}\"?",
  "empty": "No views yet — set filters, then save",
  "loadError": "Couldn't load views",
  "retry": "Retry",
  "viewNotFound": "That view no longer exists",
  "nameRequired": "Enter a view name",
  "nameDuplicate": "A view named \"{name}\" already exists. Replace it?",
  "replace": "Replace",
  "limitReached": "View limit reached ({max} per page)",
  "saved": "View \"{name}\" saved",
  "updated": "View updated",
  "deleted": "View deleted",
  "renamed": "View renamed"
}
```

```jsonc
// messages/th.json
"listView": {
  "view": "มุมมอง",
  "noView": "ไม่ใช้มุมมอง",
  "myViews": "มุมมองของฉัน",
  "buViews": "มุมมองของหน่วยธุรกิจ",
  "saveCurrent": "บันทึกตัวกรองปัจจุบันเป็นมุมมอง",
  "saveAsTitle": "บันทึกมุมมอง",
  "name": "ชื่อมุมมอง",
  "scope": "การมองเห็น",
  "scopeUser": "เฉพาะฉัน",
  "scopeBu": "ทุกคนในหน่วยธุรกิจนี้",
  "save": "บันทึก",
  "modified": "(แก้ไขแล้ว)",
  "updateView": "อัปเดตมุมมองนี้",
  "saveAsNew": "บันทึกเป็นมุมมองใหม่",
  "revert": "ย้อนกลับเป็นค่าของมุมมอง",
  "rename": "เปลี่ยนชื่อ",
  "delete": "ลบ",
  "deleteConfirm": "ลบมุมมอง \"{name}\"?",
  "empty": "ยังไม่มีมุมมอง — ตั้งตัวกรองแล้วกดบันทึก",
  "loadError": "โหลดมุมมองไม่สำเร็จ",
  "retry": "ลองใหม่",
  "viewNotFound": "มุมมองนี้ถูกลบไปแล้ว",
  "nameRequired": "กรุณาใส่ชื่อมุมมอง",
  "nameDuplicate": "มีมุมมองชื่อ \"{name}\" อยู่แล้ว ต้องการแทนที่หรือไม่?",
  "replace": "แทนที่",
  "limitReached": "ครบจำนวนมุมมองสูงสุดแล้ว ({max} ต่อหน้า)",
  "saved": "บันทึกมุมมอง \"{name}\" แล้ว",
  "updated": "อัปเดตมุมมองแล้ว",
  "deleted": "ลบมุมมองแล้ว",
  "renamed": "เปลี่ยนชื่อมุมมองแล้ว"
}
```

- [ ] **Step 2: ตรวจ + commit** — `bunx tsc --noEmit && bun test:run` (มี test เทียบ key en/th sync อยู่ในโปรเจกต์ ต้องผ่าน)

```bash
git add messages/en.json messages/th.json
git commit -m "feat(list-filter): i18n listView (en/th)"
```

### Task 10: `FilterFieldControl` — map field def → control component

**Files:**
- Create: `components/list-filter/filter-field-control.tsx`

**Interfaces:**
- Consumes: `FilterFieldDef` + controls เดิม: `StatusFilter` (`components/ui/status-filter.tsx` — props `value/onChange/options?`), `MultiSelectFilter` (`components/ui/multi-select-filter.tsx` — `value` CSV), `FilterDate` (`components/filter/filter-date.tsx` — `fieldKey`), `FilterDepartment`/`FilterRequester` (`value/onChange/className`), `FilterStage` (`stages: string[]`), `FilterWorkflow` (`workflowType`)
- Produces: `<FilterFieldControl field value onChange />` — Task 11 ใช้

- [ ] **Step 1: Implement**

```tsx
// components/list-filter/filter-field-control.tsx
import { useTranslations } from "use-intl";
import { StatusFilter } from "@/components/ui/status-filter";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { FilterDate } from "@/components/filter/filter-date";
import { FilterDepartment } from "@/components/filter/filter-department";
import { FilterRequester } from "@/components/filter/filter-requester";
import { FilterStage } from "@/components/filter/filter-stage";
import { FilterWorkflow } from "@/components/filter/filter-workflow";
import type { FilterFieldDef } from "@/types/list-filter";

interface Props {
  readonly field: FilterFieldDef;
  readonly value: string;
  readonly onChange: (value: string) => void;
}

/** Render control ตามชนิดใน FilterFieldDef — ทุก control กว้างเต็ม sheet */
export function FilterFieldControl({ field, value, onChange }: Props) {
  const t = useTranslations();

  switch (field.control) {
    case "status":
      return (
        <StatusFilter
          value={value}
          onChange={onChange}
          options={field.options?.map((o) => ({ label: t(o.labelKey), value: o.value }))}
          className="w-full"
        />
      );
    case "multi-select":
      return (
        <MultiSelectFilter
          value={value}
          onChange={onChange}
          options={field.options.map((o) => ({ label: t(o.labelKey), value: o.value }))}
          searchable={field.searchable}
          className="w-full"
        />
      );
    case "date-range":
      return <FilterDate value={value} onChange={onChange} fieldKey={field.fieldKey} />;
    case "department":
      return <FilterDepartment value={value} onChange={onChange} className="w-full" />;
    case "requester":
      return <FilterRequester value={value} onChange={onChange} className="w-full" />;
    case "stage":
      return <FilterStage value={value} onChange={onChange} stages={field.stages} className="w-full" />;
    case "workflow":
      return (
        <FilterWorkflow value={value} onChange={onChange} workflowType={field.workflowType} className="w-full" />
      );
    case "custom":
      return <>{field.render(value, onChange)}</>;
  }
}
```

- [ ] **Step 2: ตรวจ + commit** — `bunx tsc --noEmit`

```bash
git add components/list-filter/filter-field-control.tsx
git commit -m "feat(list-filter): FilterFieldControl map registry เป็น control"
```

### Task 11: `ListFilterSheet`

**Files:**
- Create: `components/list-filter/list-filter-sheet.tsx`

**Interfaces:**
- Consumes: `FilterFieldControl` (Task 10), `UseListFiltersResult` บางส่วน, `Sheet` (`components/ui/sheet.tsx`), `useIsMobile`
- Produces: `<ListFilterSheet fields values setValue onClearAll onSaveClick activeCount />` — Task 15-17 ใช้

- [ ] **Step 1: Implement** — sheet เดียวสองท่า: desktop `side="right" className="w-80 sm:w-96"` (ตาม `pr-filter-sheet.tsx` เดิม), mobile `side="bottom" className="max-h-[80vh]"`; trigger = ปุ่ม Filter + badge (ลอกท่า badge จาก `config-list-template.tsx` บรรทัด 350-369)

```tsx
// components/list-filter/list-filter-sheet.tsx — โครงหลัก
import { useState } from "react";
import { Filter as FilterIcon } from "lucide-react";
import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { FieldLabel } from "@/components/ui/field";
import { useIsMobile } from "@/hooks/use-mobile";
import { FilterFieldControl } from "./filter-field-control";
import type { FilterFieldDef } from "@/types/list-filter";

interface ListFilterSheetProps {
  readonly fields: readonly FilterFieldDef[];
  readonly values: Record<string, string>;
  readonly setValue: (key: string, value: string) => void;
  readonly onClearAll: () => void;
  readonly onSaveClick: () => void;   // เปิด SaveViewDialog (parent ถือ state)
  readonly activeCount: number;
}

export function ListFilterSheet({ fields, values, setValue, onClearAll, onSaveClick, activeCount }: ListFilterSheetProps) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const t = useTranslations();
  const tc = useTranslations("common");
  const tv = useTranslations("listView");

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline" className="relative">
          <FilterIcon aria-hidden="true" />
          {tc("filter")}
          {activeCount > 0 && (
            <Badge variant="secondary" size="xs"
              className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-micro-legal tabular-nums">
              {activeCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={isMobile ? "max-h-[80vh] overflow-y-auto" : "w-80 sm:w-96 overflow-y-auto"}
      >
        <SheetHeader>
          <SheetTitle>{tc("filter")}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-4">
          {fields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <FieldLabel className="text-xs">{t(f.labelKey)}</FieldLabel>
              <FilterFieldControl field={f} value={values[f.key] ?? ""} onChange={(v) => setValue(f.key, v)} />
            </div>
          ))}
          <div className="flex flex-col gap-2 pt-2">
            <Button variant="outline" onClick={onClearAll}>{tc("clearAll")}</Button>
            <Button variant="outline" onClick={() => { setOpen(false); onSaveClick(); }}>
              {tv("saveCurrent")}
            </Button>
            <Button onClick={() => setOpen(false)}>{tc("done")}</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: ตรวจ + commit** — `bunx tsc --noEmit`

```bash
git add components/list-filter/list-filter-sheet.tsx
git commit -m "feat(list-filter): ListFilterSheet (desktop ขวา / mobile ล่าง)"
```

### Task 12: `SaveViewDialog`

**Files:**
- Create: `components/list-filter/save-view-dialog.tsx`

**Interfaces:**
- Consumes: `Dialog` (`components/ui/dialog.tsx`), `RadioGroup` (`components/ui/radio-group.tsx`), `Input`
- Produces: `<SaveViewDialog open onOpenChange canManageBu existingNames onSave(name, scope) />` — Task 13/15-17 ใช้; `existingNames: (scope: ViewScope) => string[]` ใช้เช็คชื่อซ้ำ

- [ ] **Step 1: Implement** — dialog มี: `Input` ชื่อ (required, maxLength 120), `RadioGroup` scope (`user` default; ตัวเลือก `bu` render เฉพาะ `canManageBu`), ชื่อซ้ำใน scope → เปลี่ยนปุ่มเป็นยืนยันแทนที่ (`tv("nameDuplicate", { name })` + ปุ่ม `tv("replace")`), submit เรียก `onSave(name.trim(), scope)` (async — ปุ่ม disabled ระหว่าง pending) แล้วปิด dialog เมื่อสำเร็จ; ชื่อว่าง → แสดง `tv("nameRequired")` ใต้ input ไม่ปิด dialog

- [ ] **Step 2: ตรวจ + commit** — `bunx tsc --noEmit`

```bash
git add components/list-filter/save-view-dialog.tsx
git commit -m "feat(list-filter): SaveViewDialog (ชื่อ + scope + กันชื่อซ้ำ)"
```

### Task 13: `ViewSelector`

**Files:**
- Create: `components/list-filter/view-selector.tsx`

**Interfaces:**
- Consumes: `UseListFiltersResult["view"]` (Task 8), `DropdownMenu` (`components/ui/dropdown-menu.tsx`), `SaveViewDialog` (Task 12), `DeleteDialog` (`components/ui/delete-dialog.tsx`)
- Produces: `<ViewSelector view snapshot />` — `snapshot = { filters: values, sort: sortParam }` ใช้ตอน save/update

- [ ] **Step 1: Implement** — `DropdownMenu` trigger เป็นปุ่ม outline แสดง `tv("view")`: ชื่อ view ปัจจุบัน + `tv("modified")` เมื่อ dirty, หรือ `tv("noView")`; เนื้อใน:
  - item `tv("noView")` → `view.clear()`
  - group `tv("myViews")` → รายการ `userViews` (คลิก = `view.apply(v)`; แต่ละแถวมี submenu/⋯: `rename`, `updateView` (เมื่อ dirty และเป็น view ปัจจุบัน), `delete` → `DeleteDialog` ยืนยันด้วย `tv("deleteConfirm", { name })`)
  - group `tv("buViews")` → รายการ `buViews` — เมนู ⋯ render เฉพาะ `view.canManageBu`
  - เมื่อ dirty: section บนสุดมี 3 action ตาม spec — `updateView` (สิทธิ์: scope user เสมอ, scope bu เฉพาะ `canManageBu`) / `saveAsNew` (เปิด `SaveViewDialog`) / `revert` → `view.revert()`
  - `view.isLoading` → แถว spinner; `view.error` → แถว `tv("loadError")` + ปุ่ม `tv("retry")` (invalidate ทั้ง 2 query keys)
  - empty ทั้งคู่ → แถว disabled `tv("empty")`
  - แถวท้ายเสมอ: `tv("saveCurrent")` → เปิด `SaveViewDialog`
  - `rename` ใช้ dialog เล็กมี Input เดียว (inline ใน component นี้ได้ ไม่ต้องแยกไฟล์)

- [ ] **Step 2: ตรวจ + commit** — `bunx tsc --noEmit`

```bash
git add components/list-filter/view-selector.tsx
git commit -m "feat(list-filter): ViewSelector (เลือก/บันทึก/แก้/ลบ view + dirty state)"
```

---

## Wave 2 — Pilot (ConfigListTemplate + PR + browser verify)

### Task 14: ต่อ framework เข้า `ConfigListTemplate`

**Files:**
- Modify: `components/templates/types.ts` (เพิ่ม props)
- Modify: `components/templates/config-list-template.tsx`

**Interfaces:**
- Consumes: Task 8, 11, 12, 13
- Produces: props ใหม่ `pageKey?: ListPageKey`, `filterFields?: FilterFieldDef[]` — Task 15/19 ใช้; **path เดิม (ไม่ส่ง props ใหม่) ต้องทำงานเหมือนเดิมทุกอย่าง**

- [ ] **Step 1: เพิ่ม props ใน `ConfigListTemplateProps`**

```ts
  /** pageKey ของ saved views — ต้องส่งคู่กับ filterFields จึงเปิดโหมดใหม่ */
  pageKey?: ListPageKey;
  /** เปิด filter sheet + saved views แบบ registry (แทน statusOptions/extraToolbar เดิม) */
  filterFields?: FilterFieldDef[];
```

- [ ] **Step 2: แก้ template** — เมื่อ `pageKey && filterFields`:
  - เรียก `const lf = useListFilters({ pageKey, fields: filterFields, defaultSort })` (เรียกเสมอไม่ได้เพราะ hook ต้องมี fields — เรียกด้วย `fields: filterFields ?? []` และ `pageKey ?? "unused"` ไม่สะอาด; ใช้วิธีแยก: สร้าง internal component `<RegistryToolbar>` ที่ถูก render เฉพาะโหมดใหม่ แล้วรับ callback ส่ง `filterParam`/chips กลับผ่าน props ไม่ได้เพราะ params ใช้ใน query — **ทางที่ถูก:** แยก `ConfigListTemplate` ออกเป็น wrapper บางๆ:

```tsx
export function ConfigListTemplate<T extends { id: string }>(props: ConfigListTemplateProps<T>) {
  if (props.pageKey && props.filterFields) {
    return <ConfigListWithRegistry {...props} pageKey={props.pageKey} filterFields={props.filterFields} />;
  }
  return <ConfigListLegacy {...props} />;
}
```

  - `ConfigListLegacy` = โค้ดเดิมทั้งหมด (rename ฟังก์ชันเดิม ไม่แก้ logic)
  - `ConfigListWithRegistry` = โค้ดเดิม แต่: (1) `mergedParams.filter = lf.filterParam` (แทน block `extraFilter` เดิม), (2) toolbar แทน `StatusFilter`+mobile sheet ด้วย `<ViewSelector view={lf.view} snapshot={{ filters: lf.values, sort: lf.sortParam }} />` + `<ListFilterSheet fields values setValue onClearAll onSaveClick activeCount={lf.activeFilters.length} />` (SaveViewDialog state ถืออยู่ในไฟล์นี้), (3) `<ActiveFilterBar filters={lf.activeFilters} onClearAll={lf.clearAll} />`
  - ทั้งสองตัวแชร์ sub-components เดิม (`renderGridContent`, delete dialog block) — ย้าย shared block เป็นฟังก์ชัน/component ในไฟล์เดียวกัน ไม่ duplicate

- [ ] **Step 3: ตรวจ + commit** — `bunx tsc --noEmit && bun test:run components` → ผ่าน (test เดิมของ template ต้องไม่พัง — โหมด legacy ไม่เปลี่ยนพฤติกรรม)

```bash
git add components/templates/
git commit -m "feat(list-filter): ConfigListTemplate รองรับ registry mode (pageKey + filterFields)"
```

### Task 15: Pilot หน้า config — department

**Files:**
- Create: `routes/config/department/department-filter-fields.ts`
- Modify: `routes/config/department/department-component.tsx`

**Interfaces:**
- Consumes: Task 14
- Produces: แบบอย่างของ template page ที่ Task 19 ลอก

- [ ] **Step 1: fields registry**

```ts
// routes/config/department/department-filter-fields.ts
import type { FilterFieldDef } from "@/types/list-filter";

/** ตัวกรองของหน้ารายการแผนก — status ใช้ค่า clause เต็มใน URL param "filter" */
export const DEPARTMENT_FILTER_FIELDS: FilterFieldDef[] = [
  {
    key: "filter",
    control: "status",
    labelKey: "common.status",
    options: [
      { labelKey: "status.active", value: "is_active|bool:true" },
      { labelKey: "status.inactive", value: "is_active|bool:false" },
    ],
  },
];
```

- [ ] **Step 2: เปิดโหมดใหม่ใน component** — เพิ่ม 2 props ใน `<ConfigListTemplate>`:

```tsx
      pageKey={LIST_PAGE_KEYS.DEPARTMENT}
      filterFields={DEPARTMENT_FILTER_FIELDS}
```

(ลบ `statusOptions`/`hideStatusFilter` ที่ซ้ำซ้อนถ้ามี — หน้า department ใช้ default)

- [ ] **Step 3: ตรวจ + commit** — `bunx tsc --noEmit && bun test:run routes/config/department`

```bash
git add routes/config/department/
git commit -m "feat(department): เปิด filter sheet + saved views (pilot template page)"
```

### Task 16: Pilot หน้า custom — Purchase Request

**Files:**
- Modify: `routes/procurement/purchase-request/pr-component.tsx`
- Delete แทนที่ภายหลัง (Wave 4): `pr-filter-sheet.tsx` — task นี้แค่เลิกใช้
- อ่านก่อนแก้: `routes/procurement/purchase-request/pr-filter-status.tsx`, `pr-active-filters.tsx`, `components/filter/filter-stage.tsx` (ดู format ค่าที่เขียนลง URL — ต้องคง format เดิมทุก field)

**Interfaces:**
- Consumes: Task 8, 11-13
- Produces: แบบอย่างหน้า custom ที่ Task 20-23 ลอก

- [ ] **Step 1: build fields ใน component ด้วย `useMemo`** (ต้องอยู่ใน component เพราะ `stages` มาจาก hook):

```tsx
  const { data: stages } = usePurchaseRequestWorkflowStages();
  const prFilterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        key: "filter",
        control: "custom",
        labelKey: "common.status",
        render: (value, onChange) => (
          <PrFilterStatus value={value} onChange={onChange} className="w-full" />
        ),
      },
      { key: "workflow_current_stage", control: "stage", labelKey: "procurement.purchaseRequest.stage", stages: stages ?? [] },
      { key: "workflow", control: "workflow", labelKey: "field.workflow", workflowType: WORKFLOW_TYPE.PR },
      { key: "department", control: "department", labelKey: "field.department" },
      { key: "user_id", control: "requester", labelKey: "common.requester" },
      { key: "pr_date", control: "date-range", labelKey: "field.prDate", fieldKey: "pr_date" },
    ],
    [stages],
  );
  const lf = useListFilters({
    pageKey: LIST_PAGE_KEYS.PURCHASE_REQUEST,
    fields: prFilterFields,
    defaultSort: viewMode === "my-pending" ? "pr_date:desc" : "pr_no:desc",
  });
```

หมายเหตุ: ค่าใน URL ของทุก field เป็น clause เต็มอยู่แล้ว (`FilterDepartment` เขียน `department_id|string:...` เอง ฯลฯ) → ไม่ต้องมี `toClause` — implementer ตรวจ `filter-stage.tsx` ยืนยัน format ก่อน ถ้า stage เขียนค่าดิบ (ไม่มี `|`) ต้องใส่ `toClause` ตาม format ที่หน้าเดิมประกอบ

- [ ] **Step 2: แทน state เดิม** — ลบ `useURL("department"/"workflow"/"pr_date")` + `filterStr` ประกอบมือ (บรรทัด ~130-140) → `queryParams = { ...params, filter: lf.filterParam }`; **คง** `useDataGridState` ไว้สำหรับ pagination/sort/search (แต่ไม่ใช้ `params.filter` ของมันแล้ว — ระวังอย่าให้ clause ซ้ำสองทาง); แทน `<PrFilterSheet ...>` + `usePrActiveFilters` + `<ActiveFilterBar>` เดิมด้วย `<ViewSelector>` + `<ListFilterSheet>` + `<ActiveFilterBar filters={lf.activeFilters} onClearAll={lf.clearAll} />`; ปุ่ม view-mode toggle มือถือ (เดิมอยู่ใน PrFilterSheet) ย้ายเป็น field `custom` ตัวแรกใน registry (render toggle เดิม เฉพาะ `sm:hidden`)

- [ ] **Step 3: ตรวจ + commit** — `bunx tsc --noEmit && bun test:run routes/procurement/purchase-request`

```bash
git add routes/procurement/purchase-request/
git commit -m "feat(pr): ย้ายมา filter registry + saved views (pilot custom page)"
```

### Task 17: Browser verification กับ backend จริง (gate ก่อน sweep)

**Files:** ไม่แก้โค้ด — ตรวจอย่างเดียว (แก้ตามบั๊กที่เจอได้)

- [ ] **Step 1: รัน backend + frontend** — backend: gateway :4000 (repo backend, รัน micro-business + gateway ตาม README/dev script ของ repo นั้น) · frontend: `VITE_DEV_PROXY_TARGET=http://localhost:4000 bun dev` · login `admin@zebra.com` / `12345678` (บัญชี dev — **DB คือ shared dev** ระวังอย่าลบ config คนอื่น: แตะเฉพาะ key `list_views_*`)
- [ ] **Step 2: ตรวจหน้า PR** — ตั้ง filter หลาย field → save เป็น user view → reload → เลือก view จาก dropdown → filter+sort กลับมาครบ, `sv` อยู่ใน URL, deep link (copy URL เปิด tab ใหม่) ได้ผลเดียวกัน
- [ ] **Step 3: ตรวจ dirty + BU scope** — แก้ filter หลัง apply → เห็น "(แก้ไขแล้ว)" + 3 action; save BU view (บัญชี admin) → เห็น 403 เมื่อทดสอบด้วยบัญชี non-admin (ถ้ามี) หรืออย่างน้อยยืนยัน role ใน `x-bu-datas` ตรงกับ guard (ดู log gateway — ถ้า field เป็น `system_level` กลับไปแก้ Task 3 Step 4)
- [ ] **Step 4: ตรวจหน้า department** — save/apply/delete view + ลอง `sv` ปลอมใน URL → toast + ล้างเงียบ
- [ ] **Step 5: Console สะอาด** — ไม่มี error/warning ใหม่ใน console ทั้ง 2 หน้า
- [ ] **Step 6: Commit fixes (ถ้ามี)** — commit แยกเป็น `fix(list-filter): ...` ภาษาไทย

---

## Wave 3 — Sweep ทุกหน้าที่เหลือ

> ทุก task ใน wave นี้ใช้แบบอย่างจาก Task 15 (template page) และ Task 16 (custom page)
> ต่อหน้า: (1) อ่าน component เดิม หา filter ทุกตัว (จุดสังเกต: `useURL(...)`, `StatusFilter`,
> `MultiSelectFilter`, `extraToolbar`, sheet เฉพาะหน้า) (2) สร้าง `<feature>-filter-fields.ts`
> (หรือ `useMemo` เมื่อพึ่ง runtime data) ครบทุก filter เดิม — **key ต้องเป็น URL param ชื่อเดิม**
> (3) เปลี่ยน component มาใช้ framework (4) ลบ filter UI เฉพาะหน้าที่ถูกแทน
> (5) `bunx tsc --noEmit` + `bun test:run <โฟลเดอร์>` (6) commit ต่อหน้าหรือต่อกลุ่มเล็ก
> ห้ามเปลี่ยน format ค่าใน URL ของ field ใดๆ — deep link เก่าต้องยังใช้ได้

### Task 18: หน้า ConfigListTemplate ที่เหลือ 12 หน้า

**Files (Modify + Create fields file ต่อหน้า):** `routes/config/{adjustment-type, business-type, certification, credit-note-reason, credit-term, currency, delivery-point, eco, extra-cost, location, tax-profile, unit}/`

- [ ] adjustment-type (มี `extraFilter`+`extraToolbar` `adj_type` — ย้ายเป็น field `multi-select`/`custom` ใน registry แล้วเลิกส่ง extraFilter), business-type, certification, credit-note-reason, credit-term, currency, delivery-point, eco, extra-cost, location (มี `location_type` extraToolbar), tax-profile, unit — pageKey ตาม `LIST_PAGE_KEYS`
- [ ] `bunx tsc --noEmit && bun test:run routes/config` → ผ่าน · commit: `feat(config): filter sheet + saved views ครบ 13 หน้า config`

### Task 19: Procurement ที่เหลือ (PO, GRN, CN, PRT, approval)

**Files:** `routes/procurement/{purchase-order, goods-receive-note, credit-note, purchase-request-template, approval}/`

- [ ] po-component (`po_type`, status), grn-component (`grn_status`, vendor, date), cn-component (`cn_status`, `cn_type`), prt-component (`department`, `template` ฯลฯ), approval-component — param เดิมต่อหน้าดูจากตาราง survey ท้าย plan
- [ ] `bunx tsc --noEmit && bun test:run routes/procurement` · commit: `feat(procurement): filter sheet + saved views (po/grn/cn/prt/approval)`

### Task 20: Inventory + Store operation (IA, PC, SC, transaction, SR, WR)

**Files:** `routes/inventory-management/{inventory-adjustment, physical-count, spot-check, transaction}/`, `routes/store-operation/{store-requisition, wastage-reporting}/`

- [ ] ia (`adj_type`?, status), pc (`physical_count_type`, period), sc, transaction (`inventory_doc_type`, `direction`, `location_id`, `created_at_from/to` — สองตัวหลังเป็น date-range คู่ ให้รวมเป็น field `custom` เดียวที่ render date-range เดิมและเขียน 2 param — หรือคง 2 field แบบ `custom`), sr (`sr_type`, `from_location`, `to_location`, stage), wr
- [ ] `bunx tsc --noEmit && bun test:run routes/inventory-management routes/store-operation` · commit: `feat(inventory,store-op): filter sheet + saved views`

### Task 21: Product + Vendor management

**Files:** `routes/product-management/product/`, `routes/vendor-management/{vendor, price-list, price-list-template, request-price-list}/`

- [ ] product (`category`, `sub_category`, `item_group`, status — หน้าใหญ่สุด มี lookup tree), vendor (`business_type`, `region`?), price-list (vendor, status, date), plt, rfp (vendor, status)
- [ ] `bunx tsc --noEmit && bun test:run routes/product-management routes/vendor-management` · commit: `feat(product,vendor): filter sheet + saved views`

### Task 22: System-admin + Operation-plan + Report

**Files:** `routes/system-admin/{user, role, workflow, document, period, running-code, notification-template, activity-log, user-activity}/`, `routes/operation-plan/{recipe, category, cuisine, equipment, equipment-category, recipe-equipment-category}/`, `routes/report/{list, history}/`

- [ ] system-admin: user (`business_type`?, status), role, workflow (`workflow_type`), document (`type`), period, running-code, noti-tmpl, activity-log (`action`, `actor_id`, date), user-activity (`action`, `actor_id`)
- [ ] operation-plan: recipe (`category`, `cuisine`, `difficulty`, status), recipe-category, cuisine, equipment, equipment-category, recipe-equipment-category
- [ ] report: list (`groups`, `template`?), history (date, `entity_type`?)
- [ ] `bunx tsc --noEmit && bun test:run routes/system-admin routes/operation-plan routes/report` · commit: `feat(sys-admin,op-plan,report): filter sheet + saved views`

---

## Wave 4 — Cleanup + final gate

### Task 23: ลบของเก่าที่ถูกแทน + full check

**Files:**
- Delete: `routes/procurement/purchase-request/pr-filter-sheet.tsx`, `pr-active-filters.tsx` (ถ้าไม่มีผู้ใช้เหลือ — grep ก่อนลบ), sheet เฉพาะหน้าอื่นที่ถูกแทนใน Wave 3
- Modify: `components/templates/config-list-template.tsx` — เมื่อทั้ง 13 หน้า template ใช้ registry แล้ว ลบ `ConfigListLegacy` + props เก่าที่ไม่มีผู้ใช้ (`statusOptions`, `hideStatusFilter`, `extraFilter`, `extraActiveFilters`, `onClearExtraFilters` — grep ยืนยันเป็นศูนย์ก่อนลบทีละตัว ตัวไหนยังมีผู้ใช้ให้คงไว้)

- [ ] **Step 1: grep หา import ของไฟล์ที่จะลบ** — `grep -rn "pr-filter-sheet\|pr-active-filters" routes/ components/` ต้องว่างก่อน `git rm`
- [ ] **Step 2: Full gate** — `bunx tsc --noEmit && bun run lint && bun test:run` → เขียวทั้งหมด
- [ ] **Step 3: Browser spot-check รอบสอง** — เปิด 3 หน้า (PR, product, currency) ยืนยัน filter + views ยังทำงาน + console สะอาด
- [ ] **Step 4: Commit + PR**

```bash
git add -A
git commit -m "refactor(list-filter): ลบ bespoke filter sheet ที่ถูกแทนด้วย framework"
```

เปิด PR ทั้ง 2 repo (FE + BE) — title/body ภาษาอังกฤษตามกติกา repo; body ระบุ **ลำดับ deploy: backend ต้องขึ้นก่อน frontend** (ไม่งั้น user views จะ error ทุกหน้า — FE จัดการ error ให้ dropdown ยัง degrade ได้ แต่อย่าปล่อยเป็นสถานะถาวร)

---

## ภาคผนวก: ตาราง URL param ต่อหน้า (จาก survey — จุดเริ่มของ Wave 3, ตรวจกับไฟล์จริงอีกครั้งตอนทำ)

| หน้า | params ที่พบ |
|---|---|
| pr | filter, workflow_current_stage, user_id, department, workflow, pr_date, view (tab — ไม่ใช่ filter) |
| po | filter, po_type |
| grn | filter, grn_status, vendor |
| cn | filter, cn_status, cn_type |
| prt | filter, department, template |
| transaction | inventory_doc_type, direction, location_id, created_at_from, created_at_to |
| sr | filter, sr_type, from_location, to_location |
| product | filter, category, sub_category, item_group |
| recipe | category, cuisine, difficulty, filter |
| workflow (sys-admin) | workflow_type |
| document | type |
| activity-log / user-activity | action, actor_id |
| physical-count | physical_count_type |
| adjustment-type (config) | adj_type |
| location (config) | location_type |
| vendor | business_type, region |
| report list | groups, template |
| อื่นๆ (template pages) | filter (status) อย่างเดียว |

**เตือนความจำจาก memory โปรเจกต์:** (1) list endpoint ของ app-config คืน `data.items` แต่ single-key GET คืน row ตรงๆ — hooks ใน plan นี้ใช้ single-key ทั้งคู่ (2) columns/data ของ DataGrid ต้อง memoize — plan นี้ไม่แตะ table แต่ระวังตอนแก้ component อย่าทำ columns หลุด memo (3) ทดสอบ list feature ใน browser จริงเสมอ
