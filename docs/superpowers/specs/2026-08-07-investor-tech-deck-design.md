# Investor technology overview — document + deck + ภาพหน้าจอ UI

Date: 2026-08-07
Branch base: main

## Goal

ผลิตสื่อสองชิ้นสำหรับคุยกับนักลงทุน (VC / นักลงทุนต่างชาติ) **ภาษาอังกฤษ**:

1. **Technical memo** — `docs/investor/carmen-technology-overview.md` เอกสารเชิงเทคนิค
   ที่ส่งอ่านล่วงหน้าได้ และต่อยอดเป็น data-room artifact ในภายหลัง
2. **HTML deck** — สไลด์ 15 หน้า เผยแพร่เป็น Artifact (ลิงก์ส่งได้) โดยฝัง
   **ภาพหน้าจอ UI จริง 13 ภาพ** ที่ผ่านการเซ็นเซอร์ข้อมูลลูกค้าแล้ว

ขอบเขตของ "technology stack" คือ **ทั้งแพลตฟอร์ม Carmen** ไม่ใช่แค่รีโปนี้ — รวม
frontend web, admin console, mobile, edge gateway, microservices ทั้ง TypeScript
และ Go, ชั้นข้อมูล, identity และ infra

**ไม่อยู่ในขอบเขต:** ตัวเลขธุรกิจทุกชนิด (ขนาดตลาด รายได้ จำนวนลูกค้า จำนวนเงินที่ขอ)
— ยังไม่มีข้อมูล จึงไม่มีสไลด์ Market / Traction / Ask และ**ห้ามกุตัวเลขขึ้นมาเอง**

## Background

### ทำไมไม่เรียกว่า "pitch deck"

deck ที่พูดเรื่อง stack ล้วน ๆ ไม่ทำให้นักลงทุนควักเงิน เขาซื้อตลาด + traction + ทีม
แล้วใช้เทคโนโลยีเป็น*หลักฐานว่าทีมทำได้จริงและลอกยาก* ถ้าตั้งชื่อว่า "Pitch Deck"
แล้วไม่มีสไลด์ Market/Traction/Ask นักลงทุนจะอ่านว่า "ไม่มีให้"

จึงตั้งชื่อว่า **"Carmen — Technology & Product Overview"** ซึ่งเป็นภาคผนวกที่แข็งแรง
ของ pitch และส่งให้ partner สาย technical อ่านก่อนนัดได้ทันที

### วัตถุดิบที่มีอยู่จริง (สำรวจแล้ว 2026-08-07)

| ชั้น | รีโป | Stack |
| --- | --- | --- |
| Web ERP | `carmen-inventory-frontend-react` | Vite 7 · React 19 + React Compiler · TS 5 strict · React Router 7 (132 route files) · Tailwind 4 · TanStack Query 5 / Table 8 / Virtual · react-hook-form 7 + zod 4 · `@xyflow/react` · use-intl (en/th) · Vitest |
| Admin console | `carmen-platform` | React + TS · CodeMirror 6 (แก้ XML report template) · TanStack Table |
| Mobile | `carmen-inventory-mobile` | Expo / React Native · expo-router · expo-secure-store · expo-local-authentication |
| Edge | `api-gateway-apisix` | Apache APISIX 3.9.1 standalone (ไม่ใช้ etcd) · TLS termination · Keycloak JWT · rate-limit · CORS · gzip · tracing · WebSocket proxy |
| API gateway | `carmen-turborepo-backend-v2/apps/backend-gateway` | NestJS · HTTP :4000 / HTTPS :4001 · แปลง HTTP → NestJS TCP transport · Swagger |
| Microservices | เดียวกัน | `micro-business` (5020/6020) · `micro-cluster` (5014/6014) · `micro-file` (5007/6007) · `micro-notification` (5006/6006, Socket.io) · `micro-keycloak` (5013/6013) — สื่อสารด้วย `@MessagePattern()` |
| Go services | `micro-report` · `micro-cronjobs` | Go 1.24 · Gin · GORM · FastReport `.frx` rendering · gocron + Redis lock (รันหลาย replica ได้) |
| Data | — | PostgreSQL: **platform schema ร่วม** (users, clusters, business_units, roles, subscriptions) + **tenant schema แยกต่อ BU** (products, inventory, procurement, recipes) |
| Identity | — | Keycloak · RBAC ผูกกับ cluster / business unit |
| Infra | — | Turborepo · Docker Compose · k8s manifests · S3+CloudFront · GCS+Cloud CDN · Docker nginx image |

### ตัวเลขที่ตรวจนับได้ ณ 2026-08-07

| สิ่งที่นับ | ค่า |
| --- | --- |
| route file ใน frontend (`*.route.tsx`) | 132 |
| ไฟล์ `.ts`/`.tsx` ใน frontend | 1,363 |
| ไฟล์เทสต์ frontend | 112 |
| ไฟล์เทสต์ backend (`*.spec.ts`) | 875 |
| ไฟล์ Go ใน `micro-report` | 64 |
| design spec ใน `docs/superpowers/specs/` | 40 |

**กติกาของตัวเลขในเอกสาร:** ให้อ้าง**จำนวนที่นับได้** (จำนวนไฟล์เทสต์ จำนวน route
จำนวน spec) เท่านั้น **ห้ามอ้างอัตราการผ่านเทสต์** เช่น "all tests pass" หรือ
"100% green" เพราะฝั่ง gateway มี suite ที่แดงค้างอยู่บน main และคำกล่าวอ้างที่
ตรวจแล้วไม่จริงในห้อง due diligence ทำลายความน่าเชื่อถือทั้งฉบับ ตัวเลขทุกตัวต้อง
นับใหม่ตอนเขียนจริง ไม่ใช่ลอกจากตารางนี้

## โครงสร้างงาน

```
docs/investor/
  carmen-technology-overview.md      ← technical memo (EN)
  deck/carmen-tech-deck.html         ← ต้นฉบับ deck → เผยแพร่เป็น Artifact
  assets/*.jpg                       ← ภาพหน้าจอ 13 ภาพ (เซ็นเซอร์แล้ว)
scripts/investor/
  sanitize-dom.js                    ← สคริปต์กวาด DOM ก่อนถ่ายภาพ
```

แต่ละไฟล์มีหน้าที่เดียว: memo คือ**แหล่งความจริง** · deck **หยิบ**จาก memo มาเล่า
ไม่เขียนข้อเท็จจริงใหม่ที่ memo ไม่มี · `sanitize-dom.js` ทำเรื่องเดียวคือแปลงข้อความ
บนหน้าจอ ไม่ยุ่งกับการนำทางหรือการถ่ายภาพ

---

## ส่วนที่ 1 — Deck: 15 สไลด์

| # | สไลด์ | หน้าที่ในเรื่อง |
| --- | --- | --- |
| 1 | Title | Carmen คืออะไรในประโยคเดียว |
| 2 | The operating problem | F&B โรงแรมสั่งของด้วย Excel + แชต · แต่ละสาขาต่างคนต่างทำ · เจ้าของเครือไม่เห็นภาพรวมต้นทุน |
| 3 | What Carmen is · module map | ผังโมดูลทั้งระบบในภาพเดียว |
| 4 | Procure-to-pay as one thread | ภาพหน้าจอ 4 |
| 5 | Inventory you can trust | ภาพหน้าจอ 3 |
| 6 | Configurable, not hard-coded | ภาพหน้าจอ 3 |
| 7 | Built for how hotels actually work | ภาพหน้าจอ 3 |
| 8 | System architecture | ผังชั้นเดียว: edge → gateway → services → data |
| 9 | Multi-tenancy & data isolation | schema ต่อ tenant + platform schema ร่วม |
| 10 | Security & identity | Keycloak · RBAC cluster/BU · access token อยู่ในหน่วยความจำเท่านั้น |
| 11 | Polyglot by purpose | TS ตรงที่ต้องเปลี่ยนบ่อย · Go ตรงที่ต้องทนโหลด |
| 12 | Scale & cost posture | SPA เป็นไฟล์นิ่งบน CDN ไม่มี app server · gateway ไร้สถานะ · cron ล็อกด้วย Redis |
| 13 | Engineering rigor | TS strict · spec-driven (40 spec) · CI gate typecheck + lint + test |
| 14 | Deployment flexibility | SaaS · single-tenant VM · Docker image |
| 15 | Appendix — full stack table | ตารางไว้ให้ถ่ายรูปกลับ |

**สไลด์ 11 และ 14 คือสองสไลด์ที่ตั้งใจให้ทำเงิน** — 11 ตอบว่าทีมตัดสินใจเป็น ไม่ได้
ไล่ตามของใหม่ · 14 ตอบว่าขายเข้าองค์กรใหญ่ได้ ไม่ติดกำแพง compliance เรื่อง on-prem

**สไลด์ roadmap:** ยังไม่มี เพราะ user ยังไม่ได้ให้ทิศทาง ถ้าภายหลังให้มา 3–4 บรรทัด
ให้แทรกเป็นสไลด์ 15 แล้วเลื่อน appendix เป็น 16

### ข้อกำหนดทางเทคนิคของ deck

- **หน้าเดียว self-contained** — CSP ของ Artifact บล็อกทุกคำขอไปโฮสต์ภายนอก:
  CSS/JS ต้อง inline, ภาพต้องเป็น data URI, ห้าม CDN font
- **จำกัด 16MB** หลัง render → ดูหัวข้อ "งบประมาณขนาดไฟล์" ด้านล่าง
- **รองรับธีมของผู้ชม** — นิยาม token สีครบชุดบน `:root` เปล่า ๆ, override ใต้
  `@media (prefers-color-scheme: dark)` ที่กันด้วย `:root:not([data-theme="light"])`,
  และใต้ `:root[data-theme="dark"]` อีกชั้น · `body` ต้องมีพื้นหลังเป็น token ชัดเจน
- **เนื้อหากว้าง (ตาราง/ผัง) ต้องเลื่อนในกล่องตัวเอง** ด้วย `overflow-x: auto` —
  ตัวหน้าห้ามเลื่อนแนวนอน
- **ผังสถาปัตยกรรม** วาดเป็น mermaid (Artifact render ให้เอง) หรือ inline SVG
- ก่อนเขียนหน้า ต้องโหลด skill `artifact-design` และ `artifact-diagramming`

---

## ส่วนที่ 2 — ภาพหน้าจอ 13 ภาพ

จับจาก dev server ที่ต่อ backend จริง แล้วเซ็นเซอร์ — หนึ่งสไลด์เล่าหนึ่งความสามารถ
ไม่ใช่กองรูปให้ดู

### สไลด์ 4 · Procure-to-pay as one thread (4 ภาพ)

| ภาพ | Route | สิ่งที่ต้องเห็นในภาพ |
| --- | --- | --- |
| 01 | `/procurement/purchase-request` | ตาราง list + filter chips |
| 02 | `/procurement/purchase-request/:id` | ตารางรายการสินค้า + chevron workflow track |
| 03 | `/procurement/purchase-order/:id` | หัวเอกสาร + รายการ |
| 04 | `/procurement/goods-receive-note/:id` | รายการรับของ + ตารางย่อย |

จุดขาย: เห็นสายอนุมัติเดินอยู่บนเอกสารจริง ไม่ใช่กระดาษสามใบที่ไม่รู้จักกัน

### สไลด์ 5 · Inventory you can trust (3 ภาพ)

| ภาพ | Route |
| --- | --- |
| 05 | `/inventory-management/physical-count/:id/entry` |
| 06 | `/inventory-management/spot-check/:id` |
| 07 | `/inventory-management/transaction` |

### สไลด์ 6 · Configurable, not hard-coded (3 ภาพ) — สไลด์ที่สำคัญที่สุด

| ภาพ | Route | สิ่งที่ต้องเห็นในภาพ |
| --- | --- | --- |
| 08 | `/system-admin/workflow/:id` | ตัวออกแบบ workflow แบบลากวาง (React Flow) |
| 09 | `/system-admin/default-setting` | หน้าตั้งค่าต่อ BU |
| 10 | `/system-admin/interface` | การต่อ POS / PMS / Accounting |

จุดขาย: โรงแรมใหม่หนึ่งราย = **ตั้งค่า** ไม่ใช่**เขียนโค้ด** → ต้นทุน onboarding
ไม่โตตามจำนวนลูกค้า

### สไลด์ 7 · Built for how hotels actually work (3 ภาพ)

| ภาพ | Route | สิ่งที่ต้องเห็นในภาพ |
| --- | --- | --- |
| 11 | `/pl/:url_token` | พอร์ทัลให้ซัพพลายเออร์กรอกราคาเอง — ไม่ต้องล็อกอิน |
| 12 | `/procurement/purchase-request` โหมดมืด | ธีมมืดเต็มหน้า |
| 13 | `/procurement/purchase-request` ภาษาไทย | คู่เทียบ EN/TH — ต้องเป็น route เดียวกับภาพ 12 |

ภาพ 12 กับ 13 ต้องเป็น route เดียวกันเสมอ เพราะทั้งคู่วางคู่กันเพื่อให้เห็นว่าเป็นหน้า
เดียวกัน ถ้า `/procurement/purchase-request` ถ่ายออกมาไม่ดี ให้เปลี่ยนทั้งคู่ไปหน้าอื่น
พร้อมกัน — ห้ามใช้คนละ route

### สิ่งที่ต้องเตรียมก่อนถ่าย

```bash
# backend รันที่ :4000 (carmen-turborepo-backend-v2)
VITE_DEV_PROXY_TARGET=http://localhost:4000 bun dev
# ล็อกอิน admin@zebra.com
```

ตั้งขนาดหน้าต่างเบราว์เซอร์ให้เท่ากันทุกภาพก่อนเริ่ม (1600×1000) เพื่อให้ภาพในสไลด์
เดียวกันมีสัดส่วนตรงกัน

### ความเสี่ยงที่รู้ล่วงหน้า และทางออก

| ความเสี่ยง | ทางออก |
| --- | --- |
| `/dashboard` — endpoint `dashboard-widgets` คืน 500 บน T02 (บั๊ก backend) หน้า degrade เป็นการ์ดว่าง | ห้ามใช้ dashboard เป็นภาพ 12/13 ถ้าถ่ายออกมาไม่สวย — เปลี่ยนไปใช้หน้าอื่นที่มีข้อมูลเต็ม |
| PR list — คอลัมน์ Created/Updated ว่าง (บั๊ก `@EnrichAuditUsers` ฝั่ง backend) | ปิดสองคอลัมน์นั้นผ่าน column toggle ก่อนถ่ายภาพ 01 |
| เอกสารบางใบข้อมูลน้อยจนหน้าดูโล่ง | `PO20260500006` และ `SR260800001` / `SR260800002` ยืนยันแล้วว่ามีประวัติ ใบอื่นให้ไล่หาตอนถ่าย ถ้าใบไหนโล่งเกินไปให้เปลี่ยนใบ |
| หน้าจอไหนถ่ายไม่ได้เรื่องเลย | **ตัดภาพนั้นทิ้ง** แล้วบันทึกในบันทึกส่งมอบว่าตัดเพราะอะไร — ห้ามใส่ภาพหน้า error หรือหน้าโล่งลง deck เด็ดขาด |

---

## ส่วนที่ 3 — การเซ็นเซอร์ข้อมูล

backend `:4000` ชี้ไปฐานข้อมูล dev ที่ใช้ร่วมกัน (`dev.blueledgers.com`) ภาพหน้าจอที่จับ
จึงมีชื่อ vendor / ชื่อโรงแรม / ราคาจริงของลูกค้าติดมาได้ และเอกสารชุดนี้จะถูกส่งออก
นอกองค์กร

### สองชั้น

**ชั้นที่ 1 — `scripts/investor/sanitize-dom.js`** ฉีดผ่าน Chrome ก่อนถ่ายทุกภาพ

หลักคิด: **ภาพหน้าจอบรรจุได้เฉพาะสิ่งที่อยู่ใน DOM ตอนถ่าย** ดังนั้นการกวาด DOM
ให้ทั่วก็เพียงพอโดยตัวมันเอง — ไม่ต้องดักที่ชั้น `fetch` (ซึ่งจะต้องแตะ vite config
เพื่อให้อยู่รอดข้ามการ navigate = เอาโค้ดเฉพาะกิจเข้ารีโปโดยไม่จำเป็น)

สิ่งที่ต้องกวาด:

- text node ทุกตัว (เดินด้วย `TreeWalker`, `NodeFilter.SHOW_TEXT`)
- `input.value` / `textarea.value` — ตั้งผ่าน property ไม่ใช่ attribute
- `placeholder` · `title` · `alt` · `aria-label`
- ข้อความใน `<option>`
- `<text>` ภายใน SVG (ป้ายกำกับกราฟ recharts)

การ map ใช้ **hash → ดัชนีในรายการชื่อสมมติ** เพื่อให้ input เดิมได้ผลลัพธ์เดิมเสมอ →
vendor รายเดียวกันปรากฏชื่อเดียวกันทุกหน้า ชื่อสมมติต้องดูสมจริงระดับพูดในห้องประชุมได้
(`Grand Aurora Hotel`, `Northwind Provisions Co.`, `Siam Fresh Produce`) ไม่ใช่
`XXXXX` หรือ `Test Vendor 1`

ขอบเขตที่ต้องแปลง: ชื่อองค์กร ชื่อคน อีเมล เบอร์โทร ที่อยู่

**ไม่แปลงตัวเลขราคา/จำนวน** เพราะการสุ่มตัวเลขจะทำให้ยอดรวมในตารางไม่ตรงกัน และ
นักลงทุนที่บวกเลขตามจะจับได้ทันที ซึ่งเสียหายกว่าตัวเลขที่โชว์ไป เมื่อชื่อทุกชื่อถูก
เปลี่ยนแล้ว ราคาสินค้าทั่วไปก็ระบุตัวลูกค้าไม่ได้

**ข้อยกเว้น:** ถ้าหน้าไหนแสดง price list ที่เป็นราคาตามสัญญากับซัพพลายเออร์รายเดียว
(เช่น `/vendor-management/price-list/:id` หรือ `/pl/:url_token`) ตัวเลขชุดนั้นอ่อนไหว
เชิงพาณิชย์แม้ไม่มีชื่อ — ให้**เลือกเรกคอร์ดอื่นที่เป็นข้อมูลทดสอบ** แทนการแก้ตัวเลข
ถ้าไม่มีเรกคอร์ดทดสอบเลย ให้ตัดภาพนั้นทิ้งตามกติกาในตารางความเสี่ยง

ต้องรันสคริปต์ใหม่**ทุกครั้ง**หลังนำทางหรือหลังเปิด dropdown/dialog ที่จะปรากฏในภาพ
เพราะ DOM เปลี่ยน

**ชั้นที่ 2 — ตรวจด้วยตาทุกภาพ** เปิดดูทุกไฟล์ก่อนใส่ลง deck นี่คือตาข่ายจริง
ชั้นที่ 1 เป็นแค่ตัวลดงาน ภาพใดยังเหลือข้อมูลระบุตัวตน → กวาดซ้ำแล้วถ่ายใหม่

### ไม่แตะฐานข้อมูล

**ห้ามสร้าง demo BU หรือ seed ข้อมูลลงฐาน dev** ที่ใช้ร่วมกัน — เป็นฐานเดียวกับที่
ทีมอื่นใช้อยู่

---

## ส่วนที่ 4 — Technical memo: 12 หัวข้อ

`docs/investor/carmen-technology-overview.md` — ภาษาอังกฤษ เขียนแบบ tech memo
ไม่ใช่โบรชัวร์

1. **Executive summary** — Carmen คืออะไร + จุดยืนทางเทคนิค 5 บรรทัด
2. **Product surface** — ตารางโมดูลทั้งหมดกับสิ่งที่แต่ละตัวทำ
3. **System architecture** — ผัง mermaid + ตารางความรับผิดชอบของแต่ละ service
4. **Multi-tenancy & data model** — platform schema เทียบ tenant schema, ลำดับชั้น
   cluster → business unit
5. **Identity, authorization & security** — Keycloak, ขอบเขตสิทธิ์ระดับ cluster/BU,
   การออกแบบ token (access token อยู่ในหน่วยความจำ · refresh token ใน localStorage
   พร้อมจุดสลับไป cookie), การเข้ารหัส secret (`SECRET_ENCRYPTION_KEY`), audit trail
6. **Technology choices & rationale** — ไล่ทีละชั้นว่า*ทำไม* (ท่อน polyglot
   เขียนเป็นความเรียงตรงนี้)
7. **Scalability & operational posture** — gateway ไร้สถานะ · SPA เป็นไฟล์นิ่งบน CDN ·
   cron ล็อกด้วย Redis รันหลาย replica · APISIX จัดการ TLS/rate-limit ที่ขอบ
8. **Deployment models** — SaaS multi-tenant · single-tenant VM · Docker image ·
   static CDN — และแต่ละแบบแปลว่าอะไรตอนขายเข้าองค์กร
9. **Engineering practice & quality** — TS strict · spec-driven (40 spec ในรีโป) ·
   CI gate typecheck + lint + test · จำนวนไฟล์เทสต์
10. **Extensibility & integrations** — เฟรมเวิร์กต่อ POS/PMS/Accounting ·
    เทมเพลตรายงาน FastReport · เทมเพลตแจ้งเตือน
11. **Technical roadmap & known constraints**
12. **Appendix** — ตาราง stack เต็ม + แผนที่รีโป

### เส้นที่ห้ามข้ามในหัวข้อ 11

เอกสารควรยอมรับข้อจำกัด**เชิงสถาปัตยกรรม**อย่างตรงไปตรงมา (นักลงทุนเชื่อถือเอกสารที่
กล้าบอกจุดอ่อนมากกว่าเอกสารที่สมบูรณ์แบบ) แต่**ต้องไม่ใช่รายการบั๊กภายใน**

| เขียนได้ | เขียนไม่ได้ |
| --- | --- |
| "CORS hardening at the edge is being finalized ahead of public-cloud rollout" | "endpoint `/api/me/dashboard-widgets` คืน 500" |
| "Report generation runs as a separate Go service so heavy rendering never blocks the API tier" | ชื่อไฟล์ที่พัง · หมายเลข PR · ชื่อรีโปภายใน |
| "Quantity precision is being aligned end-to-end between the API contract and the storage layer" | "`ValidateSchema.quantity` เป็น `z.number().int()` แต่ DB เป็น `Decimal(20,5)`" |

หลักการเดียว: พูดถึง**ทิศทางที่กำลังแก้** ไม่ใช่**อาการที่พัง**

---

## งบประมาณขนาดไฟล์

Artifact จำกัด 16MB หลัง render และภาพต้องฝังเป็น data URI (โหลดจากภายนอกไม่ได้)
PNG เต็มจอ 13 ภาพ + base64 (+33%) มีสิทธิ์ทะลุ

**วิธี:** ย่อกว้างสุด 1600px แล้วบันทึกเป็น JPEG คุณภาพ 82 ด้วย `sips` (มากับ macOS)

```bash
sips -Z 1600 -s format jpeg -s formatOptions 82 in.png --out out.jpg
```

ได้ราว 150–250KB ต่อภาพ → รวม ~3MB หลัง base64 ยังคมพอฉายโปรเจกเตอร์

**ต้องวัดจริงก่อนเผยแพร่:** รวมขนาด `docs/investor/assets/*.jpg` × 1.37 แล้วบวก
ขนาด HTML ถ้าเกิน 12MB ให้ลดคุณภาพเป็น 75 หรือย่อเหลือ 1400px ก่อนเรียก Artifact
— ไม่ใช่ลองเผยแพร่แล้วรอให้ล้มเหลว

## ลำดับงาน

1. เขียน `scripts/investor/sanitize-dom.js`
2. ตั้ง dev server + backend, ล็อกอิน, ตั้งขนาดหน้าต่าง
3. จับภาพทีละภาพ: นำทาง → รอโหลด → ฉีด sanitizer → ถ่าย → **เปิดดูด้วยตา** →
   ผ่านค่อยไปภาพถัดไป
4. แปลงทุกภาพเป็น JPEG ตามงบขนาดไฟล์ วางที่ `docs/investor/assets/`
5. เขียน `docs/investor/carmen-technology-overview.md`
6. เขียน `docs/investor/deck/carmen-tech-deck.html` (โหลด `artifact-design` +
   `artifact-diagramming` ก่อน)
7. วัดขนาดรวม → เผยแพร่เป็น Artifact
8. commit ทุกอย่าง

ขั้นตอน 5 กับ 6 ทำหลังมีภาพแล้ว เพราะจำนวนภาพที่รอดจริงอาจไม่ครบ 13 และโครงสไลด์
4–7 ต้องปรับตามของที่มีจริง

## เกณฑ์ว่าเสร็จ

- `docs/investor/carmen-technology-overview.md` ครบ 12 หัวข้อ ไม่มี TBD
- deck เผยแพร่แล้ว มีลิงก์ Artifact ส่งได้
- ภาพทุกภาพใน deck ผ่านการตรวจด้วยตาแล้วว่าไม่มีชื่อองค์กร ชื่อคน อีเมล เบอร์โทร
  หรือที่อยู่จริงหลงเหลือ
- ไม่มีคำกล่าวอ้างเชิงตัวเลขที่ตรวจสอบไม่ได้ และไม่มีตัวเลขธุรกิจที่กุขึ้น
- ไม่มีรายละเอียดบั๊กภายใน ชื่อไฟล์ หรือหมายเลข PR ในสื่อทั้งสองชิ้น
- ไม่มีการเขียนใด ๆ ลงฐานข้อมูล dev
