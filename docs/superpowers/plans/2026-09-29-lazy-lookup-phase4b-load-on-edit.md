# Lazy lookup ช่วง 4b — หน้าดูไม่โหลดทะเบียนทั้งก้อน Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** หน้าดู location / department / price-list-template ไม่ดึงผู้ใช้หรือสินค้าทั้งทะเบียนอีก — โหลดทั้งก้อนเฉพาะโหมดแก้ไข/เพิ่ม และลบ `useAllUsers` / `useAllProducts`

**Architecture:** backend เติม `local_name` + `inventory_unit` ลงแต่ละแถวของ `product_location` (GET location by id) · FE ใช้ `useUserAll` / `useProductAll` (crud `useListAll` จาก 4a) ด้วย `enabled: !isView` · อีเมลในหน้าดูดึงตาม `user_id` ผ่าน `useEntitiesByIds`

**Tech Stack:** FE: Vite + React 19 (React Compiler), TanStack Query v5, vitest, bun · BE: NestJS monorepo (`apps/micro-business`, `apps/backend-gateway`), Prisma, zod, jest

**Spec:** `docs/superpowers/specs/2026-09-29-lazy-lookup-phase4b-load-on-edit-design.md`

## Global Constraints

- **ห้ามเขียนเทสต์ใหม่ / ห้ามสร้างไฟล์ `*.test.ts(x)` หรือ `*.spec.ts`** (preference ของ user) — ข้ามทุกขั้น TDD · เทสต์เดิมต้องผ่าน ถ้าต้องแก้ mock ให้ตรงโมดูลใหม่ได้ แต่ห้ามลบ assertion
- FE repo: `/Users/samutpra/GitHub/carmensoftware-organize/carmen-inventory-frontend-react` branch `feature/lazy-lookup-phase4b` · gate: `bun run typecheck` · `bun run lint` 0 error · `bun test:run` (ห้าม `bun test` = watch)
- BE repo: `/Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2` branch `feature/location-product-local-name-unit` (แตกจาก `main`) · gate: `npx tsc --noEmit -p apps/micro-business/tsconfig.json` · `npx tsc --noEmit -p apps/backend-gateway/tsconfig.json` · jest ของไฟล์ spec locations (ห้าม `bun test` ใน backend)
- เพิ่มฟิลด์ใน response ของ backend ต้องแก้ **ทั้ง** schema ฝั่ง micro และ `@Serialize` schema ฝั่ง gateway ไม่งั้น gateway ตัดทิ้ง
- ห้ามเขียน DB · ห้าม push / merge (controller ทำเอง)
- module boundary (ESLint FE): `routes/<A>` ห้าม import `routes/<B>` · `components/ hooks/ lib/ constant/ types/` ห้าม import `routes/`
- users ห้ามส่ง `is_active` · ทะเบียนผู้ใช้ใช้ `user_id` เป็น id (`idFilterKey: "user_id"`)
- commit message ภาษาไทย รูป `<type>(<scope>): <ข้อความ>`
- React Compiler อยู่ — ไม่ต้องใส่ `useMemo`/`useCallback` ใหม่

## Review Focus

1. location-form ย้าย hook ไปหลัง `useEntityForm` แล้วมีตัวแปรที่ถูกใช้ก่อนประกาศ (TDZ) หรือ hook ถูกเรียกแบบมีเงื่อนไข → หน้าพัง · คาดหวัง: ลำดับ hook คงที่ทุก render (Task 2)
2. สลับ view → edit (กด Edit) ต้องยิงโหลดทะเบียนทันทีและ Transfer/ต้นไม้ขึ้นครบ · กด Cancel กลับ view ต้องไม่ error (Task 2, 3)
3. หน้าเพิ่มใหม่ (`isAdd`) ต้องโหลดทะเบียน (ไม่ใช่ view) และไม่ยิง by-id ด้วย ids ว่าง (Task 2, 3)
4. backend: สินค้าที่ `tb_unit` เป็น null / ไม่มี `local_name` → ต้องได้ `null` ไม่ throw และ zod parse ผ่าน (Task 1)
5. mock ในเทสต์ที่แทนทั้งโมดูล `@/hooks/use-user` / `@/hooks/use-product` แล้ว component ลูกที่ import export อื่นของโมดูลนั้นพัง → ใช้ `importOriginal` spread (Task 2, 3)

ตรวจทั้งห้าข้อด้วย typecheck + เทสต์เดิม + อ่านโค้ด + browser check ของ user

---

### Task 1: backend — `product_location` มี `local_name` + `inventory_unit`

**Files (repo `carmen-turborepo-backend-v2`):**
- Modify: `apps/micro-business/src/master/locations/locations.service.ts` (`findOne`, ~:161-184)
- Modify: `apps/micro-business/src/master/locations/dto/location.serializer.ts` (`ProductLocationEmbeddedSchema`, ~:21-32)
- Modify: `apps/backend-gateway/src/common/dto/location/location.serializer.ts` (`ProductLocationEmbeddedSchema`, ~:21-32)
- Modify: `apps/backend-gateway/src/config/config_locations/config_locations.controller.ts` (swagger description ~:91)

**Interfaces:**
- Produces: `GET /api/config/:bu/locations/:id` → แต่ละแถว `product_location` มีเพิ่ม `local_name: string | null` และ `inventory_unit: { id: string; name: string | null } | null`

- [ ] **Step 1: แตก branch** — `cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2 && git checkout main && git pull --ff-only && git checkout -b feature/location-product-local-name-unit` (ถ้า working tree ไม่สะอาด ให้หยุดและรายงาน)

- [ ] **Step 2: micro service** — ใน `locations.service.ts` แก้ `select` ของ `tb_product.findMany` และ map:

```ts
            const products = await this.prismaService.tb_product.findMany({
              where: { id: { in: productIds } },
              select: {
                id: true,
                name: true,
                code: true,
                local_name: true,
                inventory_unit_id: true,
                inventory_unit_name: true,
                tb_unit: { select: { name: true } },
              },
            });
            const productMap = new Map(products.map((p) => [p.id, p]));
            productLocation = plItems.map((pl: any) => {
              const info = productMap.get(pl.product_id);
              return {
                id: pl.product_id,
                name: info?.name ?? null,
                code: info?.code ?? null,
                local_name: info?.local_name ?? null,
                // รูปเดียวกับ products.service findOne — ชื่อจาก relation ก่อน fallback ค่าที่ denormalize ไว้
                inventory_unit: info
                  ? {
                      id: info.inventory_unit_id,
                      name: info.tb_unit?.name ?? info.inventory_unit_name ?? null,
                    }
                  : null,
                shelf_id: pl.shelf_id ?? null,
                shelf_code: pl.shelf_code ?? null,
                shelf_name: pl.shelf_name ?? null,
                min_qty: pl.min_qty != null ? Number(pl.min_qty) : null,
                max_qty: pl.max_qty != null ? Number(pl.max_qty) : null,
                re_order_qty: pl.re_order_qty != null ? Number(pl.re_order_qty) : null,
                par_qty: pl.par_qty != null ? Number(pl.par_qty) : null,
              };
            });
```
(ถ้าชื่อ relation / ฟิลด์ใน Prisma client ไม่ตรง — `tb_unit`, `local_name`, `inventory_unit_id`, `inventory_unit_name` ของ `tb_product` ใน `packages/prisma-shared-schema-tenant/prisma/schema.prisma` ~:1632-1677 — ให้ใช้ชื่อจริงแล้วรายงาน)

- [ ] **Step 3: schema ทั้งสองฝั่ง** — ใน `ProductLocationEmbeddedSchema` ของ **ทั้ง** `apps/micro-business/src/master/locations/dto/location.serializer.ts` และ `apps/backend-gateway/src/common/dto/location/location.serializer.ts` เพิ่มต่อจาก `code`:

```ts
  local_name: z.string().nullable().optional(),
  inventory_unit: z
    .object({ id: z.string(), name: z.string().nullable().optional() })
    .nullable()
    .optional(),
```

- [ ] **Step 4: swagger** — ใน description ของ `@ApiOperation` ของ `findOne` (`config_locations.controller.ts` ~:91) ต่อประโยคหลัง `(shelf_id, shelf_code, shelf_name)` ด้วย ` plus its local_name and inventory_unit ({id, name}).` (ภาษาอังกฤษ ไม่แตะส่วนภาษาไทย)

- [ ] **Step 5: gate**

```bash
npx tsc --noEmit -p apps/micro-business/tsconfig.json
npx tsc --noEmit -p apps/backend-gateway/tsconfig.json
cd apps/micro-business && npx jest src/master/locations && cd ../..
cd apps/backend-gateway && npx jest src/config/config_locations && cd ../..
```
ทั้งหมดต้องผ่าน (ถ้า tsc ฟ้อง error ที่ไม่เกี่ยวกับไฟล์ที่แก้และมีอยู่ก่อนบน `main` ให้รายงานพร้อมหลักฐาน ไม่ต้องแก้)

- [ ] **Step 6: commit** (ห้าม push)

```bash
git add apps/micro-business/src/master/locations/locations.service.ts apps/micro-business/src/master/locations/dto/location.serializer.ts apps/backend-gateway/src/common/dto/location/location.serializer.ts apps/backend-gateway/src/config/config_locations/config_locations.controller.ts
git commit -m "feat(location): product_location ใน GET location คืน local_name และ inventory_unit ให้หน้าดูไม่ต้องดึงสินค้าทั้งทะเบียน"
```

---

### Task 2: FE location-form — โหลดทั้งก้อนเฉพาะตอนแก้ไข หน้าดูใช้ payload + อีเมลตาม id

**Files (repo FE):**
- Modify: `types/location.ts:18-26` (`ProductLocation`)
- Modify: `routes/config/location/location-form.tsx` (imports ~:34-35, block ~:78-124 ย้ายไปหลัง ~:151)
- Modify: `routes/config/location/location-form.characterization.test.tsx:30-35` (mock)

**Interfaces:**
- Consumes (4a, มีแล้ว): `useUserAll(params?, options?)` จาก `@/hooks/use-user` → `UseQueryResult<User[]>` · `useProductAll(params?, options?)` จาก `@/hooks/use-product` → `UseQueryResult<ProductDetail[]>` (`ProductDetail extends Product`) · `useEntitiesByIds({ useListHook, ids, idFilterKey?, enabled? })` จาก `@/hooks/use-entities-by-ids` → `{ items: T[], isLoading }` (จำกัด 100 id) · `useUser` จาก `@/hooks/use-user` · `CACHE_NORMAL` จาก `@/lib/cache-config`
- Consumes (Task 1): `product_location[i].local_name`, `product_location[i].inventory_unit`

- [ ] **Step 1: type** — `types/location.ts` `ProductLocation` เพิ่มต่อจาก `code`:

```ts
  /** จาก backend (GET location by id) — ก่อน backend deploy จะไม่มี */
  local_name?: string | null;
  inventory_unit?: { id: string; name?: string | null } | null;
```

- [ ] **Step 2: imports** — ลบ `import { useAllUsers } from "@/hooks/use-all-users";` และ `import { useAllProducts } from "@/hooks/use-all-products";` · เพิ่ม:

```ts
import { useUser, useUserAll } from "@/hooks/use-user";
import { useProductAll } from "@/hooks/use-product";
import { useEntitiesByIds } from "@/hooks/use-entities-by-ids";
import { CACHE_NORMAL } from "@/lib/cache-config";
```
(ถ้า `@/hooks/use-user` ไม่ได้ export `useUser` ในชื่อนี้ ให้ใช้ชื่อ list hook จริงของไฟล์นั้น)

- [ ] **Step 3: ย้ายและแก้ block** — ตัด block ตั้งแต่ `const { data: allUsers = [], isLoading: isLoadingUsers } = useAllUsers();` จนจบ `const enrichedProducts = (() => { ... })();` ออกจากตำแหน่งเดิม แล้ววางใหม่ **ต่อจาก** `const { form, isView, isAdd, isEdit, isDisabled } = f;` เป็น:

```ts
  // ทะเบียนทั้งก้อนใช้แค่ Transfer / ต้นไม้ตอนแก้ไขหรือเพิ่ม — หน้าดูใช้ข้อมูลใน payload
  // ของ location และดึงอีเมลเฉพาะผู้ใช้ของ location นี้ตาม id
  const { data: allUsers = [], isLoading: isLoadingUsers } = useUserAll(
    undefined,
    { ...CACHE_NORMAL, enabled: !isView },
  );
  const { data: allProducts = [], isLoading: isLoadingProducts } =
    useProductAll(undefined, { enabled: !isView });
  const { items: viewUsers } = useEntitiesByIds({
    useListHook: useUser,
    ids: location?.user_location.map((u) => u.id) ?? [],
    idFilterKey: "user_id",
    enabled: isView,
  });

  const userSource: TransferItem[] = allUsers.map((user) => ({
    key: user.user_id,
    title: `${user.firstname} ${user.lastname}`,
  }));

  const enrichedUsers = (() => {
    if (!location) return [];
    const emailMap = new Map(viewUsers.map((u) => [u.user_id, u.email]));
    const seen = new Set<string>();
    return location.user_location
      .filter((u) => {
        if (seen.has(u.id)) return false;
        seen.add(u.id);
        return true;
      })
      .map((u) => ({
        ...u,
        email: emailMap.get(u.id) ?? "",
      }));
  })();

  // local_name / inventory_unit มากับ product_location แล้ว (backend) — ไม่ต้อง join ทะเบียนสินค้า
  const enrichedProducts = (() => {
    if (!location) return [];
    const seen = new Set<string>();
    return location.product_location.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  })();
```
ตรวจว่าระหว่างตำแหน่งเดิมกับ `f` ไม่มีโค้ดอื่นอ้าง `allUsers` / `allProducts` / `userSource` / `enriched*` (ถ้ามี ให้ย้ายตามมาด้วย ห้ามเรียก hook แบบมีเงื่อนไข) · ส่วน render (UserTable / Transfer / ProductTable / TreeProductLookup) ไม่เปลี่ยน

- [ ] **Step 4: mock ในเทสต์** — `location-form.characterization.test.tsx` แทนสอง `vi.mock` ของ `@/hooks/use-all-users` / `@/hooks/use-all-products` ด้วย:

```ts
vi.mock("@/hooks/use-user", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/hooks/use-user")>()),
  useUser: () => ({ data: undefined, isLoading: false }),
  useUserAll: () => ({ data: [], isLoading: false }),
}));
vi.mock("@/hooks/use-product", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/hooks/use-product")>()),
  useProductAll: () => ({ data: [], isLoading: false }),
}));
```

- [ ] **Step 5: gate** — `bun run typecheck && bun run lint && bun test:run routes/config/location` แล้ว `bun test:run` ทั้งชุด

- [ ] **Step 6: commit**

```bash
git add types/location.ts routes/config/location/location-form.tsx routes/config/location/location-form.characterization.test.tsx
git commit -m "refactor(location): หน้าดูไม่ดึงผู้ใช้/สินค้าทั้งทะเบียน ใช้ local_name/หน่วยจาก payload และอีเมลตาม id · Transfer/ต้นไม้โหลดเฉพาะตอนแก้ไข"
```

---

### Task 3: FE department-form + plt-item-fields + ลบ `useAllUsers` / `useAllProducts`

**Files (repo FE):**
- Modify: `routes/config/department/department-form.tsx` (import ~:29, block ~:64-94 ย้ายไปหลัง ~:141)
- Modify: `routes/config/department/department-form.characterization.test.tsx:28-30`
- Modify: `routes/vendor-management/price-list-template/plt-item-fields.tsx` (import :11, :46-47)
- Modify: `routes/vendor-management/price-list-template/plt-form.characterization.test.tsx:27-32`
- Delete: `hooks/use-all-users.ts`, `hooks/use-all-products.ts`

**Interfaces:**
- Consumes: เหมือน Task 2 (`useUserAll`, `useProductAll`, `useEntitiesByIds`, `useUser`, `CACHE_NORMAL`)

- [ ] **Step 1: department-form imports** — ลบ `import { useAllUsers } from "@/hooks/use-all-users";` · เพิ่ม `useUser, useUserAll` จาก `@/hooks/use-user`, `useEntitiesByIds` จาก `@/hooks/use-entities-by-ids`, `CACHE_NORMAL` จาก `@/lib/cache-config` (ถ้ามี import จากโมดูลเหล่านี้อยู่แล้วให้รวมบรรทัด)

- [ ] **Step 2: department-form ย้ายและแก้ block** — ตัดตั้งแต่ comment `// Fetch all users for Transfer` จนจบ `const enrichedHodUsers = ...;` แล้ววางใหม่ต่อจาก `const { form, isView, isAdd, isEdit, isDisabled } = f;` เป็น:

```ts
  // ผู้ใช้ทั้งทะเบียนใช้แค่ Transfer ตอนแก้ไขหรือเพิ่ม — หน้าดูดึงอีเมลเฉพาะคนในแผนกนี้ตาม id
  const { data: allUsers = [], isLoading: isLoadingUsers } = useUserAll(
    undefined,
    { ...CACHE_NORMAL, enabled: !isView },
  );

  // Department users source: users without department + users already in this department
  const currentDeptUserIds = new Set(
    department?.department_users.map((u) => u.user?.id ?? "") ?? [],
  );
  const departmentUserSource: TransferItem[] = allUsers
    .filter(
      (user) => !user.department?.id || currentDeptUserIds.has(user.user_id),
    )
    .map((user) => ({
      key: user.user_id,
      title: `${user.firstname} ${user.lastname}`,
    }));

  // HOD users source: all users (no filter)
  const hodUserSource: TransferItem[] = allUsers.map((user) => ({
    key: user.user_id,
    title: `${user.firstname} ${user.lastname}`,
  }));

  const viewUserIds = [
    ...new Set(
      [...(department?.department_users ?? []), ...(department?.hod_users ?? [])]
        .map((u) => u.user?.id ?? "")
        .filter(Boolean),
    ),
  ];
  const { items: viewUsers } = useEntitiesByIds({
    useListHook: useUser,
    ids: viewUserIds,
    idFilterKey: "user_id",
    enabled: isView,
  });
  const emailMap = new Map(viewUsers.map((u) => [u.user_id, u.email]));
  const enrichedDeptUsers = (department?.department_users ?? []).map((u) => ({
    ...u,
    email: emailMap.get(u.user?.id ?? "") ?? "",
  }));
  const enrichedHodUsers = (department?.hod_users ?? []).map((u) => ({
    ...u,
    email: emailMap.get(u.user?.id ?? "") ?? "",
  }));
```
ตรวจว่า state `deptUserTargetKeys` / `hodUserTargetKeys` (ประกาศก่อน `f`) ไม่อ้างตัวแปรที่ย้าย — ของเดิมใช้แค่ `department` จึงคงไว้ที่เดิม · ห้ามเรียก hook แบบมีเงื่อนไข · render ไม่เปลี่ยน

- [ ] **Step 3: department mock** — `department-form.characterization.test.tsx` แทน `vi.mock("@/hooks/use-all-users", ...)` ด้วย:

```ts
vi.mock("@/hooks/use-user", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/hooks/use-user")>()),
  useUser: () => ({ data: undefined, isLoading: false }),
  useUserAll: () => ({ data: [], isLoading: false }),
}));
```

- [ ] **Step 4: plt-item-fields** — แทน import `useAllProducts` ด้วย `import { useProductAll } from "@/hooks/use-product";` (รวมกับ import เดิมจากโมดูลนี้ถ้ามี) และ:

```ts
  // ต้นไม้ใช้เฉพาะตอนแก้ไข/เพิ่ม — หน้าดูใช้ PltItemGroupedView จากข้อมูลของ template
  const { data: allProducts = [], isLoading: productsLoading } = useProductAll(
    undefined,
    { enabled: !isView },
  );
```

- [ ] **Step 5: plt mock** — `plt-form.characterization.test.tsx` แทน `vi.mock("@/hooks/use-all-products", ...)` ด้วย (คงข้อมูลเดิม):

```ts
vi.mock("@/hooks/use-product", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/hooks/use-product")>()),
  useProductAll: () => ({
    data: [{ id: "prod-1", code: "P001", name: "Tomato" }],
    isLoading: false,
  }),
}));
```
(ถ้าเทสต์เดิมต้องการ field อื่นใน object mock เดิม ให้คงไว้ทั้งหมด — คัดลอกค่าจาก mock เดิมมาทั้งก้อน)

- [ ] **Step 6: ลบ hook เก่า** — `git rm hooks/use-all-users.ts hooks/use-all-products.ts` แล้วตรวจ:

```bash
grep -rn "use-all-users\|use-all-products\|useAllUsers\|useAllProducts" components hooks routes lib types constant
```
ต้องว่าง

- [ ] **Step 7: gate** — `bun run typecheck && bun run lint && bun test:run` ทั้งชุด

- [ ] **Step 8: commit**

```bash
git add -A routes/config/department routes/vendor-management/price-list-template hooks/use-all-users.ts hooks/use-all-products.ts
git commit -m "refactor(lookup): department/plt หน้าดูไม่ดึงผู้ใช้/สินค้าทั้งทะเบียน โหลดเฉพาะตอนแก้ไข และลบ useAllUsers/useAllProducts"
```

---

## หลังทุก task (controller)

- BE: push branch + PR (English) ระบุว่าต้อง deploy ก่อน FE · FE: PR (English) ต่อจาก #201 (base = `feature/lazy-lookup-phase4` จนกว่า #201 merge) พร้อม checklist spec §4
- ตรวจในเบราว์เซอร์ตาม spec §4 (user) — ต้องรัน backend branch ในเครื่อง
