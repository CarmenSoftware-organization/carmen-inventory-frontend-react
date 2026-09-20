# แยก license ของ App Config เป็นสามชิ้น (Interface / Email Profile / Email Template)

วันที่ 2026-09-20 · รีโปที่เกี่ยวข้อง: `carmen-inventory-frontend-react`,
`carmen-turborepo-backend-v2`, `carmen-platform` (งานข้อมูล ไม่ใช่โค้ด)

## 1. ปัญหา

หน้า `/system-admin/interface`, `/system-admin/email-profile` และ
`/system-admin/email-template` ผูกกับ license feature เดียวกันคือ
`configuration.app_config` (`constant/module-list.ts:668,675,682`) การให้สิทธิ์
App Config แก่ BU หนึ่งจึงเปิดทั้งสามหน้าพร้อมกัน แยกขายไม่ได้

การผูกแบบนี้ไม่ได้เกิดจากความเลินเล่อ — ทั้งสามหน้าอ่าน/เขียน resource เดียวกันจริง
(`/api/config/{bu}/app-config`, `constant/api-endpoints.ts:42-48`) ซึ่ง gateway
map ไว้เป็น `'config:app-config': 'configuration.app_config'` ตัวบังคับจริงคือ
`LicenseInterceptor` จึงเปิด/ปิดทั้งสามหน้าพร้อมกันไม่ว่า FE จะเขียนอะไร

ซ้ำร้าย `configuration.app_config` เป็นฟีเจอร์ที่ **ทุก BU ต้องมีอยู่แล้ว** เพราะ
saved view ของทุกหน้า list เก็บเป็น app-config key `list_views_<pageKey>`
(`hooks/use-list-views.ts:57,77`) การใช้คีย์นี้ gate เมนูจึงแทบไม่มีผลในทางปฏิบัติ

## 2. ข้อค้นพบที่เปลี่ยนรูปงาน

### 2.1 Interface มี track license ของตัวเองอยู่แล้ว

สเปก 2026-09-09 ของ backend ย้ายกลุ่ม interface ออกจากใบสัญญาปกติ ไปเป็น
**ใบสิทธิ์ INF** (`tb_business_unit_interface_license`) migration ขึ้น `main`
ครบแล้วทั้งสามตัว (`20260910000000`, `20260910010000`, `20260910020000`) และ
`license.service.ts:176-262` อ่านใบ INF มา union เข้ากับ features ของสัญญาแล้ว

ผลคือ `interface.*` เดินทางมาถึง `features[]` ของ FE ได้อยู่แล้ววันนี้ โดยมี
**สองด่าน**: ใบ INF ต้องครอบ `now` **และ** สัญญาหลักของ BU ต้องเป็น `active`

งานส่วน Interface จึงไม่ต้องเพิ่ม catalog หรือ seed อะไรเลย เหลือแค่ route map
กับ `module-list.ts`

### 2.2 resolver รองรับคีย์สองชั้นอยู่แล้ว

`license-route-resolver.ts:80-83` ลอง `config:app-config/<sub>` ก่อน แล้วค่อยถอย
มา `config:app-config` — **ไม่ต้องแก้ resolver** แค่เติมแถวใน route map

### 2.3 คลังโปรไฟล์/ข้อความอีเมลถูกอ่านข้ามโมดูล

`po-send-email-dialog.tsx:174,176` และ `rfp-send-email-dialog.tsx:182,184`
เรียก `useEmailProfiles()` + `useEmailTemplates()` ทั้งคู่ ถ้า gate คีย์เหล่านี้
ตรง ๆ BU ที่ซื้อ Procurement แต่ไม่ได้ซื้อ Email Profile จะส่งอีเมล PO ไม่ได้

## 3. ขอบเขต

**ทำ**
- แยกสิทธิ์ของสามหน้าออกจากกัน โดยไม่ย้ายที่เก็บข้อมูล
- เปิดทางให้ dialog ส่งอีเมลของ PO/RFP อ่านข้อมูลที่จำเป็นได้โดยไม่ต้องมี license
  ของหน้าตั้งค่า
- ปิดช่องอ่านข้าม feature ผ่าน list endpoint

**ไม่ทำ (จงใจ)**
- ไม่ย้าย `email_profiles` / `email_templates` / `interface_*` ออกจาก
  `tb_app_config` ไปเป็นตารางของตัวเอง — แยกสิทธิ์ตัดสินจาก URL ล้วน ๆ ไม่เกี่ยว
  กับที่เก็บ การย้ายตารางจะลาก migration ข้อมูลและการ re-encrypt รหัสผ่าน SMTP
  เข้ามาโดยไม่ได้อะไรเพิ่มสำหรับโจทย์นี้ (ถ้าวันหลังอยากได้ per-row concurrency
  แทน last-write-wins ค่อยทำเป็นงานแยก)
- ไม่ gate ราย brand (`interface.pos.micros` ฯลฯ) แม้ catalog จะมีคีย์ครบ 11 ตัว —
  ตัดสินใจขายเป็นชิ้นเดียวชื่อ Interface ก่อน เปลี่ยนภายหลังได้ด้วยการแก้ route map
  อย่างเดียว
- ไม่เพิ่มแนวคิด "route feature ที่บังคับเฉพาะการเขียน" ที่ gateway

## 4. การออกแบบ

### 4.1 คีย์ license สามตัว

| หน้า | feature key | ที่มา |
|---|---|---|
| `/system-admin/interface` | `interface` | มีอยู่แล้วใน catalog · มาทางใบ INF |
| `/system-admin/email-profile` | `configuration.email_profile` | **ใหม่** |
| `/system-admin/email-template` | `configuration.email_template` | **ใหม่** |

เส้นแบ่งของงานนี้คือ **"สิทธิ์ตั้งค่า" ≠ "สิทธิ์ใช้ค่านั้น"** — ตั้งค่าโปรไฟล์ผู้ส่ง
ผูกกับ license ใหม่ ส่วนการอ่านรายชื่อผู้ส่งเพื่อส่ง PO ติดมากับ Procurement

### 4.2 route map — ผ่าน `LICENSE_ROUTE_OVERRIDES` (แมปใหม่ เฉพาะ license)

`packages/prisma-shared-schema-platform/prisma/permission.route-map.ts` เป็นต้นทาง
ของ **ทั้งสองระบบ**: `scripts/generate-license-catalog/run.ts` ผลิต
`LICENSE_ROUTE_FEATURES` จากมัน และ `check.endpoint-permission-coverage.ts` ก็อ่าน
มันเพื่อจับคู่ endpoint กับ permission

ถ้าใส่ 11 แถวลง `SUB_PATH_RESOURCE_MAP` (กลไกเดิมของ `config:workflows`) ด่าน
coverage จะรายงาน `MISSING_PERMISSION` ทันที เพราะ `configuration.email_profile`,
`configuration.email_template` และ `interface` ไม่มี permission รองรับใน
`seed.permission.data.ts` ทางแก้แบบ "เพิ่ม permission ตามไปด้วย" ลาก matrix ของ
`seed.role-permission.ts` เข้ามาทั้งชุด และเสี่ยงให้ผู้ใช้เสียสิทธิ์ที่เคยมี ทั้งที่
โจทย์นี้ไม่ได้ขอแยก permission เลย

จึงเพิ่มแมปใหม่ `LICENSE_ROUTE_OVERRIDES` ที่ **generator อ่านคนเดียว**:

```ts
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

แนวคิดที่แมปนี้เพิ่มเข้ามาคือ **license แบ่งละเอียดกว่า permission ได้** ซึ่งเป็น
ส่วนขยายตรงไปตรงมาของกติกาเดิมที่เขียนไว้แล้วว่า "license ถือแค่ resource ส่วน
action เป็นหน้าที่ของ RBAC" — ที่นี่เพิ่มว่า resource ฝั่ง license แตกย่อยกว่าฝั่ง
RBAC ได้ โดย RBAC ยังเห็น `configuration.app_config` ก้อนเดียวเหมือนเดิม

generator ต้องอ่านแมปนี้สองที่: `collect_resources()` (เพื่อให้สองคีย์ใหม่เกิดใน
catalog) และ `build_route_features()` (เพื่อให้แถวโผล่ใน `LICENSE_ROUTE_FEATURES`)
`resolveRouteFeature()` ไม่ต้องแก้ — มันลองคีย์สองชั้นอยู่แล้ว

`config:app-config -> configuration.app_config` ยังอยู่ใน `ROUTE_RESOURCE_MAP`
ตามเดิม ครอบ `list_views_*`, `report_email`, `test-email`, `signature-candidates`

รายการ 8 คีย์ interface ต้องตรงกับ `INTERFACE_CATEGORIES` ใน
`routes/system-admin/interface/interface-registry.ts` เสมอ — เพิ่ม brand ใหม่
เมื่อไหร่ต้องเพิ่มแถวที่นี่ด้วย ไม่งั้น brand ใหม่จะตกไปอยู่ใต้
`configuration.app_config` เงียบ ๆ

### 4.3 ปิดช่องอ่านข้าม feature ที่ list endpoint

`GET /api/config/{bu}/app-config` (ไม่มี sub) คืน **ทุกคีย์** ในก้อนเดียว จึงเป็น
ทางอ่านคีย์ที่เพิ่งถูก gate โดยไม่ผ่านการตรวจ

แก้ด้วยการให้ service ตัด `interface_*`, `email_profiles`, `email_templates`
ออกจาก response ของ list — ทั้งสามมีเส้นอ่านรายคีย์ของตัวเองแล้ว ไม่ต้องให้
service ไปเรียก license ของ BU มาคำนวณ (ทางเลือกนั้นทำให้ผลลัพธ์ของ list
ขึ้นกับผู้เรียก ซึ่ง cache ยาก)

ก่อนลงมือต้องไล่ผู้เรียก list endpoint ให้ครบก่อน (god-mode / mobile / bruno)
ว่าไม่มีใครพึ่งคีย์ทั้งสามจาก list

### 4.4 catalog สองคีย์ใหม่

`packages/prisma-shared-schema-platform/prisma/seed.license-feature.data.ts`
เพิ่มสองรายการ `parent_key: "configuration"` แล้ว
`bun run generate:license-catalog` เพื่อ regenerate
`apps/backend-gateway/src/license/license-catalog.generated.ts`

`interface` ไม่ต้องเพิ่ม — 11 คีย์มีครบตั้งแต่เฟส 3

### 4.5 lookup สองเส้นสำหรับ dialog ส่งอีเมล

| เส้น | คืนอะไร | license |
|---|---|---|
| `GET /api/{bu}/email-senders` | `default_profile_id` + `{id, name, from_email, from_name, enabled}` ต่อโปรไฟล์ — **ตัดก้อน `smtp` ทิ้งทั้งหมด** | `configuration.app_config` |
| `GET /api/{bu}/email-messages` | `email_templates` ตามรูปเดิม (ไม่มีความลับอยู่ในคีย์นี้) | `configuration.app_config` |

ทั้งสองเส้นใส่ใน `ROUTE_RESOURCE_MAP` ชี้ไป `configuration.app_config` ไม่ใช่ปล่อย
ให้หลุดนอก route map — segment ที่ไม่มีใน map จะถูก `check.endpoint-permission-coverage.ts`
รายงานเป็น `UNMAPPED_SEGMENT` และไม่มีกลไกยกเว้นในสคริปต์นั้น · ผลลัพธ์เหมือนกันใน
ทางปฏิบัติเพราะ `configuration.app_config` เป็นคีย์ที่ทุก BU มีอยู่แล้ว (saved view
ของทุกหน้า list พึ่งมัน) และซื่อตรงกว่าในเชิงความหมาย: "อ่านค่าจาก app-config"

ได้ความปลอดภัยแถมมาด้วย: วันนี้ dialog ได้ `smtp.host/port/username` ติดมาด้วย
(password ถูก mask เป็น `***ENCRYPTED***` แต่ที่เหลือไม่ได้ mask) เส้นใหม่ปิดช่องนั้น

สองเส้นนี้อยู่นอกขอบเขต license แต่ **ไม่ได้อยู่นอกขอบเขต permission** — ยังต้อง
ผ่าน guard ปกติด้วย permission ที่หน้าส่งอีเมลใช้อยู่แล้ว (`procurement.purchase_order.*`
/ `vendor_management.request_price_list.*`) ไม่ใช่เปิดให้ทุกคนที่ล็อกอิน

ก่อน deploy ต้องตรวจ allowlist `api_name` ของ app-id ที่ FE ใช้
(`seed.application-api.data.ts`) — แอปที่ `allow_all: true` ไม่ต้องเติม แต่
`mobile-app` เป็น `allow_all: false` ถ้าวันหลังต้องเรียกต้องเติมก่อน มิฉะนั้น
ผู้ใช้จะถูกเด้งออกหน้า login ไม่ใช่แค่ฟีเจอร์ไม่ขึ้น

### 4.6 Frontend

1. `constant/module-list.ts` — แก้ `licenseFeature` สามบรรทัด
2. `bun run gen:license-fixture` เพื่อ sync
   `constant/__fixtures__/license-catalog.ts` (ต้องทำ **หลัง** backend regenerate
   catalog แล้ว) `constant/module-list.license-feature.test.ts` จะแดงถ้าคีย์ไม่มีจริง
3. `routes/system-admin/interface/interface-list.tsx:65` เลิกใช้ `useAppConfigs()`
   เปลี่ยนเป็น `useQueries` รายคีย์จาก `INTERFACE_CATEGORIES` (8 คีย์ ครบอยู่ใน
   registry แล้ว) — เพราะ list endpoint ผูกกับ `configuration.app_config` ไม่ใช่
   `interface` และหลังข้อ 4.3 มันจะไม่คืนคีย์ interface อีกต่อไป
4. hook ใหม่ `hooks/use-email-senders.ts` และ `hooks/use-email-messages.ts`
   (อยู่ `hooks/` เพราะใช้ข้ามโมดูล ตามกติกาใน CLAUDE.md) แล้วให้
   `po-send-email-dialog.tsx` กับ `rfp-send-email-dialog.tsx` เปลี่ยนมาใช้
5. `hooks/use-email-profiles.ts` และ `hooks/use-email-templates.ts` เหลือไว้ให้
   หน้า admin ใช้ทางเดียว

## 5. ลำดับ deploy — สลับจากสูตรปกติ

สูตรสามขั้นใน CLAUDE.md (deploy BE → seed → assign → deploy FE) **ใช้กับงานนี้
ตรง ๆ ไม่ได้** เพราะ route map มีผลทันทีที่ backend ขึ้น ช่วงที่ยังไม่ assign จะมี
หน้าต่างที่ FE รุ่นเก่ายิง `/app-config/email_profiles` แล้วได้ 403 ที่ dialog ส่ง PO
ของทุก BU

ลำดับที่ไม่มีหน้าต่างเสี่ยง:

1. `db:seed.license-feature` ของ env นั้น (เพิ่มสองคีย์ใหม่เข้า catalog) — ทำได้
   ทันที ไม่มีผลอะไรเพราะยังไม่มี route ผูกกับคีย์
2. carmen-platform: ใส่ `configuration.email_profile` + `configuration.email_template`
   เข้ากลุ่มของสัญญาให้ **ทุก BU** และออกใบ INF ให้ BU ที่ควรได้ Interface
3. ตรวจผ่าน `/api/license` ว่า `features[]` ของทุก BU มีคีย์ใหม่ครบ
4. deploy backend (route map + list filter + lookup สองเส้น)
5. deploy frontend

ขั้น 1–3 ไม่เปลี่ยนพฤติกรรมของระบบที่รันอยู่เลย ย้อนกลับได้ทุกเมื่อ · จุดที่
เปลี่ยนจริงคือขั้น 4

## 6. สถานะบน dev ณ วันเขียน

วัดจาก `SYSTEM_DATABASE_URL` ของ dev เมื่อ 2026-09-20:

- BU ที่ไม่ถูกลบ 10 ราย · 9 รายมีสัญญา `active` และถือ `configuration.app_config`
  (`DUMMY` ไม่มีสัญญา) → วันนี้ทุกคนเห็นครบทั้งสามเมนู
- กลุ่ม `kind='interface'` มี 8 กลุ่ม และ **ทุกกลุ่มบรรจุบรรพบุรุษครบ**
  (เช่น `interface`, `interface.pos`, `interface.pos.micros`) จึงผูกเมนูกับคีย์
  `interface` ได้จริง
- **ใบ INF เดิมมี 2 ใบ เป็นของ `T02` ทั้งคู่** (กลุ่ม Carmen GL ซ้ำกัน) ถ้าไม่ออก
  ใบเพิ่ม เมนู Interface จะเหลือเห็นแค่ T02
- **ดำเนินการแล้ว**: ออกใบ INF ครบ 8 กลุ่มให้ทุก BU บน dev (79 ใบใหม่
  `INF-2609-0003` ถึง `INF-2609-0081`, `2026-09-20` → `2099-12-31`) ยืนยันแล้วว่า
  ทั้ง 10 BU ได้ root `interface` + ครบ 8 brand · ขั้นที่ 2 ของลำดับ deploy จึง
  เหลือเฉพาะส่วน email สำหรับ dev
- ยังไม่ได้ทำกับ UAT/prod — ต้องเดินลำดับข้อ 5 ทั้งชุดต่อ env

## 7. การตรวจ

ไม่สร้างไฟล์เทสต์ใหม่ (ตามกติกาการทำงานของเจ้าของรีโป) แต่ด่านที่มีอยู่ต้องเขียว
ทั้งหมด:

- `bunx tsc --noEmit` ทั้งสองรีโป (`turbo run build` ของ gateway ใช้ SWC ที่ strip
  type ทิ้ง ไม่ใช่ด่าน type)
- `packages/prisma-shared-schema-platform/prisma/check.license-catalog-drift.ts`
- FE: `bun run gen:license-fixture && git diff --exit-code`
- FE: `constant/module-list.license-feature.test.ts`, `bun test:run`
- `check.application-api-drift.ts` ถ้ามีการเติม allowlist

ตรวจด้วยมือในเบราว์เซอร์: สลับ `LICENSE_ENFORCEMENT` ใน `public/config.local.json`
เป็น `false` แล้วคืนเป็น `true` เพื่อเทียบว่าเมนูหาย/โผล่ตามที่ตั้งใจ และเปิด
dialog ส่งอีเมลของ PO กับ RFP ด้วยบัญชีของ BU ที่ **ไม่มี**
`configuration.email_profile` เพื่อยืนยันว่ายังเลือกผู้ส่งได้

## 8. ความเสี่ยงที่รู้ตัว

- **ผูกคีย์ใหม่ = ล็อกหน้าทันทีที่ deploy** `LICENSE_ENFORCEMENT` เปิดอยู่จริงทุก
  environment แล้ว ไม่ใช่ shadow mode ลำดับในข้อ 5 จึงไม่ใช่คำแนะนำแต่เป็นข้อบังคับ
- **การให้สิทธิ์ Interface เปลี่ยนวิธี** จากเดิมที่มากับ `configuration.app_config`
  ของสัญญา กลายเป็นต้องออกใบ INF ที่ carmen-platform ใครที่ดูแล UAT/prod ต้องรู้
  เรื่องนี้ก่อน deploy
- **ใบ INF มีสองด่าน** ใบต้องครอบ `now` และสัญญาหลักต้อง `active` — BU ที่สัญญา
  หมดอายุจะไม่ได้สิทธิ์ interface แม้ถือใบ INF ที่ยังไม่หมด (ตั้งใจตามสเปก 2026-09-09)
- **list endpoint filter เป็น breaking change เงียบ ๆ** สำหรับผู้เรียกนอก FE ที่
  พึ่งคีย์ทั้งสามจาก list ต้องไล่ให้ครบก่อน
