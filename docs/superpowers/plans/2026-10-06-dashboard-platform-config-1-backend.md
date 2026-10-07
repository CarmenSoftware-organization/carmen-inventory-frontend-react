# Dashboard Platform Config — Plan 1/4: backend-v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ย้าย system widgets จากไฟล์ hardcode ไปตาราง platform `tb_dashboard_widget_template`, เพิ่ม CRUD/deploy API ฝั่ง platform และ module/reorder/permission ฝั่ง BU widget

**Architecture:** micro-cluster เป็นเจ้าของตาราง template (Prisma platform, RPC ผ่าน `@repo/rpc-contract`), gateway เป็นด่าน HTTP: `/api-system/dashboard-templates*` (platform) และ `/api/:bu_code/dashboard-widgets/*` (BU) gateway อ่าน system widgets ผ่าน RPC + cache 60 วินาที และสั่ง deploy ไป micro-data ผ่าน HTTP (`fetch` + `x-internal-token`) แบบเดียวกับ `DashboardBuWidgetsService`

**Tech Stack:** NestJS · Prisma (platform + tenant) · zod v4 + nestjs-zod · jest · bun

**Spec:** `carmen-inventory-frontend-react/docs/superpowers/specs/2026-10-06-dashboard-platform-config-design.md` — **§10 มีผลเหนือส่วนก่อนหน้า**

**Repo:** `/Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2` · branch `feature/dashboard-platform-config` จาก `main`

## Global Constraints

- **ไม่เขียนเทสต์ใหม่** (preference ของ user) — แต่ spec เดิมที่พังต้องแก้ให้เขียว; รัน `check-types` + lint ทุก task
- jest เท่านั้น — **ห้าม `bun test`** ในรีโปนี้
- lint gateway: ใช้ `npx eslint --no-fix <files>` — **ห้าม `bun run lint`** (มัน `--fix` ทั้งรีโป)
- JSDoc สองภาษา (บรรทัดอังกฤษ แล้วบรรทัดไทย) บังคับด้วย lint · export เดียวต่อไฟล์ · ≤20 statement ต่อฟังก์ชัน · ≤10 public method ต่อคลาส
- enum มาจาก Prisma: `z.enum(enum_dashboard_widget_type)` / `@ApiProperty({ enum, enumName })`
- RPC handler ใหม่: เขียน `@MessagePattern({ cmd, service })` literal ชั่วคราว → `bun run gen:rpc-contract` → แทนด้วย `X.y.pattern` (ไฟล์ contract เป็น generated ห้ามแก้มือ)
- ทุก route `api-system/*` ต้องมี `@RequirePlatformPermission` (CI `audit:api-system-permission`) และ module ต้อง provide `PlatformPermissionGuard, PlatformPermissionService` (CI `audit:guard-providers` ไม่งั้น gateway ล่มตอน boot)
- `new AppIdGuard('<api_name>')` ใหม่ทุกตัว → regenerate `app-api-catalog.generated.ts` (CI `audit:app-api-catalog-drift`)
- **ห้ามแตะ `permission.route-map.ts`** — เพิ่ม `SUB_PATH_RESOURCE_MAP` = license feature ใหม่ = หน้าล็อกทันที (`LICENSE_ENFORCEMENT` เปิดทุก env)
- **ห้าม DROP enum** `enum_dashboard_widget_type` / `enum_dataset_shape` ใน platform
- module ที่ใช้ได้: `procurement` `inventory` `product` `config` `vendor-management` `operation-plan` `store-operation`; `NULL` เฉพาะ `kind='bu_default'`
- allow/deny = array ของ **BU code**; deny มาก่อน allow; ว่าง/NULL = ไม่จำกัด
- DB `:4000` = dev DB ที่ใช้ร่วม — backup ก่อนเขียน
- commit message ภาษาไทย

## Contracts ข้ามรีโป (ต้องตรงกับ Plan 2 micro-data)

micro-data (ทุกตัวต้อง header `x-internal-token`, error = `{"error": "<msg>"}`):

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/dashboard/bu-widgets?bu_code=&module=` | — | `{items:[{id,module,dataset_id,widget_type,title,order_index,params,display,...}], count, deploy_state: {deployed_version, deployed_at, customized_at} \| null}` — `module` ไม่ส่ง = ทุกตัว, `main` = `module IS NULL` |
| POST | `/api/dashboard/bu-widgets?bu_code=&user_id=` | `WidgetCreateInput` + `module?: string \| null` | 201 `{id}` |
| POST | `/api/dashboard/bu-widgets/reorder?bu_code=&user_id=` | `{items:[{id, order_index}]}` | `{reordered: n}` |
| GET | `/api/dashboard/bu-widgets/deploy-state?bu_code=` | — | `{deploy: null \| {deployed_version, deployed_at, deployed_by_id, customized_at, customized_by_id}}` |
| POST | `/api/dashboard/bu-widgets/deploy?bu_code=&user_id=` | `{mode: "skip_customized"\|"overwrite", version: int, widgets: [{module, dataset_id, widget_type, title, order_index, params, display}]}` | `{result:"deployed", count}` \| `{result:"skipped"}` |
| GET | `/api/dashboard-lab/datasets` (มีอยู่แล้ว) | — | `{items:[{id,name,description,shape,category,unit,params:[...],supported_renders:[...]}], count}` |

gateway → platform/FE (Plan 3/4 ใช้):

| Method | Path | Permission | api_name |
|---|---|---|---|
| GET | `/api-system/dashboard-templates?kind=&module=` | `dashboard_template.read` | `dashboard-template.findAll` |
| GET | `/api-system/dashboard-templates/datasets` | `dashboard_template.read` | `dashboard-template.datasets` |
| GET | `/api-system/dashboard-templates/bu-default/version` | `dashboard_template.read` | `dashboard-template.version` |
| GET | `/api-system/dashboard-templates/:id` | `dashboard_template.read` | `dashboard-template.findOne` |
| POST | `/api-system/dashboard-templates` | `dashboard_template.create` | `dashboard-template.create` |
| PATCH | `/api-system/dashboard-templates/reorder` body `{kind, module, items:[{id, order_index}]}` | `dashboard_template.update` | `dashboard-template.reorder` |
| PATCH | `/api-system/dashboard-templates/:id` | `dashboard_template.update` | `dashboard-template.update` |
| DELETE | `/api-system/dashboard-templates/:id` | `dashboard_template.delete` | `dashboard-template.delete` |
| GET | `/api-system/dashboard-templates/deploy/:bu_code/status` | `dashboard_template.deploy` | `dashboard-template.deployStatus` |
| POST | `/api-system/dashboard-templates/deploy/:bu_code` body `{mode, expected_version}` | `dashboard_template.deploy` | `dashboard-template.deploy` |
| PATCH | `/api/:bu_code/dashboard-widgets/bu/reorder` body `{items:[{id, order_index}]}` | `dashboard.bu_widget.update` | — |

- `deploy/:bu_code/status` ตอบ `{version, status: "never"|"customized"|"outdated"|"current", deployed_version, deployed_at, customized_at}`
- `deploy/:bu_code` ตอบผลของ micro-data ตรงตัว หรือ 409 (`BU default version changed`)
- Template row (wire): `{id, kind: "system"|"bu_default", module: string|null, dataset_id, widget_type, title, order_index, params, display, allow_business_unit: string[]|null, deny_business_unit: string[]|null, is_active, doc_version, created_at, updated_at, ...audit}`
- response ทุกตัวห่อด้วย envelope มาตรฐานของ gateway (`this.respond`) — ฝั่ง client unwrap `data`

## Review Focus

1. **seed system widgets ต้องได้ผลตรงไฟล์เดิมทุกฟิลด์** — curl `/:module/config` ก่อน/หลังต้อง diff ว่าง (Task 6 Step 6)
2. **ตาราง system ว่าง / RPC ล้ม** → route system ต้องตอบ `items: []` ไม่ 500 (Task 6 Step 2)
3. **module ที่ไม่รู้จัก** ใน `:module/config` ยัง 404 รวมถึง `'constructor'` (prototype key) ที่ spec เดิมทดสอบอยู่ (Task 6 Step 1, 4)
4. **version ขยับระหว่าง deploy** → 409 ก่อนส่งอะไรไป micro-data (Task 5 Step 5, ตรวจมือ Task 8)
5. **widget_type ไม่อยู่ใน `supported_renders`** หรือ dataset_id ไม่มีใน catalog → 422 ไม่ใช่ 500 (Task 5 Step 3, ตรวจมือ Task 8)

---

### Task 1: Platform schema + migration (ตาราง template, seed system widgets, drop ตารางค้าง)

**Files:**
- Modify: `packages/prisma-shared-schema-platform/prisma/schema.prisma` (ลบ model `tb_dashboard_bu_widget` 966-986 และ `tb_dashboard_personal_widget` 989-1008; เพิ่ม 2 model ใหม่หลัง enum `enum_dashboard_widget_type` ~952)
- Create: `packages/prisma-shared-schema-platform/prisma/migrations/20261006100000_dashboard_widget_template/migration.sql`
- Create (ชั่วคราว ไม่ commit): `$SCRATCH/gen-system-widget-seed.ts`

**Interfaces:**
- Produces: Prisma model `tb_dashboard_widget_template`, `tb_dashboard_bu_default_version` (client `PrismaClient_SYSTEM`)

- [ ] **Step 1: ตรวจตารางค้างก่อนเขียน DROP**

```bash
# dev ก่อน (UAT/prod ทำตอน rollout) — ต้องได้ 0 ทั้งคู่ ถ้าไม่ 0 ให้ pg_dump สองตารางนั้นเก็บไว้ก่อน
psql "$PLATFORM_DATABASE_URL" -c 'SELECT (SELECT count(*) FROM tb_dashboard_bu_widget) bu, (SELECT count(*) FROM tb_dashboard_personal_widget) personal;'
```

- [ ] **Step 2: แก้ schema.prisma**

ลบสอง model ค้าง (เก็บ enum ไว้) แล้วเพิ่ม:

```prisma
// Platform-managed dashboard widget templates.
// kind='system'     → แสดงบนหน้า module dashboard ของทุก BU (อ่านสด กรองด้วย allow/deny BU code)
// kind='bu_default' → ชุด default ที่ platform deploy ลง tenant tb_dashboard_bu_widget
// module NULL = หน้า /dashboard หลัก (ใช้ได้เฉพาะ bu_default — CHECK อยู่ใน migration SQL)
model tb_dashboard_widget_template {
  id                  String                     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  kind                String                     @db.VarChar(20)
  module              String?                    @db.VarChar(50)
  dataset_id          String                     @db.VarChar(100)
  widget_type         enum_dashboard_widget_type
  title               String?                    @db.VarChar(255)
  order_index         Int                        @default(0)
  params              Json?                      @db.JsonB
  display             Json?                      @db.JsonB
  // array ของ BU code; NULL/[] = ไม่จำกัด; ใช้กับ kind='system' เท่านั้น
  allow_business_unit Json?                      @db.JsonB
  deny_business_unit  Json?                      @db.JsonB
  is_active           Boolean                    @default(true)

  doc_version   Int       @default(0) @db.Integer
  created_at    DateTime? @default(now()) @db.Timestamptz(6)
  created_by_id String?   @db.Uuid
  updated_at    DateTime? @default(now()) @db.Timestamptz(6)
  updated_by_id String?   @db.Uuid
  deleted_at    DateTime? @db.Timestamptz(6)
  deleted_by_id String?   @db.Uuid

  @@index([kind, module, deleted_at], map: "idx_dashboard_widget_template_kind_module")
}

// แถวเดียว (id=1) — version ของชุด bu_default; ขยับทุกครั้งที่เขียน template kind='bu_default'
model tb_dashboard_bu_default_version {
  id            Int       @id @default(1)
  version       Int       @default(0)
  updated_at    DateTime? @default(now()) @db.Timestamptz(6)
  updated_by_id String?   @db.Uuid
}
```

- [ ] **Step 3: สร้าง SQL seed ของ system widgets จากไฟล์เดิม**

```ts
// $SCRATCH/gen-system-widget-seed.ts — รันจาก apps/backend-gateway:
//   bun run $SCRATCH/gen-system-widget-seed.ts > $SCRATCH/seed.sql
import { getAllSystemWidgets } from './src/application/dashboard-widgets/system-widgets.config';
const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const rows = getAllSystemWidgets().map(
  (w) =>
    `  (${q('system')}, ${q(w.module)}, ${q(w.dataset_id)}, ${q(w.widget_type)}::"enum_dashboard_widget_type", ${q(w.title)}, ${w.order_index})`,
);
console.log(
  `INSERT INTO "tb_dashboard_widget_template" ("kind", "module", "dataset_id", "widget_type", "title", "order_index")\nVALUES\n${rows.join(',\n')};`,
);
```

ต้องได้ 63 แถว (procurement 8 · inventory 11 · product 12 · config 5 · vendor-management 10 · operation-plan 10 · store-operation 7)
ถ้า import path ไม่ resolve จาก scratch ให้คัดลอก config ไปข้าง script แล้ว import ตรง

- [ ] **Step 4: เขียน migration.sql**

```sql
-- 20261006100000_dashboard_widget_template
-- ย้าย system widgets จาก system-widgets.config.ts เข้าตาราง + ชุด bu_default ที่ deploy ลง tenant
-- Move hardcoded system widgets into a table; add the bu_default set and its version counter.

CREATE TABLE IF NOT EXISTS "tb_dashboard_widget_template" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kind" VARCHAR(20) NOT NULL,
    "module" VARCHAR(50),
    "dataset_id" VARCHAR(100) NOT NULL,
    "widget_type" "enum_dashboard_widget_type" NOT NULL,
    "title" VARCHAR(255),
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "params" JSONB,
    "display" JSONB,
    "allow_business_unit" JSONB,
    "deny_business_unit" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "doc_version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" UUID,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_by_id" UUID,
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by_id" UUID,
    CONSTRAINT "tb_dashboard_widget_template_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ck_dashboard_widget_template_kind" CHECK ("kind" IN ('system', 'bu_default')),
    CONSTRAINT "ck_dashboard_widget_template_module" CHECK (
        ("module" IS NULL AND "kind" = 'bu_default')
        OR "module" IN ('procurement', 'inventory', 'product', 'config', 'vendor-management', 'operation-plan', 'store-operation')
    )
);
CREATE INDEX IF NOT EXISTS "idx_dashboard_widget_template_kind_module"
    ON "tb_dashboard_widget_template" ("kind", "module", "deleted_at");

CREATE TABLE IF NOT EXISTS "tb_dashboard_bu_default_version" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "version" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_by_id" UUID,
    CONSTRAINT "tb_dashboard_bu_default_version_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ck_dashboard_bu_default_version_single" CHECK ("id" = 1)
);
INSERT INTO "tb_dashboard_bu_default_version" ("id", "version") VALUES (1, 0) ON CONFLICT ("id") DO NOTHING;

-- seed system widgets เฉพาะตอนยังไม่มี (รันซ้ำไม่ซ้ำแถว)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "tb_dashboard_widget_template" WHERE "kind" = 'system') THEN
    -- <วาง INSERT ทั้งก้อนจาก $SCRATCH/seed.sql ตรงนี้>
  END IF;
END $$;

-- ตารางค้างจาก 20260522044138 (ย้ายไป tenant แล้ว) — enum เก็บไว้ gateway ยัง import อยู่
-- Stale tables relocated to tenant schemas; both enums stay (still imported by the gateway).
DROP TABLE IF EXISTS "tb_dashboard_bu_widget";
DROP TABLE IF EXISTS "tb_dashboard_personal_widget";
```

- [ ] **Step 5: generate + type-check**

Run: `cd packages/prisma-shared-schema-platform && bun run db:generate && bun run check-types`
Expected: ผ่าน

- [ ] **Step 6: apply บน DB local แล้วนับแถว**

Run: `bun run db:deploy` (ใน package นั้น) แล้ว `psql … -c "SELECT module, count(*) FROM tb_dashboard_widget_template GROUP BY 1 ORDER BY 1;"`
Expected: 7 แถว รวม 63

- [ ] **Step 7: Commit**

```bash
git add packages/prisma-shared-schema-platform/prisma/schema.prisma packages/prisma-shared-schema-platform/prisma/migrations/20261006100000_dashboard_widget_template
git commit -m "feat(platform-schema): เพิ่มตาราง dashboard widget template, seed system widgets และลบตาราง dashboard ค้าง"
```

---

### Task 2: Tenant schema mirror (`module` + ตาราง deploy)

**Files:**
- Modify: `packages/prisma-shared-schema-tenant/prisma/schema.prisma:6926-6945` (`tb_dashboard_bu_widget`)
- Create: `packages/prisma-shared-schema-tenant/prisma/migrations/20261006100100_dashboard_bu_widget_module_deploy/migration.sql`

**Interfaces:**
- Produces: DDL ที่ micro-data `131_dash_bu_widget_module.up.sql` (Plan 2 Task 1) สร้างแบบเดียวกัน — **ต้องตรงกันทั้งสองฝั่ง** และ `IF NOT EXISTS` ทั้งคู่

- [ ] **Step 1: แก้ model**

ใน `tb_dashboard_bu_widget` เพิ่มหลัง `display`:

```prisma
  /// หน้าที่ widget นี้ไปแสดง: NULL = หน้า /dashboard หลัก หรือชื่อ module dashboard (procurement, inventory, …)
  module      String?                    @db.VarChar(50)
```

และ `@@index([module, deleted_at], map: "tenant_dashboard_bu_widget_module_idx")`

เพิ่ม model ใหม่:

```prisma
// แถวเดียวต่อ tenant — สถานะการ deploy ชุด bu_default จาก platform (DDL เจ้าของร่วม: micro-data 131)
model tb_dashboard_bu_widget_deploy {
  id               Int       @id @default(1)
  deployed_version Int
  deployed_at      DateTime? @db.Timestamptz(6)
  deployed_by_id   String?   @db.Uuid
  customized_at    DateTime? @db.Timestamptz(6)
  customized_by_id String?   @db.Uuid
}
```

- [ ] **Step 2: migration.sql**

```sql
-- 20261006100100_dashboard_bu_widget_module_deploy
-- เจ้าของร่วมกับ micro-data migrations/tenant/131_dash_bu_widget_module.up.sql — ทั้งคู่ IF NOT EXISTS รันลำดับไหนก็ได้
ALTER TABLE "tb_dashboard_bu_widget" ADD COLUMN IF NOT EXISTS "module" VARCHAR(50);
CREATE INDEX IF NOT EXISTS "tenant_dashboard_bu_widget_module_idx" ON "tb_dashboard_bu_widget" ("module", "deleted_at");

CREATE TABLE IF NOT EXISTS "tb_dashboard_bu_widget_deploy" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "deployed_version" INTEGER NOT NULL,
    "deployed_at" TIMESTAMPTZ(6),
    "deployed_by_id" UUID,
    "customized_at" TIMESTAMPTZ(6),
    "customized_by_id" UUID,
    CONSTRAINT "tb_dashboard_bu_widget_deploy_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ck_dashboard_bu_widget_deploy_single" CHECK ("id" = 1)
);

-- BU ที่มี BU widget อยู่ก่อนระบบ deploy = "ปรับเอง" เพื่อให้ skip_customized ไม่ทับ
INSERT INTO "tb_dashboard_bu_widget_deploy" ("id", "deployed_version", "customized_at")
SELECT 1, 0, now()
WHERE EXISTS (SELECT 1 FROM "tb_dashboard_bu_widget" WHERE "deleted_at" IS NULL)
ON CONFLICT ("id") DO NOTHING;
```

- [ ] **Step 3: generate + type-check**

Run: `cd packages/prisma-shared-schema-tenant && bun run db:generate && bun run check-types`
Expected: ผ่าน

- [ ] **Step 4: Commit**

```bash
git add packages/prisma-shared-schema-tenant/prisma
git commit -m "feat(tenant-schema): เพิ่มคอลัมน์ module และตาราง deploy ของ BU dashboard widget"
```

---

### Task 3: Permission seeds (BU `dashboard.bu_widget`, platform `dashboard_template`)

**Files:**
- Modify: `packages/prisma-shared-schema-platform/prisma/seed.permission.data.ts:1556-1577` (ต่อจากบล็อก dashboard widget)
- Modify: `packages/prisma-shared-schema-platform/prisma/seed.role-permission.ts:63-66, 169-172, 275-278`
- Modify: `packages/prisma-shared-schema-platform/prisma/seed.platform-permission.data.ts` (ต่อจาก `report_template` ~99-102)
- Modify: `packages/prisma-shared-schema-platform/src/platform-permission-resource.ts` (ต่อจาก `report_template` ~52-55)
- Modify: `packages/prisma-shared-schema-platform/prisma/seed.platform-role-permission.data.ts` (`ROLE_PERMISSIONS`)

**Interfaces:**
- Produces: BU `dashboard.bu_widget.{view,create,update,delete}`; platform `dashboard_template.{read,create,update,delete,deploy}`

- [ ] **Step 1: BU permission** (รูป object เดียวกับแถวรอบข้าง)

```ts
  // dashboard BU widget — widget ระดับ BU ที่ทุกคนใน BU เห็น (แยกจาก dashboard.widget ของ personal)
  { resource: 'dashboard.bu_widget', action: 'view', description: 'View BU dashboard widget' },
  { resource: 'dashboard.bu_widget', action: 'create', description: 'Create BU dashboard widget' },
  { resource: 'dashboard.bu_widget', action: 'update', description: 'Update BU dashboard widget' },
  { resource: 'dashboard.bu_widget', action: 'delete', description: 'Delete BU dashboard widget' },
```

- [ ] **Step 2: role matrix**

อ่าน 3 บล็อกใน `seed.role-permission.ts` ให้รู้ว่าเป็น role อะไร แล้วเพิ่ม `'dashboard.bu_widget': ['view','create','update','delete']` **เฉพาะ role ที่เป็น admin ของ BU** และ `['view']` ให้ role อื่น — ถ้าแยกไม่ออกว่าบล็อกไหนคือ admin ให้หยุดถาม

- [ ] **Step 3: platform permission + คำอธิบาย resource**

`seed.platform-permission.data.ts`:

```ts
  { resource: 'dashboard_template', action: 'read', description: 'View dashboard templates' },
  { resource: 'dashboard_template', action: 'create', description: 'Create dashboard templates' },
  { resource: 'dashboard_template', action: 'update', description: 'Update dashboard templates' },
  { resource: 'dashboard_template', action: 'delete', description: 'Delete dashboard templates' },
  { resource: 'dashboard_template', action: 'deploy', description: 'Deploy BU default dashboard to business units' },
```

`platform-permission-resource.ts`:

```ts
  dashboard_template: {
    description: 'Dashboard widget templates (system widgets and BU defaults)',
    description_th: 'เทมเพลต widget ของ dashboard (system widgets และชุด default ของ BU)',
  },
```

`seed.platform-role-permission.data.ts`: `'Platform Admin'` เพิ่ม `'dashboard_template.*'` ข้าง `'report_template.*'`; role ที่มี `'report_template.read'` เพิ่ม `'dashboard_template.read'`

- [ ] **Step 4: ตรวจ**

Run: `cd packages/prisma-shared-schema-platform && bun run check-types && cd ../.. && bun run audit:platform-permission-resource`
Expected: ผ่าน

- [ ] **Step 5: Commit**

```bash
git add packages/prisma-shared-schema-platform
git commit -m "feat(permission): เพิ่มสิทธิ์ dashboard.bu_widget และ dashboard_template"
```

---

### Task 4: micro-cluster — module `dashboard-template` (RPC)

**Files:**
- Create: `apps/micro-cluster/src/cluster/dashboard-template/dashboard-template.module.ts`
- Create: `apps/micro-cluster/src/cluster/dashboard-template/dashboard-template.controller.ts`
- Create: `apps/micro-cluster/src/cluster/dashboard-template/dashboard-template.service.ts`
- Create: `apps/micro-cluster/src/cluster/dashboard-template/dashboard-template.types.ts`
- Create: `apps/micro-cluster/src/cluster/dashboard-template/dashboard-template-version.ts`
- Modify: `apps/micro-cluster/src/app.module.ts:26,114` (แบบ `ReportTemplateModule`)
- Modify: `apps/micro-cluster/src/common/activity/platform-activity-registry.ts:76-87`
- Generated: `packages/rpc-contract/src/contracts/dashboard-templates.ts`, `contracts/index.ts`

**Interfaces:**
- Consumes: Prisma model จาก Task 1
- Produces (RPC `DashboardTemplates.*`, service `micro-cluster`), payload keys อยู่บน `MicroservicePayload`:
  - `findAll({kind?, module?})` → `{data: Template[]}` เรียง `module, order_index, created_at`
  - `findOne({id})` → `Template` | NOT_FOUND
  - `create({data, user_id})` → `{id, doc_version}`
  - `update({id, data, user_id})` → `{id, doc_version}` (ถ้า `data.doc_version` ไม่ตรงกับแถว → error 409 ตาม pattern ที่ repo ใช้)
  - `delete({id, user_id})` → `{id}` (soft)
  - `reorder({kind, module, items:[{id, order_index}], user_id})` → `{reordered}`
  - `findActiveSystem({})` → `Template[]` (`kind='system' AND is_active AND deleted_at IS NULL`)
  - `getBuDefault({})` → `{version: number, widgets: Template[]}` อ่านใน `$transaction` เดียว

- [ ] **Step 1: types + version helper**

`dashboard-template.types.ts`:

```ts
/**
 * Writable fields of a dashboard widget template
 * ฟิลด์ที่เขียนได้ของเทมเพลต widget dashboard
 */
export interface DashboardTemplateWrite {
  kind?: 'system' | 'bu_default';
  module?: string | null;
  dataset_id?: string;
  widget_type?: string;
  title?: string | null;
  order_index?: number;
  params?: Record<string, string | number> | null;
  display?: Record<string, unknown> | null;
  allow_business_unit?: string[] | null;
  deny_business_unit?: string[] | null;
  is_active?: boolean;
  doc_version?: number;
}
```

`dashboard-template-version.ts`:

```ts
import type { Prisma } from '@repo/prisma-shared-schema-platform';

/**
 * Increments the single-row BU-default version inside the caller's transaction
 * ขยับ version แถวเดียวของชุด bu_default ภายใน transaction ของผู้เรียก
 */
export async function bumpBuDefaultVersion(tx: Prisma.TransactionClient, user_id: string): Promise<void> {
  await tx.tb_dashboard_bu_default_version.upsert({
    where: { id: 1 },
    create: { id: 1, version: 1, updated_by_id: user_id },
    update: { version: { increment: 1 }, updated_at: new Date(), updated_by_id: user_id },
  });
}
```

(ถ้า `Prisma` namespace ไม่ได้ export จาก package นั้น ให้ใช้ type ของ tx จาก `Parameters<Parameters<typeof PrismaClient_SYSTEM.$transaction>[0]>[0]`)

- [ ] **Step 2: service**

import `Result` / `TryCatch` / `ERROR_CATALOG` / error helpers ให้ตรงกับหัว `report-template.service.ts`

```ts
const LIVE = { deleted_at: null } as const;
const ORDER = [{ module: 'asc' as const }, { order_index: 'asc' as const }, { created_at: 'asc' as const }];

/**
 * Prisma-backed CRUD for platform dashboard widget templates
 * CRUD ของเทมเพลต widget dashboard ระดับ platform บน Prisma
 */
@Injectable()
export class DashboardTemplateService {
  private readonly logger = new BackendLogger(DashboardTemplateService.name);

  constructor(@Inject('PRISMA_SYSTEM') private readonly prismaSystem: typeof PrismaClient_SYSTEM) {}

  /**
   * Lists live templates filtered by kind and module ('main' = NULL module)
   * แสดงเทมเพลตที่ยังไม่ถูกลบ กรองตาม kind และ module ('main' = module เป็น NULL)
   */
  @TryCatch
  async findAll(kind?: string, module?: string): Promise<Result<unknown>> {
    const where: Record<string, unknown> = { ...LIVE };
    if (kind) where.kind = kind;
    if (module) where.module = module === 'main' ? null : module;
    const data = await this.prismaSystem.tb_dashboard_widget_template.findMany({ where, orderBy: ORDER });
    return Result.ok({ data });
  }

  /**
   * Creates a template and bumps the BU-default version in the same transaction for bu_default rows
   * สร้างเทมเพลตและขยับ version ของชุด bu_default ใน transaction เดียวกันเมื่อเป็นแถว bu_default
   */
  @TryCatch
  async create(data: DashboardTemplateWrite, user_id: string): Promise<Result<{ id: string; doc_version: number }>> {
    const row = await this.prismaSystem.$transaction(async (tx) => {
      const created = await tx.tb_dashboard_widget_template.create({
        data: { ...data, created_by_id: user_id, updated_by_id: user_id } as never,
      });
      if (created.kind === 'bu_default') await bumpBuDefaultVersion(tx, user_id);
      return created;
    });
    return Result.ok({ id: row.id, doc_version: row.doc_version });
  }

  /**
   * Updates a template with optimistic doc_version check; bumps the BU-default version when relevant
   * อัปเดตเทมเพลตพร้อมตรวจ doc_version และขยับ version ของชุด bu_default เมื่อเกี่ยวข้อง
   */
  @TryCatch
  async update(id: string, data: DashboardTemplateWrite, user_id: string): Promise<Result<unknown>> {
    const { doc_version, kind: _ignoredKind, ...fields } = data;
    const row = await this.prismaSystem.$transaction(async (tx) => {
      const current = await tx.tb_dashboard_widget_template.findFirst({ where: { id, ...LIVE } });
      if (!current) return null;
      if (doc_version != null && doc_version !== current.doc_version) return 'conflict' as const;
      const updated = await tx.tb_dashboard_widget_template.update({
        where: { id },
        data: { ...fields, updated_by_id: user_id, updated_at: new Date(), doc_version: { increment: 1 } } as never,
      });
      if (current.kind === 'bu_default') await bumpBuDefaultVersion(tx, user_id);
      return updated;
    });
    if (row === null) return Result.error('Dashboard template not found', ErrorCode.NOT_FOUND);
    if (row === 'conflict') return Result.error('Dashboard template was modified', ErrorCode.CONFLICT);
    return Result.ok({ id: row.id, doc_version: row.doc_version });
  }

  // delete(id, user_id): รูปเดียวกับ update — findFirst LIVE (ไม่มี → NOT_FOUND), update {deleted_at: new Date(), deleted_by_id},
  //   bump เมื่อ current.kind === 'bu_default', คืน Result.ok({ id })
  // reorder(kind, module, items, user_id): ใน $transaction — count แถว LIVE ที่ id ∈ items และ kind/module ตรง
  //   (module 'main' = null) ถ้าไม่ครบ → NOT_FOUND; update order_index ทีละแถว; bump เมื่อ kind === 'bu_default';
  //   คืน Result.ok({ reordered: items.length })
  // findOne(id): findFirst LIVE → NOT_FOUND หรือ Result.ok(row)
  // ถ้าชื่อ ErrorCode ข้างบนไม่มีจริง ให้ใช้ตัวที่ report-template.service ใช้กับ 404/409

  /**
   * Returns active system widgets of every module
   * คืน system widgets ที่เปิดใช้งานของทุก module
   */
  @TryCatch
  async findActiveSystem(): Promise<Result<unknown>> {
    const data = await this.prismaSystem.tb_dashboard_widget_template.findMany({
      where: { ...LIVE, kind: 'system', is_active: true },
      orderBy: ORDER,
    });
    return Result.ok(data);
  }

  /**
   * Returns the active BU-default set with its version, read in one transaction
   * คืนชุด bu_default ที่เปิดใช้งานพร้อม version โดยอ่านใน transaction เดียว
   */
  @TryCatch
  async getBuDefault(): Promise<Result<{ version: number; widgets: unknown[] }>> {
    const [ver, widgets] = await this.prismaSystem.$transaction([
      this.prismaSystem.tb_dashboard_bu_default_version.findUnique({ where: { id: 1 } }),
      this.prismaSystem.tb_dashboard_widget_template.findMany({
        where: { ...LIVE, kind: 'bu_default', is_active: true },
        orderBy: ORDER,
      }),
    ]);
    return Result.ok({ version: ver?.version ?? 0, widgets });
  }
}
```

ถ้าเมธอดเกิน 20 statement ตามกฎ lint ให้แตก helper private

- [ ] **Step 3: controller ด้วย literal ชั่วคราว**

ยกโครง `report-template.controller.ts` (`createAuditContext` + `runWithAuditContext`) handler 8 ตัว เช่น

```ts
  /**
   * Lists dashboard widget templates by kind and module
   * แสดงเทมเพลต widget dashboard ตาม kind และ module
   */
  @MessagePattern({ cmd: 'dashboard-templates.find-all', service: 'micro-cluster' })
  async findAll(@Payload() payload: MicroservicePayload): Promise<MicroserviceResponse> {
    const result = await runWithAuditContext(this.createAuditContext(payload), () =>
      this.service.findAll(payload.kind, payload.module),
    );
    return this.handleResult(result);
  }
```

cmd: `dashboard-templates.find-all` `.find-one` `.create` `.update` `.delete` `.reorder` `.find-active-system` `.get-bu-default`
(ใช้เมธอดแปลงผลของ `BaseMicroserviceController` — ดูชื่อจริงใน base class; `payload.kind` ฯลฯ ถ้า type ไม่มี key ให้ cast ตามที่ controller อื่นทำ)

- [ ] **Step 4: generate contract แล้วเปลี่ยนเป็น reference**

Run: `bun run gen:rpc-contract`
แทน literal ทุกตัวด้วย `DashboardTemplates.findAll.pattern` ฯลฯ (`import { DashboardTemplates } from '@repo/rpc-contract'`)
Run: `bun run audit:message-pattern-literal && bun run audit:tcp-drift`
Expected: ผ่าน

- [ ] **Step 5: module + register + activity log**

module แบบ `report-template.module.ts:11-22` (`{ provide: 'PRISMA_SYSTEM', useValue: PrismaClient_SYSTEM }`) · register ใน `app.module.ts`
`platform-activity-registry.ts`:

```ts
  ['dashboard-templates.create', { action: 'create', entityName: 'tb_dashboard_widget_template', idSource: CREATED_ID }],
  ['dashboard-templates.update', { action: 'update', entityName: 'tb_dashboard_widget_template', idSource: EDITED_ID }],
  ['dashboard-templates.delete', { action: 'delete', entityName: 'tb_dashboard_widget_template', idSource: DELETED_ID }],
```

- [ ] **Step 6: ตรวจ**

Run: `cd apps/micro-cluster && npx tsc --noEmit -p tsconfig.json && npx eslint --no-fix src/cluster/dashboard-template src/app.module.ts src/common/activity/platform-activity-registry.ts && npx jest src/common/activity`
Expected: ผ่าน

- [ ] **Step 7: Commit**

```bash
git add apps/micro-cluster packages/rpc-contract
git commit -m "feat(micro-cluster): เพิ่ม RPC จัดการ dashboard widget template"
```

---

### Task 5: gateway — `/api-system/dashboard-templates` (CRUD + datasets + deploy)

**Files:**
- Create: `apps/backend-gateway/src/common/dto/dashboard-template/dashboard-template.dto.ts` (+ `index.ts` แบบ report-template)
- Create: `apps/backend-gateway/src/common/constant/dashboard-modules.ts`
- Create: `apps/backend-gateway/src/platform/platform_dashboard-templates/platform_dashboard-templates.controller.ts`
- Create: `apps/backend-gateway/src/platform/platform_dashboard-templates/platform_dashboard-template-deploy.controller.ts`
- Create: `apps/backend-gateway/src/platform/platform_dashboard-templates/platform_dashboard-templates.service.ts`
- Create: `apps/backend-gateway/src/platform/platform_dashboard-templates/dashboard-template-deploy.service.ts`
- Create: `apps/backend-gateway/src/platform/platform_dashboard-templates/deploy-status-of.ts`
- Create: `apps/backend-gateway/src/platform/platform_dashboard-templates/micro-data-template.client.ts`
- Create: `apps/backend-gateway/src/platform/platform_dashboard-templates/platform_dashboard-templates.module.ts`
- Create: `apps/backend-gateway/src/platform/platform_dashboard-templates/swagger/response.ts`
- Modify: `apps/backend-gateway/src/app.module.ts:41,187`
- Generated: `apps/backend-gateway/src/platform/applications/app-api-catalog.generated.ts`

**Interfaces:**
- Consumes: RPC `DashboardTemplates.*` (Task 4); micro-data contract (หัว plan); `SystemWidgetCache` (Task 6 — ทำ Task 6 ก่อน Task 5 ได้ หรือสร้าง class เปล่าไว้ให้ Task 6 เติม)
- Produces: route ตามตาราง "gateway → platform/FE"; `DASHBOARD_MODULES` (ใช้ใน Task 6/7)

- [ ] **Step 1: constant + DTO**

`common/constant/dashboard-modules.ts`:

```ts
/**
 * Module dashboards that system and BU widgets may target
 * หน้า module dashboard ที่ system widget และ BU widget ไปแสดงได้
 */
export const DASHBOARD_MODULES = [
  'procurement', 'inventory', 'product', 'config', 'vendor-management', 'operation-plan', 'store-operation',
] as const;
```

DTO create:

```ts
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod/v4';
import { enum_dashboard_widget_type } from '@repo/prisma-shared-schema-platform';
import { DASHBOARD_MODULES } from '../../constant/dashboard-modules';

const BuCodes = z.array(z.string().min(1)).nullable().optional();

/**
 * Request body for creating a dashboard widget template
 * เนื้อหาคำขอสำหรับสร้างเทมเพลต widget ของ dashboard
 */
export const DashboardTemplateCreateSchema = z
  .object({
    kind: z.enum(['system', 'bu_default']),
    module: z.enum(DASHBOARD_MODULES).nullable(),
    dataset_id: z.string().min(1).max(100),
    widget_type: z.enum(enum_dashboard_widget_type),
    title: z.string().max(255).nullable().optional(),
    order_index: z.number().int().min(0).optional(),
    params: z.record(z.string(), z.union([z.string(), z.number()])).nullable().optional(),
    display: z.record(z.string(), z.unknown()).nullable().optional(),
    allow_business_unit: BuCodes,
    deny_business_unit: BuCodes,
    is_active: z.boolean().optional(),
  })
  .refine((v) => v.module !== null || v.kind === 'bu_default', {
    message: 'module null is only allowed for kind bu_default',
    path: ['module'],
  })
  .refine((v) => v.kind === 'system' || (!v.allow_business_unit?.length && !v.deny_business_unit?.length), {
    message: 'allow/deny business unit applies to kind system only',
    path: ['allow_business_unit'],
  });
export class DashboardTemplateCreateDto extends createZodDto(DashboardTemplateCreateSchema) {}
```

อีก 3 schema (ไฟล์ละ export ถ้า lint บังคับ):
- Update: ทุก field ของ create ยกเว้น `kind` เป็น optional + `doc_version: z.number().int().optional()` (refine allow/deny ทำใน service เพราะต้องรู้ kind เดิม)
- Reorder: `{ kind: z.enum(['system','bu_default']), module: z.union([z.enum(DASHBOARD_MODULES), z.literal('main')]), items: z.array(z.object({ id: z.uuid(), order_index: z.number().int().min(0) })).min(1) }`
- Deploy: `{ mode: z.enum(['skip_customized', 'overwrite']), expected_version: z.number().int().min(0) }`

- [ ] **Step 2: micro-data client**

ยกโครง `request()` จาก `dashboard-bu-widgets.service.ts:37-60` (baseUrl จาก `DATASET_SERVICE_URL` หรือ host/port, header `INTERNAL_TOKEN_HEADER`) มีเมธอด:
- `catalog(): Promise<Result<{ items: { id: string; supported_renders: string[] }[] }>>` → `GET /api/dashboard-lab/datasets`
- `deployState(bu_code)` → `GET /api/dashboard/bu-widgets/deploy-state?bu_code=`
- `deploy(bu_code, user_id, body)` → `POST /api/dashboard/bu-widgets/deploy?bu_code=&user_id=`

ทุก path `encodeURIComponent` ค่า query; network error → `Result.error(..., ErrorCode.SERVICE_UNAVAILABLE)` (ใช้ code ที่ map เป็น 502/503 ใน repo)

- [ ] **Step 3: validation กับ catalog**

**ก่อนเขียน**: `curl -H "x-internal-token: $INTERNAL_RPC_SECRET" "$DATASET_SERVICE_URL/api/dashboard-lab/datasets" | jq '[.items[].supported_renders[]] | unique'` บน dev — ต้องเป็นเซตย่อยของ `kpi line area bar pie heatmap gauge table sparkline` ถ้ามีชื่อที่ไม่อยู่ใน enum ให้หยุดรายงาน

ใน `platform_dashboard-templates.service.ts`:

```ts
  /**
   * Rejects a template whose dataset is unknown or cannot render as the requested widget type
   * ปฏิเสธเทมเพลตที่ dataset ไม่มีใน catalog หรือ dataset วาดเป็น widget type นี้ไม่ได้
   */
  private async validateAgainstCatalog(dataset_id: string, widget_type: string): Promise<Result<void>> {
    const catalog = await this.microData.catalog();
    if (catalog.isError()) return Result.error(catalog.error.message, ErrorCode.SERVICE_UNAVAILABLE);
    const ds = catalog.value.items.find((d) => d.id === dataset_id);
    if (!ds) return Result.error(`Unknown dataset: ${dataset_id}`, ErrorCode.UNPROCESSABLE_ENTITY);
    if (!ds.supported_renders.includes(widget_type)) {
      return Result.error(`Dataset ${dataset_id} cannot render as ${widget_type}`, ErrorCode.UNPROCESSABLE_ENTITY);
    }
    return Result.ok(undefined);
  }
```

ใช้ชื่อ `ErrorCode` ที่มีจริงที่ map เป็น 422 (ถ้าไม่มี ใช้ตัว validation ที่ repo ใช้)
- create: validate ก่อน RPC create
- update: `findOne` ก่อน → ถ้า `dataset_id` หรือ `widget_type` เปลี่ยน validate ด้วยค่าที่รวมแล้ว; ถ้าแถวเดิมเป็น `bu_default` และ body ส่ง allow/deny ที่ไม่ว่าง → 422; ถ้าแถวเดิม `system` และ body `module: null` → 422
- `datasets()` = ส่ง catalog ต่อ (route `GET datasets`)
- `version()` = `getBuDefault` แล้วคืน `{ version }`
- create/update/delete/reorder สำเร็จ + kind/แถวเดิมเป็น `system` → `this.systemWidgetCache.invalidate()`

- [ ] **Step 4: CRUD controller**

ตาม `platform_report-templates.controller.ts:53-81`:

```ts
@Controller('api-system/dashboard-templates')
@ApiTags('Platform: Dashboard Templates')
@ApiHeaderRequiredXAppId()
@UseGuards(KeycloakGuard)
@ApiBearerAuth()
export class PlatformDashboardTemplatesController extends BaseHttpController {
  constructor(private readonly service: PlatformDashboardTemplatesService) {
    super();
  }

  /**
   * Lists dashboard widget templates by kind and module
   * แสดงเทมเพลต widget dashboard ตาม kind และ module
   */
  @Get()
  @UseGuards(new AppIdGuard('dashboard-template.findAll'), PlatformPermissionGuard)
  @RequirePlatformPermission('dashboard_template.read')
  @EnrichAuditUsers()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List dashboard widget templates', operationId: 'platformDashboardTemplate_findAll' })
  async findAll(
    @Req() req: Request,
    @Res() res: Response,
    @Query('kind') kind?: string,
    @Query('module') module?: string,
  ): Promise<void> {
    const { user_id } = ExtractRequestHeader(req);
    this.respond(res, await this.service.findAll(user_id, kind, module));
  }
  // … datasets, bu-default/version, reorder, :id (GET/PATCH/DELETE), POST
}
```

**ลำดับ route**: `GET datasets`, `GET bu-default/version`, `PATCH reorder` ต้องประกาศ **ก่อน** `:id` · `:id` ใช้ `new ParseUUIDPipe({ version: '4' })` · create คืน `HttpStatus.CREATED` · เพิ่ม `@ApiResponse` 400/401/403/404/409/422 ตามแบบ report template

- [ ] **Step 5: deploy service + controller**

`deploy-status-of.ts`:

```ts
/**
 * Derives a BU's deploy status from the platform version and the tenant deploy row
 * คำนวณสถานะ deploy ของ BU จาก version ของ platform กับแถว deploy ใน tenant
 */
export function deployStatusOf(
  version: number,
  deploy: { deployed_version: number; customized_at: string | null } | null,
): 'never' | 'customized' | 'outdated' | 'current' {
  if (!deploy) return 'never';
  if (deploy.customized_at) return 'customized';
  if (deploy.deployed_version < version) return 'outdated';
  return 'current';
}
```

`DashboardTemplateDeployService`:

```ts
  /**
   * Deploys the active BU-default set to one BU, refusing when the version moved since the caller looked
   * deploy ชุด bu_default ไปยัง BU เดียว และปฏิเสธเมื่อ version เปลี่ยนไปจากที่ผู้เรียกเห็น
   */
  async deploy(bu_code: string, user_id: string, body: DashboardTemplateDeployDto): Promise<Result<unknown>> {
    const set = await this.rpc.send(DashboardTemplates.getBuDefault, { user_id });
    if (set.response.status !== HttpStatus.OK) return Result.fromMicroserviceError(set);
    const { version, widgets } = set.data as { version: number; widgets: TemplateRow[] };
    if (version !== body.expected_version) {
      return Result.error('BU default version changed', ErrorCode.CONFLICT);
    }
    return this.microData.deploy(bu_code, user_id, {
      mode: body.mode,
      version,
      widgets: widgets.map(({ module, dataset_id, widget_type, title, order_index, params, display }) => ({
        module, dataset_id, widget_type, title, order_index, params, display,
      })),
    });
  }

  /**
   * Reports one BU's deploy status against the current BU-default version
   * รายงานสถานะ deploy ของ BU เดียวเทียบกับ version ปัจจุบันของชุด bu_default
   */
  async status(bu_code: string, user_id: string): Promise<Result<unknown>> {
    const set = await this.rpc.send(DashboardTemplates.getBuDefault, { user_id });
    if (set.response.status !== HttpStatus.OK) return Result.fromMicroserviceError(set);
    const { version } = set.data as { version: number };
    const state = await this.microData.deployState(bu_code);
    if (state.isError()) return state;
    const deploy = (state.value as { deploy: DeployRow | null }).deploy;
    return Result.ok({
      version,
      status: deployStatusOf(version, deploy),
      deployed_version: deploy?.deployed_version ?? null,
      deployed_at: deploy?.deployed_at ?? null,
      customized_at: deploy?.customized_at ?? null,
    });
  }
```

controller `@Controller('api-system/dashboard-templates/deploy')`: `GET :bu_code/status` (`dashboard-template.deployStatus`) และ `POST :bu_code` (`dashboard-template.deploy`, `@HttpCode(HttpStatus.OK)`) ทั้งคู่ `@RequirePlatformPermission('dashboard_template.deploy')`
**path prefix ซ้อนกัน**: `api-system/dashboard-templates/deploy/T02` จะถูก CRUD controller จับเป็น `:id` ไม่ได้เพราะ `ParseUUIDPipe` แต่ให้ตรวจลำดับ register controller — ใส่ deploy controller **ก่อน** CRUD controller ใน `controllers: [...]`

- [ ] **Step 6: module + register + catalog**

```ts
@Module({
  imports: [DashboardWidgetsModule], // ได้ SystemWidgetCache instance เดียวกับฝั่ง BU (Task 6 export ไว้)
  controllers: [PlatformDashboardTemplateDeployController, PlatformDashboardTemplatesController],
  providers: [
    PlatformDashboardTemplatesService,
    DashboardTemplateDeployService,
    MicroDataTemplateClient,
    PlatformPermissionGuard,
    PlatformPermissionService,
  ],
})
export class PlatformDashboardTemplatesModule {}
```

ถ้า import `DashboardWidgetsModule` แล้วเกิด circular/boot error ให้ย้าย `SystemWidgetCache` ไปเป็น module เล็กของตัวเอง (`SystemWidgetCacheModule`) ที่ทั้งสองฝั่ง import
register ใน `app.module.ts` · Run: `bun run scripts/generate-app-api-catalog/run.ts`

- [ ] **Step 7: ตรวจ**

Run: `cd apps/backend-gateway && bun run check-types && npx eslint --no-fix src/platform/platform_dashboard-templates src/common/dto/dashboard-template src/common/constant/dashboard-modules.ts && cd ../.. && bun run audit:api-system-permission && bun run audit:guard-providers && bun run audit:app-api-catalog-drift && bun run audit:rest-contract && bun run boot-check`
Expected: ผ่านทั้งหมด

- [ ] **Step 8: Commit**

```bash
git add apps/backend-gateway
git commit -m "feat(gateway): เพิ่ม API จัดการและ deploy dashboard template ฝั่ง platform"
```

---

### Task 6: gateway — system widgets อ่านจากตาราง (cache + allow/deny)

**Files:**
- Create: `apps/backend-gateway/src/application/dashboard-widgets/system-widget-cache.service.ts`
- Create: `apps/backend-gateway/src/application/dashboard-widgets/visible-to-bu.ts`
- Create: `apps/backend-gateway/src/application/dashboard-widgets/system-widget.types.ts` (ย้าย `SystemWidgetModule`, `SystemWidgetConfig` จาก config เดิม)
- Create: `apps/backend-gateway/src/application/dashboard-widgets/is-system-widget-module.ts`
- Modify: `apps/backend-gateway/src/application/dashboard-widgets/system-widgets.controller.ts` (route 75-314)
- Modify: `apps/backend-gateway/src/application/dashboard-widgets/dashboard-widgets.module.ts` (provide + export `SystemWidgetCache`)
- Modify: `apps/backend-gateway/src/application/dashboard-widgets/swagger/response.ts:163-164` (enum module เติม `store-operation`)
- Delete: `apps/backend-gateway/src/application/dashboard-widgets/system-widgets.config.ts` (**หลัง** Task 1 Step 3 สร้าง seed แล้ว)
- Modify (test เดิม): `apps/backend-gateway/src/application/dashboard-widgets/system-widgets.controller.spec.ts`

**Interfaces:**
- Consumes: `DashboardTemplates.findActiveSystem` (Task 4), `DASHBOARD_MODULES` (Task 5 Step 1)
- Produces: `SystemWidgetCache.forBu(bu_code: string, module?: SystemWidgetModule): Promise<SystemWidgetConfig[]>` · `SystemWidgetCache.invalidate(): void` · รูป `SystemWidgetConfig` เดิม `{module, dataset_id, widget_type, title, order_index}`

- [ ] **Step 1: helpers (pure)**

`visible-to-bu.ts`:

```ts
/**
 * Keeps templates a BU may see: deny wins over allow; an empty or null list means no restriction
 * กรองเทมเพลตที่ BU นี้มองเห็นได้: deny มาก่อน allow; รายการว่างหรือ null = ไม่จำกัด
 */
export function visibleToBu<T extends { allow_business_unit: unknown; deny_business_unit: unknown }>(
  rows: T[],
  bu_code: string,
): T[] {
  const list = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  return rows.filter((r) => {
    if (list(r.deny_business_unit).includes(bu_code)) return false;
    const allow = list(r.allow_business_unit);
    return allow.length === 0 || allow.includes(bu_code);
  });
}
```

`is-system-widget-module.ts`:

```ts
/**
 * Type guard for module names that have a system dashboard (no prototype-key false positives)
 * type guard สำหรับชื่อ module ที่มี dashboard (ไม่หลงรับ key ของ prototype)
 */
export function isSystemWidgetModule(module: string): module is SystemWidgetModule {
  return (DASHBOARD_MODULES as readonly string[]).includes(module);
}
```

`system-widget.types.ts`: `export type SystemWidgetModule = (typeof DASHBOARD_MODULES)[number];` และ `SystemWidgetConfig` รูปเดิม (แยกไฟล์ถ้า lint บังคับ export เดียว)

- [ ] **Step 2: cache**

```ts
const TTL_MS = 60_000;

/**
 * Caches active system widget templates for 60 s and filters them per BU
 * เก็บ system widget ที่เปิดใช้งานไว้ 60 วินาที แล้วกรองตาม BU
 */
@Injectable()
export class SystemWidgetCache {
  private entry: { rows: SystemTemplateRow[]; expiresAt: number } | null = null;
  private readonly logger = new BackendLogger(SystemWidgetCache.name);

  constructor(private readonly rpc: RpcClient) {}

  /**
   * System widgets a BU sees, optionally for one module, in display order
   * system widgets ที่ BU นี้เห็น เลือกเฉพาะ module ได้ เรียงตามลำดับแสดงผล
   */
  async forBu(bu_code: string, module?: SystemWidgetModule): Promise<SystemWidgetConfig[]> {
    const rows = visibleToBu(await this.rows(), bu_code).filter((r) => !module || r.module === module);
    return rows.map(({ module: m, dataset_id, widget_type, title, order_index }) => ({
      module: m as SystemWidgetModule,
      dataset_id,
      widget_type,
      title: title ?? '',
      order_index,
    }));
  }

  /**
   * Drops the cached rows so the next read hits the database
   * ล้างค่าที่ cache ไว้เพื่อให้การอ่านครั้งถัดไปไปที่ฐานข้อมูล
   */
  invalidate(): void {
    this.entry = null;
  }

  private async rows(): Promise<SystemTemplateRow[]> {
    if (this.entry && this.entry.expiresAt > Date.now()) return this.entry.rows;
    const res = await this.rpc.send(DashboardTemplates.findActiveSystem, {});
    if (res.response.status !== HttpStatus.OK) {
      this.logger.warn({ function: 'rows', status: res.response.status }, SystemWidgetCache.name);
      return this.entry?.rows ?? [];
    }
    const rows = (res.data ?? []) as SystemTemplateRow[];
    if (rows.length === 0) this.logger.warn({ function: 'rows', message: 'no system widget templates' }, SystemWidgetCache.name);
    this.entry = { rows, expiresAt: Date.now() + TTL_MS };
    return rows;
  }
}
```

RPC ล้ม → ค่าเดิมถ้ามี ไม่งั้น `[]` (หน้า module ขึ้น empty state ไม่ 500) · ตรวจรูปที่ `rpc.send` คืนจาก `platform_report-templates.service.ts:101-112`
`DashboardWidgetsModule`: `providers: [..., SystemWidgetCache]`, `exports: [SystemWidgetCache]`

- [ ] **Step 3: แก้ controller**

inject `SystemWidgetCache`; ทุก route module: `getSystemWidgets('procurement')` → `await this.cache.forBu(bu_code, 'procurement')`; `all` → `await this.cache.forBu(bu_code)`; `:module/config` เพิ่ม `@Param('bu_code') bu_code: string` เป็น async → ตรวจ `isSystemWidgetModule` (404 เหมือนเดิม) แล้ว `forBu(bu_code, module)` — รูป response `{items, count}` เดิม
ลบ `system-widgets.config.ts` และแก้ import ทุกจุดให้ใช้ไฟล์ใหม่

- [ ] **Step 4: แก้ spec เดิม** (`system-widgets.controller.spec.ts` import config จริงที่บรรทัด 8)

```ts
const FIXTURE: SystemWidgetConfig[] = [
  { module: 'procurement', dataset_id: 'workflow.pr-pending-approval', widget_type: 'kpi', title: 'PR รออนุมัติ', order_index: 0 },
  { module: 'inventory', dataset_id: 'inventory.low-stock-count', widget_type: 'kpi', title: 'Low stock', order_index: 0 },
];
const cacheMock = {
  forBu: jest.fn(async (_bu: string, m?: string) => FIXTURE.filter((w) => !m || w.module === m)),
  invalidate: jest.fn(),
};
// providers: เพิ่ม { provide: SystemWidgetCache, useValue: cacheMock }
```

`describe.each` ที่เทียบกับ `getSystemWidgets(m)` → เทียบกับ `FIXTURE.filter((w) => w.module === m)`; คงเคส 404 `'constructor'`

- [ ] **Step 5: ตรวจ**

Run: `cd apps/backend-gateway && bun run check-types && npx jest src/application/dashboard-widgets && npx eslint --no-fix src/application/dashboard-widgets`
Expected: ผ่าน

- [ ] **Step 6: ตรวจมือ — ผลต้องเหมือนเดิม**

ก่อนสลับ branch เก็บ baseline จาก main ที่รันอยู่:

```bash
for m in procurement inventory product config vendor-management operation-plan store-operation; do
  curl -s -H "Authorization: Bearer $TOKEN" -H "x-app-id: $APP_ID" "http://localhost:4000/api/T02/dashboard-widgets/$m/config" | jq -S '.data.items' > "$SCRATCH/before-$m.json"
done
# สลับมา branch นี้ รีสตาร์ท gateway + micro-cluster แล้วเก็บเป็น after-$m.json แบบเดียวกัน
for m in procurement inventory product config vendor-management operation-plan store-operation; do
  diff "$SCRATCH/before-$m.json" "$SCRATCH/after-$m.json" && echo "$m OK"
done
```

Expected: ทั้ง 7 module `OK` (envelope อาจไม่ใช่ `.data.items` — ปรับ jq ตามที่เห็นจริง)

- [ ] **Step 7: Commit**

```bash
git add apps/backend-gateway/src/application/dashboard-widgets
git commit -m "refactor(gateway): system widgets อ่านจากตาราง template พร้อม cache และกรอง allow/deny ตาม BU"
```

---

### Task 7: gateway — BU widgets: module filter, reorder, permission

**Files:**
- Modify: `apps/backend-gateway/src/application/dashboard-widgets/dashboard-bu-widgets.controller.ts` (44-208)
- Modify: `apps/backend-gateway/src/application/dashboard-widgets/dashboard-bu-widgets.service.ts` (`findAll` + `reorder` ใหม่)
- Modify: `apps/backend-gateway/src/application/dashboard-widgets/dashboard-widgets.module.ts` (provider ที่ `PermissionGuard` ต้องใช้)
- Modify (test เดิม): `dashboard-bu-widgets.controller.spec.ts`, `dashboard-bu-widgets.service.spec.ts`

**Interfaces:**
- Consumes: micro-data `GET /api/dashboard/bu-widgets?module=` และ `POST …/reorder` (Plan 2)
- Produces: `GET /api/:bu_code/dashboard-widgets/bu?module=` ส่ง `items, count, deploy_state` ต่อตรงตัว · `PATCH /api/:bu_code/dashboard-widgets/bu/reorder`

- [ ] **Step 1: service**

```ts
  /**
   * Lists BU widgets, optionally only those targeting one page ('main' = the main dashboard)
   * แสดง BU widget เลือกเฉพาะหน้าที่ระบุได้ ('main' = หน้า dashboard หลัก)
   */
  async findAll(bu_code: string, module?: string): Promise<Result<unknown>> {
    const q = new URLSearchParams({ bu_code });
    if (module) q.set('module', module);
    return this.request('GET', `/api/dashboard/bu-widgets?${q.toString()}`);
  }

  /**
   * Reorders BU widgets in one call
   * จัดลำดับ BU widget ในการเรียกครั้งเดียว
   */
  async reorder(bu_code: string, user_id: string, items: { id: string; order_index: number }[]): Promise<Result<unknown>> {
    const q = new URLSearchParams({ bu_code, user_id });
    return this.request('POST', `/api/dashboard/bu-widgets/reorder?${q.toString()}`, { items });
  }
```

(ปรับให้เข้ากับลายเซ็นของ `findAll` เดิม — ถ้าเดิมรับ `user_id` ด้วยให้คงไว้) · create ส่ง body ต่อทั้งก้อนอยู่แล้ว `module` จึงไปถึง micro-data เอง

- [ ] **Step 2: controller + permission**

- class: `@UseGuards(KeycloakGuard, PermissionGuard)` ตาม `config_vendor-master-certificates.controller.ts:28,50` — `PermissionGuard` ปล่อย handler ที่ไม่มี `@Permission` จึงไม่กระทบ GET
- `GET /`: `@Query('module') module?: string` — ถ้ามีค่าและไม่ใช่ `'main'` หรือ `isSystemWidgetModule(module)` → `Result.error('Unknown module', ErrorCode.INVALID_ARGUMENT)` (400; ใช้ชื่อจริงใน repo) · `@ApiQuery({ name: 'module', required: false, example: 'main' })`
- `POST /` → `@Permission({ 'dashboard.bu_widget': ['create'] })`
- `PATCH reorder` (ใหม่, ประกาศ **ก่อน** `PATCH :dashboard_widget_id`) และ `PATCH :id` → `['update']`; body swagger ใช้ `ReorderWidgetsRequestDto` ที่มีอยู่ (`swagger/response.ts:141-160`); runtime validate ด้วย zod `{items: [{id: uuid, order_index: int>=0}].min(1)}`
- `DELETE :id` → `['delete']`

- [ ] **Step 3: แก้ spec เดิม** — เพิ่ม provider ที่ `PermissionGuard` ต้องใช้ (คัดจาก spec ของ controller ที่ใช้ `PermissionGuard` อยู่แล้ว เช่น `config_vendor-master-certificates.controller.spec.ts`) และปรับ URL ที่คาดใน service spec ให้ตรงกับ `URLSearchParams`

- [ ] **Step 4: ตรวจ**

Run: `cd apps/backend-gateway && bun run check-types && npx jest src/application/dashboard-widgets && npx eslint --no-fix src/application/dashboard-widgets && cd ../.. && bun run boot-check && bun run db:check.endpoint-permission`
Expected: ผ่าน — ถ้า `db:check.endpoint-permission` ฟ้องว่า route-map (`dashboard.widget`) ไม่ตรงกับ `@Permission` (`dashboard.bu_widget`) **ให้หยุดรายงาน** อย่าแก้ route-map

- [ ] **Step 5: Commit**

```bash
git add apps/backend-gateway/src/application/dashboard-widgets
git commit -m "feat(gateway): BU widget กรองตาม module, จัดลำดับได้ และบังคับสิทธิ์ dashboard.bu_widget ตอนเขียน"
```

---

### Task 8: ตรวจรวมก่อนเปิด PR

- [ ] **Step 1: ชุดตรวจเดียวกับ CI** (CI ของรีโปนี้ติด billing — ต้องรันในเครื่องให้ครบ)

```bash
bun run check-types
bun run audit:api-system-permission && bun run audit:license-catalog && bun run audit:platform-permission-resource \
  && bun run audit:app-api-catalog-drift && bun run audit:guard-providers && bun run audit:rest-contract \
  && bun run audit:message-pattern-literal && bun run audit:tcp-drift
(cd apps/backend-gateway && npx jest) && (cd apps/micro-cluster && npx jest)
bun run format
```

Expected: ผ่านทั้งหมด; `audit:license-catalog` ต้อง **ไม่มี** feature ใหม่

- [ ] **Step 2: ตรวจมือบน local** (หลังรัน migration Task 1 แล้ว)

```bash
H=(-H "Authorization: Bearer $TOKEN" -H "x-app-id: $APP_ID" -H 'Content-Type: application/json')
curl -s "${H[@]}" "localhost:4000/api-system/dashboard-templates?kind=system" | jq '.data | length'     # 63
curl -s "${H[@]}" -X POST localhost:4000/api-system/dashboard-templates \
  -d '{"kind":"bu_default","module":null,"dataset_id":"nope","widget_type":"kpi"}' | jq .            # 422 unknown dataset
curl -s "${H[@]}" -X POST localhost:4000/api-system/dashboard-templates \
  -d '{"kind":"system","module":null,"dataset_id":"workflow.cn-pending-approval","widget_type":"kpi"}' | jq .   # 400 module null
curl -s "${H[@]}" localhost:4000/api-system/dashboard-templates/bu-default/version | jq .
curl -s "${H[@]}" -X POST localhost:4000/api-system/dashboard-templates/deploy/T02 \
  -d '{"mode":"skip_customized","expected_version":999}' | jq .                                       # 409
```

deploy จริงตรวจหลัง Plan 2 ขึ้นแล้ว (อยู่ใน Plan 2 Task 5)

- [ ] **Step 3: เปิด PR** (ภาษาอังกฤษ) อ้าง spec + Plan 2 — **ห้าม squash-merge** · ระบุใน PR:
  - migration platform มี `DROP TABLE` — backup UAT/prod ก่อน `deploy-gcp.yml`
  - tenant Prisma migration ไม่ถูก CI รัน — micro-data `cmd/migrate` (Plan 2) จะสร้าง DDL เดียวกันให้
  - ต้อง `db:seed.permission` + seed platform permission แล้ว assign role ก่อน deploy platform/FE (spec §8 ข้อ 3)
