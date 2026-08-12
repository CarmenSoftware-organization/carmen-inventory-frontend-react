# แผน implement: สรุปขนาดไฟล์แนบต่อ BU ในหน้า Document

> **สำหรับ agent ที่ลงมือทำ:** REQUIRED SUB-SKILL — ใช้ `superpowers:subagent-driven-development`
> (แนะนำ) หรือ `superpowers:executing-plans` ทำทีละ task ขั้นตอนใช้ checkbox (`- [ ]`) เพื่อติดตาม

**Goal:** เพิ่มแถบสรุปขนาดไฟล์แนบรวมของ BU เหนือตารางในหน้า `/system-admin/document`
พร้อม Sheet แจกแจงตามโมดูลต้นทาง

**Architecture:** เพิ่ม endpoint aggregate ใหม่ที่ backend (คิวรี `GROUP BY reference_type` หนึ่งครั้ง
ใน `micro-file` แล้ว forward ผ่าน `backend-gateway`) เพราะฝั่ง frontend รวมเองไม่ได้ — list ถูก cap
ที่ 100 ต่อหน้าและ gateway สร้าง presigned URL ให้ทุกไฟล์ที่ดึง ฝั่ง frontend ต่อ hook ใหม่เข้ากับ
component สองตัว (แถบ + Sheet) โดยยอดสรุปเป็นของทั้ง BU เสมอ ไม่ผูกกับ filter ของตาราง

**Tech Stack:** NestJS + Prisma raw SQL (backend) · React 19 + TanStack Query v5 + use-intl +
Tailwind 4 (frontend) · bun

**Spec:** `docs/superpowers/specs/2026-08-13-document-attachment-size-summary-design.md`

## Global Constraints

- **ห้ามเขียนไฟล์ test ใหม่** (`*.test.ts` / `*.spec.ts`) — ตามที่ผู้ใช้ตั้งไว้ใน CLAUDE.md ส่วนตัว
  ข้อนี้ override skill `test-driven-development` ให้ implement → static check → commit
  **static check ไม่ใช่ test — ยังต้องรัน** และชุดเทสต์ที่มีอยู่เดิมต้องไม่แดงเพิ่ม
- ตัวเลข `sum(size)` จาก Postgres เป็น `bigint` → ต้องแปลงเป็น `Number` ก่อนออกจากเซอร์วิส
  ไม่งั้น `JSON.stringify` throw
- route `GET .../summary` **ต้องประกาศก่อน** `@Get(':filetoken')` ไม่งั้น Nest จับเป็น file token
- ขนาดตัวอักษรใช้ token เท่านั้น: `text-micro-floor` (8px) · `text-micro-eyebrow` (9px) ·
  `text-micro-legal` (10px) · `text-micro` (11px) · `text-xs` (12px) · `text-sm` (14px)
  **ห้ามใส่ค่าดิบ** `text-[10px]` — guard `components/ui/type-ladder.test.ts` จะแดง
- แถบสัดส่วนใช้สีเดียวทุกแถว (`variant="primary"`) ห้ามไล่สีต่อโมดูล — DESIGN.md ห้ามใช้สีสื่อความหมาย
- แก้เนื้อหา i18n ต้องแก้ **ทั้ง `en.json` และ `th.json`** เสมอ
- commit message เขียนเป็นภาษาไทย ตาม CLAUDE.md ของโปรเจกต์

**สองรีโป** — Task 1–2 อยู่ที่ `../carmen-turborepo-backend-v2` (branch ของตัวเอง)
Task 3–7 อยู่ที่รีโปนี้ branch `feature/document-attachment-size-summary`

## โครงไฟล์

**`carmen-turborepo-backend-v2`**

| ไฟล์ | หน้าที่ |
|---|---|
| `apps/micro-file/src/files/files.service.ts` | `summarizeFiles()` — คิวรี `GROUP BY` เดียว แปลง BigInt |
| `apps/micro-file/src/files/files.controller.ts` | message pattern `files.summary` |
| `apps/backend-gateway/src/application/document-management/document-management.service.ts` | `getDocumentSummary()` — forward ไป micro-file |
| `apps/backend-gateway/src/application/document-management/document-management.controller.ts` | `GET /api/:bu_code/documents/summary` |
| `apps/backend-gateway/src/platform/applications/app-api-catalog.generated.ts` | regenerate |

**`carmen-inventory-frontend-react`**

| ไฟล์ | หน้าที่ |
|---|---|
| `lib/format-file-size.ts` | ฟอร์แมต bytes → ข้อความ (ของกลาง รองรับถึง TB) |
| `types/document.ts` | `DocumentSummary`, `DocumentSummaryRow` |
| `constant/api-endpoints.ts` | `DOCUMENTS_SUMMARY` |
| `hooks/use-document.ts` | `useDocumentSummary()` |
| `routes/system-admin/document/document-reference-labels.ts` | `reference_type` → ข้อความที่คนอ่านรู้เรื่อง |
| `routes/system-admin/document/document-summary-sheet.tsx` | Sheet แจกแจงครบ (presentational ล้วน) |
| `routes/system-admin/document/document-summary-bar.tsx` | แถบสรุปเหนือตาราง |
| `routes/system-admin/document/document-component.tsx` | ต่อของทั้งหมดเข้าหน้า + แก้ `max-h` |
| `routes/system-admin/document/use-document-table.tsx` | import `formatFileSize` จากที่ใหม่ |
| `messages/{en,th}.json` | key ใหม่ |

---

## Task 1: micro-file — คิวรีสรุปและ message pattern

**Files:**
- Modify: `apps/micro-file/src/files/files.service.ts` (แทรกหลัง `searchFiles` ที่จบบรรทัด 839)
- Modify: `apps/micro-file/src/files/files.controller.ts` (แทรกหลัง `listFiles` ที่จบบรรทัด 696)

**Interfaces:**
- Consumes: `fileSchema` และ `Prisma` ที่ import ไว้แล้วบรรทัด 2 ของ `files.service.ts`
  · `AuditPayload` (`files.controller.ts:124`) · `resSuccessWithData` / `resInternalServerError`
  · `runWithAuditContext` / `this.createAuditContext`
- Produces: message `{ cmd: 'files.summary', service: 'files' }` รับ payload `AuditPayload`
  คืน `resSuccessWithData({ total_size: number, total_count: number, by_reference_type:
  Array<{ reference_type: string | null, size: number, count: number }> })`

- [ ] **Step 1: เพิ่ม `summarizeFiles` ใน `files.service.ts`**

แทรกต่อจากปีกกาปิดของ `searchFiles` (บรรทัด 839) ก่อน jsdoc ของ `listFilesSimple`:

```ts
  /**
   * Summarise stored files for a business unit, grouped by reference type
   * สรุปไฟล์ที่จัดเก็บของหน่วยธุรกิจ แยกตามประเภทอ้างอิง
   * @param params - Query parameters / พารามิเตอร์การค้นหา
   * @param params.bu_code - Business unit code / รหัสหน่วยธุรกิจ
   * @returns Totals plus a per-reference_type breakdown, largest first / ยอดรวมพร้อมรายละเอียดต่อ reference_type เรียงจากมากไปน้อย
   */
  async summarizeFiles(params: { bu_code?: string }): Promise<{
    total_size: number;
    total_count: number;
    by_reference_type: Array<{
      reference_type: string | null;
      size: number;
      count: number;
    }>;
  }> {
    const conditions: Prisma.Sql[] = [Prisma.sql`deleted_at IS NULL`];
    if (params.bu_code) {
      conditions.push(Prisma.sql`bu_code = ${params.bu_code}`);
    }
    const where = Prisma.join(conditions, ' AND ');
    // Schema-qualified for the same reason searchFiles is: raw SQL is not
    // qualified by the PrismaPg adapter and the connection search_path stays at
    // `public`, so an unqualified "tb_file_tag" 42P01s.
    const table = fileSchema
      ? Prisma.raw(`"${fileSchema.replace(/"/g, '""')}"."tb_file_tag"`)
      : Prisma.raw(`"tb_file_tag"`);
    const rows = await this.prisma.$queryRaw<Array<{
      reference_type: string | null;
      file_count: number;
      total_size: bigint;
    }>>(
      Prisma.sql`
        SELECT reference_type,
               count(*)::int                  AS file_count,
               COALESCE(sum(size), 0)::bigint AS total_size
        FROM ${table}
        WHERE ${where}
        GROUP BY reference_type
        ORDER BY total_size DESC
      `,
    );
    // sum() over an int4 column returns bigint, which Prisma hands back as a JS
    // BigInt — JSON.stringify throws on those, so it must not leave this method.
    // Number is safe here: the ceiling is ~9 PB, well under MAX_SAFE_INTEGER.
    const by_reference_type = rows.map((row) => ({
      reference_type: row.reference_type,
      size: Number(row.total_size),
      count: row.file_count,
    }));
    return {
      total_size: by_reference_type.reduce((sum, r) => sum + r.size, 0),
      total_count: by_reference_type.reduce((sum, r) => sum + r.count, 0),
      by_reference_type,
    };
  }
```

- [ ] **Step 2: เพิ่ม message pattern ใน `files.controller.ts`**

แทรกต่อจากปีกกาปิดของ `listFiles` (บรรทัด 696) ก่อน jsdoc ของ `getPresignedUrl`
ใช้ `AuditPayload` ที่มีอยู่แล้ว (บรรทัด 124) เป็น payload type — ฟิลด์ตรงกันพอดี ไม่ต้องสร้าง interface ใหม่:

```ts
  /**
   * Summarise files for a business unit via TCP microservice message
   * สรุปไฟล์ของหน่วยธุรกิจผ่านข้อความ TCP microservice
   * @param payload - Payload with business unit code and audit context / ข้อมูลพร้อมรหัสหน่วยธุรกิจและบริบท audit
   * @returns Totals and per-reference_type breakdown / ยอดรวมและรายละเอียดต่อ reference_type
   */
  @MessagePattern({ cmd: 'files.summary', service: 'files' })
  async summarizeFiles(@Payload() payload: AuditPayload) {
    this.logger.debug(
      { function: 'summarizeFiles', bu_code: payload?.bu_code },
      FilesController.name,
    );

    try {
      const auditContext = this.createAuditContext(payload);
      const summary = await runWithAuditContext(auditContext, () =>
        this.filesService.summarizeFiles({ bu_code: payload?.bu_code }),
      );
      return resSuccessWithData(summary, 'File summary retrieved successfully');
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Summarize files failed: ${err.message}`);
      return resInternalServerError('Failed to summarize files');
    }
  }
```

- [ ] **Step 3: type-check**

```bash
cd ../carmen-turborepo-backend-v2/apps/micro-file && bun run check-types
```
คาดหวัง: ไม่มี error

- [ ] **Step 4: ชุดเทสต์เดิมของ micro-file ต้องไม่แดงเพิ่ม**

```bash
cd ../carmen-turborepo-backend-v2/apps/micro-file && bun test 2>&1 | tail -20
```
บันทึกจำนวน suite/test ที่ผ่าน-ไม่ผ่านไว้เทียบ ถ้ามีที่แดงอยู่ก่อนแล้วให้ยืนยันว่าเป็นตัวเดิม
(`git stash` แล้วรันซ้ำเทียบ) — ห้ามมีตัวใหม่แดง

- [ ] **Step 5: commit**

```bash
cd ../carmen-turborepo-backend-v2
git add apps/micro-file/src/files/files.service.ts apps/micro-file/src/files/files.controller.ts
git commit -m "feat(micro-file): เพิ่มคิวรีสรุปขนาดไฟล์ต่อ BU แยกตาม reference_type

รวม count/sum ในคิวรี GROUP BY เดียว แล้วเปิดเป็น message files.summary
sum(size) ของ int4 คืน bigint ซึ่ง JSON.stringify พัง จึงแปลงเป็น Number
ก่อนออกจากเซอร์วิส"
```

---

## Task 2: gateway — endpoint สรุป

**Files:**
- Modify: `apps/backend-gateway/src/application/document-management/document-management.service.ts`
  (แทรกหลัง `listDocuments` ที่จบบรรทัด 324)
- Modify: `apps/backend-gateway/src/application/document-management/document-management.controller.ts`
  (แทรกหลัง `listDocuments` ที่จบบรรทัด 257 — **ก่อน** jsdoc ของ `@Get(':filetoken')` บรรทัด 259-265)
- Modify: `apps/backend-gateway/src/platform/applications/app-api-catalog.generated.ts` (regenerate)

**Interfaces:**
- Consumes: message `files.summary` จาก Task 1 · `this.fileService.send` · `getGatewayRequestContext`
  · `httpStatusToErrorCode` · `Result` · `ExtractRequestHeader` · `AppIdGuard` — ทั้งหมด import ไว้แล้ว
- Produces: `GET /api/:bu_code/documents/summary` → `{ data: { total_size, total_count,
  by_reference_type } }` · api_name ใหม่ `documents.summary`

- [ ] **Step 1: เพิ่ม `getDocumentSummary` ใน service**

แทรกต่อจากปีกกาปิดของ `listDocuments` (บรรทัด 324) ก่อน jsdoc ของ `getPresignedUrl`:

```ts
  /**
   * Summarise stored documents for a business unit
   * สรุปเอกสารที่จัดเก็บของหน่วยธุรกิจ
   * @param bu_code - Business unit code / รหัสหน่วยธุรกิจ
   * @param user_id - User ID / รหัสผู้ใช้
   * @returns Totals plus a per-reference_type breakdown / ยอดรวมพร้อมรายละเอียดต่อ reference_type
   */
  async getDocumentSummary(
    bu_code: string,
    user_id: string,
  ): Promise<Result<unknown>> {
    this.logger.debug(
      { function: 'getDocumentSummary', bu_code },
      DocumentManagementService.name,
    );

    const res: Observable<MicroserviceResponse> = this.fileService.send(
      { cmd: 'files.summary', service: 'files' },
      { bu_code, user_id, ...getGatewayRequestContext() },
    );

    const response = (await firstValueFrom(res)) as any;

    if (!response.success) {
      return Result.error(
        response.response?.message ?? response.message,
        httpStatusToErrorCode(response.response?.status),
      );
    }

    // Deliberately no presigned-URL resolution here (unlike listDocuments):
    // the payload is aggregate numbers, there is no per-file object to link to.
    return Result.ok(response.data);
  }
```

- [ ] **Step 2: เพิ่ม route ใน controller — ก่อน `@Get(':filetoken')`**

แทรกระหว่างปีกกาปิดของ `listDocuments` (บรรทัด 257) กับ jsdoc ของ `getDocument` (บรรทัด 259):

```ts
  /**
   * Summarise document storage usage for the business unit
   * สรุปการใช้พื้นที่จัดเก็บเอกสารของหน่วยธุรกิจ
   * @param bu_code - Business unit code / รหัสหน่วยธุรกิจ
   * @param req - HTTP request / คำขอ HTTP
   * @param res - HTTP response / การตอบกลับ HTTP
   */
  // Declared before @Get(':filetoken') on purpose: Nest matches routes in
  // declaration order, so moving this below would make 'summary' a file token
  // and the endpoint would 404.
  @Get('summary')
  @UseGuards(new AppIdGuard('documents.summary'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Summarise document storage',
    description:
      'Returns the total attachment size and file count for the business unit, broken down by the module each file was uploaded from. Administrators use this to see where storage is being consumed.\n\nสรุปขนาดไฟล์แนบรวมและจำนวนไฟล์ของหน่วยธุรกิจ แยกตามโมดูลต้นทาง',
    operationId: 'getDocumentSummary',
  })
  @ApiParam({ name: 'bu_code', description: 'Business unit code', example: 'BU-001' })
  @ApiStdResponse(undefined, { description: 'Resource retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Missing or invalid Bearer token' })
  async getDocumentSummary(
    @Param('bu_code') bu_code: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.debug(
      { function: 'getDocumentSummary', bu_code },
      DocumentManagementController.name,
    );

    const { user_id } = ExtractRequestHeader(req);
    const result =
      await this.documentManagementService.getDocumentSummary(bu_code, user_id);
    this.respond(res, result);
  }
```

**ไม่ใส่** `@EnrichAuditUsers()` — ผลลัพธ์เป็นตัวเลขรวม ไม่มีฟิลด์ audit ให้ enrich

- [ ] **Step 3: regenerate catalog**

```bash
cd ../carmen-turborepo-backend-v2 && bun run scripts/generate-app-api-catalog/run.ts
git diff --stat apps/backend-gateway/src/platform/applications/app-api-catalog.generated.ts
```
คาดหวัง: diff เพิ่ม `'documents.summary'` ในลิสต์เรียงตัวอักษร และเพิ่มใน `api_names` ของ
`{ module: 'documents', ... }` — ถ้ามีอย่างอื่นเปลี่ยนด้วย แปลว่ามี drift ค้างจาก branch อื่น ให้หยุดถาม

- [ ] **Step 4: type-check gateway**

```bash
cd ../carmen-turborepo-backend-v2/apps/backend-gateway && bun run check-types
```
คาดหวัง: ไม่มี error

- [ ] **Step 5: ตรวจว่า route ไม่ถูก `:filetoken` กลืน**

```bash
grep -n "@Get('summary')\|@Get(':filetoken')" ../carmen-turborepo-backend-v2/apps/backend-gateway/src/application/document-management/document-management.controller.ts
```
คาดหวัง: บรรทัดของ `'summary'` **น้อยกว่า** บรรทัดของ `':filetoken'`

- [ ] **Step 6: ยิงจริงกับ gateway local**

รัน gateway + micro-file แล้ว (แทน `$TOKEN`, `$APP_ID`, `$BU` ด้วยค่าจริง — ห้าม hardcode token
ลง commit):

```bash
curl -s -H "Authorization: Bearer $TOKEN" -H "x-app-id: $APP_ID" \
  "http://localhost:4000/api/$BU/documents/summary" | head -40
```
คาดหวัง: 200 พร้อม `data.total_size` เป็น **number** (ไม่ใช่สตริง ไม่ใช่ `null`)
และ `data.by_reference_type` เรียงจากมากไปน้อย

ถ้าได้ 401 "not allowed to access this api" → api_name ยังไม่อยู่ใน allowlist ของ app นี้ในฐานข้อมูล
เติมก่อน (ดูขั้นตอน deploy ข้อ 8 ของ spec) แล้ว restart gateway เพื่อให้ allowlist โหลดใหม่

- [ ] **Step 7: commit**

```bash
cd ../carmen-turborepo-backend-v2
git add apps/backend-gateway/src/application/document-management/ \
        apps/backend-gateway/src/platform/applications/app-api-catalog.generated.ts
git commit -m "feat(gateway): เปิด GET /api/:bu_code/documents/summary

ต่อ message files.summary ออกเป็น REST endpoint พร้อม api_name ใหม่
documents.summary ประกาศ route ไว้ก่อน :filetoken เพราะ Nest จับตามลำดับ
ที่ประกาศ ถ้าอยู่ทีหลังจะถูกกลืนเป็น file token แล้ว 404"
```

---

## Task 3: frontend — ย้ายและขยาย `formatFileSize`

**Files:**
- Create: `lib/format-file-size.ts`
- Modify: `routes/system-admin/document/use-document-table.tsx` (ลบฟังก์ชัน local บรรทัด 35-46, เพิ่ม import)

**Interfaces:**
- Produces: `formatFileSize(bytes: number): string` จาก `@/lib/format-file-size` —
  ใช้ต่อใน Task 6 และ 7

- [ ] **Step 1: สร้าง `lib/format-file-size.ts`**

```ts
const UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

/**
 * แปลงจำนวน bytes เป็นข้อความขนาดไฟล์ (B, KB, MB, GB, TB)
 *
 * ต่ำกว่า 1 KB แสดงเป็นจำนวนเต็ม ที่เหลือทศนิยม 1 ตำแหน่ง — รูปแบบเดิมที่ตาราง
 * เอกสารใช้อยู่จึงไม่เปลี่ยน แต่ยอดรวมระดับ GB ไม่ต้องอ่านเป็น "3788.8 MB" อีก
 * (ของเดิมหยุดที่ MB เพราะเคยใช้กับไฟล์เดี่ยวเท่านั้น)
 *
 * @param bytes - ขนาดไฟล์เป็น bytes
 * @returns ข้อความแสดงขนาดไฟล์ในหน่วยที่เหมาะสม
 * @example
 * formatFileSize(1048576);    // "1.0 MB"
 * formatFileSize(3972891234); // "3.7 GB"
 * formatFileSize(0);          // "0 B"
 */
export const formatFileSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(1)} ${UNITS[unit]}`;
};
```

- [ ] **Step 2: แก้ `use-document-table.tsx` ให้ใช้ตัวกลาง**

ลบทั้ง jsdoc และฟังก์ชัน `formatFileSize` (บรรทัด 35-46) แล้วเพิ่ม import ต่อจากบรรทัด 25
(`import { formatDate } from "@/lib/date-utils";`):

```ts
import { formatFileSize } from "@/lib/format-file-size";
```

จุดเรียกใช้ (บรรทัด 157 `cell: ({ row }) => formatFileSize(row.getValue("size"))`) ไม่ต้องแก้

- [ ] **Step 3: type-check + lint**

```bash
bunx tsc --noEmit && bun run lint
```
คาดหวัง: สะอาดทั้งคู่ (ถ้า tsc ฟ้อง `formatFileSize` ไม่ถูกใช้ แปลว่าลบไม่หมดหรือ import ผิดที่)

- [ ] **Step 4: ชุดเทสต์เดิมต้องเขียวทั้งหมด**

```bash
bun test:run 2>&1 | tail -15
```
คาดหวัง: ผ่านทั้งหมด — นี่คือ task ที่เสี่ยงที่สุดของแผนนี้เพราะแตะไฟล์ที่มีอยู่เดิม

- [ ] **Step 5: commit**

```bash
git add lib/format-file-size.ts routes/system-admin/document/use-document-table.tsx
git commit -m "refactor(document): ย้าย formatFileSize เป็นของกลางและรองรับถึง TB

กำลังจะถูกใช้ทั้งในตาราง แถบสรุป และ Sheet จึงย้ายออกจาก use-document-table
ของเดิมหยุดที่ MB ทำให้ยอดรวมระดับ GB อ่านเป็น 3788.8 MB"
```

---

## Task 4: frontend — type, endpoint, hook

**Files:**
- Modify: `types/document.ts` (ต่อท้ายไฟล์)
- Modify: `constant/api-endpoints.ts` (แทรกหลัง `DOCUMENTS` บรรทัด 90)
- Modify: `hooks/use-document.ts` (แทรกหลัง `useDocument` ที่จบบรรทัด 42)

**Interfaces:**
- Consumes: `useBuCode` · `httpClient` · `API_ENDPOINTS` · `QUERY_KEYS` · `CACHE_DYNAMIC` —
  import ไว้แล้วทั้งหมดใน `use-document.ts`
- Produces: `DocumentSummary` / `DocumentSummaryRow` จาก `@/types/document` ·
  `useDocumentSummary(): UseQueryResult<DocumentSummary>` จาก `@/hooks/use-document`

- [ ] **Step 1: เพิ่ม type**

ต่อท้าย `types/document.ts`:

```ts
/** หนึ่งแถวของสรุป — โมดูลต้นทางหนึ่งโมดูล (`reference_type === null` = อัปโหลดจากหน้า Document โดยตรง) */
export interface DocumentSummaryRow {
  reference_type: string | null;
  size: number;
  count: number;
}

/** ยอดสรุปไฟล์แนบทั้ง BU — `by_reference_type` เรียงจากขนาดมากไปน้อยมาจาก backend แล้ว */
export interface DocumentSummary {
  total_size: number;
  total_count: number;
  by_reference_type: DocumentSummaryRow[];
}
```

- [ ] **Step 2: เพิ่ม endpoint**

แทรกใน `constant/api-endpoints.ts` ต่อจากบรรทัด 90 (`DOCUMENTS: ...`):

```ts
  DOCUMENTS_SUMMARY: (buCode: string) =>
    `/api/proxy/api/${buCode}/documents/summary`,
```

- [ ] **Step 3: เพิ่ม hook**

แทรกใน `hooks/use-document.ts` ต่อจากปีกกาปิดของ `useDocument` (บรรทัด 42)
และเพิ่ม `DocumentSummary` เข้ากับ import type ที่บรรทัด 8:

```ts
import type { DocumentFile, DocumentSummary } from "@/types/document";
```

```ts
/**
 * Hook ดึงยอดสรุปขนาดไฟล์แนบของทั้ง BU
 *
 * ยอดนี้เป็นของทั้ง BU เสมอ ไม่ผูกกับ search/filter/หน้าของตาราง จึงไม่รับ params
 * query key ขึ้นต้นด้วย QUERY_KEYS.DOCUMENTS เหมือน useDocument โดยตั้งใจ —
 * TanStack Query จับคู่ key แบบ prefix การ invalidate หลัง upload/delete ที่มีอยู่แล้ว
 * จึงล้างยอดสรุปให้ด้วยโดยไม่ต้องแก้อะไรเพิ่ม
 *
 * `retry: false` เพราะเคสพังที่คาดไว้คือ 401 จาก app allowlist ที่ยังไม่เติมตอน deploy
 * ซึ่ง retry แล้วก็ไม่หาย มีแต่จะยิงซ้ำเปล่า ๆ
 *
 * @returns UseQueryResult ของ DocumentSummary
 * @example
 * const { data: summary, isLoading } = useDocumentSummary();
 */
export function useDocumentSummary() {
  const buCode = useBuCode();

  return useQuery<DocumentSummary>({
    queryKey: [QUERY_KEYS.DOCUMENTS, buCode, "summary"],
    queryFn: async () => {
      if (!buCode) throw new Error("Missing buCode");
      const res = await httpClient.get(API_ENDPOINTS.DOCUMENTS_SUMMARY(buCode));
      if (!res.ok) throw new Error("Failed to fetch document summary");
      const json = await res.json();
      return json.data as DocumentSummary;
    },
    ...CACHE_DYNAMIC,
    enabled: !!buCode,
    retry: false,
  });
}
```

- [ ] **Step 4: type-check + lint**

```bash
bunx tsc --noEmit && bun run lint
```
คาดหวัง: สะอาด

- [ ] **Step 5: commit**

```bash
git add types/document.ts constant/api-endpoints.ts hooks/use-document.ts
git commit -m "feat(document): เพิ่ม hook useDocumentSummary

query key ขึ้นต้นด้วย QUERY_KEYS.DOCUMENTS ให้ invalidate เดิมหลัง upload/delete
ครอบถึงยอดสรุปด้วย และปิด retry เพราะเคสพังที่คาดไว้คือ 401 จาก allowlist"
```

---

## Task 5: frontend — แผนที่ label และ i18n

**Files:**
- Create: `routes/system-admin/document/document-reference-labels.ts`
- Modify: `messages/en.json`
- Modify: `messages/th.json`

**Interfaces:**
- Produces: `documentReferenceLabel(referenceType: string | null, tModules: (key: string) =>
  string, directUploadLabel: string): string` — ใช้ใน Task 6 และ 7
  · i18n namespace `systemAdmin.document.summary` มี key: `title`, `description`, `viewAll`,
  `fileCount`, `directUpload`

- [ ] **Step 1: สร้าง `document-reference-labels.ts`**

```ts
/**
 * แผนที่ `reference_type` ที่ backend ผูกไว้กับไฟล์ → key ใต้ namespace `modules` ของ i18n
 *
 * ครอบ 31 ค่าจาก 39 ค่าที่ backend ใช้จริง (สแกนจาก carmen-turborepo-backend-v2)
 * ที่เหลืออีก 8 ค่ามี key ของตัวเองที่เพิ่มเข้าไปพร้อมกัน
 */
export const DOCUMENT_REFERENCE_MODULE_KEY: Record<string, string> = {
  config_running_code: "runningCode",
  credit_note: "creditNote",
  credit_term: "creditTerm",
  currency: "currency",
  delivery_point: "deliveryPoint",
  department: "department",
  dimension: "dimension",
  exchange_rate: "exchangeRate",
  extra_cost: "extraCost",
  good_received_note: "goodsReceiveNote",
  location: "storeLocation",
  news: "news",
  period: "period",
  physical_count: "physicalCount",
  physical_count_period: "physicalCountPeriod",
  pricelist: "priceList",
  pricelist_template: "priceListTemplate",
  product: "product",
  product_category: "productCategory",
  product_item_group: "productItemGroup",
  product_master_eco_label: "eco",
  product_sub_category: "productSubCategory",
  purchase_order: "purchaseOrder",
  purchase_request: "purchaseRequest",
  purchase_request_template: "purchaseRequestTemplate",
  recipe: "operationRecipe",
  recipe_equipment: "operationEquipment",
  recipe_preparation_step: "recipePreparationStep",
  request_for_pricing: "requestPriceList",
  spot_check: "spotCheck",
  stock_in: "stockIn",
  stock_out: "stockOut",
  store_requisition: "storeRequisition",
  tax_profile: "taxProfile",
  unit: "unit",
  vendor: "vendor",
  vendor_business_type: "businessType",
  vendor_master_certificate: "certification",
  workflow: "workflow",
};

/** ตัวแปล i18n ที่รับ key เป็นสตริง — แบบเดียวกับ `routes/system-admin/landing-types.ts:149` */
type TFn = (key: string) => string;

/**
 * แปลง `reference_type` เป็นข้อความที่ผู้ใช้อ่านรู้เรื่อง
 *
 * ค่าที่ยังไม่มีในแผนที่จะถูกคืนเป็น**สตริงดิบตามจริง** ไม่ยุบเป็น "อื่น ๆ" — หน้านี้เป็น
 * เครื่องมือของผู้ดูแลระบบ การเห็นถังที่ระบบยังไม่รู้จักคือข้อมูลที่มีค่า และทำให้
 * reference_type ใหม่ที่ backend เพิ่มเข้ามาโผล่เองโดยไม่ต้อง release frontend
 *
 * @param referenceType - ค่าจาก backend (`null` = ไฟล์ที่อัปโหลดจากหน้า Document โดยตรง)
 * @param tModules - ตัวแปลของ namespace `modules` (ได้จาก `useTranslations("modules")`)
 * @param directUploadLabel - ข้อความสำหรับไฟล์ที่ไม่มี `reference_type`
 * @returns ข้อความที่พร้อมแสดงผล
 * @example
 * documentReferenceLabel("purchase_request", tm, "อัปโหลดโดยตรง"); // "ใบขอซื้อ"
 * documentReferenceLabel(null, tm, "อัปโหลดโดยตรง");              // "อัปโหลดโดยตรง"
 * documentReferenceLabel("brand_new_thing", tm, "…");             // "brand_new_thing"
 */
export function documentReferenceLabel(
  referenceType: string | null,
  tModules: TFn,
  directUploadLabel: string,
): string {
  if (!referenceType) return directUploadLabel;
  const key = DOCUMENT_REFERENCE_MODULE_KEY[referenceType];
  return key ? tModules(key) : referenceType;
}
```

- [ ] **Step 2: เพิ่ม key ใหม่ 8 ตัวใต้ `modules` ของ `messages/en.json`**

แทรกในบล็อก `"modules"` (รักษาการเรียงแบบเดิมของบล็อก — วางใกล้ key ที่เกี่ยวข้อง):

```json
"dimension": "Dimension",
"news": "News",
"physicalCountPeriod": "Physical Count Period",
"productItemGroup": "Item Group",
"productSubCategory": "Sub Category",
"recipePreparationStep": "Preparation Step",
"stockIn": "Stock In",
"stockOut": "Stock Out",
```

- [ ] **Step 3: เพิ่ม key ชุดเดียวกันใต้ `modules` ของ `messages/th.json`**

```json
"dimension": "มิติ",
"news": "ข่าวสาร",
"physicalCountPeriod": "รอบตรวจนับ",
"productItemGroup": "กลุ่มสินค้า",
"productSubCategory": "หมวดหมู่ย่อย",
"recipePreparationStep": "ขั้นตอนการเตรียม",
"stockIn": "รับเข้าสต็อก",
"stockOut": "เบิกออกสต็อก",
```

- [ ] **Step 4: เพิ่มบล็อก `summary` ใต้ `systemAdmin.document` ของ `messages/en.json`**

ต่อจาก `"searchType": "Search file type..."`:

```json
"summary": {
  "title": "Storage by module",
  "description": "Total attachment size for this business unit, grouped by the module each file came from.",
  "viewAll": "View all",
  "fileCount": "{count, plural, one {# file} other {# files}}",
  "directUpload": "Direct upload"
}
```

- [ ] **Step 5: เพิ่มบล็อกเดียวกันใน `messages/th.json`**

ภาษาไทยไม่มีรูปพหูพจน์ จึงไม่ต้องใช้ ICU plural — แต่ยังต้องรับตัวแปร `count` ชื่อเดียวกัน:

```json
"summary": {
  "title": "พื้นที่จัดเก็บแยกตามโมดูล",
  "description": "ขนาดไฟล์แนบรวมของหน่วยธุรกิจนี้ แยกตามโมดูลที่อัปโหลดไฟล์เข้ามา",
  "viewAll": "ดูทั้งหมด",
  "fileCount": "{count} ไฟล์",
  "directUpload": "อัปโหลดโดยตรง"
}
```

- [ ] **Step 6: ตรวจว่า JSON ยังอ่านได้และ key ครบทั้งสองภาษา**

```bash
node -e '
const en=require("./messages/en.json"), th=require("./messages/th.json");
const mods=["dimension","news","physicalCountPeriod","productItemGroup","productSubCategory","recipePreparationStep","stockIn","stockOut"];
const sum=["title","description","viewAll","fileCount","directUpload"];
let bad=0;
for(const k of mods) if(!en.modules?.[k]||!th.modules?.[k]){console.log("MISSING modules."+k);bad++}
for(const k of sum) if(!en.systemAdmin?.document?.summary?.[k]||!th.systemAdmin?.document?.summary?.[k]){console.log("MISSING summary."+k);bad++}
console.log(bad?"FAIL":"OK");
'
```
คาดหวัง: `OK`

- [ ] **Step 7: type-check + lint + เทสต์เดิม**

```bash
bunx tsc --noEmit && bun run lint && bun test:run 2>&1 | tail -10
```
คาดหวัง: สะอาดทั้งหมด (มีเทสต์ที่เทียบ key ระหว่าง en/th อยู่ — ถ้าแดงแปลว่าเติมไม่ครบสองภาษา)

- [ ] **Step 8: commit**

```bash
git add routes/system-admin/document/document-reference-labels.ts messages/en.json messages/th.json
git commit -m "feat(document): เพิ่มแผนที่ reference_type → ชื่อโมดูล และ i18n ของสรุป

31 ใน 39 ค่ายืม key ใต้ modules ที่มีอยู่แล้วได้ เพิ่มใหม่ 8 ตัว
ค่าที่ไม่รู้จักคืนสตริงดิบ ไม่ยุบเป็นอื่น ๆ เพื่อให้ค่าใหม่จาก backend
โผล่เองโดยไม่ต้อง release frontend"
```

---

## Task 6: frontend — Sheet รายละเอียด

**Files:**
- Create: `routes/system-admin/document/document-summary-sheet.tsx`

**Interfaces:**
- Consumes: `formatFileSize` (Task 3) · `DocumentSummary` (Task 4) ·
  `documentReferenceLabel` + i18n `systemAdmin.document.summary` (Task 5) ·
  `Sheet`/`SheetContent`/`SheetHeader`/`SheetTitle`/`SheetDescription` จาก `@/components/ui/sheet` ·
  `Progress` จาก `@/components/ui/progress`
- Produces: `export default function DocumentSummarySheet(props: { open: boolean;
  onOpenChange: (open: boolean) => void; summary: DocumentSummary })` — ใช้ใน Task 7

- [ ] **Step 1: สร้าง `document-summary-sheet.tsx`**

```tsx
import { useTranslations } from "use-intl";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { formatFileSize } from "@/lib/format-file-size";
import { documentReferenceLabel } from "./document-reference-labels";
import type { DocumentSummary } from "@/types/document";

interface DocumentSummarySheetProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly summary: DocumentSummary;
}

/**
 * Sheet แจกแจงพื้นที่จัดเก็บไฟล์แนบของ BU ทีละโมดูลต้นทาง
 *
 * เป็น presentational ล้วน ไม่ fetch เอง — หน้าที่ส่ง summary ที่โหลดแล้วเข้ามา
 * แถบสัดส่วนใช้สีเดียวกันทุกแถวโดยตั้งใจ (DESIGN.md ห้ามใช้สีสื่อความหมาย)
 * ความยาวแถบคือตัวสื่อสารสัดส่วน และมีตัวเลข % กำกับไว้ไม่ให้พึ่งสายตาอย่างเดียว
 *
 * @param props - props ของ DocumentSummarySheet
 * @param props.open - เปิดอยู่หรือไม่
 * @param props.onOpenChange - callback เมื่อสถานะเปิด/ปิดเปลี่ยน
 * @param props.summary - ยอดสรุปที่โหลดมาแล้ว
 * @returns JSX element ของ sheet
 * @example
 * <DocumentSummarySheet open={open} onOpenChange={setOpen} summary={summary} />
 */
export default function DocumentSummarySheet({
  open,
  onOpenChange,
  summary,
}: DocumentSummarySheetProps) {
  const t = useTranslations("systemAdmin.document.summary");
  const tm = useTranslations("modules");
  const directUpload = t("directUpload");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="pr-12">
          <SheetTitle>{t("title")}</SheetTitle>
          <SheetDescription>{t("description")}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-6">
          <p className="flex items-baseline gap-2">
            <span className="text-sm font-semibold tabular-nums">
              {formatFileSize(summary.total_size)}
            </span>
            <span className="text-muted-foreground text-xs tabular-nums">
              {t("fileCount", { count: summary.total_count })}
            </span>
          </p>

          <ul className="space-y-3">
            {summary.by_reference_type.map((row) => {
              const percent =
                summary.total_size > 0
                  ? (row.size / summary.total_size) * 100
                  : 0;
              return (
                <li
                  key={row.reference_type ?? "__direct_upload__"}
                  className="space-y-1"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-xs">
                      {documentReferenceLabel(
                        row.reference_type,
                        tm,
                        directUpload,
                      )}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums">
                      {formatFileSize(row.size)}
                    </span>
                  </div>
                  <Progress
                    value={percent}
                    variant="primary"
                    className="h-1.5"
                  />
                  <div className="text-muted-foreground text-micro flex justify-between tabular-nums">
                    <span>{t("fileCount", { count: row.count })}</span>
                    <span>{percent.toFixed(1)}%</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: type-check + lint**

```bash
bunx tsc --noEmit && bun run lint
```
คาดหวัง: สะอาด (ไฟล์ยังไม่มีใครเรียก — ปกติ Task 7 จะต่อให้)

- [ ] **Step 3: guard ขนาดตัวอักษรต้องไม่แดง**

```bash
bun test:run components/ui/type-ladder.test.ts 2>&1 | tail -10
```
คาดหวัง: ผ่าน — ถ้าแดงแปลว่ามี `text-[...]` ดิบหลุดเข้ามา ให้เปลี่ยนเป็น token ตาม Global Constraints

- [ ] **Step 4: commit**

```bash
git add routes/system-admin/document/document-summary-sheet.tsx
git commit -m "feat(document): เพิ่ม Sheet แจกแจงพื้นที่จัดเก็บตามโมดูล

presentational ล้วน รับ summary เข้ามา แถบสัดส่วนสีเดียวกันทุกแถว
พร้อมตัวเลข % กำกับ ไม่ให้พึ่งสายตาอย่างเดียว"
```

---

## Task 7: frontend — แถบสรุปและต่อเข้าหน้า

**Files:**
- Create: `routes/system-admin/document/document-summary-bar.tsx`
- Modify: `routes/system-admin/document/document-component.tsx`

**Interfaces:**
- Consumes: `useDocumentSummary` (Task 4) · `DocumentSummarySheet` (Task 6) ·
  `formatFileSize` (Task 3) · `documentReferenceLabel` (Task 5)
- Produces: `export default function DocumentSummaryBar(props: { summary: DocumentSummary |
  undefined; isLoading: boolean; onViewAll: () => void })`

- [ ] **Step 1: สร้าง `document-summary-bar.tsx`**

```tsx
import { ChevronRight } from "lucide-react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatFileSize } from "@/lib/format-file-size";
import { documentReferenceLabel } from "./document-reference-labels";
import type { DocumentSummary } from "@/types/document";

interface DocumentSummaryBarProps {
  readonly summary: DocumentSummary | undefined;
  readonly isLoading: boolean;
  readonly onViewAll: () => void;
}

/**
 * แถบสรุปขนาดไฟล์แนบรวมของ BU วางเหนือช่องค้นหาในหน้า Document
 *
 * ยอดเป็นของทั้ง BU เสมอ ไม่ขยับตาม filter ของตาราง
 * เมื่อโหลดไม่สำเร็จ (รวม 401 จาก app allowlist ที่ยังไม่เติมตอน deploy) หรือ BU
 * ยังไม่มีไฟล์เลย จะคืน null ไปเงียบ ๆ — แถบนี้เป็นข้อมูลเสริม หน้าต้องใช้งานได้ครบ
 * เหมือนเดิมโดยไม่ขึ้น error state ให้ผู้ใช้ต้องจัดการ
 *
 * @param props - props ของ DocumentSummaryBar
 * @param props.summary - ยอดสรุป (undefined ระหว่างโหลดหรือเมื่อ error)
 * @param props.isLoading - กำลังโหลดอยู่หรือไม่
 * @param props.onViewAll - callback เปิด Sheet รายละเอียด
 * @returns JSX element ของแถบสรุป หรือ null
 * @example
 * <DocumentSummaryBar summary={data} isLoading={isLoading} onViewAll={open} />
 */
export default function DocumentSummaryBar({
  summary,
  isLoading,
  onViewAll,
}: DocumentSummaryBarProps) {
  const t = useTranslations("systemAdmin.document.summary");
  const tm = useTranslations("modules");

  if (isLoading) return <Skeleton className="h-14 w-full rounded-md" />;
  if (!summary || summary.total_count === 0) return null;

  const directUpload = t("directUpload");
  const top = summary.by_reference_type
    .slice(0, 3)
    .map(
      (row) =>
        `${documentReferenceLabel(row.reference_type, tm, directUpload)} ${formatFileSize(row.size)}`,
    )
    .join(" · ");

  return (
    <div className="bg-muted/40 flex flex-col gap-1 rounded-md border px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-semibold tabular-nums">
          {formatFileSize(summary.total_size)}
        </span>
        <span className="text-muted-foreground text-xs tabular-nums">
          {t("fileCount", { count: summary.total_count })}
        </span>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-muted-foreground truncate text-xs">{top}</span>
        <Button
          variant="link"
          size="sm"
          className="h-auto shrink-0 px-0"
          onClick={onViewAll}
        >
          {t("viewAll")}
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: ต่อเข้า `document-component.tsx` — import และ state**

เพิ่ม import ต่อจากบรรทัด 23 (`import DocumentCard from "./document-card";`):

```tsx
import DocumentSummaryBar from "./document-summary-bar";
import DocumentSummarySheet from "./document-summary-sheet";
```

เพิ่ม `useDocumentSummary` เข้ากับ import ที่บรรทัด 15-19:

```tsx
import {
  useDocument,
  useDocumentSummary,
  useUploadDocument,
  useDeleteDocument,
} from "@/hooks/use-document";
```

เพิ่ม state ต่อจากบรรทัด 81 (`const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);`):

```tsx
  const [summarySheetOpen, setSummarySheetOpen] = useState(false);
  const { data: summary, isLoading: isSummaryLoading } = useDocumentSummary();
  const hasSummary = !!summary && summary.total_count > 0;
```

- [ ] **Step 3: render แถบสรุป**

แทรกใน JSX ระหว่างบล็อกหัวเรื่อง (`</div>` ที่ปิด `flex flex-col gap-2 sm:flex-row...` บรรทัด 214)
กับบล็อกช่องค้นหา (`<div className="flex w-full items-center gap-2">` บรรทัด 216):

```tsx
        <DocumentSummaryBar
          summary={summary}
          isLoading={isSummaryLoading}
          onViewAll={() => setSummarySheetOpen(true)}
        />
```

- [ ] **Step 4: render Sheet**

แทรกก่อน `<SaveViewDialog ...>` (บรรทัด 315) — render เฉพาะเมื่อมีข้อมูล เพราะ Sheet รับ
`summary` แบบไม่ยอมรับ `undefined`:

```tsx
      {hasSummary && (
        <DocumentSummarySheet
          open={summarySheetOpen}
          onOpenChange={setSummarySheetOpen}
          summary={summary}
        />
      )}
```

- [ ] **Step 5: แก้ `max-h` ของ `DataGridContainer` ให้เผื่อความสูงแถบ**

แทนที่บล็อก `className={cn(...)}` เดิม (บรรทัด 278-283) ด้วย:

```tsx
              className={cn(
                "flex flex-col",
                // แถบสรุปสูงประมาณ 4rem รวมช่องไฟ — สี่เคสตามว่ามีแถบและมี active filter หรือไม่
                // ไม่เผื่อค่านี้ ตารางจะล้นจอเมื่อแถบขึ้น
                hasSummary
                  ? lf.activeFilters.length > 0
                    ? "max-h-[calc(100vh-17rem-3rem)]"
                    : "max-h-[calc(100vh-14rem-3rem)]"
                  : lf.activeFilters.length > 0
                    ? "max-h-[calc(100vh-13rem-3rem)]"
                    : "max-h-[calc(100vh-10rem-3rem)]",
              )}
```

- [ ] **Step 6: type-check + lint + เทสต์เดิมทั้งชุด**

```bash
bunx tsc --noEmit && bun run lint && bun test:run 2>&1 | tail -15
```
คาดหวัง: สะอาดทั้งหมด

- [ ] **Step 7: ตรวจด้วยมือในเบราว์เซอร์**

รัน `VITE_DEV_PROXY_TARGET=http://localhost:4000 bun dev` แล้วเปิด
`http://localhost:3000/system-admin/document` ตรวจให้ครบ:

1. แถบสรุปขึ้นเหนือช่องค้นหา ยอดรวมอ่านเป็นหน่วยที่เหมาะสม (ไม่ใช่ "3788.8 MB")
2. ยอดตรงกับความจริง — เทียบกับคิวรีตรง:
   `SELECT count(*), sum(size) FROM <schema>.tb_file_tag WHERE bu_code='<BU>' AND deleted_at IS NULL`
3. กด "ดูทั้งหมด" → Sheet เปิด แจกแจงครบ เรียงจากมากไปน้อย ผลรวม % ≈ 100
4. ค้นหา / เปลี่ยนตัวกรอง / เปลี่ยนหน้าตาราง → **ยอดในแถบต้องไม่เปลี่ยน** และ**ตารางต้อง
   เปลี่ยนหน้าได้จริง** — Step 5 เพิ่ม dependency ใหม่ (`hasSummary`) เข้าไปในบล็อก JSX ที่ห่อ
   `<DataGrid>` ซึ่งเป็นจุดที่ React Compiler เคยแช่ผลลัพธ์เดิมไว้จนตารางค้าง (ดู CLAUDE.md)
   ถ้ากดหน้า 2 แล้ว URL เปลี่ยนแต่แถวไม่เปลี่ยน ให้ใส่ `"use no memo";` เป็นบรรทัดแรกของ
   `DocumentComponent`
5. อัปโหลดไฟล์ → ยอดขยับเองโดยไม่ต้องรีเฟรช
6. สลับ BU → ยอดเปลี่ยนตาม
7. สลับภาษา th ↔ en → ชื่อโมดูลเปลี่ยนตาม ไม่มี key ดิบโผล่
8. ตารางไม่ล้นจอ ทั้งตอนมีและไม่มี active filter
9. ปิด backend (หรือแก้ endpoint ให้ผิดชั่วคราว) → **แถบหายไปเงียบ ๆ ตารางยังทำงาน ไม่มี toast**
10. เปิด console → ไม่มี error

- [ ] **Step 8: commit**

```bash
git add routes/system-admin/document/document-summary-bar.tsx \
        routes/system-admin/document/document-component.tsx
git commit -m "feat(document): แสดงแถบสรุปขนาดไฟล์แนบของ BU เหนือตาราง

ยอดเป็นของทั้ง BU ไม่ขยับตาม filter ของตาราง กด ดูทั้งหมด เปิด Sheet
แจกแจงตามโมดูล เมื่อโหลดไม่สำเร็จหรือ BU ยังไม่มีไฟล์ แถบหายไปเงียบ ๆ
ปรับ max-h ของตารางเผื่อความสูงแถบ ไม่งั้นล้นจอ"
```

---

## หลังทำครบทุก task

- [ ] เปิด PR ทั้งสองรีโป (PR เขียนภาษาอังกฤษตาม CLAUDE.md) และ**เขียนคำเตือนเดียวกันใน PR ทั้ง
  backend และ frontend ว่า deploy ต้องเติม `documents.summary` ใน app allowlist ทุก environment**
  ไม่งั้น 401 — เดิมเขียนไว้แค่ PR ของ backend ฝั่งเดียว แต่ตัว deploy ที่ทำให้ปัญหาเกิดจริงคือตอน
  frontend ขึ้น (ดู spec §6, §8) คนกด merge/deploy frontend อาจไม่ใช่คนอ่าน PR ของ backend จึงต้องมี
  คำเตือนอยู่ใน PR frontend ด้วย ไม่ใช่แค่ backend
- [ ] merge backend ก่อน frontend เสมอ — สลับลำดับได้แค่แถบสรุปไม่ขึ้น หน้าไม่พัง
