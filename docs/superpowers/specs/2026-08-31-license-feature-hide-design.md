# ซ่อนโมดูลที่เลิกขายจริงด้วย license feature `state = hide`

วันที่: 2026-08-31
สถานะ: อนุมัติดีไซน์แล้ว รอทำแผน implement
รีโปที่เกี่ยวข้อง: `carmen-turborepo-backend-v2` (BE) · `carmen-inventory-frontend-react` (FE)

## 1. ปัญหาและเป้าหมาย

backend เพิ่มคอลัมน์ `tb_license_feature.state` เป็น 3 ค่า (`active` / `inactive` / `hide`)
แทน `is_active` เดิม (merge แล้ว: `34c464f6f`, `2fa193dad`, `e45048ad5`, `936398ecf`)
ค่าทั้งสามควบคุมเฉพาะ **ฝั่งขาย** เท่านั้น:

| state | ความหมายวันนี้ |
|---|---|
| `active` | เห็นในแค็ตตาล็อก ติ๊กขายได้ปกติ |
| `inactive` | กลุ่ม/สัญญาที่ผูกไว้แล้วเก็บได้ แต่ติ๊กเพิ่มใหม่ไม่ได้ |
| `hide` | หายจากแค็ตตาล็อก (`GET /platform/license-features` กรอง `state: { not: 'hide' }` ทิ้ง) |

**ปัญหา:** `hide` ไม่มีผลกับแอปที่ผู้ใช้ใช้จริงเลย ตัวประเมินสิทธิ์
(`apps/backend-gateway/src/license/license.evaluator.ts`) ตัดสินจาก `features[]` ซึ่ง
`LicenseService.resolveLicenseBatch` ประกอบจาก
`tb_subscription_bu → tb_subscription_bu_group → tb_license_feature_group → tb_license_feature_group_item.feature_key`
เส้นทางนี้ **ไม่เคย join `tb_license_feature`** โมดูลที่ผู้ดูแลตั้งเป็น `hide` จึงยังโผล่
ในเมนูและใช้งานได้ตามปกติทุกประการ

**เป้าหมาย:** ตั้ง `hide` แล้วโมดูลนั้น **หายจากแอปจริง** — ไม่อยู่ในเมนู ไม่อยู่ใน
command palette ไม่เป็นหน้า landing และเข้าทาง URL ตรงแล้วเด้งออก

### ขอบเขต

- ซ่อนตาม feature key ที่ `state = 'hide'` ซึ่งเป็นค่า **global ทั้งระบบ** ไม่ใช่ต่อ BU
- ครอบทั้ง sidebar, navbar module switcher, module landing, command palette, landing path, deep link
- ของที่ยัง `active`/`inactive` ไม่เปลี่ยนพฤติกรรมใด ๆ

### สิ่งที่ตั้งใจไม่ทำ

- **ไม่ทำให้ `hide` เป็นมาตรการความปลอดภัย** — มันคือการปลดระวางของในเมนู คนที่รู้ URL
  หรือยิง API ตรงยังทำได้จนกว่าสวิตช์ `LICENSE_ENFORCEMENT` จะเปิด ห้ามใช้แทนการถอนสิทธิ์
  (การบล็อกจริงจะเกิดเองผ่าน `evaluateLicense` เมื่อเปิดสวิตช์ ดู §3.3)
- ไม่แตะพฤติกรรมของ `inactive` (เป็นกติกาฝั่งขาย จบในตัวแล้วที่ `carmen-platform`)
- ไม่เพิ่ม endpoint ใหม่ จึงไม่ต้องแตะ app-id allowlist
- ไม่ทำ dialog ยืนยันตอนติ๊ก `hide` ที่ `carmen-platform` — ดู §6 (แนะนำให้ทำ แต่แยกกิ่ง)

## 2. ทางเลือกที่พิจารณาแล้วไม่เอา

**ตัดคีย์ `hide` ออกจาก `features[]` อย่างเดียว** (ไม่ส่งสัญญาณอะไรเพิ่ม)
แก้รีโปเดียว FE ไม่ต้องแตะ แต่ผลที่ได้คือ flag `locked` ของ FE ซึ่ง render เป็น
**"เห็นอยู่ พร้อมแม่กุญแจ"** ไม่ใช่หาย จะให้หายต้องเปลี่ยนความหมายของ `locked` ทั้งตัว
ซึ่งจะลากของที่ "ยังไม่ได้ซื้อ" หายไปด้วย — เสีย upsell ทั้งแอป

**ส่ง `hidden_features[]` อย่างเดียว** (ไม่ตัดจาก `features[]`)
ตรงจุด แต่ระหว่างที่ BE ขึ้นแล้ว FE ยังไม่ขึ้น โมดูลที่เลิกขายจะยังใช้งานได้เต็มที่

**ที่เลือก: ทำทั้งสองอย่าง** — ตัดออกจาก `features[]` (ได้ backstop และได้ 403 ฟรีเมื่อ
เปิด enforcement) **และ** ส่ง `hidden_features[]` (ให้ FE แยกออกว่าจะ "ซ่อน" หรือ "ล็อก")
ผลคือ deploy BE ก่อน FE ได้อย่างปลอดภัย: FE รุ่นเก่าเห็นเป็น `locked` ซึ่งแย่ลงเล็กน้อย
ไม่ใช่เปิดโล่ง

## 3. สัญญาฝั่ง backend (`carmen-turborepo-backend-v2`)

### 3.1 ชุดคีย์ที่ถูกซ่อน

เป็นค่า **global ตัวเดียวทั้งระบบ** (ไม่ขึ้นกับ BU) จึง query ครั้งเดียวแล้ว cache ก้อนเดียว
ลอกรูป cache เดิมของ `licenseCache`/`seatCache` ใน `license.service.ts` (TTL 60 วินาที):

```ts
// tb_license_feature.findMany({ where: { deleted_at: null, state: 'hide' }, select: { key: true } })
private hiddenCache: { keys: string[]; at: number } | null = null;
```

**fail-open เสมอ** — อ่านแค็ตตาล็อกไม่สำเร็จ = ซ่อน **0 คีย์** ไม่ใช่ซ่อนทั้งหมด
หลักการเดียวกับ `state: 'unresolved'` ที่มีอยู่แล้วในไฟล์นี้: การอ่าน DB ล้มเหลวครั้งเดียว
ต้องไม่กลายเป็นเมนูว่างเปล่าของทั้งระบบนานเท่าอายุ cache

### 3.2 รูปที่ `resolveLicenseBatch` คืน

ต่อท้ายการประกอบผลลัพธ์ต่อ BU (ปัจจุบันที่ `license.service.ts:200-201`):

```ts
const hiddenKeys = await this.resolveHiddenKeysCached();  // string[] จาก §3.1
const hidden = new Set(hiddenKeys);
// …
features: [...hit.features].filter((k) => !hidden.has(k)).sort(),
hidden_features: hiddenKeys,   // สำเนาลิสต์ global เดียวกันทุก BU โดยเจตนา
```

`hidden_features` เป็น **ลิสต์ global ไม่ใช่ intersection กับของที่ BU ซื้อ** โดยเจตนา —
โมดูลที่ปลดระวางแล้วต้องไม่โผล่เป็น "ล็อกอยู่ ซื้อสิ" ให้ BU ที่ไม่เคยซื้อเห็นด้วย

สาขา error ทั้งสองที่คืน `unresolved` (`license.service.ts:168` และ
`user.service.ts:127`) ต้องเติม `hidden_features: []` ด้วย

### 3.3 จุดที่ต้องแก้พร้อมกัน

| ไฟล์ | ทำอะไร |
|---|---|
| `apps/backend-gateway/src/license/license.types.ts` | `BuLicense.hidden_features: string[]` |
| `apps/backend-gateway/src/license/license.service.ts` | query + cache + filter + เติมสาขา error |
| `apps/backend-gateway/src/application/user/user.service.ts:110,127` | default object ทั้งสองจุดต้องมี `hidden_features: []` |
| `apps/backend-gateway/src/common/dto/user/user.serializer.ts:79-90` | เพิ่ม `hidden_features: z.array(z.string())` ใน `UserProfileResponseSchema` |

**ตัวสุดท้ายคือกับดักที่เคยกัดมาแล้ว** — `@Serialize(UserProfileResponseSchema)` ที่
`user.controller.ts:87` **กินฟิลด์ที่ไม่ได้ประกาศทิ้ง** ลืมแก้แล้ว GET จะตอบ 200 พร้อม
ข้อมูลที่หายไปโดยไม่มี error ให้เห็นสักบรรทัด

**`license.evaluator.ts` ไม่ต้องแก้** — คีย์ถูกตัดออกจาก `features[]` ไปแล้ว
`evaluateLicense` จะตอบ `LICENSE_REQUIRED` ให้เองเมื่อสวิตช์ enforcement เปิด

## 4. ฝั่ง frontend (`carmen-inventory-frontend-react`)

### 4.1 จุดคอขวดจุดเดียว

`useVisibleModules()` เป็นทางผ่านเดียวของทุกที่ที่ render เมนู ถ้า **filter node ที่ซ่อน
ออกจาก tree ตรงนั้น** ผู้บริโภคทั้งห้าตัวถูกต้องทันทีโดยไม่ต้องแก้สักไฟล์:

- `components/sidebar/side-main.tsx`
- `components/navbar/module-app.tsx`
- `components/module-landing.tsx`
- `components/command-palette.tsx`
- `hooks/use-landing-path.ts`

### 4.2 ไฟล์ที่แก้

| ไฟล์ | ทำอะไร |
|---|---|
| `types/profile.ts` | `BusinessUnitLicense.hidden_features?: string[]` — **optional** เพราะ gateway รุ่นเก่ายังไม่ส่งมา |
| `hooks/use-license.ts` | `resolveLicense()` เพิ่ม `isHidden(featureKey): boolean` ใน `LicenseInfo` |
| `hooks/use-visible-modules.ts` | `annotate()` / `markAll()` ตัด node ที่ซ่อนออกจาก tree |
| `components/route-guard.tsx` | เช็ค hidden ก่อน locked → `<Navigate replace>` |

### 4.3 กติกาของ `isHidden`

```ts
isHidden: (featureKey: string) => (license?.hidden_features ?? []).includes(featureKey)
```

**ไม่ผ่าน `bypass`** ต่างจาก `isLicensed`/`canWrite` ที่ปลดล็อกตัวเองเมื่อสวิตช์
`LICENSE_ENFORCEMENT` ปิดหรือ state เป็น `unresolved` เหตุผล: "เลิกขายแล้ว" เป็นข้อเท็จจริง
ของแพลตฟอร์ม ไม่ใช่ข้อกล่าวอ้างเรื่องสัญญาของลูกค้าที่ยังทยอย rollout อยู่ ถ้าผูกกับสวิตช์
ฟีเจอร์นี้จะตายตั้งแต่วันแรกเพราะสวิตช์ปิดอยู่ทุก environment

แต่ยัง **fail-open** อยู่: `hidden_features` เป็น `undefined` (gateway เก่า) → ซ่อน 0 คีย์
ซึ่งเป็นพฤติกรรมเดิมทุกประการ

### 4.4 กติกาการตัด node

ใช้ `licenseFeatureOf(mod)` ตัวเดิมหา feature key ของ leaf (ห้ามคำนวณ key เองที่อื่น —
namespace ของ permission กับของ license ไม่ตรงกัน ดู `constant/module-list.ts`)

- leaf: `isHidden(licenseFeatureOf(mod))` → ตัดออกจากผลลัพธ์
- parent: recurse ลูกก่อน **ลูกหายหมด → parent หายด้วย** (กติกาเดียวกับ `denied`/`locked`
  ที่ parent เป็น true เมื่อลูกเป็น true หมด)
- leaf ที่ไม่มี feature key (`licenseFeatureOf` คืน `undefined`) → อยู่นอกขอบเขต license
  **ห้ามซ่อน**

ผลลัพธ์ของ `useVisibleModules()` จึงเป็น tree ที่ node ซ่อนหายไปแล้วจริง ๆ ไม่ใช่ flag
เพิ่มอีกตัว — จงใจไม่เพิ่ม `hidden` เข้า `ModuleWithAccess` เพราะ node ที่ยังอยู่ในลิสต์
คือ node ที่รอให้ใครสักคนเผลอ render

### 4.5 Deep link

`RouteGuard` เป็นที่เดียวที่ต้องแก้ตรง ๆ เพราะมันทำงานจาก `findRouteLeaf(pathname)` บน
`moduleList` **ดิบ** ไม่ใช่ tree ที่ถูก filter ลำดับการตัดสินใหม่:

```
hidden  → <Navigate to={landing} replace />   ← เงียบ ไม่มีกล่องบอกอะไร
locked  → AccessDeniedBlock reason="license"  ← ของเดิม
denied  → AccessDeniedBlock                   ← ของเดิม
```

เช็ค `hidden` **ก่อน** `locked` — กล่อง "BU ยังไม่ได้ซื้อ feature นี้" บนของที่เลิกขาย
ไปแล้วคือคำโกหก และการเด้งแบบเงียบสอดคล้องกับคำว่า "หาย" (กล่องใด ๆ ก็ตามเป็นการยืนยัน
ว่าหน้านี้มีอยู่)

วนไม่ได้: `useLandingPath()` คำนวณจาก tree ที่ filter แล้วจึงคืน path ที่ถูกซ่อนไม่ได้
และ fallback `/profile` ไม่อยู่ใน `moduleList` เลย (`findRouteLeaf` คืน `undefined`
→ `RouteGuard` ไม่มีอะไรให้บล็อก)

## 5. ลำดับ deploy

1. **BE ก่อน** — FE รุ่นเก่าไม่รู้จัก `hidden_features` แต่ `features[]` ถูกตัดแล้ว
   จึงเห็นเป็น `locked` (แย่ลงเล็กน้อย ไม่ใช่เปิดโล่ง) นี่คือเหตุผลทั้งหมดที่เลือกทางนี้
2. **FE ตาม** — `locked` กลายเป็น "หายจริง"

ไม่มี migration ใหม่ (คอลัมน์ `state` ขึ้นไปแล้ว) ไม่มี endpoint ใหม่ จึงไม่ต้องแตะ
app-id allowlist และไม่มีความเสี่ยงเรื่อง user โดน logout

## 6. ของที่แนะนำให้ทำต่อ (ไม่รวมใน spec นี้)

`carmen-platform` → `src/pages/LicenseFeatureManagement.tsx` ควรมี dialog ยืนยันตอนติ๊ก
`hide` ที่บอกจำนวน BU / สัญญาที่กระทบ หลัง spec นี้ขึ้น ปุ่มนั้นจะกลายเป็น**ปุ่มเดียวที่
ลบเมนูของลูกค้าที่จ่ายเงินไปแล้วออกทั้งระบบ** โดยไม่ถามอะไรเลย — `state` เป็นค่า global
ไม่ได้แยกตาม BU ต้องมี endpoint นับผู้ได้รับผลกระทบเพิ่มด้วย จึงแยกเป็นงานของมันเอง

## 7. การตรวจรับ

ตรวจด้วยมือที่ dev (ไม่เขียน automated test ตาม working preference):

1. ตั้ง feature หนึ่งเป็น `hide` ที่ `/license-features` ของ carmen-platform
2. เปิดแอป → เมนูนั้นหายจาก sidebar, navbar switcher, command palette
3. โมดูลที่มีลูกตัวเดียวและลูกนั้นถูกซ่อน → หัวข้อกลุ่มต้องหายทั้งก้อน
4. ยิง URL ของหน้านั้นตรง ๆ → เด้งกลับ landing เงียบ ๆ ไม่มีกล่อง
5. ตั้งกลับเป็น `active` → เมนูกลับมาภายใน 60 วินาที (อายุ cache)
6. feature ที่ยัง `active` ทั้งหมดต้องไม่เปลี่ยนพฤติกรรมสักจุด

static check ที่ต้องเขียว: `bun run typecheck` + `bun run lint` (FE) และ build ของ BE
