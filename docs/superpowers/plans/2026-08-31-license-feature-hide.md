# ซ่อนโมดูลที่เลิกขาย (`state = hide`) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ตั้ง license feature เป็น `state = 'hide'` ที่หน้าแอดมินแล้วโมดูลนั้นหายจากแอปจริง — ไม่อยู่ในเมนู ไม่อยู่ใน command palette ไม่เป็นหน้า landing และเข้าทาง URL ตรงแล้วเด้งออกเงียบ ๆ

**Architecture:** gateway อ่านคีย์ที่ `state = 'hide'` จาก `tb_license_feature` (ค่า global ตัวเดียวทั้งระบบ, cache 60 วิ) แล้วทำสองอย่างกับ license block ของทุก BU: **ตัด**คีย์เหล่านั้นออกจาก `features[]` (ได้ backstop และได้ 403 ฟรีเมื่อเปิด `LICENSE_ENFORCEMENT`) และ **ส่ง** `hidden_features[]` เพิ่มมาด้วย FE ใช้ `hidden_features` แยก "ซ่อน" ออกจาก "ไม่ได้ซื้อ" แล้วตัด node ออกจาก tree ที่ `useVisibleModules()` ซึ่งเป็นทางผ่านเดียวของทุกที่ที่ render เมนู

**Tech Stack:** NestJS + Prisma (gateway) · React 19 + React Router 7 + Vite (FE) · TypeScript ทั้งสองฝั่ง

**Spec:** `docs/superpowers/specs/2026-08-31-license-feature-hide-design.md`

## Global Constraints

- **ไม่เขียน automated test** ตาม working preference ของผู้ใช้ — ห้ามสร้างไฟล์ `*.test.ts` / `*.spec.ts` ใหม่ และห้ามทำขั้นตอน "เขียนเทสต์ที่ fail ก่อน" ทุกกรณี **แต่ static check ไม่ใช่เทสต์ — ยังต้องรันให้เขียว** และ **test suite เดิมที่มีอยู่ต้องไม่แดง**
- **fail-open เสมอ** — อ่านแค็ตตาล็อกไม่สำเร็จ หรือ `hidden_features` ไม่มีมา = ซ่อน **0 คีย์** ห้ามซ่อนทั้งหมด
- **`isHidden` ห้ามผูกกับสวิตช์ `LICENSE_ENFORCEMENT`** ต่างจาก `isLicensed`/`canWrite` (สวิตช์ปิดอยู่ทุก environment ถ้าผูกจะไม่มีผลเลยสักที่)
- **`hidden_features` เป็นลิสต์ global** เหมือนกันทุก BU ไม่ใช่ intersection กับของที่ BU ซื้อ
- ห้ามคำนวณ license feature key เอง — ใช้ `licenseFeatureOf(mod)` ที่มีอยู่เท่านั้น (namespace ของ permission กับของ license ไม่ตรงกัน)
- ภาษาใน commit message: **ภาษาไทย** · คอมเมนต์ในโค้ด: ภาษาไทย (ฝั่ง gateway ใส่บรรทัดอังกฤษกำกับตามแบบไฟล์นั้น ๆ)
- ลำดับ merge/deploy: **backend ก่อน frontend เสมอ**

---

## File Structure

**`carmen-turborepo-backend-v2`** (path เต็ม: `/Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2`)

| ไฟล์ | หน้าที่หลังแก้ |
|---|---|
| `apps/backend-gateway/src/license/license.types.ts` | ถือรูปของ `BuLicense` — เพิ่ม `hidden_features` |
| `apps/backend-gateway/src/license/license.service.ts` | อ่าน+cache คีย์ที่ซ่อน, ตัดออกจาก `features[]`, ใส่ `hidden_features` ทุกสาขา |
| `apps/backend-gateway/src/application/user/user.service.ts` | default object 2 จุดของ license block ต้องมีฟิลด์ใหม่ |
| `apps/backend-gateway/src/common/dto/user/user.serializer.ts` | ประกาศฟิลด์ใหม่ใน zod schema ไม่งั้น `@Serialize` กินทิ้ง |

**`carmen-inventory-frontend-react`** (รีโปปัจจุบัน)

| ไฟล์ | หน้าที่หลังแก้ |
|---|---|
| `types/profile.ts` | `BusinessUnitLicense.hidden_features?: string[]` |
| `hooks/use-license.ts` | `isHidden(featureKey)` — ไม่ผ่าน bypass แต่ fail-open |
| `hooks/use-visible-modules.ts` | ตัด node ที่ซ่อนออกจาก tree (จุดคอขวดจุดเดียว) |
| `components/route-guard.tsx` | deep link ไปหน้าที่ซ่อน → `<Navigate replace>` |

---

## Task 1: gateway อ่านคีย์ที่ซ่อนและตัดออกจาก `features[]`

**รีโป:** `carmen-turborepo-backend-v2` — ทำงานในรีโปนี้ ไม่ใช่รีโปปัจจุบัน

**Files:**
- Modify: `apps/backend-gateway/src/license/license.types.ts` (interface `BuLicense`)
- Modify: `apps/backend-gateway/src/license/license.service.ts:41-45` (ประกาศ cache), `:168` (สาขา error), `:196-205` (ประกอบผลลัพธ์)

**Interfaces:**
- Consumes: ไม่มี (งานแรก)
- Produces: `BuLicense.hidden_features: string[]` — Task 2 ใช้ต่อ · `LicenseService.resolveBatch()` ยังคง signature เดิม `(buIds: string[], now?: Date) => Promise<Record<string, BuLicense>>`

- [ ] **Step 1: สร้าง branch**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2
git checkout main && git pull
git checkout -b feature/license-feature-hide-runtime
```

- [ ] **Step 2: เพิ่มฟิลด์ใน `BuLicense`**

ใน `apps/backend-gateway/src/license/license.types.ts` ต่อท้าย field `features` ของ `interface BuLicense`:

```ts
  /** feature key ที่อยู่ในสัญญา รวมทั้ง module ระดับบนและ resource ระดับล่าง */
  features: string[];
  /**
   * feature key ที่ผู้ดูแลปลดระวางแล้ว (`tb_license_feature.state = 'hide'`)
   *
   * เป็น **ลิสต์ global เดียวกันทุก BU** ไม่ใช่ intersection กับของที่ BU นี้ซื้อ โดยเจตนา —
   * ของที่เลิกขายแล้วต้องไม่โผล่เป็น "ล็อกอยู่ ซื้อสิ" ให้ BU ที่ไม่เคยซื้อเห็นด้วย
   *
   * คีย์เหล่านี้ **ถูกตัดออกจาก `features` ไปแล้ว** — ส่งมาด้วยเพื่อให้ FE แยก "ซ่อน" ออกจาก
   * "ไม่ได้ซื้อ" ได้ ไม่ใช่เพื่อให้เอาไปตัดสินสิทธิ์ซ้ำอีกชั้น
   *
   * A platform-wide list, identical for every BU — not an intersection with what this BU bought.
   * These keys have already been subtracted from `features`; they travel along only so the UI can
   * tell "retired" apart from "not purchased".
   */
  hidden_features: string[];
```

- [ ] **Step 3: เพิ่ม cache ของคีย์ที่ซ่อน**

ใน `apps/backend-gateway/src/license/license.service.ts` ต่อจากบรรทัด `private enforcementCache: ...` (บรรทัด 43):

```ts
  /**
   * cache ของ resolveHiddenKeys — ค่า **global ตัวเดียวทั้งระบบ** ไม่ขึ้นกับ BU จึงไม่ใช่ Map
   * ต่างจาก licenseCache/seatCache/buQuotaCache ที่ key ด้วย id TTL เดียวกัน (60 วิ)
   * Cache for resolveHiddenKeys — one system-wide value, so a scalar rather than a Map.
   */
  private hiddenCache: { value: string[]; expiresAt: number } | null = null;
```

- [ ] **Step 4: เพิ่มเมธอด `resolveHiddenKeys`**

ใส่ไว้ใต้เมธอด `resolveBatch` (ก่อน `beatsCurrentBest`) ในไฟล์เดียวกัน:

```ts
  /**
   * คีย์ที่ผู้ดูแลปลดระวางแล้ว — อ่านจาก `tb_license_feature.state = 'hide'`
   *
   * ตารางนี้ไม่เคยอยู่บนเส้นทางตัดสินสิทธิ์มาก่อน (evaluateLicense อ่าน features[] อย่างเดียว)
   * การอ่านตรงนี้จึงเป็นของใหม่ทั้งหมด และเกิดเฉพาะตอน licenseCache miss เท่านั้น
   *
   * **fail-open เสมอ** — อ่านไม่สำเร็จคืน `[]` (ซ่อน 0 คีย์) ไม่ใช่ซ่อนทั้งหมด หลักการเดียวกับ
   * `'unresolved'` ของ resolveBatch: การอ่าน DB ล้มครั้งเดียวต้องไม่กลายเป็นเมนูว่างเปล่าของ
   * ทั้งระบบ และ **ไม่ cache ผลของสาขา error** ไม่งั้นความล้มเหลวชั่วคราวจะค้างอีก 60 วินาที
   * Always fails open: a failed read hides nothing, and the failure is never cached.
   *
   * @param nowMs - เวลาอ้างอิงเป็น ms ใช้ร่วมกับ resolveBatch ให้ TTL คิดจากฐานเดียวกัน
   * @returns feature key ที่ถูกซ่อน เรียงตัวอักษร / Hidden feature keys, sorted
   */
  private async resolveHiddenKeys(nowMs: number): Promise<string[]> {
    if (this.hiddenCache && this.hiddenCache.expiresAt > nowMs) return this.hiddenCache.value;
    try {
      const rows = await this.prismaSystem.tb_license_feature.findMany({
        where: { deleted_at: null, state: 'hide' },
        select: { key: true },
      });
      const value = rows.map((r: { key: string }) => r.key).sort();
      this.hiddenCache = { value, expiresAt: nowMs + CACHE_TTL_MS };
      return value;
    } catch (error) {
      this.logger.error(
        'อ่าน tb_license_feature ไม่สำเร็จ — ไม่ซ่อนคีย์ใดเลย (ไม่ cache ผลนี้)',
        error,
      );
      return [];
    }
  }
```

- [ ] **Step 5: เติมฟิลด์ในสาขา error ของ `resolveBatch`**

ที่บรรทัด 168 เดิม `out[id] = { state: 'unresolved', end_date: null, features: [] };` เปลี่ยนเป็น:

```ts
        out[id] = { state: 'unresolved', end_date: null, features: [], hidden_features: [] };
```

- [ ] **Step 6: ตัดคีย์ที่ซ่อนตอนประกอบผลลัพธ์**

แทนที่ลูป `for (const id of missing) { ... }` ตัวสุดท้ายของ `resolveBatch` (บรรทัด ~196-205) ด้วย:

```ts
    // ดึงครั้งเดียวนอกลูป — เป็นค่า global ทุก BU ใช้ก้อนเดียวกัน และเรียกที่นี่ (ไม่ใช่หัวเมธอด)
    // เพื่อไม่ให้ยิง query นี้ตอน cache hit ครบทุก BU ซึ่ง return ไปตั้งแต่ต้นเมธอดแล้ว
    const hiddenKeys = await this.resolveHiddenKeys(nowMs);
    const hidden = new Set(hiddenKeys);

    for (const id of missing) {
      const hit = best.get(id);
      const value: BuLicense = hit
        ? {
            state: hit.state,
            end_date: hit.end.toISOString(),
            // ตัดของที่ปลดระวางออกจากสิทธิ์จริง — evaluateLicense จะตอบ LICENSE_REQUIRED เอง
            // เมื่อเปิด enforcement โดยไม่ต้องแก้ตัวมันเลย
            features: [...hit.features].filter((k) => !hidden.has(k)).sort(),
            hidden_features: hiddenKeys,
          }
        : { state: 'none', end_date: null, features: [], hidden_features: hiddenKeys };
      this.licenseCache.set(id, { value, expiresAt: nowMs + CACHE_TTL_MS });
      out[id] = value;
    }
```

- [ ] **Step 7: typecheck / build**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2
bunx turbo run build --filter=backend-gateway
```

Expected: build ผ่าน

**ถ้า tsc ฟ้องว่า `state` ไม่มีใน where input ของ `tb_license_feature`** แปลว่า prisma client ที่ generate ไว้ยังเป็นรุ่นก่อนคอลัมน์ `state` — rebuild package ก่อน:

```bash
bunx turbo run build --filter=@repo/prisma-shared-schema-platform
```

- [ ] **Step 8: เทสต์เดิมของโมดูล license ต้องไม่แดง**

```bash
cd apps/backend-gateway && bunx jest src/license --silent
```

Expected: PASS ทั้งหมด (`license.service.spec.ts` · `license.evaluator.spec.ts` · `license.interceptor.spec.ts`)
ถ้าแดงเพราะ object literal ขาด `hidden_features` ให้เติม `hidden_features: []` ในไฟล์ spec ที่สร้าง `BuLicense` ขึ้นมาเอง — **แก้ให้คอมไพล์ผ่านเท่านั้น ห้ามเพิ่ม test case ใหม่**

- [ ] **Step 9: Commit**

```bash
git add apps/backend-gateway/src/license/
git commit -m "$(cat <<'EOF'
feat(license): ตัด feature ที่ปลดระวางออกจากสิทธิ์ และส่ง hidden_features มาด้วย

tb_license_feature.state ไม่เคยอยู่บนเส้นทางตัดสินสิทธิ์เลย — resolveBatch ประกอบ
features[] จาก subscription → group → group_item โดยไม่เคย join ตารางแค็ตตาล็อก
โมดูลที่ผู้ดูแลตั้ง hide จึงยังใช้งานได้ตามปกติทุกประการ

ทำสองอย่างพร้อมกันโดยตั้งใจ: ตัดคีย์ที่ซ่อนออกจาก features[] (evaluateLicense
จะตอบ LICENSE_REQUIRED ให้เองเมื่อเปิด enforcement ไม่ต้องแก้ตัวมัน) และส่ง
hidden_features[] มาด้วยเพื่อให้ FE แยก "ซ่อน" ออกจาก "ไม่ได้ซื้อ" ได้

fail-open ทุกทาง: อ่านแค็ตตาล็อกไม่สำเร็จ = ซ่อน 0 คีย์ และไม่ cache ความล้มเหลวนั้น
EOF
)"
```

---

## Task 2: ส่ง `hidden_features` ผ่าน `GET /api/user/profile`

**รีโป:** `carmen-turborepo-backend-v2` (branch เดิมจาก Task 1)

**Files:**
- Modify: `apps/backend-gateway/src/application/user/user.service.ts:110` (default เมื่อ resolve ไม่เจอ BU) และ `:124-131` (สาขา catch)
- Modify: `apps/backend-gateway/src/common/dto/user/user.serializer.ts:79-95` (`license` block ใน `UserBusinessUnitSchema`)

**Interfaces:**
- Consumes: `BuLicense.hidden_features: string[]` จาก Task 1
- Produces: `GET /api/user/profile` → `business_unit[].license.hidden_features?: string[]` — Task 3 ใช้ต่อ

- [ ] **Step 1: เติม default object ทั้งสองจุดใน `user.service.ts`**

จุดแรก (บรรทัด ~110) เปลี่ยนจาก
`...(licenses[bu.id] ?? { state: 'none' as const, end_date: null, features: [] }),` เป็น:

```ts
            ...(licenses[bu.id] ?? {
              state: 'none' as const,
              end_date: null,
              features: [],
              hidden_features: [],
            }),
```

จุดที่สอง (สาขา `catch` บรรทัด ~127) เติม `hidden_features` ต่อจาก `features`:

```ts
          license: {
            state: 'unresolved' as const,
            end_date: null,
            features: [],
            // ประกอบ block ไม่สำเร็จ = ยังไม่รู้อะไรเลย จึงไม่ซ่อนอะไรทั้งนั้น (fail-open)
            hidden_features: [],
            seat: { used: 0, cap: 0, pending_invites: 0 },
          },
```

- [ ] **Step 2: ประกาศฟิลด์ใน zod schema**

ใน `apps/backend-gateway/src/common/dto/user/user.serializer.ts` ต่อจากบรรทัด `features: z.array(z.string()),` ใน `license` block:

```ts
      features: z.array(z.string()),
      /**
       * คีย์ที่ปลดระวางแล้ว — ลิสต์ global เดียวกันทุก BU และถูกตัดออกจาก `features` ไปแล้ว
       * `.optional()` ไว้เพื่อให้ response ที่ประกอบจากทางอื่นไม่พังตอน validate ฝั่ง FE
       * ตีความ `undefined` ว่า "ไม่ซ่อนอะไร" อยู่แล้ว (fail-open)
       */
      hidden_features: z.array(z.string()).optional(),
```

> **ทำไมขั้นนี้ขาดไม่ได้:** `license` เป็น `z.object()` เปล่า ๆ **ไม่มี `.passthrough()`** (ต่างจาก `UserBusinessUnitSchema` ที่ครอบมันอยู่) zod จึงตัดคีย์ที่ไม่ได้ประกาศทิ้ง ลืมขั้นนี้แล้ว `GET /api/user/profile` จะตอบ 200 พร้อมข้อมูลที่หายไปโดยไม่มี error ให้เห็นสักบรรทัด และ FE จะดูเหมือน "ไม่ทำงาน" เฉย ๆ

- [ ] **Step 3: build**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2
bunx turbo run build --filter=backend-gateway
```

Expected: build ผ่าน

- [ ] **Step 4: ยืนยันด้วย API จริงว่าฟิลด์ออกมาจริง**

รัน gateway ที่ local (gateway :4000) แล้วยิง:

```bash
TOKEN="<access token ของ admin>"
curl -s http://localhost:4000/api/user/profile \
  -H "Authorization: Bearer $TOKEN" -H "x-app-id: <app id>" \
  | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print([{'bu':b.get('code'),'hidden':b.get('license',{}).get('hidden_features')} for b in d.get('business_unit',[])])"
```

Expected: ทุก BU มีคีย์ `hidden` เป็น list (ว่างได้ ถ้ายังไม่มี feature ไหนถูกตั้ง `hide`)
**ถ้าได้ `None` แปลว่า zod ใน Step 2 ยังกินฟิลด์ทิ้งอยู่ — กลับไปแก้ก่อนไปต่อ**

- [ ] **Step 5: Commit**

```bash
git add apps/backend-gateway/src/application/user/ apps/backend-gateway/src/common/dto/user/
git commit -m "$(cat <<'EOF'
feat(user-profile): ส่ง hidden_features ออกไปกับ license block

@Serialize(UserProfileResponseSchema) กินคีย์ที่ไม่ได้ประกาศทิ้งเงียบ ๆ เพราะ license
เป็น z.object() ที่ไม่มี .passthrough() การเพิ่มฟิลด์ใน BuLicense อย่างเดียวจึงไม่พอ
ต้องประกาศใน zod ด้วย ไม่งั้น GET ตอบ 200 พร้อมข้อมูลที่หายไปโดยไม่มี error

default object ทั้งสองจุดของ user.service (BU ที่ resolve ไม่เจอ และสาขา catch)
เติม hidden_features: [] ตามหลัก fail-open เดียวกัน
EOF
)"
```

- [ ] **Step 6: เปิด PR**

```bash
git push -u origin feature/license-feature-hide-runtime
gh pr create --title "feat(license): make catalog state=hide actually hide modules" --body "$(cat <<'EOF'
Catalog `state` never reached the runtime entitlement path: `resolveBatch` builds
`features[]` from subscription → group → group_item and never joins `tb_license_feature`.
A feature set to `hide` stayed fully usable in the app.

This subtracts hidden keys from `features[]` (so `evaluateLicense` returns
LICENSE_REQUIRED once enforcement is on, with no change to the evaluator) and also ships
`hidden_features[]` so the frontend can tell "retired" apart from "not purchased".

Fails open everywhere: a failed catalog read hides nothing and is never cached.

Spec: carmen-inventory-frontend-react/docs/superpowers/specs/2026-08-31-license-feature-hide-design.md
Deploy order: this PR must ship BEFORE the frontend one.

https://claude.ai/code/session_01CNjsoNfoEtnsioFLgeYxMb
EOF
)"
```

---

## Task 3: FE ตัดโมดูลที่ซ่อนออกจากเมนู

**รีโป:** `carmen-inventory-frontend-react` (รีโปปัจจุบัน)

**Files:**
- Modify: `types/profile.ts:67-73` (`BusinessUnitLicense`)
- Modify: `hooks/use-license.ts` (`LicenseInfo` + `resolveLicense`)
- Modify: `hooks/use-visible-modules.ts` (`annotate` · `markAll` · `useVisibleModules`)

**Interfaces:**
- Consumes: `business_unit[].license.hidden_features?: string[]` จาก Task 2
- Produces: `LicenseInfo.isHidden: (featureKey: string) => boolean` — Task 4 ใช้ต่อ · `annotate(modules, can, isLicensed, isHidden?)` และ `markAll(modules, isLicensed, isHidden?)` — พารามิเตอร์ตัวท้าย **optional** default `() => false`

- [ ] **Step 1: สร้าง branch**

```bash
cd /Users/samutpra/GitHub/carmensoftware-organize/carmen-inventory-frontend-react
git checkout main && git pull
git checkout -b feature/license-feature-hide
```

- [ ] **Step 2: เพิ่มฟิลด์ใน `BusinessUnitLicense`**

ใน `types/profile.ts` ต่อจากบรรทัด `features: string[];`:

```ts
  /** feature key ที่อยู่ในสัญญา รวม module ระดับบนและ resource ระดับล่าง เรียงตัวอักษรเสมอ */
  features: string[];
  /**
   * feature key ที่ platform ปลดระวางแล้ว (`tb_license_feature.state = "hide"`)
   *
   * เป็นลิสต์ **global เดียวกันทุก BU** ไม่ใช่ของที่ BU นี้ซื้อ และ backend ตัดคีย์เหล่านี้
   * ออกจาก `features` มาให้แล้ว — ฝั่งนี้ใช้มันตอบคำถามเดียวคือ "จะซ่อน หรือจะใส่แม่กุญแจ"
   *
   * **optional โดยตั้งใจ** — gateway รุ่นเก่ายังไม่ส่ง field นี้ `undefined` ต้องแปลว่า
   * "ไม่ซ่อนอะไรเลย" (fail-open) ไม่ใช่ "ซ่อนทุกอย่าง"
   */
  hidden_features?: string[];
```

- [ ] **Step 3: เพิ่ม `isHidden` ใน `LicenseInfo`**

ใน `hooks/use-license.ts` ต่อจาก field `isLicensed` ใน `interface LicenseInfo`:

```ts
  /**
   * feature นี้ถูกปลดระวางแล้วหรือไม่ — คนละคำถามกับ `isLicensed` โดยสิ้นเชิง
   * (`isLicensed` = "BU ซื้อไหม" · `isHidden` = "แพลตฟอร์มยังขายของชิ้นนี้อยู่ไหม")
   *
   * **ไม่ผ่าน `bypass`** ต่างจาก `isLicensed`/`canWrite` ที่ปลดล็อกตัวเองเมื่อสวิตช์
   * `LICENSE_ENFORCEMENT` ปิดหรือ state เป็น `"unresolved"` — "เลิกขายแล้ว" เป็นข้อเท็จจริง
   * ของแพลตฟอร์ม ไม่ใช่ข้อกล่าวอ้างเรื่องสัญญาของลูกค้าที่ยังทยอย rollout อยู่ ถ้าผูกกับ
   * สวิตช์ ฟีเจอร์นี้จะไม่มีผลเลยสักที่เพราะสวิตช์ปิดอยู่ทุก environment
   *
   * ยัง fail-open อยู่: ไม่มี `hidden_features` (gateway เก่า) → ไม่ซ่อนอะไรเลย
   */
  isHidden: (featureKey: string) => boolean;
```

- [ ] **Step 4: implement `isHidden` ใน `resolveLicense`**

ใน `hooks/use-license.ts` เพิ่มเข้าไปใน object ที่ `resolveLicense` return ต่อจาก `isLicensed`:

```ts
    // ไม่แตะ `bypass` โดยตั้งใจ — ดูเหตุผลเต็มที่ doc ของ isHidden ใน LicenseInfo
    isHidden: (featureKey: string) => (license?.hidden_features ?? []).includes(featureKey),
```

- [ ] **Step 5: ตัด node ที่ซ่อนออกจาก tree ใน `annotate`**

แทนที่ฟังก์ชัน `annotate` ทั้งตัวใน `hooks/use-visible-modules.ts` ด้วย:

```ts
/**
 * ตรรกะบริสุทธิ์ของ annotate สาย non-admin — export ไว้ unit test ตรง ๆ
 * (ตามแบบ `resolveLicense` ใน use-license.ts) โดยไม่ต้อง mock useCan/useLicense
 *
 * `isHidden` เป็น optional และ default เป็น "ไม่ซ่อนอะไร" เพื่อให้ผู้เรียกเดิม (เทสต์ที่
 * ไม่สนใจมิตินี้) ไม่ต้องแก้ และเพราะ fail-open คือค่าที่ถูกต้องเมื่อไม่มีข้อมูลอยู่แล้ว
 */
export function annotate(
  modules: ModuleDto[],
  can: (permission: Permission) => boolean,
  isLicensed: (featureKey: string) => boolean,
  isHidden: (featureKey: string) => boolean = () => false,
): ModuleWithAccess[] {
  const out: ModuleWithAccess[] = [];
  for (const mod of modules) {
    const { subModules, ...rest } = mod;
    if (subModules && subModules.length > 0) {
      const subs = annotate(subModules, can, isLicensed, isHidden);
      // ลูกถูกซ่อนหมด → หัวข้อกลุ่มไม่มีอะไรให้พาไป ซ่อนทั้งก้อน (กติกาเดียวกับ denied/locked
      // ที่ parent เป็น true เมื่อลูกเป็น true หมด)
      if (subs.length === 0) continue;
      out.push({
        ...rest,
        subModules: subs,
        denied: subs.every((s) => s.denied),
        // parent locked ก็ต่อเมื่อ child locked หมด — กติกาเดียวกับ denied
        locked: subs.every((s) => s.locked),
      });
      continue;
    }
    const feature = licenseFeatureOf(mod);
    // ตัดออกจากผลลัพธ์ ไม่ใช่ทำเครื่องหมาย — node ที่ยังอยู่ในลิสต์คือ node ที่รอให้ใคร
    // สักคนเผลอ render (leaf ที่ไม่มี feature key อยู่นอกขอบเขต license ห้ามซ่อน)
    if (feature && isHidden(feature)) continue;
    out.push({
      ...rest,
      subModules: undefined,
      denied: !!mod.permission && !can(mod.permission),
      locked: !!feature && !isLicensed(feature),
    });
  }
  return out;
}
```

- [ ] **Step 6: ทำแบบเดียวกันกับ `markAll`**

แทนที่ฟังก์ชัน `markAll` ทั้งตัวในไฟล์เดียวกันด้วย:

```ts
/**
 * Admin ข้าม permission ได้ทุกอย่าง แต่ **ข้าม license ไม่ได้**
 * จึงยัง annotate locked ตามปกติ ต่างจาก denied ที่บังคับเป็น false
 *
 * **admin ก็ข้าม `hidden` ไม่ได้เช่นกัน** — ของที่แพลตฟอร์มปลดระวางแล้วไม่ควรมีใครเห็น
 * ไม่ว่าจะสิทธิ์ระดับไหน (hidden ไม่มีแนวคิดเรื่อง role เลย เหมือน locked)
 *
 * Export ไว้ unit test ตรง ๆ เช่นเดียวกับ `annotate`
 */
export function markAll(
  modules: ModuleDto[],
  isLicensed: (featureKey: string) => boolean,
  isHidden: (featureKey: string) => boolean = () => false,
): ModuleWithAccess[] {
  const out: ModuleWithAccess[] = [];
  for (const mod of modules) {
    const { subModules, ...rest } = mod;
    if (subModules && subModules.length > 0) {
      const subs = markAll(subModules, isLicensed, isHidden);
      if (subs.length === 0) continue;
      out.push({
        ...rest,
        subModules: subs,
        denied: false,
        locked: subs.every((s) => s.locked),
      });
      continue;
    }
    const feature = licenseFeatureOf(mod);
    if (feature && isHidden(feature)) continue;
    out.push({
      ...rest,
      subModules: undefined,
      denied: false,
      locked: !!feature && !isLicensed(feature),
    });
  }
  return out;
}
```

- [ ] **Step 7: ต่อสายที่ `useVisibleModules`**

แทนที่สามบรรทัดสุดท้ายของ `useVisibleModules` ด้วย:

```ts
  const { can, isAdmin } = useCan();
  const { isLicensed, isHidden } = useLicense();
  if (isAdmin) return markAll(modules, isLicensed, isHidden);
  return annotate(modules, can, isLicensed, isHidden);
```

- [ ] **Step 8: เพิ่มคำอธิบาย `hidden` ใน doc ของ `useVisibleModules`**

ต่อท้ายรายการ bullet ที่อธิบาย `denied`/`locked` ใน JSDoc ของ `useVisibleModules`:

```ts
 * - **ไม่มี flag `hidden`** — feature ที่ถูกปลดระวาง (`hidden_features` จาก backend) ถูก
 *   **ตัดออกจาก tree ตรงนี้เลย** ไม่ใช่ทำเครื่องหมายไว้ เพราะที่นี่เป็นทางผ่านเดียวของทุกที่
 *   ที่ render เมนู (sidebar · navbar switcher · module landing · command palette ·
 *   useLandingPath) การตัดที่นี่จุดเดียวจึงทำให้ทั้งห้าที่ถูกต้องพร้อมกันโดยไม่ต้องแก้อะไร
 *   ส่วน deep link เข้าทาง URL ตรงเป็นหน้าที่ของ `RouteGuard` ซึ่งอ่าน `moduleList` ดิบ
```

- [ ] **Step 9: static check**

```bash
bun run typecheck && bun run lint
```

Expected: ทั้งคู่เขียว

- [ ] **Step 10: เทสต์เดิมต้องไม่แดง**

```bash
bun test:run hooks/use-visible-modules.test.ts hooks/use-license.test.ts hooks/use-landing-path.test.ts
```

Expected: PASS ทั้งหมดโดย**ไม่ต้องแก้ไฟล์เทสต์เลย** (call site เดิม 15 จุดยังใช้ได้เพราะ `isHidden` เป็น optional)
ถ้าแดง ให้แก้ที่โค้ด **ห้ามเพิ่ม test case ใหม่**

- [ ] **Step 11: Commit**

```bash
git add types/profile.ts hooks/use-license.ts hooks/use-visible-modules.ts
git commit -m "$(cat <<'EOF'
feat(license): ตัดโมดูลที่ปลดระวางออกจากเมนูจริง ไม่ใช่ใส่แม่กุญแจ

backend ส่ง hidden_features มาแล้ว — ฝั่งนี้ใช้มันตอบคำถามเดียวคือ "ซ่อน หรือ ใส่
แม่กุญแจ" ของที่เลิกขายต้องหาย ไม่ใช่กลายเป็น locked ซึ่งแปลว่า "ยังไม่ได้ซื้อ ซื้อสิ"

ตัดที่ useVisibleModules จุดเดียวเพราะเป็นทางผ่านเดียวของทุกที่ที่ render เมนู
(sidebar, navbar switcher, module landing, command palette, useLandingPath)
ทั้งห้าที่จึงถูกต้องพร้อมกันโดยไม่ต้องแก้สักไฟล์

isHidden ไม่ผูกกับสวิตช์ LICENSE_ENFORCEMENT ต่างจาก isLicensed/canWrite เพราะ
"เลิกขายแล้ว" เป็นข้อเท็จจริงของแพลตฟอร์ม ไม่ใช่ข้อกล่าวอ้างเรื่องสัญญาของลูกค้า
ถ้าผูกกับสวิตช์จะไม่มีผลเลยสักที่ เพราะสวิตช์ปิดอยู่ทุก environment
EOF
)"
```

---

## Task 4: FE เด้ง deep link ที่เข้าหน้าซึ่งถูกซ่อน

**รีโป:** `carmen-inventory-frontend-react` (branch เดิมจาก Task 3)

**Files:**
- Modify: `components/route-guard.tsx:1` (import) และ `:37-52` (ลำดับการตัดสินใน `RouteGuard`)

**Interfaces:**
- Consumes: `LicenseInfo.isHidden` จาก Task 3 · `useLandingPath()` (มีอยู่แล้ว) คืน `string`
- Produces: ไม่มีของใหม่ให้ task อื่นใช้ (งานสุดท้ายของโค้ด)

- [ ] **Step 1: เพิ่ม `Navigate` เข้า import**

บรรทัดแรกของ `components/route-guard.tsx` เปลี่ยนจาก
`import { useLocation, useNavigate } from "react-router";` เป็น:

```tsx
import { Navigate, useLocation, useNavigate } from "react-router";
```

- [ ] **Step 2: ดึง `isHidden` ออกมาใช้**

ในตัว `RouteGuard` เปลี่ยน `const { isLicensed } = useLicense();` เป็น:

```tsx
  const { isLicensed, isHidden } = useLicense();
```

- [ ] **Step 3: เช็ค hidden ก่อน locked**

แทรกก่อนบรรทัด `const locked = !!feature && !isLicensed(feature);`:

```tsx
  // ซ่อนมาก่อนล็อกเสมอ — กล่อง "BU ยังไม่ได้ซื้อ feature นี้" บนของที่แพลตฟอร์มเลิกขาย
  // ไปแล้วคือคำโกหก และการเด้งแบบ **เงียบ** คือสิ่งเดียวที่สอดคล้องกับคำว่า "หาย"
  // (กล่องแจ้งเตือนใด ๆ ก็ตามเป็นการยืนยันกับผู้ใช้ว่าหน้านี้มีอยู่จริง)
  //
  // วนไม่ได้: useLandingPath() คำนวณจาก tree ที่ useVisibleModules ตัด node ที่ซ่อน
  // ออกไปแล้ว จึงคืน path ที่ถูกซ่อนไม่ได้ และ fallback `/profile` ไม่อยู่ใน moduleList
  // เลย (findRouteLeaf คืน undefined → ไม่มีอะไรให้บล็อก)
  if (feature && isHidden(feature)) {
    return <Navigate to={landing} replace />;
  }

  const locked = !!feature && !isLicensed(feature);
```

- [ ] **Step 4: อัปเดต JSDoc ของ `RouteGuard`**

ใน block comment เหนือ `export function RouteGuard` แทรก bullet ต่อจากบรรทัดที่อธิบายการเช็ค license ก่อน permission:

```
 * - **หน้าที่ถูกปลดระวาง (`hidden`) มาก่อนทุกอย่าง** — เด้งไป landing แบบเงียบ ไม่มีกล่อง
 *   ต่างจาก `locked` ที่ขึ้น AccessDeniedBlock เพราะกล่อง "ยังไม่ได้ซื้อ" บนของที่เลิกขาย
 *   ไปแล้วคือคำโกหก และกล่องใด ๆ ก็เป็นการยืนยันว่าหน้านี้มีอยู่
```

- [ ] **Step 5: static check**

```bash
bun run typecheck && bun run lint
```

Expected: ทั้งคู่เขียว

- [ ] **Step 6: เทสต์เดิมของ route-guard ต้องไม่แดง**

```bash
bun test:run components/route-guard.test.tsx
```

Expected: PASS (เทสต์เดิมไม่มี `hidden_features` ใน mock → `isHidden` คืน false เสมอ → พฤติกรรมเดิมทุกเคส)

- [ ] **Step 7: Commit**

```bash
git add components/route-guard.tsx
git commit -m "$(cat <<'EOF'
feat(route-guard): deep link เข้าหน้าที่ปลดระวางแล้วให้เด้งกลับเงียบ ๆ

RouteGuard เป็นที่เดียวที่ยังต้องเช็คเอง เพราะมันทำงานจาก findRouteLeaf บน moduleList
ดิบ ไม่ใช่ tree ที่ useVisibleModules ตัด node ที่ซ่อนออกไปแล้ว

เช็ค hidden ก่อน locked และเด้งแบบไม่มีกล่อง — กล่อง "BU ยังไม่ได้ซื้อ" บนของที่เลิกขาย
ไปแล้วคือคำโกหก และกล่องใด ๆ ก็เป็นการยืนยันกับผู้ใช้ว่าหน้านี้มีอยู่จริง
EOF
)"
```

- [ ] **Step 8: เปิด PR**

```bash
git push -u origin feature/license-feature-hide
gh pr create --title "feat(license): hide retired modules from the menu for real" --body "$(cat <<'EOF'
A license feature set to `state = hide` in the platform catalog now disappears from the
app instead of merely showing a padlock.

The cut happens once, in `useVisibleModules()` — the single path every menu surface goes
through — so sidebar, navbar switcher, module landing, command palette and
`useLandingPath` are all correct without touching any of them. `RouteGuard` is the only
extra site, because it reads the raw `moduleList` rather than the filtered tree.

`isHidden` deliberately ignores the `LICENSE_ENFORCEMENT` switch: "retired" is a platform
fact, not a claim about a customer's contract, and the switch is off in every environment.
It still fails open — no `hidden_features` from the gateway means nothing is hidden.

Requires the gateway PR (feature/license-feature-hide-runtime) to ship FIRST.

Spec: docs/superpowers/specs/2026-08-31-license-feature-hide-design.md

https://claude.ai/code/session_01CNjsoNfoEtnsioFLgeYxMb
EOF
)"
```

---

## Task 5: ตรวจรับด้วยมือ

**รีโป:** ทั้งสอง (ต้อง deploy gateway ที่แก้แล้วขึ้น dev ก่อน)

**Files:** ไม่แก้ไฟล์ — เป็นการตรวจผลลัพธ์

**Interfaces:**
- Consumes: ทุกอย่างจาก Task 1-4
- Produces: ไม่มี

> ⚠️ ก่อนเริ่ม: `:4000`/dev ชี้ที่ฐานข้อมูล dev ที่ใช้ร่วมกัน การตั้ง `hide` เป็นการเขียนจริง — เลือก feature ที่ไม่มีใครใช้ทดสอบอยู่ และ **ตั้งกลับเป็น `active` เมื่อตรวจเสร็จ** (ข้อ 6)

- [ ] **Step 1: ตั้ง feature หนึ่งเป็น `hide`**

เปิด `carmen-platform` → `/license-features` → เลือก feature ที่มีหน้าใน carmen (แนะนำ leaf เดี่ยวที่ไม่ใช่ module แม่) → toggle เป็น `hide` → จดชื่อคีย์ไว้

- [ ] **Step 2: เมนูต้องหายทั้งสามที่**

เปิดแอป carmen (รอ ≤60 วิ ให้ cache หมดอายุ แล้ว hard refresh) แล้วยืนยัน:
- sidebar ไม่มีรายการนั้น
- navbar module switcher ไม่มี
- command palette (กดค้นหา) พิมพ์ชื่อหน้านั้นแล้วไม่ขึ้น

- [ ] **Step 3: หัวข้อกลุ่มต้องหายเมื่อลูกหายหมด**

เลือกโมดูลที่มีลูกน้อยที่สุด ตั้ง `hide` ให้ลูกทุกตัว → หัวข้อกลุ่มต้องหายทั้งก้อน ไม่ใช่เหลือหัวข้อเปล่า

- [ ] **Step 4: deep link ต้องเด้งเงียบ**

พิมพ์ URL ของหน้าที่ซ่อนลง address bar ตรง ๆ → ต้องเด้งไปหน้า landing **โดยไม่มีกล่องแจ้งเตือนใด ๆ** (ไม่ใช่ AccessDeniedBlock)

- [ ] **Step 5: ของที่ไม่ได้ซ่อนต้องไม่เปลี่ยน**

เดินดูเมนูอื่นทั้งหมด → ต้องเหมือนเดิมทุกจุด รวมถึงรายการที่ติดแม่กุญแจอยู่ก่อนแล้ว (ถ้ามี) ต้องยังติดแม่กุญแจเหมือนเดิม ไม่ใช่หายไปด้วย

- [ ] **Step 6: คืนสภาพ**

ตั้งทุก feature ที่แตะใน Step 1/3 กลับเป็น `active` → รอ ≤60 วิ → hard refresh → เมนูกลับมาครบ

---

## Self-Review

**Spec coverage** — ทุกหัวข้อของ spec มี task รองรับ:

| spec § | task |
|---|---|
| §3.1 cache คีย์ที่ซ่อน + fail-open | Task 1 Step 3-4 |
| §3.2 รูปที่ `resolveLicenseBatch` คืน + สาขา error | Task 1 Step 5-6 |
| §3.3 ตาราง 4 ไฟล์ (types, service, user.service, serializer) | Task 1 Step 2/5/6 + Task 2 Step 1-2 |
| §4.1-4.2 จุดคอขวด + ไฟล์ที่แก้ | Task 3 |
| §4.3 กติกา `isHidden` (ไม่ผ่าน bypass, fail-open) | Task 3 Step 3-4 |
| §4.4 กติกาตัด node (leaf/parent/ไม่มี feature key) | Task 3 Step 5-6 |
| §4.5 deep link | Task 4 |
| §5 ลำดับ deploy | Task 2 Step 6 + Task 4 Step 8 (ระบุใน PR body ทั้งคู่) |
| §6 dialog ที่ carmen-platform | นอกขอบเขตโดยเจตนา — spec ระบุว่าแยกกิ่ง |
| §7 การตรวจรับ | Task 5 |

**Type consistency** — `hidden_features` สะกดเหมือนกันทั้ง 6 ไฟล์ · `isHidden(featureKey: string) => boolean` เหมือนกันทั้ง `use-license.ts`, `use-visible-modules.ts`, `route-guard.tsx` · `resolveHiddenKeys(nowMs: number)` ถูกเรียกที่เดียวใน Task 1 Step 6 ด้วยชื่อเดียวกับที่ประกาศใน Step 4 · ฝั่ง BE `hidden_features` เป็น **required** (`string[]`) ส่วนฝั่ง FE เป็น **optional** (`string[] | undefined`) ตามลำดับ deploy — ตั้งใจให้ไม่ตรงกัน

**Placeholder scan** — ไม่มี TBD/TODO/"จัดการ error ตามสมควร" ทุก step ที่แก้โค้ดมี code block จริง
