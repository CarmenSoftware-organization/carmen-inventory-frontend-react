# Carmen GL Interface Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `carmen_gl` accounting brand's generic interface form with the Carmen 4 legacy field set (API server, encrypted authorize token, three endpoint paths, two posting options) across frontend and backend.

**Architecture:** The frontend registry gains a per-brand form override (`BrandDef.form?`), so `carmen_gl` renders a new dedicated form while `blueledgers`/`external` keep the existing generic accounting form. The backend adds a carmen_gl-specific Zod schema (matched by exact key, before the generic accounting pattern) and registers `authorize_token` as a secret path so the existing encrypt/mask/retain machinery applies unchanged.

**Tech Stack:** Frontend: Vite + React Router 7, react-hook-form + zod, use-intl, vitest (bun). Backend: NestJS (micro-business), zod, jest (bun).

**Spec:** `docs/superpowers/specs/2026-07-22-carmen-gl-interface-config-design.md`

## Global Constraints

- Two repos. Frontend: `/Users/samutpra/GitHub/carmensoftware-organize/carmen-inventory-frontend-react` — branch `feature/carmen-gl-interface-config` **already exists** (spec committed on it). Backend: `/Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2` — create branch `feature/carmen-gl-interface-config` in Task 1.
- **Backend tasks (1–2) come before frontend tasks (3–4).** The current backend validates `interface_accounting_carmen_gl` against the generic accounting schema and would reject the new payload with a 400 on save.
- Config key unchanged: `interface_accounting_carmen_gl` (one `tb_application_config` row per business unit).
- Secret mask literal is exactly `***ENCRYPTED***` (backend constant `MASK`).
- Form field names in react-hook-form are `snake_case`, matching the stored JSON — this is the deliberate existing convention in the interface forms (see `pms-interface-form.tsx`); do not camelCase them.
- **No gateway change.** Verified: `apps/backend-gateway/src/config/config_app-config/config_app-config.controller.ts` types the row's `value` as `unknown` and passes the JSON through whole — the add-field serializer gotcha does not apply here.
- i18n: every new UI string gets both `messages/en.json` and `messages/th.json` entries.
- Frontend gate before each commit: `bunx tsc --noEmit && bun test:run` clean. Backend gate: `bun run test src/app-config/app-config.service.spec.ts` green (full `bun run test` + `bun run check-types` in the final task).
- Commit messages end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Deploy note (carry into PR description): saving a secret-bearing config requires `SECRET_ENCRYPTION_KEY` set on the backend (existing constraint, unchanged).

---

### Task 1: Backend — carmen_gl Zod schema + validateValue branch

**Files:**
- Modify: `apps/micro-business/src/app-config/app-config.service.ts` (schema block near line 24; `validateValue()` near line 289)
- Test: `apps/micro-business/src/app-config/app-config.service.spec.ts` (inside `describe('interface config keys')`, near line 432)

**Interfaces:**
- Consumes: existing `InterfaceAccountingSchema`, `validateValue(key, value)` dispatch in `app-config.service.ts`.
- Produces: `InterfaceAccountingCarmenGlSchema` (module-private zod object) with fields `enabled: boolean`, `api_server: string`, `authorize_token: string`, `account_code_path: string`, `department_path: string`, `vendor_path: string`, `set_account_mapping_all_items: boolean`, `allow_posting_transfer_to_gl: boolean` — all required. `validateValue` matches key `interface_accounting_carmen_gl` exactly before the `^interface_accounting(_.+)?$` pattern. Task 2 and the frontend (Tasks 3–4) rely on these exact field names.

- [ ] **Step 1: Create the backend branch**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2
git checkout main && git pull && git checkout -b feature/carmen-gl-interface-config
```

- [ ] **Step 2: Write the failing tests**

In `apps/micro-business/src/app-config/app-config.service.spec.ts`, inside `describe('interface config keys')` (after the test `'accepts a valid per-brand interface_accounting value (no system field)'`), add:

```ts
    it('accepts a valid carmen_gl legacy value', async () => {
      mockPrisma.tb_application_config.findFirst.mockResolvedValue(null);
      mockPrisma.tb_application_config.create.mockResolvedValue({ id: 'a2', key: 'interface_accounting_carmen_gl', value: {}, created_at: null, created_by_id: 'u1', updated_at: null, updated_by_id: null });

      await expect(
        service.upsert('BU01', 'user-1', 'interface_accounting_carmen_gl', {
          enabled: true, api_server: 'https://dev.carmen4.com/carmen.api/',
          authorize_token: 'tok', account_code_path: 'api/interface/accountCode',
          department_path: 'api/interface/department', vendor_path: 'api/interface/vendor',
          set_account_mapping_all_items: true, allow_posting_transfer_to_gl: false,
        }),
      ).resolves.toBeDefined();
    });

    it('rejects the old generic accounting shape for carmen_gl', async () => {
      mockPrisma.tb_application_config.findFirst.mockResolvedValue(null);

      await expect(
        service.upsert('BU01', 'user-1', 'interface_accounting_carmen_gl', {
          enabled: true, default_account_code: '1000',
          default_department_code: 'D1', default_invoice_value: '0',
          export_format: 'csv', endpoint: '', posting_frequency: 'daily',
        }),
      ).rejects.toThrow(/Invalid interface_accounting_carmen_gl value/);
    });
```

In the same describe block, the existing test `'accepts a valid per-brand interface_accounting value (no system field)'` uses `interface_accounting_carmen_gl` with the generic shape — that key now has its own schema. Retarget it to a generic brand: replace both occurrences of `interface_accounting_carmen_gl` inside that one test with `interface_accounting_blueledgers` and rename the test to `'accepts a valid generic value on a non-carmen_gl accounting brand'`. The test body's payload stays the generic shape:

```ts
    it('accepts a valid generic value on a non-carmen_gl accounting brand', async () => {
      mockPrisma.tb_application_config.findFirst.mockResolvedValue(null);
      mockPrisma.tb_application_config.create.mockResolvedValue({ id: 'a1', key: 'interface_accounting_blueledgers', value: {}, created_at: null, created_by_id: 'u1', updated_at: null, updated_by_id: null });

      await expect(
        service.upsert('BU01', 'user-1', 'interface_accounting_blueledgers', {
          enabled: true, default_account_code: '1000',
          default_department_code: 'D1', default_invoice_value: '0',
          export_format: 'csv', endpoint: '', posting_frequency: 'daily',
        }),
      ).resolves.toBeDefined();
    });
```

- [ ] **Step 3: Run tests to verify the two new ones fail**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2/apps/micro-business
bun run test src/app-config/app-config.service.spec.ts
```

Expected: `'accepts a valid carmen_gl legacy value'` FAILS (generic schema rejects the new field names → upsert throws `Invalid interface_accounting_carmen_gl value`), and `'rejects the old generic accounting shape for carmen_gl'` FAILS (old shape currently *passes* the generic schema, so nothing throws). The retargeted blueledgers test passes.

- [ ] **Step 4: Implement the schema and validateValue branch**

In `apps/micro-business/src/app-config/app-config.service.ts`, directly after the `InterfaceAccountingSchema` definition (after line 24), add:

```ts
// Carmen 4 legacy integration — a different shape from the generic accounting brands
// (matched by exact key in validateValue/secretPathsFor). `authorize_token` is a secret.
const InterfaceAccountingCarmenGlSchema = z.object({
  enabled: z.boolean(),
  api_server: z.string(),
  authorize_token: z.string(),
  account_code_path: z.string(),
  department_path: z.string(),
  vendor_path: z.string(),
  set_account_mapping_all_items: z.boolean(),
  allow_posting_transfer_to_gl: z.boolean(),
});
```

In `validateValue()`, replace the schema-resolution ternary:

```ts
    const schema = /^interface_accounting(_.+)?$/.test(key)
      ? InterfaceAccountingSchema
      : /^interface_pos(_.+)?$/.test(key)
        ? InterfacePosSchema
        : /^interface_pms(_.+)?$/.test(key)
          ? InterfacePmsSchema
          : schemaByKey[key];
```

with (exact-key match first, so carmen_gl never falls through to the generic pattern):

```ts
    const schema =
      key === 'interface_accounting_carmen_gl'
        ? InterfaceAccountingCarmenGlSchema
        : /^interface_accounting(_.+)?$/.test(key)
          ? InterfaceAccountingSchema
          : /^interface_pos(_.+)?$/.test(key)
            ? InterfacePosSchema
            : /^interface_pms(_.+)?$/.test(key)
              ? InterfacePmsSchema
              : schemaByKey[key];
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
bun run test src/app-config/app-config.service.spec.ts
```

Expected: PASS (all tests in the file).

- [ ] **Step 6: Commit**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2
git add apps/micro-business/src/app-config/app-config.service.ts apps/micro-business/src/app-config/app-config.service.spec.ts
git commit -m "feat(app-config): carmen_gl accounting schema for Carmen 4 legacy fields

interface_accounting_carmen_gl now validates against its own schema
(api_server, authorize_token, three endpoint paths, two posting
options) matched by exact key before the generic accounting pattern.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Backend — register `authorize_token` as a secret path

**Files:**
- Modify: `apps/micro-business/src/app-config/app-config.service.ts` (`secretPathsFor()` near line 144)
- Test: `apps/micro-business/src/app-config/app-config.service.spec.ts` (`describe('masking interface secrets')` near line 113 and `describe('upsert')` near line 139)

**Interfaces:**
- Consumes: `InterfaceAccountingCarmenGlSchema` from Task 1 (upsert tests must pass validation); existing `secretPathsFor`, `maskSensitiveFields`, `encryptSensitiveFields`, `retainMaskedSecrets` generic machinery.
- Produces: `secretPathsFor('interface_accounting_carmen_gl')` → `[['authorize_token']]`. GET masks the token, upsert encrypts it, a posted-back mask retains the stored token. Frontend Task 3 relies on this mask/retain behavior (password field posts the mask untouched).

- [ ] **Step 1: Write the failing tests**

In `describe('masking interface secrets')` (after `'leaves unknown keys untouched'`), add:

```ts
    it('masks authorize_token on get for interface_accounting_carmen_gl', async () => {
      mockPrisma.tb_application_config.findFirst.mockResolvedValue({
        id: 'c11', key: 'interface_accounting_carmen_gl',
        value: {
          enabled: true, api_server: 'https://dev.carmen4.com/carmen.api/',
          authorize_token: 'ENC:tok', account_code_path: 'api/interface/accountCode',
          department_path: 'api/interface/department', vendor_path: 'api/interface/vendor',
          set_account_mapping_all_items: true, allow_posting_transfer_to_gl: false,
        },
        created_at: null, created_by_id: 'u1', updated_at: null, updated_by_id: null,
      });

      const result = await service.get('BU01', 'user-1', 'interface_accounting_carmen_gl');

      expect((result.value as { authorize_token: string }).authorize_token).toBe('***ENCRYPTED***');
      expect((result.value as { api_server: string }).api_server).toBe('https://dev.carmen4.com/carmen.api/');
    });

    it('leaves authorize_token untouched on other accounting brands', async () => {
      mockPrisma.tb_application_config.findFirst.mockResolvedValue({
        id: 'c12', key: 'interface_accounting_blueledgers', value: { authorize_token: 'plain' },
        created_at: null, created_by_id: 'u1', updated_at: null, updated_by_id: null,
      });

      const result = await service.get('BU01', 'user-1', 'interface_accounting_blueledgers');

      expect((result.value as { authorize_token: string }).authorize_token).toBe('plain');
    });
```

In `describe('upsert')` (after `'refuses to save when the caller posts the mask and nothing is stored'`), add:

```ts
    it('encrypts authorize_token for interface_accounting_carmen_gl before persisting', async () => {
      mockPrisma.tb_application_config.findFirst.mockResolvedValue(null);
      mockPrisma.tb_application_config.create.mockResolvedValue({ id: 'new-cg', key: 'interface_accounting_carmen_gl', value: {}, created_at: null, created_by_id: 'u1', updated_at: null, updated_by_id: null });

      await service.upsert('BU01', 'user-1', 'interface_accounting_carmen_gl', {
        enabled: true, api_server: 'https://dev.carmen4.com/carmen.api/',
        authorize_token: 'plain-token', account_code_path: 'api/interface/accountCode',
        department_path: 'api/interface/department', vendor_path: 'api/interface/vendor',
        set_account_mapping_all_items: true, allow_posting_transfer_to_gl: false,
      });

      const stored = mockPrisma.tb_application_config.create.mock.calls[0][0].data.value;
      expect(stored.authorize_token).toBe('ENC:plain-token');
      expect(stored.api_server).toBe('https://dev.carmen4.com/carmen.api/');
    });

    it('keeps the stored authorize_token when carmen_gl posts the mask back', async () => {
      mockPrisma.tb_application_config.findFirst.mockResolvedValue({
        id: 'ex-3',
        value: {
          enabled: true, api_server: 's', authorize_token: 'ENC:real-token',
          account_code_path: 'a', department_path: 'd', vendor_path: 'v',
          set_account_mapping_all_items: true, allow_posting_transfer_to_gl: false,
        },
      });
      mockPrisma.tb_application_config.update.mockResolvedValue({ id: 'ex-3', key: 'interface_accounting_carmen_gl', value: {}, created_at: null, created_by_id: 'u1', updated_at: null, updated_by_id: 'user-1' });

      await service.upsert('BU01', 'user-1', 'interface_accounting_carmen_gl', {
        enabled: true, api_server: 's2', authorize_token: '***ENCRYPTED***',
        account_code_path: 'a', department_path: 'd', vendor_path: 'v',
        set_account_mapping_all_items: false, allow_posting_transfer_to_gl: true,
      });

      const stored = mockPrisma.tb_application_config.update.mock.calls[0][0].data.value;
      expect(stored.authorize_token).toBe('ENC:real-token');
      expect(stored.api_server).toBe('s2');
    });
```

- [ ] **Step 2: Run tests to verify the four new ones fail**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2/apps/micro-business
bun run test src/app-config/app-config.service.spec.ts
```

Expected: the two mask tests fail on carmen_gl (`authorize_token` comes back unmasked / stays `'ENC:tok'`), `'encrypts authorize_token…'` fails (`stored.authorize_token` is `'plain-token'`), `'keeps the stored authorize_token…'` fails (`stored.authorize_token` is the literal mask). `'leaves authorize_token untouched on other accounting brands'` may already pass — that is fine; it pins the exact-key scope.

- [ ] **Step 3: Implement the secret path**

In `secretPathsFor()` in `app-config.service.ts`, add the carmen_gl line between the existing two:

```ts
  private secretPathsFor(key: string): readonly (readonly string[])[] | undefined {
    if (key === 'report_email') return [['smtp', 'password']];
    // Exact key on purpose: other accounting brands have no secret — a broad
    // category pattern would mask any same-named field on them unintentionally.
    if (key === 'interface_accounting_carmen_gl') return [['authorize_token']];
    if (/^interface_(pos|pms)(_.+)?$/.test(key)) return [['api_key']];
    return undefined;
  }
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun run test src/app-config/app-config.service.spec.ts
```

Expected: PASS (all tests in the file).

- [ ] **Step 5: Type-check and commit**

```bash
bun run check-types
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2
git add apps/micro-business/src/app-config/app-config.service.ts apps/micro-business/src/app-config/app-config.service.spec.ts
git commit -m "feat(app-config): encrypt+mask authorize_token for carmen_gl interface

Registers ['authorize_token'] as the secret path for the exact key
interface_accounting_carmen_gl; encrypt-at-rest, mask-on-get and
mask-echo retention reuse the existing generic machinery.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Frontend — Carmen GL form (schema, conversions, component, i18n)

**Files:**
- Create: `routes/system-admin/interface/carmen-gl-interface-form.tsx`
- Create: `routes/system-admin/interface/carmen-gl-interface-form.test.ts`
- Modify: `messages/en.json` (inside `systemAdmin.interface.accounting`)
- Modify: `messages/th.json` (inside `systemAdmin.interface.accounting`)

**Interfaces:**
- Consumes: `useInterfaceConfig(configKey)` from `./use-interface-config` (returns `{ value, isLoading, isError, refetch, save, isSaving }`), `InterfacePageLayout` from `./interface-page-layout`, `TextField`/`ToggleField` from `./interface-fields`, `SettingSection`, `scrollToFirstInvalidField`.
- Produces: default-exported `CarmenGlInterfaceForm` component (Task 4's registry lazy-imports `./carmen-gl-interface-form`), plus named exports `carmenGlSchema`, `CarmenGlFormValues`, `EMPTY_CARMEN_GL`, `toFormValues(value: Record<string, unknown> | undefined): CarmenGlFormValues`, `toApiValue(values: CarmenGlFormValues): Record<string, unknown>`.

- [ ] **Step 1: Write the failing test file**

Create `routes/system-admin/interface/carmen-gl-interface-form.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  carmenGlSchema,
  toFormValues,
  toApiValue,
  EMPTY_CARMEN_GL,
} from "./carmen-gl-interface-form";

describe("carmenGlSchema", () => {
  it("accepts a fully populated value", () => {
    const parsed = carmenGlSchema.safeParse({
      enabled: true,
      api_server: "https://dev.carmen4.com/carmen.api/",
      authorize_token: "tok",
      account_code_path: "api/interface/accountCode",
      department_path: "api/interface/department",
      vendor_path: "api/interface/vendor",
      set_account_mapping_all_items: true,
      allow_posting_transfer_to_gl: false,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a non-boolean option toggle", () => {
    const parsed = carmenGlSchema.safeParse({
      ...EMPTY_CARMEN_GL,
      allow_posting_transfer_to_gl: "yes",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("toFormValues / toApiValue", () => {
  it("falls back to defaults when the config has never been saved", () => {
    expect(toFormValues(undefined)).toEqual(EMPTY_CARMEN_GL);
  });

  it("prefills the three endpoint paths with the legacy defaults", () => {
    const values = toFormValues({ enabled: true });
    expect(values.account_code_path).toBe("api/interface/accountCode");
    expect(values.department_path).toBe("api/interface/department");
    expect(values.vendor_path).toBe("api/interface/vendor");
  });

  it("parses an old generic-accounting row to defaults (lazy schema evolution)", () => {
    const values = toFormValues({
      enabled: true,
      default_account_code: "1000",
      default_department_code: "D1",
      default_invoice_value: "0",
      export_format: "csv",
      endpoint: "https://gl.example.com",
      posting_frequency: "daily",
    });
    expect(values).toEqual({ ...EMPTY_CARMEN_GL, enabled: true });
  });

  it("round-trips a full value unchanged", () => {
    const values = {
      enabled: true,
      api_server: "https://dev.carmen4.com/carmen.api/",
      authorize_token: "tok",
      account_code_path: "api/x",
      department_path: "api/y",
      vendor_path: "api/z",
      set_account_mapping_all_items: false,
      allow_posting_transfer_to_gl: true,
    };
    expect(toFormValues(toApiValue(values))).toEqual(values);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-inventory-frontend-react
bun test:run routes/system-admin/interface/carmen-gl-interface-form.test.ts
```

Expected: FAIL — cannot resolve `./carmen-gl-interface-form`.

- [ ] **Step 3: Write the form file**

Create `routes/system-admin/interface/carmen-gl-interface-form.tsx`:

```tsx
import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { useParams } from "react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { SettingSection } from "@/components/ui/setting-section";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import { useInterfaceConfig } from "./use-interface-config";
import { InterfacePageLayout } from "./interface-page-layout";
import { TextField, ToggleField } from "./interface-fields";

export const carmenGlSchema = z.object({
  enabled: z.boolean(),
  api_server: z.string(),
  authorize_token: z.string(),
  account_code_path: z.string(),
  department_path: z.string(),
  vendor_path: z.string(),
  set_account_mapping_all_items: z.boolean(),
  allow_posting_transfer_to_gl: z.boolean(),
});

export type CarmenGlFormValues = z.infer<typeof carmenGlSchema>;

export const EMPTY_CARMEN_GL: CarmenGlFormValues = {
  enabled: false,
  api_server: "",
  authorize_token: "",
  account_code_path: "api/interface/accountCode",
  department_path: "api/interface/department",
  vendor_path: "api/interface/vendor",
  set_account_mapping_all_items: true,
  allow_posting_transfer_to_gl: false,
};

/** แปลงค่าจาก app_config เป็นค่า form — row shape เก่า (generic accounting) parse เป็น default */
export function toFormValues(
  value: Record<string, unknown> | undefined,
): CarmenGlFormValues {
  if (!value) return EMPTY_CARMEN_GL;
  const parsed = carmenGlSchema.safeParse({ ...EMPTY_CARMEN_GL, ...value });
  return parsed.success ? parsed.data : EMPTY_CARMEN_GL;
}

/** แปลงค่า form เป็น payload ของ app_config */
export function toApiValue(
  values: CarmenGlFormValues,
): Record<string, unknown> {
  return { ...values };
}

/**
 * หน้า config ของ Carmen GL (Carmen 4 legacy) — API server + authorize token +
 * endpoint path 3 เส้น + option การ post GL
 *
 * brand เดียวที่ใช้ฟอร์มนี้คือ carmen_gl (form override ใน registry) — config key จึง fix ได้
 *
 * `authorize_token` เป็น secret: backend เข้ารหัสตอนเก็บและ mask ตอน GET — ถ้าผู้ใช้ไม่แตะ
 * ช่องนี้ ฟอร์มส่ง mask กลับและ backend คง token เดิม (pattern เดียวกับ api_key ของ POS/PMS)
 *
 * @returns React element ของหน้า Carmen GL interface
 */
export default function CarmenGlInterfaceForm() {
  const t = useTranslations("systemAdmin.interface");
  const ta = useTranslations("systemAdmin.interface.accounting");
  const tc = useTranslations("systemAdmin.interface.accounting.carmenGl");
  const { brand } = useParams<{ brand: string }>();
  const { value, isLoading, isError, refetch, save, isSaving } =
    useInterfaceConfig("interface_accounting_carmen_gl");

  const form = useForm<CarmenGlFormValues>({
    resolver: zodResolver(carmenGlSchema) as Resolver<CarmenGlFormValues>,
    defaultValues: EMPTY_CARMEN_GL,
  });

  useEffect(() => {
    if (value) form.reset(toFormValues(value));
  }, [value, form]);

  const submit = form.handleSubmit(
    (values) =>
      save(toApiValue(values), { onSuccess: () => toast.success(t("saved")) }),
    () => scrollToFirstInvalidField(),
  );

  return (
    <InterfacePageLayout
      title={ta(`brand.${brand}`)}
      description={tc("desc")}
      onSave={submit}
      isSaving={isSaving}
      isLoading={isLoading}
      isError={isError}
      isDirty={form.formState.isDirty}
      onRetry={refetch}
      errorMessage={t("loadError")}
      saveLabel={t("save")}
    >
      <SettingSection first title={tc("connection")} description={tc("connectionDesc")}>
        <ToggleField
          label={t("enabled")}
          checked={form.watch("enabled")}
          onChange={(v) => form.setValue("enabled", v, { shouldDirty: true })}
        />
        <TextField
          label={tc("apiServer")}
          field={form.register("api_server")}
          error={form.formState.errors.api_server?.message}
          placeholder="https://dev.carmen4.com/carmen.api/"
          className="sm:col-span-2"
        />
        <TextField
          label={tc("authorizeToken")}
          field={form.register("authorize_token")}
          error={form.formState.errors.authorize_token?.message}
          type="password"
          hint={t("apiKeyHint")}
          className="sm:col-span-2"
        />
      </SettingSection>

      <SettingSection title={tc("endpoints")} description={tc("endpointsDesc")}>
        <TextField
          label={tc("accountCodePath")}
          field={form.register("account_code_path")}
          error={form.formState.errors.account_code_path?.message}
        />
        <TextField
          label={tc("departmentPath")}
          field={form.register("department_path")}
          error={form.formState.errors.department_path?.message}
        />
        <TextField
          label={tc("vendorPath")}
          field={form.register("vendor_path")}
          error={form.formState.errors.vendor_path?.message}
        />
      </SettingSection>

      <SettingSection title={tc("options")} description={tc("optionsDesc")}>
        <ToggleField
          label={tc("setAccountMappingAllItems")}
          checked={form.watch("set_account_mapping_all_items")}
          onChange={(v) =>
            form.setValue("set_account_mapping_all_items", v, {
              shouldDirty: true,
            })
          }
        />
        <ToggleField
          label={tc("allowPostingTransferToGl")}
          checked={form.watch("allow_posting_transfer_to_gl")}
          onChange={(v) =>
            form.setValue("allow_posting_transfer_to_gl", v, {
              shouldDirty: true,
            })
          }
        />
      </SettingSection>
    </InterfacePageLayout>
  );
}
```

- [ ] **Step 4: Add the i18n blocks**

In `messages/en.json`, inside `systemAdmin.interface.accounting` (add key `"carmenGl"` after `"postingFrequency"` — remember the comma on the preceding line):

```json
"carmenGl": {
  "desc": "Connection to the legacy Carmen 4 accounting API.",
  "connection": "Connection",
  "connectionDesc": "Carmen 4 API server and authorization.",
  "apiServer": "API server",
  "authorizeToken": "Authorize token",
  "endpoints": "Data endpoints",
  "endpointsDesc": "Paths under the API server for account codes, departments and vendors.",
  "accountCodePath": "Account code path",
  "departmentPath": "Department path",
  "vendorPath": "Vendor path",
  "options": "Options",
  "optionsDesc": "Account mapping and GL posting behavior.",
  "setAccountMappingAllItems": "Set account mapping for all items",
  "allowPostingTransferToGl": "Allow posting the transfer to GL"
}
```

In `messages/th.json`, same position inside `systemAdmin.interface.accounting`:

```json
"carmenGl": {
  "desc": "การเชื่อมต่อกับ API ระบบบัญชี Carmen 4 (legacy)",
  "connection": "การเชื่อมต่อ",
  "connectionDesc": "เซิร์ฟเวอร์ API ของ Carmen 4 และโทเคนการอนุญาต",
  "apiServer": "เซิร์ฟเวอร์ API",
  "authorizeToken": "โทเคนการอนุญาต",
  "endpoints": "ปลายทางข้อมูล",
  "endpointsDesc": "เส้นทางใต้เซิร์ฟเวอร์ API สำหรับรหัสบัญชี แผนก และผู้ขาย",
  "accountCodePath": "เส้นทางรหัสบัญชี",
  "departmentPath": "เส้นทางแผนก",
  "vendorPath": "เส้นทางผู้ขาย",
  "options": "ตัวเลือก",
  "optionsDesc": "การจับคู่บัญชีและการส่งข้อมูลไปยัง GL",
  "setAccountMappingAllItems": "ตั้งค่าการจับคู่บัญชีให้ทุกรายการ",
  "allowPostingTransferToGl": "อนุญาตให้ส่งรายการโอนไปยัง GL"
}
```

- [ ] **Step 5: Run the test to verify it passes, then type-check**

```bash
bun test:run routes/system-admin/interface/carmen-gl-interface-form.test.ts
bunx tsc --noEmit
```

Expected: test PASS (5 tests), tsc clean.

- [ ] **Step 6: Commit**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-inventory-frontend-react
git add routes/system-admin/interface/carmen-gl-interface-form.tsx routes/system-admin/interface/carmen-gl-interface-form.test.ts messages/en.json messages/th.json
git commit -m "feat(interface): Carmen GL form with Carmen 4 legacy fields

New dedicated form for the carmen_gl accounting brand: API server,
authorize token (masked secret), three endpoint paths prefilled with
the legacy defaults, and the two GL posting options. Old generic-shape
rows parse to defaults (lazy schema evolution, no migration).

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Frontend — registry brand-form override + detail route wiring

**Files:**
- Modify: `routes/system-admin/interface/interface-registry.ts`
- Modify: `routes/system-admin/interface/interface-detail.route.tsx` (line 33)
- Test: `routes/system-admin/interface/interface-registry.test.ts`

**Interfaces:**
- Consumes: `CarmenGlInterfaceForm` default export from Task 3 (lazy import path `./carmen-gl-interface-form`).
- Produces: `BrandDef` gains optional `readonly form?: LazyExoticComponent<ComponentType>`; the detail route renders `brandDef.form ?? categoryDef.form`. No other consumer of `BrandDef` exists (checked: `interface-list.tsx` and `use-interface-entitlement` read only `key`/`configKey`/`icon`).

- [ ] **Step 1: Write the failing tests**

In `routes/system-admin/interface/interface-registry.test.ts`, add a new describe block after `describe("findBrand")`:

```ts
describe("brand form overrides", () => {
  it("gives carmen_gl its own form", () => {
    expect(findBrand("accounting", "carmen_gl")?.form).toBeDefined();
  });

  it("leaves the other accounting brands on the category form", () => {
    expect(findBrand("accounting", "blueledgers")?.form).toBeUndefined();
    expect(findBrand("accounting", "external")?.form).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the tests to verify the first one fails**

```bash
bun test:run routes/system-admin/interface/interface-registry.test.ts
```

Expected: FAIL — `'gives carmen_gl its own form'` (property `form` does not exist on `BrandDef`, value is `undefined`). TypeScript may also flag `?.form` — that is the same failure surfacing at compile time; proceed to the implementation step.

- [ ] **Step 3: Implement the registry override and route wiring**

In `routes/system-admin/interface/interface-registry.ts`:

Extend `BrandDef`:

```ts
export type BrandDef = {
  /** route param — `/system-admin/interface/:category/:brand` */
  readonly key: string;
  /** key ของ row ใน app_config — `interface_<category>_<brand>` */
  readonly configKey: string;
  /** form เฉพาะ brand — ถ้าไม่กำหนด ใช้ form ของ category (ดู interface-detail.route.tsx) */
  readonly form?: LazyExoticComponent<ComponentType>;
};
```

Replace the accounting entry in `INTERFACE_CATEGORIES` (carmen_gl declared inline with its override; the other two still come from the `brands()` helper, order unchanged):

```ts
  {
    key: "accounting",
    icon: BookOpen,
    brands: [
      {
        key: "carmen_gl",
        configKey: "interface_accounting_carmen_gl",
        // Carmen 4 legacy — field set ต่างจาก accounting ทั่วไป (ดู spec 2026-07-22)
        form: lazy(() => import("./carmen-gl-interface-form")),
      },
      ...brands("accounting", ["blueledgers", "external"]),
    ],
    form: lazy(() => import("./accounting-interface-form")),
  },
```

In `routes/system-admin/interface/interface-detail.route.tsx`, replace line 33:

```tsx
  const Form = categoryDef.form;
```

with:

```tsx
  const Form = brandDef.form ?? categoryDef.form;
```

- [ ] **Step 4: Run the registry tests to verify they pass**

```bash
bun test:run routes/system-admin/interface/interface-registry.test.ts
```

Expected: PASS (all tests, including the existing config-key invariants — carmen_gl's inline `configKey` still matches `interface_accounting_carmen_gl`).

- [ ] **Step 5: Full frontend gate**

```bash
bunx tsc --noEmit && bun test:run
```

Expected: tsc clean, full suite green.

- [ ] **Step 6: Commit**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-inventory-frontend-react
git add routes/system-admin/interface/interface-registry.ts routes/system-admin/interface/interface-detail.route.tsx routes/system-admin/interface/interface-registry.test.ts
git commit -m "feat(interface): per-brand form override; carmen_gl uses the Carmen 4 form

BrandDef gains an optional form; the detail route prefers it over the
category form. blueledgers/external keep the generic accounting form.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Full verification (both repos)

**Files:** none (verification only).

**Interfaces:**
- Consumes: everything from Tasks 1–4.
- Produces: both branches green and ready for PR.

- [ ] **Step 1: Backend full suite + type-check**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2/apps/micro-business
bun run check-types && bun run test
```

Expected: tsc clean, all micro-business jest suites pass.

- [ ] **Step 2: Frontend full suite + type-check + lint**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-inventory-frontend-react
bunx tsc --noEmit && bun test:run && bun run lint
```

Expected: all clean/green.

- [ ] **Step 3: Manual smoke against the local backend (optional but recommended)**

Run the gateway + micro-business locally (`carmen-turborepo-backend-v2` on :4000, see repo docs), then:

```bash
VITE_DEV_PROXY_TARGET=http://localhost:4000 bun dev
```

Login → `/system-admin/interface/accounting/carmen_gl` → verify the new fields render with prefilled paths → fill server + token → Save → reload → token shows as masked value, other fields persist → open `/system-admin/interface/accounting/blueledgers` → verify the old generic form still renders. **Caution:** the local `:4000` backend points at the shared dev database — use a test business unit, do not overwrite customer config rows.

- [ ] **Step 4: Report done**

Both repos have exactly the commits from Tasks 1–4 on `feature/carmen-gl-interface-config`. PR descriptions must carry the deploy note: backend must have `SECRET_ENCRYPTION_KEY` set in prod/UAT or any secret-bearing save 400s (existing constraint), and the backend PR must deploy before or together with the frontend PR (old backend rejects the new payload shape).
