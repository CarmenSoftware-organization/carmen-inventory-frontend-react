# Email profiles ต่อ BU + ส่ง PO ให้ vendor ทางอีเมล — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ให้แต่ละ business unit ตั้งโปรไฟล์อีเมลผู้ส่งได้หลายอัน แล้วส่งใบสั่งซื้อ
(พร้อมไฟล์ PDF แนบ) ถึงผู้ขายจากหน้า PO ได้โดยเลือกโปรไฟล์ตอนส่ง

**Architecture:** โปรไฟล์เก็บเป็น app-config key เดียว (`email_profiles`) ต่อ BU ใช้กลไก
encrypt/mask ของ `app-config.service.ts` เดิม · PDF ผลิตโดยเพิ่มเส้น export ใน micro-report
ที่ยิง viewer `/api/Report/Export/Pdf` · ส่งเมลผ่าน RPC `notifications.send-with-config`
ที่มีอยู่แล้ว (ขยายให้รับ cc + attachment) · ประวัติการส่งลง `tb_activity` ของ PO

**Tech Stack:** Go/gin (micro-report) · NestJS + Prisma (backend-v2: gateway,
micro-business, micro-notification) · React + Vite + react-router 7 + TanStack Query
(frontend)

**Spec:** `docs/superpowers/specs/2026-09-08-po-email-profiles-design.md`
(อยู่ในรีโป carmen-inventory-frontend-react)

## Global Constraints

- **ไม่เขียนไฟล์เทสต์ใหม่** ตามคู่มือของผู้ใช้ — ข้ามทุกขั้นที่บอกให้เขียน/รันเทสต์ก่อน
  implement แต่ **static check ไม่ใช่เทสต์ ต้องรันเสมอ** และ **เทสต์เดิมต้องเขียว 100%**
  ก่อน merge (ยกเว้น gateway ที่มี 15 suites แดงอยู่ก่อนแล้วบน main — ห้ามทำให้แดงเพิ่ม)
- **ลำดับ deploy: micro-report → backend-v2 → frontend** ห้ามสลับ FE ที่ขึ้นก่อนจะเรียก
  endpoint ที่ยังไม่มี
- **`SECRET_ENCRYPTION_KEY` ต้องมีในทุก environment** ที่จะใช้ฟีเจอร์นี้ ไม่งั้น save 400
- รหัสผ่าน SMTP **ห้ามออกทาง HTTP สาธารณะ** GET คืน `***ENCRYPTED***` เสมอ
- **ห้าม squash-merge รีโป frontend** ใช้ `gh pr merge --merge` (ไม่งั้น changelog รอบ
  ถัดไปว่างเปล่าเงียบ ๆ)
- **prettier hook จะจัดไฟล์ backend-v2 ทับหลังทุก edit** — ไฟล์บน main ไม่ compliant อยู่แล้ว
  ต้อง `git checkout --` ไฟล์ที่ไม่ได้ตั้งใจแก้ทิ้งก่อน commit ทุกครั้ง
- **`:4000` / dev DB เป็นของใช้ร่วมกัน** เขียนอะไรต้องจดค่าเดิมและคืน
- **แก้ enum/schema ของ prisma แล้วต้อง `bun run db:generate` และ `bun run build`**
  ที่ package schema นั้น ไม่งั้น app อื่นยังเห็นชนิดเก่าจาก dist
- ค่า `key` ของ app config คือ `email_profiles` (ตัวเล็ก ขีดล่าง) ตรงกันทั้ง 3 รีโป

---

## File Structure

**micro-report (Go)**
- Modify: `service/render/viewer_client.go` — เพิ่ม `ExportPdfRequest` + `ExportPDF()`
- Modify: `service/report_service.go` — เพิ่ม `ExportReportWithExternalData()`
- Modify: `controller/report_controller.go` — เพิ่ม route `export-pdf-with-data`

**carmen-turborepo-backend-v2**
- Modify: `apps/micro-business/src/app-config/app-config.service.ts` — wildcard secret path,
  `EmailProfilesSchema`, `getEmailProfileForSend()`, `testEmailProfile()`
- Modify: `apps/micro-notification/src/platform-email/platform-email.service.ts` +
  `.controller.ts` — `SendWithConfigInput` รับ `to[]`, `cc[]`, `attachments[]`
- Modify: `apps/micro-business/src/common/print-report.helper.ts` — `exportPdfViaMicroReport()`
- Modify: `apps/micro-business/src/procurement/purchase-order/purchase-order.service.ts` —
  แยก `buildPrintInput()` ออกจาก `printToReport()` แล้วเพิ่ม `sendEmailToVendor()`
- Modify: `apps/micro-business/src/procurement/purchase-order/purchase-order.controller.ts` —
  MessagePattern ใหม่
- Modify: `packages/rpc-contract` — เพิ่ม pattern `PurchaseOrders.sendEmailToVendor`,
  `AppConfigs.testEmailProfile`
- Modify: `apps/backend-gateway/src/application/purchase-orders/purchase-orders.controller.ts`
  + `.service.ts` — `POST :purchase_order_id/send-email`
- Modify: `apps/backend-gateway/src/config/app-config/*` — `POST test-email-profile`
- Modify: `packages/prisma-shared-schema-tenant/prisma/schema.prisma` + migration —
  `enum_activity_action` += `email_sent`
- Modify: app-id allowlist — `purchaseOrder.sendEmail`, `appConfig.testEmailProfile`

**carmen-inventory-frontend-react**
- Create: `types/email-profile.ts`
- Create: `routes/system-admin/email-profile/use-email-profiles.ts`
- Create: `routes/system-admin/email-profile/email-profile-schema.ts`
- Create: `routes/system-admin/email-profile/email-profile-dialog.tsx`
- Create: `routes/system-admin/email-profile/email-profile.route.tsx`
- Create: `routes/procurement/purchase-order/po-send-email-dialog.tsx`
- Create: `routes/procurement/purchase-order/use-po-send-email.ts`
- Modify: `constant/api-endpoints.ts`, `constant/query-keys.ts`, `routes/router.tsx`,
  `constant/module-list.ts`, `messages/en.json`, `messages/th.json`,
  `routes/procurement/purchase-order/po-header.tsx`

---

## Phase A — micro-report: ผลิต PDF ของเอกสาร

### Task A1: ยืนยันสัญญาของ viewer `/api/Report/Export/Pdf` ด้วยของจริง

**Files:** ไม่แก้โค้ด — เป็นการสำรวจที่ผลลัพธ์กำหนดหน้าตาของ Task A2

**Interfaces:**
- Produces: ข้อเท็จจริง 3 อย่างที่ Task A2 ต้องใช้ — (1) `file` ต้อง base64 หรือ XML ดิบ
  (2) `data` เป็น JSON string ของ object เดียวกับที่ viewer รับหรือไม่
  (3) response เป็น PDF byte, base64 string หรือ JSON ที่มี url

- [ ] **Step 1: ดึง template จริงหนึ่งใบมาไว้ใช้ทดสอบ**

รัน micro-report ในเครื่อง (หรือใช้ dev) แล้วเรียกเส้นที่ทำงานอยู่แล้วเพื่อดู payload
ที่มันส่งให้ viewer — `service/render/viewer_client.go` เขียนไฟล์ debug ให้อยู่แล้ว:

```bash
# ยิงเส้น viewer-with-data ที่ทำงานได้อยู่แล้ว แล้วอ่าน payload ที่มันส่งออกไป
curl -s -X POST "http://localhost:6015/api/{BU_CODE}/report/viewer-with-data" \
  -H 'Content-Type: application/json' \
  -d '{"template_name":"{TEMPLATE_NAME}","data":{"POHeader":[{"PoNo":"TEST"}],"PODetail":[]}}'
cat /tmp/viewer_last_request.json | head -c 400   # ได้ Title/Name/File/Data ที่ viewer รับจริง
```

- [ ] **Step 2: ยิง Export/Pdf ด้วย `file` + `data` ชุดเดียวกัน**

```bash
python3 - <<'EOF'
import json
v = json.load(open('/tmp/viewer_last_request.json'))
json.dump({"filename": v["Name"], "file": v["File"], "data": json.dumps(v["Data"])},
          open('/tmp/export_req.json', 'w'))
EOF
curl -s -o /tmp/export_resp.bin -w 'status=%{http_code} type=%{content_type} size=%{size_download}\n' \
  -X POST 'https://report.blueledgers.cloud/api/Report/Export/Pdf' \
  -H 'accept: text/plain' -H 'Content-Type: application/json' \
  --data-binary @/tmp/export_req.json
file /tmp/export_resp.bin; head -c 80 /tmp/export_resp.bin | xxd | head -3
```

- [ ] **Step 3: บันทึกผลลงหัวข้อ "การผลิต PDF" ของ spec แล้ว commit**

เขียนสามบรรทัด: content-type ที่ได้จริง · `file` ต้องเป็น base64 หรือ XML ดิบ ·
`data` เป็น JSON string ที่ห่อ object เดิมหรือรูปอื่น

```bash
git -C <frontend repo> add docs/superpowers/specs/2026-09-08-po-email-profiles-design.md
git -C <frontend repo> commit -m "docs: บันทึกสัญญาจริงของ Export/Pdf ที่ทดสอบแล้ว"
```

**หยุดที่นี่ถ้า response ไม่ใช่ PDF byte** — ถ้าได้ base64 หรือ url กลับมา ให้รายงาน
แล้วรอคำสั่ง เพราะ Task A2 ต้องเปลี่ยนรูป (ไม่ใช่แค่แก้ตัวแปร)

---

### Task A2: `ExportPDF` ใน viewer client + service + route ของ micro-report

**Files:**
- Modify: `service/render/viewer_client.go` (ต่อท้ายไฟล์)
- Modify: `service/report_service.go` (เพิ่ม method ถัดจาก `ViewReportWithExternalData`)
- Modify: `controller/report_controller.go` (`RegisterRoutes` บรรทัด 34-46 + handler ใหม่)

**Interfaces:**
- Consumes: ผลจาก Task A1
- Produces: `POST /api/:buCode/report/export-pdf-with-data`
  body `{ "template_name": string, "data": {…} }` → `200 application/pdf` (byte)
  หรือ `{ "error": string }` เมื่อผิดพลาด — Task B4 เรียกเส้นนี้

- [ ] **Step 1: เพิ่ม `ExportPDF` ใน `service/render/viewer_client.go`**

payload ของ Export/Pdf **ไม่เหมือน** `ViewerRequest` (ตัวพิมพ์เล็ก และ `data` เป็น string)
จึงต้องมี struct ของตัวเอง ห้ามใช้ `ViewerRequest` ซ้ำ:

```go
// ExportPdfRequest is the payload for the viewer's PDF export endpoint.
// Field names differ from ViewerRequest on purpose: this endpoint takes
// lower-case keys and wants `data` as a JSON *string*, not an object.
type ExportPdfRequest struct {
	FileName string `json:"filename"`
	File     string `json:"file"`
	Data     string `json:"data"`
}

// ExportPDF sends template + data to the viewer and returns the rendered PDF bytes.
func (c *ViewerClient) ExportPDF(ctx context.Context, req *ExportPdfRequest) ([]byte, error) {
	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshal export request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/api/Report/Export/Pdf", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Accept", "application/pdf")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("export request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read export response: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("export failed (status %d): %s", resp.StatusCode, string(respBody))
	}
	// A viewer error page comes back as 200 HTML in some deployments — refuse it
	// rather than mailing an HTML file named .pdf to a vendor.
	if len(respBody) < 5 || string(respBody[:5]) != "%PDF-" {
		return nil, fmt.Errorf("export returned non-PDF content (%d bytes)", len(respBody))
	}
	return respBody, nil
}
```

*(ถ้า Task A1 พบว่า response เป็น base64 ให้ decode ก่อนตรวจ `%PDF-` — ไม่ใช่ลบการตรวจทิ้ง)*

- [ ] **Step 2: เพิ่ม `ExportReportWithExternalData` ใน `service/report_service.go`**

วางถัดจาก `ViewReportWithExternalData` และ **ใช้ `rewriteFormTemplateWithData` ตัวเดียวกัน**
เพื่อให้ PDF หน้าตาตรงกับที่พิมพ์ผ่าน viewer เป๊ะ:

```go
// ExportReportWithExternalData renders the same document a viewer print would
// produce, but returns the PDF bytes instead of a viewer URL. Used by
// micro-business when a document has to be attached to an email.
func (s *ReportService) ExportReportWithExternalData(
	ctx context.Context,
	templateName string,
	buCode string,
	data map[string]any,
) ([]byte, string, error) {
	tmpl, err := s.templateRepo.FindByName(ctx, templateName)
	if err != nil {
		return nil, "", fmt.Errorf("find template by name: %w", err)
	}

	buName := buCode
	if name, nerr := s.db.BuName(ctx, buCode); nerr == nil {
		buName = name
	}

	fileContent := tmpl.Content
	if len(fileContent) > 0 && fileContent[0] == '<' {
		fileContent = rewriteFormTemplateWithData(fileContent, buName, data)
		fileContent = base64.StdEncoding.EncodeToString([]byte(fileContent))
	}

	dataJSON, err := json.Marshal(data)
	if err != nil {
		return nil, "", fmt.Errorf("marshal export data: %w", err)
	}

	pdf, err := s.viewerClient.ExportPDF(ctx, &render.ExportPdfRequest{
		FileName: tmpl.Name,
		File:     fileContent,
		Data:     string(dataJSON),
	})
	if err != nil {
		return nil, "", fmt.Errorf("viewer export: %w", err)
	}

	s.logger.Info("export-pdf-with-data done",
		zap.String("template", tmpl.Name),
		zap.String("bu_code", buCode),
		zap.Int("pdf_bytes", len(pdf)),
	)
	return pdf, tmpl.Name, nil
}
```

ถ้า `encoding/json` ยังไม่ถูก import ในไฟล์นี้ ให้เพิ่ม

- [ ] **Step 3: เพิ่ม route + handler ใน `controller/report_controller.go`**

ใน `RegisterRoutes` เพิ่มบรรทัดถัดจาก `viewer-with-data`:

```go
	r.POST("/api/:buCode/report/export-pdf-with-data", h.exportPdfWithData)
```

handler (วางถัดจาก `viewReportWithData` และ **ใช้ `viewerWithDataRequest` เดิมซ้ำ**
เพราะ body รูปเดียวกัน):

```go
// exportPdfWithData renders a document to PDF bytes using caller-supplied data.
// Same request body as viewer-with-data; the response is the file, not a URL.
func (h *ReportHTTPHandler) exportPdfWithData(c *gin.Context) {
	buCode := c.Param("buCode")
	if buCode == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "buCode is required"})
		return
	}

	var req viewerWithDataRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid JSON: " + err.Error()})
		return
	}
	if req.TemplateName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "template_name is required"})
		return
	}
	if req.Data == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "data is required"})
		return
	}

	pdf, name, err := h.reportSvc.ExportReportWithExternalData(c.Request.Context(), req.TemplateName, buCode, req.Data)
	if err != nil {
		h.logger.Error("export-pdf-with-data failed",
			zap.Error(err),
			zap.String("template_name", req.TemplateName),
			zap.String("bu_code", buCode),
		)
		status := http.StatusInternalServerError
		if errors.Is(err, gorm.ErrRecordNotFound) {
			status = http.StatusNotFound
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%q", name+".pdf"))
	c.Data(http.StatusOK, "application/pdf", pdf)
}
```

- [ ] **Step 4: build + vet + เทสต์เดิม**

```bash
cd <micro-report>
go build ./... && go vet ./... && go test ./...
```

คาดหวัง: ผ่านทั้งหมด (ไม่ได้เพิ่มไฟล์เทสต์ใหม่ตาม Global Constraints)

- [ ] **Step 5: ยิงจริงเทียบกับ viewer-with-data**

```bash
curl -s -o /tmp/po.pdf -w '%{http_code} %{content_type} %{size_download}\n' \
  -X POST "http://localhost:6015/api/{BU_CODE}/report/export-pdf-with-data" \
  -H 'Content-Type: application/json' \
  -d '{"template_name":"{TEMPLATE_NAME}","data":{"POHeader":[{"PoNo":"TEST"}],"PODetail":[]}}'
file /tmp/po.pdf   # ต้องเป็น PDF document
```

- [ ] **Step 6: commit**

```bash
git add service/render/viewer_client.go service/report_service.go controller/report_controller.go
git commit -m "feat(report): export เอกสารเป็น PDF byte ผ่าน viewer /api/Report/Export/Pdf"
```

---

## Phase B — backend-v2

### Task B1: secret path แบบ wildcard + schema ของ `email_profiles`

**Files:**
- Modify: `apps/micro-business/src/app-config/app-config.service.ts`
  (`secretPathsFor` ~L169, `readSecret` ~L186, `writeSecret` ~L205, ท้ายไฟล์)

**Interfaces:**
- Produces: `getEmailProfileForSend(bu_code, profile_id)` →
  `{ id, name, enabled, smtp: { host, port, secure, username, password }, from_email,
  from_name, reply_to, default_cc, subject_template, body_template } | null`
  (password ถอดรหัสแล้ว) — Task B3 และ B5 เรียกใช้

- [ ] **Step 1: ให้ `readSecret` / `writeSecret` เดิน `*` ข้าม array ได้**

แทนที่สองเมธอดเดิมด้วยเวอร์ชันที่รู้จัก segment `*` (ยังคงสัญญาเดิมทุกอย่างสำหรับ
path ที่ไม่มี `*` — `report_email` และ interface config ต้องไม่เปลี่ยนพฤติกรรม):

```ts
  /**
   * Read every string at `path` inside `obj`. A `*` segment walks each element of an
   * array, so one path can address a secret that repeats inside a list.
   * อ่านค่า string ทุกตัวตาม `path` — segment `*` เดินทุกสมาชิกของ array
   */
  private readSecrets(obj: unknown, path: readonly string[]): string[] {
    if (path.length === 0) return typeof obj === 'string' ? [obj] : [];
    const [head, ...rest] = path;
    if (head === '*') {
      if (!Array.isArray(obj)) return [];
      return obj.flatMap((item) => this.readSecrets(item, rest));
    }
    if (!obj || typeof obj !== 'object') return [];
    return this.readSecrets((obj as Record<string, unknown>)[head], rest);
  }

  /**
   * Shallow-copy `obj` along `path`, replacing each leaf via `next(current)`.
   * Returning the current value unchanged from `next` leaves that leaf alone.
   */
  private mapSecrets(
    obj: unknown,
    path: readonly string[],
    next: (current: string) => string,
  ): unknown {
    if (path.length === 0) return typeof obj === 'string' ? next(obj) : obj;
    const [head, ...rest] = path;
    if (head === '*') {
      if (!Array.isArray(obj)) return obj;
      return obj.map((item) => this.mapSecrets(item, rest, next));
    }
    if (!obj || typeof obj !== 'object') return obj;
    const src = obj as Record<string, unknown>;
    return { ...src, [head]: this.mapSecrets(src[head], rest, next) };
  }
```

- [ ] **Step 2: ให้ mask / encrypt / restore ใช้เมธอดใหม่**

`maskSensitiveFields`, `encryptSecretFields`, `restoreMaskedSecrets` เดิมเรียก
`readSecret`/`writeSecret` ทีละ path — เปลี่ยนเป็น:

```ts
  private maskSensitiveFields(key: string, value: unknown): unknown {
    const paths = this.secretPathsFor(key);
    if (!paths) return value;
    let out = value;
    for (const path of paths) {
      out = this.mapSecrets(out, path, (current) => (current ? MASK : current));
    }
    return out;
  }
```

`encryptSecretFields`: `this.mapSecrets(out, path, (c) => (c && !isEncrypted(c) ? encryptSecret(c) : c))`

`restoreMaskedSecrets`: ต้องจับคู่ค่าเดิมตามลำดับที่อ่านได้ — อ่านของเดิมด้วย
`readSecrets(stored, path)` แล้วเดินแทนที่ตามลำดับเดียวกัน และ **คงพฤติกรรมเดิมที่ throw
เมื่อ caller ส่ง mask มาแต่ไม่มีของเดิมให้คืน** (การเก็บ mask ทับจะทำลาย secret):

```ts
  private restoreMaskedSecrets(key: string, incoming: unknown, stored: unknown): unknown {
    const paths = this.secretPathsFor(key);
    if (!paths) return incoming;
    let out = incoming;
    for (const path of paths) {
      const previous = this.readSecrets(stored, path);
      let i = -1;
      out = this.mapSecrets(out, path, (current) => {
        i += 1;
        if (current !== MASK) return current;
        const restored = previous[i];
        if (!restored) {
          throw new Error(`Cannot save ${key}: no stored secret to restore for ${path.join('.')}`);
        }
        return restored;
      });
    }
    return out;
  }
```

> ลำดับของ `profiles[]` จึงสำคัญ: ฟอร์มต้องส่งกลับทั้ง array ในลำดับเดิม — ฝั่ง FE
> (Task C2) แก้ในที่ ไม่เรียงใหม่ ไม่กรองทิ้งก่อนส่ง

- [ ] **Step 3: ประกาศ secret path ของ key ใหม่**

ใน `secretPathsFor` เพิ่มก่อน `return undefined`:

```ts
    if (key === 'email_profiles') return [['profiles', '*', 'smtp', 'password']];
```

- [ ] **Step 4: เพิ่ม schema + ตัวอ่านสำหรับส่งจริง**

ท้ายไฟล์ (ข้าง `ReportEmailSchema`):

```ts
const EmailProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  enabled: z.boolean().default(true),
  smtp: z.object({
    host: z.string().min(1),
    port: z.number().int().min(1).max(65535),
    secure: z.boolean().default(true),
    username: z.string().min(1),
    password: z.string().min(1),
  }),
  from_email: z.string().email(),
  from_name: z.string().default(''),
  reply_to: z.string().default(''),
  default_cc: z.array(z.string()).default([]),
  subject_template: z.string().default(''),
  body_template: z.string().default(''),
});

const EmailProfilesSchema = z.object({
  default_profile_id: z.string().nullable().default(null),
  profiles: z.array(EmailProfileSchema).default([]),
});

export type EmailProfile = z.infer<typeof EmailProfileSchema>;
```

แล้วเพิ่มเมธอด (ล้อ `getReportEmailForSend` ทั้งเรื่อง connection และการถอดรหัส):

```ts
  /**
   * Internal-only: one email profile of a BU with its SMTP password DECRYPTED.
   * Never expose over public HTTP — `get()` masks it for the UI, this does not.
   * @param bu_code - Business unit code / รหัสหน่วยธุรกิจ
   * @param profile_id - Profile to resolve; omit to use the BU's default / โปรไฟล์ที่ต้องการ ไม่ระบุ = ค่าเริ่มต้นของ BU
   * @returns The profile with a usable password, or null when unset / โปรไฟล์พร้อมรหัสผ่านที่ใช้ได้ หรือ null
   */
  async getEmailProfileForSend(bu_code: string, profile_id?: string): Promise<EmailProfile | null> {
    const prisma = await this.tenantService.getdb_connection_for_external(bu_code, 'micro-notification');
    const row = await prisma.tb_application_config.findFirst({
      where: { key: 'email_profiles', deleted_at: null },
      select: { value: true },
    });
    if (!row) return null;

    const parsed = EmailProfilesSchema.safeParse(row.value);
    if (!parsed.success) {
      throw new Error(
        `Invalid email_profiles for BU ${bu_code}: ${parsed.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; ')}`,
      );
    }
    const { profiles, default_profile_id } = parsed.data;
    const wanted = profile_id || default_profile_id;
    const profile = profiles.find((p) => p.id === wanted) ?? null;
    if (!profile) return null;
    if (isEncrypted(profile.smtp.password)) {
      profile.smtp.password = decryptSecret(profile.smtp.password);
    }
    return profile;
  }
```

- [ ] **Step 5: typecheck**

```bash
cd <backend-v2> && bunx tsc --noEmit
```

`turbo run build` **ไม่ใช่ด่าน type** (nest build ใช้ SWC ที่ strip type) ต้องรัน tsc เอง

- [ ] **Step 6: เทสต์เดิมของ app-config ต้องเขียว**

```bash
cd <backend-v2> && bun test apps/micro-business/src/app-config
```

เทสต์เดิมครอบ `report_email` (path ไม่มี `*`) อยู่แล้ว — ถ้าแดง แปลว่า refactor
เปลี่ยนพฤติกรรมเดิม ต้องแก้ให้เขียวก่อนไปต่อ

- [ ] **Step 7: commit** (อย่าลืม `git checkout --` ไฟล์ที่ prettier hook ไปจัดทับ)

```bash
git add apps/micro-business/src/app-config/app-config.service.ts
git commit -m "feat(app-config): รองรับ secret ใน array (email_profiles) + ตัวอ่านโปรไฟล์สำหรับส่งเมล"
```

---

### Task B2: `send-with-config` รองรับผู้รับหลายคน, CC และไฟล์แนบ

**Files:**
- Modify: `apps/micro-notification/src/platform-email/platform-email.service.ts`
  (`SendWithConfigInput` ~L64, `sendWithConfig`)
- Modify: `apps/micro-notification/src/platform-email/platform-email.controller.ts` (~L70)

**Interfaces:**
- Consumes: —
- Produces: `SendWithConfigInput` = `{ smtp_config, to: string | string[], cc?: string[],
  subject, html, text?, from?: { email, name? }, reply_to?, attachments?: Array<{ filename,
  content_base64, content_type }> }` → `{ sent: boolean, reason?: string, rejected?: string[] }`
  — Task B5 เรียกผ่าน RPC `Notifications.sendWithConfig`

- [ ] **Step 1: ขยาย input type**

```ts
export interface SendWithConfigAttachment {
  filename: string;
  /** Base64 payload; decoded here so the RPC boundary stays JSON-safe. */
  content_base64: string;
  content_type: string;
}

export interface SendWithConfigInput {
  /** Caller-supplied SMTP config, validated against SmtpConfigSchema before use — never trusted as typed at the RPC boundary. */
  smtp_config: unknown;
  /** One address or many; a caller sending to several vendor contacts passes an array. */
  to: string | string[];
  cc?: string[];
  subject: string;
  html: string;
  text?: string;
  /** Overrides the from address baked into smtp_config (per-profile sender identity). */
  from?: { email: string; name?: string };
  reply_to?: string;
  attachments?: SendWithConfigAttachment[];
}
```

- [ ] **Step 2: ส่งค่าใหม่เข้า nodemailer และรายงานผู้รับที่ถูกปฏิเสธ**

ใน `sendWithConfig` ตรงที่ประกอบ mail options:

```ts
    const info = await transporter.sendMail({
      from: input.from ? { address: input.from.email, name: input.from.name ?? '' } : config.from,
      to: Array.isArray(input.to) ? input.to : [input.to],
      cc: input.cc?.length ? input.cc : undefined,
      replyTo: input.reply_to || undefined,
      subject: input.subject,
      html: input.html,
      text: input.text,
      attachments: input.attachments?.map((a) => ({
        filename: a.filename,
        content: Buffer.from(a.content_base64, 'base64'),
        contentType: a.content_type,
      })),
    });

    // A partial delivery is not a success. Report who bounced instead of
    // letting the caller believe every vendor contact received the order.
    // ส่งไม่ครบไม่ถือว่าสำเร็จ ต้องบอกว่าใครไม่ผ่าน ไม่ใช่ปล่อยให้ผู้เรียกเข้าใจว่าส่งครบ
    const rejected = (info.rejected ?? []).map(String);
    return { sent: rejected.length === 0, rejected: rejected.length ? rejected : undefined };
```

ถ้า return type เดิมไม่มี `rejected` ให้เพิ่มลง `PlatformEmailResult`

- [ ] **Step 3: typecheck + เทสต์เดิมของ micro-notification**

```bash
cd <backend-v2> && bunx tsc --noEmit && bun test apps/micro-notification
```

`platform-email.controller.spec.ts` มีอยู่แล้ว — ต้องยังเขียว (payload เดิมที่ `to`
เป็น string ต้องใช้ได้เหมือนเดิม นี่คือเหตุผลที่ `to` เป็น union ไม่ใช่ array ล้วน)

- [ ] **Step 4: commit**

```bash
git add apps/micro-notification/src/platform-email/
git commit -m "feat(notification): send-with-config รองรับผู้รับหลายคน CC ไฟล์แนบ และรายงาน rejected"
```

---

### Task B3: ปุ่มทดสอบส่งเมลของแต่ละโปรไฟล์

**Files:**
- Modify: `apps/micro-business/src/app-config/app-config.service.ts` (ถัดจาก `testEmail`)
- Modify: `apps/micro-business/src/app-config/app-config.controller.ts`
- Modify: `packages/rpc-contract` (เพิ่ม pattern)
- Modify: `apps/backend-gateway/src/config/app-config/app-config.controller.ts` + `.service.ts`
- Modify: app-id allowlist (`appConfig.testEmailProfile`)

**Interfaces:**
- Consumes: `getEmailProfileForSend()` จาก Task B1 · `sendWithConfig` จาก Task B2
- Produces: `POST /api/config/:bu_code/app-config/test-email-profile`
  body `{ profile_id: string }` → `{ sent: boolean, recipient?: string, error?: string }`
  — Task C1/C2 เรียกเส้นนี้

- [ ] **Step 1: เมธอด `testEmailProfile` ใน service**

ล้อ `testEmail` เดิมทั้งการเรียก RPC และการอ่านสองรูปแบบของ response
(handler ตอบ `{sent, reason}` ส่วน transport error มาเป็น envelope) ต่างกันแค่ที่มาของ config:

```ts
  /**
   * Send a test email through one specific per-BU email profile.
   * ส่งอีเมลทดสอบผ่านโปรไฟล์อีเมลของหน่วยธุรกิจที่ระบุ
   * @param bu_code - Business unit code / รหัสหน่วยธุรกิจ
   * @param profile_id - Profile to test / โปรไฟล์ที่ต้องการทดสอบ
   * @returns Whether it went out, and to whom / ผลการส่งและผู้รับ
   */
  async testEmailProfile(
    bu_code: string,
    profile_id: string,
  ): Promise<{ sent: boolean; recipient?: string; error?: string }> {
    const profile = await this.getEmailProfileForSend(bu_code, profile_id);
    if (!profile) return { sent: false, error: `email profile ${profile_id} not found` };
    if (!profile.enabled) return { sent: false, error: 'email profile is disabled' };
    // เรียก sendWithConfig ด้วย smtp_config ของโปรไฟล์, to = profile.from_email,
    // subject/html เป็นข้อความทดสอบ แล้วอ่านผลด้วยบล็อกเดียวกับ testEmail เดิม
    // คัดลอกบล็อก try/catch ทั้งก้อนจาก `testEmail()` ในไฟล์เดียวกัน (ราว L640-700 —
    // ค้นด้วย `grep -n "async testEmail" app-config.service.ts`) อย่าเขียนใหม่:
    // มันครอบทั้งกรณี handler ตอบ { sent, reason } ตรง ๆ และกรณี RpcClient.send()
    // resolve เป็น error envelope แทนที่จะ reject ซึ่งเป็นกับดักที่เคยพลาดมาแล้ว
  }
```

- [ ] **Step 2: MessagePattern + gateway endpoint**

เพิ่ม pattern ใน `packages/rpc-contract` ข้าง `appConfig.testEmail` เดิม, controller ของ
micro-business ส่งต่อไป service, และ gateway เพิ่ม:

```ts
  @Post(':bu_code/app-config/test-email-profile')
  @UseGuards(new AppIdGuard('appConfig.testEmailProfile'))
```

โดยลอกโครง decorator/guard/`ExtractRequestHeader` จาก endpoint `test-email` เดิมในไฟล์เดียวกัน

- [ ] **Step 3: เติม `appConfig.testEmailProfile` ใน app-id allowlist**

หา allowlist ด้วย `grep -rn "appConfig.testEmail" --include="*.ts" <backend-v2>` แล้ว
เพิ่มคีย์ใหม่ข้างของเดิมทุกจุดที่เจอ **ข้ามขั้นนี้ = ผู้ใช้โดนเด้งออกหน้า login**

- [ ] **Step 4: typecheck + เทสต์เดิม + commit**

```bash
cd <backend-v2> && bunx tsc --noEmit && bun test apps/micro-business/src/app-config
git add -A apps/micro-business apps/backend-gateway packages/rpc-contract
git commit -m "feat(app-config): ทดสอบส่งเมลรายโปรไฟล์ (test-email-profile)"
```

---

### Task B4: ผลิต PDF ของ PO ฝั่ง server (helper + แยกส่วนประกอบ payload)

**Files:**
- Modify: `apps/micro-business/src/common/print-report.helper.ts`
  (ถัดจาก `renderViaMicroReport` ~L784)
- Modify: `apps/micro-business/src/procurement/purchase-order/purchase-order.service.ts`
  (`printToReport` ~L6484)

**Interfaces:**
- Consumes: `POST /api/:buCode/report/export-pdf-with-data` จาก Task A2
- Produces:
  - `exportPdfViaMicroReport(input: RenderViaMicroReportInput): Promise<Result<{ pdf_base64: string; file_name: string }>>`
  - `PurchaseOrderService.buildPrintInput(id, templateId?): Promise<Result<RenderViaMicroReportInput>>`
  — Task B5 เรียกทั้งสองตัว

- [ ] **Step 1: แยกการประกอบ payload ออกจาก `printToReport`**

`printToReport` ปัจจุบันประกอบ header/detail/signature แล้วเรียก `renderViaMicroReport`
ในเมธอดเดียว (≈120 บรรทัด) ให้แยกเป็น:

```ts
  /**
   * Build everything micro-report needs to render this PO — header, details,
   * signatures, template choice. Shared by the viewer print and the emailed PDF
   * so the vendor's attachment is byte-identical to what staff print.
   * ประกอบข้อมูลทั้งหมดที่ micro-report ต้องใช้ ใช้ร่วมกันทั้งพิมพ์และแนบอีเมล
   */
  private async buildPrintInput(
    id: string,
    templateId?: string,
  ): Promise<Result<RenderViaMicroReportInput>> {
    // ยกเนื้อ printToReport เดิมทั้งหมดมาไว้ที่นี่ จนถึงก่อนบรรทัด return renderViaMicroReport(...)
    // แล้ว return Result.ok({ prismaSystem: ..., bu_code: ..., documentType: 'PO', ... })
  }
```

แล้ว `printToReport` เหลือ:

```ts
  async printToReport(id: string, templateId?: string): Promise<Result<{ viewer_url: string }>> {
    const input = await this.buildPrintInput(id, templateId);
    if (!input.isOk()) return Result.error(input.error);
    return renderViaMicroReport(input.value);
  }
```

**ห้าม copy-paste ตรรกะการประกอบไปไว้สองที่** — ถ้าลายเซ็นหรือยอดรวมแตกต่างกันระหว่าง
ใบที่พิมพ์กับใบที่ส่งเมล จะไม่มีใครจับได้จนกว่าผู้ขายจะทัก

- [ ] **Step 2: `exportPdfViaMicroReport` ใน print-report.helper.ts**

ล้อ `renderViaMicroReport` ทุกขั้น (resolve template → กรอง signature → ประกอบ payload)
ต่างกันแค่ปลายทางและการอ่าน response:

```ts
export interface ExportPdfViaMicroReportResult {
  /** PDF bytes, base64-encoded so it can cross the RPC boundary as JSON. */
  pdf_base64: string;
  file_name: string;
}

/**
 * Same document, same template, same data as renderViaMicroReport — but returns
 * the rendered PDF instead of a viewer URL, for attaching to an email.
 * เอกสารชุดเดียวกับ renderViaMicroReport แต่คืนไฟล์ PDF แทน viewer URL
 * @param input - Same payload contract as renderViaMicroReport / สัญญาเดียวกับ renderViaMicroReport
 * @returns Base64 PDF and a file name / ไฟล์ PDF แบบ base64 พร้อมชื่อไฟล์
 */
export async function exportPdfViaMicroReport(
  input: RenderViaMicroReportInput,
): Promise<Result<ExportPdfViaMicroReportResult>> {
  // ลอกขั้นตอน 1-3 ของ renderViaMicroReport มาทั้งหมด — ในไฟล์เดียวกัน ราว L799-836:
  //   1. resolvePrintTemplate({ prismaSystem, documentType, templateId }) + คืน error เดิม
  //      ด้วย Result.error(templateResult.error) (อย่าสร้าง AppError ใหม่จาก message/code
  //      เพราะจะทำ app_code/http_status หาย)
  //   2. hasSignatureBlock(documentType) → sigNames / sigBlock
  //   3. headerData = [{ ...buildHeader(sigNames), ...sigNames, ...sigBlock }]
  //      detailData = buildDetail()
  // แล้วเปลี่ยนเฉพาะส่วนยิง HTTP ด้านล่างนี้

  const reportHost = process.env.REPORT_SERVICE_HOST || '127.0.0.1';
  const reportPort = process.env.REPORT_SERVICE_HTTP_PORT || '6015';
  const reportUrl = `http://${reportHost}:${reportPort}/api/${bu_code}/report/export-pdf-with-data`;

  const response = await fetch(reportUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template_name: template.name,
      data: {
        [`${datasetPrefix}Header`]: headerData,
        [`${datasetPrefix}Detail`]: detailData,
      },
    }),
    // PDF rendering is slower than handing back a viewer URL — 30s is not enough
    // for a long order. รอนานกว่าเส้น viewer เพราะต้อง render จริง
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    return Result.error(`Report service error: ${response.status} ${errBody}`, ErrorCode.INTERNAL);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return Result.ok({
    pdf_base64: buffer.toString('base64'),
    file_name: `${template.name}.pdf`,
  });
}
```

*(ถ้าขั้น 1-3 ลอกแล้วซ้ำเกิน 20 บรรทัด ให้แยกเป็น helper ภายในไฟล์
`buildMicroReportPayload(input)` ที่ทั้งสองฟังก์ชันเรียก — DRY สำคัญกว่าจำนวนฟังก์ชัน)*

- [ ] **Step 3: typecheck + เทสต์เดิมของ micro-business**

```bash
cd <backend-v2> && bunx tsc --noEmit && bun test apps/micro-business/src/procurement/purchase-order
```

เทสต์ของ `printToReport` เดิมต้องยังเขียว — นั่นคือหลักฐานว่าการแยก `buildPrintInput`
ไม่เปลี่ยนพฤติกรรมการพิมพ์

- [ ] **Step 4: commit**

```bash
git add apps/micro-business/src/common/print-report.helper.ts apps/micro-business/src/procurement/purchase-order/purchase-order.service.ts
git commit -m "feat(print): export PDF ของเอกสารฝั่ง server และแยก buildPrintInput ของ PO ออกมาใช้ร่วม"
```

---

### Task B5: enum activity + endpoint ส่ง PO ให้ vendor

**Files:**
- Modify: `packages/prisma-shared-schema-tenant/prisma/schema.prisma` + migration ใหม่
- Modify: `apps/micro-business/src/procurement/purchase-order/purchase-order.service.ts`
- Modify: `apps/micro-business/src/procurement/purchase-order/purchase-order.controller.ts` (~L821)
- Modify: `packages/rpc-contract`
- Modify: `apps/backend-gateway/src/application/purchase-orders/purchase-orders.controller.ts`
  (~L2307 ถัดจาก `print-viewer`) + `.service.ts` (~L1088)
- Modify: app-id allowlist (`purchaseOrder.sendEmail`)

**Interfaces:**
- Consumes: `getEmailProfileForSend` (B1) · `sendWithConfig` (B2) · `exportPdfViaMicroReport`
  + `buildPrintInput` (B4)
- Produces: `POST /api/:bu_code/purchase-orders/:purchase_order_id/send-email`
  body:
  ```jsonc
  { "profile_id": "uuid", "to": ["a@example.com"], "cc": ["b@example.com"],
    "subject": "…", "body": "…", "attach_pdf": true }
  ```
  → `200 { "sent": true, "rejected": [] }` · `422` เมื่อสถานะ PO ส่งไม่ได้
  · `400` เมื่อโปรไฟล์ไม่มี/ปิดอยู่ — Task C3 เรียกเส้นนี้

- [ ] **Step 1: เพิ่มค่า `email_sent` ใน `enum_activity_action`**

```prisma
enum enum_activity_action {
  // ค่าเดิมทั้งหมด คงไว้ตามเดิม
  email_sent
}
```

```bash
cd <backend-v2>/packages/prisma-shared-schema-tenant
bunx prisma migrate dev --name add_email_sent_activity_action
bun run db:generate && bun run build   # ห้ามข้าม — app อื่นอ่านชนิดจาก dist
```

- [ ] **Step 2: `sendEmailToVendor` ใน purchase-order.service.ts**

```ts
  /**
   * Email this purchase order to the vendor through one of the BU's email profiles.
   * ส่งใบสั่งซื้อนี้ให้ผู้ขายทางอีเมลผ่านโปรไฟล์อีเมลของหน่วยธุรกิจ
   * @param id - Purchase order id / รหัสใบสั่งซื้อ
   * @param input - Chosen profile, recipients and message / โปรไฟล์ ผู้รับ และข้อความ
   * @returns Delivery outcome / ผลการส่ง
   */
  async sendEmailToVendor(
    id: string,
    input: {
      profile_id: string;
      to: string[];
      cc?: string[];
      subject: string;
      body: string;
      attach_pdf: boolean;
    },
  ): Promise<Result<{ sent: boolean; rejected?: string[] }>> {
    const po = await this.prismaService.tb_purchase_order.findFirst({ where: { id } });
    if (!po) return Result.errorFromCatalog(ERROR_CATALOG.PO_NOT_FOUND);

    // Only an order the vendor is meant to see may be mailed out. Draft and
    // in-progress orders are still being negotiated internally.
    // ส่งได้เฉพาะใบที่ถึงมือผู้ขายแล้วตามสถานะ ใบร่างและใบที่ยังอยู่ในสายอนุมัติยังเป็นเรื่องภายใน
    const SENDABLE = ['sent', 'partial', 'closed', 'completed'];
    if (!SENDABLE.includes(String(po.po_status))) {
      return Result.error(
        `Purchase order in status ${String(po.po_status)} cannot be emailed to a vendor`,
        ErrorCode.UNPROCESSABLE_ENTITY,
      );
    }

    const profile = await this.appConfigService.getEmailProfileForSend(this.bu_code, input.profile_id);
    if (!profile) return Result.error('email profile not found', ErrorCode.BAD_REQUEST);
    if (!profile.enabled) return Result.error('email profile is disabled', ErrorCode.BAD_REQUEST);

    let attachments: { filename: string; content_base64: string; content_type: string }[] = [];
    if (input.attach_pdf) {
      const printInput = await this.buildPrintInput(id);
      if (!printInput.isOk()) return Result.error(printInput.error);
      const pdf = await exportPdfViaMicroReport(printInput.value);
      if (!pdf.isOk()) return Result.error(pdf.error);
      attachments = [
        {
          filename: `${po.po_no || 'purchase-order'}.pdf`,
          content_base64: pdf.value.pdf_base64,
          content_type: 'application/pdf',
        },
      ];
    }

    const sendResponse = await this.rpc.send(Notifications.sendWithConfig, {
      smtp_config: { ...profile.smtp, from: profile.from_email },
      from: { email: profile.from_email, name: profile.from_name },
      reply_to: profile.reply_to || undefined,
      to: input.to,
      cc: input.cc,
      subject: input.subject,
      html: input.body,
      text: input.body,
      attachments,
    });

    // อ่านผลสองรูปแบบเหมือน testEmail เดิม: handler ตอบ { sent, reason, rejected } ตรง ๆ
    // ส่วน transport failure มาเป็น error envelope — คัดลอกบล็อกอ่านผลจาก testEmail มาใช้
    const sent = /* ผลที่อ่านได้จากบล็อกข้างต้น */;
    const rejected = /* รายชื่อที่ถูกปฏิเสธ ถ้ามี */;

    await this.prismaService.tb_activity.create({
      data: {
        action: 'email_sent',
        entity_type: 'purchase_order',
        entity_id: id,
        actor_id: this.userId,
        created_by_id: this.userId,
        description: `Emailed ${po.po_no ?? ''} to ${input.to.join(', ')}`,
        meta_data: {
          profile_id: profile.id,
          profile_name: profile.name,
          from: profile.from_email,
          to: input.to,
          cc: input.cc ?? [],
          subject: input.subject,
          body_excerpt: input.body.slice(0, 500),
          attached: input.attach_pdf,
          result: sent ? 'sent' : 'failed',
          rejected: rejected ?? [],
        },
      },
    });

    if (!sent) return Result.error('SMTP delivery failed', ErrorCode.INTERNAL);
    return Result.ok({ sent: true, rejected });
  }
```

**บันทึก activity ทั้งกรณีสำเร็จและล้มเหลว** — ประวัติที่มีแต่ครั้งที่สำเร็จคือประวัติที่โกหก

- [ ] **Step 3: MessagePattern + gateway endpoint + allowlist**

- `packages/rpc-contract`: เพิ่ม `PurchaseOrders.sendEmailToVendor` ข้าง `printToReport`
- micro-business controller: `@MessagePattern(PurchaseOrders.sendEmailToVendor.pattern)`
  ลอกโครงจาก `printToReport` ที่ ~L821
- gateway controller: `@Post(':purchase_order_id/send-email')` +
  `@UseGuards(new AppIdGuard('purchaseOrder.sendEmail'))` ลอก decorator ชุดจาก
  `print-viewer` ที่ ~L2307 พร้อม DTO ที่ validate `to` ว่าเป็นอีเมลอย่างน้อยหนึ่งตัว
- **เติม `purchaseOrder.sendEmail` ใน app-id allowlist ทุกจุดที่ `purchaseOrder.print` อยู่**

- [ ] **Step 4: typecheck + เทสต์ + commit**

```bash
cd <backend-v2> && bunx tsc --noEmit && bun test apps/micro-business
git add -A apps packages
git commit -m "feat(purchase-order): ส่ง PO ให้ผู้ขายทางอีเมลพร้อมแนบ PDF และบันทึก activity"
```

- [ ] **Step 5: ยิงจริงที่ dev แล้วจดผล**

```bash
curl -i -X POST "http://localhost:4000/api/{BU}/purchase-orders/{PO_ID}/send-email" \
  -H "Authorization: Bearer $TOKEN" -H "x-app-id: $APP_ID" -H 'Content-Type: application/json' \
  -d '{"profile_id":"...","to":["your@email"],"subject":"test","body":"test","attach_pdf":true}'
```

ต้องได้ 200 + เมลเข้าจริง + ไฟล์แนบเปิดได้ · ยิงซ้ำด้วย PO สถานะ draft ต้องได้ 422
**ห้าม hardcode token ในคำสั่ง ใช้ตัวแปร shell เสมอ**

---

## Phase C — frontend

### Task C1: types + hook + endpoint ของ email profiles

**Files:**
- Create: `types/email-profile.ts`
- Create: `routes/system-admin/email-profile/use-email-profiles.ts`
- Modify: `constant/api-endpoints.ts` (ถัดจาก `APP_CONFIG_TEST_EMAIL` ~L46)

**Interfaces:**
- Consumes: `GET/PUT /api/config/{bu}/app-config/email_profiles` (มีอยู่แล้ว) ·
  `POST …/test-email-profile` (Task B3)
- Produces:
  - `type EmailProfile`, `type EmailProfilesValue`, `SECRET_MASK`, `EMAIL_PROFILES_CONFIG_KEY`
  - `useEmailProfiles(): { value, isLoading, isError, save, isSaving, testProfile, isTesting }`
  — Task C2 และ C3 ใช้

- [ ] **Step 1: `types/email-profile.ts`**

```ts
/** โปรไฟล์ผู้ส่งอีเมลของหน่วยธุรกิจ — เก็บรวมกันใน app-config key `email_profiles` */
export interface EmailProfile {
  id: string;
  name: string;
  enabled: boolean;
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    /** backend คืนเป็น `***ENCRYPTED***` เสมอ — ส่งค่านี้กลับไปแปลว่า "ไม่เปลี่ยนรหัสผ่าน" */
    password: string;
  };
  from_email: string;
  from_name: string;
  reply_to: string;
  default_cc: string[];
  subject_template: string;
  body_template: string;
}

export interface EmailProfilesValue {
  default_profile_id: string | null;
  profiles: EmailProfile[];
}

/** ค่าที่ backend ใช้แทนรหัสผ่านที่เก็บไว้ — ห้ามแสดงเป็นข้อความจริงในฟอร์ม */
export const SECRET_MASK = "***ENCRYPTED***";

export const EMAIL_PROFILES_CONFIG_KEY = "email_profiles";
```

- [ ] **Step 2: endpoint ใหม่ใน `constant/api-endpoints.ts`**

```ts
  APP_CONFIG_TEST_EMAIL_PROFILE: (buCode: string) =>
    `/api/proxy/api/config/${buCode}/app-config/test-email-profile`,
```

- [ ] **Step 3: `use-email-profiles.ts`**

ล้อ `routes/system-admin/interface/use-interface-config.ts` (404 = ยังไม่เคยตั้งค่า
ไม่ใช่ error, ใช้ `isPending` ไม่ใช่ `isLoading` ด้วยเหตุผลเดียวกับที่คอมเมนต์ไว้ที่นั่น):

```ts
import { useAppConfigByKey, useUpsertAppConfig } from "@/hooks/use-app-config";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { httpClient } from "@/lib/http-client";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { ApiError } from "@/lib/api-error";
import {
  EMAIL_PROFILES_CONFIG_KEY,
  type EmailProfilesValue,
} from "@/types/email-profile";

const EMPTY: EmailProfilesValue = { default_profile_id: null, profiles: [] };

export function useEmailProfiles() {
  const query = useAppConfigByKey(EMAIL_PROFILES_CONFIG_KEY);
  const upsert = useUpsertAppConfig();
  const test = useApiMutation<{ profile_id: string }>({
    mutationFn: (data, buCode) =>
      httpClient.post(API_ENDPOINTS.APP_CONFIG_TEST_EMAIL_PROFILE(buCode), data),
    invalidateKeys: [],
    errorMessage: "Test email failed",
  });

  const isNotFound =
    query.error instanceof ApiError && query.error.statusCode === 404;
  const value = (query.data?.value as EmailProfilesValue | undefined) ?? EMPTY;

  return {
    value,
    isLoading: query.isPending && !isNotFound,
    isError: query.isError && !isNotFound,
    // เขียนกลับทั้งก้อนเสมอ และคงลำดับ profiles ไว้ — backend คืนค่ารหัสผ่านเดิม
    // โดยจับคู่ตามลำดับที่อ่านได้ ถ้าเรียงใหม่หรือกรองทิ้ง รหัสผ่านจะสลับโปรไฟล์
    save: (next: EmailProfilesValue, opts?: { onSuccess?: () => void }) =>
      upsert.mutate({ key: EMAIL_PROFILES_CONFIG_KEY, value: next }, opts),
    isSaving: upsert.isPending,
    testProfile: test.mutate,
    isTesting: test.isPending,
  };
}
```

- [ ] **Step 4: typecheck + lint + commit**

```bash
bunx tsc --noEmit && bun run lint
git add types/email-profile.ts routes/system-admin/email-profile/use-email-profiles.ts constant/api-endpoints.ts
git commit -m "feat(email-profile): types และ hook อ่าน/เขียนโปรไฟล์อีเมลของหน่วยธุรกิจ"
```

---

### Task C2: หน้าตั้งค่าโปรไฟล์อีเมล

**Files:**
- Create: `routes/system-admin/email-profile/email-profile-schema.ts`
- Create: `routes/system-admin/email-profile/email-profile-dialog.tsx`
- Create: `routes/system-admin/email-profile/email-profile.route.tsx`
- Modify: `routes/router.tsx`, `constant/module-list.ts`, `messages/en.json`, `messages/th.json`

**Interfaces:**
- Consumes: `useEmailProfiles()` จาก Task C1
- Produces: route `/system-admin/email-profile` — ผู้ใช้สร้าง/แก้/ลบ/ตั้งค่าเริ่มต้น
  และกดทดสอบส่งได้

- [ ] **Step 1: zod schema**

```ts
import { z } from "zod";

export const emailProfileSchema = z.object({
  name: z.string().min(1),
  enabled: z.boolean(),
  smtp_host: z.string().min(1),
  smtp_port: z.coerce.number().int().min(1).max(65535),
  smtp_secure: z.boolean(),
  smtp_username: z.string().min(1),
  smtp_password: z.string().min(1),
  from_email: z.string().email(),
  from_name: z.string(),
  reply_to: z.union([z.string().email(), z.literal("")]),
  default_cc: z.string(),          // คั่นด้วย , ; หรือช่องว่าง แปลงตอนบันทึก
  subject_template: z.string(),
  body_template: z.string(),
});

export type EmailProfileFormValues = z.infer<typeof emailProfileSchema>;
```

- [ ] **Step 2: dialog**

รูปแบบฟอร์มลอกจาก `routes/system-admin/config-email/config-email-component.tsx`
(react-hook-form + zodResolver + `Field`/`FieldLabel`/`FieldError` + `scrollToFirstInvalidField`)
แต่เป็น dialog ต่อโปรไฟล์ ข้อกำหนดเฉพาะ:

- โปรไฟล์ที่มีอยู่แล้ว: ช่องรหัสผ่านเติม `SECRET_MASK` และมี helper text ว่า
  "เว้นไว้ = ใช้รหัสผ่านเดิม" — ถ้าผู้ใช้ไม่แตะ ค่าที่ส่งกลับคือ mask ซึ่ง backend
  จะคืนค่าเดิมให้เอง (Task B1 Step 2)
- แปลง `default_cc` ด้วยตัวแยกชุดเดียวกับหน้าเดิม:
  `s.split(/[,;\s]+/).map((t) => t.trim()).filter(Boolean)`
- โปรไฟล์ใหม่: `id` = `crypto.randomUUID()` สร้างตอนกดบันทึก

- [ ] **Step 3: หน้า list**

`export function Component` ตามคอนเวนชันของรีโป · ตาราง: ชื่อ · from · สถานะ ·
badge "ค่าเริ่มต้น" · ปุ่มแก้/ลบ/ตั้งเป็นค่าเริ่มต้น/ทดสอบส่ง · ปุ่ม Add ด้านบน

กติกาที่ต้องบังคับในหน้านี้:

- ลบตัวที่เป็นค่าเริ่มต้นไม่ได้ถ้ายังมีตัวอื่น — ให้ตั้งตัวใหม่ก่อน (ปุ่มลบ disabled
  พร้อม tooltip อธิบาย)
- เหลือโปรไฟล์เดียว → มันเป็นค่าเริ่มต้นโดยอัตโนมัติ (set `default_profile_id` ให้เอง)
- ทุกการบันทึก **ส่ง `profiles` ทั้ง array ในลำดับเดิม** ห้าม sort/filter ก่อนส่ง
- ถ้าใช้ `DataGrid` ที่มีคอลัมน์คำนวณ ต้อง memo `columns`/`data` (ดู `routes/CLAUDE.md`)

- [ ] **Step 4: ลงทะเบียน route + เมนู + i18n**

`routes/router.tsx`: เพิ่มใต้ children ของ `ProtectedShell` ข้าง `/system-admin/interface`

`constant/module-list.ts` ข้างรายการ `interface` (~L630):

```ts
      {
        name: "emailProfile",
        path: "/system-admin/email-profile",
        licenseFeature: "configuration.app_config", // เก็บใน app-config เหมือน interface
        icon: Mail,
        permission: PERMISSIONS.system_configuration.view,
      },
```

เพิ่มบล็อกข้อความใน `messages/en.json` และ `messages/th.json` ให้ครบทั้งสองไฟล์

- [ ] **Step 5: typecheck + lint + เทสต์เดิม + commit**

```bash
bunx tsc --noEmit && bun run lint && bun test:run
git add routes/system-admin/email-profile routes/router.tsx constant/module-list.ts messages/
git commit -m "feat(email-profile): หน้าตั้งค่าโปรไฟล์อีเมลของหน่วยธุรกิจ"
```

`constant/module-list.license-feature.test.ts` ต้องเขียว — ถ้าแดง แปลว่า
`licenseFeature` ที่ใส่ไม่มีใน catalog ให้ใช้ค่าเดียวกับ interface ไม่ใช่คิดค่าใหม่

---

### Task C3: dialog ส่ง PO ให้ผู้ขาย

**Files:**
- Create: `routes/procurement/purchase-order/use-po-send-email.ts`
- Create: `routes/procurement/purchase-order/po-send-email-dialog.tsx`
- Modify: `routes/procurement/purchase-order/po-header.tsx` (~L164 ข้างปุ่ม print)
- Modify: `constant/api-endpoints.ts`

**Interfaces:**
- Consumes: `POST …/purchase-orders/{id}/send-email` (Task B5) · `useEmailProfiles()` (C1)
- Produces: ปุ่ม "ส่งให้ผู้ขาย" ในหน้า PO

- [ ] **Step 1: endpoint + hook**

```ts
// constant/api-endpoints.ts
  PURCHASE_ORDER_SEND_EMAIL: (buCode: string, id: string) =>
    `/api/proxy/api/${buCode}/purchase-orders/${id}/send-email`,
```

```ts
// use-po-send-email.ts
export function usePoSendEmail(id: string) {
  return useApiMutation<{
    profile_id: string;
    to: string[];
    cc: string[];
    subject: string;
    body: string;
    attach_pdf: boolean;
  }>({
    mutationFn: (data, buCode) =>
      httpClient.post(API_ENDPOINTS.PURCHASE_ORDER_SEND_EMAIL(buCode, id), data),
    // ประวัติการส่งไปโผล่ใน activity sheet ของ PO — ต้องล้าง cache ของมันด้วย
    invalidateKeys: [QUERY_KEYS.ACTIVITIES],
    errorMessage: "Failed to send purchase order",
  });
}
```

ตรวจชื่อคีย์จริงใน `constant/query-keys.ts` ก่อนใส่ — ถ้าไม่มี `ACTIVITIES` ให้ใช้คีย์ที่
`components/share/activity-sheet.tsx` ใช้จริง

- [ ] **Step 2: dialog**

- dropdown โปรไฟล์: แสดงเฉพาะ `enabled` · preselect `default_profile_id`
- **ไม่มีโปรไฟล์ที่ใช้ได้เลย** → แสดงข้อความ + ลิงก์ `/system-admin/email-profile`
  และซ่อนปุ่มส่ง (ไม่ใช่ปล่อยให้กดแล้ว error)
- To: prefill อีเมลผู้ขายของ PO · แก้ได้ · เพิ่มได้หลายอัน · ต้องมีอย่างน้อยหนึ่ง
- CC: prefill `default_cc` ของโปรไฟล์ที่เลือก
- Subject/Body: ตั้งต้นจาก template ของโปรไฟล์ แทน `{{po_no}}` `{{vendor_name}}`
  `{{bu_name}}` `{{total}}` `{{delivery_date}}` ด้วยค่าจริงของ PO
- **ผู้ใช้พิมพ์เพิ่ม/แก้ body ได้เต็มก้อน** และเมื่อเปลี่ยนโปรไฟล์
  **re-render เฉพาะเมื่อยังไม่เคยแก้เอง** (เก็บ flag `isBodyDirty` ของช่องนี้เอง
  อย่าอาศัย `formState.isDirty` ของทั้งฟอร์ม)
- checkbox "แนบไฟล์ PO (PDF)" ติ๊กไว้ตั้งต้น
- ปุ่มส่ง disabled ระหว่างส่ง และแสดงสถานะกำลังส่ง (การ render PDF ใช้เวลาหลายวินาที)
- ถ้า response มี `rejected` ไม่ว่าง → toast บอกรายชื่อที่ส่งไม่ถึง ไม่ใช่ toast สำเร็จเฉย ๆ

- [ ] **Step 3: ปุ่มในหน้า PO**

ใน `po-header.tsx` ข้างปุ่ม print เพิ่มปุ่มที่แสดงเฉพาะเมื่อ
`["sent","partial","closed","completed"].includes(po.po_status)` — สถานะอื่นไม่ต้อง
render ปุ่ม (backend กันซ้ำอยู่แล้วที่ 422 นี่คือชั้นที่สอง ไม่ใช่ชั้นเดียว)

- [ ] **Step 4: typecheck + lint + เทสต์เดิม + commit**

```bash
bunx tsc --noEmit && bun run lint && bun test:run
git add routes/procurement/purchase-order constant/api-endpoints.ts
git commit -m "feat(purchase-order): ปุ่มส่งใบสั่งซื้อให้ผู้ขายทางอีเมล"
```

---

## Manual verification (ผู้ใช้ตรวจเอง หลัง Phase C)

1. บันทึกโปรไฟล์ใหม่ → refresh → รหัสผ่านต้องแสดงเป็น mask ไม่ใช่ค่าจริง
2. แก้เฉพาะชื่อโปรไฟล์แล้วบันทึก → กดทดสอบส่ง ต้องยังส่งได้ (รหัสผ่านเดิมไม่หาย)
3. มีสองโปรไฟล์ ลบตัวที่เป็นค่าเริ่มต้น → ต้องถูกห้ามจนกว่าจะตั้งตัวใหม่
4. ทดสอบส่งของโปรไฟล์ A และ B → เมลต้องมาจาก from ที่ต่างกันจริง
5. ส่ง PO จริง แนบ PDF → ผู้ขายได้ไฟล์ที่เปิดได้ และหน้าตาตรงกับที่กด Print
6. เปิด activity sheet ของ PO นั้น → เห็นรายการส่ง พร้อมผู้รับและชื่อโปรไฟล์
7. ตั้ง SMTP ผิดแล้วส่ง → ต้องขึ้น error ที่อ่านออก และ activity ต้องบันทึกเป็น failed
8. เปิด PO สถานะ draft → ต้องไม่มีปุ่มส่ง

## หมายเหตุ deploy

- `SECRET_ENCRYPTION_KEY` ต้องมีใน environment ปลายทางก่อนใช้ ไม่งั้นบันทึกโปรไฟล์ 400
- micro-report ต้องขึ้นก่อน — อาการ "fetch failed" ตอนพิมพ์คือ micro-report ไม่ได้อยู่
  ที่พอร์ต 6015 ไม่ใช่บั๊กของ frontend
- allowlist ของ app-id ต้องมี `purchaseOrder.sendEmail` และ `appConfig.testEmailProfile`
  ก่อน FE ขึ้น ไม่งั้นผู้ใช้จะถูก logout ตอนกดปุ่ม
