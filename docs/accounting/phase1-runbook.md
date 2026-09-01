# Accounting Phase 1 Runbook

เอกสารนี้ใช้สำหรับ deploy และตรวจสอบ General Ledger / Journal Voucher บน branch `dev2`

## 1. Preconditions

- ใช้ frontend และ backend จาก branch `dev2`
- ตั้งค่า tenant database connection (`DATABASE_URL` หรือ connection config ตาม runtime ของ backend)
- ตรวจสอบว่ามี accounting period แบบ `open`
- ตรวจสอบ Chart of Accounts, Currency และ Department ที่จะใช้ใน test data

## 2. Database migration

รันจาก backend repository:

```text
cd packages/prisma-shared-schema-tenant
bun run db:generate
bun run db:deploy
```

Migration ที่เกี่ยวข้องคือ `20260831120000_add_general_ledger_phase1` และสร้าง JV/GL/Staging tables รวมถึง indexes และ idempotency constraints

## 3. Smoke test sequence

1. เปิด `/accounting/journal-voucher` และสร้าง Draft ที่มีอย่างน้อย 2 lines
2. ตรวจ functional-currency balance และ Submit เมื่อ workflow ปิด
3. เปิด workflow แล้วตรวจ `submitted → approve → posting/posted`
4. ตรวจ Schedule Post และ `processDue`
5. ตรวจ Auto-Reverse/Manual Reverse และ linked JV
6. ตั้ง `accounting_gl.journal_staging_mode = strict`
7. สร้าง Staging Batch, Process, แก้ duplicate/error แล้ว Generate JV
8. ตรวจว่า generated JV มี `source_type=batch-generated` และแก้ accounting fields ไม่ได้

## 4. Verification commands

```text
cd apps/micro-business
bun run build
bunx vitest run src/accounting/journal-staging/dto/journal-staging.dto.spec.ts src/accounting/journal-voucher/journal-voucher.validation.spec.ts

cd ../backend-gateway
bun run build
bun run ../../scripts/audit-app-api-catalog-drift/run.ts
```

ถ้ายังไม่มี database connection ให้หยุดที่ build/test verification และห้ามอ้างว่า migration/runtime deployment สำเร็จ
