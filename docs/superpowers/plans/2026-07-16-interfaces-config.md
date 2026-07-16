# Interfaces Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Interfaces config area under `/system-admin` that stores settings for Carmen's Accounting, POS, and PMS interfaces.

**Architecture:** A registry supplies list metadata only; each interface owns its own form, zod schema, and submit logic, sharing just `useInterfaceConfig()` and a presentational `InterfacePageLayout`. Config rows live in `tb_application_config` — one row per interface, keyed `interface_accounting` / `interface_pos` / `interface_pms`. Backend gains a generic secret-path registry so `api_key` is encrypted at rest and masked on read.

**Tech Stack:** Vite + React 19 + React Router 7, TanStack Query, react-hook-form + zod, `use-intl`, Tailwind 4, Vitest (frontend) · NestJS + Prisma + Jest (backend)

**Spec:** `docs/superpowers/specs/2026-07-16-interfaces-config-design.md`

## Global Constraints

- **Two repos.** Tasks 1–2 are in `../carmen-turborepo-backend-v2`. Tasks 3–12 are in this repo (`carmen-inventory-frontend-react`). Commit separately in each; never mix.
- **Config storage only.** No sync triggers, no test-connection buttons, no sync history. If a task seems to want one, it is out of scope.
- **v1 is scalar fields only.** No mapping tables.
- **Communicate with the user in Thai.** Code, comments, commit messages stay English (`CLAUDE.md`).
- **Import `react-router` directly.** No `next/*`. `Link` uses `to`, not `href`. ESLint blocks `next*` imports.
- **Never hardcode backend URLs.** Runtime config comes from `public/config.json`.
- **Do not add `onError` toasts to mutations.** `components/providers.tsx:21-26` installs a `MutationCache.onError` that calls `reportApiError` globally. A local `onError` toast double-fires. Only add `onSuccess`.
- **Frontend gate:** `bunx tsc --noEmit && bun test:run` must be clean before any commit.
- **Backend gate:** `bun run check-types && bun run test` (run from `apps/micro-business`) must be clean before any commit. Use `bun run test` (→ jest, `rootDir: src`), **not** bare `bun test` — that invokes bun's own runner, which globs `.js` from the cwd and trips over the gitignored `dist/` build output. Only jest is the project's real gate.
- Exact secret constants, verbatim: `PREFIX = 'enc:v1:'` (`apps/micro-business/src/common/crypto.util.ts:18`), `MASK = '***ENCRYPTED***'` (`apps/micro-business/src/app-config/app-config.service.ts:9`).

---

## File Structure

**Backend — `../carmen-turborepo-backend-v2/apps/micro-business/src/app-config/`**

| File | Responsibility |
|---|---|
| `app-config.service.ts` (modify) | Add `secretPathsByKey` + path helpers; rewrite `maskSensitiveFields` / `encryptSensitiveFields` to walk paths; add `retainMaskedSecrets`; wire into `upsert`. Add interface zod schemas to `schemaByKey`, defaults to `defaultByKey`. |
| `app-config.service.spec.ts` (modify) | Cases for MASK sentinel (incl. `report_email` regression), `interface_pos` encrypt/mask, interface defaults. |

**Frontend — `routes/system-admin/interface/`** (all new)

| File | Responsibility |
|---|---|
| `interface-registry.ts` | `INTERFACES` list metadata + `findInterface(key)`. No form logic. |
| `interface-registry.test.ts` | Registry invariants. |
| `use-interface-config.ts` | Wraps `useAppConfigByKey` + `useUpsertAppConfig`; maps 404 → `isNew`. |
| `use-interface-config.test.ts` | 404 → `isNew`, 500 → `isError`. |
| `interface-page-layout.tsx` | Header, Save button, skeleton, `ErrorState`, unsaved-edits navigation guard. Holds no form state — takes an `isDirty` flag. |
| `interface-fields.tsx` | `TextField` / `EnumField` / `ToggleField` — the field shapes all three forms repeat. Presentational, no form state. |
| `accounting-interface-form.tsx` | Accounting form + zod schema + `toFormValues`/`toApiValue`. |
| `accounting-interface-form.test.ts` | Schema + mapper round-trip. |
| `pos-interface-form.tsx` | POS form + schema + mappers. |
| `pos-interface-form.test.ts` | Schema + mapper round-trip. |
| `pms-interface-form.tsx` | PMS form + schema + mappers. |
| `pms-interface-form.test.ts` | Schema + mapper round-trip. |
| `interface-detail.route.tsx` | Resolve `:key` via registry → lazy form, else NotFound. |
| `interface-list.tsx` | Card grid + enabled badge. |
| `interface-list.test.tsx` | Badge derivation. |
| `interface.route.tsx` | List route entry. |

**Frontend — existing files modified**

| File | Change |
|---|---|
| `hooks/use-app-config.ts` | Add `useAppConfigs()` |
| `hooks/__tests__/use-app-config.test.ts` (new) | Cover `useAppConfigs()` |
| `routes/router.tsx` | Register `interface` + `interface/:key` |
| `routes/system-admin/landing-types.ts` | `VisualKey` + module entry in chapter `config` |
| `routes/system-admin/landing-visuals.tsx` | `InterfaceViz` case |
| `messages/en.json`, `messages/th.json` | `systemAdmin.interface.*`, `systemAdmin.landing.modules.interface` |

**Task order rationale:** backend first (it fixes a live bug and unblocks `api_key`), then the hooks, then the layout, then each form, then the registry (which imports the forms), then routes, then landing. The registry cannot come before the forms it lazily imports.

---

### Task 1: Backend — secret path registry + MASK sentinel guard

Repo: `../carmen-turborepo-backend-v2`. Run all commands from `apps/micro-business`.

This task fixes a **live defect**: `'***ENCRYPTED***'.startsWith('enc:v1:')` is `false`, so saving Config Email without retyping the password encrypts the mask string over the real SMTP password.

**Files:**
- Modify: `apps/micro-business/src/app-config/app-config.service.ts:103-129` (mask/encrypt), `:254-262` (upsert)
- Test: `apps/micro-business/src/app-config/app-config.service.spec.ts` (append to `describe('upsert')`, ~line 113-198)

**Interfaces:**
- Consumes: `encryptSecret`, `isEncrypted` from `@/common/crypto.util`; `MASK` const at `app-config.service.ts:9`
- Produces: `secretPathsByKey` keyed by config key. Later tasks rely on `interface_pos` and `interface_pms` masking/encrypting a top-level `api_key`.

- [ ] **Step 1: Write the failing tests**

Append inside `describe('upsert', ...)` in `app-config.service.spec.ts`:

```ts
    it('keeps the stored secret when the caller posts the mask back (report_email regression)', async () => {
      // GET masks the password, so a form that edited only `recipients` posts MASK back.
      // Encrypting the mask over the real password would destroy it.
      const existing = {
        id: 'ex-1',
        value: { smtp: { host: 'h', port: 587, username: 'u', password: 'ENC:real-password', from: 'f', enabled: true }, recipients: ['a@b.c'], cc: [], subject_prefix: '[Carmen]' },
      };
      mockPrisma.tb_application_config.findFirst.mockResolvedValue(existing);
      mockPrisma.tb_application_config.update.mockResolvedValue({ id: 'ex-1', key: 'report_email', value: {}, created_at: null, created_by_id: 'u1', updated_at: null, updated_by_id: 'user-1' });

      await service.upsert('BU01', 'user-1', 'report_email', {
        smtp: { host: 'h', port: 587, username: 'u', password: '***ENCRYPTED***', from: 'f', enabled: true },
        recipients: ['changed@b.c'],
        cc: [],
        subject_prefix: '[Carmen]',
      });

      const stored = mockPrisma.tb_application_config.update.mock.calls[0][0].data.value;
      expect(stored.smtp.password).toBe('ENC:real-password');
      expect(stored.recipients).toEqual(['changed@b.c']);
    });

    it('encrypts api_key for interface_pos before persisting', async () => {
      mockPrisma.tb_application_config.findFirst.mockResolvedValue(null);
      mockPrisma.tb_application_config.create.mockResolvedValue({ id: 'new-c', key: 'interface_pos', value: {}, created_at: null, created_by_id: 'u1', updated_at: null, updated_by_id: null });

      await service.upsert('BU01', 'user-1', 'interface_pos', {
        enabled: true, vendor: 'micros', endpoint: 'https://pos.example.com',
        api_key: 'plain-key', sync_frequency: 'daily', default_location_code: 'L1',
        consumption_posting: 'recipe',
      });

      const stored = mockPrisma.tb_application_config.create.mock.calls[0][0].data.value;
      expect(stored.api_key).toBe('ENC:plain-key');
      expect(stored.endpoint).toBe('https://pos.example.com');
    });

    it('keeps the stored api_key when interface_pms posts the mask back', async () => {
      mockPrisma.tb_application_config.findFirst.mockResolvedValue({
        id: 'ex-2',
        value: { enabled: true, vendor: 'opera', endpoint: 'e', api_key: 'ENC:pms-key', property_code: 'P1', post_city_ledger: true, post_credit_card: false },
      });
      mockPrisma.tb_application_config.update.mockResolvedValue({ id: 'ex-2', key: 'interface_pms', value: {}, created_at: null, created_by_id: 'u1', updated_at: null, updated_by_id: 'user-1' });

      await service.upsert('BU01', 'user-1', 'interface_pms', {
        enabled: true, vendor: 'opera', endpoint: 'e', api_key: '***ENCRYPTED***',
        property_code: 'P2', post_city_ledger: true, post_credit_card: false,
      });

      const stored = mockPrisma.tb_application_config.update.mock.calls[0][0].data.value;
      expect(stored.api_key).toBe('ENC:pms-key');
      expect(stored.property_code).toBe('P2');
    });
```

Append a new `describe` block after `describe('get', ...)`:

```ts
  describe('masking interface secrets', () => {
    it('masks api_key on get for interface_pos', async () => {
      mockPrisma.tb_application_config.findFirst.mockResolvedValue({
        id: 'c9', key: 'interface_pos',
        value: { enabled: true, vendor: 'micros', endpoint: 'e', api_key: 'ENC:secret', sync_frequency: 'daily', default_location_code: 'L1', consumption_posting: 'recipe' },
        created_at: null, created_by_id: 'u1', updated_at: null, updated_by_id: null,
      });

      const result = await service.get('BU01', 'user-1', 'interface_pos');

      expect((result.value as { api_key: string }).api_key).toBe('***ENCRYPTED***');
      expect((result.value as { endpoint: string }).endpoint).toBe('e');
    });

    it('leaves unknown keys untouched', async () => {
      mockPrisma.tb_application_config.findFirst.mockResolvedValue({
        id: 'c10', key: 'some_key', value: { api_key: 'not-a-registered-secret' },
        created_at: null, created_by_id: 'u1', updated_at: null, updated_by_id: null,
      });

      const result = await service.get('BU01', 'user-1', 'some_key');

      expect((result.value as { api_key: string }).api_key).toBe('not-a-registered-secret');
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ../carmen-turborepo-backend-v2/apps/micro-business && bun run test -- app-config.service.spec -t "mask"`
Expected: FAIL — the regression test shows `stored.smtp.password` is `'ENC:***ENCRYPTED***'` (the bug), and interface tests show `api_key` unencrypted/unmasked.

- [ ] **Step 3: Replace mask/encrypt with the path registry**

In `app-config.service.ts`, replace `maskSensitiveFields` and `encryptSensitiveFields` (lines 103-129) with:

```ts
  /** Secret field paths per config key. Add an entry to protect a new key's secret. */
  private readonly secretPathsByKey: Record<string, readonly (readonly string[])[]> = {
    report_email: [['smtp', 'password']],
    interface_pos: [['api_key']],
    interface_pms: [['api_key']],
  };

  /** Read the string at `path` inside `obj`, or undefined if absent/not a string. */
  private readSecret(obj: unknown, path: readonly string[]): string | undefined {
    let cur: unknown = obj;
    for (const seg of path) {
      if (!cur || typeof cur !== 'object') return undefined;
      cur = (cur as Record<string, unknown>)[seg];
    }
    return typeof cur === 'string' ? cur : undefined;
  }

  /** Shallow-copy `obj` along `path`, setting the leaf to `next`. */
  private writeSecret(obj: unknown, path: readonly string[], next: string): unknown {
    if (!obj || typeof obj !== 'object') return obj;
    const [head, ...rest] = path;
    const src = obj as Record<string, unknown>;
    if (rest.length === 0) return { ...src, [head]: next };
    return { ...src, [head]: this.writeSecret(src[head], rest, next) };
  }

  /** Mask secret field(s) inside a config value before returning to caller.
   * @param key - Configuration key / คีย์การตั้งค่า
   * @param value - Configuration value to mask / ค่าการตั้งค่าที่จะปิดบัง
   * @returns Value with sensitive fields masked / ค่าที่ปิดบังฟิลด์ที่มีความสำคัญแล้ว
   */
  private maskSensitiveFields(key: string, value: unknown): unknown {
    const paths = this.secretPathsByKey[key];
    if (!paths || !value || typeof value !== 'object') return value;
    let out: unknown = value;
    for (const path of paths) {
      if (this.readSecret(out, path)) out = this.writeSecret(out, path, MASK);
    }
    return out;
  }

  /** Encrypt secret field(s) before persisting. Skip if already encrypted.
   * @param key - Configuration key / คีย์การตั้งค่า
   * @param value - Configuration value to encrypt / ค่าการตั้งค่าที่จะเข้ารหัส
   * @returns Value with sensitive fields encrypted / ค่าที่เข้ารหัสฟิลด์ที่มีความสำคัญแล้ว
   */
  private encryptSensitiveFields(key: string, value: unknown): unknown {
    const paths = this.secretPathsByKey[key];
    if (!paths || !value || typeof value !== 'object') return value;
    let out: unknown = value;
    for (const path of paths) {
      const secret = this.readSecret(out, path);
      if (secret && !isEncrypted(secret)) {
        out = this.writeSecret(out, path, encryptSecret(secret));
      }
    }
    return out;
  }

  /** Callers receive secrets masked, so a form that did not touch the secret posts MASK
   * back. Keep the stored secret instead of encrypting the mask over it.
   * @param key - Configuration key / คีย์การตั้งค่า
   * @param incoming - Value posted by the caller / ค่าที่ผู้เรียกส่งมา
   * @param stored - Value currently in the DB / ค่าที่เก็บอยู่ใน DB
   * @returns Value with masked secrets restored / ค่าที่คืนค่าลับเดิมแล้ว
   */
  private retainMaskedSecrets(key: string, incoming: unknown, stored: unknown): unknown {
    const paths = this.secretPathsByKey[key];
    if (!paths || !incoming || typeof incoming !== 'object') return incoming;
    let out: unknown = incoming;
    for (const path of paths) {
      if (this.readSecret(out, path) !== MASK) continue;
      const kept = this.readSecret(stored, path);
      // The caller echoed the mask but there is nothing to restore (row deleted while
      // their form was open). Storing the literal mask would destroy the secret; storing
      // '' would persist a row that fails its own schema and break the integration
      // silently. Refuse instead.
      if (kept === undefined) {
        throw new Error(
          `Cannot save ${key}: no stored secret to restore for ${path.join('.')}`,
        );
      }
      out = this.writeSecret(out, path, kept);
    }
    return out;
  }
```

- [ ] **Step 4: Wire the sentinel into `upsert`**

In `app-config.service.ts`, replace the head of `upsert` (lines 254-267) so the existing row is fetched **before** encryption and its value is available:

```ts
  async upsert(bu_code: string, user_id: string, key: string, value: unknown) {
    if (!KEY_REGEX.test(key)) throw new Error('Invalid key format');
    if (!user_id) throw new Error('user_id is required');

    const validated = this.validateValue(key, value);

    const prisma = await this.tenantService.prismaTenantInstance(bu_code, user_id);

    const existing = await prisma.tb_application_config.findFirst({
      where: { key, deleted_at: null },
      select: { id: true, value: true },
    });

    const retained = this.retainMaskedSecrets(key, validated, existing?.value);
    const toStore = this.encryptSensitiveFields(key, retained) as object;
```

Leave the rest of `upsert` (the `nowIso` comment and the create/update branches) exactly as it is.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd ../carmen-turborepo-backend-v2/apps/micro-business && bun run test -- app-config.service.spec`
Expected: PASS — all existing cases plus the five new ones.

- [ ] **Step 6: Typecheck**

Run: `cd ../carmen-turborepo-backend-v2/apps/micro-business && bun run check-types`
Expected: no output, exit 0.

- [ ] **Step 7: Commit**

```bash
cd ../carmen-turborepo-backend-v2
git add apps/micro-business/src/app-config/app-config.service.ts apps/micro-business/src/app-config/app-config.service.spec.ts
git commit -m "fix(app-config): keep stored secret when caller posts the mask back

maskSensitiveFields/encryptSensitiveFields were pinned to key === 'report_email'
and the path smtp.password. Replace both with a secretPathsByKey registry walked
generically, and add interface_pos/interface_pms api_key.

This also fixes a live defect: MASK ('***ENCRYPTED***') does not match the
isEncrypted PREFIX ('enc:v1:'), so saving Config Email without retyping the
password encrypted the mask string over the real SMTP password. upsert now
restores the stored secret when the caller posts MASK back."
```

---

### Task 2: Backend — interface zod schemas + defaults

Repo: `../carmen-turborepo-backend-v2`.

**Files:**
- Modify: `apps/micro-business/src/app-config/app-config.service.ts:131-145` (`defaultByKey`), `:152-172` (`validateValue`)
- Test: `apps/micro-business/src/app-config/app-config.service.spec.ts`

**Interfaces:**
- Consumes: `secretPathsByKey` from Task 1 (interface keys must match exactly).
- Produces: `interface_accounting` / `interface_pos` / `interface_pms` validate server-side and default to `{ enabled: false }` when no row exists. Task 5's frontend 404 handling stays regardless — it covers business units deployed before this task.

- [ ] **Step 1: Write the failing tests**

Append a new `describe` block to `app-config.service.spec.ts`:

```ts
  describe('interface config keys', () => {
    it('returns a disabled default when no interface_accounting row exists', async () => {
      mockPrisma.tb_application_config.findFirst.mockResolvedValue(null);

      const result = await service.get('BU01', 'user-1', 'interface_accounting');

      expect(result?.value).toEqual({ enabled: false });
    });

    it('rejects an interface_pos value with an unknown vendor', async () => {
      mockPrisma.tb_application_config.findFirst.mockResolvedValue(null);

      await expect(
        service.upsert('BU01', 'user-1', 'interface_pos', {
          enabled: true, vendor: 'not-a-vendor', endpoint: '', api_key: '',
          sync_frequency: 'daily', default_location_code: '', consumption_posting: 'recipe',
        }),
      ).rejects.toThrow(/Invalid interface_pos value/);
    });

    it('accepts a valid interface_accounting value', async () => {
      mockPrisma.tb_application_config.findFirst.mockResolvedValue(null);
      mockPrisma.tb_application_config.create.mockResolvedValue({ id: 'a1', key: 'interface_accounting', value: {}, created_at: null, created_by_id: 'u1', updated_at: null, updated_by_id: null });

      await expect(
        service.upsert('BU01', 'user-1', 'interface_accounting', {
          enabled: true, system: 'carmen_gl', default_account_code: '1000',
          default_department_code: 'D1', default_invoice_value: '0',
          export_format: 'csv', endpoint: '', posting_frequency: 'daily',
        }),
      ).resolves.toBeDefined();
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ../carmen-turborepo-backend-v2/apps/micro-business && bun run test -- app-config.service.spec -t "interface config keys"`
Expected: FAIL — default test gets `null`/undefined value; the vendor test resolves instead of throwing (unknown keys pass through today).

- [ ] **Step 3: Add the schemas**

In `app-config.service.ts`, add near the other schema definitions at the top of the file (beside `ReportEmailSchema`):

```ts
const InterfaceAccountingSchema = z.object({
  enabled: z.boolean(),
  system: z.enum(['carmen_gl', 'blueledgers', 'external']),
  default_account_code: z.string(),
  default_department_code: z.string(),
  default_invoice_value: z.string(),
  export_format: z.enum(['csv', 'xml', 'json']),
  endpoint: z.string(),
  posting_frequency: z.enum(['manual', 'daily', 'monthly']),
});

const InterfacePosSchema = z.object({
  enabled: z.boolean(),
  vendor: z.enum(['micros', 'infrasys', 'square', 'other']),
  endpoint: z.string(),
  api_key: z.string(),
  sync_frequency: z.enum(['manual', 'hourly', 'daily']),
  default_location_code: z.string(),
  consumption_posting: z.enum(['recipe', 'direct']),
});

const InterfacePmsSchema = z.object({
  enabled: z.boolean(),
  vendor: z.enum(['opera', 'protel', 'other']),
  endpoint: z.string(),
  api_key: z.string(),
  property_code: z.string(),
  post_city_ledger: z.boolean(),
  post_credit_card: z.boolean(),
});
```

- [ ] **Step 4: Register the schemas and defaults**

In `validateValue`, add to the `schemaByKey` object literal:

```ts
      interface_accounting: InterfaceAccountingSchema,
      interface_pos: InterfacePosSchema,
      interface_pms: InterfacePmsSchema,
```

In `defaultByKey`, add:

```ts
    interface_accounting: { enabled: false },
    interface_pos: { enabled: false },
    interface_pms: { enabled: false },
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd ../carmen-turborepo-backend-v2/apps/micro-business && bun run test -- app-config.service.spec && bun run check-types`
Expected: PASS, typecheck exit 0.

- [ ] **Step 6: Commit**

```bash
cd ../carmen-turborepo-backend-v2
git add apps/micro-business/src/app-config/app-config.service.ts apps/micro-business/src/app-config/app-config.service.spec.ts
git commit -m "feat(app-config): validate and default the three interface config keys

interface_accounting/interface_pos/interface_pms get server-side zod schemas
and an { enabled: false } default, so a never-configured interface returns a
row instead of 404."
```

---

### Task 3: Frontend — `useAppConfigs()` list hook

Repo: this one. All remaining tasks are here.

**Files:**
- Modify: `hooks/use-app-config.ts` (add after `useAppConfigByKey`, before `useUpsertAppConfig`)
- Test: `hooks/__tests__/use-app-config.test.ts` (create)

**Interfaces:**
- Consumes: `API_ENDPOINTS.APP_CONFIGS(buCode)` (`constant/api-endpoints.ts:35`), `QUERY_KEYS.APP_CONFIGS` (`constant/query-keys.ts:122`), `CACHE_STATIC` (`lib/cache-config.ts:8`), `AppConfig` (`types/app-config.ts`)
- Produces: `useAppConfigs(): UseQueryResult<AppConfig[]>` — Task 11's list page consumes it.

- [ ] **Step 1: Write the failing test**

Create `hooks/__tests__/use-app-config.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { useAppConfigs } from "../use-app-config";
import type { AppConfig } from "@/types/app-config";

vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => ({ buCode: "BU001" }),
}));

vi.mock("@/lib/http-client", () => ({
  httpClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { httpClient } from "@/lib/http-client";

const rows: AppConfig[] = [
  {
    id: "1",
    key: "interface_pos",
    value: { enabled: true },
    created_at: null,
    created_by_id: null,
    updated_at: null,
    updated_by_id: null,
  },
];

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client }, children);
}

describe("useAppConfigs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns every app config row for the current business unit", async () => {
    vi.mocked(httpClient.get).mockResolvedValue({
      ok: true,
      json: async () => ({ data: rows }),
    } as Response);

    const { result } = renderHook(() => useAppConfigs(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(rows);
    expect(httpClient.get).toHaveBeenCalledWith(
      "/api/proxy/api/config/BU001/app-config",
    );
  });

  it("surfaces a failed request as an error", async () => {
    vi.mocked(httpClient.get).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: "boom" }),
    } as Response);

    const { result } = renderHook(() => useAppConfigs(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test:run hooks/__tests__/use-app-config.test.ts`
Expected: FAIL — `useAppConfigs is not a function` (not exported yet).

- [ ] **Step 3: Add the hook**

In `hooks/use-app-config.ts`, insert after `useAppConfigByKey` and before `useUpsertAppConfig`:

```ts
/**
 * Hook ดึง app config ทั้งหมดของ business unit ปัจจุบัน
 *
 * ใช้ในหน้า list ที่ต้องรู้สถานะของหลาย key พร้อมกัน (เช่น interface list ที่โชว์
 * badge enabled/disabled ต่อ interface) แทนการยิง `useAppConfigByKey` ทีละ key
 *
 * @returns query ที่คืน `AppConfig[]`
 */
export function useAppConfigs() {
  const buCode = useBuCode();
  return useQuery<AppConfig[]>({
    queryKey: [QUERY_KEYS.APP_CONFIGS, buCode],
    queryFn: async () => {
      const res = await httpClient.get(API_ENDPOINTS.APP_CONFIGS(buCode!));
      if (!res.ok) throw await ApiError.from(res, "Failed to fetch app configs");
      const json = await res.json();
      return json.data;
    },
    ...CACHE_STATIC,
    enabled: !!buCode,
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test:run hooks/__tests__/use-app-config.test.ts && bunx tsc --noEmit`
Expected: 2 tests PASS, typecheck exit 0.

- [ ] **Step 5: Commit**

```bash
git add hooks/use-app-config.ts hooks/__tests__/use-app-config.test.ts
git commit -m "feat(app-config): add useAppConfigs list hook

The APP_CONFIGS endpoint existed with no hook consuming it. The interface list
needs several keys' enabled state at once."
```

---

### Task 4: Frontend — `useInterfaceConfig` hook

**Files:**
- Create: `routes/system-admin/interface/use-interface-config.ts`
- Test: `routes/system-admin/interface/use-interface-config.test.ts`

**Interfaces:**
- Consumes: `useAppConfigByKey`, `useUpsertAppConfig` (`hooks/use-app-config.ts`); `ApiError` (`lib/api-error.ts` — carries `statusCode?: number`)
- Produces:
  ```ts
  export type UseInterfaceConfigResult = {
    readonly value: Record<string, unknown> | undefined;
    readonly isLoading: boolean;
    readonly isNew: boolean;
    readonly isError: boolean;
    readonly refetch: () => void;
    readonly save: (value: Record<string, unknown>, opts?: { onSuccess?: () => void }) => void;
    readonly isSaving: boolean;
  };
  export function useInterfaceConfig(configKey: string): UseInterfaceConfigResult;
  ```
  Tasks 6–8 (the three forms) consume exactly this shape.

This is the only genuinely new logic in the frontend, so it carries the most valuable test.

Two notes for the implementer:

- **The forms deliberately do not branch on `isNew`.** It exists so the 404 path is explicit and assertable rather than hidden inside a negated `isError`. The forms need no branch because `toFormValues(undefined)` already yields the defaults.
- **Where the spec and this plan differ on save errors.** The spec's error table says a save error shows `toast.error`. In practice `components/providers.tsx:21-26` installs a `MutationCache.onError` that toasts every failed mutation globally, so the forms add only `onSuccess`. The behavior the spec asks for still happens; the plan just does not duplicate it locally.

- [ ] **Step 1: Write the failing test**

Create `routes/system-admin/interface/use-interface-config.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { useInterfaceConfig } from "./use-interface-config";

vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => ({ buCode: "BU001" }),
}));

vi.mock("@/lib/http-client", () => ({
  httpClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { httpClient } from "@/lib/http-client";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client }, children);
}

describe("useInterfaceConfig", () => {
  beforeEach(() => vi.clearAllMocks());

  it("treats 404 as a not-yet-configured interface, not an error", async () => {
    vi.mocked(httpClient.get).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ message: "Config key not found" }),
    } as Response);

    const { result } = renderHook(() => useInterfaceConfig("interface_pos"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isNew).toBe(true);
    expect(result.current.isError).toBe(false);
    expect(result.current.value).toBeUndefined();
  });

  it("reports a server failure as an error", async () => {
    vi.mocked(httpClient.get).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: "boom" }),
    } as Response);

    const { result } = renderHook(() => useInterfaceConfig("interface_pos"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isNew).toBe(false);
  });

  it("exposes the stored value when the config exists", async () => {
    vi.mocked(httpClient.get).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { id: "1", key: "interface_pos", value: { enabled: true } },
      }),
    } as Response);

    const { result } = renderHook(() => useInterfaceConfig("interface_pos"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.value).toEqual({ enabled: true }));
    expect(result.current.isNew).toBe(false);
    expect(result.current.isError).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test:run routes/system-admin/interface/use-interface-config.test.ts`
Expected: FAIL — cannot resolve `./use-interface-config`.

- [ ] **Step 3: Write the hook**

Create `routes/system-admin/interface/use-interface-config.ts`:

```ts
import { useAppConfigByKey, useUpsertAppConfig } from "@/hooks/use-app-config";
import { ApiError } from "@/lib/api-error";

export type UseInterfaceConfigResult = {
  readonly value: Record<string, unknown> | undefined;
  readonly isLoading: boolean;
  /** ยังไม่เคยตั้งค่า interface นี้ — form โชว์ค่า default ไม่ใช่ error */
  readonly isNew: boolean;
  readonly isError: boolean;
  readonly refetch: () => void;
  readonly save: (
    value: Record<string, unknown>,
    opts?: { onSuccess?: () => void },
  ) => void;
  readonly isSaving: boolean;
};

/**
 * Hook อ่าน/เขียน config ของ interface หนึ่งตัวใน `tb_application_config`
 *
 * แยก "ยังไม่เคยตั้งค่า" (404) ออกจาก error จริง (500/401) เพราะ interface ที่ยัง
 * ไม่ถูกตั้งค่าเป็นสถานะปกติ ไม่ควรขึ้นหน้า error — backend มี default ให้แล้ว
 * (`defaultByKey`) แต่ BU ที่ deploy ก่อนหน้านั้นยังคืน 404 อยู่ จึงต้องดักไว้ฝั่งนี้ด้วย
 *
 * 404 ยัง retry 1 รอบตาม default ของ QueryClient (`components/providers.tsx`) — ยอมได้
 * เพราะเป็น path ชั่วคราวและ backend default ตัดมันทิ้งไปแล้ว
 *
 * @param configKey - key ใน app_config เช่น `interface_pos`
 * @returns ค่า config, สถานะโหลด/ใหม่/error และฟังก์ชัน save
 */
export function useInterfaceConfig(configKey: string): UseInterfaceConfigResult {
  const query = useAppConfigByKey(configKey);
  const upsert = useUpsertAppConfig();

  const isNotFound =
    query.error instanceof ApiError && query.error.statusCode === 404;

  return {
    value: query.data?.value,
    // isPending, not isLoading: useAppConfigByKey is gated `enabled: !!buCode`, and a
    // disabled query has fetchStatus "idle", so isLoading is false while the profile is
    // still resolving — the form would render its defaults, then flicker to a skeleton,
    // and form.reset would wipe anything typed in that window.
    isLoading: query.isPending,
    isNew: isNotFound && !query.data,
    isError: query.isError && !isNotFound,
    refetch: () => void query.refetch(),
    save: (value, opts) =>
      upsert.mutate({ key: configKey, value }, { onSuccess: opts?.onSuccess }),
    isSaving: upsert.isPending,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test:run routes/system-admin/interface/use-interface-config.test.ts && bunx tsc --noEmit`
Expected: 3 tests PASS, typecheck exit 0.

- [ ] **Step 5: Commit**

```bash
git add routes/system-admin/interface/use-interface-config.ts routes/system-admin/interface/use-interface-config.test.ts
git commit -m "feat(interface): add useInterfaceConfig hook

Maps a 404 to isNew rather than an error, so a never-configured interface
renders its defaults instead of an error page."
```

---

### Task 5: Frontend — shared layout + field helpers

**Files:**
- Create: `routes/system-admin/interface/interface-page-layout.tsx`
- Create: `routes/system-admin/interface/interface-fields.tsx`

**Interfaces:**
- Consumes: `Button` (`@/components/ui/button`), `ErrorState` (`@/components/ui/error-state`), `SettingSectionSkeleton` (`@/components/ui/setting-section`), `DiscardDialog` (`@/components/ui/discard-dialog`), `useNavigationGuard` (`@/hooks/use-navigation-guard`)
- Produces:
  ```tsx
  export function InterfacePageLayout(props: {
    readonly title: string;
    readonly description: string;
    readonly onSave: () => void;
    readonly isSaving: boolean;
    readonly isLoading: boolean;
    readonly isError: boolean;
    readonly isDirty: boolean;
    readonly onRetry: () => void;
    readonly errorMessage: string;
    readonly saveLabel: string;
    readonly children: React.ReactNode;
  }): React.ReactElement;
  ```
  Tasks 6–8 render their fields as `children`, pass their own `form.handleSubmit(...)` as `onSave`, and pass `form.formState.isDirty` as `isDirty`.

  From `interface-fields.tsx`:
  ```tsx
  export function TextField(props: {
    readonly label: string;
    readonly field: UseFormRegisterReturn;
    readonly error?: string;
    readonly placeholder?: string;
    readonly type?: "text" | "password";
    readonly hint?: string;
    readonly className?: string;
  }): React.ReactElement;

  export function EnumField<T extends string>(props: {
    readonly label: string;
    readonly value: T;
    readonly options: readonly T[];
    readonly optionLabel: (option: T) => string;
    readonly onChange: (next: T) => void;
  }): React.ReactElement;

  export function ToggleField(props: {
    readonly label: string;
    readonly checked: boolean;
    readonly onChange: (next: boolean) => void;
  }): React.ReactElement;
  ```
  Tasks 6–8 build every field through these three. The three forms otherwise repeat the same `Field` + `Select` + `SelectTrigger` + `SelectContent` + `SelectItem.map` block roughly eight times; these helpers carry that shape once.

  This is a **presentational** helper, not the generic field renderer the spec rejected: it takes a label and a value, not a schema. Each form still declares its own fields, types, and order — a future interface can ignore these helpers entirely and render a mapping table.

The layout **holds no form state** — it receives a dirty flag, not a form. The Save button lives here while submit logic lives in the form; that is the only coupling between them, and it is intentional (a shell owning form state would force a generic schema, which the spec rejects).

The spec's unsaved-edits guard lives here rather than in each form, so the three forms don't triplicate it. Unlike `default-setting`, these forms have no view/edit toggle and therefore no Cancel button, so only `useNavigationGuard` is needed — `useDiscardConfirm` guards a Cancel action that does not exist here.

No test: the guard is `useNavigationGuard`'s own behavior (already covered where that hook is tested), and the rest is prop-driven markup. The repo tests logic, not markup (30 test files, all on schemas/registries/hooks).

- [ ] **Step 1: Write the component**

Create `routes/system-admin/interface/interface-page-layout.tsx`:

```tsx
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { SettingSectionSkeleton } from "@/components/ui/setting-section";
import { useNavigationGuard } from "@/hooks/use-navigation-guard";

/**
 * โครงหน้าที่ทุก interface form ใช้ร่วมกัน — header, ปุ่ม Save, skeleton, ErrorState
 * และ guard กันออกจากหน้าตอนแก้ค้าง
 *
 * ไม่ถือ form state เอง: form component เป็นคนถือ `useForm` แล้วส่ง `handleSubmit`
 * เข้ามาเป็น `onSave` กับส่ง `formState.isDirty` เข้ามาเป็น `isDirty` เหตุที่ไม่ให้
 * layout ถือ form state เพราะจะต้องมี generic schema ซึ่งทำให้ interface ที่หน้าตา
 * ต่างกัน (เช่นมี mapping table) ใส่เพิ่มไม่ได้
 *
 * guard อยู่ที่นี่ไม่ใช่ในแต่ละ form เพื่อไม่ให้ก๊อปโค้ดเดียวกันสามรอบ ต่างจาก
 * `default-setting` ตรงที่หน้านี้ไม่มีปุ่ม Cancel (แก้ได้ตลอด ไม่มีโหมด view/edit)
 * จึงใช้แค่ `useNavigationGuard` ไม่ต้องใช้ `useDiscardConfirm`
 *
 * @param props.onSave - handleSubmit ของ form ที่ครอบอยู่
 * @param props.isDirty - `form.formState.isDirty` ของ form ที่ครอบอยู่
 * @param props.children - field ของ form (ปกติเป็น SettingSection หลายอัน)
 * @returns React element ของโครงหน้า interface
 */
export function InterfacePageLayout({
  title,
  description,
  onSave,
  isSaving,
  isLoading,
  isError,
  isDirty,
  onRetry,
  errorMessage,
  saveLabel,
  children,
}: {
  readonly title: string;
  readonly description: string;
  readonly onSave: () => void;
  readonly isSaving: boolean;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly isDirty: boolean;
  readonly onRetry: () => void;
  readonly errorMessage: string;
  readonly saveLabel: string;
  readonly children: React.ReactNode;
}) {
  // แก้ค้างแล้วกดลิงก์/กด back → ถามก่อนทิ้ง
  // ไม่ต้องกัน `!isSaving`: ช่วงที่ save กำลังวิ่งคือช่วงที่เสี่ยงเสียงานที่สุด ต้องกันด้วย
  // และพอ save สำเร็จ form.reset ทำให้ isDirty เป็น false เองอยู่แล้ว (ตาม default-setting)
  const navGuard = useNavigationGuard(isDirty);

  return (
    <div className="mx-auto max-w-4xl p-[max(1rem,env(safe-area-inset-bottom))]">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">{description}</p>
        </div>
        {!isError && !isLoading && (
          <div className="flex shrink-0 items-center gap-2">
            <Button type="button" size="sm" onClick={onSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="size-3.5" aria-hidden="true" />
              )}
              {saveLabel}
            </Button>
          </div>
        )}
      </header>

      {isError && <ErrorState message={errorMessage} onRetry={onRetry} />}

      {!isError && isLoading && (
        <div>
          <SettingSectionSkeleton first fields={["half", "half", "half", "half"]} />
          <SettingSectionSkeleton fields={["half", "half", "full"]} />
        </div>
      )}

      {!isError && !isLoading && <form onSubmit={onSave}>{children}</form>}

      <DiscardDialog
        open={navGuard.isOpen}
        onOpenChange={(o) => {
          if (!o) navGuard.cancel();
        }}
        onConfirm={navGuard.confirm}
        onCancel={navGuard.cancel}
        variant="warning"
      />
    </div>
  );
}
```

- [ ] **Step 2: Write the field helpers**

Create `routes/system-admin/interface/interface-fields.tsx`:

```tsx
import { useId } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * ช่องกรอกข้อความของ interface form
 *
 * @param props.field - ผลของ `form.register("...")`
 * @param props.hint - ข้อความช่วยใต้ช่อง (เช่นบอกว่า api_key ที่เป็น mask ไม่ต้องพิมพ์ใหม่)
 * @returns React element ของ text field
 */
export function TextField({
  label,
  field,
  error,
  placeholder,
  type,
  hint,
  className,
}: {
  readonly label: string;
  readonly field: UseFormRegisterReturn;
  readonly error?: string;
  readonly placeholder?: string;
  readonly type?: "text" | "password";
  readonly hint?: string;
  readonly className?: string;
}) {
  const id = useId();
  return (
    <Field className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input {...field} id={id} type={type} placeholder={placeholder} />
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
      <FieldError>{error}</FieldError>
    </Field>
  );
}

/**
 * ช่องเลือกค่าจากชุดที่กำหนดไว้ (enum ของ zod schema)
 *
 * รับ label กับ value ไม่ได้รับ schema — แต่ละ form ยังประกาศ field ของตัวเองอยู่
 * ตัวนี้แค่ห่อรูปแบบ Select ที่ทั้งสาม form เขียนเหมือนกัน
 *
 * @param props.optionLabel - แปลง option เป็นข้อความที่แสดง (ปกติเป็น `t()`)
 * @returns React element ของ enum field
 */
export function EnumField<T extends string>({
  label,
  value,
  options,
  optionLabel,
  onChange,
}: {
  readonly label: string;
  readonly value: T;
  readonly options: readonly T[];
  readonly optionLabel: (option: T) => string;
  readonly onChange: (next: T) => void;
}) {
  const id = useId();
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select value={value} onValueChange={(v) => onChange(v as T)}>
        <SelectTrigger id={id} size="sm" className="w-full text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o} className="text-sm">
              {optionLabel(o)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

/**
 * สวิตช์เปิด/ปิดของ interface form — กินความกว้างเต็มแถว
 *
 * @returns React element ของ toggle field
 */
export function ToggleField({
  label,
  checked,
  onChange,
}: {
  readonly label: string;
  readonly checked: boolean;
  readonly onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 pt-1 sm:col-span-2">
      <Switch checked={checked} onCheckedChange={onChange} />
      <span className="text-sm">{label}</span>
    </label>
  );
}
```

- [ ] **Step 3: Verify both compile**

Run: `bunx tsc --noEmit && bun run lint`
Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
git add routes/system-admin/interface/interface-page-layout.tsx routes/system-admin/interface/interface-fields.tsx
git commit -m "feat(interface): add shared layout and field helpers

InterfacePageLayout carries the header, Save, skeleton, ErrorState and the
unsaved-edits navigation guard, taking an isDirty flag rather than owning form
state. TextField/EnumField/ToggleField carry the field shapes the three forms
would otherwise repeat.

Both are presentational — they take labels and values, not schemas — so each
interface keeps its own form, schema and field list."
```

---

### Task 6: Frontend — Accounting interface form

**Files:**
- Create: `routes/system-admin/interface/accounting-interface-form.tsx`
- Test: `routes/system-admin/interface/accounting-interface-form.test.ts`
- Modify: `messages/en.json`, `messages/th.json`

**Interfaces:**
- Consumes: `useInterfaceConfig` (Task 4); `InterfacePageLayout` and `TextField` / `EnumField` / `ToggleField` (Task 5)
- Produces: default export `AccountingInterfaceForm` (Task 9's registry lazy-imports it); named exports `accountingSchema`, `toFormValues`, `toApiValue`, `EMPTY_ACCOUNTING`, `type AccountingFormValues`

Field types come straight from the spec. Note `default_invoice_value` is a **free-text string** — the spec flags this as an open question (the KB never says what the value is). If the AP receiving flow turns out to treat it as a number or an enum, only this field's type and zod rule change.

- [ ] **Step 1: Write the failing test**

Create `routes/system-admin/interface/accounting-interface-form.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  accountingSchema,
  toFormValues,
  toApiValue,
  EMPTY_ACCOUNTING,
} from "./accounting-interface-form";

describe("accountingSchema", () => {
  it("accepts a fully populated value", () => {
    const parsed = accountingSchema.safeParse({
      enabled: true,
      system: "carmen_gl",
      default_account_code: "1000",
      default_department_code: "D1",
      default_invoice_value: "0",
      export_format: "csv",
      endpoint: "https://gl.example.com",
      posting_frequency: "daily",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an unknown accounting system", () => {
    const parsed = accountingSchema.safeParse({
      ...EMPTY_ACCOUNTING,
      system: "sap",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("toFormValues / toApiValue", () => {
  it("falls back to defaults when the config has never been saved", () => {
    expect(toFormValues(undefined)).toEqual(EMPTY_ACCOUNTING);
  });

  it("fills defaults for keys the stored value omits", () => {
    expect(toFormValues({ enabled: true })).toEqual({
      ...EMPTY_ACCOUNTING,
      enabled: true,
    });
  });

  it("round-trips a full value unchanged", () => {
    const values = {
      enabled: true,
      system: "blueledgers" as const,
      default_account_code: "2000",
      default_department_code: "D2",
      default_invoice_value: "100",
      export_format: "xml" as const,
      endpoint: "https://x.example.com",
      posting_frequency: "monthly" as const,
    };
    expect(toFormValues(toApiValue(values))).toEqual(values);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test:run routes/system-admin/interface/accounting-interface-form.test.ts`
Expected: FAIL — cannot resolve `./accounting-interface-form`.

- [ ] **Step 3: Write the form**

Create `routes/system-admin/interface/accounting-interface-form.tsx`:

```tsx
import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { SettingSection } from "@/components/ui/setting-section";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import { useInterfaceConfig } from "./use-interface-config";
import { InterfacePageLayout } from "./interface-page-layout";
import { TextField, EnumField, ToggleField } from "./interface-fields";

export const accountingSchema = z.object({
  enabled: z.boolean(),
  system: z.enum(["carmen_gl", "blueledgers", "external"]),
  default_account_code: z.string(),
  default_department_code: z.string(),
  /** free text — ดู "Open question" ใน spec: KB ไม่ได้ระบุว่า value นี้คืออะไร */
  default_invoice_value: z.string(),
  export_format: z.enum(["csv", "xml", "json"]),
  endpoint: z.string(),
  posting_frequency: z.enum(["manual", "daily", "monthly"]),
});

export type AccountingFormValues = z.infer<typeof accountingSchema>;

export const EMPTY_ACCOUNTING: AccountingFormValues = {
  enabled: false,
  system: "carmen_gl",
  default_account_code: "",
  default_department_code: "",
  default_invoice_value: "",
  export_format: "csv",
  endpoint: "",
  posting_frequency: "manual",
};

/** แปลงค่าจาก app_config เป็นค่า form — key ที่ขาดตกไปใช้ default */
export function toFormValues(
  value: Record<string, unknown> | undefined,
): AccountingFormValues {
  if (!value) return EMPTY_ACCOUNTING;
  const parsed = accountingSchema.safeParse({ ...EMPTY_ACCOUNTING, ...value });
  return parsed.success ? parsed.data : EMPTY_ACCOUNTING;
}

/** แปลงค่า form เป็น payload ของ app_config */
export function toApiValue(
  values: AccountingFormValues,
): Record<string, unknown> {
  return { ...values };
}

const SYSTEMS = ["carmen_gl", "blueledgers", "external"] as const;
const FORMATS = ["csv", "xml", "json"] as const;
const FREQUENCIES = ["manual", "daily", "monthly"] as const;

/**
 * หน้า config ของ Accounting Interface — ตั้งค่าการส่งข้อมูลไป GL/AP
 *
 * `default_account_code` / `default_department_code` / `default_invoice_value` เป็นค่า
 * fallback ที่ระบบใช้เมื่อ vendor ไม่ได้ตั้งค่าไว้ (ดู kb-carmen changelog sep2024)
 *
 * @returns React element ของหน้า accounting interface
 */
export default function AccountingInterfaceForm() {
  const t = useTranslations("systemAdmin.interface");
  const ta = useTranslations("systemAdmin.interface.accounting");
  const { value, isLoading, isError, refetch, save, isSaving } =
    useInterfaceConfig("interface_accounting");

  const form = useForm<AccountingFormValues>({
    resolver: zodResolver(accountingSchema) as Resolver<AccountingFormValues>,
    defaultValues: EMPTY_ACCOUNTING,
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
      title={ta("title")}
      description={ta("desc")}
      onSave={submit}
      isSaving={isSaving}
      isLoading={isLoading}
      isError={isError}
      isDirty={form.formState.isDirty}
      onRetry={refetch}
      errorMessage={t("loadError")}
      saveLabel={t("save")}
    >
      <SettingSection first title={ta("connection")} description={ta("connectionDesc")}>
        <ToggleField
          label={t("enabled")}
          checked={form.watch("enabled")}
          onChange={(v) => form.setValue("enabled", v, { shouldDirty: true })}
        />
        <EnumField
          label={ta("system")}
          value={form.watch("system")}
          options={SYSTEMS}
          optionLabel={(s) => ta(`systemOption.${s}`)}
          onChange={(v) => form.setValue("system", v, { shouldDirty: true })}
        />
        <TextField
          label={t("endpoint")}
          field={form.register("endpoint")}
          error={form.formState.errors.endpoint?.message}
          placeholder="https://gl.example.com"
        />
      </SettingSection>

      <SettingSection title={ta("defaults")} description={ta("defaultsDesc")}>
        <TextField
          label={ta("defaultAccountCode")}
          field={form.register("default_account_code")}
          error={form.formState.errors.default_account_code?.message}
          placeholder="1000"
        />
        <TextField
          label={ta("defaultDepartmentCode")}
          field={form.register("default_department_code")}
          error={form.formState.errors.default_department_code?.message}
          placeholder="D1"
        />
        <TextField
          label={ta("defaultInvoiceValue")}
          field={form.register("default_invoice_value")}
          error={form.formState.errors.default_invoice_value?.message}
          placeholder="0"
        />
      </SettingSection>

      <SettingSection title={ta("posting")} description={ta("postingDesc")}>
        <EnumField
          label={ta("exportFormat")}
          value={form.watch("export_format")}
          options={FORMATS}
          optionLabel={(f) => ta(`formatOption.${f}`)}
          onChange={(v) => form.setValue("export_format", v, { shouldDirty: true })}
        />
        <EnumField
          label={ta("postingFrequency")}
          value={form.watch("posting_frequency")}
          options={FREQUENCIES}
          optionLabel={(f) => t(`frequencyOption.${f}`)}
          onChange={(v) =>
            form.setValue("posting_frequency", v, { shouldDirty: true })
          }
        />
      </SettingSection>
    </InterfacePageLayout>
  );
}
```

- [ ] **Step 4: Add i18n keys**

In `messages/en.json`, add under `systemAdmin`:

```json
    "interface": {
      "title": "Interfaces",
      "desc": "Connections between Carmen and your accounting, POS and property systems.",
      "save": "Save",
      "saved": "Interface settings saved",
      "loadError": "Could not load interface settings",
      "enabled": "Enabled",
      "endpoint": "Endpoint",
      "apiKey": "API key",
      "apiKeyHint": "Leave untouched to keep the stored key.",
      "statusEnabled": "Enabled",
      "statusDisabled": "Disabled",
      "frequencyOption": {
        "manual": "Manual",
        "hourly": "Hourly",
        "daily": "Daily",
        "monthly": "Monthly"
      },
      "accounting": {
        "title": "Accounting Interface",
        "desc": "How inventory activity reaches your general ledger and payables.",
        "connection": "Connection",
        "connectionDesc": "Which accounting system receives the postings.",
        "system": "Accounting system",
        "systemOption": {
          "carmen_gl": "Carmen GL",
          "blueledgers": "BlueLedgers",
          "external": "External system"
        },
        "defaults": "Vendor fallbacks",
        "defaultsDesc": "Used when a vendor has no account code, department code or invoice value of its own.",
        "defaultAccountCode": "Default account code",
        "defaultDepartmentCode": "Default department code",
        "defaultInvoiceValue": "Default invoice value",
        "posting": "Posting",
        "postingDesc": "Export format and how often postings are sent.",
        "exportFormat": "Export format",
        "formatOption": { "csv": "CSV", "xml": "XML", "json": "JSON" },
        "postingFrequency": "Posting frequency"
      }
    },
```

In `messages/th.json`, add the same structure under `systemAdmin`:

```json
    "interface": {
      "title": "การเชื่อมต่อระบบภายนอก",
      "desc": "การเชื่อมต่อระหว่าง Carmen กับระบบบัญชี ระบบขายหน้าร้าน และระบบบริหารโรงแรม",
      "save": "บันทึก",
      "saved": "บันทึกการตั้งค่าการเชื่อมต่อแล้ว",
      "loadError": "โหลดการตั้งค่าการเชื่อมต่อไม่สำเร็จ",
      "enabled": "เปิดใช้งาน",
      "endpoint": "ปลายทาง",
      "apiKey": "API key",
      "apiKeyHint": "ปล่อยไว้เหมือนเดิมหากไม่ต้องการเปลี่ยน key",
      "statusEnabled": "เปิดใช้งาน",
      "statusDisabled": "ปิดใช้งาน",
      "frequencyOption": {
        "manual": "ด้วยตนเอง",
        "hourly": "ทุกชั่วโมง",
        "daily": "ทุกวัน",
        "monthly": "ทุกเดือน"
      },
      "accounting": {
        "title": "การเชื่อมต่อระบบบัญชี",
        "desc": "การส่งข้อมูลความเคลื่อนไหวของสินค้าคงคลังไปยังบัญชีแยกประเภทและเจ้าหนี้",
        "connection": "การเชื่อมต่อ",
        "connectionDesc": "ระบบบัญชีที่จะรับข้อมูล",
        "system": "ระบบบัญชี",
        "systemOption": {
          "carmen_gl": "Carmen GL",
          "blueledgers": "BlueLedgers",
          "external": "ระบบภายนอก"
        },
        "defaults": "ค่าเริ่มต้นแทนผู้ขาย",
        "defaultsDesc": "ใช้เมื่อผู้ขายไม่ได้กำหนดรหัสบัญชี รหัสแผนก หรือมูลค่าใบแจ้งหนี้ไว้เอง",
        "defaultAccountCode": "รหัสบัญชีเริ่มต้น",
        "defaultDepartmentCode": "รหัสแผนกเริ่มต้น",
        "defaultInvoiceValue": "มูลค่าใบแจ้งหนี้เริ่มต้น",
        "posting": "การส่งข้อมูล",
        "postingDesc": "รูปแบบไฟล์และความถี่ในการส่ง",
        "exportFormat": "รูปแบบไฟล์",
        "formatOption": { "csv": "CSV", "xml": "XML", "json": "JSON" },
        "postingFrequency": "ความถี่ในการส่ง"
      }
    },
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun test:run routes/system-admin/interface/accounting-interface-form.test.ts && bunx tsc --noEmit && bun run lint`
Expected: 5 tests PASS, typecheck and lint exit 0.

- [ ] **Step 6: Commit**

```bash
git add routes/system-admin/interface/accounting-interface-form.tsx routes/system-admin/interface/accounting-interface-form.test.ts messages/en.json messages/th.json
git commit -m "feat(interface): add accounting interface form

Vendor fallback codes come from the documented AP receiving behaviour
(kb-carmen changelog sep2024)."
```

---

### Task 7: Frontend — POS interface form

**Files:**
- Create: `routes/system-admin/interface/pos-interface-form.tsx`
- Test: `routes/system-admin/interface/pos-interface-form.test.ts`
- Modify: `messages/en.json`, `messages/th.json`

**Interfaces:**
- Consumes: `useInterfaceConfig` (Task 4); `InterfacePageLayout` and `TextField` / `EnumField` / `ToggleField` (Task 5)
- Produces: default export `PosInterfaceForm`; named exports `posSchema`, `toFormValues`, `toApiValue`, `EMPTY_POS`, `type PosFormValues`

`api_key` is a secret. The backend returns it masked as `***ENCRYPTED***` and Task 1 makes `upsert` restore the stored value when that mask is posted back — so the form may submit the mask unchanged and nothing is lost. Render it as `type="password"` and show `apiKeyHint`.

- [ ] **Step 1: Write the failing test**

Create `routes/system-admin/interface/pos-interface-form.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  posSchema,
  toFormValues,
  toApiValue,
  EMPTY_POS,
} from "./pos-interface-form";

describe("posSchema", () => {
  it("accepts a fully populated value", () => {
    const parsed = posSchema.safeParse({
      enabled: true,
      vendor: "micros",
      endpoint: "https://pos.example.com",
      api_key: "k",
      sync_frequency: "daily",
      default_location_code: "L1",
      consumption_posting: "recipe",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an unknown vendor", () => {
    const parsed = posSchema.safeParse({ ...EMPTY_POS, vendor: "aloha" });
    expect(parsed.success).toBe(false);
  });

  it("rejects an unknown sync frequency", () => {
    const parsed = posSchema.safeParse({
      ...EMPTY_POS,
      sync_frequency: "monthly",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("toFormValues / toApiValue", () => {
  it("falls back to defaults when the config has never been saved", () => {
    expect(toFormValues(undefined)).toEqual(EMPTY_POS);
  });

  it("keeps the masked api_key so an untouched form posts it back unchanged", () => {
    const values = toFormValues({
      enabled: true,
      vendor: "micros",
      endpoint: "e",
      api_key: "***ENCRYPTED***",
      sync_frequency: "daily",
      default_location_code: "L1",
      consumption_posting: "recipe",
    });
    expect(values.api_key).toBe("***ENCRYPTED***");
  });

  it("round-trips a full value unchanged", () => {
    const values = {
      enabled: true,
      vendor: "infrasys" as const,
      endpoint: "https://x.example.com",
      api_key: "k",
      sync_frequency: "hourly" as const,
      default_location_code: "L2",
      consumption_posting: "direct" as const,
    };
    expect(toFormValues(toApiValue(values))).toEqual(values);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test:run routes/system-admin/interface/pos-interface-form.test.ts`
Expected: FAIL — cannot resolve `./pos-interface-form`.

- [ ] **Step 3: Write the form**

Create `routes/system-admin/interface/pos-interface-form.tsx`:

```tsx
import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { SettingSection } from "@/components/ui/setting-section";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import { useInterfaceConfig } from "./use-interface-config";
import { InterfacePageLayout } from "./interface-page-layout";
import { TextField, EnumField, ToggleField } from "./interface-fields";

export const posSchema = z.object({
  enabled: z.boolean(),
  vendor: z.enum(["micros", "infrasys", "square", "other"]),
  endpoint: z.string(),
  api_key: z.string(),
  sync_frequency: z.enum(["manual", "hourly", "daily"]),
  default_location_code: z.string(),
  consumption_posting: z.enum(["recipe", "direct"]),
});

export type PosFormValues = z.infer<typeof posSchema>;

export const EMPTY_POS: PosFormValues = {
  enabled: false,
  vendor: "micros",
  endpoint: "",
  api_key: "",
  sync_frequency: "manual",
  default_location_code: "",
  consumption_posting: "recipe",
};

/**
 * แปลงค่าจาก app_config เป็นค่า form
 *
 * `api_key` ที่ backend ส่งมาเป็น mask (`***ENCRYPTED***`) ถูกเก็บไว้ตามเดิม — ถ้า user
 * ไม่แตะ ค่านี้จะถูกส่งกลับขึ้นไปแล้ว backend คืนค่าลับเดิมให้ (ดู `retainMaskedSecrets`)
 */
export function toFormValues(
  value: Record<string, unknown> | undefined,
): PosFormValues {
  if (!value) return EMPTY_POS;
  const parsed = posSchema.safeParse({ ...EMPTY_POS, ...value });
  return parsed.success ? parsed.data : EMPTY_POS;
}

/** แปลงค่า form เป็น payload ของ app_config */
export function toApiValue(values: PosFormValues): Record<string, unknown> {
  return { ...values };
}

const VENDORS = ["micros", "infrasys", "square", "other"] as const;
const FREQUENCIES = ["manual", "hourly", "daily"] as const;
const POSTINGS = ["recipe", "direct"] as const;

/**
 * หน้า config ของ POS Interface — ตั้งค่าการดึงยอดขาย/การใช้วัตถุดิบจากระบบขายหน้าร้าน
 *
 * @returns React element ของหน้า POS interface
 */
export default function PosInterfaceForm() {
  const t = useTranslations("systemAdmin.interface");
  const tp = useTranslations("systemAdmin.interface.pos");
  const { value, isLoading, isError, refetch, save, isSaving } =
    useInterfaceConfig("interface_pos");

  const form = useForm<PosFormValues>({
    resolver: zodResolver(posSchema) as Resolver<PosFormValues>,
    defaultValues: EMPTY_POS,
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
      title={tp("title")}
      description={tp("desc")}
      onSave={submit}
      isSaving={isSaving}
      isLoading={isLoading}
      isError={isError}
      isDirty={form.formState.isDirty}
      onRetry={refetch}
      errorMessage={t("loadError")}
      saveLabel={t("save")}
    >
      <SettingSection first title={tp("connection")} description={tp("connectionDesc")}>
        <ToggleField
          label={t("enabled")}
          checked={form.watch("enabled")}
          onChange={(v) => form.setValue("enabled", v, { shouldDirty: true })}
        />
        <EnumField
          label={tp("vendor")}
          value={form.watch("vendor")}
          options={VENDORS}
          optionLabel={(v) => tp(`vendorOption.${v}`)}
          onChange={(v) => form.setValue("vendor", v, { shouldDirty: true })}
        />
        <TextField
          label={t("endpoint")}
          field={form.register("endpoint")}
          error={form.formState.errors.endpoint?.message}
          placeholder="https://pos.example.com"
        />
        <TextField
          label={t("apiKey")}
          field={form.register("api_key")}
          error={form.formState.errors.api_key?.message}
          type="password"
          hint={t("apiKeyHint")}
          className="sm:col-span-2"
        />
      </SettingSection>

      <SettingSection title={tp("sync")} description={tp("syncDesc")}>
        <EnumField
          label={tp("syncFrequency")}
          value={form.watch("sync_frequency")}
          options={FREQUENCIES}
          optionLabel={(f) => t(`frequencyOption.${f}`)}
          onChange={(v) => form.setValue("sync_frequency", v, { shouldDirty: true })}
        />
        <TextField
          label={tp("defaultLocationCode")}
          field={form.register("default_location_code")}
          error={form.formState.errors.default_location_code?.message}
          placeholder="L1"
        />
        <EnumField
          label={tp("consumptionPosting")}
          value={form.watch("consumption_posting")}
          options={POSTINGS}
          optionLabel={(p) => tp(`postingOption.${p}`)}
          onChange={(v) =>
            form.setValue("consumption_posting", v, { shouldDirty: true })
          }
        />
      </SettingSection>
    </InterfacePageLayout>
  );
}
```

- [ ] **Step 4: Add i18n keys**

In `messages/en.json`, add inside `systemAdmin.interface` (sibling of `accounting`):

```json
      "pos": {
        "title": "POS Interface",
        "desc": "How sales and consumption from your point-of-sale system reach inventory.",
        "connection": "Connection",
        "connectionDesc": "Which POS system Carmen reads from.",
        "vendor": "POS vendor",
        "vendorOption": {
          "micros": "Oracle Micros",
          "infrasys": "Infrasys",
          "square": "Square",
          "other": "Other"
        },
        "sync": "Sync",
        "syncDesc": "How often sales are pulled and how they reduce stock.",
        "syncFrequency": "Sync frequency",
        "defaultLocationCode": "Default location code",
        "consumptionPosting": "Consumption posting",
        "postingOption": {
          "recipe": "By recipe",
          "direct": "Direct to item"
        }
      },
```

In `messages/th.json`, add inside `systemAdmin.interface`:

```json
      "pos": {
        "title": "การเชื่อมต่อระบบขายหน้าร้าน",
        "desc": "การนำยอดขายและการใช้วัตถุดิบจากระบบขายหน้าร้านเข้าสู่สินค้าคงคลัง",
        "connection": "การเชื่อมต่อ",
        "connectionDesc": "ระบบขายหน้าร้านที่ Carmen จะดึงข้อมูลมา",
        "vendor": "ผู้ให้บริการระบบขายหน้าร้าน",
        "vendorOption": {
          "micros": "Oracle Micros",
          "infrasys": "Infrasys",
          "square": "Square",
          "other": "อื่นๆ"
        },
        "sync": "การดึงข้อมูล",
        "syncDesc": "ความถี่ในการดึงยอดขาย และวิธีตัดสต๊อก",
        "syncFrequency": "ความถี่ในการดึงข้อมูล",
        "defaultLocationCode": "รหัสสถานที่เริ่มต้น",
        "consumptionPosting": "วิธีตัดวัตถุดิบ",
        "postingOption": {
          "recipe": "ตามสูตรอาหาร",
          "direct": "ตัดจากสินค้าโดยตรง"
        }
      },
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun test:run routes/system-admin/interface/pos-interface-form.test.ts && bunx tsc --noEmit && bun run lint`
Expected: 6 tests PASS, typecheck and lint exit 0.

- [ ] **Step 6: Commit**

```bash
git add routes/system-admin/interface/pos-interface-form.tsx routes/system-admin/interface/pos-interface-form.test.ts messages/en.json messages/th.json
git commit -m "feat(interface): add POS interface form

api_key renders as a password field and posts the mask back untouched; the
backend restores the stored secret."
```

---

### Task 8: Frontend — PMS interface form

**Files:**
- Create: `routes/system-admin/interface/pms-interface-form.tsx`
- Test: `routes/system-admin/interface/pms-interface-form.test.ts`
- Modify: `messages/en.json`, `messages/th.json`

**Interfaces:**
- Consumes: `useInterfaceConfig` (Task 4); `InterfacePageLayout` and `TextField` / `EnumField` / `ToggleField` (Task 5)
- Produces: default export `PmsInterfaceForm`; named exports `pmsSchema`, `toFormValues`, `toApiValue`, `EMPTY_PMS`, `type PmsFormValues`

`post_city_ledger` and `post_credit_card` come from the documented PMS posting behaviour (`kb-carmen/contents/carmen/ar/AR-posting_pms.md`: "post ข้อมูล City Ledger และ Credit Card จากระบบ PMS แบบ API"). This is the interface the user called "HMS".

- [ ] **Step 1: Write the failing test**

Create `routes/system-admin/interface/pms-interface-form.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  pmsSchema,
  toFormValues,
  toApiValue,
  EMPTY_PMS,
} from "./pms-interface-form";

describe("pmsSchema", () => {
  it("accepts a fully populated value", () => {
    const parsed = pmsSchema.safeParse({
      enabled: true,
      vendor: "opera",
      endpoint: "https://pms.example.com",
      api_key: "k",
      property_code: "P1",
      post_city_ledger: true,
      post_credit_card: false,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an unknown vendor", () => {
    const parsed = pmsSchema.safeParse({ ...EMPTY_PMS, vendor: "fidelio" });
    expect(parsed.success).toBe(false);
  });
});

describe("toFormValues / toApiValue", () => {
  it("falls back to defaults when the config has never been saved", () => {
    expect(toFormValues(undefined)).toEqual(EMPTY_PMS);
  });

  it("defaults both posting toggles off for a bare stored value", () => {
    const values = toFormValues({ enabled: true });
    expect(values.post_city_ledger).toBe(false);
    expect(values.post_credit_card).toBe(false);
  });

  it("round-trips a full value unchanged", () => {
    const values = {
      enabled: true,
      vendor: "protel" as const,
      endpoint: "https://x.example.com",
      api_key: "k",
      property_code: "P9",
      post_city_ledger: true,
      post_credit_card: true,
    };
    expect(toFormValues(toApiValue(values))).toEqual(values);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test:run routes/system-admin/interface/pms-interface-form.test.ts`
Expected: FAIL — cannot resolve `./pms-interface-form`.

- [ ] **Step 3: Write the form**

Create `routes/system-admin/interface/pms-interface-form.tsx`:

```tsx
import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { SettingSection } from "@/components/ui/setting-section";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import { useInterfaceConfig } from "./use-interface-config";
import { InterfacePageLayout } from "./interface-page-layout";
import { TextField, EnumField, ToggleField } from "./interface-fields";

export const pmsSchema = z.object({
  enabled: z.boolean(),
  vendor: z.enum(["opera", "protel", "other"]),
  endpoint: z.string(),
  api_key: z.string(),
  property_code: z.string(),
  post_city_ledger: z.boolean(),
  post_credit_card: z.boolean(),
});

export type PmsFormValues = z.infer<typeof pmsSchema>;

export const EMPTY_PMS: PmsFormValues = {
  enabled: false,
  vendor: "opera",
  endpoint: "",
  api_key: "",
  property_code: "",
  post_city_ledger: false,
  post_credit_card: false,
};

/** แปลงค่าจาก app_config เป็นค่า form — `api_key` ที่เป็น mask ถูกเก็บไว้ตามเดิม */
export function toFormValues(
  value: Record<string, unknown> | undefined,
): PmsFormValues {
  if (!value) return EMPTY_PMS;
  const parsed = pmsSchema.safeParse({ ...EMPTY_PMS, ...value });
  return parsed.success ? parsed.data : EMPTY_PMS;
}

/** แปลงค่า form เป็น payload ของ app_config */
export function toApiValue(values: PmsFormValues): Record<string, unknown> {
  return { ...values };
}

const VENDORS = ["opera", "protel", "other"] as const;

/**
 * หน้า config ของ PMS Interface — ตั้งค่าการ post City Ledger / Credit Card จากระบบ PMS
 *
 * City Ledger และ Credit Card เป็นสองอย่างที่ Carmen ดึงจาก PMS ผ่าน API
 * (ดู kb-carmen AR-posting_pms.md)
 *
 * @returns React element ของหน้า PMS interface
 */
export default function PmsInterfaceForm() {
  const t = useTranslations("systemAdmin.interface");
  const tp = useTranslations("systemAdmin.interface.pms");
  const { value, isLoading, isError, refetch, save, isSaving } =
    useInterfaceConfig("interface_pms");

  const form = useForm<PmsFormValues>({
    resolver: zodResolver(pmsSchema) as Resolver<PmsFormValues>,
    defaultValues: EMPTY_PMS,
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
      title={tp("title")}
      description={tp("desc")}
      onSave={submit}
      isSaving={isSaving}
      isLoading={isLoading}
      isError={isError}
      isDirty={form.formState.isDirty}
      onRetry={refetch}
      errorMessage={t("loadError")}
      saveLabel={t("save")}
    >
      <SettingSection first title={tp("connection")} description={tp("connectionDesc")}>
        <ToggleField
          label={t("enabled")}
          checked={form.watch("enabled")}
          onChange={(v) => form.setValue("enabled", v, { shouldDirty: true })}
        />
        <EnumField
          label={tp("vendor")}
          value={form.watch("vendor")}
          options={VENDORS}
          optionLabel={(v) => tp(`vendorOption.${v}`)}
          onChange={(v) => form.setValue("vendor", v, { shouldDirty: true })}
        />
        <TextField
          label={tp("propertyCode")}
          field={form.register("property_code")}
          error={form.formState.errors.property_code?.message}
          placeholder="P1"
        />
        <TextField
          label={t("endpoint")}
          field={form.register("endpoint")}
          error={form.formState.errors.endpoint?.message}
          placeholder="https://pms.example.com"
        />
        <TextField
          label={t("apiKey")}
          field={form.register("api_key")}
          error={form.formState.errors.api_key?.message}
          type="password"
          hint={t("apiKeyHint")}
        />
      </SettingSection>

      <SettingSection title={tp("posting")} description={tp("postingDesc")}>
        <ToggleField
          label={tp("postCityLedger")}
          checked={form.watch("post_city_ledger")}
          onChange={(v) =>
            form.setValue("post_city_ledger", v, { shouldDirty: true })
          }
        />
        <ToggleField
          label={tp("postCreditCard")}
          checked={form.watch("post_credit_card")}
          onChange={(v) =>
            form.setValue("post_credit_card", v, { shouldDirty: true })
          }
        />
      </SettingSection>
    </InterfacePageLayout>
  );
}
```

- [ ] **Step 4: Add i18n keys**

In `messages/en.json`, add inside `systemAdmin.interface` (sibling of `pos`):

```json
      "pms": {
        "title": "PMS Interface",
        "desc": "How city ledger and credit card postings reach receivables from your property system.",
        "connection": "Connection",
        "connectionDesc": "Which property management system Carmen reads from.",
        "vendor": "PMS vendor",
        "vendorOption": {
          "opera": "Oracle Opera",
          "protel": "Protel",
          "other": "Other"
        },
        "propertyCode": "Property code",
        "posting": "Posting",
        "postingDesc": "Which postings Carmen pulls from the PMS.",
        "postCityLedger": "Post city ledger",
        "postCreditCard": "Post credit card"
      }
```

In `messages/th.json`, add inside `systemAdmin.interface`:

```json
      "pms": {
        "title": "การเชื่อมต่อระบบบริหารโรงแรม",
        "desc": "การนำรายการ City Ledger และบัตรเครดิตจากระบบบริหารโรงแรมเข้าสู่ลูกหนี้",
        "connection": "การเชื่อมต่อ",
        "connectionDesc": "ระบบบริหารโรงแรมที่ Carmen จะดึงข้อมูลมา",
        "vendor": "ผู้ให้บริการระบบบริหารโรงแรม",
        "vendorOption": {
          "opera": "Oracle Opera",
          "protel": "Protel",
          "other": "อื่นๆ"
        },
        "propertyCode": "รหัสโรงแรม",
        "posting": "การดึงรายการ",
        "postingDesc": "รายการที่ Carmen จะดึงจากระบบบริหารโรงแรม",
        "postCityLedger": "ดึงรายการ City Ledger",
        "postCreditCard": "ดึงรายการบัตรเครดิต"
      }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun test:run routes/system-admin/interface/pms-interface-form.test.ts && bunx tsc --noEmit && bun run lint`
Expected: 5 tests PASS, typecheck and lint exit 0.

- [ ] **Step 6: Commit**

```bash
git add routes/system-admin/interface/pms-interface-form.tsx routes/system-admin/interface/pms-interface-form.test.ts messages/en.json messages/th.json
git commit -m "feat(interface): add PMS interface form

City ledger and credit card toggles follow the documented PMS posting
behaviour (kb-carmen AR-posting_pms.md)."
```

---

### Task 9: Frontend — interface registry

**Files:**
- Create: `routes/system-admin/interface/interface-registry.ts`
- Test: `routes/system-admin/interface/interface-registry.test.ts`

**Interfaces:**
- Consumes: the three form modules from Tasks 6–8 (each has a default export); `LucideIcon` type from `routes/system-admin/landing-types.ts`
- Produces:
  ```ts
  export type InterfaceDef = {
    readonly key: string;
    readonly configKey: string;
    readonly icon: LucideIcon;
    readonly form: LazyExoticComponent<ComponentType>;
  };
  export const INTERFACES: readonly InterfaceDef[];
  export function findInterface(key: string | undefined): InterfaceDef | undefined;
  ```
  Tasks 10 and 11 consume both.

The registry carries **list metadata only** — no field definitions, no schemas. Adding a fourth interface means one entry here plus one form file, and that form is free to look nothing like these three (e.g. a mapping table).

- [ ] **Step 1: Write the failing test**

Create `routes/system-admin/interface/interface-registry.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { INTERFACES, findInterface } from "./interface-registry";

describe("interface registry", () => {
  it("registers the three v1 interfaces", () => {
    expect(INTERFACES.map((d) => d.key)).toEqual(["accounting", "pos", "pms"]);
  });

  it("has no duplicate route keys", () => {
    expect(new Set(INTERFACES.map((d) => d.key)).size).toBe(INTERFACES.length);
  });

  it("has no duplicate config keys", () => {
    expect(new Set(INTERFACES.map((d) => d.configKey)).size).toBe(
      INTERFACES.length,
    );
  });

  it("namespaces every config key under interface_", () => {
    for (const def of INTERFACES) {
      expect(def.configKey).toBe(`interface_${def.key}`);
    }
  });

  it("gives every interface an icon and a form", () => {
    for (const def of INTERFACES) {
      expect(def.icon).toBeDefined();
      expect(def.form).toBeDefined();
    }
  });
});

describe("findInterface", () => {
  it("resolves a known key", () => {
    expect(findInterface("pos")?.configKey).toBe("interface_pos");
  });

  it("returns undefined for an unknown key", () => {
    expect(findInterface("hms")).toBeUndefined();
  });

  it("returns undefined when the key is missing", () => {
    expect(findInterface(undefined)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test:run routes/system-admin/interface/interface-registry.test.ts`
Expected: FAIL — cannot resolve `./interface-registry`.

- [ ] **Step 3: Write the registry**

Create `routes/system-admin/interface/interface-registry.ts`:

```ts
import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import { BookOpen, Hotel, ShoppingCart } from "lucide-react";
import type { LucideIcon } from "../landing-types";

export type InterfaceDef = {
  /** route param — `/system-admin/interface/:key` */
  readonly key: string;
  /** key ของ row ใน app_config */
  readonly configKey: string;
  readonly icon: LucideIcon;
  readonly form: LazyExoticComponent<ComponentType>;
};

/**
 * รายการ interface ทั้งหมด — เก็บแค่ metadata ของ list ไม่เก็บ field/schema
 *
 * แต่ละ interface ถือ form + schema ของตัวเอง เพราะหน้าตาต่างกันจริง และตัวที่จะเพิ่ม
 * ทีหลังอาจต้องการ UI ที่ต่างออกไปมาก (เช่น mapping table) — ดู
 * docs/superpowers/specs/2026-07-16-interfaces-config-design.md
 *
 * เพิ่ม interface ใหม่ = เพิ่ม entry ที่นี่ + สร้างไฟล์ form หนึ่งไฟล์
 * ถ้า interface นั้นมีค่าลับ ต้องเพิ่ม path ใน `secretPathsByKey` ฝั่ง backend ด้วย
 */
export const INTERFACES: readonly InterfaceDef[] = [
  {
    key: "accounting",
    configKey: "interface_accounting",
    icon: BookOpen,
    form: lazy(() => import("./accounting-interface-form")),
  },
  {
    key: "pos",
    configKey: "interface_pos",
    icon: ShoppingCart,
    form: lazy(() => import("./pos-interface-form")),
  },
  {
    key: "pms",
    configKey: "interface_pms",
    icon: Hotel,
    form: lazy(() => import("./pms-interface-form")),
  },
];

/**
 * หา interface จาก route param
 *
 * @param key - ค่าจาก `useParams().key`
 * @returns InterfaceDef หรือ undefined ถ้าไม่รู้จัก (caller ควรโชว์ NotFound)
 */
export function findInterface(key: string | undefined): InterfaceDef | undefined {
  return INTERFACES.find((def) => def.key === key);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test:run routes/system-admin/interface/interface-registry.test.ts && bunx tsc --noEmit`
Expected: 8 tests PASS, typecheck exit 0.

- [ ] **Step 5: Commit**

```bash
git add routes/system-admin/interface/interface-registry.ts routes/system-admin/interface/interface-registry.test.ts
git commit -m "feat(interface): add interface registry

List metadata only — each interface owns its form and schema, so a future
interface with a different shape needs no rewrite here."
```

---

### Task 10: Frontend — detail route + router registration

**Files:**
- Create: `routes/system-admin/interface/interface-detail.route.tsx`
- Modify: `routes/router.tsx:206` (add both routes after the `default-setting` entry)

**Interfaces:**
- Consumes: `findInterface` (Task 9); `NotFoundComponent` (`@/components/not-found-component`)
- Produces: the route `/system-admin/interface/:key`. The list route registered here points at `./system-admin/interface/interface.route`, created in Task 11 — so register both now and finish the list next.

- [ ] **Step 1: Write the detail route**

Create `routes/system-admin/interface/interface-detail.route.tsx`:

```tsx
import { Suspense } from "react";
import { useParams } from "react-router";
import { NotFoundComponent } from "@/components/not-found-component";
import { SettingSectionSkeleton } from "@/components/ui/setting-section";
import { findInterface } from "./interface-registry";

/**
 * หน้า config ของ interface ตัวเดียว — resolve `:key` จาก registry แล้ว render form
 *
 * key ที่ไม่รู้จักถือเป็น 404 (ไม่ใช่ error) เพราะเป็น URL ที่พิมพ์มั่วหรือ bookmark เก่า
 *
 * @returns React element ของหน้า interface detail
 */
export function Component() {
  const { key } = useParams<{ key: string }>();
  const def = findInterface(key);

  if (!def) return <NotFoundComponent />;

  const Form = def.form;
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl p-[max(1rem,env(safe-area-inset-bottom))]">
          <SettingSectionSkeleton first fields={["half", "half", "half", "half"]} />
        </div>
      }
    >
      <Form />
    </Suspense>
  );
}
```

- [ ] **Step 2: Register both routes**

In `routes/router.tsx`, immediately after the `default-setting` line (line 206), add:

```tsx
              { path: "interface", lazy: () => import("./system-admin/interface/interface.route") },
              { path: "interface/:key", lazy: () => import("./system-admin/interface/interface-detail.route") },
```

Both sit under the `system-admin` section parent, which already carries `RouteErrorBoundaryAdapter` — no new error boundary is needed.

- [ ] **Step 3: Verify the detail route compiles**

Run: `bunx tsc --noEmit`
Expected: **one** error — `Cannot find module './system-admin/interface/interface.route'`. That module is Task 11. Every other file must be clean. If any other error appears, fix it before continuing.

- [ ] **Step 4: Commit**

```bash
git add routes/system-admin/interface/interface-detail.route.tsx routes/router.tsx
git commit -m "feat(interface): add interface detail route

Unknown :key renders NotFound rather than throwing to the error boundary."
```

Note: this commit does not typecheck on its own — Task 11 adds the missing list route. Run the two tasks back to back.

---

### Task 11: Frontend — list page + route

**Files:**
- Create: `routes/system-admin/interface/interface-list.tsx`, `routes/system-admin/interface/interface.route.tsx`
- Test: `routes/system-admin/interface/interface-list.test.tsx`

**Interfaces:**
- Consumes: `useAppConfigs` (Task 3), `INTERFACES` (Task 9)
- Produces: `export function interfaceStatuses(defs, configs)` — a pure helper the test drives directly; and the `/system-admin/interface` route.

Extracting `interfaceStatuses` keeps the badge logic testable without rendering. The repo's tests target logic, not markup.

- [ ] **Step 1: Write the failing test**

Create `routes/system-admin/interface/interface-list.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { interfaceStatuses } from "./interface-list";
import { INTERFACES } from "./interface-registry";
import type { AppConfig } from "@/types/app-config";

function config(key: string, value: Record<string, unknown>): AppConfig {
  return {
    id: key,
    key,
    value,
    created_at: null,
    created_by_id: null,
    updated_at: null,
    updated_by_id: null,
  };
}

describe("interfaceStatuses", () => {
  it("marks an interface enabled when its config says so", () => {
    const rows = interfaceStatuses(INTERFACES, [
      config("interface_pos", { enabled: true }),
    ]);
    expect(rows.find((r) => r.def.key === "pos")?.enabled).toBe(true);
  });

  it("marks an interface disabled when it has no config row", () => {
    const rows = interfaceStatuses(INTERFACES, []);
    expect(rows.every((r) => r.enabled === false)).toBe(true);
  });

  it("marks an interface disabled when enabled is false", () => {
    const rows = interfaceStatuses(INTERFACES, [
      config("interface_pms", { enabled: false }),
    ]);
    expect(rows.find((r) => r.def.key === "pms")?.enabled).toBe(false);
  });

  it("treats a non-boolean enabled as disabled", () => {
    const rows = interfaceStatuses(INTERFACES, [
      config("interface_pos", { enabled: "yes" }),
    ]);
    expect(rows.find((r) => r.def.key === "pos")?.enabled).toBe(false);
  });

  it("ignores app configs that are not interfaces", () => {
    const rows = interfaceStatuses(INTERFACES, [
      config("report_email", { enabled: true }),
    ]);
    expect(rows).toHaveLength(INTERFACES.length);
    expect(rows.every((r) => r.enabled === false)).toBe(true);
  });

  it("returns one row per registered interface, in registry order", () => {
    const rows = interfaceStatuses(INTERFACES, []);
    expect(rows.map((r) => r.def.key)).toEqual(["accounting", "pos", "pms"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test:run routes/system-admin/interface/interface-list.test.tsx`
Expected: FAIL — cannot resolve `./interface-list`.

- [ ] **Step 3: Write the list component**

Create `routes/system-admin/interface/interface-list.tsx`:

```tsx
import { Link } from "react-router";
import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { useAppConfigs } from "@/hooks/use-app-config";
import type { AppConfig } from "@/types/app-config";
import { INTERFACES, type InterfaceDef } from "./interface-registry";

export type InterfaceStatus = {
  readonly def: InterfaceDef;
  readonly enabled: boolean;
};

/**
 * จับคู่ interface ใน registry กับ config ที่มีอยู่ เพื่อหาสถานะ enabled
 *
 * interface ที่ยังไม่มี row ใน app_config ถือว่า disabled — เป็นสถานะปกติของ interface
 * ที่ยังไม่เคยตั้งค่า ไม่ใช่ error
 *
 * @param defs - รายการ interface จาก registry
 * @param configs - app config ทั้งหมดของ BU ปัจจุบัน (มี key อื่นปนมาด้วย)
 * @returns หนึ่งแถวต่อหนึ่ง interface เรียงตาม registry
 */
export function interfaceStatuses(
  defs: readonly InterfaceDef[],
  configs: readonly AppConfig[],
): readonly InterfaceStatus[] {
  const byKey = new Map(configs.map((c) => [c.key, c]));
  return defs.map((def) => ({
    def,
    enabled: byKey.get(def.configKey)?.value?.enabled === true,
  }));
}

/**
 * หน้า list ของ interface ทั้งหมด — การ์ดต่อ interface พร้อม badge สถานะ
 *
 * @returns React element ของหน้า interface list
 */
export default function InterfaceList() {
  const t = useTranslations("systemAdmin.interface");
  const { data, isLoading, isError, refetch } = useAppConfigs();

  const rows = interfaceStatuses(INTERFACES, data ?? []);

  return (
    <div className="mx-auto max-w-4xl p-[max(1rem,env(safe-area-inset-bottom))]">
      <header className="mb-6">
        <h1 className="text-lg font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">{t("desc")}</p>
      </header>

      {isError && <ErrorState message={t("loadError")} onRetry={() => refetch()} />}

      {!isError && isLoading && (
        <div className="grid gap-3 sm:grid-cols-2">
          {INTERFACES.map((def) => (
            <Skeleton key={def.key} className="h-24 w-full" />
          ))}
        </div>
      )}

      {!isError && !isLoading && (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map(({ def, enabled }) => {
            const Icon = def.icon;
            return (
              <Link
                key={def.key}
                to={`/system-admin/interface/${def.key}`}
                className="hover:border-primary/50 focus-visible:ring-ring flex flex-col gap-2 rounded-lg border p-4 transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <div className="flex items-start justify-between gap-2">
                  <Icon className="text-muted-foreground size-5" aria-hidden="true" />
                  <Badge variant={enabled ? "default" : "secondary"}>
                    {enabled ? t("statusEnabled") : t("statusDisabled")}
                  </Badge>
                </div>
                <div>
                  <h2 className="text-sm font-medium">{t(`${def.key}.title`)}</h2>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {t(`${def.key}.desc`)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Write the route entry**

Create `routes/system-admin/interface/interface.route.tsx`:

```tsx
import InterfaceList from "./interface-list";

export function Component() {
  return <InterfaceList />;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun test:run routes/system-admin/interface/ && bunx tsc --noEmit && bun run lint`
Expected: all interface tests PASS (registry 8, hook 3, list 6, three form suites), typecheck now clean (Task 10's missing module is resolved), lint exit 0.

- [ ] **Step 6: Commit**

```bash
git add routes/system-admin/interface/interface-list.tsx routes/system-admin/interface/interface-list.test.tsx routes/system-admin/interface/interface.route.tsx
git commit -m "feat(interface): add interface list page

Badge state is derived by a pure interfaceStatuses helper so it can be tested
without rendering. A missing config row reads as disabled, not an error."
```

---

### Task 12: Frontend — system-admin landing entry

**Files:**
- Modify: `routes/system-admin/landing-types.ts` (`VisualKey` union ~line 22-32, `CHAPTERS` chapter `config` ~line 110-132)
- Modify: `routes/system-admin/landing-visuals.tsx` (`ModuleVisual` switch ~line 16-40, plus a new viz component)
- Modify: `messages/en.json`, `messages/th.json` (`systemAdmin.landing.modules.interface`)

**Interfaces:**
- Consumes: `INTERFACES` is *not* used here — the landing links to the list page, not to each interface.
- Produces: the Interfaces card on `/system-admin`, in the `config` chapter beside Email Config.

- [ ] **Step 1: Add the visual key and module entry**

In `routes/system-admin/landing-types.ts`, add `"interface"` to the `VisualKey` union:

```ts
export type VisualKey =
  | "roles"
  | "assign"
  | "period"
  | "workflows"
  | "docs"
  | "userActivity"
  | "monitor"
  | "email"
  | "interface"
  | "notify"
  | "code"
  | "query"
  | "dataset";
```

Add `Cable` to the `lucide-react` import list at the top of the file (keep the list alphabetical — it goes after `BellRing`):

```ts
import {
  Activity,
  BellRing,
  Cable,
  Calendar,
  Database,
  Folder,
  Gauge,
  Mail,
  Shield,
  Terminal,
  Users,
  Workflow,
} from "lucide-react";
```

In `CHAPTERS`, inside the chapter with `key: "config"`, add this module immediately after the `email` entry:

```ts
      {
        key: "interface",
        visualKey: "interface",
        href: "/system-admin/interface",
        icon: Cable,
      },
```

- [ ] **Step 2: Add the visual**

In `routes/system-admin/landing-visuals.tsx`, add a case to the `ModuleVisual` switch, after `case "email":`:

```tsx
    case "interface":
      return <InterfaceViz />;
```

Add the component beside the other viz components (place it after `EmailViz`):

```tsx
/** ภาพจำลอง: สามระบบภายนอกต่อเข้าหากล่องกลาง */
function InterfaceViz() {
  return (
    <div className={VIZ_WRAP}>
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full"
            style={{ background: ACCENT, opacity: 0.3 + i * 0.25 }}
          />
        ))}
      </div>
      <div
        className="mt-1.5 h-5 w-10 rounded"
        style={{ background: ACCENT, opacity: 0.75 }}
      />
    </div>
  );
}
```

- [ ] **Step 3: Add landing i18n**

In `messages/en.json`, inside `systemAdmin.landing.modules`, add after `email`:

```json
      "interface": {
        "name": "Interfaces",
        "one": "Accounting, POS and PMS connections.",
        "long": "Point Carmen at the systems around it — the ledger that receives your postings, the tills that report what was sold, the property system that owns the folios. Set the codes each one expects and the cadence they run at.",
        "stat": "3 interfaces",
        "meta": "Accounting · POS · PMS"
      },
```

In `messages/th.json`, inside `systemAdmin.landing.modules`, add after `email`:

```json
      "interface": {
        "name": "การเชื่อมต่อระบบภายนอก",
        "one": "การเชื่อมต่อระบบบัญชี ระบบขายหน้าร้าน และระบบบริหารโรงแรม",
        "long": "กำหนดว่า Carmen จะคุยกับระบบรอบตัวอย่างไร — บัญชีแยกประเภทที่รับข้อมูลการลงบัญชี ระบบขายหน้าร้านที่รายงานยอดขาย และระบบบริหารโรงแรมที่ถือข้อมูลใบแจ้งหนี้ ตั้งรหัสที่แต่ละระบบต้องใช้และความถี่ในการส่งข้อมูล",
        "stat": "3 การเชื่อมต่อ",
        "meta": "บัญชี · ขายหน้าร้าน · บริหารโรงแรม"
      },
```

- [ ] **Step 4: Verify the full suite**

Run: `bun test:run && bunx tsc --noEmit && bun run lint`
Expected: the whole suite PASS (existing tests plus the new interface tests), typecheck and lint exit 0.

- [ ] **Step 5: Verify in the browser**

Run: `VITE_DEV_PROXY_TARGET=http://localhost:4000 bun dev`

Log in (`admin@zebra.com` / `12345678` against the local gateway), then check:
- `/system-admin` shows the Interfaces card in the "Wiring it together" chapter
- clicking it lands on `/system-admin/interface` with three cards, all badged Disabled
- opening POS, enabling it, entering an API key, and saving shows the success toast
- returning to the list shows POS badged Enabled without a manual refresh
- reopening POS shows the API key field filled with the mask, not the raw key
- saving again **without** retyping the key keeps it working (this is the sentinel from Task 1)
- editing a field and then clicking back to the list prompts before discarding
- `/system-admin/interface/hms` renders the not-found page
- the browser console is free of errors

- [ ] **Step 6: Commit**

```bash
git add routes/system-admin/landing-types.ts routes/system-admin/landing-visuals.tsx messages/en.json messages/th.json
git commit -m "feat(interface): surface Interfaces on the system-admin landing

Sits in the config chapter beside Email Config and links to the list page."
```

---

## Definition of Done

From the spec, all must hold:

- `bunx tsc --noEmit && bun test:run` clean in this repo
- `bun run test && bun run check-types` clean in `carmen-turborepo-backend-v2/apps/micro-business`
- all three interfaces reachable from the system-admin landing `config` chapter
- saving an interface updates the list badge without a manual refresh
- `api_key` never leaves the backend unmasked, and is never stored in plaintext

## Out of scope — recorded as follow-ups in the spec

- **Optimistic locking on app_config.** No `doc_version` in the contract; concurrent admin edits are last-write-wins. Fixing it touches every app_config consumer.
- **Role guard on app-config endpoints.** `@UseGuards(KeycloakGuard)` only, so any authenticated user in the business unit can GET app-config. Tasks 1–2 close the main exposure by encrypting and masking `api_key`; a role guard affects every key on that endpoint and is separate work.
- **Mapping tables.** v1 is scalar fields only.
- **`default_invoice_value` semantics.** Implemented as free text; the spec records the open question.
