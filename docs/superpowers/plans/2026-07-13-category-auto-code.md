# Category Auto-Generated Code Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the category `code` field server-assigned (running number) — locked in the UI and omitted from the create payload — on the `/product-management/category` dialog.

**Architecture:** The shared `CategoryForm` (covers category / subcategory / item group) keeps the code field always disabled: in add mode it shows an "Auto-generated" placeholder and its value is stripped from the submit payload so the backend assigns a running number; in edit mode it displays the existing server code read-only. The Zod schema and `CreateCategoryDto` relax `code` from required to optional. A tiny pure helper `stripAutoCode` does the payload omission so it is unit-testable without rendering.

**Tech Stack:** React 19, react-hook-form, Zod, use-intl, Vitest + @testing-library/react + user-event, TanStack Query.

## Global Constraints

- Communicate with the user in **Thai**; code, comments, commit messages in English.
- `bunx tsc --noEmit && bun test:run` must be clean before any commit is considered done.
- i18n keys must be added to **both** `messages/en.json` and `messages/th.json`.
- Do not hardcode strings that belong in i18n; use the existing `field` namespace.
- Follow the colocated route convention — all category files live in `routes/product-management/category/`.

---

### Task 1: Relax schema + DTO, add `stripAutoCode` helper (pure, unit-tested)

**Files:**
- Modify: `routes/product-management/category/category-form-schema.ts`
- Modify: `types/category.ts:92` (`CreateCategoryDto.code`)
- Test: `routes/product-management/category/category-form-schema.test.ts` (create)

**Interfaces:**
- Consumes: `CategoryFormValues` (existing, from `category-form-schema.ts`), `FormMode` (from `@/types/form`).
- Produces:
  - `categorySchema` with `code: z.string().optional()`.
  - `stripAutoCode(mode: FormMode, data: CategoryFormValues): CategoryFormValues` — returns `{ ...data, code: undefined }` when `mode === "add"`, otherwise returns `data` unchanged. Consumed by `CategoryForm` in Task 2.

- [ ] **Step 1: Write the failing test**

Create `routes/product-management/category/category-form-schema.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  categorySchema,
  stripAutoCode,
  type CategoryFormValues,
} from "./category-form-schema";

const baseValues: CategoryFormValues = {
  code: "",
  name: "Beverage",
  description: "",
  is_active: true,
  cascade_deviation: true,
  price_deviation_limit: 0,
  qty_deviation_limit: 0,
  is_used_in_recipe: false,
  is_sold_directly: false,
  tax_profile_id: "tax-1",
  tax_rate: 0,
};

describe("categorySchema — code is optional (server-assigned)", () => {
  it("parses successfully with an empty code (add mode)", () => {
    const result = categorySchema.safeParse(baseValues);
    expect(result.success).toBe(true);
  });

  it("parses successfully with no code key at all", () => {
    const { code, ...withoutCode } = baseValues;
    const result = categorySchema.safeParse(withoutCode);
    expect(result.success).toBe(true);
  });
});

describe("stripAutoCode", () => {
  it("removes code in add mode so the server assigns it", () => {
    const payload = stripAutoCode("add", { ...baseValues, code: "typed" });
    expect(payload.code).toBeUndefined();
    expect(payload.name).toBe("Beverage");
  });

  it("keeps code unchanged in edit mode", () => {
    const payload = stripAutoCode("edit", { ...baseValues, code: "C01" });
    expect(payload.code).toBe("C01");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test:run routes/product-management/category/category-form-schema.test.ts`
Expected: FAIL — `stripAutoCode` is not exported (import error), and the empty-code parse currently fails on `min(1)`.

- [ ] **Step 3: Implement the schema + helper change**

In `routes/product-management/category/category-form-schema.ts`:

Change the `code` line inside `categorySchema` from:

```ts
  code: z.string().min(1, "Code is required"),
```

to:

```ts
  code: z.string().optional(),
```

Add the `FormMode` import at the top (next to the existing imports):

```ts
import type { FormMode } from "@/types/form";
```

Append the helper at the end of the file:

```ts
/**
 * ตัด field `code` ออกจาก payload เมื่ออยู่ในโหมด add เพื่อให้ backend สร้าง
 * running-number code ให้อัตโนมัติ ส่วนโหมด edit จะคง code เดิม (server-assigned)
 * ไว้ไม่เปลี่ยนแปลง
 * @param mode - โหมดของฟอร์ม (add / edit)
 * @param data - ค่าจากฟอร์มที่ผ่าน validation แล้ว
 * @returns payload ที่พร้อมส่ง — ไม่มี code ในโหมด add, คงเดิมในโหมด edit
 */
export function stripAutoCode(
  mode: FormMode,
  data: CategoryFormValues,
): CategoryFormValues {
  return mode === "add" ? { ...data, code: undefined } : data;
}
```

- [ ] **Step 4: Relax the create DTO**

In `types/category.ts`, change line 92 from:

```ts
  code: string;
```

to:

```ts
  code?: string;
```

(This is the `code` field inside `interface CreateCategoryDto` — verify by the surrounding `interface CreateCategoryDto {` on the line above the block.)

- [ ] **Step 5: Run test to verify it passes**

Run: `bun test:run routes/product-management/category/category-form-schema.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Typecheck**

Run: `bunx tsc --noEmit`
Expected: clean (no errors). This confirms the `CreateCategoryDto.code?` change and the new helper are type-consistent with existing callers.

- [ ] **Step 7: Commit**

```bash
git add routes/product-management/category/category-form-schema.ts routes/product-management/category/category-form-schema.test.ts types/category.ts
git commit -m "feat: make category code optional + add stripAutoCode helper"
```

---

### Task 2: Lock the code field in the form + i18n + render test

**Files:**
- Modify: `messages/en.json` (under `field`)
- Modify: `messages/th.json` (under `field`)
- Modify: `routes/product-management/category/category-form.tsx`
- Test: `routes/product-management/category/category-form.test.tsx` (create)

**Interfaces:**
- Consumes: `stripAutoCode(mode, data)` from Task 1; `field.autoGenerated` i18n key added in this task; existing `CategoryForm` props (`type`, `mode`, `selectedNode`, `parentNode`, `onSubmit`, `onCancel`, `isPending`).
- Produces: none (leaf UI).

- [ ] **Step 1: Add the i18n key (both locales)**

In `messages/en.json`, inside the `"field"` object (right after `"code": "Code",` near line 480), add:

```json
    "autoGenerated": "Auto-generated",
```

In `messages/th.json`, inside the same `"field"` object next to its `"code"` entry, add:

```json
    "autoGenerated": "สร้างอัตโนมัติ",
```

(Match the existing indentation and keep valid JSON — the preceding line needs a trailing comma.)

- [ ] **Step 2: Write the failing render test**

Create `routes/product-management/category/category-form.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { IntlProvider } from "use-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import en from "@/messages/en.json";
import type { CategoryNode } from "@/types/category";
import { NODE_TYPE } from "@/types/category";
import { CategoryForm } from "./category-form";

function renderForm(
  props: Partial<React.ComponentProps<typeof CategoryForm>>,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <IntlProvider locale="en" messages={en}>
        <CategoryForm
          type="category"
          mode="add"
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
          {...props}
        />
      </IntlProvider>
    </QueryClientProvider>,
  );
}

describe("CategoryForm — auto-generated code field", () => {
  it("add mode: code input is disabled with the auto-generated placeholder", () => {
    renderForm({ mode: "add" });
    const codeInput = screen.getByLabelText(en.field.code);
    expect(codeInput).toBeDisabled();
    expect(codeInput).toHaveAttribute("placeholder", en.field.autoGenerated);
  });

  it("add mode: the code label shows no required asterisk", () => {
    renderForm({ mode: "add" });
    const codeLabel = screen.getByText(en.field.code);
    expect(codeLabel.textContent).not.toContain("*");
  });

  it("edit mode: code input is disabled and shows the existing code", () => {
    const selectedNode: CategoryNode = {
      id: "cat-1",
      code: "C01",
      name: "Beverage",
      type: NODE_TYPE.CATEGORY,
      is_active: true,
      cascade_deviation: true,
    };
    renderForm({ mode: "edit", selectedNode });
    const codeInput = screen.getByLabelText(en.field.code) as HTMLInputElement;
    expect(codeInput).toBeDisabled();
    expect(codeInput.value).toBe("C01");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `bun test:run routes/product-management/category/category-form.test.tsx`
Expected: FAIL — the code input is not disabled in add mode / has no `autoGenerated` placeholder, and the label still contains `*`.

- [ ] **Step 4: Implement the form changes**

In `routes/product-management/category/category-form.tsx`:

**(a)** Import the helper. Change the schema import block from:

```tsx
import {
  categorySchema,
  type CategoryFormValues,
} from "./category-form-schema";
```

to:

```tsx
import {
  categorySchema,
  stripAutoCode,
  type CategoryFormValues,
} from "./category-form-schema";
```

**(b)** Replace the `handleFormSubmit` function (currently ~lines 100-112) with:

```tsx
  const handleFormSubmit = (data: CategoryFormValues) => {
    const payload = stripAutoCode(mode, data);
    if (
      mode === "edit" &&
      selectedNode &&
      (selectedNode.is_used_in_recipe !== data.is_used_in_recipe ||
        selectedNode.is_sold_directly !== data.is_sold_directly)
    ) {
      setPendingData(payload);
      setShowConfirm(true);
      return;
    }
    onSubmit(payload);
  };
```

**(c)** Replace the code `Field` block (currently ~lines 143-155) with:

```tsx
          <Field>
            <FieldLabel htmlFor="code">{tfl("code")}</FieldLabel>
            <FieldInput
              id="code"
              className="text-xs"
              maxLength={10}
              disabled
              placeholder={mode === "add" ? tfl("autoGenerated") : undefined}
              error={form.formState.errors.code?.message}
              {...form.register("code")}
            />
          </Field>
```

(Changes: removed `required` from `FieldLabel`; `disabled` is now unconditional; added the add-mode `placeholder`.)

- [ ] **Step 5: Run test to verify it passes**

Run: `bun test:run routes/product-management/category/category-form.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Full verification**

Run: `bunx tsc --noEmit && bun test:run`
Expected: typecheck clean; full suite green (no regressions in the category dialog/tree tests).

- [ ] **Step 7: Commit**

```bash
git add messages/en.json messages/th.json routes/product-management/category/category-form.tsx routes/product-management/category/category-form.test.tsx
git commit -m "feat: lock category code field as server-assigned (auto-generated)"
```

---

## Manual verification (after both tasks)

Run the dev server against the local backend and exercise the real flow:

```bash
VITE_DEV_PROXY_TARGET=http://localhost:4000 bun dev
```

- Open `/product-management/category` → **Add** (category / subcategory / item group):
  the code field is locked and shows the "Auto-generated" placeholder, no red `*` on its
  label. Fill name + tax profile, create → the new node appears with a server-assigned code.
- Open **Edit** on an existing node: the code is shown, locked (read-only); saving keeps it.
- Confirm no console errors.
