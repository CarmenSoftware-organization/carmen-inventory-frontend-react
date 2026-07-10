# Business Setting PO Config Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เพิ่ม section **PO** (Purchase Order) พร้อม boolean config `po.group-by-pr-comment` ในหน้า `/system-admin/business-setting` — reuse boolean/Switch registry path เดิม, persist ผ่าน `PATCH /api/business-units`

**Architecture:** เพิ่มแค่ registry data (`po` section ใน `CONFIG_SECTIONS`) + i18n. `mergeSeededConfig` / `groupConfigForRender` / `ConfigField` (boolean → Switch) / component / `buildPatch` reuse ทั้งหมด — ไม่มีโค้ด logic ใหม่

**Tech Stack:** React 19, TypeScript, use-intl, Vitest, bun

## Global Constraints

- **Frontend only** — ห้ามแก้ backend, hooks, endpoint, form schema, `ConfigField`, component, `mergeSeededConfig`, `groupConfigForRender`
- **datatype `"boolean"` → Switch** (reuse เดิม)
- **default (seed) = `"false"`**; value เป็น string เสมอ
- **i18n ทั้ง en + th**; JSON valid; Thai diacritics ครบ
- Exact strings — en: `sections.po`="PO", `sections.poDesc`="Purchase Order settings for this business unit.", `config.poGroupByPrComment`="Group by PR comment"; th: "PO"/"การตั้งค่า Purchase Order ของหน่วยธุรกิจนี้"/"เพิ่มการจัดกลุ่มตาม pr comment"
- canonical label EN (`label: "Group by PR comment"`) เก็บใน registry; display เป็น i18n
- **สื่อสารกับ user เป็นภาษาไทย**; code/commit เป็นอังกฤษ
- branch: `feat/business-setting-po-config-section`
- baseline (main หลัง PR #44): `bunx tsc --noEmit` = 0, `bun run build` เขียว, business-setting tests ผ่าน
- **Verify ก่อนจบ:** `bunx tsc --noEmit`, `bun run build`, `bun test:run routes/system-admin/business-setting/` ต้องผ่าน

---

### Task 1: PO boolean config section + i18n

**Files:**
- Modify: `routes/system-admin/business-setting/business-setting-config-registry.ts`
- Modify: `messages/en.json`, `messages/th.json`
- Test: `routes/system-admin/business-setting/business-setting-config-registry.test.ts`

**Interfaces:**
- Consumes: `CONFIG_SECTIONS`, `SeededConfigItem` (เดิม); boolean rendering ผ่าน `ConfigField` (เดิม)
- Produces: `po` section ใน `CONFIG_SECTIONS` (ไม่มี export ใหม่)

- [ ] **Step 1: เขียน/แก้ test (RED)**

ใน `business-setting-config-registry.test.ts`:

(1a) **แก้เทสที่ hardcode จำนวน section ให้ robust.** เปลี่ยนบล็อกจาก:
```ts
    const merged = mergeSeededConfig([]); // → [pr, si]
    const groups = groupConfigForRender(merged);
    expect(groups.sections).toHaveLength(2);
    expect(groups.sections[0].id).toBe("pr");
```
เป็น:
```ts
    const merged = mergeSeededConfig([]); // → one entry per seeded section
    const groups = groupConfigForRender(merged);
    expect(groups.sections).toHaveLength(CONFIG_SECTIONS.length);
    expect(groups.sections[0].id).toBe("pr");
```
(mergeSeededConfig([]) seed ทุก section → จำนวน section ที่ render เท่ากับ `CONFIG_SECTIONS.length` เสมอ — ไม่พังอีกเมื่อเพิ่ม config ในอนาคต)

(1b) **เพิ่ม describe block ใหม่** (ท้ายไฟล์):
```ts
describe("PO config registry", () => {
  it("registers po.group-by-pr-comment as a boolean defaulting to false under section 'po'", () => {
    const po = CONFIG_SECTIONS.find((s) => s.id === "po");
    expect(po).toBeDefined();
    const item = po?.items.find((i) => i.key === "po.group-by-pr-comment");
    expect(item).toBeDefined();
    expect(item?.datatype).toBe("boolean");
    expect(item?.defaultValue).toBe("false");
    expect(item?.labelKey).toBe("config.poGroupByPrComment");
    expect(item?.options).toBeUndefined();
  });
});
```

- [ ] **Step 2: รัน test ให้ fail**

Run: `bun test:run routes/system-admin/business-setting/business-setting-config-registry.test.ts`
Expected: FAIL — "PO config registry" ล้ม (ยังไม่มี section `po`); (1a) ผ่านแล้วเพราะ `CONFIG_SECTIONS.length` = 2 ตรงกับ sections ปัจจุบัน

- [ ] **Step 3: เพิ่ม PO section ใน registry**

ใน `business-setting-config-registry.ts` แก้ท้าย `CONFIG_SECTIONS` — เปลี่ยน:
```ts
        ],
      },
    ],
  },
];
```
เป็น (เพิ่ม `po` object ก่อน `];`):
```ts
        ],
      },
    ],
  },
  {
    id: "po",
    titleKey: "sections.po",
    descKey: "sections.poDesc",
    items: [
      {
        key: "po.group-by-pr-comment",
        datatype: "boolean",
        defaultValue: "false",
        label: "Group by PR comment",
        labelKey: "config.poGroupByPrComment",
      },
    ],
  },
];
```

- [ ] **Step 4: รัน registry test ให้ผ่าน**

Run: `bun test:run routes/system-admin/business-setting/business-setting-config-registry.test.ts`
Expected: PASS ทั้งหมด (PO test ผ่าน; `toHaveLength(CONFIG_SECTIONS.length)` = 3 ผ่าน)

- [ ] **Step 5: เพิ่ม i18n — `messages/en.json`**

(5a) `businessSetting.sections` — เปลี่ยน:
```json
      "si": "SI",
      "siDesc": "Stock In settings for this business unit."
    },
```
เป็น:
```json
      "si": "SI",
      "siDesc": "Stock In settings for this business unit.",
      "po": "PO",
      "poDesc": "Purchase Order settings for this business unit."
    },
```

(5b) `businessSetting.config` — เปลี่ยน:
```json
      "siCostFromOptions": {
        "average": "Average",
        "lastReceiving": "Last receiving",
        "lastCost": "Last cost"
      }
    }
```
เป็น:
```json
      "siCostFromOptions": {
        "average": "Average",
        "lastReceiving": "Last receiving",
        "lastCost": "Last cost"
      },
      "poGroupByPrComment": "Group by PR comment"
    }
```

- [ ] **Step 6: เพิ่ม i18n — `messages/th.json`**

(6a) `businessSetting.sections` — เปลี่ยน:
```json
      "si": "SI",
      "siDesc": "การตั้งค่า Stock In ของหน่วยธุรกิจนี้"
    },
```
เป็น:
```json
      "si": "SI",
      "siDesc": "การตั้งค่า Stock In ของหน่วยธุรกิจนี้",
      "po": "PO",
      "poDesc": "การตั้งค่า Purchase Order ของหน่วยธุรกิจนี้"
    },
```

(6b) `businessSetting.config` — เปลี่ยน:
```json
      "siCostFromOptions": {
        "average": "เฉลี่ย",
        "lastReceiving": "รับล่าสุด",
        "lastCost": "ต้นทุนล่าสุด"
      }
    }
```
เป็น:
```json
      "siCostFromOptions": {
        "average": "เฉลี่ย",
        "lastReceiving": "รับล่าสุด",
        "lastCost": "ต้นทุนล่าสุด"
      },
      "poGroupByPrComment": "เพิ่มการจัดกลุ่มตาม pr comment"
    }
```

- [ ] **Step 7: ยืนยัน JSON valid + full verify**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8'));JSON.parse(require('fs').readFileSync('messages/th.json','utf8'));console.log('json ok')"`
Expected: `json ok`

Run: `bunx tsc --noEmit`
Expected: 0 errors

Run: `bun test:run routes/system-admin/business-setting/`
Expected: PASS ทั้งหมด (registry + schema + ui)

Run: `bun run build`
Expected: สำเร็จ (`✓ built`)

- [ ] **Step 8: Manual verification (ผู้ทำ implementation ข้าม — controller/user ตรวจ)**

`/system-admin/business-setting` → เห็น section **PO** พร้อม "เพิ่มการจัดกลุ่มตาม pr comment" (view = ใช่/ไม่ = "ไม่"); Edit → **Switch**; เปิด → Save → reload ค่าคงอยู่; สลับ EN/TH label เปลี่ยน ไม่ dirty

- [ ] **Step 9: Commit**

```bash
git add routes/system-admin/business-setting/business-setting-config-registry.ts \
        routes/system-admin/business-setting/business-setting-config-registry.test.ts \
        messages/en.json messages/th.json
git commit -m "feat(business-setting): add PO config section (po.group-by-pr-comment)"
```

---

## Self-Review (ผู้เขียน plan ตรวจกับ spec)

**Spec coverage:**
- §2.1 default false → Step 3 (defaultValue "false") ✅
- §2.2 PO = Purchase Order → Step 5/6 (poDesc) ✅
- §2.3 boolean → Switch (reuse) → ไม่มีโค้ด component; registry datatype "boolean" ✅
- §3.2 registry entry → Step 3 ✅
- §4 i18n keys ตรง (`sections.po/poDesc`, `config.poGroupByPrComment`) → Step 5/6 + registry labelKey ตรงกัน ✅
- §5 testing: PO registry test + regression fix line 43 → Step 1 (1a robust + 1b) ✅
- §6 verification (tsc/build/tests/manual) → Step 7/8 ✅
- §7 out of scope (ไม่แตะ component/schema/hooks/endpoint) → constraints + task ไม่แตะไฟล์เหล่านั้น ✅

**Placeholder scan:** ไม่มี TBD/TODO — ทุก step มี code จริง ✅

**Type consistency:** `po` section ใช้ `SeededConfigItem` shape เดิม (key/datatype/defaultValue/label/labelKey); labelKey `config.poGroupByPrComment` ตรงกับ i18n Step 5/6; `toHaveLength(CONFIG_SECTIONS.length)` ใช้ `CONFIG_SECTIONS` ที่ import อยู่แล้วในเทส ✅
