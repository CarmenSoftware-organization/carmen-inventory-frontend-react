# เปลี่ยน API contract จาก flat field เป็น object — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ทำให้ทุก endpoint อ้างถึง entity อื่นด้วย object รูปแบบเดียวกันทั้งระบบ แทนการใช้ flat field (`vendor_id` + `vendor_name`) ที่ปนกันอยู่สองแบบวันนี้

**Architecture:** แปลงที่ **ขอบ API ของ backend-gateway เท่านั้น** — ขาออกใส่ preprocess ใน zod serializer schema (ยุบ flat → object), ขาเข้าใส่ `.transform()` ใน DTO (คลี่ object → flat ก่อนส่งต่อ) micro-business, Prisma และ DB ไม่ขยับเลยแม้แต่บรรทัดเดียว ฝั่ง client แก้ type ก่อนแล้วให้ `tsc --noEmit` ชี้จุดที่ต้องตามแก้

**Tech Stack:** NestJS · zod 3.25 (`zod/v4` API) · `nestjs-zod` · React Router 7 + Vite (FE) · Expo/React Native (mobile) · Playwright (e2e) · bun

**Spec:** `docs/superpowers/specs/2026-09-17-api-flat-to-object-contract-design.md`

## Global Constraints

- **ไม่มี DB migration** — คอลัมน์ `<x>_id` / `<x>_name` ใน DB อยู่เหมือนเดิมทุกตัว
- **micro-business ต้องไม่ถูกแก้แม้แต่บรรทัดเดียว** — ถ้าพบว่าต้องแก้ แปลว่าแก้ผิดชั้น ให้หยุดแล้วย้อนดู
- **ไม่เขียนไฟล์ `.spec.ts` / `.test.ts` ใหม่** ตามแนวทางของผู้ใช้ — เครื่องมือตรวจทำเป็นสคริปต์ใน `scripts/` แทน · แต่**เทสต์ที่มีอยู่เดิมต้องยังเขียว** และ static check (`bunx tsc --noEmit`, lint) ต้องรันทุกครั้ง
- **รูป object:** `<base>: { id, name?, local_name?, code?, symbol? }` เอาเฉพาะคีย์ที่มีอยู่จริง **ไม่เพิ่มคีย์ใหม่** (การเติม `code` ให้ครบต้อง join เพิ่ม = ห้าม)
- **ค่าว่าง:** `<base>_id === null` จะได้ `<base>: null` **ห้ามส่ง `{}` หรือ `{ id: null }`**
- **`product_local_name`** ยุบเข้า `product` เป็นคีย์ `local_name` ไม่แยกเป็น entity ใหม่
- **allowlist ห้ามแปลง:** `created_by_id`, `updated_by_id`, `deleted_by_id` (มี `audit` ครอบแล้ว) · `po_no`, `pr_no`, `grn_no`, `sr_no`, `si_no`, `so_no`, `cn_no`, `invoice_no`, `tax_invoice_no`, `sequence_no`, `doc_version` (ไม่ใช่ reference)
- **ฟิลด์ที่มีแต่ `_name`/`_code` โดยไม่มี `_id` คู่ → ปล่อยเป็น flat ไม่แปลง** (38 group ใน 28 ไฟล์
  ส่วนใหญ่อยู่ใน list schema เช่น `StoreRequisitionListItemResponseSchema` ที่มี `requestor_name`,
  `department_name`, `from_location_name` โดยไม่มี id เลย) — มันเป็น**ข้อความไว้แสดงผล ไม่ใช่ reference**
  เพราะไม่มี entity ให้ชี้ไปหา การแปลงเป็น `{ name }` จะได้ object ที่โกหกว่าตัวเองเป็น reference
  **และการทำให้มันเป็น reference จริงต้องเพิ่มคอลัมน์ id ใน query ของ micro-business
  ซึ่งผิดข้อจำกัดหลักของงานนี้ที่ห้ามแตะ micro-business**
  ผลที่ยอมรับ: list กับ detail ของเอกสารเดียวกันจะรูปร่างต่างกันตรงจุดที่ backend ส่งมาแค่ชื่อ
  (list อ่าน `row.requestor_name` · detail อ่าน `doc.requestor?.name`)
- **ขอบเขตที่ยืนยันแล้ว:** 146 group ฝั่ง response (40 ไฟล์) + 174 group ฝั่ง request (63 ไฟล์) — **รวม `<x>_id` ที่ไม่มีคู่ด้วย** แม้จะได้ `{ id }` ห่อเปล่า
- **backend-v2 มี formatter hook ที่จัด prettier ทับไฟล์หลังทุก edit** — ไฟล์บน main ไม่ compliant อยู่แล้ว ต้องคืนไฟล์ที่ไม่ได้ตั้งใจแก้ก่อน commit ทุกครั้ง ไม่งั้นได้ churn หลายร้อยบรรทัด
- **`turbo run build` ไม่ใช่ด่าน type ของ gateway** (`nest build` ใช้ SWC ที่ strip type) ต้องรัน `bunx tsc --noEmit` เอง
- **`:4000` ชี้ DB dev ที่ใช้ร่วมกัน** — เขียนอะไรต้องจดค่าเดิมและคืน

---

## File Structure

**สร้างใหม่ (backend-gateway):**
- `apps/backend-gateway/src/common/dto/entity-ref.ts` — helper 3 ตัว: `entityRef()` สร้าง schema, `collapseRefs()` ขาออก, `expandRefs()` ขาเข้า · ไฟล์เดียวจบ ไม่มี state
- `apps/backend-gateway/src/common/dto/entity-ref.allowlist.ts` — รายชื่อ base ที่ห้ามแปลง ใช้ร่วมกันระหว่าง helper กับสคริปต์ตรวจ
- `scripts/check-flat-refs.ts` — สแกนโค้ด fail ถ้าเจอ flat ref ที่ยังไม่ถูกยุบ
- `scripts/gen-ref-map.ts` — ผลิตบล็อก `REFS` ให้แต่ละไฟล์ (ตัวช่วย ไม่ใช่ของ production)

**สร้างใหม่ (frontend-react):**
- `scripts/dump-api-snapshot.py` — ดัมพ์ response ไว้ทำ golden snapshot
- `scripts/probe-contract.py` — ยิง API จริงแล้วยืนยันว่าไม่มี flat หลงเหลือ + เทียบ snapshot

**แก้ (backend-gateway):** 40 serializer + 63 DTO — แต่ละไฟล์เพิ่มบล็อก `REFS` แล้วห่อ schema ที่ export ด้วย `collapseRefs` / `expandRefs`

**แก้ (frontend-react):** `types/*.ts` ก่อน แล้วตามด้วยจุดที่ `tsc` ชี้ (~2,358 จุด / 297 ไฟล์)

**แก้ (mobile):** `src/lib/api/*.ts` ก่อน แล้วตามด้วยจุดที่ `tsc` ชี้ (~453 จุด / 36 ไฟล์)

---

## Phase 0 — ตาข่ายนิรภัย (ห้ามข้าม ห้ามสลับลำดับ)

### Task 1: เก็บ baseline ก่อนแตะโค้ด

**Files:**
- Create: `/tmp/carmen-contract-baseline/` (นอก repo — ไม่ commit)
- Create: `scripts/dump-api-snapshot.py` (ใน frontend-react)

**Interfaces:**
- Produces: `baseline/tests-red.txt` (รายชื่อ suite ที่แดงอยู่เดิม), `baseline/api/*.json` (response ดิบของทุก endpoint พร้อมคีย์ `_url`)

- [ ] **Step 1: เก็บรายชื่อเทสต์ที่แดงอยู่เดิมบน main**

```bash
mkdir -p /tmp/carmen-contract-baseline/api
# ต้องรันจาก "ใน" แต่ละ app — รีโปนี้ไม่มี jest config ที่ root
# (`bun run test` ที่ root = `turbo run test` ซึ่งเรียก jest ในแต่ละ app)
# สั่ง `bunx jest` จาก root จะกวาด dist/*.spec.js ด้วย ได้ตัวเลขขยะ 1,376 suite
cd ~/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2/apps/backend-gateway
bunx jest --silent 2>&1 | grep -E "^(FAIL|Tests:|Test Suites:)" \
  > /tmp/carmen-contract-baseline/gateway-red.txt
cat /tmp/carmen-contract-baseline/gateway-red.txt
```

Expected: `Test Suites: 2 failed, 471 passed, 473 total` · `Tests: 4 failed, 5260 passed, 5264 total`
(suite ที่แดงคือ `application/purchase-orders/purchase-orders.controller.spec.ts` กับอีกหนึ่งตัว)

**นี่คือของเดิมที่แดงอยู่แล้วบน main ไม่ใช่ของที่เราทำพัง** ถ้าไม่เก็บไว้จะแยกไม่ออกทีหลัง
ถ้าได้ตัวเลขหลักพัน แปลว่ารันผิดที่ (จาก root แทนที่จะเป็นในโฟลเดอร์ app) ให้ย้อนไปทำตามคำสั่งข้างบน

- [ ] **Step 2: ล็อกอินเก็บ token**

```bash
cd /tmp/carmen-contract-baseline
curl -s -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -H 'x-app-id: bc1ade0a-a189-48c4-9445-807a3ea38253' \
  -d '{"email":"admin@zebra.com","password":"12345678"}' \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['access_token'])" > token.txt
wc -c token.txt
```
Expected: มากกว่า 1000 ตัวอักษร

หมายเหตุ: `auth.login` รับเฉพาะ app-id ของ carmen-platform (`bc1ade0a-...`) ส่วนการเรียก endpoint อื่นใช้ app-id ของ FE inventory (`9c83fd4b-ce3f-4de2-a522-349ad1280b10`)

- [ ] **Step 3: เขียนสคริปต์ดัมพ์ golden snapshot**

```python
# scripts/dump-api-snapshot.py  (ใน carmen-inventory-frontend-react)
"""ดัมพ์ response ของทุก endpoint เก็บเป็น golden snapshot ก่อนแก้ contract
ใช้: cd /tmp/carmen-contract-baseline && python3 <path>/scripts/dump-api-snapshot.py
"""
import json, subprocess, re, pathlib

TOKEN = open('token.txt').read().strip()
APPID = '9c83fd4b-ce3f-4de2-a522-349ad1280b10'
BASE = 'http://localhost:4000'
BU = 'T02'
out = pathlib.Path('api')
out.mkdir(exist_ok=True)


def get(path):
    raw = subprocess.run(
        ['curl', '-s', BASE + path,
         '-H', f'Authorization: Bearer {TOKEN}',
         '-H', f'x-app-id: {APPID}'],
        capture_output=True, text=True).stdout
    try:
        return json.loads(raw)
    except Exception:
        return {'_raw': raw[:400]}


def save(name, payload, url):
    payload['_url'] = url
    (out / name).write_text(
        json.dumps(payload, indent=2, ensure_ascii=False, sort_keys=True))


ENDPOINTS = [
    ('po', f'/api/{BU}/purchase-orders'),
    ('grn', f'/api/{BU}/good-received-notes'),
    ('cn', f'/api/{BU}/credit-notes'),
    ('si', f'/api/{BU}/stock-ins'),
    ('so', f'/api/{BU}/stock-outs'),
    ('sr', f'/api/{BU}/store-requisitions'),
    ('rfp', f'/api/{BU}/request-for-pricings'),
    ('product', f'/api/config/{BU}/products'),
    ('pricelist', f'/api/config/{BU}/pricelists'),
]

for name, base in ENDPOINTS:
    list_url = base + '?perpage=5'
    save(f'{name}.list.json', get(list_url), list_url)
    m = re.search(r'"id"\s*:\s*"([0-9a-f-]{36})"', json.dumps(get(list_url)))
    if not m:
        print(f'{name}: ไม่มีข้อมูล ข้าม detail')
        continue
    detail_url = f'{base}/{m.group(1)}'
    save(f'{name}.detail.json', get(detail_url), detail_url)
    print(f'{name}: ok')

# PR list เป็น multi-BU endpoint ที่ 403 กับ token นี้ — ใช้ for-po หา id แทน
pr = get(f'/api/{BU}/purchase-requests/for-po?perpage=1')
m = re.search(r'"id"\s*:\s*"([0-9a-f-]{36})"', json.dumps(pr))
if m:
    url = f'/api/{BU}/purchase-requests/{m.group(1)}'
    save('pr.detail.json', get(url), url)
    print('pr: ok')
```

- [ ] **Step 4: รันดัมพ์แล้วยืนยันว่าได้ไฟล์ครบ**

```bash
cd /tmp/carmen-contract-baseline
python3 ~/GitHub/carmensoftware-organize/carmen-inventory-frontend-react/scripts/dump-api-snapshot.py
ls api/
grep -l '_url' api/*.json | wc -l
```
Expected: จำนวนไฟล์ที่มี `_url` เท่ากับจำนวนไฟล์ทั้งหมดใน `api/`

- [ ] **Step 5: Commit**

```bash
cd ~/GitHub/carmensoftware-organize/carmen-inventory-frontend-react
git add scripts/dump-api-snapshot.py
git commit -m "chore(scripts): สคริปต์ดัมพ์ response ของ API ไว้ทำ golden snapshot"
```

---

### Task 2: เติม SR เข้า golden snapshot ด้วย route ที่ถูกต้อง

**Files:**
- Modify: `scripts/dump-api-snapshot.py` (ใน frontend-react)

**Interfaces:**
- Consumes: `token.txt` จาก Task 1
- Produces: `api/sr.list.json` + `api/sr.detail.json` ที่เป็นข้อมูลจริง (ของเดิมเป็น body ของ 404)

**ทำไมต้องมี task นี้:** Task 1 ดัมพ์ SR ไม่ได้เพราะแผนรุ่นแรกเขียน URL ที่ไม่มีอยู่จริง
gateway **ไม่มี route `GET /:bu_code/store-requisitions`** เลย มีแต่

- list ข้าม BU: `GET /api/store-requisitions` — **ต้องส่ง `bu_code` เป็น query param**
  ไม่งั้นได้ `data: []` และ items ห่ออยู่ที่ `data[0].data` ไม่ใช่ `data` ตรง ๆ
- detail: `GET /api/:bu_code/store-requisitions/:id`

ยืนยันแล้วว่า T02 มี SR อยู่ **64 รายการ** และ detail มี 7 reference group
(`from_location`, `to_location`, `workflow`, `issue_by`, `requestor`, `department`, `last_action_by`)

- [ ] **Step 1: เพิ่ม SR เข้าสคริปต์ดัมพ์ โดยแยกจาก ENDPOINTS ปกติ**

SR ใช้รูปแบบ URL คนละแบบกับตัวอื่น จึงต่อท้ายไฟล์ ไม่ใช่ใส่ใน `ENDPOINTS`:

```python
# SR ใช้ route คนละแบบ: list ข้าม BU ต้องส่ง bu_code เป็น query param
# และ items ห่ออยู่ที่ data[0].data — ไม่มี route GET /:bu/store-requisitions
sr_list_url = f'/api/store-requisitions?perpage=5&bu_code={BU}'
sr_list = get(sr_list_url)
save('sr.list.json', sr_list, sr_list_url)
try:
    sr_id = sr_list['data'][0]['data'][0]['id']
except (KeyError, IndexError, TypeError):
    sr_id = None
    print('sr: ไม่มีข้อมูล ข้าม detail')
if sr_id:
    sr_detail_url = f'/api/{BU}/store-requisitions/{sr_id}'
    save('sr.detail.json', get(sr_detail_url), sr_detail_url)
    print('sr: ok')
```

- [ ] **Step 2: ลบ SR ออกจากลิสต์ `ENDPOINTS` เดิม**

บรรทัด `('sr', f'/api/{BU}/store-requisitions'),` ต้องถูกลบทิ้ง ไม่งั้นจะเขียนทับ
`sr.list.json` ด้วย body ของ 404 อีกรอบ

- [ ] **Step 3: รันดัมพ์ใหม่แล้วยืนยันว่า SR เป็นข้อมูลจริง**

```bash
cd /tmp/carmen-contract-baseline
python3 ~/GitHub/carmensoftware-organize/carmen-inventory-frontend-react/scripts/dump-api-snapshot.py
python3 -c "
import json
for f in ('sr.list.json','sr.detail.json'):
    d=json.load(open('api/'+f))
    print(f, '→ success:', d.get('success'), '| _url:', d.get('_url'))
    assert d.get('success') is True, f+' ไม่ใช่ข้อมูลจริง'
print('SR snapshot ใช้ได้')
"
```
Expected: ทั้งสองไฟล์ `success: True` และมี `_url`

- [ ] **Step 4: ยืนยันว่าไฟล์อื่นไม่เสียหาย**

```bash
cd /tmp/carmen-contract-baseline
ls api/ | wc -l
grep -l '_url' api/*.json | wc -l
```
Expected: ตัวเลขทั้งสองเท่ากัน และเป็น 19 (18 เดิม + sr.detail.json ที่เพิ่มมา)

- [ ] **Step 5: Commit**

```bash
cd ~/GitHub/carmensoftware-organize/carmen-inventory-frontend-react
git add scripts/dump-api-snapshot.py
git commit -m "fix(scripts): ดัมพ์ SR ด้วย route ที่มีอยู่จริง (list ข้าม BU + bu_code param)"
```

---

## Phase 1 — เครื่องมือ

### Task 3: helper `entity-ref.ts`

**Files:**
- Create: `apps/backend-gateway/src/common/dto/entity-ref.allowlist.ts`
- Create: `apps/backend-gateway/src/common/dto/entity-ref.ts`

**Interfaces:**
- Produces: `entityRef(keys)`, `collapseRefs(refs, schema)`, `expandRefs(refs, schema)`, type `RefMap = Record<string, readonly RefSuffix[]>`, `REF_ALLOWLIST: ReadonlySet<string>` — ทุก task ต่อจากนี้เรียกใช้ชื่อพวกนี้

- [ ] **Step 1: สร้าง allowlist**

```ts
// apps/backend-gateway/src/common/dto/entity-ref.allowlist.ts

/**
 * Base names that must never be collapsed into an entity object
 * base name ที่ห้ามแปลงเป็น entity object
 */
export const REF_ALLOWLIST: ReadonlySet<string> = new Set([
  // audit — มี `audit` object ครอบอยู่แล้ว และ gateway strip ฟิลด์ดิบทิ้ง
  'created_by',
  'updated_by',
  'deleted_by',
  // เลขที่เอกสาร — `_no` ไม่ใช่ reference
  'po',
  'pr',
  'grn',
  'sr',
  'si',
  'so',
  'cn',
  'invoice',
  'tax_invoice',
  'sequence',
  'doc',
]);
```

- [ ] **Step 2: สร้าง helper**

```ts
// apps/backend-gateway/src/common/dto/entity-ref.ts
import { z } from 'zod/v4';

export const REF_SUFFIXES = ['id', 'name', 'local_name', 'code', 'symbol'] as const;
export type RefSuffix = (typeof REF_SUFFIXES)[number];

/** map ของ base → คีย์ที่ base นั้นมีจริง เช่น { vendor: ['id','name'] } */
export type RefMap = Record<string, readonly RefSuffix[]>;

/**
 * Build the zod schema for one entity reference object
 * สร้าง schema ของ entity reference หนึ่งตัว
 */
export function entityRef(keys: readonly RefSuffix[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const k of keys) shape[k] = z.string().nullable().optional();
  return z.object(shape).nullable();
}

/**
 * Response side: collapse `<base>_<suffix>` keys into `<base>: { ... }`
 * ขาออก: ยุบคีย์ flat เป็น object แล้วลบคีย์ flat ทิ้ง
 *
 * ถ้า `<base>_id` เป็น null จะได้ `<base>: null` (ไม่ใช่ `{}`)
 * ถ้า payload ส่ง object มาอยู่แล้ว (เช่น PO ที่วันนี้ซ้ำทั้งสองแบบ) ค่าจาก flat ชนะ
 * เพราะ flat คือคอลัมน์จริงใน DB ส่วน object เป็นแค่กล่องที่ service ห่อขึ้นมา
 */
export function collapseRefs<T extends z.ZodTypeAny>(refs: RefMap, schema: T) {
  return z.preprocess((raw) => {
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return raw;
    const out: Record<string, unknown> = { ...(raw as Record<string, unknown>) };

    for (const [base, keys] of Object.entries(refs)) {
      const collected: Record<string, unknown> = {};
      const existing = out[base];
      if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
        Object.assign(collected, existing as Record<string, unknown>);
      }
      for (const k of keys) {
        const flat = `${base}_${k}`;
        if (flat in out) {
          collected[k] = out[flat];
          delete out[flat];
        }
      }
      out[base] = collected.id == null ? null : collected;
    }
    return out;
  }, schema);
}

/**
 * Request side: expand `<base>: { ... }` back into `<base>_<suffix>` keys
 * ขาเข้า: คลี่ object กลับเป็น flat ก่อนส่งต่อให้ micro-business
 *
 * base ที่ไม่ได้ส่งมาในคำขอ (partial update) จะไม่ถูกเขียน flat ลงไป —
 * ไม่งั้นการอัปเดตบางฟิลด์จะไปล้างค่าอื่นเป็น null
 */
export function expandRefs<T extends z.ZodTypeAny>(refs: RefMap, schema: T) {
  return schema.transform((parsed: unknown) => {
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return parsed;
    const out: Record<string, unknown> = { ...(parsed as Record<string, unknown>) };

    for (const [base, keys] of Object.entries(refs)) {
      if (!(base in out)) continue;
      const obj = out[base] as Record<string, unknown> | null | undefined;
      delete out[base];
      for (const k of keys) out[`${base}_${k}`] = obj?.[k] ?? null;
    }
    return out;
  });
}
```

- [ ] **Step 3: Type-check**

```bash
cd ~/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2
bunx tsc --noEmit -p apps/backend-gateway/tsconfig.json
```
Expected: ไม่มี error

- [ ] **Step 4: ลองด้วยมือว่า helper ทำงานถูก**

```bash
cd ~/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2
cat > /tmp/try-ref.ts <<'TRYEOF'
import { z } from 'zod/v4';
import { collapseRefs, expandRefs, entityRef } from './apps/backend-gateway/src/common/dto/entity-ref';

const REFS = { vendor: ['id', 'name'], credit_term: ['id', 'name'] } as const;

const Out = collapseRefs(REFS, z.object({
  po_no: z.string(),
  vendor: entityRef(['id', 'name']),
  credit_term: entityRef(['id', 'name']),
}));
console.log(JSON.stringify(Out.parse({
  po_no: 'PO001', vendor_id: 'v1', vendor_name: 'Daew',
  credit_term_id: null, credit_term_name: null,
})));

const In = expandRefs(REFS, z.object({
  vendor: z.object({ id: z.string(), name: z.string().optional() }).nullable().optional(),
}).passthrough());
console.log(JSON.stringify(In.parse({ vendor: { id: 'v1', name: 'Daew' } })));
console.log(JSON.stringify(In.parse({})));
TRYEOF
bunx tsx /tmp/try-ref.ts
```

Expected ทั้งสามบรรทัดตามลำดับ:
```
{"po_no":"PO001","vendor":{"id":"v1","name":"Daew"},"credit_term":null}
{"vendor_id":"v1","vendor_name":"Daew"}
{}
```

บรรทัดที่สามสำคัญที่สุด — ถ้าไม่ได้ `{}` แปลว่า `expandRefs` เขียน flat ให้ base ที่ไม่ได้ส่งมา จะทำให้ partial update ล้างข้อมูล **ต้องแก้ก่อนไปต่อ**

- [ ] **Step 5: Commit**

```bash
cd ~/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2
git status --short
git add apps/backend-gateway/src/common/dto/entity-ref.ts \
        apps/backend-gateway/src/common/dto/entity-ref.allowlist.ts
git commit -m "feat(dto): helper ยุบ/คลี่ entity reference ระหว่าง flat กับ object"
```

ถ้า `git status` แสดงไฟล์อื่นที่ formatter hook ไปจัดรูปทับ ให้คืนไฟล์เหล่านั้นก่อน commit (`git restore <path>`) ไม่งั้น PR จะมี churn หลายร้อยบรรทัดที่ไม่เกี่ยวกับงาน

---

### Task 4: สคริปต์ตรวจความครบจากโค้ด

**Files:**
- Create: `scripts/check-flat-refs.ts` (ใน backend-v2)

**Interfaces:**
- Consumes: `REF_ALLOWLIST` จาก Task 3
- Produces: คำสั่ง `bun run scripts/check-flat-refs.ts` ที่ exit 1 พร้อมรายชื่อไฟล์+base ที่ยังไม่ถูกแปลง

- [ ] **Step 1: เขียนสคริปต์**

```ts
// scripts/check-flat-refs.ts
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { REF_ALLOWLIST } from '../apps/backend-gateway/src/common/dto/entity-ref.allowlist';

const SUFFIXES = ['id', 'name', 'local_name', 'code', 'symbol'] as const;
const FIELD_RE = /^\s{2,}([a-z_][a-z0-9_]*)\s*[?:]\s*(z\.|[A-Z])/;

// globSync มีใน node:fs ตั้งแต่ Node 22 และ bun รองรับ
// ถ้า runtime ไม่รองรับ ใช้ `new Bun.Glob('...').scanSync('.')` แทนได้
const files = globSync('apps/backend-gateway/src/**/*.{serializer,dto}.ts').filter(
  (p) => !p.includes('.spec.'),
);

let bad = 0;
for (const file of files) {
  const names = new Set<string>();
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = FIELD_RE.exec(line);
    if (m) names.add(m[1]);
  }

  const groups = new Map<string, string[]>();
  for (const n of names) {
    for (const s of SUFFIXES) {
      if (n.endsWith(`_${s}`)) {
        const base = n.slice(0, -(s.length + 1));
        groups.set(base, [...(groups.get(base) ?? []), s]);
      }
    }
  }

  for (const [base, keys] of groups) {
    if (!keys.includes('id')) continue;
    if (REF_ALLOWLIST.has(base)) continue;
    bad++;
    console.error(`${file}\n    ยังเป็น flat: ${base}_{${keys.join(',')}}`);
  }
}

if (bad > 0) {
  console.error(`\n❌ เหลือ flat reference ${bad} group ที่ยังไม่ถูกแปลง`);
  process.exit(1);
}
console.log('✅ ไม่มี flat reference หลงเหลือ');
```

- [ ] **Step 2: รันดูของเดิม — ต้องแดงและบอกตัวเลขตั้งต้น**

```bash
cd ~/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2
bun run scripts/check-flat-refs.ts 2>&1 | tail -5
```
Expected: `❌ เหลือ flat reference 320 group ที่ยังไม่ถูกแปลง`

ตัวเลขนี้คือยอดตั้งต้น ทุก task ต่อจากนี้ต้องทำให้มันลดลง และจบงานที่ 0
ถ้าได้ตัวเลขต่างจาก 320 มาก ให้ตรวจว่า `FIELD_RE` จับฟิลด์ตรงกับที่ serializer เขียนจริงไหม ก่อนไปต่อ

- [ ] **Step 3: Commit**

```bash
git add scripts/check-flat-refs.ts
git commit -m "chore(scripts): ตัวตรวจว่ายังมี flat reference หลงเหลือใน serializer/DTO ไหม"
```

---

### Task 5: สคริปต์ยิง API จริงเทียบ golden snapshot

**Files:**
- Create: `scripts/probe-contract.py` (ใน frontend-react)

**Interfaces:**
- Consumes: `/tmp/carmen-contract-baseline/api/*.json` (มีคีย์ `_url`) จาก Task 1
- Produces: คำสั่งที่บอกว่า (ก) ยังมีคีย์ flat หลงเหลือไหม (ข) ค่าตรงกับ baseline ไหม

- [ ] **Step 1: เขียนสคริปต์**

```python
# scripts/probe-contract.py
"""ยิง API จริงหลังแปลง แล้วเทียบกับ golden snapshot ที่เก็บไว้ก่อนแก้
ใช้: python3 scripts/probe-contract.py /tmp/carmen-contract-baseline
"""
import json, pathlib, subprocess, sys

BASE_DIR = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/carmen-contract-baseline')
TOKEN = (BASE_DIR / 'token.txt').read_text().strip()
APPID = '9c83fd4b-ce3f-4de2-a522-349ad1280b10'
SUFFIXES = ('id', 'name', 'local_name', 'code', 'symbol')
ALLOW = {'created_by', 'updated_by', 'deleted_by', 'po', 'pr', 'grn', 'sr', 'si', 'so',
         'cn', 'invoice', 'tax_invoice', 'sequence', 'doc'}
OPAQUE = ('audit', 'info', 'user_action', 'last_action', 'stages_status')


def flatten(node, out=None, prefix=''):
    """คลี่ object กลับเป็น flat เพื่อเทียบกับ baseline ที่ยังเป็น flat"""
    if out is None:
        out = {}
    if isinstance(node, dict):
        for k, v in node.items():
            if k == '_url':
                continue
            if isinstance(v, dict) and k not in OPAQUE:
                for kk, vv in v.items():
                    if not isinstance(vv, (dict, list)):
                        out[f'{prefix}{k}_{kk}'] = vv
            elif isinstance(v, list):
                for i, item in enumerate(v):
                    flatten(item, out, f'{prefix}{k}[{i}].')
            elif not isinstance(v, dict):
                out[f'{prefix}{k}'] = v
    return out


def leftover_flat(node, path=''):
    """หาคีย์ flat ที่ยังไม่ถูกแปลง"""
    bad = []
    if isinstance(node, dict):
        groups = {}
        for k in node:
            for s in SUFFIXES:
                if k.endswith(f'_{s}'):
                    groups.setdefault(k[: -(len(s) + 1)], []).append(s)
        for base, keys in groups.items():
            if 'id' in keys and base not in ALLOW:
                bad.append(f'{path}{base}_{{{",".join(keys)}}}')
        for k, v in node.items():
            bad += leftover_flat(v, f'{path}{k}.')
    elif isinstance(node, list):
        for item in node[:1]:
            bad += leftover_flat(item, f'{path}[].')
    return bad


fail = 0
for snap in sorted((BASE_DIR / 'api').glob('*.json')):
    before = json.loads(snap.read_text())
    url = before.get('_url')
    if not url:
        print(f'⚠️  {snap.name}: ไม่มี _url ข้าม')
        continue

    raw = subprocess.run(['curl', '-s', f'http://localhost:4000{url}',
                          '-H', f'Authorization: Bearer {TOKEN}',
                          '-H', f'x-app-id: {APPID}'],
                         capture_output=True, text=True).stdout
    after = json.loads(raw)

    problems = []
    left = leftover_flat(after.get('data'))
    if left:
        problems.append(('ยังมี flat หลงเหลือ', left[:10]))

    fb, fa = flatten(before.get('data')), flatten(after.get('data'))
    changed = [f'{k}: {v!r} → {fa[k]!r}' for k, v in fb.items() if k in fa and fa[k] != v]
    missing = [f'หายไป: {k}' for k in fb if k not in fa]
    if changed or missing:
        problems.append(('ค่าไม่ตรง baseline', (changed + missing)[:10]))

    if problems:
        fail += 1
        print(f'❌ {snap.name}')
        for title, items in problems:
            print(f'    {title}:')
            for it in items:
                print(f'      {it}')
    else:
        print(f'✅ {snap.name}')

sys.exit(1 if fail else 0)
```

- [ ] **Step 2: รันตอนนี้ก่อนแก้อะไร — เพื่อยืนยันว่าตัวเทียบเองไม่มีบั๊ก**

```bash
cd ~/GitHub/carmensoftware-organize/carmen-inventory-frontend-react
python3 scripts/probe-contract.py /tmp/carmen-contract-baseline
```
Expected: ทุกไฟล์ `✅` **ยกเว้น** `po.detail.json` ที่จะรายงาน `ยังมี flat หลงเหลือ` (ถูกต้อง — ยังไม่ได้แปลง)

ถ้าตอนนี้มีไฟล์ไหนขึ้น `ค่าไม่ตรง baseline` แปลว่าตัวเทียบผิด (snapshot เทียบกับตัวเองต้องตรงเสมอ) **ต้องแก้ `flatten()` ให้เขียวก่อน** ไม่งั้นทั้งแผนจะไม่มีตาข่าย

- [ ] **Step 3: Commit**

```bash
git add scripts/probe-contract.py
git commit -m "chore(scripts): ตัวเทียบ response หลังแปลง contract กับ golden snapshot"
```

---

### Task 6: ตัวช่วยผลิตบล็อก REFS

**Files:**
- Create: `scripts/gen-ref-map.ts` (ใน backend-v2)

**Interfaces:**
- Consumes: `REF_ALLOWLIST` จาก Task 3
- Produces: คำสั่ง `bun run scripts/gen-ref-map.ts <path>` ที่พิมพ์บล็อก `const REFS = {...} satisfies RefMap;` กับรายการฟิลด์ `entityRef([...])` ให้ก็อปวางลงไฟล์

- [ ] **Step 1: เขียนสคริปต์**

```ts
// scripts/gen-ref-map.ts
import { readFileSync } from 'node:fs';
import { REF_ALLOWLIST } from '../apps/backend-gateway/src/common/dto/entity-ref.allowlist';

const SUFFIXES = ['id', 'name', 'local_name', 'code', 'symbol'] as const;
const FIELD_RE = /^\s{2,}([a-z_][a-z0-9_]*)\s*[?:]\s*(z\.|[A-Z])/;

const file = process.argv[2];
if (!file) {
  console.error('ใช้: bun run scripts/gen-ref-map.ts <path/to/file.serializer.ts>');
  process.exit(1);
}

const names = new Set<string>();
for (const line of readFileSync(file, 'utf8').split('\n')) {
  const m = FIELD_RE.exec(line);
  if (m) names.add(m[1]);
}

const groups = new Map<string, string[]>();
for (const n of names) {
  for (const s of SUFFIXES) {
    if (n.endsWith(`_${s}`)) {
      const base = n.slice(0, -(s.length + 1));
      groups.set(base, [...(groups.get(base) ?? []), s]);
    }
  }
}

// product_local_name เป็นชื่อที่สองของ product ตัวเดียวกัน — ยุบเข้า product
if (groups.has('product') && groups.get('product_local')?.includes('name')) {
  groups.set('product', [...groups.get('product')!, 'local_name']);
  groups.delete('product_local');
}

const entries = [...groups]
  .filter(([base, keys]) => keys.includes('id') && !REF_ALLOWLIST.has(base))
  .sort(([a], [b]) => a.localeCompare(b));

const fmt = (keys: string[]) =>
  SUFFIXES.filter((s) => keys.includes(s)).map((s) => `'${s}'`).join(', ');

console.log('const REFS = {');
for (const [base, keys] of entries) console.log(`  ${base}: [${fmt(keys)}],`);
console.log('} satisfies RefMap;\n');

console.log('// ฟิลด์ที่ต้องมีใน schema:');
for (const [base, keys] of entries) console.log(`  ${base}: entityRef([${fmt(keys)}]),`);
```

- [ ] **Step 2: ลองกับ PO serializer**

```bash
cd ~/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2
bun run scripts/gen-ref-map.ts \
  apps/backend-gateway/src/common/dto/purchase-order/purchase-order.serializer.ts
```
Expected: เห็นอย่างน้อย `vendor: ['id', 'name']`, `currency: ['id', 'code']`, `buyer: ['id', 'name']`, `credit_term: ['id', 'name']`, `workflow: ['id', 'name']`

- [ ] **Step 3: Commit**

```bash
git add scripts/gen-ref-map.ts
git commit -m "chore(scripts): ตัวช่วยผลิต REFS map จาก serializer/DTO ที่มีอยู่"
```

---

## Phase 2 — ฝั่ง response (146 group / 40 ไฟล์)

### Task 7: แปลง serializer กลุ่ม procurement

**Files:**
- Modify: `apps/backend-gateway/src/common/dto/purchase-order/purchase-order.serializer.ts`
- Modify: `apps/backend-gateway/src/common/dto/purchase-request/purchase-request.serializer.ts`
- Modify: `apps/backend-gateway/src/common/dto/purchase-request-template/purchase-request-template.serializer.ts`
- Modify: `apps/backend-gateway/src/common/dto/credit-note/credit-note.serializer.ts`
- Modify: `apps/backend-gateway/src/common/dto/request-for-pricing/request-for-pricing.serializer.ts`
- Modify: `apps/backend-gateway/src/common/dto/pricelist/pricelist.serializer.ts`
- Modify: `apps/backend-gateway/src/common/dto/pricelist-template/pricelist-template.serializer.ts`

**Interfaces:**
- Consumes: `entityRef`, `collapseRefs`, `RefMap` จาก Task 3 · `gen-ref-map.ts` จาก Task 6
- Produces: serializer ที่ export schema แบบห่อด้วย `collapseRefs` แล้ว — **ชื่อ export เดิมไม่เปลี่ยน** controller จึงไม่ต้องแก้

- [ ] **Step 1: ทำ PO ก่อนหนึ่งไฟล์ให้จบ เป็นแม่แบบ**

รูปแบบการแก้ ใช้กับทุกไฟล์:

```ts
// เพิ่ม import
import { collapseRefs, entityRef, type RefMap } from '../entity-ref';

// วางบล็อก REFS ที่ได้จาก gen-ref-map.ts ไว้เหนือ schema
const DETAIL_REFS = {
  base_unit: ['id', 'name'],
  delivery_point: ['id', 'name'],
  location: ['id', 'name', 'code'],
  order_unit: ['id', 'name'],
  product: ['id', 'name', 'local_name', 'code'],
  tax_profile: ['id', 'name'],
} satisfies RefMap;

const HEADER_REFS = {
  buyer: ['id', 'name'],
  credit_term: ['id', 'name'],
  currency: ['id', 'code'],
  vendor: ['id', 'name'],
  workflow: ['id', 'name'],
} satisfies RefMap;

// บรรทัดรายการห่อด้วย collapseRefs ของตัวเอง
const PurchaseOrderDetailLineSchema = collapseRefs(
  DETAIL_REFS,
  z.object({
    id: z.string(),
    sequence_no: z.number().nullable().optional(),
    base_unit: entityRef(['id', 'name']),
    delivery_point: entityRef(['id', 'name']),
    location: entityRef(['id', 'name', 'code']),
    order_unit: entityRef(['id', 'name']),
    product: entityRef(['id', 'name', 'local_name', 'code']),
    tax_profile: entityRef(['id', 'name']),
    // ...ฟิลด์อื่นคงเดิม
  }),
);

export const PurchaseOrderDetailResponseSchema = collapseRefs(
  HEADER_REFS,
  z.object({
    // ...
    buyer: entityRef(['id', 'name']),
    credit_term: entityRef(['id', 'name']),
    currency: entityRef(['id', 'code']),
    vendor: entityRef(['id', 'name']),
    workflow: entityRef(['id', 'name']),
    purchase_order_detail: z.array(PurchaseOrderDetailLineSchema),
  }),
);
```

**ลบทิ้งด้วย:** `VendorEmbeddedSchema`, `CurrencyEmbeddedSchema`, ฟิลด์ `base_currency` และฟิลด์ `vendor` / `currency` แบบเดิม — ของซ้ำที่เป็นต้นเหตุของงานนี้ `entityRef()` แทนที่มันทั้งหมด

- [ ] **Step 2: ยืนยันว่า PO ถูกต้องก่อนทำไฟล์อื่น**

```bash
cd ~/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2
bunx tsc --noEmit -p apps/backend-gateway/tsconfig.json
bun run scripts/check-flat-refs.ts 2>&1 | grep purchase-order.serializer || echo "PO serializer สะอาดแล้ว"
```

รีสตาร์ต gateway แล้วยิงของจริง:

```bash
TOKEN=$(cat /tmp/carmen-contract-baseline/token.txt)
curl -s "http://localhost:4000/api/T02/purchase-orders/49803ba7-83f9-4252-9353-07fd0db635d0" \
  -H "Authorization: Bearer $TOKEN" -H 'x-app-id: 9c83fd4b-ce3f-4de2-a522-349ad1280b10' \
  | python3 -m json.tool | head -40
```
Expected: เห็น `"vendor": {"id": "...", "name": "Daew"}` และ **ไม่มี** `vendor_id` / `vendor_name` แล้ว

- [ ] **Step 3: ทำอีก 6 ไฟล์ที่เหลือด้วยรูปแบบเดียวกัน**

ทีละไฟล์: รัน `gen-ref-map.ts` → วางบล็อก REFS → เปลี่ยนฟิลด์เป็น `entityRef()` → ห่อ schema ด้วย `collapseRefs`

- [ ] **Step 4: Type-check + ตรวจความครบ**

```bash
bunx tsc --noEmit -p apps/backend-gateway/tsconfig.json
bun run scripts/check-flat-refs.ts 2>&1 | tail -3
```
Expected: ตัวเลขที่เหลือลดลงจาก 320 ตามจำนวน group ของ 7 ไฟล์นี้

- [ ] **Step 5: Commit**

```bash
git status --short
git add apps/backend-gateway/src/common/dto/purchase-order \
        apps/backend-gateway/src/common/dto/purchase-request \
        apps/backend-gateway/src/common/dto/purchase-request-template \
        apps/backend-gateway/src/common/dto/credit-note \
        apps/backend-gateway/src/common/dto/request-for-pricing \
        apps/backend-gateway/src/common/dto/pricelist \
        apps/backend-gateway/src/common/dto/pricelist-template
git commit -m "feat(api): serializer กลุ่ม procurement อ้าง entity ด้วย object แทน flat field"
```

คืนไฟล์ที่ formatter hook จัดรูปทับแต่ไม่ได้ตั้งใจแก้ก่อน commit เสมอ

---

### Task 8: แปลง serializer กลุ่ม inventory

**Files:**
- Modify: `apps/backend-gateway/src/common/dto/good-received-note/good-received-note.serializer.ts`
- Modify: `apps/backend-gateway/src/common/dto/store-requisition/store-requisition.serializer.ts`
- Modify: `apps/backend-gateway/src/common/dto/stock-in/stock-in.serializer.ts`
- Modify: `apps/backend-gateway/src/common/dto/stock-out/stock-out.serializer.ts`
- Modify: `apps/backend-gateway/src/common/dto/inventory-transaction/inventory-transaction.serializer.ts`

**Interfaces:**
- Consumes: `entityRef`, `collapseRefs`, `RefMap` จาก Task 3
- Produces: serializer กลุ่ม inventory ที่แปลงแล้ว ชื่อ export เดิม

- [ ] **Step 1: ดู REFS ของทั้ง 5 ไฟล์**

```bash
cd ~/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2
for f in good-received-note store-requisition stock-in stock-out inventory-transaction; do
  echo "=== $f ==="
  bun run scripts/gen-ref-map.ts apps/backend-gateway/src/common/dto/$f/$f.serializer.ts
done
```

- [ ] **Step 2: แปลงทีละไฟล์**

รูปแบบการแก้ (เหมือนกันทุกไฟล์ — ไม่ต้องย้อนไปอ่าน task อื่น):

```ts
import { collapseRefs, entityRef, type RefMap } from '../entity-ref';

// วางบล็อกที่ได้จาก gen-ref-map.ts
const REFS = {
  location: ['id', 'name', 'code'],
  product: ['id', 'name', 'local_name', 'code'],
} satisfies RefMap;

// ห่อ schema ที่ export ด้วย collapseRefs แล้วเปลี่ยนฟิลด์ flat เป็น entityRef
export const SomeResponseSchema = collapseRefs(
  REFS,
  z.object({
    location: entityRef(['id', 'name', 'code']),
    product: entityRef(['id', 'name', 'local_name', 'code']),
    // ...ฟิลด์อื่นคงเดิม
  }),
);
```

**ชื่อ export ต้องไม่เปลี่ยน** controller อ้างชื่อเดิมอยู่ · ถ้าไฟล์มีทั้ง schema ส่วนหัวและ
schema บรรทัดรายการ ต้องห่อ **แยกกันคนละ REFS** เพราะ `collapseRefs` ทำงานที่ระดับ
object ก้อนเดียว ไม่ไล่ลงไปในลูก

**ระวังเป็นพิเศษที่ GRN** — มี `purchase_order` และ `purchase_order_detail` เป็น reference ข้ามเอกสาร (`purchase_order_detail_id`) ซึ่ง**ชื่อชนกับฟิลด์ `good_received_note_detail` ที่เป็น array ของบรรทัดรายการ** ตรวจให้ชัดว่าใน schema ตัวไหนเป็น array ตัวไหนเป็น reference ก่อนใส่ลง REFS ถ้าใส่ผิด `collapseRefs` จะเขียนทับ array ทิ้ง

- [ ] **Step 3: Type-check + ตรวจความครบ**

```bash
bunx tsc --noEmit -p apps/backend-gateway/tsconfig.json
bun run scripts/check-flat-refs.ts 2>&1 | tail -3
```

- [ ] **Step 4: ยิง GRN ของจริงดูว่าไม่ชนกัน**

```bash
TOKEN=$(cat /tmp/carmen-contract-baseline/token.txt)
A=9c83fd4b-ce3f-4de2-a522-349ad1280b10
ID=$(curl -s "http://localhost:4000/api/T02/good-received-notes?perpage=1" \
  -H "Authorization: Bearer $TOKEN" -H "x-app-id: $A" \
  | python3 -c "import sys,re; print(re.search(r'\"id\"\s*:\s*\"([0-9a-f-]{36})\"', sys.stdin.read()).group(1))")
curl -s "http://localhost:4000/api/T02/good-received-notes/$ID" \
  -H "Authorization: Bearer $TOKEN" -H "x-app-id: $A" | python3 -m json.tool | head -50
```
Expected: `purchase_order` เป็น object และ `good_received_note_detail` ยังเป็น array ของบรรทัดรายการ ไม่ถูกทับ

- [ ] **Step 5: Commit**

```bash
git status --short
git add apps/backend-gateway/src/common/dto/good-received-note \
        apps/backend-gateway/src/common/dto/store-requisition \
        apps/backend-gateway/src/common/dto/stock-in \
        apps/backend-gateway/src/common/dto/stock-out \
        apps/backend-gateway/src/common/dto/inventory-transaction
git commit -m "feat(api): serializer กลุ่ม inventory อ้าง entity ด้วย object แทน flat field"
```

---

### Task 9: แปลง serializer กลุ่ม config/master ที่เหลือ

**Files:**
- Modify: serializer ที่เหลือทั้งหมดที่ `check-flat-refs.ts` ยังรายงาน (รวม `product`, `business-unit`, `cost-center`, `chart-of-accounts`, `adjustment-type`, `application-role`, `cluster`, `unit-conversion` ฯลฯ)

**Interfaces:**
- Consumes: `entityRef`, `collapseRefs`, `RefMap` จาก Task 3
- Produces: `check-flat-refs.ts` รายงานเหลือเฉพาะไฟล์ `.dto.ts` (ฝั่ง request) เท่านั้น

- [ ] **Step 1: ดูรายชื่อที่เหลือ**

```bash
cd ~/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2
bun run scripts/check-flat-refs.ts 2>&1 | grep serializer | sort -u
```

- [ ] **Step 2: แปลงทีละไฟล์**

รูปแบบการแก้ (เหมือนกันทุกไฟล์ — ไม่ต้องย้อนไปอ่าน task อื่น):

```ts
import { collapseRefs, entityRef, type RefMap } from '../entity-ref';

// วางบล็อกที่ได้จาก gen-ref-map.ts
const REFS = {
  location: ['id', 'name', 'code'],
  product: ['id', 'name', 'local_name', 'code'],
} satisfies RefMap;

// ห่อ schema ที่ export ด้วย collapseRefs แล้วเปลี่ยนฟิลด์ flat เป็น entityRef
export const SomeResponseSchema = collapseRefs(
  REFS,
  z.object({
    location: entityRef(['id', 'name', 'code']),
    product: entityRef(['id', 'name', 'local_name', 'code']),
    // ...ฟิลด์อื่นคงเดิม
  }),
);
```

**ชื่อ export ต้องไม่เปลี่ยน** controller อ้างชื่อเดิมอยู่ · ถ้าไฟล์มีทั้ง schema ส่วนหัวและ
schema บรรทัดรายการ ต้องห่อ **แยกกันคนละ REFS** เพราะ `collapseRefs` ทำงานที่ระดับ
object ก้อนเดียว ไม่ไล่ลงไปในลูก

ไฟล์กลุ่มนี้ส่วนใหญ่มี reference แค่ 1–3 ตัว (เช่น `cost_center_group`, `account_group`, `default_currency`, `cluster`, `database_pool`, `inventory_unit`) แก้เร็วกว่ากลุ่มเอกสารมาก

- [ ] **Step 3: ยืนยันว่าฝั่ง response สะอาดหมดแล้ว**

```bash
bunx tsc --noEmit -p apps/backend-gateway/tsconfig.json
bun run scripts/check-flat-refs.ts 2>&1 | grep -c serializer
```
Expected: `0`

- [ ] **Step 4: Commit**

```bash
git status --short
git add apps/backend-gateway/src
git commit -m "feat(api): serializer กลุ่ม config/master อ้าง entity ด้วย object แทน flat field"
```

---

### Task 10: เทียบ golden snapshot ฝั่ง response

**Files:** ไม่แก้โค้ด — เป็นด่านตรวจ

**Interfaces:**
- Consumes: `scripts/probe-contract.py` จาก Task 5 · golden snapshot จาก Task 1

- [ ] **Step 1: รีสตาร์ต gateway แล้วรันตัวเทียบ**

```bash
cd ~/GitHub/carmensoftware-organize/carmen-inventory-frontend-react
python3 scripts/probe-contract.py /tmp/carmen-contract-baseline \
  | tee /tmp/carmen-contract-baseline/probe-after-response.txt
```
Expected: ทุกไฟล์ `✅` — ไม่มี flat หลงเหลือ **และ** ไม่มีค่าไหนเพี้ยนจาก baseline

- [ ] **Step 2: ถ้าเจอ `ค่าไม่ตรง baseline` ให้หยุดและไล่หาสาเหตุ**

สาเหตุที่พบบ่อยเรียงตามความน่าจะเป็น:
1. `REFS` map ระบุคีย์ไม่ครบ → บางคีย์ถูกทิ้งตอนยุบ (เช่นลืม `code`)
2. `collapseRefs` วางผิดชั้น — วางที่ schema แม่ แต่ฟิลด์อยู่ในบรรทัดรายการ
3. base ชนกัน เช่น `purchase_order` กับ `purchase_order_detail` ใน GRN

**ห้ามแก้ baseline ให้ตรงกับผลลัพธ์ใหม่** baseline คือความจริง

- [ ] **Step 3: ถ้าเจอ `ยังมี flat หลงเหลือ` ทั้งที่ `check-flat-refs` เขียว**

แปลว่า serializer ไม่ได้ครอบ endpoint นั้น (controller อาจไม่มี `@Serialize` หรือใช้ schema คนละตัว) ให้ไล่จาก controller ของ endpoint นั้นว่าใช้ schema ไหน

---

### Task 11: แก้เทสต์ backend ที่อ้างรูป response เดิม

**Files:**
- Modify: 11 ไฟล์ `*.serializer.spec.ts` / `*.dto.spec.ts` ใน `apps/backend-gateway/src`
- Modify: ไฟล์ใน 75 controller/service spec ที่ assert รูป response จริง (ต้องไล่ดู ส่วนใหญ่แค่ mock ฝั่ง micro ซึ่งยังเป็น flat จึงไม่ต้องแก้)

**Interfaces:**
- Consumes: รายชื่อ suite ที่แดงอยู่เดิมจาก Task 1

- [ ] **Step 1: รันเทสต์ gateway แล้วเทียบกับ baseline**

```bash
cd ~/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2
(cd apps/backend-gateway && bunx jest --silent) 2>&1 | grep -E "^(FAIL|Tests:|Test Suites:)" \
  > /tmp/carmen-contract-baseline/tests-after-response.txt
diff /tmp/carmen-contract-baseline/gateway-red.txt \
     /tmp/carmen-contract-baseline/tests-after-response.txt
```

บรรทัดที่โผล่มาใหม่ = ของที่เราทำพัง · บรรทัดที่มีอยู่เดิม = ไม่ต้องสนใจ

- [ ] **Step 2: แก้ assertion ในไฟล์ที่แดงใหม่**

```ts
// เดิม
expect(result.vendor_id).toBe('v1');
expect(result.vendor_name).toBe('Daew');

// ใหม่
expect(result.vendor).toEqual({ id: 'v1', name: 'Daew' });
```

**ห้ามแก้เทสต์ของ micro-business** — ถ้าเจอว่ามันแดง แปลว่าเผลอไปแก้ผิดชั้น ให้ย้อนดู

- [ ] **Step 3: ยืนยันว่าไม่มีของแดงใหม่เหลือ**

```bash
(cd apps/backend-gateway && bunx jest --silent) 2>&1 | grep -E "^(FAIL|Tests:)" \
  > /tmp/carmen-contract-baseline/tests-after-fix.txt
diff /tmp/carmen-contract-baseline/gateway-red.txt /tmp/carmen-contract-baseline/tests-after-fix.txt \
  && echo "✅ ไม่มีของแดงใหม่"
```

- [ ] **Step 4: ยืนยันว่า micro-business ยังเขียวเท่าเดิม**

```bash
(cd apps/micro-business && bunx jest --silent) 2>&1 | grep -E "^(Tests:|Test Suites:)"
```
Expected: ตัวเลขเท่ากับตอน baseline เป๊ะ — **ถ้าเปลี่ยนแปลว่าแก้ผิดชั้น**

- [ ] **Step 5: Commit**

```bash
git status --short
git add apps/backend-gateway/src
git commit -m "test(gateway): ปรับ assertion ให้ตรงกับ response รูป object"
```

---

## Phase 3 — ฝั่ง request (174 group / 63 ไฟล์)

### Task 12: ย้าย 25 plain-class DTO ไปใช้ createZodDto (ยังไม่แปลงอะไร)

**Files:**
- Modify: 25 ไฟล์ `*.dto.ts` ที่เป็น plain class รวม `apps/backend-gateway/src/common/dto/purchase-order/purchase-order.create.dto.ts`

**Interfaces:**
- Produces: DTO ทุกตัวถูก `ZodValidationPipe` มองเห็น — เป็นเงื่อนไขที่ Task 13–14 ต้องใช้

**ทำไมต้องแยกเป็น task ของตัวเอง:** DTO พวกนี้วันนี้ **ไม่ถูก validate เลย** body ผ่านฉลุย การย้ายไป `createZodDto` เท่ากับเพิ่มการตรวจที่ไม่เคยมี ถ้าทำพร้อมการแปลง object จะ debug ไม่ออกว่าพังเพราะอะไร

- [ ] **Step 1: หารายชื่อ 25 ไฟล์**

```bash
cd ~/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2/apps/backend-gateway/src
grep -rL 'createZodDto' --include='*.dto.ts' . | xargs grep -l 'export class' | sort
```

- [ ] **Step 2: แปลงทีละไฟล์ โดยให้ schema หลวมที่สุดก่อน**

```ts
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod/v4';

// passthrough = ยอมให้มีคีย์เกินได้ ไม่ reject ของที่วันนี้ผ่านอยู่
const PurchaseOrderCreateSchema = z
  .object({
    stage_role: z.string(),
    details: z.object({}).passthrough(),
  })
  .passthrough();

export class PurchaseOrderCreateDto extends createZodDto(PurchaseOrderCreateSchema) {}
```

**`passthrough()` สำคัญมากในขั้นนี้** — เป้าหมายคือให้ pipe มองเห็น DTO ไม่ใช่เริ่มบังคับ schema ถ้ารัดแน่นตอนนี้จะมี payload จริงที่เคยผ่านแล้วเริ่ม 400 โดยไม่รู้ตัว

- [ ] **Step 3: Type-check**

```bash
cd ~/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2
bunx tsc --noEmit -p apps/backend-gateway/tsconfig.json
```

- [ ] **Step 4: ตรวจด้วยมือว่าการเขียนยังทำงาน — สร้าง PO จริงหนึ่งใบ**

```bash
cd ~/GitHub/carmensoftware-organize/carmen-inventory-frontend-react
bun dev
```

เปิดเบราว์เซอร์ → `/procurement/purchase-order` → สร้างใหม่ → กด Save
Expected: บันทึกสำเร็จ ไม่ขึ้น 400

จดเลขที่ใบที่สร้างไว้ แล้วลบทิ้งหลังตรวจ (`:4000` ชี้ DB dev ที่ใช้ร่วมกัน)

- [ ] **Step 5: Commit**

```bash
cd ~/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2
git status --short
git add apps/backend-gateway/src
git commit -m "refactor(dto): ย้าย DTO ที่เป็น plain class ไปใช้ createZodDto (passthrough ก่อน)"
```

---

### Task 13: แปลง DTO กลุ่มเอกสาร

**Files:**
- Modify: DTO ของ purchase-order, purchase-request, purchase-request-template, good-received-note, store-requisition, stock-in, stock-out, credit-note ใน `apps/backend-gateway/src/common/dto/`

**Interfaces:**
- Consumes: `expandRefs`, `entityRef`, `RefMap` จาก Task 3 · DTO ที่ย้ายไป createZodDto แล้วจาก Task 12
- Produces: DTO ที่รับ object แล้วคลี่เป็น flat ก่อนส่งต่อ — micro-business ได้ payload หน้าตาเดิม

- [ ] **Step 1: แปลงทีละไฟล์**

```ts
import { expandRefs, entityRef, type RefMap } from '../entity-ref';

const DETAIL_REFS = {
  delivery_point: ['id'],
  location: ['id'],
  order_unit: ['id'],
  product: ['id'],
  tax_profile: ['id'],
} satisfies RefMap;

const PoDetailPayloadSchema = expandRefs(
  DETAIL_REFS,
  z.object({
    delivery_point: entityRef(['id']),
    location: entityRef(['id']),
    order_unit: entityRef(['id']),
    product: entityRef(['id']),
    tax_profile: entityRef(['id']),
    order_qty: z.number(),
    // ...ฟิลด์อื่นคงเดิม
  }).passthrough(),
);
```

**หมายเหตุ:** ฝั่ง request ส่วนใหญ่เป็น `{ id }` เดี่ยว ๆ (140 จาก 174 group) ตามที่ตกลงกันไว้ — ห่อเปล่าแบบนี้ถูกต้องแล้ว ไม่ต้องเติม `name` ให้

- [ ] **Step 2: Type-check + ตรวจความครบ**

```bash
cd ~/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2
bunx tsc --noEmit -p apps/backend-gateway/tsconfig.json
bun run scripts/check-flat-refs.ts 2>&1 | tail -3
```

- [ ] **Step 3: ยืนยันว่า micro-business ได้ payload หน้าตาเดิม — ด่านสำคัญที่สุดของ Phase 3**

gateway controller มี `this.logger.debug({ function: 'create', createDto })` อยู่แล้ว สร้าง PO จากเบราว์เซอร์แล้วดู log ของ gateway

Expected ใน log: เห็น `vendor_id` / `vendor_name` (flat)
**ถ้าเห็น `vendor: { id: ... }`** แปลว่า `expandRefs` ไม่ทำงาน — micro-business จะได้ของผิดและ**เขียน null ลง DB** ห้ามไปต่อจนกว่าจะแก้

- [ ] **Step 4: ตรวจว่า partial update ไม่ล้างค่าอื่น**

เปิดใบ PO ที่มี `credit_term` อยู่แล้ว → แก้แค่ช่อง remarks → Save → เปิดใหม่
Expected: `credit_term` ยังอยู่ ไม่กลายเป็นว่าง

- [ ] **Step 5: Commit**

```bash
git status --short
git add apps/backend-gateway/src/common/dto
git commit -m "feat(api): DTO กลุ่มเอกสารรับ entity เป็น object แล้วคลี่เป็น flat ก่อนส่งต่อ"
```

---

### Task 14: แปลง DTO กลุ่ม config/master ที่เหลือ

**Files:**
- Modify: DTO ที่เหลือทั้งหมดที่ `check-flat-refs.ts` ยังรายงาน

**Interfaces:**
- Consumes: `expandRefs`, `entityRef`, `RefMap` จาก Task 3
- Produces: `bun run scripts/check-flat-refs.ts` ผ่าน (exit 0)

- [ ] **Step 1: ดูรายชื่อที่เหลือแล้วแปลงทีละไฟล์**

```bash
cd ~/GitHub/carmensoftware-organize/carmen-turborepo-backend-v2
bun run scripts/check-flat-refs.ts 2>&1 | grep '\.dto\.ts' | sort -u
```

- [ ] **Step 2: ยืนยันว่าสะอาดทั้งระบบ**

```bash
bunx tsc --noEmit -p apps/backend-gateway/tsconfig.json
bun run scripts/check-flat-refs.ts
```
Expected: `✅ ไม่มี flat reference หลงเหลือ`

- [ ] **Step 3: รันเทสต์ gateway เทียบ baseline อีกรอบ**

```bash
(cd apps/backend-gateway && bunx jest --silent) 2>&1 | grep -E "^(FAIL|Tests:)" \
  > /tmp/carmen-contract-baseline/tests-after-request.txt
diff /tmp/carmen-contract-baseline/gateway-red.txt \
     /tmp/carmen-contract-baseline/tests-after-request.txt
```

- [ ] **Step 4: Commit**

```bash
git status --short
git add apps/backend-gateway/src
git commit -m "feat(api): DTO กลุ่ม config/master รับ entity เป็น object"
```

---

## Phase 4 — frontend-react (~2,358 จุด / 297 ไฟล์)

### Task 15: แก้ type แล้วให้ tsc ชี้ทาง

**Files:**
- Create: `types/entity-ref.ts`
- Modify: `types/*.ts` ทุกไฟล์ที่ประกาศ entity reference แบบ flat

**Interfaces:**
- Consumes: รูป object ที่ backend ส่งจริง (ยืนยันแล้วใน Task 10)
- Produces: `EntityRef` ที่ทุกโมดูลใช้ร่วมกัน + รายการ error จาก `tsc` = รายการงานของ Task 16–17

- [ ] **Step 1: ประกาศ `EntityRef` ที่เดียว**

```ts
// types/entity-ref.ts

/** entity reference ที่ API ส่งมา — คีย์ที่ไม่มีในเอกสารนั้นจะไม่ถูกส่งมาเลย */
export interface EntityRef {
  id: string;
  name?: string | null;
  local_name?: string | null;
  code?: string | null;
  symbol?: string | null;
}
```

**ห้ามประกาศซ้ำในแต่ละไฟล์** — import จากที่นี่เสมอ

- [ ] **Step 2: แก้ type ของเอกสารหลัก**

```ts
// types/purchase-order.ts
import type { EntityRef } from './entity-ref';

export interface PurchaseOrder {
  // ลบทิ้ง: vendor_id, vendor_name, currency_id, currency_code,
  //         buyer_id, buyer_name, credit_term_id, credit_term_name,
  //         workflow_id, workflow_name
  // ลบทิ้งด้วย: vendor?: { id: string; name: string } กับ currency?: {...} ของเดิม
  vendor: EntityRef | null;
  currency: EntityRef | null;
  buyer: EntityRef | null;
  credit_term: EntityRef | null;
  workflow: EntityRef | null;
  // ...ฟิลด์อื่นคงเดิม
}
```

ทำแบบเดียวกันกับ `CreatePoDto` และ type ของ PR / GRN / SR / SI / SO

- [ ] **Step 3: ให้ tsc ผลิตรายการงาน**

```bash
cd ~/GitHub/carmensoftware-organize/carmen-inventory-frontend-react
bunx tsc --noEmit 2>&1 | tee /tmp/carmen-contract-baseline/fe-errors.txt | tail -5
grep -c "error TS" /tmp/carmen-contract-baseline/fe-errors.txt
echo "--- แยกตามโฟลเดอร์ ---"
grep "error TS" /tmp/carmen-contract-baseline/fe-errors.txt \
  | sed 's|(.*||' | sed 's|/[^/]*$||' | sort | uniq -c | sort -rn | head -20
```

รายการนี้คือขอบเขตงานจริงของ Phase 4 **ไม่ต้อง grep เอง**

- [ ] **Step 4: Commit type ก่อน (ยัง compile ไม่ผ่าน — ตั้งใจ)**

```bash
git add types/
git commit -m "refactor(types): entity reference เป็น object ตาม contract ใหม่"
```

---

### Task 16: ตามแก้ FE โมดูล procurement

**Files:**
- Modify: ไฟล์ใต้ `routes/procurement/` ที่ `tsc` รายงาน

**Interfaces:**
- Consumes: `EntityRef` จาก Task 15 · รายการ error จาก `fe-errors.txt`

- [ ] **Step 1: ไล่แก้ตามรายการ error**

```tsx
// เดิม
{item.vendor_name}
<span>{row.original.currency_code}</span>
accessorFn: (row) => row.vendor_name,

// ใหม่
{item.vendor?.name}
<span>{row.original.currency?.code}</span>
accessorFn: (row) => row.vendor?.name,
```

**ระวัง 3 จุด:**
1. **`accessorKey` ของ data-grid** — `accessorKey: "vendor_name"` ใช้กับ nested ไม่ได้ ต้องเปลี่ยนเป็น `accessorFn: (row) => row.vendor?.name` พร้อมตั้ง `id: "vendor_name"` ให้ชัด ไม่งั้นคอลัมน์จะหายและการเรียงจะพัง
2. **`build-po-payload.ts` และ form schema** — ฝั่งส่งขึ้นต้องเปลี่ยนเป็น object ตาม Task 13 ด้วย ไม่ใช่แค่ฝั่งอ่าน
3. **ห้ามใส่ `{{}}` ในไฟล์แปล** — ถ้าต้องแก้ข้อความ ICU จะอ่านเป็น argument แล้วหน้าพังทั้งหน้า typecheck จับไม่ได้

- [ ] **Step 2: Type-check เฉพาะโมดูลนี้**

```bash
bunx tsc --noEmit 2>&1 | grep -c "routes/procurement"
```
Expected: `0`

- [ ] **Step 3: Lint**

```bash
bun run lint
```

- [ ] **Step 4: Commit**

```bash
git add routes/procurement
git commit -m "refactor(procurement): อ่าน entity reference จาก object แทน flat field"
```

---

### Task 17: ตามแก้ FE โมดูลที่เหลือ

**Files:**
- Modify: ไฟล์ใต้ `routes/` โมดูลอื่นทั้งหมดที่ `tsc` ยังรายงาน + `components/` + `hooks/`
- Modify: 43 ไฟล์เทสต์ที่อ้าง flat

**Interfaces:**
- Consumes: `EntityRef` จาก Task 15

- [ ] **Step 1: ไล่แก้ทีละโมดูล เรียงจากจำนวน error มากไปน้อย**

```bash
cd ~/GitHub/carmensoftware-organize/carmen-inventory-frontend-react
bunx tsc --noEmit 2>&1 | grep "error TS" | sed 's|(.*||' | sed 's|/[^/]*$||' \
  | sort | uniq -c | sort -rn
```

commit ทีละโมดูล ไม่รวบ — จะได้ย้อนทีละชิ้นได้ถ้าพัง

- [ ] **Step 2: ยืนยันว่า compile ผ่านทั้งโปรเจกต์**

```bash
bunx tsc --noEmit && echo "✅ typecheck ผ่าน"
bun run lint
```

- [ ] **Step 3: รันเทสต์ FE ที่มีอยู่แล้วแก้ fixture ให้เป็นรูป object**

```bash
bun test:run 2>&1 | tail -20
```

43 ไฟล์ที่อ้าง flat จะแดง — แก้ fixture/assertion ให้เป็นรูป object **ห้ามลบเทสต์ทิ้ง**

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "refactor(fe): โมดูลที่เหลืออ่าน entity reference จาก object"
```

---

## Phase 5 — mobile (~453 จุด / 36 ไฟล์)

### Task 18: แก้ mobile ด้วยวิธีเดียวกัน

**Files:**
- Create: `src/lib/api/entity-ref.ts`
- Modify: `src/lib/api/*.ts` แล้วตามด้วยจอที่ `tsc` ชี้

**Interfaces:**
- Consumes: รูป object ที่ backend ส่งจริง (ยืนยันแล้วใน Task 10)

- [ ] **Step 1: ประกาศ `EntityRef` แล้วแก้ type ใน `src/lib/api/`**

```ts
// src/lib/api/entity-ref.ts
export interface EntityRef {
  id: string;
  name?: string | null;
  local_name?: string | null;
  code?: string | null;
  symbol?: string | null;
}
```

```bash
cd ~/GitHub/carmensoftware-organize/carmen-inventory-mobile
grep -rn "vendor_name\|currency_code\|product_name" src/lib/api/ | head -20
```

- [ ] **Step 2: ให้ tsc ชี้จุดที่เหลือ**

```bash
bunx tsc --noEmit 2>&1 | tee /tmp/carmen-contract-baseline/mobile-errors.txt | tail -5
grep -c "error TS" /tmp/carmen-contract-baseline/mobile-errors.txt
```

- [ ] **Step 3: ไล่แก้จนเขียว**

```bash
bunx tsc --noEmit && echo "✅ typecheck ผ่าน"
bun run lint
```

- [ ] **Step 4: Commit**

```bash
git add src
git commit -m "refactor(mobile): อ่าน entity reference จาก object ตาม contract ใหม่"
```

---

## Phase 6 — e2e

### Task 19: แก้ e2e 6 ไฟล์

**Files:**
- Modify: 6 ไฟล์ใน `carmen-inventory-frontend-e2e/tests/` ที่อ้าง flat

**Interfaces:**
- Consumes: FE ที่แก้เสร็จแล้วจาก Task 17

- [ ] **Step 1: หาไฟล์ที่ต้องแก้**

```bash
cd ~/GitHub/carmensoftware-organize/carmen-inventory-frontend-e2e
grep -rEln '\b(vendor|currency|product|location)_(id|name|code)\b' tests/
```

- [ ] **Step 2: แก้แล้วรัน**

```bash
E2E_FRONTEND_DIR=../carmen-inventory-frontend-react bun e2e 2>&1 | tail -20
```

- [ ] **Step 3: Commit**

```bash
git add tests
git commit -m "test(e2e): ปรับให้ตรงกับ contract รูป object"
```

---

## Phase 7 — ตรวจด้วยมือและ deploy

### Task 20: ตรวจด้วยมือในเบราว์เซอร์

**Files:** ไม่แก้โค้ด

**ข้อสำคัญที่สุด: ต้องกด Save จริงทุกเอกสาร ไม่ใช่แค่เปิดดู** เพราะรอบนี้ขาเข้าเปลี่ยนด้วย ถ้าดูแค่หน้า list/detail จะไม่รู้ว่าการเขียนพัง จนกว่าจะมีคนสร้างเอกสารจริงแล้วข้อมูลหาย

- [ ] **Step 1: เปิดแอปชี้ backend local**

```bash
cd ~/GitHub/carmensoftware-organize/carmen-inventory-frontend-react
bun dev
```

- [ ] **Step 2: ไล่ตรวจทั้ง 6 เอกสาร — PR · PO · GRN · SR · SI · SO**

ทำครบทุกช่องต่อหนึ่งเอกสาร:

| ขั้น | สิ่งที่ต้องเห็น |
|---|---|
| เปิด list | ชื่อ vendor / ผู้ขอ / location ขึ้นครบ ไม่ใช่ช่องว่าง |
| เรียงคอลัมน์ที่เป็นชื่อ | เรียงได้จริง (ถ้าพังแปลว่า `accessorFn` ผิดตาม Task 16) |
| เปิด detail | ชื่อทุกช่องขึ้นครบ รวมบรรทัดรายการ |
| **สร้างใหม่ + Save** | บันทึกสำเร็จ ไม่ขึ้น 400 |
| **เปิดใบที่เพิ่งสร้าง** | ชื่อ vendor / สินค้า / location ยังอยู่ ไม่กลายเป็นว่าง |
| **แก้ช่องเดียวแล้ว Save ซ้ำ** | ค่าที่ไม่ได้แก้ต้องไม่ถูกล้างเป็น null |

**แถวสุดท้ายสำคัญมาก** — ถ้า `expandRefs` เขียน flat ให้ base ที่ไม่ได้ส่งมา การอัปเดตบางฟิลด์จะล้างค่าอื่นทิ้ง (กันไว้แล้วใน Task 3 Step 4 แต่ต้องเห็นของจริง)

- [ ] **Step 3: ตรวจเส้นที่ส่ง reference ข้ามเอกสาร**

จุดนี้พังก่อนที่อื่นถ้าการคลี่ object→flat ผิด:
- สร้าง PO **จาก PR** → สินค้าและจำนวนต้องยกมาครบ
- สร้าง GRN **จาก PO** → บรรทัดรายการต้องยกมาครบ

- [ ] **Step 4: ลบเอกสารทดสอบที่สร้างไว้**

`:4000` ชี้ DB dev ที่ใช้ร่วมกัน — จดเลขที่เอกสารที่สร้างระหว่างตรวจ แล้วลบให้หมด

---

### Task 21: ตรวจ mobile

**Files:** ไม่แก้โค้ด

- [ ] **Step 1: build internal**

```bash
cd ~/GitHub/carmensoftware-organize/carmen-inventory-mobile
eas build -p android --profile internal
```

- [ ] **Step 2: ตรวจ 3 จอ**

| จอ | สิ่งที่ต้องเห็น |
|---|---|
| po-list | ชื่อ vendor กับผู้ซื้อขึ้นครบทุกแถว |
| po-detail | ชื่อ vendor, สกุลเงิน, สินค้าในบรรทัดรายการ |
| receiving | รับของจาก PO ได้ ชื่อสินค้าขึ้นครบ |

---

### Task 22: deploy

**Files:** ไม่แก้โค้ด

- [ ] **Step 1: merge ให้ครบทั้ง 3 รีโปก่อน ยังไม่ deploy อะไรเลย**

```bash
# ห้าม squash-merge รีโป FE — changelog รอบถัดไปจะว่างเปล่าเงียบ ๆ
gh pr merge --merge
```

- [ ] **Step 2: นัดเวลา deploy ล่วงหน้า**

ระหว่าง gateway ขึ้นแล้วแต่ FE ยังไม่ขึ้น **ระบบจะพัง** นี่คือราคาของการเลือก big-bang ที่ยืนยันไว้ ต้องทำให้หน้าต่างนี้สั้นที่สุดและไม่ทำในเวลาที่มีคนใช้งาน

- [ ] **Step 3: deploy ตามลำดับ**

```
1. gateway (backend-v2)
2. frontend-react  ← ทันทีติด ๆ กัน
3. mobile internal build  ← ตามหลังได้ ยังไม่ live
```

- [ ] **Step 4: ยืนยันหลัง deploy**

```bash
cd ~/GitHub/carmensoftware-organize/carmen-inventory-frontend-react
python3 scripts/probe-contract.py /tmp/carmen-contract-baseline
```

- [ ] **Step 5: ถ้าต้อง rollback**

revert โค้ด gateway อย่างเดียว — ไม่มี migration ไม่ต้องกู้ข้อมูล แล้ว revert FE ตามทันที ไม่งั้นจะพังสลับข้าง

---

## หมายเหตุปิดท้าย

- **เส้นตรวจสอบตัวเองตลอดทั้งแผน:** ถ้าเมื่อไหร่พบว่าต้องแก้โค้ดหรือเทสต์ของ micro-business แปลว่าหลุดไปแก้ผิดชั้น ให้หยุดแล้วย้อนดู
- **`bun run scripts/check-flat-refs.ts` คือตัวชี้ขาดว่างานเสร็จหรือยัง** — ต้องได้ `✅ ไม่มี flat reference หลงเหลือ`
- **`python3 scripts/probe-contract.py` คือตัวชี้ขาดว่าข้อมูลไม่หาย** — ต้องเขียวทุกไฟล์
