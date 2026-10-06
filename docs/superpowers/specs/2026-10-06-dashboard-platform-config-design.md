# Dashboard config ย้ายไป platform + deploy ไปทุก BU — Design

วันที่: 2026-10-06 · สถานะ: รออนุมัติ spec
รีโปที่แตะ: `carmen-turborepo-backend-v2` · `micro-data` · `carmen-platform` · `carmen-inventory-frontend-react`

## 1. เป้าหมาย

ทำให้ config ของ dashboard จัดการได้จาก carmen-platform แบบเดียวกับ report template
โดยไม่ต้อง deploy backend ทุกครั้งที่อยากเพิ่ม/ลบ/เรียง widget และให้ platform
ตั้ง "ชุด default" ของ dashboard ระดับ BU แล้ว deploy ไปทุก BU ได้

### สิ่งที่ user ตัดสินแล้ว

| เรื่อง | คำตอบ |
|---|---|
| ขอบเขต | system widgets (ชั้น 2) + default ของ BU widgets (ชั้น 3) |
| ทางไหลของ default ไป BU | **copy ตอนกด Deploy** (ไม่ใช่ overlay อ่านสด) |
| deploy ซ้ำกับ BU ที่ปรับเอง | **เลือกตอน deploy** — ค่าเริ่มต้น `skip_customized`, มีโหมด `overwrite` ที่ต้องยืนยัน |
| BU widgets โผล่ที่ไหน | หน้า `/dashboard` หลัก (ส่วน "Dashboard ของ BU" เหนือ personal) **และ** ต่อท้ายหน้า module dashboard |
| แนวทาง | ตารางเดียวใน platform + ติดตามสถานะ deploy ระดับ BU (ไม่ใช่ระดับแถว) |

### นอกขอบเขต

- **นิยาม dataset (ชั้น 1)** อยู่ในโค้ด Go ของ micro-data (`service/dashboard/registry.go`) และ view `v_dash_*`
  ใน tenant เหมือนเดิม — เก็บ SQL ใน platform DB แล้วรันบน tenant = ใครแก้ config ได้ก็รัน SQL อะไรก็ได้
  (report template ก็เก็บแค่ชื่อ object ไม่ใช่ SQL)
- personal widgets — ไม่เปลี่ยนพฤติกรรม
- mobile — ไม่แตะ (ยังไม่ live, endpoint เดิมตอบรูปเดิม)
- การรวมระดับแถว (ทับเฉพาะ widget ที่ BU ไม่ได้แตะ) — YAGNI

## 2. สภาพปัจจุบัน

| ชั้น | อยู่ที่ไหน | ใครแก้ |
|---|---|---|
| 1. Dataset | `micro-data/service/dashboard/registry.go` + `micro-data/migrations/tenant` | dev (deploy micro-data) |
| 2. System widgets | `backend-gateway/src/application/dashboard-widgets/system-widgets.config.ts` (hardcode 7 module) | dev (deploy gateway) |
| 3. BU widgets | tenant `tb_dashboard_bu_widget` ผ่าน micro-data · route `/api/:bu_code/dashboard-widgets/bu` | **ไม่มี UI** — FE ไม่เรียกเลย |
| 4. Personal widgets | tenant `tb_dashboard_personal_widget` · `/api/me/dashboard-widgets` | ผู้ใช้เองที่หน้า `/dashboard` |

ข้อเท็จจริงที่มีผลต่อดีไซน์:

- report template = ตาราง `tb_report_template` ใน platform DB ที่เดียว ทุก BU อ่านสด คุมด้วย
  `allow_business_unit` / `deny_business_unit` / `is_active` — ไม่มีขั้น deploy
- platform schema ยังมี `tb_dashboard_bu_widget` / `tb_dashboard_personal_widget` ค้าง (ถูกย้ายไป tenant แล้ว) — ของตาย
- micro-data เป็นเจ้าของ DDL ตาราง dashboard ฝั่ง tenant (migration 130 `dash_widget_display`) และ mirror ลง
  `prisma-shared-schema-tenant`
- permission: ทั้ง personal และ BU widget ใช้ resource `dashboard.widget` ตัวเดียวกัน
  (`permission.route-map.ts:51` `'app:dashboard-widgets': 'dashboard.widget'`) — แยกสิทธิ์ไม่ได้
- หน้า `/dashboard` หลักขึ้น empty state เมื่อผู้ใช้ยังไม่มี personal widget

## 3. Data model

### 3.1 Platform DB (`prisma-shared-schema-platform`)

```prisma
model tb_dashboard_widget_template {
  id            String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  kind          String  @db.VarChar(20)   // 'system' | 'bu_default'
  module        String? @db.VarChar(50)   // NULL = หน้า /dashboard หลัก (ใช้ได้เฉพาะ bu_default)
  dataset_id    String  @db.VarChar(100)
  widget_type   enum_dashboard_widget_type
  title         String? @db.VarChar(255)
  order_index   Int     @default(0)
  params        Json?   @db.JsonB
  display       Json?   @db.JsonB
  allow_business_unit Json? @db.JsonB     // ใช้กับ kind='system' เท่านั้น
  deny_business_unit  Json? @db.JsonB     // ใช้กับ kind='system' เท่านั้น
  is_active     Boolean @default(true)
  // audit fields + doc_version ตามแบบตารางอื่น
  @@index([kind, module, deleted_at])
}

model tb_dashboard_bu_default_version {   // แถวเดียว
  id            Int       @id @default(1)
  version       Int       @default(0)
  updated_at    DateTime? @db.Timestamptz(6)
  updated_by_id String?   @db.Uuid
}
```

กฎ:

- `module` ต้องเป็นค่าใน `SystemWidgetModule` (7 ตัวเดิม) หรือ `NULL`; `NULL` อนุญาตเฉพาะ `kind='bu_default'` — CHECK constraint ใน migration
- allow/deny ใช้กับ `system` เท่านั้น (`bu_default` เลือก BU ตอน deploy อยู่แล้ว) — service ปฏิเสธถ้าส่งมากับ `bu_default`
- ทุกการเขียนแถว `kind='bu_default'` (create/update/delete/reorder) bump `version` ใน transaction เดียวกัน

Migration:

1. สร้างสองตาราง + seed แถวเดียวของ `tb_dashboard_bu_default_version`
2. seed `kind='system'` จาก `system-widgets.config.ts` ครบ 7 module (title / dataset_id / widget_type / order_index ตรงตัว)
3. **DROP** `tb_dashboard_bu_widget` / `tb_dashboard_personal_widget` ฝั่ง platform — ก่อนรันทุก env ต้อง `SELECT count(*)` และ backup ถ้าไม่ว่าง (ย้อนไม่ได้)

### 3.2 Tenant DB (`micro-data/migrations/tenant/131_dash_bu_widget_module` + mirror ลง `prisma-shared-schema-tenant`)

```sql
ALTER TABLE tb_dashboard_bu_widget ADD COLUMN module VARCHAR(50) NULL;
CREATE INDEX tenant_dashboard_bu_widget_module_idx ON tb_dashboard_bu_widget (module, deleted_at);

CREATE TABLE tb_dashboard_bu_widget_deploy (     -- แถวเดียวต่อ tenant (tenant = BU)
  id               INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  deployed_version INT NOT NULL,
  deployed_at      TIMESTAMPTZ,
  deployed_by_id   UUID,
  customized_at    TIMESTAMPTZ,
  customized_by_id UUID
);

-- tenant ที่มี BU widget อยู่แล้วก่อนระบบนี้ = "ปรับเอง" เพื่อให้ skip_customized ไม่ทับ
INSERT INTO tb_dashboard_bu_widget_deploy (deployed_version, customized_at)
SELECT 0, now() WHERE EXISTS (SELECT 1 FROM tb_dashboard_bu_widget WHERE deleted_at IS NULL);
```

### 3.3 สถานะ BU (คำนวณ ไม่เก็บ)

ตรวจตามลำดับ:

| เงื่อนไข | สถานะ |
|---|---|
| ไม่มีแถว deploy | `never` — ยังไม่เคย deploy |
| `customized_at IS NOT NULL` | `customized` — ปรับเอง |
| `deployed_version < version` | `outdated` — ล้าสมัย |
| อื่น ๆ | `current` — ล่าสุด |

## 4. API

### 4.1 Platform (gateway `src/platform/platform_dashboard-templates/` — วางตาม `platform_report-templates`)

| Method | Path | Permission |
|---|---|---|
| GET | `/api-system/dashboard-templates?kind=&module=` | `dashboard_template.view` |
| GET | `/api-system/dashboard-templates/:id` | `dashboard_template.view` |
| POST | `/api-system/dashboard-templates` | `dashboard_template.create` |
| PATCH | `/api-system/dashboard-templates/:id` | `dashboard_template.update` |
| DELETE | `/api-system/dashboard-templates/:id` | `dashboard_template.delete` |
| PATCH | `/api-system/dashboard-templates/reorder` — body `{ kind, module, ids[] }` | `dashboard_template.update` |
| GET | `/api-system/dashboard-templates/datasets` — catalog จาก micro-data `{ id, name, description, shape, category, unit, params[] }` | `dashboard_template.view` |
| GET | `/api-system/dashboard-templates/deploy/status` | `dashboard_template.deploy` |
| POST | `/api-system/dashboard-templates/deploy/:bu_id` | `dashboard_template.deploy` |

Validation ตอน create/update (ตอบ 422):

- `dataset_id` ต้องอยู่ใน catalog
- `widget_type` ต้องเข้ากับ `shape` ของ dataset — ใช้ตารางจับคู่เดียวกับ FE (`routes/dashboard/widget-shape.ts`);
  backend ถือสำเนาของตัวเอง (FE ไม่เปลี่ยน) — ถ้าสองฝั่งไม่ตรงกัน ผลคือ platform ปฏิเสธชนิดที่ FE วาดได้ ไม่ใช่ widget พัง
- กฎ `module` / allow-deny ตาม §3.1

`deploy/status` ตอบ:

```json
{ "version": 7,
  "bus": [{ "bu_id": "…", "code": "T02", "name": "…", "status": "outdated",
            "deployed_version": 5, "deployed_at": "…", "customized_at": null }] }
```

`deploy/:bu_id` body `{ "mode": "skip_customized" | "overwrite", "expected_version": 7 }` ตอบ
`{ "result": "deployed", "count": 9 }` หรือ `{ "result": "skipped" }`

### 4.2 micro-data (internal, ผ่าน `x-internal-token`)

- `GET /internal/dashboard/datasets` — catalog จาก `ENTRIES` + `Params(id)` ไม่ผูก tenant
- `GET /internal/dashboard/bu-widgets/deploy-state?bu_code=` — แถว deploy ของ tenant (หรือ null)
- `POST /internal/dashboard/bu-widgets/deploy?bu_code=` — body `{ mode, version, widgets[], user_id }`

### 4.3 BU (ของเดิม + เพิ่ม)

| Method | Path | Permission |
|---|---|---|
| GET | `/api/:bu_code/dashboard-widgets/bu?module=` (`main` = NULL, ไม่ส่ง = ทั้งหมด) | `dashboard.widget.view` |
| POST / PATCH / DELETE | `/api/:bu_code/dashboard-widgets/bu[/:id]` | **`dashboard.bu_widget.create/update/delete`** |
| PATCH | `/api/:bu_code/dashboard-widgets/bu/reorder` (ใหม่) — body `{ module, ids[] }` | `dashboard.bu_widget.update` |
| GET | `/api/:bu_code/dashboard-widgets/:module/config` และ route แบบรวม | ไม่เปลี่ยน — เปลี่ยนแค่แหล่งข้อมูล |

- `GET …/bu` แนบ `deploy_state: { status, customized_at }` มาด้วย (ใช้กับ toast เตือนใน §6.2)
- ต้องแยก route-map ของ BU widget ออกจาก `app:dashboard-widgets` (ที่ personal ใช้) ให้ map ไป `dashboard.bu_widget`
- system widget route อ่านจากตาราง `kind='system' AND is_active` กรอง allow/deny ของ BU นั้น เรียง `order_index` —
  **รูป `items` ต้องเหมือนเดิมทุกฟิลด์** (`module, dataset_id, widget_type, title, order_index`) FE ส่วนนี้ไม่ต้องแก้
- license: route ใหม่ฝั่ง BU ผูก feature `dashboard.widget` ที่มีอยู่แล้ว — **ห้ามสร้าง feature key ใหม่**
  (`LICENSE_ENFORCEMENT` เปิดทุก env, คีย์ใหม่ = ล็อกหน้าทันที)
- **app-id allowlist**: ทุก `api_name` ใหม่ (ทั้ง `api-system/*` และ BU reorder) ต้องเติมก่อน deploy FE/platform
  ไม่งั้นผู้ใช้โดน 401 แล้วเด้งไปหน้า login

### 4.4 Cache

system widgets เคยเป็นค่าคงที่ในหน่วยความจำ — ตอนนี้อ่าน DB ทุก request จึงใส่ in-memory cache ใน gateway
(key = `kind='system'` ทั้งชุด, TTL 60 วินาที, ล้างเมื่อ instance นั้นเขียน template)
instance อื่นเห็นค่าใหม่ช้าไม่เกิน 60 วินาที — รับได้สำหรับ config

## 5. Deploy flow

1. หน้า platform โหลด `deploy/status` → ผู้ใช้ติ๊ก BU → เลือกโหมด
   (`overwrite` เด้ง dialog ให้พิมพ์ `OVERWRITE` และบอกจำนวน BU สถานะ `customized` ที่จะโดนทับ)
2. client ยิง `POST deploy/:bu_id` ทีละ BU, concurrency 3, กดหยุดกลางทางได้ (`AbortController`) —
   pattern เดียวกับ TenantSeedManagement แต่เป็น POST ธรรมดา ไม่ stream เพราะงานต่อ BU คือ transaction สั้นตัวเดียว
3. gateway อ่าน `bu_default` ที่ `is_active` + `version` → ถ้า `version != expected_version` ตอบ **409** → ส่งชุด widget ไป micro-data
4. micro-data ทำใน transaction เดียวของ tenant:
   1. lock แถว deploy (`INSERT … ON CONFLICT DO NOTHING` แถว placeholder แล้ว `SELECT … FOR UPDATE`)
   2. `mode=skip_customized` และ `customized_at IS NOT NULL` → commit, ตอบ `skipped`
   3. soft-delete BU widget ที่ยังมีชีวิตทั้งหมด (`deleted_at`, `deleted_by_id`) — soft เพื่อกู้ชุดที่ BU เคยปรับได้ถ้าทับพลาด
   4. insert ชุดใหม่ (`module`, `dataset_id`, `widget_type`, `title`, `order_index`, `params`, `display`)
   5. upsert แถว deploy `deployed_version=version, deployed_at=now(), deployed_by_id=user, customized_at=NULL, customized_by_id=NULL`
5. ทุก create/update/delete/reorder ของ BU widget จาก admin BU: lock แถว deploy เดียวกัน
   (สร้างถ้ายังไม่มี โดย `deployed_version=0`) แล้วตั้ง `customized_at=now()` ใน transaction เดียวกับการเขียน — กัน race กับ deploy

แถว placeholder ที่สร้างในข้อ 4.1 แล้วจบด้วย `skipped` เกิดไม่ได้ (ไม่มีแถว = `customized_at` เป็น NULL = ไม่ skip)
ส่วนแถวที่ข้อ 5 สร้าง (`deployed_version=0`, `customized_at` มีค่า) แสดงสถานะ `customized` ถูกต้อง

## 6. UI

### 6.1 carmen-platform — หน้า `Dashboard Templates`

เมนูข้าง Report Templates ใน `components/nav/platformNav.ts` สามแท็บ:

1. **System widgets** — เลือก module (7 ตัว) → รายการลากเรียง (title · dataset · widget type · active) → ปุ่มเพิ่ม/แก้/ลบ
   dialog: เลือก dataset จาก catalog (แสดง shape/หน่วย) → widget type (กรองตาม shape) → title →
   params (ตาม `params[]` ของ dataset) → allow/deny BU
2. **BU default** — เหมือนแท็บ 1 แต่ตัวเลือก module มี "หน้า Dashboard หลัก" เพิ่ม, ไม่มี allow/deny, หัวแท็บแสดง `version` ปัจจุบัน
3. **Deploy** — ตาราง BU (code · name · badge สถานะ · deployed version · deployed at · customized at), checkbox,
   ปุ่ม "เลือกที่ล้าสมัย" (`outdated` + `never`), ตัวเลือกโหมด, ผลรายแถว (deployed n / skipped / error + ข้อความ),
   409 = หยุดทั้งรอบ แจ้งให้โหลดสถานะใหม่

ใช้ของเดิม: ReportTemplateManagement / ReportTemplateEdit (list + edit), TenantSeedManagement (batch, หยุด, ผลรายแถว),
`hasPermission(...)` แบบ platform-scoped

### 6.2 FE (รีโปนี้)

**`/dashboard` หลัก** แบ่งสองส่วน:

- **"Dashboard ของ BU"** (บน) — `GET …/bu?module=main`; ทุกคนเห็น; ปุ่ม "แก้ไข" เฉพาะ `can(PERMISSIONS.dashboard.bu_widget.update)`;
  ใช้ `SortableWidgetItem` / `WidgetConfigDialog` ตัวเดิมโดยส่ง scope (`bu` | `personal`) เข้าไป ไม่เขียนชุดใหม่
- **"ของฉัน"** (ล่าง) — personal เหมือนเดิม
- empty state เดิมขึ้นเมื่อ **ทั้งสองส่วน** ว่าง; ถ้า BU ว่างและผู้ใช้ไม่มีสิทธิ์แก้ → ซ่อนส่วน BU ทั้งก้อน

**หน้า module dashboard** (procurement / inventory / product / vendor-management / operation-plan / config):
ต่อท้าย system widgets ด้วยส่วน "เพิ่มเติมของ BU" (`?module=<module>`) แก้ได้ด้วยสิทธิ์เดียวกัน;
system widgets แก้จาก BU ไม่ได้เหมือนเดิม

**การบันทึกครั้งแรกเมื่อ `deploy_state.status` ยังไม่ใช่ `customized`**: toast เตือนหนึ่งครั้งว่า
"การแก้ไขจะทำให้ BU นี้ไม่ได้รับ default ใหม่จาก platform อัตโนมัติ"

**การวางโค้ดตามกฎรีโป:**

- `hooks/use-bu-dashboard-widgets.ts` — ใช้ทั้ง `/dashboard` และหลาย module จึงอยู่ใน `hooks/`
- `SortableWidgetItem`, `WidgetConfigDialog` (และสิ่งที่มันพึ่ง เช่น `widget-shape.ts`, `widget-param-fields.tsx`,
  `widget-display-fields.tsx`) ย้ายจาก `routes/dashboard/` ไป `components/dashboard/` — ESLint ห้าม `routes/A` import `routes/B`
- `PERMISSIONS.dashboard.bu_widget.*` ใน `constant/` — ต้องตรงกับ key ที่ seed จริง (คีย์ผี = non-admin เข้าไม่ได้เงียบ ๆ)
- i18n `messages/{en,th}.json` ครบทั้งสองภาษา ห้ามมี `{{` `}}` ใน message (ICU พังทั้งหน้า)
- รายการ editable ต้อง memoize columns/data (กับดักเบราว์เซอร์ค้างตอนแก้)

## 7. Error handling

| กรณี | พฤติกรรม |
|---|---|
| dataset ถูกถอดจาก registry แต่ยังถูกอ้าง | widget นั้นมี `error` ในผลลัพธ์ หน้าไม่พัง; platform ขึ้น badge "dataset หาย" ที่ template |
| deploy ล้มที่ BU หนึ่ง | BU นั้น rollback ทั้งตัว ตัวอื่นไม่กระทบ; ผลรายแถวบอก error กด retry เฉพาะแถวได้ |
| `version` เปลี่ยนระหว่าง deploy | 409 → หยุดทั้งรอบ ไม่ปล่อยให้ BU ได้คนละเวอร์ชัน |
| ตาราง system ว่าง (migration ยังไม่รัน/seed หาย) | ตอบ items ว่าง + log warn; หน้า module ขึ้น empty state ไม่ 500 |
| micro-data ล่ม | deploy ตอบ 502 ต่อ BU นั้น; การแสดงผลใช้ degrade เดิม |
| validation template ไม่ผ่าน | 422 พร้อมระบุฟิลด์ |

## 8. Rollout (ห้ามสลับลำดับ ทำทีละ env: dev → UAT → prod)

1. **backend-v2** — migration platform (ตาราง + seed system + DROP ตารางค้าง **หลัง backup**), seed permission
   `dashboard.bu_widget.*` + `dashboard_template.*`, route-map แยก, gateway อ่าน system จาก DB, route platform/BU ใหม่,
   **app-id allowlist**
2. **micro-data** — tenant migration 131 + endpoint internal + ตั้ง `customized_at` ตอนเขียน;
   รัน `cmd/migrate` ให้ครบทุก tenant ก่อนข้อ 3
3. **assign role** — `dashboard.bu_widget.*` ให้ role admin ของทุก BU, `dashboard_template.*` ให้ role platform ที่เกี่ยวข้อง
4. **carmen-platform** — deploy หน้า Dashboard Templates → ตั้ง BU default ชุดแรก → deploy โหมด `skip_customized` ทุก BU
5. **FE** — `vercel --prod`

ข้อ 1 เปลี่ยนแหล่งข้อมูล แต่ผลที่ผู้ใช้เห็นต้องเหมือนเดิมทุกฟิลด์ (seed มาจากไฟล์เดิม) จึงขึ้นก่อนได้อย่างปลอดภัย

ข้อ 1 กับข้อ 2 ไม่พึ่งกันตอน deploy: route deploy ของข้อ 1 ยังไม่มีใครเรียกจนกว่าข้อ 4 จะขึ้น

**Rollback:** gateway ย้อนกลับไปอ่าน `system-widgets.config.ts` ได้ด้วยการ revert (ไฟล์อยู่ใน git history ไม่ใช่ fallback ใน runtime);
ตารางใหม่ค้างไว้ไม่เป็นอันตราย; การ DROP ตารางค้างใน platform ย้อนไม่ได้ — backup เป็นข้อบังคับ

หมายเหตุ: CI ของ backend-v2 ติด billing — deploy dev อาจต้อง SSH ให้ user รันเอง

## 9. การตรวจ

ตาม preference ของ user: **ไม่เขียนเทสต์ใหม่** ระหว่างทำตามแผน แต่

- typecheck + lint ทุกรีโป (`bunx tsc --noEmit`, `bun run lint`, `go vet`)
- เทสต์เดิมต้องเขียว — ต้องปรับให้ตรงแหล่งข้อมูลใหม่: `system-widgets.controller.spec.ts`,
  `dashboard-bu-widgets.controller.spec.ts`, `dashboard-bu-widgets.service.spec.ts`,
  `micro-data/service/dashboard/registry_test.go`, `hooks/__tests__/use-dashboard-widgets.test.ts`,
  `routes/dashboard/use-my-dashboard-widgets.test.ts` (backend ใช้ jest ห้าม `bun test`)

ตรวจมือบน dev:

1. curl `/api/T02/dashboard-widgets/<module>/config` ทั้ง 7 module ก่อน/หลังข้อ 1 ของ rollout → JSON ต้องตรงกัน
2. ตั้ง BU default → deploy `skip_customized` ไป BU ทดสอบสองตัว (ตัวหนึ่ง customized) → ได้ deployed / skipped
3. deploy `overwrite` → ตัวที่ customized ถูกทับ, แถวเดิมถูก soft-delete
4. แก้ default ระหว่าง deploy → 409
5. เปิด `/dashboard` และหน้า module ด้วย user ที่มีและไม่มี `dashboard.bu_widget.update` → ปุ่มแก้ขึ้น/ไม่ขึ้น, toast เตือนครั้งแรก
6. ตั้ง allow/deny ของ system widget → BU ที่ถูก deny ไม่เห็นภายใน 60 วินาที

## 10. ความเสี่ยงที่ยอมรับ

- overwrite ทับทั้งชุด ไม่มีการรวมระดับแถว — กู้ได้จาก soft-delete ด้วยมือ ยังไม่มี UI กู้
- cache 60 วินาทีต่อ instance — การแก้ system widget ไม่ขึ้นทันทีทุก instance
- BU ที่ข้ามไป (`customized`) จะค้างเวอร์ชันเก่าจนกว่า platform จะ overwrite — ไม่มีปุ่ม "รีเซ็ตเป็น default" ฝั่ง BU ในรอบนี้
- ตารางจับคู่ shape ↔ widget type มีสองสำเนา (backend validation + FE) — ต้องแก้คู่กันเมื่อเพิ่ม widget type
