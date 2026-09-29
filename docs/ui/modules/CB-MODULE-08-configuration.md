---
**Module Number:** 8
**Module Name:** Configuration (Master Data)
**System / Product:** Carmen Blue — Inventory (React SPA)
**Version:** v1.0 (FE v2.2.0 · api 3.0.2 ตอนถ่ายภาพ)
**Status:** Draft
**Created:** 2026-09-29
**Last Updated:** 2026-09-29
**Author:** Claude (จากโค้ด + ภาพหน้าจอจริง)
---

## 8. Configuration (Master Data)

---

### 8.1 Purpose

โมดูล Config เก็บ master data ระดับ business unit (BU) ที่เอกสารทุกโมดูลหยิบไปใช้ ได้แก่ ผังบัญชี หน่วยนับ สกุลเงินและอัตราแลกเปลี่ยน ภาษี เงื่อนไขเครดิต จุดรับของ แผนก คลัง/ชั้นวาง และเหตุผลต่าง ๆ ข้อมูลทุกชุดผูกกับ BU ที่เลือกอยู่ (`{bu_code}` ใน URL ของ API) เมื่อสลับ BU ก็เห็นข้อมูลอีกชุด

**Key capabilities:**
- CRUD แบบ list + dialog สำหรับ master data ขนาดเล็ก 12 ชุด (ผ่าน `ConfigListTemplate` ร่วมกัน ยกเว้น Exchange Rate)
- CRUD แบบ list + ฟอร์มเต็มหน้าสำหรับ Department และ Store Location ซึ่งมีการผูกผู้ใช้/สินค้า (transfer list)
- Import ผังบัญชีจาก Carmen GL (เฉพาะ BU ที่มีสิทธิ์ interface `accounting/carmen_gl`)
- Export Excel / Print ของ list (ส่งออกเฉพาะแถวที่โหลดอยู่ในหน้าปัจจุบัน ไม่ใช่ทั้งชุด)
- Saved views + filter ต่อหน้า, activity sheet ("ใครแก้อะไร") ต่อแถว บนหน้าที่เปิดใช้

**Approval support:** N/A — master data ไม่มี workflow อนุมัติ บันทึกแล้วมีผลทันที
**Approval conditions:** N/A

**Workflow stages:**

| Stage | Role | Action |
|-------|------|--------|
| 1 | ผู้มีสิทธิ์ `configuration.*` (หรือ admin) | สร้าง / แก้ไข / ลบ / เปิด-ปิด (`is_active`) รายการ — มีผลทันที |

---

### 8.2 Configuration List Screen

> โมดูลนี้ไม่มี list กลางตัวเดียว — แต่ละ master data มีหน้า list ของตัวเอง (ดู 8.9) หน้า `/config` เป็น dashboard ภาพรวม

**Doc reference:** CB-PAGE-001 — Configuration Overview (dashboard) และหน้า list ทั้ง 16 หน้าใน 8.9

#### 8.2.1 Column Definitions

คอลัมน์ต่างกันตามชุดข้อมูล — ดูในเอกสารแต่ละหน้า รูปแบบร่วมของหน้าที่ใช้ `ConfigListTemplate`:

| Column | Description | Sortable | Remarks |
|--------|-------------|----------|---------|
| # | ลำดับแถว | No | นับต่อจากหน้าก่อน |
| Code / Name | รหัสและชื่อ | Yes | คลิกเพื่อเปิด dialog แก้ไข หรือไปหน้าฟอร์ม (Department/Location) |
| (คอลัมน์เฉพาะชุดข้อมูล) | เช่น Decimal Places, Rate, Days, Type | แล้วแต่หน้า | — |
| Status | active / inactive | Yes | Credit Note Reason ไม่มี `is_active` ในฟอร์ม |
| (row actions "…") | Delete และ Activity (ถ้าเปิด) | No | Delete เปิด CB-MODAL-014 |

#### 8.2.2 Search & Filter

| Filter | Type | Description | Default |
|--------|------|-------------|---------|
| Search | Free text | ค้นตาม code/name (ส่ง `search=`) | ว่าง |
| Filter | Sheet ตามฟิลด์ของแต่ละหน้า (`*-filter-fields.ts`) | เช่น Status, Location Type | ไม่กรอง — ปุ่มถูกซ่อนเมื่อหน้าไม่มีฟิลด์ filter (Credit Note Reason) |
| View | Saved view (ต่อผู้ใช้) | บันทึกชุด filter/sort | "No view" |

#### 8.2.3 Document Status

| Status | Badge Colour | Description |
|--------|-------------|-------------|
| active | Green (Active) | ใช้งานได้ — ขึ้นใน lookup ของเอกสารอื่น |
| inactive | Gray (Inactive) | ปิดใช้งาน — เก็บไว้เป็นประวัติ |

#### 8.2.4 List Screen Actions

| Button / Action | Description | Availability |
|----------------|-------------|-------------|
| Add {Entity} | เปิด dialog สร้าง หรือไป `/new` | ต้องมีสิทธิ์ create + `canWrite` (license) |
| Edit | คลิก code/name ของแถว | dialog เปิดแบบ `readOnly` ถ้าไม่มีสิทธิ์ update |
| View | N/A — ใช้ dialog/ฟอร์มเดียวกับ Edit | — |
| Delete | row action → CB-MODAL-014 | ต้องมีสิทธิ์ delete + `canWrite` |
| Export | Excel ของแถวในหน้าปัจจุบัน | ทุกหน้า ยกเว้น Exchange Rate และ COA Mapping (mock) |
| Print | Browser print | ทุกหน้า ยกเว้น Exchange Rate |

---

### 8.3 Document Creation

**Doc reference:** dialog CB-MODAL-001, 003–013 และฟอร์ม CB-PAGE-015, CB-PAGE-017

**Creation methods:**

| Method | Description | Use Case |
|--------|-------------|---------|
| Manual | กรอกใน dialog หรือฟอร์มเต็มหน้า | ทุกชุดข้อมูล |
| From Template | N/A | — |
| Import | Import from Carmen GL (CB-MODAL-002) | ผังบัญชีเท่านั้น |
| Inline create | สร้าง Unit จาก `LookupUnit` ในหน้าอื่นผ่าน dialog เดียวกับ CB-MODAL-003 | สร้างหน่วยระหว่างทำเอกสาร |

#### 8.3.1 Document Structure

##### 8.3.1.1 Header Information

ดูตารางฟิลด์ในเอกสาร modal/ฟอร์มแต่ละตัว ฟิลด์ร่วมที่เกือบทุกชุดมี:

| Field | Mandatory | Description | Business Logic / Remark |
|-------|-----------|-------------|--------------------------|
| Code | Y (เฉพาะชุดที่มี code) | รหัส | ความยาวสูงสุดต่างกัน (10–50) มีตัวนับ `0/N` |
| Name | Y | ชื่อ | สูงสุด 100 (COA 150) |
| Description | N | คำอธิบาย | สูงสุด 256 (COA 150) |
| Active | N | สวิตช์ `is_active` | Default: Active |

##### 8.3.1.2 Summary Information

N/A — master data ไม่มียอดสรุป

##### 8.3.1.3 Detail Information (Line Items Grid)

N/A สำหรับ dialog ทั้งหมด — ฟอร์ม Department/Location มี transfer list (ผู้ใช้, หัวหน้าแผนก, สินค้า) แทน grid ดู CB-PAGE-015 / CB-PAGE-017

#### 8.3.2 Save Validation

| Validation | Error Message | Action |
|------------|---------------|--------|
| Mandatory ว่าง | ข้อความ inline ใต้ฟิลด์ (จาก zod schema) | ฟอร์มไม่ submit |
| เกินความยาว | ถูกจำกัดที่ input (`maxLength`) — บางฟิลด์ไม่มีใน schema | พิมพ์เกินไม่ได้ |
| ชนกันระหว่างแก้ไข (409) | "Someone else changed this document…" | toast; ต้องโหลดใหม่ |

---

### 8.4 Document Editing

**Access:** คลิก code/name ในหน้า list (dialog) หรือเปิด `/config/department/:id`, `/config/location/:id` แล้วกด Edit

| Behaviour | Create | Edit |
|-----------|--------|------|
| Code | กรอกได้ | ส่วนใหญ่ยังแก้ได้ (เช่น Adjustment Type) — ดูแต่ละ modal |
| Fields | ว่าง / ค่า default | ดึงค่าเดิม |
| Availability | ต้องมีสิทธิ์ create | ต้องมีสิทธิ์ update ไม่งั้น `readOnly` |
| Concurrency | — | ส่ง `doc_version`; FE แจ้งเตือนเฉพาะเมื่อ backend ตอบ 409 — DELETE ไม่เช็ค version |

---

### 8.5 Document Submission

N/A — ไม่มีการ submit เข้า workflow กด Create/Save แล้วบันทึกทันที

---

### 8.6 Approval Workflow

#### 8.6.1 Display Modes

N/A

#### 8.6.2 Editable Fields by Stage

N/A

#### 8.6.3 Approval Actions

N/A

#### 8.6.4 Vendor Allocation (if applicable)

N/A

---

### 8.7 Ancillary Functions

#### 8.7.1 Attachments
- Supported: No

#### 8.7.2 Comments
- Supported: No

#### 8.7.3 Activity Log / Workflow History

ไม่มี workflow history ส่วน activity sheet (ประวัติ "ใครแก้อะไร" ผ่าน `openActivity()`) เปิดได้จาก row action ของหน้าที่ backend บันทึก entity นั้น — ดูรายหน้า (Chart of Accounts และ Exchange Rate ไม่มี)

| Log Entry | Data Captured |
|-----------|--------------|
| Created | เวลา, ผู้สร้าง (audit.created) |
| Updated | เวลา, ผู้แก้, ฟิลด์ที่เปลี่ยน |
| Deleted | เวลา, ผู้ลบ |

---

### 8.8 Modals in This Module

| Modal ID | Modal Name | Trigger | Parent Page |
|----------|-----------|---------|------------|
| CB-MODAL-001 | Add / Edit Chart of Account | Add Account / คลิก Code | CB-PAGE-002 |
| CB-MODAL-002 | Import from Carmen GL (Confirm) | Import from Carmen GL | CB-PAGE-002 |
| CB-MODAL-003 | Unit Dialog | Add Unit / คลิกแถว | CB-PAGE-004 |
| CB-MODAL-004 | Currency Dialog | Add Currency / คลิกแถว | CB-PAGE-005 |
| CB-MODAL-005 | Adjustment Type Dialog | Add Adjustment Type / คลิกแถว | CB-PAGE-006 |
| CB-MODAL-006 | Business Type Dialog | Add Business Type / คลิกแถว | CB-PAGE-007 |
| CB-MODAL-007 | Credit Note Reason Dialog | Add Credit Note Reason / คลิกแถว | CB-PAGE-008 |
| CB-MODAL-008 | Credit Term Dialog | Add Credit Term / คลิกแถว | CB-PAGE-009 |
| CB-MODAL-009 | Delivery Point Dialog | Add Delivery Point / คลิกแถว | CB-PAGE-010 |
| CB-MODAL-010 | Exchange Rate Dialog (Add Manual / Edit) | Add Manual / คลิก Code | CB-PAGE-011 |
| CB-MODAL-011 | Extra Cost Type Dialog | Add Extra Cost Type / คลิกแถว | CB-PAGE-012 |
| CB-MODAL-012 | Tax Profile Dialog | Add Tax Profile / คลิกแถว | CB-PAGE-013 |
| CB-MODAL-013 | Shelf Dialog | Add Shelf / คลิกแถว | CB-PAGE-018 |
| CB-MODAL-014 | Delete Confirmation (shared) | row action Delete / ปุ่ม Delete ในฟอร์ม | CB-PAGE-002, 004–018 (ยกเว้น 003) |

**ยังไม่มีเอกสาร (component กลาง ใช้ข้ามโมดูล):** Filter sheet, Save View dialog, Activity sheet, Permission Denied / Subscription Expired dialog, Discard changes dialog, confirm ของ Update Exchange Rates, popover เลือก Delivery Point

---

### 8.9 Pages in This Module

| Page ID | Page Name | Route | Purpose |
|---------|-----------|-------|---------|
| CB-PAGE-001 | Configuration Overview | `/config` | Dashboard ภาพรวม master data |
| CB-PAGE-002 | Chart of Accounts | `/config/chart-of-accounts` | ผังบัญชี + import จาก Carmen GL |
| CB-PAGE-003 | Chart of Account Mapping | `/config/chart-of-account-mapping` | ⚠️ ข้อมูล mock ทั้งหน้า ยังไม่ต่อ API |
| CB-PAGE-004 | Unit | `/config/unit` | หน่วยนับ + จำนวนทศนิยม |
| CB-PAGE-005 | Currency | `/config/currency` | สกุลเงิน + อัตราเทียบสกุลหลัก |
| CB-PAGE-006 | Adjustment Type | `/config/adjustment-type` | เหตุผลปรับสต็อกเข้า/ออก |
| CB-PAGE-007 | Business Type | `/config/business-type` | ประเภทธุรกิจของ vendor |
| CB-PAGE-008 | Credit Note Reason | `/config/credit-note-reason` | เหตุผลของ credit note |
| CB-PAGE-009 | Credit Term | `/config/credit-term` | ระยะเวลาเครดิต (วัน) |
| CB-PAGE-010 | Delivery Point | `/config/delivery-point` | จุดรับของ |
| CB-PAGE-011 | Exchange Rate | `/config/exchange-rate` | ประวัติอัตราแลกเปลี่ยน |
| CB-PAGE-012 | Extra Cost Type | `/config/extra-cost` | ประเภทค่าใช้จ่ายเพิ่มเติม (ค่าขนส่ง ฯลฯ) |
| CB-PAGE-013 | Tax Profile | `/config/tax-profile` | อัตราภาษี |
| CB-PAGE-014 | Department List | `/config/department` | รายการแผนก |
| CB-PAGE-015 | Department Form | `/config/department/new`, `/:id` | แผนก + สมาชิก + หัวหน้าแผนก |
| CB-PAGE-016 | Store Location List | `/config/location` | รายการคลัง/จุดเก็บ |
| CB-PAGE-017 | Store Location Form | `/config/location/new`, `/:id` | คลัง + ผู้ใช้ + สินค้าที่เก็บ |
| CB-PAGE-018 | Shelf | `/config/shelf` | ชั้นวางภายในคลัง |

---

### 8.10 Flows in This Module

| Flow ID | Flow Name | Stage | Purpose |
|---------|-----------|-------|---------|
| N/A | — | — | master data CRUD ไม่มี multi-step flow — ลำดับเป็น list → dialog/ฟอร์ม → list ตามที่เขียนไว้ในแต่ละหน้า |

---

### 8.11 API Endpoints Summary

ทุก endpoint ขึ้นต้นด้วย `/api/config/{bu_code}/` เว้นแต่ระบุ รูปแบบ CRUD ร่วม: `GET /<resource>` (list: `page`, `perpage`, `search`, `sort`, `filter`), `POST /<resource>`, `PUT|PATCH /<resource>/{id}` (ส่ง `doc_version`), `DELETE /<resource>/{id}`

| Resource | Page | Update method | หมายเหตุ |
|----------|------|---------------|----------|
| `chart-of-accounts` | CB-PAGE-002 | PATCH | + `POST chart-of-accounts/import-from-interface/carmen-gl` |
| — | CB-PAGE-003 | — | ไม่เรียก API (mock) |
| `units` | CB-PAGE-004 | PUT | |
| `currencies` | CB-PAGE-005 | PATCH | + `GET /api/exchange-rate?base=` (ยังไม่มีจริง) |
| `adjustment-types` | CB-PAGE-006 | PUT | |
| `vendor-business-types` | CB-PAGE-007 | PATCH | |
| `credit-note-reasons` | CB-PAGE-008 | PUT | |
| `credit-terms` | CB-PAGE-009 | PATCH | |
| `delivery-points` | CB-PAGE-010 | PUT | |
| `exchange-rates` | CB-PAGE-011 | PATCH | live rates: `GET /api/exchange-rate?base=` บน origin ของ FE → ไม่มี endpoint |
| `extra-cost-types` | CB-PAGE-012 | PATCH | |
| `tax-profiles` | CB-PAGE-013 | PATCH | |
| `departments` | CB-PAGE-014/015 | PATCH | + `GET /api/{bu_code}/users?perpage=-1` |
| `locations` | CB-PAGE-016/017 | PATCH | + users, `products?perpage=-1`, `delivery-points` |
| `shelves` | CB-PAGE-018 | PATCH | |
| Dashboard | CB-PAGE-001 | — | `GET /api/{bu_code}/dashboard-widgets/config`, `GET /api/{bu_code}/datasets/{id}` |

> วิธี update ไม่สม่ำเสมอ (PUT 4 ชุด / PATCH ที่เหลือ) — ตรงกับที่ backend รับ ไม่ใช่ความผิดพลาดของเอกสาร

---

### 8.12 Known Issues Found While Documenting (2026-09-29)

พบระหว่างอ่านโค้ดประกอบเอกสาร — **ยังไม่ได้แก้** และส่วนใหญ่ยืนยันจากโค้ดเท่านั้น (ถ่ายภาพด้วย admin ซึ่ง bypass permission จึงไม่เห็นอาการ)

| # | Page | ปัญหา | ผลต่อผู้ใช้ |
|---|------|-------|-------------|
| 1 | 004 Unit | `permissionPrefix="product_management.unit"` ไม่มีใน PERMISSIONS | non-admin กด Add ไม่ได้, dialog แก้ไขเป็น read-only — **แก้ใน PR #185 (merge แล้ว 29 ก.ย. — ยังไม่ deploy)** |
| 2 | 018 Shelf | `permissionPrefix="configuration.shelf"` (คีย์จริง `configuration.location_shelf`) | เหมือนข้อ 1 — **แก้ใน PR #185 (merge แล้ว 29 ก.ย. — ยังไม่ deploy)** |
| 3 | 012 Extra Cost | ใช้ `configuration.extra_cost` (คีย์ของ Procurement) แต่ Delete ใช้ `configuration.extra_cost_type` | สิทธิ์ Add/Edit กับ Delete ไม่ตรงกัน — **แก้ใน PR #185 (merge แล้ว 29 ก.ย. — ยังไม่ deploy)** |
| 4 | 008 Credit Note Reason, 009 Credit Term | เมนูผูก `configuration.view` → derive เป็น `configuration.create/update/delete` ที่ไม่มีจริง | non-admin เขียนไม่ได้เลย — **แก้ใน PR #185 (merge แล้ว 29 ก.ย. — ยังไม่ deploy)** |
| 5 | 003 COA Mapping | render `COAM_MOCK_ROWS` ไม่เรียก API ปุ่มทุกปุ่มไม่มี handler | ข้อมูลปลอม เหมือนกันทุก BU |
| 6 | 011 Exchange Rate / 005 Currency | live rates fetch `/api/exchange-rate` บน origin ของ FE (ไม่ผ่าน BACKEND_URL) | ปุ่ม Update Exchange Rates disable ตลอด, rate ไม่ auto-fill |
| 7 | 011 Exchange Rate | default sort `at_date:desc,currency_code:asc` ถูก parse ผิด | ลูกศรหัวคอลัมน์ Date แสดงกลับทิศ |
| 8 | 011 Exchange Rate | Add Manual / Edit ไม่เช็ค permission และ `canWrite` | ผู้ไม่มีสิทธิ์ยังกดได้ (backend เป็นด่านจริง) |
| 9 | 009 Credit Term | ช่อง Days ไม่มี error prop, default 0 แต่ schema บังคับ ≥ 1 | กด Create แล้วเงียบ ไม่บอกเหตุผล |
| 10 | 002 COA | ช่อง Account name ว่างขึ้น "Description is required" | ข้อความผิดฟิลด์ |
| 11 | 015/017 ฟอร์ม | transfer list `setValue` ไม่ `shouldDirty` | แก้แค่ผู้ใช้/สินค้าแล้วออก ไม่ถามยืนยัน |
| 12 | 015 Department | ไม่ reset ฟอร์มหลัง Save | Save รอบสองอาจส่งรายการเดิมซ้ำ |
| 13 | 016 Location | Export อ่าน `delivery_point_name` แต่ตารางอ่าน `delivery_point?.name` | คอลัมน์ Delivery Point ใน Excel อาจว่าง (ยังไม่ยืนยัน) |
| 14 | ทุก list | Export ส่งออกเฉพาะแถวในหน้าปัจจุบัน | ได้ไฟล์ 10 แถวจาก 1,423 บัญชี |
| 15 | 001 Dashboard | widget ที่โหลดไม่ได้ return `null` เงียบ ๆ | หน้าเหลือแค่หัวข้อ METRICS / COMPARISON |
