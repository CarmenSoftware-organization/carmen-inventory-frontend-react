# Lookup API เฟส 2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ให้ backend lookup คืนฟิลด์เพิ่ม/รับ filter ราย resource แล้วย้าย lookup ฝั่ง FE ที่เหลือ 9 ตัวไปใช้ `GET /api/:bu_code/lookup/:resource`

**Architecture:** registry ของ micro-business ประกาศ `extra` (ฟิลด์ที่คืนแบนข้าง 5 ฟิลด์หลัก) และ `filters` (ชื่อ filter → คอลัมน์ + ชุดค่าที่ยอมรับ) ราย resource; query builder อ่านสองอย่างนี้; gateway whitelist filter ตาม `filters` ใน catalog; jest test หนึ่งตัวกันสองฝั่งหลุดซิงก์ FE ทำ `useLookupResource` ให้เป็น generic + รับ `serverFilter` + ตรวจว่า backend ส่ง extra มาครบ แล้วย้าย component ทีละกลุ่ม

**Tech Stack:** NestJS + Prisma (backend-v2 monorepo, jest/ts-jest) · Vite + React 19 + TanStack Query v5 (FE)

**Spec:** `docs/superpowers/specs/2026-10-07-lookup-api-phase2-design.md` (FE repo) · เฟส 1: `docs/superpowers/plans/2026-10-07-lookup-endpoint-migration.md`

**Repos / branches**
- BE: `/Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2` → branch ใหม่ `feature/lookup-extra-fields` จาก `origin/main`
- FE: `/Users/samutpra/GitHub/carmensoftware-organize/carmen-inventory-frontend-react` → branch `feature/lookup-endpoint-phase2` (stack บน `feature/lookup-endpoint` / PR #257)

## Global Constraints

- commit message ภาษาไทย · PR ภาษาอังกฤษ
- **ไม่เขียนเทสต์ใหม่** ยกเว้น `lookup-catalog.spec.ts` (Task 3) ที่ user ขอไว้ใน spec · เทสต์เดิมต้องเขียว · typecheck + lint ไฟล์ที่แตะทุก task
- backend ใช้ **jest** (ห้าม `bun test`)
- FE: ห้าม stage `CLAUDE.md`, `package.json`, `.claude/skills/license-gating/` (งานค้างของคนอื่น) — `git add` ระบุไฟล์ทีละตัวเสมอ
- filter ของ lookup ส่งรูป `field:a,b` คั่นหลาย filter ด้วย `;` — **ห้ามมี `|string` / `|enum`** (gateway เอาทุกอย่างก่อน `:` เป็นชื่อ key → ไม่ผ่าน whitelist → 400)
- ฟิลด์เพิ่มวาง **แบน** ข้าง `id/code/name/description/status` ตัวเลขเป็น `number` (ไม่ใช่ string ของ Decimal)
- `:4000` ชี้ DB dev ที่ใช้ร่วมกัน — ตรวจแบบอ่านอย่างเดียว ห้ามสร้าง/แก้ข้อมูล
- อาจมี Claude session อื่นใช้ repo/tree เดียวกัน — `git status` ก่อนสลับ branch ทุกครั้ง
- deploy: backend ก่อน FE ทุก environment · merge PR #257 **ห้าม `--delete-branch`**

## การปรับจาก spec (ตัดสินตอนเขียน plan — แก้ spec ใน commit เดียวกับ plan)

1. **product:** `enum_product_status_type` มี `discontinued` ด้วย และ lookup เดิมกรอง `product_status_type|string:active` อย่างเดียว → inactiveValues = `['inactive', 'discontinued']` ไม่ใช่แค่ `['inactive']`
2. **รูปของ `filters`:** `Record<string, LookupFilterDef>` โดย `LookupFilterDef = { column; enumValues?; uuid? }` แทน `Record<string, string>` — ส่งค่าที่ไม่ใช่ enum/uuid ให้ Prisma จะได้ 500 (enum ไม่ถูก / `invalid input syntax for type uuid`) จึงตัดค่าที่ไม่ผ่านทิ้ง ถ้าไม่เหลือเลยไม่คืนแถวใด (เหมือน `buildStatusFilter` เดิม)
3. **notification_template:** ตารางไม่มีคอลัมน์ `code` → `defineMaster(..., { code: undefined })`; `type` เป็น `enum_notification_channel` (app/email/sms/line)
4. **ที่วางเทสต์ซิงก์:** gateway `src/application/lookup/lookup-catalog.spec.ts` โดย `require` registry ของ micro-business ด้วย path ที่คำนวณตอนรัน — `check-types` ของ gateway ใช้ `--rootDir .` import แบบ static ข้ามแอปจะได้ TS6059
5. **ข้อความ error ของ FE:** `LookupCombobox` ไม่มีช่องแสดง error ตอนโหลด — เมื่อ extra หาย lookup จะว่าง (เลือกอะไรไม่ได้ ไม่มีการคำนวณผิด) แต่ข้อความเป็น "ไม่มีข้อมูล" ไม่ใช่ error; ยอมรับในเฟสนี้ เพราะลำดับ deploy BE→FE กันไว้แล้ว

## Review Focus

1. filter ที่ค่าไม่ใช่ enum/uuid (เช่น `location_type:foo`, `product_category_id:abc`) — ต้องได้ 200 + `data: []` ไม่ใช่ 500 (Task 1 step ตรวจด้วย curl ใน Task 4)
2. `?ids=` ของ resource ที่มี extra — แถวที่เลือกอยู่ต้องมี extra ครบด้วย ไม่งั้นฟอร์ม edit ที่อ่าน `exchange_rate` จาก selectedItems ได้ `undefined` (toLookupItem ใช้ทางเดียวกันทั้งสองโหมด — ตรวจด้วย curl)
3. location ที่ `delivery_point_id`/`name` เป็น null ทั้งคู่ → `delivery_point: null`; caller ใช้ `?.` อยู่แล้ว — ห้ามคืน `{ id: null, name: null }`
4. ฟอร์มที่เคยได้ `number` แน่ ๆ (`exchange_rate`, `decimal_places`, `credit_term.value`, `level`) ตอนนี้เป็น `number | null` — ทุก caller ต้องมี default (`?? 1`, `?? 2`, `?? 0`, `?? 1`) ห้ามปล่อย null ลง payload
5. `scope` ของ location: `LookupLocation` เดิมยิง `/config/locations` (ทุกคลัง) → ต้องส่ง `scope: "all"`; `LookupUserLocation` → `scope: "mine"` — สลับกันเมื่อไหร่ user เห็นคลังผิดชุดโดยไม่มี error

---

## ส่วน A — Backend (`carmen-turborepo-backend-v2`)

### Task 0: เตรียม branch backend

- [ ] **Step 1: ตรวจ tree ก่อนสลับ**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2
git status -sb
git fetch origin
```

Expected: ไม่มีไฟล์ที่แก้ค้าง (ถ้ามี = session อื่นทำงานอยู่ → หยุดถาม user) · local dev server (`:4000`) รันจาก tree นี้ — การสลับ branch จะ reload service

- [ ] **Step 2: สร้าง branch**

```bash
git switch -c feature/lookup-extra-fields origin/main
```

### Task 1: types + query builder รองรับ `extra` / `filters`

**Files:**
- Modify: `apps/micro-business/src/master/lookup/lookup.types.ts`
- Modify: `apps/micro-business/src/master/lookup/lookup-query.builder.ts`

**Interfaces:**
- Produces: `LookupExtraField`, `LookupFilterDef`, `LookupResourceDef.extra?`, `LookupResourceDef.filters?`, `LookupRow`, `LOOKUP_BASE_FIELDS` (ใน `lookup.types.ts`); `toLookupItem(def, row): LookupRow`

- [ ] **Step 1: เพิ่ม types** — `lookup.types.ts` ต่อท้าย `LookupStatusRule` และขยาย `LookupResourceDef`

```ts
/**
 * How one extra response field is read from the row
 * วิธีอ่านฟิลด์เพิ่มหนึ่งตัวจากแถว
 */
export type LookupExtraField =
  | { kind: 'string' | 'number' | 'boolean'; column: string }
  | { kind: 'object'; fields: Record<string, string> };

/**
 * An allowed filter; values outside enumValues, or non-uuids when uuid is set, match nothing instead of reaching Prisma
 * filter ที่อนุญาต ค่านอก enumValues หรือที่ไม่ใช่ uuid เมื่อตั้ง uuid ไว้ จะไม่ตรงกับแถวใด แทนการส่งเข้า Prisma
 */
export interface LookupFilterDef {
  column: string;
  enumValues?: readonly string[];
  uuid?: boolean;
}

/** Field names every lookup row carries / ชื่อฟิลด์ที่ทุกแถว lookup มี */
export const LOOKUP_BASE_FIELDS = ['id', 'code', 'name', 'description', 'status'] as const;
```

ใน `LookupResourceDef` เพิ่มสองบรรทัดท้าย interface:

```ts
  /** Extra response fields placed beside the base five / ฟิลด์เพิ่มที่วางข้าง 5 ฟิลด์หลัก */
  extra?: Record<string, LookupExtraField>;
  /** Filters allowed beyond code/name/description/status / filter ที่อนุญาตนอกจาก code/name/description/status */
  filters?: Record<string, LookupFilterDef>;
```

ต่อท้าย `LookupItem`:

```ts
/**
 * A lookup row plus the resource's extra fields from the registry
 * แถว lookup พร้อมฟิลด์เพิ่มของ resource ตาม registry
 */
export type LookupRow = LookupItem & Record<string, unknown>;
```

- [ ] **Step 2: `resolveColumn` อ่าน filters** — `lookup-query.builder.ts` แทนฟังก์ชันเดิม

```ts
function resolveColumn(def: LookupResourceDef, field: string): string | undefined {
  if (field === 'code' || field === 'name' || field === 'description') return def[field];
  if (field === 'status' && def.status.kind !== 'none') return def.status.column;
  return def.filters?.[field]?.column;
}
```

- [ ] **Step 3: กรองค่าของ filter ที่ประกาศ enum/uuid** — เพิ่มเหนือ `buildFilterWhere`

```ts
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Drops values the column cannot hold so Prisma never sees them
 * ตัดค่าที่คอลัมน์รับไม่ได้ทิ้ง เพื่อไม่ให้ไปถึง Prisma
 * @param filterDef - Filter definition, if the field is a registry filter / นิยาม filter ถ้าเป็น filter ของ registry
 * @param values - Requested values / ค่าที่ขอ
 * @returns Values safe to query / ค่าที่ query ได้อย่างปลอดภัย
 */
function keepValidValues(filterDef: LookupFilterDef | undefined, values: string[]): string[] {
  if (!filterDef) return values;
  if (filterDef.enumValues) return values.filter((v) => filterDef.enumValues!.includes(v));
  if (filterDef.uuid) return values.filter((v) => UUID_PATTERN.test(v));
  return values;
}
```

ใน `buildFilterWhere` แทนสองบรรทัดท้าย:

```ts
    const column = resolveColumn(def, field);
    const valid = keepValidValues(def.filters?.[field], values);
    return [column && valid.length > 0 ? { [column]: { in: valid } } : NO_ROWS];
```

และเพิ่ม `LookupFilterDef` ใน import บรรทัดแรก

- [ ] **Step 4: `buildSelect` เลือกคอลัมน์ของ extra**

```ts
export function buildSelect(def: LookupResourceDef): Record<string, true> {
  const statusColumn = def.status.kind === 'none' ? undefined : def.status.column;
  const extraColumns = Object.values(def.extra ?? {}).flatMap((f) =>
    f.kind === 'object' ? Object.values(f.fields) : [f.column],
  );
  const columns = ['id', 'deleted_at', def.code, def.name, def.description, statusColumn, ...extraColumns].filter(
    (c): c is string => Boolean(c),
  );
  return Object.fromEntries(columns.map((c) => [c, true as const]));
}
```

- [ ] **Step 5: `toLookupItem` อ่าน extra** — เพิ่มฟังก์ชันเหนือ `toLookupItem` และแก้ตัวมัน

```ts
/**
 * Reads one extra field; Decimal becomes number and an object whose columns are all null becomes null
 * อ่านฟิลด์เพิ่มหนึ่งตัว Decimal แปลงเป็น number และ object ที่ทุกคอลัมน์เป็น null คืน null
 * @param field - Extra field definition / นิยามฟิลด์เพิ่ม
 * @param row - Selected row / แถวที่ select มา
 * @returns Field value / ค่าของฟิลด์
 */
function readExtra(field: LookupExtraField, row: Record<string, unknown>): unknown {
  if (field.kind === 'object') {
    const entries = Object.entries(field.fields).map(([key, column]) => [
      key,
      row[column] == null ? null : String(row[column]),
    ]);
    return entries.every(([, value]) => value === null) ? null : Object.fromEntries(entries);
  }
  const value = row[field.column];
  if (value == null) return null;
  if (field.kind === 'number') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  if (field.kind === 'boolean') return value === true;
  return String(value);
}

/**
 * Maps a selected row onto the five lookup fields plus the resource's extra fields
 * map แถวที่ select มาเป็น 5 ฟิลด์ของ lookup และฟิลด์เพิ่มของ resource
 * @param def - Registry entry / รายการ registry
 * @param row - Selected row / แถวที่ select มา
 * @returns Lookup row / แถว lookup
 */
export function toLookupItem(def: LookupResourceDef, row: Record<string, unknown>): LookupRow {
  const read = (column?: string): string | null => (column && row[column] != null ? String(row[column]) : null);
  const extra = Object.fromEntries(Object.entries(def.extra ?? {}).map(([key, f]) => [key, readExtra(f, row)]));
  return {
    ...extra,
    id: String(row.id),
    code: read(def.code),
    name: read(def.name),
    description: read(def.description),
    status: resolveStatus(def.status, row),
  };
}
```

import บรรทัดแรกเป็น:

```ts
import { LookupExtraField, LookupFilterDef, LookupRequest, LookupResourceDef, LookupRow, LookupStatusRule } from './lookup.types';
```

(`LookupItem` ไม่ได้ใช้แล้วในไฟล์นี้ — ลบออกจาก import)

- [ ] **Step 6: typecheck + lint**

```bash
cd apps/micro-business && bunx tsc --noEmit -p tsconfig.json && bunx eslint src/master/lookup
```

Expected: ไม่มี error

- [ ] **Step 7: Commit**

```bash
git add apps/micro-business/src/master/lookup/lookup.types.ts apps/micro-business/src/master/lookup/lookup-query.builder.ts
git commit -m "feat(lookup): registry ประกาศฟิลด์เพิ่มและ filter ราย resource ได้ — ตัดค่า filter ที่ไม่ใช่ enum/uuid ก่อนถึง Prisma"
```

### Task 2: registry — product status, extra, filters, notification_template + ตรวจตอนโหลด

**Files:**
- Modify: `apps/micro-business/src/master/lookup/lookup-registry.ts`

**Interfaces:**
- Consumes: `LookupExtraField`, `LookupFilterDef`, `LOOKUP_BASE_FIELDS` (Task 1)
- Produces: `LOOKUP_REGISTRY[r].filters` keys — `product_sub_category: ['product_category_id']`, `location: ['location_type']`, `notification_template: ['type']` (Task 3 ใช้เทียบ)

- [ ] **Step 1: import enum เพิ่ม** — เติมใน import จาก `@repo/prisma-shared-schema-tenant` (เรียงตามตัวอักษร)

```ts
  enum_location_type,
  enum_notification_channel,
  enum_product_status_type,
```

และ import types: `import { LOOKUP_BASE_FIELDS, LookupResourceDef, LookupStatusRule } from './lookup.types';`

- [ ] **Step 2: แก้รายการใน `LOOKUP_REGISTRY`** — แทนบรรทัดของ resource ต่อไปนี้

```ts
  // product_status_type is the real status; is_active on tb_product is never written.
  // สถานะจริงคือ product_status_type — is_active ของ tb_product ไม่มีโค้ดไหนเขียน
  product: defineMaster('tb_product', {
    status: enumStatus('product_status_type', enum_product_status_type, [
      enum_product_status_type.inactive,
      enum_product_status_type.discontinued,
    ]),
  }),
```

```ts
  product_sub_category: defineMaster('tb_product_sub_category', {
    filters: { product_category_id: { column: 'product_category_id', uuid: true } },
  }),
```

```ts
  location: defineMaster('tb_location', {
    userScope: (userId) => ({ tb_location_user: { some: { user_id: userId, deleted_at: null } } }),
    // tb_location stores the delivery point denormalized, so no join is needed.
    // tb_location เก็บจุดส่งของแบบ denormalized ไม่ต้อง join
    extra: {
      location_type: { kind: 'string', column: 'location_type' },
      delivery_point: { kind: 'object', fields: { id: 'delivery_point_id', name: 'delivery_point_name' } },
    },
    filters: { location_type: { column: 'location_type', enumValues: Object.values(enum_location_type) } },
  }),
```

```ts
  currency: defineMaster('tb_currency', {
    extra: {
      exchange_rate: { kind: 'number', column: 'exchange_rate' },
      decimal_places: { kind: 'number', column: 'decimal_places' },
    },
  }),
  tax_profile: defineMaster('tb_tax_profile', {
    code: undefined,
    extra: { tax_rate: { kind: 'number', column: 'tax_rate' } },
  }),
  credit_term: defineMaster('tb_credit_term', {
    code: undefined,
    extra: { value: { kind: 'number', column: 'value' } },
  }),
```

```ts
  recipe_category: defineMaster('tb_recipe_category', {
    extra: { level: { kind: 'number', column: 'level' } },
  }),
```

เพิ่มต่อจาก `workflow`:

```ts
  notification_template: defineMaster('tb_notification_template', {
    code: undefined,
    filters: { type: { column: 'type', enumValues: Object.values(enum_notification_channel) } },
  }),
```

- [ ] **Step 3: ตรวจชื่อชนตอนโหลด** — ต่อท้ายไฟล์

```ts
/**
 * Throws at module load when an extra or filter name shadows a base lookup field
 * throw ตอนโหลด module เมื่อชื่อ extra หรือ filter ทับฟิลด์หลักของ lookup
 * @param registry - Registry to check / registry ที่จะตรวจ
 * @returns Nothing / ไม่คืนค่า
 */
export function assertLookupRegistry(registry: Record<string, LookupResourceDef>): void {
  const base = new Set<string>(LOOKUP_BASE_FIELDS);
  for (const [resource, def] of Object.entries(registry)) {
    const clash = [...Object.keys(def.extra ?? {}), ...Object.keys(def.filters ?? {})].find((name) => base.has(name));
    if (clash) throw new Error(`LOOKUP_REGISTRY.${resource}: "${clash}" shadows a base lookup field`);
  }
}

assertLookupRegistry(LOOKUP_REGISTRY);
```

- [ ] **Step 4: typecheck + lint + boot**

```bash
cd apps/micro-business && bunx tsc --noEmit -p tsconfig.json && bunx eslint src/master/lookup
cd ../.. && bun run boot-check micro-business
```

Expected: ไม่มี error · boot-check ผ่าน (ถ้า enum ตัวไหนไม่ถูก export จาก package tsc จะฟ้องที่นี่)

- [ ] **Step 5: Commit**

```bash
git add apps/micro-business/src/master/lookup/lookup-registry.ts
git commit -m "feat(lookup): เพิ่มฟิลด์ tax_rate/exchange_rate/credit term/level/location และ filter ราย resource · product กรองด้วย product_status_type · เพิ่ม notification_template"
```

### Task 3: gateway — catalog `filters`, whitelist ราย resource, swagger + เทสต์ซิงก์

**Files:**
- Modify: `apps/backend-gateway/src/application/lookup/lookup.types.ts`
- Modify: `apps/backend-gateway/src/application/lookup/lookup-catalog.ts`
- Modify: `apps/backend-gateway/src/application/lookup/lookup.service.ts`
- Modify: `apps/backend-gateway/src/application/lookup/lookup.controller.ts`
- Modify: `apps/backend-gateway/src/application/lookup/swagger/response.ts`
- Create: `apps/backend-gateway/src/application/lookup/lookup-catalog.spec.ts`

**Interfaces:**
- Consumes: `LOOKUP_REGISTRY` filters ของ Task 2
- Produces: `GET /lookup` แต่ละแถวมี `filters: string[]` · `GET /lookup/:resource` รับ filter ตาม catalog

- [ ] **Step 1: type** — `lookup.types.ts` ใน `LookupCatalogEntry` เพิ่ม

```ts
  /** Filter names allowed beyond code/name/description/status; must match the micro-business registry / ชื่อ filter เพิ่มเติม ต้องตรงกับ registry ของ micro-business */
  filters?: readonly string[];
```

- [ ] **Step 2: catalog** — `lookup-catalog.ts` ใน `MASTER_RESOURCES` เพิ่ม `'notification_template',` ต่อจาก `'purchase_request_template',` แล้วใน `LOOKUP_CATALOG` เพิ่มก่อน `certificate:`

```ts
  // Filter names mirror `filters` in micro-business lookup-registry.ts; lookup-catalog.spec.ts guards the pair.
  // ชื่อ filter ต้องตรงกับ `filters` ใน lookup-registry.ts ของ micro-business — lookup-catalog.spec.ts คุมไว้
  product_sub_category: { ...MASTER, filters: ['product_category_id'] },
  location: { ...MASTER, filters: ['location_type'] },
  notification_template: { ...MASTER, filters: ['type'] },
```

- [ ] **Step 3: whitelist ราย resource** — `lookup.service.ts`

แทน `const LOOKUP_FIELDS = new Set(['code', 'name', 'description', 'status']);` ด้วย

```ts
const BASE_LOOKUP_FIELDS = ['code', 'name', 'description', 'status'];
```

ใน `validateRequest` แทนบรรทัด `if (fields.some((f) => !LOOKUP_FIELDS.has(f))) ...` ด้วย

```ts
    const allowed = new Set([...BASE_LOOKUP_FIELDS, ...(entry.filters ?? [])]);
    if (fields.some((f) => !allowed.has(f))) return Result.errorFromCatalog(ERROR_CATALOG.LOOKUP_INVALID_FIELD);
```

และ JSDoc ของ `validateRequest` บรรทัดแรกเป็น `Rejects an unsupported scope, include_deleted, or a filter/sort field outside the base fields and the resource's catalog filters` / `ปฏิเสธ scope หรือ include_deleted ที่ไม่รองรับ และชื่อฟิลด์ filter/sort ที่อยู่นอกฟิลด์หลักและ filter ของ resource`

ใน `getCatalog` เพิ่มใน object ของแต่ละแถว: `filters: entry.filters ?? [],`

- [ ] **Step 4: swagger** — `swagger/response.ts` ใน `LookupCatalogResponseDto` เพิ่ม

```ts
  @ApiProperty({ type: [String], description: 'Filter names accepted beyond code, name, description, status', example: ['location_type'] })
  filters: string[];
```

JSDoc ของ `LookupItemResponseDto` เปลี่ยนเป็น

```ts
/**
 * Swagger shape of one lookup row; some resources add flat extra fields (e.g. currency.exchange_rate)
 * รูปแบบ Swagger ของ lookup หนึ่งแถว บาง resource มีฟิลด์เพิ่มแบบแบน (เช่น currency.exchange_rate)
 */
```

`lookup.controller.ts` ใน `@ApiOperation` ของ `findAll` แทน description เป็น

```ts
      'Paginated { id, code, name, description, status } for UI lookups; some resources add flat extra fields (tax_profile.tax_rate, currency.exchange_rate/decimal_places, credit_term.value, recipe_category.level, location.location_type/delivery_point). Defaults: scope=mine, active and not deleted only, sorted by code, name, id. filter/sort accept code, name, description, status plus the resource\'s `filters` from GET /api/:bu_code/lookup; send filters as field:a,b without a |type suffix.\n\nรายการ lookup แบบแบ่งหน้าสำหรับ UI',
```

- [ ] **Step 5: เขียนเทสต์ซิงก์** — `lookup-catalog.spec.ts`

```ts
import * as path from 'path';
import { LOOKUP_CATALOG } from './lookup-catalog';

// check-types of the gateway runs with --rootDir ., so a static import from micro-business fails with TS6059.
// A runtime-computed require keeps tsc out while ts-jest still transforms the file.
// check-types ของ gateway ใช้ --rootDir . import ข้ามแอปแบบ static จะได้ TS6059 จึง require ด้วย path ที่คำนวณตอนรัน
const REGISTRY_PATH = path.resolve(__dirname, '../../../../micro-business/src/master/lookup/lookup-registry');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { LOOKUP_REGISTRY } = require(REGISTRY_PATH) as {
  LOOKUP_REGISTRY: Record<string, { filters?: Record<string, unknown> }>;
};

describe('LOOKUP_CATALOG ↔ micro-business LOOKUP_REGISTRY', () => {
  const registryResources = Object.keys(LOOKUP_REGISTRY);
  const catalogRegistryResources = Object.entries(LOOKUP_CATALOG)
    .filter(([, entry]) => !entry.projection)
    .map(([resource]) => resource);

  it('lists the same non-projected resources on both sides', () => {
    expect([...catalogRegistryResources].sort()).toEqual([...registryResources].sort());
  });

  it('declares the same filters for every resource', () => {
    const mismatched = registryResources.filter((resource) => {
      const catalogFilters = [...(LOOKUP_CATALOG[resource]?.filters ?? [])].sort();
      const registryFilters = Object.keys(LOOKUP_REGISTRY[resource].filters ?? {}).sort();
      return catalogFilters.join(',') !== registryFilters.join(',');
    });
    expect(mismatched).toEqual([]);
  });
});
```

- [ ] **Step 6: รันเทสต์**

```bash
cd apps/backend-gateway && bunx jest src/application/lookup
```

Expected: PASS 2/2 · ถ้า test แรก FAIL แปลว่า catalog กับ registry ไม่ตรงกันมาตั้งแต่ก่อน (ดูชื่อใน diff) → เพิ่มฝั่งที่ขาดให้ตรง แล้ว ledger เป็น Ruling

- [ ] **Step 7: ยืนยันว่าเทสต์จับได้จริง** — ลบ `filters: ['type']` ของ `notification_template` ชั่วคราว รัน Step 6 → ต้อง FAIL ที่ test ที่สองพร้อม `["notification_template"]` แล้วคืนค่า (`git diff` ต้องไม่เหลือส่วนที่ลบ)

- [ ] **Step 8: typecheck + lint**

```bash
cd apps/backend-gateway && bun run check-types && bunx eslint src/application/lookup
```

Expected: ไม่มี error (ถ้า eslint ฟ้อง unused disable directive ที่ require → ลบคอมเมนต์ disable นั้น)

- [ ] **Step 9: Commit**

```bash
git add apps/backend-gateway/src/application/lookup
git commit -m "feat(lookup): gateway รับ filter ตาม catalog ของแต่ละ resource และคืน filters ใน catalog · เทสต์กัน catalog กับ registry หลุดซิงก์"
```

### Task 4: ตรวจ backend ทั้งก้อน + curl local + PR

- [ ] **Step 1: static + เทสต์เดิม**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2
bunx turbo run check-types --filter=backend-gateway --filter=micro-business
bun run boot-check backend-gateway micro-business
bun run audit:tcp-drift
```

Expected: ผ่านทั้งหมด (contract `lookup.find-all` ไม่เปลี่ยน — `gen:rpc-contract` ไม่ต้องรัน; ถ้า audit ฟ้องให้รัน `bun run gen:rpc-contract` แล้ว commit ผลลัพธ์)

- [ ] **Step 2: รอ service reload แล้ว curl** (token ของ admin@zebra.com ใส่ตัวแปร shell `TOKEN`, app id ใน `APP_ID` — ห้าม echo/commit ค่า)

```bash
B=http://localhost:4000/api/T02/lookup
H=(-H "Authorization: Bearer $TOKEN" -H "x-app-id: $APP_ID")
for r in tax_profile currency credit_term recipe_category location product product_sub_category notification_template; do
  echo "== $r"; curl -s "${H[@]}" "$B/$r?perpage=2" | jq -c '{status: .status, first: .data[0]}'
done
curl -s "${H[@]}" "$B" | jq -c '.data[] | select(.filters | length > 0)'
```

Expected: ทุกตัว 200 · `tax_rate`/`exchange_rate`/`decimal_places`/`value`/`level` เป็น number (ไม่มี `"`) · location มี `location_type` + `delivery_point` (object หรือ null) · catalog คืน filters ของ 3 resource

- [ ] **Step 3: filter + ข้อผิดพลาด**

```bash
CAT=$(curl -s "${H[@]}" "$B/product_category?perpage=1" | jq -r '.data[0].id')
curl -s "${H[@]}" "$B/product_sub_category?filter=product_category_id:$CAT&perpage=100" | jq '.paginate.total'
curl -s "${H[@]}" "$B/product_sub_category?filter=product_category_id:abc" | jq -c '{s: .status, n: (.data|length)}'
curl -s "${H[@]}" "$B/location?scope=all&filter=location_type:direct&perpage=100" | jq -r '[.data[].location_type] | unique'
curl -s "${H[@]}" "$B/location?scope=all&filter=location_type:foo" | jq -c '{s: .status, n: (.data|length)}'
curl -s -o /dev/null -w '%{http_code}\n' "${H[@]}" "$B/location?filter=location_type|string:direct"
curl -s "${H[@]}" "$B/notification_template?filter=type:app&perpage=100" | jq '.paginate.total'
curl -s "${H[@]}" "$B/product?filter=status:inactive,discontinued&include_inactive=true&perpage=1" | jq '.paginate.total'
```

Expected: sub-category ตัวแรกได้จำนวน > 0 · `abc` → 200 + 0 แถว · location direct คืน `["direct"]` · `foo` → 200 + 0 แถว · `|string` → `400` · template app ได้จำนวน > 0 · product inactive/discontinued: จดจำนวนไว้ แล้วตรวจว่า product lookup ปกติ (ไม่ใส่ filter) ไม่มีแถว `status` ≠ `active`:

```bash
curl -s "${H[@]}" "$B/product?perpage=100" | jq -r '[.data[].status] | unique'
```

Expected: `["active"]`

- [ ] **Step 4: `?ids=` คืน extra** (Review Focus 2)

```bash
CUR=$(curl -s "${H[@]}" "$B/currency?perpage=1" | jq -r '.data[0].id')
curl -s "${H[@]}" "$B/currency?ids=$CUR" | jq -c '.data[0]'
```

Expected: มี `exchange_rate` และ `decimal_places`

- [ ] **Step 5: push + PR (ถาม user ก่อน)** — เมื่อ user ตกลง

```bash
git push -u origin feature/lookup-extra-fields
gh pr create --base main --title "feat(lookup): per-resource extra fields and filters; product uses product_status_type" --body "<English summary: registry extra/filters, enum/uuid value guard, product status fix (inactive+discontinued excluded), notification_template resource, gateway per-resource whitelist + catalog filters, sync jest spec, curl results from Step 2–4. Deploy note: deploy before FE phase 2; check lookup.findAll in app-id allowlist per env.>"
```

---

## ส่วน B — Frontend (`carmen-inventory-frontend-react`)

ทุก task ต้องการ backend ของส่วน A รันอยู่ที่ `:4000` สำหรับตรวจในเบราว์เซอร์ (Task 9) — typecheck/lint ทำได้โดยไม่ต้องมี

### Task 5: types + `useLookupResource` generic / `serverFilter` / ตรวจ extra

**Files:**
- Modify: `types/lookup.ts`
- Modify: `hooks/use-lookup-resource.ts`

**Interfaces:**
- Produces:
  - `LookupResource` เพิ่ม `"product" | "tax_profile" | "currency" | "credit_term" | "recipe_category" | "product_sub_category" | "location" | "notification_template"`
  - `TaxProfileLookup`, `CurrencyLookup`, `CreditTermLookup`, `RecipeCategoryLookup`, `LocationLookup`, `LOOKUP_EXTRA_FIELDS`, `LookupServerFilter`, `lookupCodeName(item): string`
  - `useLookupResource<T extends LookupItem = LookupItem>(resource, { search, scope?, selectedIds?, enabled?, filter?: (item: T) => boolean, perpage?, serverFilter?: LookupServerFilter })` คืน `items: T[]`, `selectedItems: T[]` (ที่เหลือเหมือนเดิม)

- [ ] **Step 1: types** — `types/lookup.ts`

แทน JSDoc + union ของ `LookupResource` ด้วย

```ts
/**
 * resource ที่ FE ใช้จริง — ชื่อต้องตรงกับ `LOOKUP_CATALOG` ของ backend
 * (`apps/backend-gateway/src/application/lookup/lookup-catalog.ts`)
 * เพิ่มเมื่อย้าย lookup ตัวใหม่ ไม่ดึง catalog ตอน runtime
 */
export type LookupResource =
  | "unit"
  | "recipe_cuisine"
  | "recipe_equipment_category"
  | "extra_cost_type"
  | "location_shelf"
  | "credit_note_reason"
  | "delivery_point"
  | "department"
  | "pricelist_template"
  | "vendor"
  | "product_category"
  | "product"
  | "tax_profile"
  | "currency"
  | "credit_term"
  | "recipe_category"
  | "product_sub_category"
  | "location"
  | "notification_template";
```

ต่อท้ายไฟล์ (เพิ่ม `import type { INVENTORY_TYPE } from "@/constant/location";` บนสุด)

```ts
/** ป้าย "รหัส — ชื่อ" ข้ามส่วนที่เป็น null */
export const lookupCodeName = (item: LookupItem): string =>
  [item.code, item.name].filter(Boolean).join(" — ");

// ฟิลด์เพิ่มของ backend วางแบนข้าง 5 ฟิลด์หลัก (registry `extra` ของ micro-business)
export type TaxProfileLookup = LookupItem & { tax_rate: number | null };
export type CurrencyLookup = LookupItem & {
  exchange_rate: number | null;
  decimal_places: number | null;
};
export type CreditTermLookup = LookupItem & { value: number | null };
export type RecipeCategoryLookup = LookupItem & { level: number | null };
export type LocationLookup = LookupItem & {
  location_type: INVENTORY_TYPE;
  delivery_point: { id: string | null; name: string | null } | null;
};

/**
 * ฟิลด์เพิ่มที่ต้องมีในแถว — `useLookupResource` ตรวจกับแถวแรก ขาดเมื่อไหร่ throw
 * (backend เก่ากว่า FE) แทนการปล่อย `undefined` ให้ฟอร์มคำนวณภาษี/อัตราแลกเปลี่ยนผิดเงียบ ๆ
 */
export const LOOKUP_EXTRA_FIELDS: Partial<
  Record<LookupResource, readonly string[]>
> = {
  tax_profile: ["tax_rate"],
  currency: ["exchange_rate", "decimal_places"],
  credit_term: ["value"],
  recipe_category: ["level"],
  location: ["location_type", "delivery_point"],
};

/**
 * filter ฝั่ง server — ชื่อต้องอยู่ใน `filters` ของ catalog backend · ค่า undefined/ว่างถูกข้าม
 * ส่งเป็น `k:v1,v2;k2:v` (ห้ามมี `|string` — gateway จะตอบ 400)
 */
export type LookupServerFilter = Record<
  string,
  string | readonly string[] | undefined
>;
```

- [ ] **Step 2: hook** — `hooks/use-lookup-resource.ts`

import type เป็น

```ts
import {
  LOOKUP_EXTRA_FIELDS,
  type LookupItem,
  type LookupResource,
  type LookupScope,
  type LookupServerFilter,
} from "@/types/lookup";
```

และเพิ่ม `ERROR_CODES` ใน import ของ `@/lib/api-error`: `import { ApiError, ERROR_CODES } from "@/lib/api-error";`

แทน interface options เป็น generic + เพิ่ม `serverFilter`

```ts
interface UseLookupResourceOptions<T extends LookupItem> {
  /** คำค้น (combobox debounce ให้แล้ว) — เปลี่ยนแล้วเริ่มหน้า 1 ใหม่ */
  search: string;
  /** ไม่ส่ง = `mine` ของ backend · department/location ทั้ง BU ต้องส่ง `"all"` */
  scope?: LookupScope;
  /** id ที่เลือกอยู่ — ดึงตาม id แยกเสมอ ให้ปุ่มแสดงชื่อได้แม้อยู่หลังหน้าแรกหรือถูกปิดใช้งานแล้ว */
  selectedIds?: readonly string[];
  /** false = ไม่ดึงรายการ (lazy คู่กับ `onOpenChange`) — ไม่มีผลกับ `selectedIds` */
  enabled?: boolean;
  /** กรองฝั่ง client หลังโหลด (เช่น excludeIds) — ค่าที่เลือกอยู่ผ่านเสมอ */
  filter?: (item: T) => boolean;
  /** filter ฝั่ง server (ชื่อตาม catalog) — เปลี่ยนแล้วเริ่มหน้า 1 ใหม่ */
  serverFilter?: LookupServerFilter;
  perpage?: number;
}
```

`EMPTY` เป็น `const EMPTY: never[] = [];`

แทน `fetchLookup` และเพิ่ม helper สองตัว

```ts
/** `{ a: ["x","y"], b: "z" }` → `a:x,y;b:z` · ข้ามค่าว่าง · ไม่เหลืออะไรคืน undefined */
export function serializeLookupFilter(
  filter?: LookupServerFilter,
): string | undefined {
  if (!filter) return undefined;
  const parts = Object.entries(filter).flatMap(([key, raw]) => {
    const values = (typeof raw === "string" ? [raw] : (raw ?? [])).filter(
      Boolean,
    );
    return values.length > 0 ? [`${key}:${values.join(",")}`] : [];
  });
  return parts.length > 0 ? parts.join(";") : undefined;
}

// backend เก่ากว่า FE จะไม่มีฟิลด์เพิ่ม — throw ให้ lookup ว่าง (เลือกไม่ได้) ดีกว่าให้ฟอร์ม
// ได้ undefined แล้วคำนวณภาษี/อัตราแลกเปลี่ยนเป็น 0 เงียบ ๆ
function assertExtraFields(
  resource: LookupResource,
  page: PaginatedResponse<LookupItem>,
) {
  const first = page.data?.[0];
  const missing = first
    ? LOOKUP_EXTRA_FIELDS[resource]?.find((field) => !(field in first))
    : undefined;
  if (missing) {
    throw new ApiError(
      ERROR_CODES.INTERNAL_ERROR,
      `Lookup ${resource} is missing ${missing} — backend older than this frontend`,
    );
  }
}

async function fetchLookup<T extends LookupItem>(
  buCode: string,
  resource: LookupResource,
  params: Record<string, string | number | undefined>,
): Promise<PaginatedResponse<T>> {
  const url = buildUrl(`${API_ENDPOINTS.LOOKUP(buCode)}/${resource}`, params);
  const res = await httpClient.get(url);
  if (!res.ok) throw await ApiError.from(res, `Failed to fetch ${resource}`);
  const page = (await res.json()) as PaginatedResponse<T>;
  assertExtraFields(resource, page);
  return page;
}
```

signature ของ hook:

```ts
export function useLookupResource<T extends LookupItem = LookupItem>(
  resource: LookupResource,
  {
    search,
    scope,
    selectedIds,
    enabled = true,
    filter,
    serverFilter,
    perpage = 30,
  }: UseLookupResourceOptions<T>,
) {
  const buCode = useBuCode();
  const filterParam = serializeLookupFilter(serverFilter);
```

ใน `useInfiniteQuery`: key เป็น `["lookup", buCode, resource, scope, filterParam, search, perpage]`, `queryFn` เป็น `fetchLookup<T>(buCode!, resource, { page: pageParam, perpage, search: search || undefined, scope, filter: filterParam })`

ใน `useQuery` ของ ids: key เป็น `["lookup", buCode, resource, scope, filterParam, "ids", ids]`, `queryFn` เพิ่ม `filter: filterParam` และเรียก `fetchLookup<T>`

แทนชนิดในส่วนประกอบรายการ: `const allItems: T[] = [];`, `const known = new Map<string, T>();`, `.filter((it): it is T => it !== undefined)`

แก้ JSDoc ของ hook: ประโยค "endpoint กรอง active ให้เอง จึงไม่มี `serverFilter`" เป็น "endpoint กรอง active ให้เอง `serverFilter` ใช้กับ filter เพิ่มของ resource (เช่น `location_type`)" และใน `@param options` เพิ่ม `serverFilter`

- [ ] **Step 3: typecheck + lint**

```bash
bun run typecheck && bunx eslint types/lookup.ts hooks/use-lookup-resource.ts
```

Expected: ไม่มี error (component เดิมยังเรียกแบบไม่ใส่ generic ได้เพราะ default = `LookupItem`)

- [ ] **Step 4: Commit**

```bash
git add types/lookup.ts hooks/use-lookup-resource.ts
git commit -m "feat(lookup): useLookupResource รับ generic และ serverFilter · ตรวจฟิลด์เพิ่มจาก backend ก่อนใช้"
```

### Task 6: tax profile / currency / credit term / recipe category

**Files:**
- Modify: `components/lookup/lookup-tax-profile.tsx`, `lookup-currency.tsx`, `lookup-credit-term.tsx`, `lookup-recipe-category.tsx`
- Modify (ตามที่ typecheck ชี้): `routes/procurement/purchase-order/po-general-fields.tsx`, `routes/procurement/goods-receive-note/grn-form-header.tsx`, `routes/procurement/purchase-request/pr-item-cells/currency-cell.tsx`, `routes/operation-plan/category/recipe-category-general-fields.tsx`, `routes/operation-plan/category/recipe-category-form.tsx` และ caller อื่นของ `LookupCurrency` (exchange-rate-dialog, cn-general-fields, company-profile, plt-form, pl-general-card, use-prt-item-table)

**Interfaces:**
- Consumes: `useLookupResource<T>`, `TaxProfileLookup`, `CurrencyLookup`, `CreditTermLookup`, `RecipeCategoryLookup`, `lookupLabel` (Task 5)
- Produces: `LookupCurrency.onItemChange: (currency: CurrencyLookup) => void` · `LookupCreditTerm.onValueChange: (value: string, creditTerm?: CreditTermLookup) => void` · `LookupRecipeCategory.onItemChange: (category: RecipeCategoryLookup) => void` · `LookupTaxProfile` prop ไม่เปลี่ยน

- [ ] **Step 1: `lookup-tax-profile.tsx`**

แทน import ของ `useTaxProfile`, `useLookupPagination`/`ACTIVE_ONLY_FILTER`, `TaxProfile` ด้วย

```ts
import { useLookupResource } from "@/hooks/use-lookup-resource";
import { lookupLabel, type TaxProfileLookup } from "@/types/lookup";
```

แทนการเรียก hook

```ts
  const { items, selectedItems, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupResource<TaxProfileLookup>("tax_profile", {
      search,
      enabled: hasOpened,
      selectedIds: value ? [value] : [],
    });
```

ใน `LookupCombobox`:

```tsx
      onValueChange={(id, tp) =>
        onValueChange(id, tp?.tax_rate ?? 0, tp ? lookupLabel(tp) : "")
      }
```

และ `getLabel={lookupLabel}`

- [ ] **Step 2: `lookup-currency.tsx`**

import แทนเป็น

```ts
import { useLookupResource } from "@/hooks/use-lookup-resource";
import type { CurrencyLookup } from "@/types/lookup";
```

prop: `readonly onItemChange?: (currency: CurrencyLookup) => void;`

hook:

```ts
  const { items, selectedItems, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupResource<CurrencyLookup>("currency", {
      search,
      enabled: hasOpened,
      selectedIds: value ? [value] : [],
      filter: excludeIds ? (c) => !excludeIds.has(c.id) : undefined,
    });
```

combobox:

```tsx
      getLabel={(c) => c.code ?? ""}
      getSearchValue={(c) => `${c.code ?? ""} ${c.name ?? ""}`}
```

- [ ] **Step 3: `lookup-credit-term.tsx`**

```ts
import { useLookupResource } from "@/hooks/use-lookup-resource";
import { lookupLabel, type CreditTermLookup } from "@/types/lookup";
```

prop: `readonly onValueChange: (value: string, creditTerm?: CreditTermLookup) => void;`

hook:

```ts
  const { items, selectedItems, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupResource<CreditTermLookup>("credit_term", {
      search,
      enabled: hasOpened,
      selectedIds: value ? [value] : [],
    });
```

combobox: `getLabel={lookupLabel}`

- [ ] **Step 4: `lookup-recipe-category.tsx`**

```ts
import { useLookupResource } from "@/hooks/use-lookup-resource";
import { lookupLabel, type RecipeCategoryLookup } from "@/types/lookup";
```

prop: `readonly onItemChange?: (category: RecipeCategoryLookup) => void;`

hook (คง destructure เดิม):

```ts
  } = useLookupResource<RecipeCategoryLookup>("recipe_category", {
    search,
    enabled: hasOpened,
    selectedIds: value ? [value] : [],
    filter: excludeIds ? (c) => !excludeIds.has(c.id) : undefined,
  });
```

combobox: `getLabel={lookupLabel}` · JSDoc บรรทัด "ดึงข้อมูลผ่าน `useRecipeCategory` hook ... filter เฉพาะ `is_active = true`" เปลี่ยนเป็น "ดึงข้อมูลผ่าน Lookup API (`recipe_category`) พร้อม server-side search และ infinite scroll (perpage 30) endpoint กรอง active ให้เอง รองรับ `excludeIds` กัน duplicate"

- [ ] **Step 5: แก้ caller ตาม typecheck**

```bash
bun run typecheck 2>&1 | tee $TMPDIR/lookup-t6.txt | grep "error TS" | head -40
```

กติกาการแก้ (ทุกจุดใช้กติกาเดียวกัน):
- string ที่ตอนนี้เป็น `string | null` (`currency.code`, `creditTerm.name`, `location.name` …) → `?? ""`
- `currency.exchange_rate` → `?? 1` · `currency.decimal_places` → `?? 2` · `creditTerm.value` → `?? 0`
- `recipe-category-form.tsx` `handleParentChange(parent?: RecipeCategory)` → `(parent?: RecipeCategoryLookup)` และ `form.setValue("level", parent ? (parent.level ?? 1) + 1 : 1);`; `recipe-category-general-fields.tsx` prop `onParentChange: (parent?: RecipeCategoryLookup) => void` (import type จาก `@/types/lookup`, ลบ import `RecipeCategory` ถ้าไม่ใช้แล้ว)
- ตัวอย่างที่รู้แล้ว: `po-general-fields.tsx:131-132` → `creditTerm.name ?? ""`, `creditTerm.value ?? 0`; `:195-196` → `currency.code ?? ""`, `currency.exchange_rate ?? 1`; `grn-form-header.tsx:125-126` และ `:186-187` เหมือนกัน; `pr-item-cells/currency-cell.tsx:46` → `currency.code ?? ""`

รัน typecheck ซ้ำจนสะอาด

- [ ] **Step 6: lint + เทสต์เดิม**

```bash
bun run typecheck
bunx eslint components/lookup/lookup-tax-profile.tsx components/lookup/lookup-currency.tsx components/lookup/lookup-credit-term.tsx components/lookup/lookup-recipe-category.tsx $(git diff --name-only -- routes)
bun test:run > $TMPDIR/lookup-t6-test.txt 2>&1; tail -5 $TMPDIR/lookup-t6-test.txt
```

Expected: typecheck/lint สะอาด · เทสต์ผ่านทั้งหมด (เฟส 1 จบที่ 1878 passed)

- [ ] **Step 7: Commit** (ระบุไฟล์ทีละตัว — ห้าม `git add -A`)

```bash
git add components/lookup/lookup-tax-profile.tsx components/lookup/lookup-currency.tsx components/lookup/lookup-credit-term.tsx components/lookup/lookup-recipe-category.tsx $(git diff --name-only -- routes)
git commit -m "refactor(lookup): ย้าย lookup tax profile/currency/credit term/recipe category ไปใช้ Lookup API พร้อมฟิลด์เพิ่ม"
```

### Task 7: product / sub-category / notification template

**Files:**
- Modify: `components/lookup/lookup-product.tsx`, `routes/vendor-management/price-list/pl-item-cells.tsx` (คืนจาก commit `37c68716`)
- Modify: `components/lookup/lookup-sub-category.tsx`, `routes/product-management/product/pd-tab-general.tsx`
- Modify: `components/lookup/lookup-noti-tmpl.tsx`

**Interfaces:**
- Consumes: `useLookupResource`, `serverFilter`, `lookupLabel`, `lookupCodeName` (Task 5)
- Produces: `LookupProduct.onValueChange: (value: string, product?: LookupItem) => void` · `LookupSubCategory.onValueChange: (value: string, item?: LookupItem) => void`

- [ ] **Step 1: คืน product จากเฟส 1**

```bash
git checkout 37c68716 -- components/lookup/lookup-product.tsx routes/vendor-management/price-list/pl-item-cells.tsx
git diff --cached --stat
```

Expected: สองไฟล์นี้กลับเป็นเวอร์ชันที่ใช้ `useLookupResource("product", …)` (backend Task 2 แก้สถานะ product แล้ว) — `git reset -q` ให้ไฟล์ไม่ค้างใน index ก่อนแก้ต่อ

- [ ] **Step 2: `lookup-sub-category.tsx`**

import แทน `useSubCategory`, `useLookupPagination`/`ACTIVE_ONLY_FILTER`, `SubCategoryDto` ด้วย

```ts
import { useLookupResource } from "@/hooks/use-lookup-resource";
import { lookupCodeName, type LookupItem } from "@/types/lookup";
```

prop: `readonly onValueChange: (value: string, item?: LookupItem) => void;`

แทนบล็อก `serverFilter` + hook ด้วย

```ts
  const { items, selectedItems, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupResource("product_sub_category", {
      search,
      // กรองตามหมวดที่ server — กรองหลังโหลดทีละ 30 แถว หน้าแรกอาจว่างทั้งที่มีข้อมูล
      serverFilter: { product_category_id: filterCategoryId },
      enabled: hasOpened,
      selectedIds: value ? [value] : [],
    });
```

combobox:

```tsx
      getLabel={lookupCodeName}
      getSearchValue={(s) => `${s.code ?? ""} ${s.name ?? ""}`}
```

- [ ] **Step 3: `pd-tab-general.tsx`** — `handleSubCategoryChange = (id: string, item?: LookupItem)`; import เปลี่ยนเป็น `import type { ItemGroupDto } from "@/types/category";` (ถ้า `SubCategoryDto` ไม่มีที่ใช้อื่นในไฟล์)

- [ ] **Step 4: `lookup-noti-tmpl.tsx`**

import แทน `useNotificationTemplates`, `useLookupPagination`/`ACTIVE_ONLY_FILTER`, `NotificationTemplate` ด้วย

```ts
import { useLookupResource } from "@/hooks/use-lookup-resource";
import { lookupLabel } from "@/types/lookup";
import type { NotificationTemplateType } from "@/types/noti-tmpl";
```

hook:

```ts
  const { items, selectedItems, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupResource("notification_template", {
      search,
      // template ที่ stage ผูกไว้คงแสดงแม้ถูกปิดใช้งาน — มาทาง selectedItems
      serverFilter: { type: channelType },
      enabled: hasOpened,
      selectedIds: value ? [value] : [],
    });
```

combobox:

```tsx
      renderItem={(tpl) => (
        <span className="flex-1 truncate text-left">{lookupLabel(tpl)}</span>
      )}
      getId={(tpl) => tpl.id}
      getLabel={lookupLabel}
```

- [ ] **Step 5: typecheck + lint + เทสต์เดิม**

```bash
bun run typecheck
bunx eslint components/lookup/lookup-product.tsx components/lookup/lookup-sub-category.tsx components/lookup/lookup-noti-tmpl.tsx routes/vendor-management/price-list/pl-item-cells.tsx routes/product-management/product/pd-tab-general.tsx
bun test:run > $TMPDIR/lookup-t7-test.txt 2>&1; tail -5 $TMPDIR/lookup-t7-test.txt
```

Expected: สะอาด · เทสต์ผ่าน · ถ้า typecheck ชี้ caller ของ `LookupProduct` ที่อ่าน `name` เป็น string → `?? ""` (เฟส 1 แก้ไว้แล้ว 4 จุด ควรไม่มีเพิ่ม)

- [ ] **Step 6: Commit**

```bash
git add components/lookup/lookup-product.tsx components/lookup/lookup-sub-category.tsx components/lookup/lookup-noti-tmpl.tsx routes/vendor-management/price-list/pl-item-cells.tsx routes/product-management/product/pd-tab-general.tsx
git commit -m "refactor(lookup): ย้าย lookup สินค้า/หมวดย่อย/เทมเพลตแจ้งเตือนไปใช้ Lookup API — backend กรองสถานะสินค้าด้วย product_status_type แล้ว"
```

### Task 8: location / user-location

**Files:**
- Modify: `components/lookup/lookup-location.tsx`, `components/lookup/lookup-user-location.tsx`
- Modify: `routes/product-management/product/pd-tab-locations.tsx:213` และ caller อื่นที่ typecheck ชี้ (transaction-component, sc-general-fields, stock-repl-sr-wizard, ia-doc-info, sr-request-details, po/grn/pr location-cell, use-prt-item-table)

**Interfaces:**
- Consumes: `useLookupResource<LocationLookup>`, `serverFilter`, `lookupCodeName` (Task 5)
- Produces: `LookupLocation.onItemChange` / `LookupUserLocation.onItemChange`: `(location: LocationLookup) => void`

- [ ] **Step 1: `lookup-location.tsx`**

import แทน `useLocation`, `useLookupPagination`/`ACTIVE_ONLY_FILTER`, `Location` ด้วย

```ts
import { useLookupResource } from "@/hooks/use-lookup-resource";
import { lookupCodeName, type LocationLookup } from "@/types/lookup";
```

prop: `readonly onItemChange?: (location: LocationLookup) => void;`

แทนบล็อก `serverFilter` + hook ด้วย

```ts
  const {
    items: locations,
    selectedItems,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useLookupResource<LocationLookup>("location", {
    search,
    // list เดิมคือ /config/locations = ทุกคลังของ BU · `mine` จะเหลือแค่คลังที่ assign ให้ user
    scope: "all",
    serverFilter: { location_type: locationTypes },
    enabled: hasOpened,
    selectedIds: value ? [value] : [],
    filter: excludedSet ? (l) => !excludedSet.has(l.id) : undefined,
  });
```

combobox: `getLabel={lookupCodeName}` · JSDoc บรรทัด "ดึงข้อมูลผ่าน `useLocation` hook …" เปลี่ยนเป็น "ดึงข้อมูลผ่าน Lookup API (`location`, scope all) พร้อม server-side search และ infinite scroll (perpage 30) endpoint กรอง active ให้เอง `locationTypes` กรองที่ server" และ "ส่ง object `Location` เต็ม" → "ส่ง `LocationLookup` (มี `location_type` และ `delivery_point`)"

- [ ] **Step 2: `lookup-user-location.tsx`**

import แทน `useUserLocation`, `useLookupPagination`/`ACTIVE_ONLY_FILTER`, `Location` ด้วย

```ts
import { useLookupResource } from "@/hooks/use-lookup-resource";
import { lookupCodeName, type LocationLookup } from "@/types/lookup";
```

prop: `readonly onItemChange?: (location: LocationLookup) => void;`

ใน `LookupUserLocationInner` แทนบล็อก `serverFilter` + hook ด้วย

```ts
  const {
    items: locations,
    selectedItems,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useLookupResource<LocationLookup>("location", {
    search,
    // คลังที่ assign ให้ user (การ assign ที่ถูกถอนแล้วไม่นับ — /user-locations เดิมนับ)
    scope: "mine",
    serverFilter: { location_type: locationTypes },
    selectedIds: value ? [value] : [],
    filter: excludeIds ? (l) => !excludeIds.has(l.id) : undefined,
  });
```

combobox: `getLabel={lookupCodeName}`

- [ ] **Step 3: caller**

```bash
bun run typecheck 2>&1 | grep "error TS" | head -40
```

กติกา:
- `pd-tab-locations.tsx:213` `loc.is_active` → `loc.status === "active"`
- `loc.name` / `location.name` / `location.code` ที่ลง `string` → `?? ""` (เช่น `transaction-component.tsx:210` `setLocationLabel(loc.name ?? "")`, `grn-item-cells/location-cell.tsx:63`, `pr-item-cells/location-cell.tsx:105`)
- caller ที่ประกาศ type `Location` ของ callback ตรง ๆ → `LocationLookup` (import type จาก `@/types/lookup`)
- `delivery_point?.id ?? null` / `delivery_point?.name ?? ""` ใช้ได้เหมือนเดิม — ไม่ต้องแก้

รันซ้ำจนสะอาด

- [ ] **Step 4: lint + เทสต์เดิม**

```bash
bunx eslint components/lookup/lookup-location.tsx components/lookup/lookup-user-location.tsx $(git diff --name-only -- routes)
bun test:run > $TMPDIR/lookup-t8-test.txt 2>&1; tail -5 $TMPDIR/lookup-t8-test.txt
```

Expected: สะอาด · เทสต์ผ่าน

- [ ] **Step 5: Commit**

```bash
git add components/lookup/lookup-location.tsx components/lookup/lookup-user-location.tsx $(git diff --name-only -- routes)
git commit -m "refactor(lookup): ย้าย lookup คลัง (ทั้ง BU และของ user) ไปใช้ Lookup API พร้อม location_type และจุดส่งของ"
```

### Task 9: ตรวจในเบราว์เซอร์กับ backend local + PR

ต้องมี backend ของส่วน A รันที่ `:4000` และ FE `VITE_DEV_PROXY_TARGET=http://localhost:4000 bun dev` · login admin@zebra.com BU T02 · **อ่านอย่างเดียว ห้ามกด Save**

- [ ] **Step 1: เปิด network panel แล้วตรวจทีละจุด**

| หน้า | ทำ | Expected |
|---|---|---|
| PO ใหม่ | เลือก vendor → currency, credit term · แถว item เลือก tax profile | request `lookup/currency`, `lookup/credit_term`, `lookup/tax_profile` 200 · exchange rate ขึ้นในช่อง · วันครบกำหนดคำนวณ · rate ภาษีขึ้น |
| PR ใหม่ | แถว item เลือกคลัง (user-location) และ currency | `lookup/location?…scope=mine` · ช่อง delivery point เติมเอง · ทศนิยมตาม currency |
| Product edit (สินค้าที่มีหมวด) | เปิด sub-category | `lookup/product_sub_category?…filter=product_category_id:<uuid>` · รายการเป็นของหมวดนั้น · tab Locations เลือกคลัง → `scope=all` |
| Physical count / transaction | เปิด location ที่ส่ง `locationTypes` | `filter=location_type:inventory` (ไม่มี `|enum`) |
| Workflow stage notifications | เปิด template | `filter=type:app` |
| Price list item | เปิด product | `lookup/product` · ไม่มีสินค้า inactive/discontinued (เทียบกับจำนวนจาก Task 4 Step 3) |
| Recipe category ใหม่ | เลือก parent | ช่อง level = level แม่ + 1 |

- [ ] **Step 2: หน้า edit ที่มีค่าเดิม** — เปิด PO/PR ที่มีอยู่แล้ว: ป้าย currency/credit term/location ขึ้นจาก `?ids=` และ console ไม่มี `missing … backend older`

- [ ] **Step 3: push + PR (ถาม user ก่อน)**

```bash
git push -u origin feature/lookup-endpoint-phase2
gh pr create --base feature/lookup-endpoint --title "refactor(lookup): migrate remaining 9 lookups to the Lookup API (phase 2)" --body "<English: depends on backend PR (link) and stacks on #257; lists the 9 lookups, serverFilter, extra-field guard, caller defaults, browser checks from Step 1–2; deploy: backend first; merging #257 must not use --delete-branch>"
```

- [ ] **Step 4: อัปเดต memory** `lookup-api-migration.md` — เลข PR ทั้งสอง, product ย้ายแล้ว, ลำดับ deploy, สิ่งที่ยังไม่ได้ตรวจ
