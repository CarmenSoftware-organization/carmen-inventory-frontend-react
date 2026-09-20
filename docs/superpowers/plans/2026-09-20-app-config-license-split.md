# แยก license ของ App Config เป็นสามชิ้น — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** แยกสิทธิ์ของหน้า Interface / Email Profile / Email Template ออกจาก
`configuration.app_config` ที่ผูกรวมกันอยู่ ให้ขายแยกชิ้นได้ โดยไม่ย้ายที่เก็บข้อมูล
และไม่ทำให้ dialog ส่งอีเมลของ PO/RFP พัง

**Architecture:** เพิ่มแมป `LICENSE_ROUTE_OVERRIDES` ที่ generator ของ license catalog
อ่านคนเดียว เพื่อให้ `/app-config/<key>` แตกเป็นสาม feature ฝั่ง license โดย RBAC ยังเห็น
`configuration.app_config` ก้อนเดียวเหมือนเดิม · เพิ่ม lookup สองเส้นที่คืน projection
ไร้ความลับให้ dialog ส่งอีเมลใช้ · ฝั่ง FE แก้ `module-list.ts` สามบรรทัด เลิกพึ่ง list
endpoint ในหน้า Interface และเปลี่ยน dialog ไปใช้ lookup

**Tech Stack:** NestJS + Prisma (gateway), bun, Vite + React Router 7 + TanStack Query (FE)

**Spec:** `docs/superpowers/specs/2026-09-20-app-config-license-split-design.md`
(อยู่ในรีโป `carmen-inventory-frontend-react` — อ่านควบกับแผนนี้เสมอ)

## Global Constraints

- **ไม่เขียนไฟล์เทสต์ใหม่** ตามกติกาการทำงานของเจ้าของรีโป — ข้ามขั้น "เขียนเทสต์ให้แดงก่อน"
  ทุกขั้นในทุก task · เทสต์ชุดที่มีอยู่และด่าน drift ต้องเขียว 100% ก่อน commit
  (subagent ที่รับ task ไปทำ **ต้องถูกบอกข้อนี้ตรง ๆ** มันไม่ได้สืบทอดมาเอง)
- **static check ไม่ใช่เทสต์ — ยังต้องรัน** ทุก task · **คำสั่งต่างกันตามรีโป**:
  - BE: `bunx tsc --noEmit -p apps/backend-gateway/tsconfig.json` (รันที่รากได้ ~16k error
    ของเดิมที่ไม่เกี่ยวกับงานนี้) **baseline = 1 error** (TS6059 ที่ `verify-swagger.spec.ts`)
  - FE: `bunx tsc --noEmit` + `bun run lint`
- **baseline ของด่านตรวจฝั่ง BE ไม่ใช่ศูนย์** — เทียบกับค่าพวกนี้ ไม่ใช่กับ exit 0:
  - `check.endpoint-permission-coverage.ts` exit 1 อยู่แล้ว · เกณฑ์ผ่าน = `MISSING_PERMISSION = 0`
    และ `UNMAPPED_SEGMENT` ยังเป็น 5 ตัวเดิม (app:periods, app:product-locations,
    config:app-user-config, config:products-location-workflow, config:users)
  - `bun test apps/backend-gateway/src/license` แดง 3 เทสต์อยู่แล้วจาก `jest.isolateModules`
    ที่ bun ไม่ implement · เกณฑ์ผ่าน = ไม่เพิ่มจาก 3
  - `check.license-catalog-drift.ts` **ต้อง exit 0 จริง**
- `turbo run build` ของ gateway ใช้ SWC ที่ strip type ทิ้ง **ไม่ใช่ด่าน type** ต้องรัน
  `bunx tsc --noEmit` เอง
- ห้าม commit secret หรือ credential — token/DSN ต้องมาจากตัวแปร shell เสมอ
- **`Result` ของ `@repo/nest-result` ใช้ `isOk()` / `isError()` / `.value` / `.error`**
  — **ไม่มี `.ok` และไม่มี `.data`** (ยืนยันที่ `packages/nest-result/src/result.ts:45,58,208,217`)
  โค้ดตัวอย่างในแผนรอบแรกเขียนผิดเป็น `.ok`/`.data` แก้แล้วทั้ง Task 2 และ Task 3
- รีโป `carmen-turborepo-backend-v2` มี formatter hook ที่จัด prettier ทับไฟล์หลังทุก edit
  และไฟล์บน `main` ไม่ compliant อยู่แล้ว — ต้องคืนไฟล์ที่ไม่ได้ตั้งใจแก้กลับก่อน commit
  ทุกครั้ง (`git checkout -- <path>`) ไม่งั้น PR จะมี churn หลายร้อยบรรทัด
- ห้าม squash-merge รีโป FE (changelog รอบถัดไปจะว่างเปล่าเงียบ ๆ) ใช้ `gh pr merge --merge`
- branch ของงานนี้: `feature/app-config-license-split` ทั้งสองรีโป
- ไฟล์ `license-catalog.generated.ts` และ `seed.license-feature.data.ts` เป็น **generated**
  ห้ามแก้ด้วยมือเด็ดขาด — แก้ต้นทางแล้วรัน generator
- คีย์ interface ทั้ง 8 ต้องตรงกับ `INTERFACE_CATEGORIES` ใน
  `routes/system-admin/interface/interface-registry.ts` เป๊ะ:
  `interface_accounting_carmen_gl`, `interface_accounting_blueledgers`,
  `interface_accounting_external`, `interface_pos_micros`, `interface_pos_infrasys`,
  `interface_pos_square`, `interface_pms_opera`, `interface_pms_protel`

---

## โครงไฟล์

### `carmen-turborepo-backend-v2`

| ไฟล์ | หน้าที่ |
|---|---|
| `packages/prisma-shared-schema-platform/prisma/permission.route-map.ts` | **แก้** — เพิ่ม `LICENSE_ROUTE_OVERRIDES`, เพิ่มสอง segment ของ lookup ใน `ROUTE_RESOURCE_MAP`, เพิ่มสองคีย์ใหม่ใน `LICENSE_ONLY_RESOURCES` (เอา description) |
| `scripts/generate-license-catalog/run.ts` | **แก้** — ให้ `collect_resources()` และ `build_route_features()` อ่านแมปใหม่ |
| `apps/backend-gateway/src/license/license-catalog.generated.ts` | **generated** — regenerate |
| `packages/prisma-shared-schema-platform/prisma/seed.license-feature.data.ts` | **generated** — regenerate |
| `apps/backend-gateway/src/config/config_app-config/config_app-config.service.ts` | **แก้** — `list()` กรองคีย์ที่ถูก gate ออก |
| `apps/backend-gateway/src/application/email-lookup/email-lookup.controller.ts` | **สร้าง** — สอง endpoint อ่านอย่างเดียว |
| `apps/backend-gateway/src/application/email-lookup/email-lookup.service.ts` | **สร้าง** — เรียก service เดิมแล้ว project |
| `apps/backend-gateway/src/application/email-lookup/email-lookup.module.ts` | **สร้าง** |
| `apps/backend-gateway/src/application/route-application.ts` | **แก้** — ลงทะเบียนโมดูลใหม่ |

### `carmen-inventory-frontend-react`

| ไฟล์ | หน้าที่ |
|---|---|
| `constant/module-list.ts` | **แก้** — `licenseFeature` สามบรรทัด |
| `constant/__fixtures__/license-catalog.ts` | **generated** — regenerate |
| `constant/api-endpoints.ts` · `constant/query-keys.ts` | **แก้** — เพิ่มสอง endpoint + สอง query key |
| `routes/system-admin/interface/use-interface-configs.ts` | **สร้าง** — ดึง app-config รายคีย์ของ interface ทั้ง 8 |
| `hooks/use-email-senders.ts` | **สร้าง** — รายชื่อผู้ส่งแบบไร้ความลับ |
| `hooks/use-email-messages.ts` | **สร้าง** — คลังข้อความสำหรับ dialog |
| `routes/system-admin/interface/interface-list.tsx` | **แก้** — เลิกใช้ `useAppConfigs()` |
| `routes/procurement/purchase-order/po-send-email-dialog.tsx` | **แก้** — เปลี่ยนไปใช้ hook ใหม่ |
| `routes/vendor-management/request-price-list/rfp-send-email-dialog.tsx` | **แก้** — เปลี่ยนไปใช้ hook ใหม่ |

---

## Task 1: แมป license-only + regenerate catalog (backend)

**Files:**
- Modify: `packages/prisma-shared-schema-platform/prisma/permission.route-map.ts`
- Modify: `scripts/generate-license-catalog/run.ts:82-94` (`collect_resources`), `:249-259` (`build_route_features`)
- Regenerate: `apps/backend-gateway/src/license/license-catalog.generated.ts`,
  `packages/prisma-shared-schema-platform/prisma/seed.license-feature.data.ts`

**Interfaces:**
- Consumes: ไม่มี — task แรกของสายนี้
- Produces: feature key `configuration.email_profile` และ `configuration.email_template`
  ใน catalog (state `active`) · แถว `LICENSE_ROUTE_FEATURES` สิบเอ็ดแถวที่ขึ้นต้นด้วย
  `config:app-config/` · แถว `app:email-senders` / `app:email-messages` ที่ Task 3 พึ่ง ·
  Task 4 ฝั่ง FE พึ่งสองคีย์ใหม่ผ่าน fixture

- [ ] **Step 1: เพิ่ม `LICENSE_ROUTE_OVERRIDES` ใน `permission.route-map.ts`**

วางต่อท้ายบล็อก `SUB_PATH_RESOURCE_MAP` (หลังบรรทัดที่ปิดแมปนั้น):

```ts
/**
 * แถว route ของ **license เท่านั้น** — `check.endpoint-permission-coverage.ts` ไม่อ่านแมปนี้
 *
 * กติกาเดิมคือ "license ถือแค่ resource ส่วน action เป็นหน้าที่ของ RBAC" แมปนี้เพิ่มอีกชั้น:
 * **resource ฝั่ง license แตกย่อยกว่าฝั่ง RBAC ได้** — `/config/:bu/app-config/<key>` ทุกเส้น
 * ยังเป็น `configuration.app_config` ในสายตา RBAC (permission เดิม ไม่มีใครเสียสิทธิ์) แต่ฝั่ง
 * license แยกเป็นสามใบเพื่อให้ขายแยกได้
 *
 * ถ้าเอาแถวเหล่านี้ไปใส่ `SUB_PATH_RESOURCE_MAP` แทน ด่าน coverage จะรายงาน
 * `MISSING_PERMISSION` ทันที เพราะ `configuration.email_profile` / `configuration.email_template`
 * / `interface` ไม่มี permission รองรับใน `seed.permission.data.ts` และการเพิ่ม permission
 * ตามไปลาก matrix ของ `seed.role-permission.ts` เข้ามาทั้งชุดโดยไม่มีใครขอ
 *
 * คีย์ `interface_*` ทั้งแปดต้องตรงกับ `INTERFACE_CATEGORIES` ของ FE
 * (`routes/system-admin/interface/interface-registry.ts`) — เพิ่ม brand ใหม่ที่นั่นแล้วลืมที่นี่
 * brand นั้นจะตกไปอยู่ใต้ `configuration.app_config` เงียบ ๆ
 */
export const LICENSE_ROUTE_OVERRIDES: Readonly<Record<string, string>> = {
  'config:app-config/email_profiles': 'configuration.email_profile',
  'config:app-config/email_templates': 'configuration.email_template',
  'config:app-config/test-email-profile': 'configuration.email_profile',
  'config:app-config/interface_accounting_carmen_gl': 'interface',
  'config:app-config/interface_accounting_blueledgers': 'interface',
  'config:app-config/interface_accounting_external': 'interface',
  'config:app-config/interface_pos_micros': 'interface',
  'config:app-config/interface_pos_infrasys': 'interface',
  'config:app-config/interface_pos_square': 'interface',
  'config:app-config/interface_pms_opera': 'interface',
  'config:app-config/interface_pms_protel': 'interface',
};
```

- [ ] **Step 2: เพิ่ม description ของสองคีย์ใหม่ใน `LICENSE_ONLY_RESOURCES`**

เพิ่มสองบรรทัดในแมปเดิม (ต่อจาก `configuration.chart_of_account_mapping`):

```ts
  ['configuration.email_profile', 'Sender email profiles (SMTP)'],
  ['configuration.email_template', 'Outgoing email message library'],
```

แล้วแก้ doc comment เหนือแมปจาก "ไม่มี permission/route รองรับ" เป็น
"ไม่มี **permission** รองรับ (บางตัวมี license route ผ่าน `LICENSE_ROUTE_OVERRIDES`)"
เพราะตอนนี้ทั้ง `interface.*` และสองคีย์ใหม่มี license route แล้ว

- [ ] **Step 3: เพิ่มสอง segment ของ lookup ใน `ROUTE_RESOURCE_MAP`**

ในบล็อก `// api/:bu_code/...` เรียงตามตัวอักษร:

```ts
  'app:email-messages': 'configuration.app_config',
  'app:email-senders': 'configuration.app_config',
```

เหตุผลอยู่ใน spec §4.5 — segment ที่ไม่มีในแมปจะถูกรายงานเป็น `UNMAPPED_SEGMENT`
และสคริปต์ไม่มีกลไกยกเว้น · ชี้ไป `configuration.app_config` ซึ่งทุก BU มีอยู่แล้ว
(saved view ของทุกหน้า list พึ่งมัน) จึงเปิดให้ทุก BU อ่านได้ตามเจตนา

- [ ] **Step 4: ให้ generator อ่านแมปใหม่**

ใน `scripts/generate-license-catalog/run.ts` เพิ่ม `LICENSE_ROUTE_OVERRIDES` เข้า import
จาก `permission.route-map` แล้วแก้สองฟังก์ชัน:

```ts
function collect_resources(): Set<string> {
  const out = new Set<string>();
  for (const resource of Object.values(ROUTE_RESOURCE_MAP)) out.add(resource);
  for (const resource of Object.values(SUB_RESOURCE_SEGMENTS)) out.add(resource);
  for (const rule of Object.values(SUB_PATH_RESOURCE_MAP)) {
    for (const resource of Object.values(rule.prefixes)) out.add(resource);
    out.add(rule.fallback);
  }
  // แถวเฉพาะ license — ต้องเก็บ resource ด้วย ไม่งั้นคีย์ที่ route ชี้ไปจะไม่มีแถวใน catalog
  for (const resource of Object.values(LICENSE_ROUTE_OVERRIDES)) out.add(resource);
  for (const resource of PLANNED_LICENSE_RESOURCES) out.add(resource);
  for (const resource of LICENSE_ONLY_RESOURCES.keys()) out.add(resource);
  return out;
}
```

```ts
function build_route_features(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, resource] of Object.entries(ROUTE_RESOURCE_MAP)) out[key] = resource;
  for (const [key, resource] of Object.entries(SUB_RESOURCE_SEGMENTS)) out[key] = resource;
  for (const [key, rule] of Object.entries(SUB_PATH_RESOURCE_MAP)) {
    out[key] = rule.fallback;
    for (const [prefix, resource] of Object.entries(rule.prefixes)) {
      out[`${key}/${prefix}`] = resource;
    }
  }
  // ทับท้ายสุดโดยตั้งใจ — แถวเฉพาะ license ชนะแถวที่ได้จากแมปที่ใช้ร่วมกับ permission
  for (const [key, resource] of Object.entries(LICENSE_ROUTE_OVERRIDES)) out[key] = resource;
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}
```

- [ ] **Step 5: regenerate แล้วอ่าน diff**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2
bun run generate:license-catalog
git diff --stat
```

สิ่งที่ต้องเห็นใน diff:
- `license-catalog.generated.ts` — เพิ่ม 11 แถวใน `LICENSE_ROUTE_FEATURES` ที่ขึ้นต้นด้วย
  `config:app-config/` · เพิ่มสองแถว `app:email-messages` / `app:email-senders` ·
  เพิ่มสอง feature `configuration.email_profile` / `configuration.email_template` ·
  เพิ่มสองแถวใน `LICENSE_FEATURE_ANCESTORS` (ทั้งคู่ ancestors = `["configuration"]`)
- `seed.license-feature.data.ts` — เพิ่มสองรายการ `parent_key: "configuration"`

**ถ้าเห็นคีย์เดิมหายไป (`-`) ให้หยุดทันที** — แปลว่า generator กินของเก่าไปด้วย

- [ ] **Step 6: รันด่านตรวจทั้งสองตัว**

```bash
cd packages/prisma-shared-schema-platform
bun prisma/check.license-catalog-drift.ts
bun prisma/check.endpoint-permission-coverage.ts
```

Expected: ทั้งคู่ exit 0 · ถ้า coverage แดงด้วย `MISSING_PERMISSION` ที่คีย์ใหม่
แปลว่าเผลอเอาแถวไปใส่ `SUB_PATH_RESOURCE_MAP` แทน `LICENSE_ROUTE_OVERRIDES`

- [ ] **Step 7: typecheck + เทสต์เดิม**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2
bunx tsc --noEmit
bun test apps/backend-gateway/src/license
```

Expected: tsc ไม่มี error · เทสต์ `license-route-resolver.spec.ts` และ
`license.evaluator.spec.ts` เขียว (เทสต์เดิม ไม่ต้องเพิ่ม)

- [ ] **Step 8: Commit**

```bash
git add packages/prisma-shared-schema-platform/prisma/permission.route-map.ts \
        packages/prisma-shared-schema-platform/prisma/seed.license-feature.data.ts \
        scripts/generate-license-catalog/run.ts \
        apps/backend-gateway/src/license/license-catalog.generated.ts
git status --short
git commit -m "feat(license): แยก route ของ app-config เป็นสาม feature ด้วย LICENSE_ROUTE_OVERRIDES"
```

`git status --short` ต้องไม่เหลือไฟล์ `M` ที่ไม่เกี่ยวกับ task นี้ — ถ้าเหลือ (formatter
hook ไปจัดมา) ให้คืนค่าด้วย `git checkout -- <path>` ทีละไฟล์ก่อน commit

---

## Task 2: กรองคีย์ที่ถูก gate ออกจาก list endpoint (backend)

**Files:**
- Modify: `apps/backend-gateway/src/config/config_app-config/config_app-config.service.ts:188-191`

**Interfaces:**
- Consumes: ไม่มี (อิสระจาก Task 1 — ทำขนานกันได้)
- Produces: `GET /api/config/:bu_code/app-config` ไม่คืนคีย์ `interface_*`,
  `email_profiles`, `email_templates` อีกต่อไป — Task 5 ฝั่ง FE พึ่งข้อนี้

- [ ] **Step 1: ไล่ผู้เรียก list endpoint ให้ครบก่อนแก้**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize
grep -rn "app-config" carmen-inventory-god-mode/src carmen-inventory-mobile 2>/dev/null | grep -v node_modules | head -20
grep -rn "appConfigList" carmen-turborepo-backend-v2/apps 2>/dev/null | grep -v dist | head
```

ถ้าเจอผู้เรียกที่พึ่งคีย์ทั้งสามจาก list **ให้หยุดและรายงาน** — การกรองเป็น breaking
change เงียบ ๆ สำหรับผู้เรียกเหล่านั้น

- [ ] **Step 2: ยืนยันรูป envelope ของ list กับของจริงก่อนเขียนโค้ด**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2
grep -rn "items" apps/micro-business/src/app-config/ 2>/dev/null | grep -v spec | head -5
```

FE เขียนไว้ว่า list ห่อแถวที่ `data.items` ส่วน single-key GET คืน `data` เป็นแถวตรง ๆ
(`hooks/use-app-config.ts:53-56`) — ถ้า micro คืนรูปอื่น ให้ยึดของจริงและปรับ Step 3
**ห้ามเดา** เขียนผิดแล้ว list จะคืนก้อนว่างเงียบ ๆ

- [ ] **Step 3: เพิ่มตัวกรองใน service**

แทนที่เมธอด `list` ด้วย:

```ts
  /**
   * คีย์ที่มี license feature ของตัวเองแล้ว จึงต้องไม่หลุดมากับ list ก้อนรวม
   *
   * `GET /app-config` แมปกับ `configuration.app_config` ซึ่งทุก BU มี ถ้าปล่อยให้คืนทุกคีย์
   * มันจะกลายเป็นทางอ่าน `email_profiles` / `interface_*` โดยไม่ผ่าน feature ที่เพิ่งแยกออกมา
   * ทั้งสามกลุ่มมีเส้นอ่านรายคีย์ของตัวเองแล้ว (`GET /app-config/:key`) จึงไม่มีใครเสียของ
   */
  private static isListExcluded(key: string): boolean {
    return key === 'email_profiles' || key === 'email_templates' || key.startsWith('interface_');
  }

  async list(bu_code: string, user_id: string) {
    this.logger.debug({ function: 'list', bu_code }, ConfigAppConfigService.name);
    const result = await this.call(Business.appConfigList, { bu_code, user_id });
    if (!result.ok) return result;
    const data = result.data as { items?: { key?: string }[]; count?: number } | null;
    if (!data?.items) return result;
    const items = data.items.filter(
      (row) => !ConfigAppConfigService.isListExcluded(row.key ?? ''),
    );
    return Result.ok({ ...data, items, count: items.length });
  }
```

- [ ] **Step 4: typecheck**

```bash
bunx tsc --noEmit
```

- [ ] **Step 5: ตรวจด้วย curl กับ gateway ที่รันอยู่**

ต้องมี `ACCESS_TOKEN` และ `APP_ID` ของ carmen-platform ในตัวแปร shell (ห้าม hardcode
ลงคำสั่งหรือไฟล์) — app-id ของ FE inventory ไม่อยู่ใน allowlist ของ `auth.login`

```bash
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" -H "x-app-id: $APP_ID" \
  "http://localhost:4000/api/config/T02/app-config" | jq -r '.data.items[].key' | sort
```

Expected: ไม่มี `email_profiles`, `email_templates` หรือคีย์ที่ขึ้นต้น `interface_`
แต่ยังเห็น `report_email` และ `list_views_*`

- [ ] **Step 6: Commit**

```bash
git add apps/backend-gateway/src/config/config_app-config/config_app-config.service.ts
git status --short
git commit -m "feat(app-config): ตัดคีย์ที่มี license ของตัวเองออกจาก list ก้อนรวม"
```

---

## Task 3: lookup สองเส้นสำหรับ dialog ส่งอีเมล (backend)

**Files:**
- Create: `apps/backend-gateway/src/application/email-lookup/email-lookup.service.ts`
- Create: `apps/backend-gateway/src/application/email-lookup/email-lookup.controller.ts`
- Create: `apps/backend-gateway/src/application/email-lookup/email-lookup.module.ts`
- Modify: `apps/backend-gateway/src/application/route-application.ts`
- Modify (อาจ): `apps/backend-gateway/src/config/config_app-config/config_app-config.module.ts`

**Interfaces:**
- Consumes: `ConfigAppConfigService.get(bu_code, user_id, key)` ที่มีอยู่แล้ว
  (`config_app-config.service.ts:205`) · แถว `app:email-senders` / `app:email-messages`
  จาก Task 1 Step 3
- Produces:
  - `GET /api/:bu_code/email-senders` → `{ default_profile_id: string | null,
    profiles: { id, name, enabled, from_email, from_name }[] }`
  - `GET /api/:bu_code/email-messages` → value ของ `email_templates` ตามรูปเดิม
  - Task 6 ฝั่ง FE พึ่งสองรูปนี้เป๊ะ ๆ

- [ ] **Step 1: อ่านของจริงก่อนเขียน**

เปิด `apps/backend-gateway/src/config/config_app-config/config_app-config.service.ts`
บรรทัด 133-215 แล้วจดสามอย่าง: signature ของ `get()`, วิธีที่ `call()` แปลง error เป็น
`Result`, และรูปของ `result.data` ที่ได้กลับมา (คาดว่าเป็นแถวที่มีฟิลด์ `value`)
เปิด `config_app-config.module.ts` ด้วยว่ามี `exports` หรือยัง
**โค้ดใน Step 2 เขียนตามรูปที่คาดไว้ ถ้าของจริงต่าง ให้ยึดของจริงและรายงานความต่าง**

- [ ] **Step 2: เขียน service**

```ts
import { Injectable } from '@nestjs/common';
import { BackendLogger } from 'src/common/helpers/backend.logger';
import { Result } from '@/common';
import { ConfigAppConfigService } from '@/config/config_app-config/config_app-config.service';

/** โปรไฟล์ผู้ส่งเท่าที่ dialog ส่งอีเมลต้องใช้ — ไม่มี smtp */
export interface EmailSenderDto {
  id: string;
  name: string;
  enabled: boolean;
  from_email: string;
  from_name: string;
}

/**
 * อ่านโปรไฟล์ผู้ส่งและคลังข้อความสำหรับหน้าที่ "ส่งอีเมล" (PO / RFP)
 *
 * แยกจากหน้าตั้งค่าโดยตั้งใจ: หน้าตั้งค่าอยู่ใต้ license `configuration.email_profile` /
 * `configuration.email_template` ส่วนการ **ใช้** ค่าเหล่านั้นเพื่อส่งอีเมลติดมากับโมดูลที่ส่ง
 * เส้นนี้จึงอยู่ใต้ `configuration.app_config` ซึ่งทุก BU มี
 *
 * ตัดก้อน `smtp` ทิ้งทั้งหมดก่อนส่งออก — เดิม dialog ได้ `smtp.host/port/username` ติดมาด้วย
 * (password ถูก mask เป็น `***ENCRYPTED***` แต่ที่เหลือไม่) ซึ่งไม่มีใครในหน้าส่งอีเมลต้องใช้
 *
 * เรียกผ่าน `ConfigAppConfigService.get()` ซ้ำแทนการยิง RPC เอง เพื่อให้ได้การแปลง error
 * และด่าน entitlement แบบเดียวกันฟรี
 */
@Injectable()
export class EmailLookupService {
  private readonly logger = new BackendLogger(EmailLookupService.name);

  constructor(private readonly appConfig: ConfigAppConfigService) {}

  async senders(bu_code: string, user_id: string) {
    this.logger.debug({ function: 'senders', bu_code }, EmailLookupService.name);
    const res = await this.appConfig.get(bu_code, user_id, 'email_profiles');
    if (!res.isOk()) return res;
    const value = (res.value as { value?: unknown } | null)?.value as
      | { default_profile_id?: string | null; profiles?: Record<string, unknown>[] }
      | undefined;
    const profiles: EmailSenderDto[] = (value?.profiles ?? []).map((p) => ({
      id: String(p.id ?? ''),
      name: String(p.name ?? ''),
      enabled: p.enabled === true,
      from_email: String(p.from_email ?? ''),
      from_name: String(p.from_name ?? ''),
    }));
    return Result.ok({ default_profile_id: value?.default_profile_id ?? null, profiles });
  }

  async messages(bu_code: string, user_id: string) {
    this.logger.debug({ function: 'messages', bu_code }, EmailLookupService.name);
    const res = await this.appConfig.get(bu_code, user_id, 'email_templates');
    if (!res.isOk()) return res;
    return Result.ok((res.value as { value?: unknown } | null)?.value ?? null);
  }
}
```

- [ ] **Step 3: เขียน controller**

decorator ชุดเดียวกับ `config_app-config.controller.ts:52-58` และใช้
`BaseHttpController` + `this.respond(res, result)` เหมือนกัน

```ts
@ApiTags('Application: Email')
@ApiHeaderRequiredXAppId()
@Controller('api/:bu_code')
@UseGuards(KeycloakGuard)
@ApiBearerAuth()
export class EmailLookupController extends BaseHttpController {
  private readonly logger = new BackendLogger(EmailLookupController.name);

  constructor(private readonly service: EmailLookupService) {
    super();
  }

  @Get('email-senders')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List sender email profiles without SMTP secrets',
    description:
      'Sender profiles for the send-email dialogs. SMTP settings are never returned.\n\nรายชื่อโปรไฟล์ผู้ส่งสำหรับ dialog ส่งอีเมล ไม่คืนค่า SMTP',
    operationId: 'emailLookup_senders',
  })
  @ApiParam({ name: 'bu_code', description: 'Business unit code', example: 'BU-001' })
  @ApiResponse({ status: 401, description: 'Missing or invalid Bearer token' })
  async senders(
    @Req() req: Request,
    @Res() res: Response,
    @Param('bu_code') bu_code: string,
  ): Promise<void> {
    const { user_id } = ExtractRequestHeader(req);
    this.respond(res, await this.service.senders(bu_code, user_id));
  }

  @Get('email-messages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Read the outgoing email message library',
    description:
      'Message templates used to prefill the send-email dialogs.\n\nคลังข้อความสำหรับเติมค่าตั้งต้นใน dialog ส่งอีเมล',
    operationId: 'emailLookup_messages',
  })
  @ApiParam({ name: 'bu_code', description: 'Business unit code', example: 'BU-001' })
  @ApiResponse({ status: 401, description: 'Missing or invalid Bearer token' })
  async messages(
    @Req() req: Request,
    @Res() res: Response,
    @Param('bu_code') bu_code: string,
  ): Promise<void> {
    const { user_id } = ExtractRequestHeader(req);
    this.respond(res, await this.service.messages(bu_code, user_id));
  }
}
```

- [ ] **Step 4: เขียน module แล้วลงทะเบียน**

```ts
import { Module } from '@nestjs/common';
import { EmailLookupController } from './email-lookup.controller';
import { EmailLookupService } from './email-lookup.service';
import { ConfigAppConfigModule } from '@/config/config_app-config/config_app-config.module';

/** โมดูลอ่านโปรไฟล์ผู้ส่ง/คลังข้อความอีเมลสำหรับหน้าที่ส่งอีเมล */
@Module({
  imports: [ConfigAppConfigModule],
  controllers: [EmailLookupController],
  providers: [EmailLookupService],
})
export class EmailLookupModule {}
```

ถ้า `ConfigAppConfigModule` ยังไม่มี `exports: [ConfigAppConfigService]` ให้เพิ่มเข้าไป
แล้วเพิ่ม `EmailLookupModule` ใน `apps/backend-gateway/src/application/route-application.ts`
ทั้ง import และรายการโมดูล เรียงตามตัวอักษรเหมือนแถวรอบ ๆ (ดูแบบที่
`CreditNoteReasonsModule` ทำที่บรรทัด 26 และ 135)

- [ ] **Step 5: ตรวจ allowlist ของ `api_name`**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2
grep -n "name: '\|allow_all" packages/prisma-shared-schema-platform/prisma/seed.application-api.data.ts | head -20
```

แอปที่ FE inventory ใช้ต้องเป็น `allow_all: true` (`website`) ถ้าไม่ใช่ **ต้องเติม
`api_name` ของสอง endpoint ใหม่ให้แอปนั้นก่อน deploy** ไม่งั้นผู้ใช้จะถูกเด้งออกหน้า
login ไม่ใช่แค่ฟีเจอร์ไม่ขึ้น · `mobile-app` เป็น `allow_all: false` แต่ยังไม่เรียก
สองเส้นนี้ จึงยังไม่ต้องเติม

ถ้าต้องเติม allowlist จริง ให้รัน `bun prisma/check.application-api-drift.ts` ต่อท้ายด้วย
และต้อง exit 0

- [ ] **Step 6: typecheck + ด่าน coverage**

```bash
bunx tsc --noEmit
cd packages/prisma-shared-schema-platform && bun prisma/check.endpoint-permission-coverage.ts
```

Expected: ทั้งคู่ผ่าน · endpoint ใหม่ต้องไม่โผล่ในหมวด `UNMAPPED_SEGMENT`
(ถ้าโผล่ แปลว่า Task 1 Step 3 ยังไม่อยู่ใน branch นี้)

- [ ] **Step 7: ตรวจด้วย curl**

```bash
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" -H "x-app-id: $APP_ID" \
  "http://localhost:4000/api/T02/email-senders" | jq
```

Expected: `data.profiles[]` แต่ละตัวมีแค่ 5 field และ **ไม่มี `smtp` เลย** ·
`data.default_profile_id` เป็น string หรือ null

- [ ] **Step 8: Commit**

```bash
git add apps/backend-gateway/src/application/email-lookup \
        apps/backend-gateway/src/application/route-application.ts \
        apps/backend-gateway/src/config/config_app-config/config_app-config.module.ts
git status --short
git commit -m "feat(email): เพิ่ม endpoint อ่านผู้ส่งและคลังข้อความแบบไร้ความลับ"
```

---

## Task 4: ชี้ module-list ไป feature ใหม่ (frontend)

**Files:**
- Modify: `constant/module-list.ts:666-684`
- Regenerate: `constant/__fixtures__/license-catalog.ts`

**Interfaces:**
- Consumes: catalog ที่ Task 1 ผลิต — **ต้องรัน Task 1 เสร็จและ commit ลง branch ของ
  checkout `../carmen-turborepo-backend-v2` ก่อน** (ไม่ต้อง merge เข้า main)
  `scripts/gen-license-fixture.ts:29-30` อ่านจาก working tree ของ checkout พี่น้องตรง ๆ
  หรือจาก `$BACKEND_REPO` ถ้าตั้งไว้
- Produces: เมนูสามตัวถูก gate แยกกันใน `useVisibleModules` และ RouteGuard

- [ ] **Step 1: แก้ `licenseFeature` สามบรรทัด**

```ts
      {
        name: "interface",
        path: "/system-admin/interface",
        // ย้ายจาก `configuration.app_config` (2026-09-20) — Interface ขายแยกผ่านใบ INF
        // (`tb_business_unit_interface_license`) ไม่ใช่กลุ่มของสัญญา ดู spec
        // docs/superpowers/specs/2026-09-20-app-config-license-split-design.md
        licenseFeature: "interface",
        icon: Cable,
        permission: PERMISSIONS.system_configuration.view,
      },
      {
        name: "emailProfile",
        path: "/system-admin/email-profile",
        licenseFeature: "configuration.email_profile",
        icon: Mail,
        permission: PERMISSIONS.system_configuration.view,
      },
      {
        name: "emailTemplate",
        path: "/system-admin/email-template",
        licenseFeature: "configuration.email_template",
        icon: MailOpen,
        permission: PERMISSIONS.system_configuration.view,
      },
```

- [ ] **Step 2: regenerate fixture**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-inventory-frontend-react
bun run gen:license-fixture
git diff constant/__fixtures__/license-catalog.ts
```

Expected: เพิ่มสองบรรทัด `configuration.email_profile` / `configuration.email_template`
และตัวเลข "ขนาด catalog" ใน doc comment ขยับจาก 106 เป็น 108
**ถ้ามีคีย์หายไป ให้หยุด** — แปลว่า backend ที่อ่านมายังไม่ใช่ตัวที่ merge แล้ว

- [ ] **Step 3: typecheck + lint + เทสต์เดิม**

```bash
bunx tsc --noEmit
bun run lint
bun test:run constant/module-list.license-feature.test.ts
```

Expected: เทสต์ผ่าน — ถ้าแดงแปลว่าคีย์ที่ `module-list.ts` ชี้ไปไม่มีใน catalog

- [ ] **Step 4: Commit**

```bash
git add constant/module-list.ts constant/__fixtures__/license-catalog.ts
git commit -m "feat(license): แยกเมนู interface/email-profile/email-template ออกจาก app_config"
```

---

## Task 5: หน้า Interface เลิกพึ่ง list endpoint (frontend)

**Files:**
- Create: `routes/system-admin/interface/use-interface-configs.ts`
- Modify: `routes/system-admin/interface/interface-list.tsx:6,65`

**Interfaces:**
- Consumes: Task 2 (list endpoint ไม่คืนคีย์ `interface_*` อีกแล้ว)
- Produces: `useInterfaceConfigs(): { data: AppConfig[]; isLoading: boolean;
  isError: boolean; refetch: () => void }` — รูปเดียวกับที่ `useAppConfigs()` เคยคืน
  เพื่อให้ `interfaceGroups()` ใช้ต่อได้โดยไม่ต้องแก้

> ไฟล์อยู่ข้างหน้า route ไม่ใช่ `hooks/` เพราะมีผู้ใช้หน้าเดียว และ ESLint ห้าม
> shared layer (`hooks/`) import จาก `routes/` ซึ่ง hook นี้ต้องทำเพื่ออ่าน
> `INTERFACE_CATEGORIES`

- [ ] **Step 1: เขียน hook ใหม่**

```ts
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { fetchAppConfigByKey } from "@/hooks/use-app-config";
import { ApiError } from "@/lib/api-error";
import { QUERY_KEYS } from "@/constant/query-keys";
import { CACHE_STATIC } from "@/lib/cache-config";
import type { AppConfig } from "@/types/app-config";
import { INTERFACE_CATEGORIES } from "./interface-registry";

/** config key ของทุก brand — คงที่ตลอดอายุแอป จึงคำนวณครั้งเดียวนอก component */
const CONFIG_KEYS: readonly string[] = INTERFACE_CATEGORIES.flatMap((c) =>
  c.brands.map((b) => b.configKey),
);

/**
 * อ่าน app-config ของทุก interface แบบรายคีย์
 *
 * ใช้แทน `useAppConfigs()` เพราะ list endpoint (`GET /app-config`) ผูกกับ
 * `configuration.app_config` ไม่ใช่ `interface` และตั้งแต่ 2026-09-20 มันไม่คืนคีย์
 * `interface_*` อีกแล้ว (gateway กรองออก) การยิงรายคีย์จึงเป็นทางเดียวที่เหลือ และ
 * ตรงกับ license ที่หน้านี้ถืออยู่จริง
 *
 * 404 = ยังไม่เคยตั้งค่า ไม่ใช่ข้อผิดพลาด — คืนเป็น "ไม่มีแถว" เหมือนที่ list เคยทำ
 */
export function useInterfaceConfigs() {
  const buCode = useBuCode();
  const queryClient = useQueryClient();
  const results = useQueries({
    queries: CONFIG_KEYS.map((key) => ({
      queryKey: [QUERY_KEYS.APP_CONFIGS, buCode, key],
      queryFn: async (): Promise<AppConfig | null> => {
        try {
          return await fetchAppConfigByKey(buCode!, key);
        } catch (error) {
          if (error instanceof ApiError && error.statusCode === 404) return null;
          throw error;
        }
      },
      ...CACHE_STATIC,
      enabled: !!buCode,
    })),
  });

  return {
    data: results
      .map((r) => r.data)
      .filter((row): row is AppConfig => row != null),
    isLoading: results.some((r) => r.isPending),
    isError: results.some((r) => r.isError),
    refetch: () => {
      void queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.APP_CONFIGS, buCode],
      });
    },
  };
}
```

- [ ] **Step 2: เปลี่ยนหน้า list ให้ใช้ hook ใหม่**

ใน `routes/system-admin/interface/interface-list.tsx` เปลี่ยน import บรรทัดที่ 6

```ts
import { useAppConfigs } from "@/hooks/use-app-config";
```

เป็น

```ts
import { useInterfaceConfigs } from "./use-interface-configs";
```

แล้วเปลี่ยนบรรทัดที่ 65

```ts
  const { data, isLoading, isError, refetch } = useAppConfigs();
```

เป็น

```ts
  const { data, isLoading, isError, refetch } = useInterfaceConfigs();
```

โค้ดที่เหลือไม่ต้องแตะ — `interfaceGroups(INTERFACE_CATEGORIES, data ?? [], entitlementOf)`
รับ `AppConfig[]` รูปเดิม

- [ ] **Step 3: typecheck + lint + เทสต์เดิม**

```bash
bunx tsc --noEmit
bun run lint
bun test:run routes/system-admin/interface
```

`interface-list.test.tsx` ที่มีอยู่อาจ mock `useAppConfigs` — ถ้าแดง ให้แก้ mock ให้ชี้
`useInterfaceConfigs` **ไม่ใช่เขียนเทสต์ใหม่**

- [ ] **Step 4: ตรวจในเบราว์เซอร์**

เปิด `http://localhost:3000/system-admin/interface` ด้วยบัญชีของ BU ที่มีใบ INF
(บน dev ตอนนี้คือทุก BU) แล้วยืนยันว่า:
- การ์ดของ brand ครบเหมือนก่อนแก้ และ badge enabled/disabled ตรงกับค่าจริง
- Network tab เห็นคำขอ `app-config/interface_*` รายคีย์ และ **ไม่มี** คำขอ
  `app-config` เปล่า ๆ อีก

- [ ] **Step 5: Commit**

```bash
git add routes/system-admin/interface/
git commit -m "refactor(interface): อ่าน app-config รายคีย์แทน list ก้อนรวม"
```

---

## Task 6: dialog ส่งอีเมลย้ายไปใช้ lookup (frontend)

**Files:**
- Modify: `constant/api-endpoints.ts` (เพิ่มสองบรรทัด), `constant/query-keys.ts` (เพิ่มสองคีย์)
- Create: `hooks/use-email-senders.ts`
- Create: `hooks/use-email-messages.ts`
- Modify: `routes/procurement/purchase-order/po-send-email-dialog.tsx:28-29,174-176`
- Modify: `routes/vendor-management/request-price-list/rfp-send-email-dialog.tsx:26-27,182-184`

**Interfaces:**
- Consumes: endpoint จาก Task 3 (`GET /api/:bu/email-senders`, `/email-messages`)
- Produces: `useEmailSenders(): { value: EmailSendersValue; isLoading: boolean;
  isError: boolean }` และ `useEmailMessages(): { value: EmailTemplatesValue;
  isLoading: boolean; isError: boolean }`

- [ ] **Step 1: เพิ่ม endpoint และ query key**

ใน `constant/api-endpoints.ts` ใกล้กับกลุ่ม app-config:

```ts
  EMAIL_SENDERS: (buCode: string) => `/api/proxy/api/${buCode}/email-senders`,
  EMAIL_MESSAGES: (buCode: string) => `/api/proxy/api/${buCode}/email-messages`,
```

ใน `constant/query-keys.ts` เพิ่มสองคีย์ตามรูปแบบที่ไฟล์นั้นใช้อยู่:

```ts
  EMAIL_SENDERS: "email-senders",
  EMAIL_MESSAGES: "email-messages",
```

- [ ] **Step 2: เขียน `hooks/use-email-senders.ts`**

```ts
import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { httpClient } from "@/lib/http-client";
import { ApiError } from "@/lib/api-error";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { CACHE_STATIC } from "@/lib/cache-config";

/** โปรไฟล์ผู้ส่งเท่าที่ dialog ส่งอีเมลต้องใช้ — ไม่มี smtp โดยตั้งใจ */
export interface EmailSender {
  id: string;
  name: string;
  enabled: boolean;
  from_email: string;
  from_name: string;
}

export interface EmailSendersValue {
  default_profile_id: string | null;
  profiles: EmailSender[];
}

const EMPTY: EmailSendersValue = { default_profile_id: null, profiles: [] };

/**
 * อ่านรายชื่อผู้ส่งสำหรับ dialog ส่งอีเมล (PO / RFP)
 *
 * ต่างจาก `useEmailProfiles()` ที่หน้าตั้งค่าใช้: เส้นนี้ผูกกับ `configuration.app_config`
 * ซึ่งทุก BU มี ส่วนหน้าตั้งค่าผูกกับ `configuration.email_profile` ที่ขายแยก — BU ที่ซื้อ
 * Procurement แต่ไม่ได้ซื้อ Email Profile จึงยังส่งอีเมลได้ แค่แก้โปรไฟล์ไม่ได้
 *
 * 404 = BU นี้ยังไม่เคยตั้งโปรไฟล์ ไม่ใช่ข้อผิดพลาด
 */
export function useEmailSenders() {
  const buCode = useBuCode();
  const query = useQuery<EmailSendersValue>({
    queryKey: [QUERY_KEYS.EMAIL_SENDERS, buCode],
    queryFn: async () => {
      const res = await httpClient.get(API_ENDPOINTS.EMAIL_SENDERS(buCode!));
      if (!res.ok)
        throw await ApiError.from(res, "Failed to fetch email senders");
      const json = await res.json();
      return (json.data as EmailSendersValue | null) ?? EMPTY;
    },
    ...CACHE_STATIC,
    enabled: !!buCode,
  });

  const isNotFound =
    query.error instanceof ApiError && query.error.statusCode === 404;

  return {
    value: query.data ?? EMPTY,
    isLoading: query.isPending && !isNotFound,
    isError: query.isError && !isNotFound,
  };
}
```

- [ ] **Step 3: เขียน `hooks/use-email-messages.ts`**

```ts
import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { httpClient } from "@/lib/http-client";
import { ApiError } from "@/lib/api-error";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { CACHE_STATIC } from "@/lib/cache-config";
import { parseEmailTemplatesValue } from "@/lib/email-template";

/**
 * อ่านคลังข้อความอีเมลสำหรับ dialog ส่งอีเมล (PO / RFP)
 *
 * คู่แฝดของ `useEmailSenders()` — ผูกกับ `configuration.app_config` ไม่ใช่
 * `configuration.email_template` ที่หน้าตั้งค่าใช้ ด้วยเหตุผลเดียวกัน
 *
 * ค่าที่ได้ผ่าน `parseEmailTemplatesValue` เสมอ เพราะคีย์นี้ backend รับแบบ passthrough
 * ไม่มี schema ฝั่ง server มาช่วยตรวจ · 404 = ยังไม่เคยตั้งค่า ไม่ใช่ข้อผิดพลาด
 */
export function useEmailMessages() {
  const buCode = useBuCode();
  const query = useQuery<unknown>({
    queryKey: [QUERY_KEYS.EMAIL_MESSAGES, buCode],
    queryFn: async () => {
      const res = await httpClient.get(API_ENDPOINTS.EMAIL_MESSAGES(buCode!));
      if (!res.ok)
        throw await ApiError.from(res, "Failed to fetch email messages");
      const json = await res.json();
      return json.data ?? null;
    },
    ...CACHE_STATIC,
    enabled: !!buCode,
  });

  const isNotFound =
    query.error instanceof ApiError && query.error.statusCode === 404;

  return {
    value: parseEmailTemplatesValue(query.data),
    isLoading: query.isPending && !isNotFound,
    isError: query.isError && !isNotFound,
  };
}
```

- [ ] **Step 4: เปลี่ยน PO dialog**

ใน `routes/procurement/purchase-order/po-send-email-dialog.tsx` เปลี่ยน import
บรรทัด 28-29

```ts
import { useEmailProfiles } from "@/hooks/use-email-profiles";
import { useEmailTemplates } from "@/hooks/use-email-templates";
```

เป็น

```ts
import { useEmailSenders } from "@/hooks/use-email-senders";
import { useEmailMessages } from "@/hooks/use-email-messages";
```

แล้วเปลี่ยนจุดเรียกบรรทัด 174 เป็น `useEmailSenders()` และบรรทัด 176 เป็น
`useEmailMessages()`

**สิ่งที่ต้องระวัง:** `useEmailProfiles()` คืน `testProfile` และ `save` มาด้วย ส่วน
`useEmailSenders()` ไม่มี · `EmailProfile` เดิมมี `smtp` แต่ `EmailSender` ไม่มี
ถ้า dialog อ่านฟิลด์เหล่านั้นที่ไหน `bunx tsc --noEmit` จะจับให้เอง — **ถ้าเจอ ให้หยุด
แล้วรายงาน** เพราะแปลว่า dialog ทำมากกว่าที่สเปกวางไว้

- [ ] **Step 5: เปลี่ยน RFP dialog แบบเดียวกัน**

`routes/vendor-management/request-price-list/rfp-send-email-dialog.tsx` บรรทัด 26-27
(import) และ 182, 184 (จุดเรียก) — แก้แบบเดียวกับ Step 4 ทุกประการ

- [ ] **Step 6: typecheck + lint + เทสต์เดิมทั้งชุด**

```bash
bunx tsc --noEmit
bun run lint
bun test:run
```

Expected: เขียวทั้งหมด · เทสต์เดิมของ dialog ที่ mock `useEmailProfiles` /
`useEmailTemplates` จะแดงเพราะ mock ชี้ hook เก่า — **แก้ mock ในเทสต์เดิมให้ชี้ hook
ใหม่ ไม่ใช่เขียนเทสต์ใหม่**

- [ ] **Step 7: ตรวจในเบราว์เซอร์ (ข้อสำคัญที่สุดของ task นี้)**

เปิด PO สักใบ → กดส่งอีเมล → ยืนยันว่า dropdown ผู้ส่งมีรายชื่อครบและเลือกได้
หัวเรื่อง/เนื้อความยังเติมจากคลังข้อความเหมือนเดิม
แล้วเปิด Network tab ยืนยันว่า **ไม่มีคำขอ `app-config/email_profiles` อีกแล้ว** และ
response ของ `email-senders` ไม่มีฟิลด์ `smtp`
ทำซ้ำกับ RFP ที่ `/vendor-management/request-price-list`

- [ ] **Step 8: Commit**

```bash
git add constant/api-endpoints.ts constant/query-keys.ts hooks/use-email-senders.ts \
        hooks/use-email-messages.ts routes/procurement/purchase-order/po-send-email-dialog.tsx \
        routes/vendor-management/request-price-list/rfp-send-email-dialog.tsx
git commit -m "feat(email): dialog ส่งอีเมลอ่านผู้ส่ง/ข้อความผ่าน endpoint ไร้ความลับ"
```

---

## Task 7: งานข้อมูลและลำดับ deploy (ไม่ใช่โค้ด)

**Files:** ไม่มี — เป็น checklist ปฏิบัติการ

**Interfaces:**
- Consumes: Task 1-6 merge เข้า `main` ของทั้งสองรีโปแล้ว แต่ **ยังไม่ deploy**

> ลำดับนี้สลับจากสูตรสามขั้นใน CLAUDE.md โดยตั้งใจ — เหตุผลอยู่ใน spec §5
> `LICENSE_ENFORCEMENT` เปิดอยู่จริงทุก environment ลำดับนี้จึงไม่ใช่คำแนะนำแต่เป็นข้อบังคับ

- [ ] **Step 1: seed catalog ของ environment นั้น**

```bash
cd carmen-turborepo-backend-v2/packages/prisma-shared-schema-platform
SYSTEM_DATABASE_URL="$DSN" bun run db:seed.license-feature
```

ยังไม่มีผลกับระบบที่รันอยู่ เพราะยังไม่มี route ผูกกับคีย์ใหม่ (backend ยังไม่ขึ้น)

- [ ] **Step 2: assign feature ที่ carmen-platform**

ใส่ `configuration.email_profile` และ `configuration.email_template` เข้ากลุ่มของ
สัญญาให้ **ทุก BU** ของ environment นั้น · และออกใบ INF ให้ BU ที่ควรได้ Interface

**dev ทำส่วน Interface ไปแล้ว** — ออกใบ INF ครบ 8 กลุ่มให้ทุก BU เมื่อ 2026-09-20
(79 ใบ `INF-2609-0003` ถึง `INF-2609-0081` ช่วง `2026-09-20` → `2099-12-31`)
เหลือเฉพาะสองคีย์ email · **UAT/prod ยังไม่ได้ทำทั้งสองอย่าง**

- [ ] **Step 3: ยืนยันก่อนแตะ backend**

```bash
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" -H "x-app-id: $APP_ID" \
  "$GATEWAY/api/license" | jq '.data.business_unit | to_entries[] | {bu: .key, ok: ((.value.features | index("configuration.email_profile")) != null and (.value.features | index("configuration.email_template")) != null and (.value.features | index("interface")) != null)}'
```

Expected: `ok: true` ทุก BU ที่ควรได้ · **ถ้ามีตัวไหน false ห้ามไป Step 4**
เพราะ BU นั้นจะเสียเมนูทันทีที่ backend ขึ้น

- [ ] **Step 4: deploy backend**

จุดนี้คือจุดเดียวที่พฤติกรรมเปลี่ยนจริง

- [ ] **Step 5: deploy frontend** — **ต้องตามหลัง Step 4 ให้เร็วที่สุด**

ช่วงระหว่าง Step 4 กับ Step 5 มีหน้าต่างที่หน้า `/system-admin/interface` จะแสดง badge
ของทุก brand เป็น disabled ทั้งที่ค่าจริงเป็น enabled — เพราะ backend กรอง `interface_*`
ออกจาก list แล้ว แต่ FE รุ่นเก่ายังอ่านสถานะจาก list อยู่ (`interface-list.tsx:47,55`)
เป็นเรื่องการแสดงผลล้วน ไม่มีข้อมูลเสียหายและไม่มีใครถูกตัดสิทธิ์ แต่ต้องรู้ไว้ก่อนว่า
**ถ้ามีคนเปิดหน้านั้นระหว่างสองขั้นนี้ เขาจะเห็นข้อมูลที่ผิด** — อย่าปล่อยให้คั่นข้ามคืน

- [ ] **Step 6: ตรวจหลัง deploy**

เปิดทั้งสามหน้าด้วยบัญชีของ BU ที่มีสิทธิ์ครบ แล้วเปิดใหม่ด้วย BU ที่จงใจไม่ให้
`configuration.email_template` เพื่อยืนยันว่าเมนู Email Template หายไปหน้าเดียว
โดย Interface กับ Email Profile ยังอยู่ · และเปิด dialog ส่งอีเมล PO ด้วย BU นั้น
เพื่อยืนยันว่ายังส่งได้

---

## บันทึกที่ต้องบอก subagent ทุกตัว

1. **ข้ามขั้นเทสต์** — ไม่เขียน `*.test.ts` / `*.spec.ts` ใหม่ ไม่ทำ TDD แต่ต้องรัน
   typecheck, lint และเทสต์ชุดเดิมให้เขียวก่อน commit
2. **ไฟล์ generated ห้ามแก้มือ** — `license-catalog.generated.ts`,
   `seed.license-feature.data.ts`, `constant/__fixtures__/license-catalog.ts`
3. **รีโป backend มี formatter hook** ที่จัด prettier ทับไฟล์ที่ไม่ได้ตั้งใจแก้ —
   ตรวจ `git status --short` แล้วคืนไฟล์นอกขอบเขตก่อน commit ทุกครั้ง
4. **ถ้าโค้ดจริงไม่ตรงกับที่แผนเขียนไว้** (signature, รูป envelope, ชื่อ export,
   เลขบรรทัด) ให้ยึดของจริงและรายงานความต่าง **ห้ามเดาแล้วเขียนต่อ**
5. **`:4000` ชี้ DB dev ที่ใช้ร่วมกัน** — ทุก task ในแผนนี้อ่านอย่างเดียว ยกเว้น Task 7
   ที่เป็นงานปฏิบัติการ ถ้าจำเป็นต้องเขียนต้องจดค่าเดิมและคืนทันที
