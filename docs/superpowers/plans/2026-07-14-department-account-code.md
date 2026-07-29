# Department `account_code` Field Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional, free-text `account_code` field to the Department entity, persisted end-to-end from Postgres through to the frontend form, list table, and mobile card.

**Architecture:** Two repos. Backend (`carmen-turborepo-backend-v2`, NestJS microservice monorepo + Prisma) gets a nullable scalar column plus DTO/serializer additions — the department service already spreads `...data` into Prisma so no service logic changes. Frontend (`carmen-inventory-frontend-react`, Vite + React Router SPA) adds the field to its type, Zod form schema, form input, table column, and card.

**Tech Stack:** Backend — Prisma, Zod (`nestjs-zod`), NestJS, jest, bun. Frontend — React 19, react-hook-form, Zod, TanStack Table, `use-intl`, vitest, bun.

## Global Constraints

- **Repo paths (absolute):**
  - Backend: `/Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2`
  - Frontend: `/Users/samutpra/GitHub/carmensoftware-organize/carmen-inventory-frontend-react` (branch `feat/department-account-code` already exists with the spec commit)
- **Field semantics:** optional, free text, no format enforcement, no uniqueness, no trimming, no server-side normalization.
- **Column type:** Postgres `VARCHAR`, Prisma `String? @db.VarChar`.
- **Frontend input constraint:** `maxLength={30}`, no `required` marker.
- **i18n key:** `field.accountCode` in the singular `field` namespace = `"Account Code"` (en) / `"รหัสบัญชี"` (th).
- **Commit language:** English. Conventional Commits.
- **Backend test:** each app runs jest via bun. Run a single spec from the app dir: `bunx jest <path-or-pattern>`.
- **Frontend gates:** `bunx tsc --noEmit && bun test:run` must be clean before finishing.
- **Spec:** `docs/superpowers/specs/2026-07-14-department-account-code-design.md` (in the frontend repo).

---

## Backend — carmen-turborepo-backend-v2

### Task 1: Prisma column + migration

**Files:**
- Modify: `packages/prisma-shared-schema-tenant/prisma/schema.prisma` (model `tb_department`)
- Create: `packages/prisma-shared-schema-tenant/prisma/migrations/20260714120000_add_department_account_code/migration.sql`
- Regenerate: `packages/prisma-shared-schema-tenant/generated/tb_department.ts` (via `prisma generate`)

**Interfaces:**
- Produces: the Prisma `tb_department` model now carries a nullable `account_code` string column. Every later backend task depends on this column existing.

- [ ] **Step 1: Add the column to the Prisma model**

In `packages/prisma-shared-schema-tenant/prisma/schema.prisma`, find `model tb_department {` and its `is_active` line. Add `account_code` right after `is_active`:

```prisma
  is_active   Boolean? @default(true)

  account_code String? @db.VarChar

  note      String? @db.VarChar
```

- [ ] **Step 2: Validate the schema**

Run: `cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2/packages/prisma-shared-schema-tenant && bunx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid 🚀`

- [ ] **Step 3: Hand-author the migration SQL**

Create `packages/prisma-shared-schema-tenant/prisma/migrations/20260714120000_add_department_account_code/migration.sql` (matching the existing hand-authored migration convention in this folder):

```sql
-- AlterTable: add optional accounting code to departments
ALTER TABLE "tb_department" ADD COLUMN "account_code" VARCHAR;
```

- [ ] **Step 4: Regenerate the Prisma client**

Run: `cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2/packages/prisma-shared-schema-tenant && bunx prisma generate`
Expected: `Generated Prisma Client` success message.

- [ ] **Step 5: Verify the generated type includes the column**

Run: `grep -n "account_code" packages/prisma-shared-schema-tenant/generated/tb_department.ts`
Expected: at least one match showing `account_code` in the generated type.

- [ ] **Step 6: Commit**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2
git add packages/prisma-shared-schema-tenant/prisma/schema.prisma \
        packages/prisma-shared-schema-tenant/prisma/migrations/20260714120000_add_department_account_code/migration.sql \
        packages/prisma-shared-schema-tenant/generated/tb_department.ts
git commit -m "feat(department): add account_code column to tb_department"
```

---

### Task 2: micro-business DTO + serializer (+ persistence test)

**Files:**
- Modify: `apps/micro-business/src/master/departments/dto/department.dto.ts` (`DepartmentCreateSchema`, `DepartmentUpdateSchema`)
- Modify: `apps/micro-business/src/master/departments/dto/department.serializer.ts` (`DepartmentDetailResponseSchema`, `DepartmentListItemResponseSchema`)
- Test (create): `apps/micro-business/src/master/departments/dto/department.dto.spec.ts`
- Test (modify): `apps/micro-business/src/master/departments/departments.service.spec.ts`

**Interfaces:**
- Consumes: the `tb_department.account_code` column from Task 1.
- Produces: `DepartmentCreateSchema` / `DepartmentUpdateSchema` accept and preserve `account_code`; the serializer response schemas keep `account_code` on read. The gateway task mirrors these shapes.

- [ ] **Step 1: Write the failing DTO test**

Create `apps/micro-business/src/master/departments/dto/department.dto.spec.ts`:

```typescript
import { DepartmentCreateSchema, DepartmentUpdateSchema } from './department.dto';

describe('Department DTO schemas — account_code', () => {
  it('create schema preserves account_code', () => {
    const parsed = DepartmentCreateSchema.parse({
      code: 'D01',
      name: 'Kitchen',
      account_code: 'ACC-100',
    });
    expect(parsed.account_code).toBe('ACC-100');
  });

  it('create schema treats account_code as optional', () => {
    const parsed = DepartmentCreateSchema.parse({ code: 'D01', name: 'Kitchen' });
    expect(parsed.account_code).toBeUndefined();
  });

  it('update schema preserves account_code', () => {
    const parsed = DepartmentUpdateSchema.parse({
      doc_version: 1,
      account_code: 'ACC-200',
    });
    expect(parsed.account_code).toBe('ACC-200');
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2/apps/micro-business && bunx jest src/master/departments/dto/department.dto.spec.ts`
Expected: FAIL — `account_code` is `undefined` on the first test (Zod strips the undeclared key).

- [ ] **Step 3: Add account_code to the micro DTO schemas**

In `apps/micro-business/src/master/departments/dto/department.dto.ts`, add to `DepartmentCreateSchema` (after `is_active`):

```typescript
  is_active: z.boolean().default(true).nullable().optional(),
  account_code: z.string().optional(),
```

And to `DepartmentUpdateSchema` (after its `is_active`):

```typescript
  is_active: z.boolean().optional(),
  account_code: z.string().optional(),
```

- [ ] **Step 4: Run the DTO test — now passing**

Run: `cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2/apps/micro-business && bunx jest src/master/departments/dto/department.dto.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Add account_code to the serializer response schemas**

In `apps/micro-business/src/master/departments/dto/department.serializer.ts`:

In `DepartmentDetailResponseSchema`, after `is_active`:

```typescript
  is_active: z.boolean().optional(),
  account_code: z.string().nullable().optional(),
```

In `DepartmentListItemResponseSchema`, after `is_active`:

```typescript
  is_active: z.boolean().optional(),
  account_code: z.string().nullable().optional(),
```

- [ ] **Step 6: Write the failing service persistence test**

Add this block to `apps/micro-business/src/master/departments/departments.service.spec.ts`, inside the top-level `describe('DepartmentsService', ...)` (e.g. after the `code uniqueness` describe). It runs the `$transaction` callback with a tx mock and asserts `account_code` reaches `tb_department.create`:

```typescript
  describe('account_code persistence', () => {
    it('create passes account_code through to tb_department.create', async () => {
      const txCreate = jest.fn(() => Promise.resolve({ id: 'new-id' }));
      const tx = {
        tb_department: { create: txCreate },
        tb_department_user: { createMany: jest.fn() },
      };
      const mockPrisma = {
        // both name and code uniqueness checks resolve to null (no duplicate)
        tb_department: { findFirst: jest.fn(() => Promise.resolve(null)) },
        $transaction: jest.fn((cb: (t: unknown) => unknown) => cb(tx)),
      };
      withPrisma(mockPrisma);

      await service.create({
        code: 'D01',
        name: 'Kitchen',
        account_code: 'ACC-100',
      } as never);

      expect(txCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ account_code: 'ACC-100' }),
        }),
      );
    });
  });
```

- [ ] **Step 7: Run the service test**

Run: `cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2/apps/micro-business && bunx jest src/master/departments/departments.service.spec.ts`
Expected: PASS. (The service already spreads `...data` into `tb_department.create`, so no service code change is needed — this test proves the spread carries the new field. If it fails because the transaction mock shape differs, align the tx mock with the actual `create` method body in `departments.service.ts`.)

- [ ] **Step 8: Commit**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2
git add apps/micro-business/src/master/departments/dto/department.dto.ts \
        apps/micro-business/src/master/departments/dto/department.serializer.ts \
        apps/micro-business/src/master/departments/dto/department.dto.spec.ts \
        apps/micro-business/src/master/departments/departments.service.spec.ts
git commit -m "feat(department): accept and serialize account_code in micro-business"
```

---

### Task 3: gateway DTO + swagger (+ test)

**Files:**
- Modify: `apps/backend-gateway/src/common/dto/department/department.create.dto.ts`
- Modify: `apps/backend-gateway/src/common/dto/department/department.update.dto.ts`
- Modify: `apps/backend-gateway/src/config/config_departments/swagger/request.ts` (`DepartmentCreateRequestDto`, `DepartmentUpdateRequestDto`)
- Modify: `apps/backend-gateway/src/config/config_departments/swagger/response.ts` (`DepartmentResponseDto`)
- Test: `apps/backend-gateway/src/common/dto/department/department.dto.spec.ts`

**Interfaces:**
- Consumes: mirrors the micro-business DTO shape from Task 2.
- Produces: the gateway request body validation accepts `account_code` and forwards it unchanged to micro-business; swagger docs advertise the field.

- [ ] **Step 1: Write the failing gateway DTO test**

Create `apps/backend-gateway/src/common/dto/department/department.dto.spec.ts`:

```typescript
import { DepartmentCreateSchema } from './department.create.dto';
import { DepartmentUpdateSchema } from './department.update.dto';

describe('Gateway Department DTO schemas — account_code', () => {
  it('create schema preserves account_code', () => {
    const parsed = DepartmentCreateSchema.parse({
      code: 'D01',
      name: 'Kitchen',
      account_code: 'ACC-100',
    });
    expect(parsed.account_code).toBe('ACC-100');
  });

  it('update schema preserves account_code', () => {
    const parsed = DepartmentUpdateSchema.parse({
      doc_version: 1,
      account_code: 'ACC-200',
    });
    expect(parsed.account_code).toBe('ACC-200');
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2/apps/backend-gateway && bunx jest src/common/dto/department/department.dto.spec.ts`
Expected: FAIL — `account_code` is `undefined` (stripped by the current schema).

- [ ] **Step 3: Add account_code to the gateway DTO schemas**

In `apps/backend-gateway/src/common/dto/department/department.create.dto.ts`, in `DepartmentCreateSchema` after `is_active`:

```typescript
  is_active: z.boolean().default(true).nullable().optional(),
  account_code: z.string().optional(),
```

In `apps/backend-gateway/src/common/dto/department/department.update.dto.ts`, in `DepartmentUpdateSchema` after `is_active`:

```typescript
  is_active: z.boolean().optional(),
  account_code: z.string().optional(),
```

- [ ] **Step 4: Run the gateway DTO test — now passing**

Run: `cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2/apps/backend-gateway && bunx jest src/common/dto/department/department.dto.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Add account_code to the swagger request DTOs**

In `apps/backend-gateway/src/config/config_departments/swagger/request.ts`, add to `DepartmentCreateRequestDto` (after the `note` property) and to `DepartmentUpdateRequestDto` (after its `note` property):

```typescript
  @ApiPropertyOptional({ description: 'External accounting / GL code', example: 'ACC-100' })
  account_code?: string;
```

- [ ] **Step 6: Add account_code to the swagger response DTO**

In `apps/backend-gateway/src/config/config_departments/swagger/response.ts`, add to `DepartmentResponseDto` (after the `note` property):

```typescript
  @ApiPropertyOptional({ description: 'External accounting / GL code', example: 'ACC-100' })
  account_code?: string;
```

- [ ] **Step 7: Verify the gateway compiles**

Run: `cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2/apps/backend-gateway && bunx tsc --noEmit -p tsconfig.json`
Expected: no errors. (If the app has no root `tsconfig.json` for `--noEmit`, skip this and rely on `bunx jest` from Step 4 plus the app's build in CI.)

- [ ] **Step 8: Commit**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2
git add apps/backend-gateway/src/common/dto/department/department.create.dto.ts \
        apps/backend-gateway/src/common/dto/department/department.update.dto.ts \
        apps/backend-gateway/src/config/config_departments/swagger/request.ts \
        apps/backend-gateway/src/config/config_departments/swagger/response.ts \
        apps/backend-gateway/src/common/dto/department/department.dto.spec.ts
git commit -m "feat(department): expose account_code in gateway DTO and swagger"
```

---

## Frontend — carmen-inventory-frontend-react

All frontend work is on branch `feat/department-account-code` (already checked out).

### Task 4: i18n + type + form schema (+ schema test)

**Files:**
- Modify: `messages/en.json` (singular `field` namespace, ~line 480)
- Modify: `messages/th.json` (singular `field` namespace, ~line 480)
- Modify: `types/department.ts` (`Department`, `CreateDepartmentDto`)
- Modify: `routes/config/department/department-form-schema.ts`
- Test: `routes/config/department/department-form-schema.test.ts`

**Interfaces:**
- Produces: `field.accountCode` i18n label; `Department.account_code?: string`; `CreateDepartmentDto.account_code?: string`; `DepartmentFormValues.account_code: string`; `EMPTY_FORM.account_code = ""`; `getDefaultValues(dept).account_code`. Tasks 5 and 6 consume all of these.

- [ ] **Step 1: Add the i18n label (en + th)**

In `messages/en.json`, inside the `"field": {` block, add after `"code": "Code",`:

```json
    "code": "Code",
    "accountCode": "Account Code",
```

In `messages/th.json`, inside the `"field": {` block, add after `"code": "รหัส",`:

```json
    "code": "รหัส",
    "accountCode": "รหัสบัญชี",
```

- [ ] **Step 2: Add account_code to the Department types**

In `types/department.ts`, add to the `Department` interface (after `is_active`):

```typescript
  is_active: boolean;
  account_code?: string;
```

And to `CreateDepartmentDto` (after `is_active`):

```typescript
  is_active: boolean;
  account_code?: string;
```

- [ ] **Step 3: Write the failing schema test**

Create `routes/config/department/department-form-schema.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  createDepartmentSchema,
  EMPTY_FORM,
  getDefaultValues,
} from "./department-form-schema";
import type { Department } from "@/types/department";

const tv = ((k: string) => k) as never;
const tf = ((k: string) => k) as never;

describe("department-form-schema — account_code", () => {
  it("EMPTY_FORM has an empty account_code", () => {
    expect(EMPTY_FORM.account_code).toBe("");
  });

  it("accepts an empty account_code (optional)", () => {
    const schema = createDepartmentSchema(tv, tf);
    const result = schema.safeParse({
      code: "D01",
      name: "Kitchen",
      description: "",
      is_active: true,
      account_code: "",
      department_users: { add: [], remove: [] },
      hod_users: { add: [], remove: [] },
    });
    expect(result.success).toBe(true);
  });

  it("getDefaultValues carries account_code from the entity", () => {
    const dept = {
      code: "D01",
      name: "Kitchen",
      description: "",
      is_active: true,
      account_code: "ACC-100",
      department_users: [],
      hod_users: [],
    } as unknown as Department;
    expect(getDefaultValues(dept).account_code).toBe("ACC-100");
  });
});
```

- [ ] **Step 4: Run it and watch it fail**

Run: `bun test:run routes/config/department/department-form-schema.test.ts`
Expected: FAIL — `EMPTY_FORM.account_code` is `undefined` and `getDefaultValues(...).account_code` is `undefined`.

- [ ] **Step 5: Add account_code to the form schema**

In `routes/config/department/department-form-schema.ts`:

In `createDepartmentSchema`, add after the `description` line:

```typescript
    description: z.string(),
    account_code: z.string(),
```

In `EMPTY_FORM`, add after `description`:

```typescript
    description: "",
    account_code: "",
```

In `getDefaultValues`, in the returned object add after `description`:

```typescript
    description: department.description,
    account_code: department.account_code ?? "",
```

- [ ] **Step 6: Run the schema test — now passing**

Run: `bun test:run routes/config/department/department-form-schema.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add messages/en.json messages/th.json types/department.ts \
        routes/config/department/department-form-schema.ts \
        routes/config/department/department-form-schema.test.ts
git commit -m "feat(department): add account_code to type, schema, and i18n"
```

---

### Task 5: Form input (+ form test)

**Files:**
- Modify: `routes/config/department/department-form.tsx`
- Test: `routes/config/department/department-form.test.tsx`

**Interfaces:**
- Consumes: `DepartmentFormValues.account_code`, `field.accountCode` from Task 4.
- Produces: the account_code `<input id="department-account-code">` rendered in the form; its value included in the create/update mutation payload.

- [ ] **Step 1: Write the failing form test**

Create `routes/config/department/department-form.test.tsx` (model the provider/render setup on `routes/product-management/category/category-form.test.tsx` — a Router + IntlProvider wrapper; adapt if that reference uses a different helper):

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IntlProvider } from "use-intl";
import en from "@/messages/en.json";
import { DepartmentForm } from "./department-form";

function renderForm() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <IntlProvider locale="en" messages={en}>
        <MemoryRouter>
          <DepartmentForm />
        </MemoryRouter>
      </IntlProvider>
    </QueryClientProvider>,
  );
}

describe("DepartmentForm — account_code", () => {
  it("renders the account_code input in add mode", () => {
    renderForm();
    expect(document.getElementById("department-account-code")).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test:run routes/config/department/department-form.test.tsx`
Expected: FAIL — `getElementById("department-account-code")` returns `null`.

- [ ] **Step 3: Add account_code to both defaultValues branches**

In `routes/config/department/department-form.tsx`, in the `useForm({... defaultValues: ...})` call, add `account_code` to each branch. The `department` branch:

```typescript
      ? {
          code: department.code,
          name: department.name,
          description: department.description,
          account_code: department.account_code ?? "",
          is_active: department.is_active,
          department_users: { ...emptyTransfer },
          hod_users: { ...emptyTransfer },
        }
```

The empty branch:

```typescript
      : {
          code: "",
          name: "",
          description: "",
          account_code: "",
          is_active: true,
          department_users: { ...emptyTransfer },
          hod_users: { ...emptyTransfer },
        },
```

- [ ] **Step 4: Add the account_code input to the form JSX**

In the same file, insert a new row after the closing `</div>` of the `grid grid-cols-2 gap-2` block that holds the code + name Fields, and before the `description` Field:

```tsx
                <div className="grid grid-cols-2 gap-2">
                  <Field>
                    <FieldLabel htmlFor="department-account-code">
                      {tfl("accountCode")}
                    </FieldLabel>
                    <FieldInput
                      id="department-account-code"
                      placeholder={tfl("optional")}
                      className="h-8"
                      disabled={isDisabled}
                      maxLength={30}
                      {...form.register("account_code")}
                    />
                  </Field>
                </div>
```

- [ ] **Step 5: Add account_code to the onSubmit payload**

In `onSubmit`, add `account_code` to the `payload` object (after `description`):

```typescript
    const payload = {
      code: values.code,
      name: values.name,
      description: values.description ?? "",
      account_code: values.account_code,
      is_active: values.is_active,
      department_users: values.department_users,
      hod_users: values.hod_users,
    };
```

- [ ] **Step 6: Add account_code to the handleCancel reset**

In `handleCancel`, in the `form.reset({...})` call (the `isEdit && department` branch), add after `description`:

```typescript
        form.reset({
          code: department.code,
          name: department.name,
          description: department.description,
          account_code: department.account_code ?? "",
          is_active: department.is_active,
          department_users: { ...emptyTransfer },
          hod_users: { ...emptyTransfer },
        });
```

- [ ] **Step 7: Run the form test — now passing**

Run: `bun test:run routes/config/department/department-form.test.tsx`
Expected: PASS. (If the render throws on a missing provider — e.g. it also needs a specific hook mock — mirror exactly what `category-form.test.tsx` wraps with; do not add providers the reference test does not use.)

- [ ] **Step 8: Commit**

```bash
git add routes/config/department/department-form.tsx \
        routes/config/department/department-form.test.tsx
git commit -m "feat(department): add account_code input to department form"
```

---

### Task 6: List table column + mobile card

**Files:**
- Modify: `routes/config/department/use-department-table.tsx`
- Modify: `routes/config/department/department-card.tsx`
- Test: `routes/config/department/use-department-table.test.tsx`

**Interfaces:**
- Consumes: `Department.account_code`, `field.accountCode` from Task 4.
- Produces: a non-sortable table column with id `account_code`; a card line showing the code when present.

- [ ] **Step 1: Write the failing table contract test**

Create `routes/config/department/use-department-table.test.tsx` (modeled on `routes/product-management/product/use-product-table.test.tsx`; note the department hook's data prop is named `data`, not `products`):

```typescript
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { IntlProvider } from "use-intl";
import en from "@/messages/en.json";
import type { ParamsDto } from "@/types/params";
import { useDepartmentTable } from "./use-department-table";

const params: ParamsDto = { page: 1, perpage: 10 };

const tableConfig = {
  manualPagination: true as const,
  manualSorting: true as const,
  pageCount: 0,
  state: {
    pagination: { pageIndex: 0, pageSize: 10 },
    sorting: [],
  },
  onPaginationChange: () => {},
  onSortingChange: () => {},
};

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <IntlProvider locale="en" messages={en}>
      {children}
    </IntlProvider>
  );
}

function renderDepartmentTable() {
  return renderHook(
    () =>
      useDepartmentTable({
        data: [],
        totalRecords: 0,
        params,
        tableConfig,
        onEdit: () => {},
        onDelete: () => {},
      }),
    { wrapper },
  );
}

describe("useDepartmentTable — account_code column", () => {
  it("exposes a non-sortable account_code column", () => {
    const { result } = renderDepartmentTable();
    const column = result.current.getColumn("account_code");
    expect(column, "account_code column must exist").not.toBeUndefined();
    expect(column?.getCanSort(), "account_code should not be sortable").toBe(false);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test:run routes/config/department/use-department-table.test.tsx`
Expected: FAIL — `getColumn("account_code")` returns `undefined`.

- [ ] **Step 3: Add the account_code column**

In `routes/config/department/use-department-table.tsx`, add a column to the `columns` array, after the `code` column and before `name`:

```typescript
    {
      accessorKey: "account_code",
      enableSorting: false,
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("accountCode")} />
      ),
      cell: ({ row }) => row.original.account_code || "-",
      size: 40,
      meta: {
        headerTitle: tfl("accountCode"),
        skeleton: columnSkeletons.textShort,
      },
    },
```

- [ ] **Step 4: Run the table test — now passing**

Run: `bun test:run routes/config/department/use-department-table.test.tsx`
Expected: PASS.

- [ ] **Step 5: Show account_code on the mobile card**

In `routes/config/department/department-card.tsx`, widen the `CardContent` render condition to also trigger on `account_code`, and add a line for it. Change the guard from:

```tsx
      {((item.department_users?.length ?? 0) > 0 || item.description) && (
```

to:

```tsx
      {((item.department_users?.length ?? 0) > 0 ||
        item.description ||
        item.account_code) && (
```

Then, inside `CardContent`, add before the `description` block:

```tsx
            {item.account_code && (
              <p className="text-muted-foreground text-xs">
                {t("accountCode", { defaultMessage: "Account Code" })}: {item.account_code}
              </p>
            )}
```

Note: `DepartmentCard` uses `t = useTranslations("config.department")`. If `config.department.accountCode` is not defined, replace `{t("accountCode", ...)}` with the shared field label — add `const tfl = useTranslations("field");` at the top of the component and use `{tfl("accountCode")}` for consistency with the form and table. Prefer the `tfl("accountCode")` approach.

- [ ] **Step 6: Run the full frontend test + typecheck gate**

Run: `bunx tsc --noEmit && bun test:run`
Expected: typecheck clean; all tests pass (including the three new department test files).

- [ ] **Step 7: Commit**

```bash
git add routes/config/department/use-department-table.tsx \
        routes/config/department/department-card.tsx \
        routes/config/department/use-department-table.test.tsx
git commit -m "feat(department): show account_code in list column and card"
```

---

## Self-Review Notes

- **Spec coverage:** Backend §1–7 → Tasks 1–3. Frontend §1–6 → Tasks 4–6. Tests §  → per-task TDD steps + final gate in Task 6 Step 6. Out-of-scope items (no format/uniqueness/trim, no location/mapping changes, no search/filter) are respected: the table column sets `enableSorting: false` and adds no filter.
- **Type consistency:** `account_code` is `String? @db.VarChar` (Prisma) → `z.string().optional()` (create/update DTO, both repos) → `z.string().nullable().optional()` (serializer read) → `account_code?: string` (FE `Department`/`CreateDepartmentDto`) → `z.string()` non-optional in the FE form schema with `""` default (mirrors the existing `description` field pattern). Column/accessor id is `account_code` verbatim everywhere. i18n key is `field.accountCode` in every consumer (`tfl`).
- **Placeholder scan:** none — every code step shows complete code.
- **Verification caveat:** applying the migration against a live DB (`db:migrate` / `db:deploy`) happens in the backend deploy pipeline, outside this plan; Task 1 verifies the schema + generated client statically. If a local DB is available, run `bunx prisma migrate deploy` from `packages/prisma-shared-schema-tenant` to apply, but that is not required for the tasks to pass.
