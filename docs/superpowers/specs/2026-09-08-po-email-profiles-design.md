# Email profiles (ต่อ BU) + ส่ง PO ให้ vendor ทางอีเมล

วันที่ 2026-09-08 · สถานะ: design อนุมัติแล้ว รอทำ implementation plan

## ปัญหา

ผู้ใช้ต้องส่งใบสั่งซื้อ (PO) ให้ผู้ขายทางอีเมลจากในระบบ โดยส่งจากอีเมลของกิจการเอง
ไม่ใช่อีเมลกลางของแพลตฟอร์ม และแต่ละกิจการอาจมีผู้ส่งได้หลายราย (เช่น แยกตามฝ่ายจัดซื้อ
หรือแยกตามโรงแรมในเครือ) ทุกวันนี้ระบบทำไม่ได้เลย — หน้า PO ไม่มีปุ่มส่งอีเมล และ
backend ไม่มี endpoint

## ของเดิมที่เกี่ยวข้อง (สำรวจแล้ว)

- **ระดับแพลตฟอร์ม** — `tb_email_sender_profile` + `tb_platform_config.email_routing`
  จัดการที่ carmen-platform ใช้กับ register / verify / invitation / forgot-password /
  notification **งานนี้ไม่แตะของชุดนั้น** ตัดสินใจแล้วว่าโปรไฟล์ของ BU แยกจากแพลตฟอร์ม
  เพราะ PO ต้องออกจากอีเมลของกิจการ ไม่ใช่ผู้ส่งกลาง
- **`report_email`** — app-config key เดิมของ BU (SMTP เดี่ยว ใช้กับอีเมลรายงาน)
  มี `getReportEmailForSend()` ถอดรหัสฝั่ง server ให้แล้ว **ไม่นำมาปนกับงานนี้**
  หน้า `routes/system-admin/config-email/` เป็นไฟล์ค้างที่ถอดออกจาก router แล้ว
  (commit `ca4d678`) — อย่าเอากลับมาลงทะเบียน
- **`notifications.send-with-config` RPC** (micro-notification) ส่งเมลด้วย SMTP config
  ที่ยัดเข้าไปตอนเรียกได้เลย ไม่ต้องพึ่ง sender profile ของแพลตฟอร์ม → **ตัวส่งเมล
  มีอยู่แล้ว ไม่ต้องเขียนใหม่** แต่ payload ปัจจุบันคือ
  `{ smtp_config, to: string, subject, html, text? }` ยังไม่มี cc และ attachment
- **`app-config.service.ts`** มี encrypt/mask/restore secret สำเร็จรูป (`secretPathsFor`
  → `MASK` → restore เมื่อฟอร์ม echo mask กลับมา) แต่เดินเฉพาะ path ที่เป็น key ตายตัว
  ยังไม่รองรับ array
- **print PO** — gateway มี `/{bu}/purchase-orders/{id}/print-viewer` ที่คืน URL ของ viewer
  (`lib/print-document.ts`) และ BU เลือก print form ได้ (`resolvePrintFormTemplateId`)
- **`tb_activity`** — `entity_type`/`entity_id` + `meta_data` JSONB มี index
  `(entity_type, entity_id)` และหน้า PO มี activity sheet ของกลางอยู่แล้ว

## §1 โมเดลข้อมูล

หนึ่งแถวใน `tb_application_config` ต่อ BU · `key = "email_profiles"`

```jsonc
{
  "default_profile_id": "3f2a…",
  "profiles": [
    {
      "id": "3f2a…",            // uuid สร้างฝั่ง FE ตอนกด Add — คงที่ตลอดชีวิตโปรไฟล์
      "name": "จัดซื้อ – โรงแรม A",
      "enabled": true,
      "smtp": { "host": "", "port": 587, "secure": true, "username": "", "password": "" },
      "from_email": "purchasing@hotel-a.example",
      "from_name": "Hotel A Purchasing",
      "reply_to": "",           // ว่าง = ใช้ from_email
      "default_cc": ["ap@hotel-a.example"],
      "subject_template": "PO {{po_no}} จาก {{bu_name}}",
      "body_template": "…"      // ข้อความล้วน
    }
  ]
}
```

การตัดสินใจที่ฝังอยู่ในโครงนี้:

- **เก็บเป็น app-config key เดียว ไม่ใช่ตารางใหม่** — ได้ permission / audit /
  license gate / encryption ของเดิมทั้งชุด ไม่ต้อง migration ไม่ต้องทำ serializer
  สองชั้น ราคาที่จ่ายคือแก้พร้อมกันสองคนแล้วทับกันทั้งก้อน (last-write-wins) ซึ่ง
  ยอมรับได้: นี่คือหน้า system-admin ที่แก้นาน ๆ ครั้ง และเป็นพฤติกรรมเดียวกับ
  config ทุกตัวในระบบอยู่แล้ว ถ้าโตเกินค่อยย้ายเป็นตารางทีหลัง (มี `id` รออยู่แล้ว)
- **`id` เป็น uuid ไม่ใช่ index ของ array** — ประวัติการส่งอ้าง `profile_id` ถ้าใช้
  index แล้วลบโปรไฟล์กลางทาง log เก่าจะชี้ผิดตัวเงียบ ๆ
- **template เป็นข้อความล้วน + placeholder จำกัด** (`{{po_no}}` `{{vendor_name}}`
  `{{bu_name}}` `{{total}}` `{{delivery_date}}`) ไม่ใช้ rich editor เพราะผู้ส่งแก้
  ข้อความได้อยู่แล้วก่อนส่ง template แค่ลดการพิมพ์ซ้ำ
- **ไม่มีสวิตช์ปิดทั้ง config** — ปิดทีละโปรไฟล์พอ โปรไฟล์ `enabled: false` ไม่ขึ้น
  ใน dropdown ตอนส่ง แต่ยังอยู่ให้แก้
- **`smtp.password` เป็น secret** → backend เพิ่ม path
  `['profiles', '*', 'smtp', 'password']` ต้องขยาย `readSecret`/`writeSecret` ใน
  `app-config.service.ts` ให้เดิน `*` ข้าม array ได้ กลไก mask/restore เดิมใช้ต่อ
  ทั้งหมด — ฟอร์มที่ไม่แตะรหัสผ่านจะ echo `***ENCRYPTED***` กลับมาแล้ว backend
  คืนค่าเดิมให้เอง

## §2 หน้าตั้งค่า (frontend)

`routes/system-admin/email-profile/` — อยู่กลุ่มเดียวกับ Interface / Workflow /
Notification Template

| ไฟล์ | หน้าที่ |
|---|---|
| `email-profile.route.tsx` | ตาราง: ชื่อ · from · สถานะ · badge "ค่าเริ่มต้น" · row actions (แก้ / ลบ / ตั้งเป็นค่าเริ่มต้น) |
| `email-profile-dialog.tsx` | ฟอร์มแก้ทีละโปรไฟล์ ปิดแล้วเขียนกลับทั้งก้อน |
| `email-profile-schema.ts` | zod — host/port/email/ชื่อห้ามว่าง |
| `use-email-profiles.ts` | wrap `useAppConfigByKey("email_profiles")` · map 404 → `{ profiles: [], default_profile_id: null }` ไม่ใช่ error (แบบ `use-interface-config.ts`) |

- ยืมทรงจาก `ConfigListTemplate` / interface config ไม่ประดิษฐ์ layout ใหม่
- **ปุ่ม Test email ต่อโปรไฟล์** — `APP_CONFIG_TEST_EMAIL` เดิมยิง `report_email` ตายตัว
  **ไม่แก้ของเดิม** แต่เพิ่มเส้นใหม่ `POST /api/config/{bu}/app-config/test-email-profile`
  รับ body `{ profile_id }` เหตุผลที่ไม่ยัดพารามิเตอร์ลงเส้นเดิม: เส้นเดิมมีผู้เรียกอื่น
  และความหมายของมันคือ "ทดสอบอีเมลรายงาน" ไม่ใช่ "ทดสอบโปรไฟล์ใดโปรไฟล์หนึ่ง"
- **ลบโปรไฟล์ที่เป็นค่าเริ่มต้น** ต้องเลือกตัวใหม่ก่อน; เหลือตัวเดียวคือค่าเริ่มต้นอัตโนมัติ
- ต้องเติมนอกโฟลเดอร์: `routes/router.tsx`, `constant/module-list.ts`
  (พร้อม `licenseFeature` ที่ต้องมีอยู่จริงใน catalog ของ backend ไม่งั้น
  `module-list.license-feature.test.ts` แดง), `messages/{en,th}.json`

## §3 flow ส่ง PO ให้ vendor

**เงื่อนไขการส่ง:** `po_status ∈ {sent, partial, closed, completed}` — `draft` และ
`in_progress` ส่งไม่ได้ · **การส่งเมลไม่เปลี่ยน `po_status`** · **ส่งซ้ำได้ไม่จำกัด**

### frontend

ปุ่ม "ส่งให้ผู้ขาย" ใน `po-header.tsx` (ข้างปุ่ม Print) เปิด `po-send-email-dialog.tsx`

- dropdown โปรไฟล์ — เฉพาะ `enabled`, preselect ตัว default
  **ไม่มีโปรไฟล์เลย → dialog บอกให้ไปตั้งค่าพร้อมลิงก์ ไม่ใช่ปุ่มส่งที่กดแล้วพัง**
- To — prefill จาก `vendor.email` (`types/vendor.ts` มีฟิลด์นี้แล้ว) แก้ได้ เพิ่มได้หลายอัน
- CC — prefill จาก `default_cc` ของโปรไฟล์
- Subject — แก้ได้ ตั้งต้นจาก `subject_template` ของโปรไฟล์
- Body — **textarea ที่พิมพ์/แก้ได้เต็มก้อนก่อนส่งทุกครั้ง** ตั้งต้นจาก `body_template`
  ของโปรไฟล์แล้วผู้ส่งเขียนข้อความเพิ่มเติมต่อได้ตามต้องการ (เช่น ขอวันส่งของ
  แจ้งเงื่อนไขพิเศษ) — template เป็นแค่จุดตั้งต้นเพื่อลดการพิมพ์ซ้ำ ไม่ใช่ข้อความตายตัว
  เปลี่ยนโปรไฟล์แล้ว re-render **เฉพาะเมื่อผู้ใช้ยังไม่แก้ข้อความเอง**
  (แก้แล้วห้ามทับของที่พิมพ์ไว้ — ถ้าจะทับต้องถามก่อน)
  ข้อความที่ส่งจริงคือสิ่งที่เห็นในช่องนี้ ไม่มีการเติมอะไรฝั่ง server นอกจาก
  แทนค่า placeholder ที่เหลือ
- checkbox "แนบไฟล์ PO (PDF)" ติ๊กไว้เป็นค่าเริ่มต้น
- ถ้าเคยส่งแล้ว แสดงบรรทัด "ส่งล่าสุด: <เวลา> โดย <ใคร>" กันส่งซ้ำโดยไม่ตั้งใจ

### backend

`POST /api/{bu}/purchase-orders/{id}/send-email` ที่ backend-gateway
(`apps/backend-gateway/src/application/purchase-orders/`)

1. ตรวจสิทธิ์ + ตรวจ `po_status` — สถานะที่ส่งไม่ได้ → **422 พร้อมข้อความ ไม่ใช่ 500**
2. โหลด `email_profiles` และ **ถอดรหัสรหัสผ่านฝั่ง server** ตามแบบ
   `getReportEmailForSend()` — FE ส่งมาแค่ `profile_id` รหัสผ่านไม่เคยออกทาง HTTP
3. ถ้าติ๊กแนบไฟล์ → เรียก micro-report ผลิต PDF ตาม print form config ของ BU
4. ส่งผ่าน `notifications.send-with-config` — **ต้องขยาย `SendWithConfigInput`**
   ให้รับ `to: string[]`, `cc?: string[]`, `attachments?: [{ filename, content_base64,
   content_type }]` (nodemailer รองรับอยู่แล้ว แค่ยังไม่เปิดทาง)
5. เขียน `tb_activity` — `entity_type='purchase_order'`, `entity_id=<po id>`,
   `meta_data = { profile_id, profile_name, from, to[], cc[], subject, body_excerpt, attached, result }`
   (`body_excerpt` = ข้อความที่ส่งจริง ตัดที่ 500 ตัวอักษร — ให้ย้อนดูได้ว่าเขียนอะไรไป
   โดยไม่บวม JSONB)
   ต้องเพิ่มค่า `email_sent` ใน `enum_activity_action` (migration + `db:generate` + `build`
   ที่ `packages/prisma-shared-schema-tenant` ไม่งั้น app อื่นเห็นชนิดเก่าจาก dist)

**ต้องเติมนอกโค้ดฟีเจอร์:** `api_name` ตัวใหม่ใน app-id allowlist — **ถ้าลืม ผู้ใช้จะ
โดนเด้งออกหน้า login** ไม่ใช่แค่ปุ่มไม่ทำงาน

## §4 ความผิดพลาดและความปลอดภัย

- secret ไม่ออกจาก server: GET คืน `***ENCRYPTED***` เสมอ, ฟอร์มส่ง mask กลับมาแล้ว
  backend restore ให้ (กลไกเดิม ไม่ประดิษฐ์ใหม่)
- **prod/uat ต้องตั้ง `SECRET_ENCRYPTION_KEY`** ไม่งั้นการ save โปรไฟล์ 400
  (ปัญหาเดียวกับ interface config และ `report_email`)
- SMTP ล้มเหลว → เขียน activity เป็น `result: failed` พร้อมเหตุผล และตอบ error ที่
  อ่านออก **ห้ามตอบ 200 เงียบ ๆ**
- ส่งบางคนสำเร็จบางคนล้ม (nodemailer คืน `rejected[]`) → รายงานว่าใครไม่ผ่าน
  ห้ามกลบเป็น "ส่งแล้ว"
- ห้าม log รหัสผ่านหรือเนื้อความเต็มลง log ระบบ

## §5 การทดสอบ

ตามคู่มือการทำงานของผู้ใช้: **ข้ามการเขียนไฟล์เทสต์ระหว่าง execute plan** ด่านคือ
`bunx tsc --noEmit` + `bun run lint` และเทสต์ที่มีอยู่ต้องยังเขียวทั้งหมด

manual checklist (ผู้ใช้ตรวจเอง):

1. save โปรไฟล์แล้ว GET กลับมาต้องเห็นรหัสผ่านเป็น mask
2. แก้ฟิลด์อื่นโดยไม่แตะรหัสผ่านแล้ว save — รหัสผ่านเดิมต้องไม่หาย
3. กด Test email ของแต่ละโปรไฟล์ ต้องเข้าเมลจริงและมาจากโปรไฟล์ที่เลือก
4. ส่ง PO จริงพร้อม PDF — vendor ได้ไฟล์ที่เปิดได้
5. activity sheet ของ PO ขึ้นรายการส่ง พร้อมผู้รับและโปรไฟล์ที่ใช้
6. เคส "ไม่มีโปรไฟล์" / "SMTP ผิด" / "PO ยัง draft" ต้องขึ้นข้อความที่อ่านออก

## การผลิต PDF ของ PO (เคลียร์แล้ว 2026-09-08)

เส้นทางที่เอกสารพิมพ์อยู่ทุกวันนี้ **ไม่คืนไฟล์** — `micro-report`
(`ViewReportWithExternalData` → `render.ViewerClient.View()`) ยิง
`POST {REPORT_VIEWER_URL}/api/Report/viewer` ด้วย payload `{Title, Name, File, Data}`
แล้วได้ `{ url }` ซึ่งเป็นลิงก์หน้า viewer สำหรับเบราว์เซอร์ ส่วน
`POST /api/reports/generate` ของ micro-report คืน byte ได้ก็จริงแต่เป็นเส้นของ
รายงานที่ลงทะเบียนไว้ ไม่ใช่เอกสาร PO และ `report-render` (`POST /render`) ก็คืน byte
แต่ payload เป็น columns/rows คนละแบบกับ viewer

**ทางที่ใช้: `POST {REPORT_VIEWER_URL}/api/Report/Export/Pdf`** (ยืนยันแล้วว่า route
มีจริงบน `https://report.blueledgers.cloud` — POST เปล่าตอบ 500 ไม่ใช่ 404)

- เพิ่ม method ใน `service/render/viewer_client.go` เช่น `ExportPDF(ctx, req)` ที่ใช้
  `ViewerRequest` ชุดเดิม แต่อ่าน response เป็น byte แทน JSON `{url}`
- เพิ่ม service method คู่กับ `ViewReportWithExternalData` (เช่น
  `ExportReportWithExternalData`) และ route ใหม่ใน `report_controller.go`
  เช่น `POST /api/:buCode/report/export-pdf` คืน `application/pdf`
- gateway เรียกเส้นนี้แล้วเอา byte ไปเป็น attachment
- **ต้องยืนยันตอนลงมือ:** payload ของ `/api/Report/Export/Pdf` เหมือน `/api/Report/viewer`
  จริงหรือไม่ และคืน PDF byte ตรง ๆ หรือคืน JSON ที่มี url/base64 — ทดสอบด้วย curl
  พร้อม template จริงก่อนเขียนโค้ดฝั่ง Go เป็นขั้นแรกของงานส่วนนี้
- **micro-report ต้องขึ้นก่อน gateway** — เป็นอีกรีโปหนึ่ง (Go, deploy แยก) และมีกับดัก
  พอร์ต: อาการ print 500 "fetch failed" คือ micro-report ไม่ได้อยู่ที่ 6015 ไม่ใช่บั๊ก FE

## ลำดับ deploy

backend ก่อนเสมอ — FE ที่ขึ้นก่อนจะเรียก endpoint ที่ยังไม่มี

1. `micro-report` (viewer client `ExportPDF` + route `export-pdf`)
2. `carmen-turborepo-backend-v2` (wildcard secret path, send-with-config รองรับ
   cc/attachment, endpoint ส่ง PO, enum activity + migration, app-id allowlist)
3. `carmen-inventory-frontend-react` (หน้าตั้งค่า + dialog ส่ง)
