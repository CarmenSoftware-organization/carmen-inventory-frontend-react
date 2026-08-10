# Investor Technology Overview — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ผลิต technical memo ภาษาอังกฤษ 12 หัวข้อ และ HTML deck 15 สไลด์ที่ฝังภาพหน้าจอจริง 13 ภาพซึ่งเซ็นเซอร์ข้อมูลลูกค้าแล้ว สำหรับคุยกับนักลงทุนต่างชาติ

**Architecture:** งานแยกเป็นสามชั้นที่ไม่ปนกัน — (1) สคริปต์เบราว์เซอร์ที่ทำหน้าที่เดียวคือแปลงข้อความบน DOM ก่อนถ่ายภาพ (2) ภาพหน้าจอที่จับผ่าน Chrome automation แล้วแปลงเป็น JPEG ตามงบขนาดไฟล์ (3) สื่อส่งมอบสองชิ้นที่ memo เป็นแหล่งความจริงและ deck หยิบไปเล่า deck สร้างจาก template + build script เพื่อไม่ต้องพิมพ์ base64 ด้วยมือ

**Tech Stack:** JavaScript (vanilla, browser) · Node/Bun (build script) · `sips` (มากับ macOS) · Chrome automation MCP · Artifact publishing

**Spec:** `docs/superpowers/specs/2026-08-07-investor-tech-deck-design.md`

## Global Constraints

ทุก task อยู่ใต้ข้อกำหนดชุดนี้โดยปริยาย

- **ภาษา** — สื่อส่งมอบทั้งสองชิ้น (`carmen-technology-overview.md`, deck) เขียน**ภาษาอังกฤษ** · commit message และคอมเมนต์ในสคริปต์เขียน**ภาษาไทย**
- **ห้ามเขียนอะไรลงฐานข้อมูล** — backend `:4000` ชี้ไปฐาน dev ที่ใช้ร่วมกัน (`dev.blueledgers.com`) ห้ามสร้าง demo BU ห้าม seed ห้ามแก้เรกคอร์ด ทุกอย่างเป็น read-only
- **ห้ามอ้างอัตราการผ่านเทสต์** — อ้างได้เฉพาะจำนวนที่นับได้ (จำนวนไฟล์เทสต์ จำนวน route จำนวน spec) ห้ามเขียน "all tests pass" / "100% green"
- **ห้ามให้รายละเอียดภายในหลุด** — ไม่มีชื่อไฟล์ในโค้ดเบส ไม่มีหมายเลข PR ไม่มีชื่อรีโปภายใน ไม่มีอาการบั๊กเฉพาะจุด ใน memo และ deck
- **ห้ามกุตัวเลขธุรกิจ** — ไม่มีขนาดตลาด รายได้ จำนวนลูกค้า หรือจำนวนเงินที่ขอ
- **Artifact** — ≤16MB หลัง render · self-contained (CSP บล็อกทุกโฮสต์ภายนอก: CSS/JS inline, ภาพเป็น data URI, ห้าม CDN font) · รองรับธีมผู้ชมทั้งสามสถานะ
- **ภาพ** — หน้าต่างเบราว์เซอร์ 1600×1000 ทุกภาพ · แปลงเป็น JPEG คุณภาพ 82 กว้างสูงสุด 1600px
- **Radix menu** — dropdown / column toggle / theme switch / language switch เป็น Radix การคลิกด้วยพิกัดหรือ `ref` **ไม่ยิง `onClick`** ต้องเรียก `.click()` ผ่าน `javascript_tool` เท่านั้น
- **ไม่มี automated test ในแผนนี้** ตามความต้องการของ user — สื่อส่งมอบเป็นเอกสารกับรูปภาพ การตรวจสอบคือ**เปิดดูด้วยตา**ทุกภาพและอ่านทวนทุกข้อความ ส่วน `scripts/investor/*.js` อยู่นอกขอบเขตของ ESLint (`**/*.{ts,tsx}`) และ tsconfig (`include: **/*.ts, **/*.tsx`) จึงไม่มี static gate ให้รัน ใช้ `node --check` แทน

## ส่วนที่ต่างจาก spec

spec ระบุไฟล์ deck ไว้ไฟล์เดียวคือ `docs/investor/deck/carmen-tech-deck.html` แผนนี้แยกเป็นสองไฟล์เพราะ base64 ของภาพ 13 ภาพพิมพ์ด้วยมือไม่ได้:

- `docs/investor/deck/carmen-tech-deck.template.html` — **ต้นฉบับที่มนุษย์แก้** ใช้โทเคน `{{IMG_01}}` … `{{IMG_13}}` แทนตำแหน่งภาพ
- `scripts/investor/build-deck.mjs` — แทนที่โทเคนด้วย data URI แล้วเขียน `carmen-tech-deck.html`
- `carmen-tech-deck.html` — **ไฟล์ที่ generate** ใส่ `.gitignore` ไม่ commit (ขนาด ~4MB และสร้างใหม่ได้เสมอ)

---

## File Structure

| ไฟล์ | หน้าที่ |
| --- | --- |
| `scripts/investor/sanitize-dom.js` | แปลงข้อความบน DOM ก่อนถ่ายภาพ — ไม่ยุ่งกับการนำทางหรือการถ่าย |
| `scripts/investor/build-deck.mjs` | ฝังภาพเป็น data URI ลง template — ไม่ยุ่งกับเนื้อหา |
| `docs/investor/assets/01..13-*.jpg` | ภาพหน้าจอที่เซ็นเซอร์และแปลงแล้ว |
| `docs/investor/carmen-technology-overview.md` | technical memo — **แหล่งความจริง** |
| `docs/investor/deck/carmen-tech-deck.template.html` | ต้นฉบับ deck — หยิบข้อเท็จจริงจาก memo ไม่สร้างใหม่ |
| `.gitignore` | เพิ่ม `docs/investor/deck/carmen-tech-deck.html` |

---

## Task 1: สคริปต์เซ็นเซอร์ DOM

**Files:**
- Create: `scripts/investor/sanitize-dom.js`

**Interfaces:**
- Produces: `window.__carmenScanCandidates()` → `string[]` · `window.__carmenSetMap({orgs, people, phones, addresses})` → `number` (จำนวน entry) · `window.__carmenSanitize()` → `number` (จำนวน node ที่แก้)
- Consumes: ไม่มี

**หลักคิดที่ต้องเข้าใจก่อนเขียน:** สคริปต์นี้**เดาไม่ได้**ว่าข้อความไหนคือชื่อลูกค้าจริงกับข้อความไหนคือ label ของ UI (`Purchase Request`, `Vendor`) การกวาดทุกข้อความจะพัง UI ทั้งหน้า ดังนั้นกลไกคือ **operator ดูหน้าจอแล้วบอกสคริปต์ว่าสตริงไหนของจริง** — `__carmenScanCandidates()` ช่วยรวบรวมตัวเลือกมาให้ดู แล้ว `__carmenSetMap()` ผูกแต่ละสตริงกับชื่อสมมติผ่าน hash เพื่อให้ input เดิมได้ผลลัพธ์เดิมทุกหน้า

- [ ] **Step 1: สร้างไฟล์ `scripts/investor/sanitize-dom.js`**

```js
/**
 * Carmen — สคริปต์เซ็นเซอร์ข้อความบนหน้าจอ ก่อนถ่ายภาพสำหรับเอกสารนักลงทุน
 *
 * ฐาน dev ที่ต่ออยู่เป็นฐานที่ใช้ร่วมกัน ภาพหน้าจอจึงมีชื่อองค์กร ชื่อคน อีเมล
 * เบอร์โทร และที่อยู่จริงติดมาได้ สคริปต์นี้แทนที่ค่าเหล่านั้นด้วยชื่อสมมติที่คงที่
 * (input เดิม → ผลลัพธ์เดิมเสมอ) เพื่อให้ vendor รายเดียวกันปรากฏชื่อเดียวกันทุกหน้า
 *
 * **ไม่แตะตัวเลขราคาและจำนวน** โดยเจตนา — การสุ่มตัวเลขทำให้ยอดรวมในตารางไม่ตรงกัน
 * และคนที่บวกเลขตามจะจับได้ ซึ่งเสียหายกว่าตัวเลขที่โชว์ไป เมื่อชื่อทุกชื่อถูกเปลี่ยน
 * แล้ว ราคาสินค้าทั่วไปก็ระบุตัวลูกค้าไม่ได้
 *
 * วิธีใช้ (ผ่าน javascript_tool ทีละขั้น):
 *   1) วางทั้งไฟล์นี้ลงไป — ลงทะเบียนฟังก์ชันบน window
 *   2) __carmenScanCandidates()          → ดูรายการข้อความบนหน้า เลือกอันที่เป็นของจริง
 *   3) __carmenSetMap({orgs:[...], people:[...], phones:[...], addresses:[...]})
 *   4) __carmenSanitize()                → กวาด DOM
 *   5) ถ่ายภาพทันที
 *
 * ต้องเรียก __carmenSanitize() ใหม่ทุกครั้งหลังนำทาง หรือหลังเปิด dropdown/dialog
 * ที่จะปรากฏในภาพ เพราะ DOM เปลี่ยน (map ที่ตั้งไว้ยังอยู่ ไม่ต้อง setMap ใหม่)
 */
(function () {
  const ORGS = [
    "Grand Aurora Hotel",
    "Northwind Provisions Co.",
    "Siam Fresh Produce",
    "Bluewater Resort & Spa",
    "Meridian Culinary Supply",
    "Harbourline Foods Ltd.",
    "Crestview Hotel Group",
    "Golden Palm Trading",
    "Silverleaf Beverages",
    "Riverstone Hospitality",
    "Everbright Dairy Co.",
    "Pacific Rim Seafood",
  ];

  const PEOPLE = [
    "Alex Carter",
    "Mia Tanaka",
    "Daniel Okafor",
    "Sofia Reyes",
    "Liam Bennett",
    "Nina Kowalski",
    "Omar Haddad",
    "Grace Lindqvist",
  ];

  const ADDRESSES = [
    "128 Riverside Avenue, Bangkok 10110",
    "44 Orchid Road, Bangkok 10500",
    "7 Marina Crescent, Phuket 83000",
    "215 Harbour Street, Chiang Mai 50200",
  ];

  // FNV-1a — ให้ input เดิมได้ดัชนีเดิมเสมอ ชื่อสมมติจึงคงที่ข้ามหน้าและข้ามรอบถ่าย
  function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function pick(list, seed) {
    return list[hash(seed) % list.length];
  }

  // example.com สงวนไว้โดย IANA จึงเป็นโดเมนของลูกค้าจริงไม่ได้
  function fakeEmail(seed) {
    return pick(PEOPLE, seed).toLowerCase().replace(/\s+/g, ".") + "@example.com";
  }

  function fakePhone(seed) {
    const h = hash(seed);
    return "+66 2 " + ((h % 900) + 100) + " " + ((h % 9000) + 1000);
  }

  const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]+/g;

  // ไม่มี regex สำหรับเบอร์โทรโดยเจตนา — รูปแบบเบอร์กว้างพอที่จะไปโดนยอดเงิน
  // อย่าง "1234567.89" ซึ่งจะทำให้ตัวเลขในตารางเพี้ยน เบอร์โทรจึงต้องส่งเข้ามา
  // ทาง phones: [] ของ __carmenSetMap แทน
  function applyMap(str) {
    const map = window.__carmenMap || [];
    let out = str;
    for (let i = 0; i < map.length; i++) {
      const real = map[i][0];
      if (real && out.indexOf(real) !== -1) out = out.split(real).join(map[i][1]);
    }
    return out.replace(EMAIL_RE, fakeEmail);
  }

  const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT"]);

  function sweep() {
    let changed = 0;

    // text node ครอบคลุมทั้งข้อความธรรมดา <option> และ <text> ใน SVG ของกราฟ
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (node.parentElement && SKIP_TAGS.has(node.parentElement.tagName)) {
          return NodeFilter.FILTER_REJECT;
        }
        return node.nodeValue && node.nodeValue.trim()
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) {
      const next = applyMap(n.nodeValue);
      if (next !== n.nodeValue) {
        n.nodeValue = next;
        changed++;
      }
    }

    // input/textarea เก็บค่าที่ property ไม่ใช่ attribute
    for (const el of document.querySelectorAll("input, textarea")) {
      const cur = el.value || "";
      const next = applyMap(cur);
      if (next !== cur) {
        el.value = next;
        changed++;
      }
    }

    for (const attr of ["placeholder", "title", "alt", "aria-label"]) {
      for (const el of document.querySelectorAll("[" + attr + "]")) {
        const cur = el.getAttribute(attr) || "";
        const next = applyMap(cur);
        if (next !== cur) {
          el.setAttribute(attr, next);
          changed++;
        }
      }
    }

    return changed;
  }

  function scanCandidates() {
    const seen = new Set();
    const numeric = /^[\d\s.,%+/:-]+$/;
    const add = (t) => {
      const s = (t || "").trim();
      if (s.length > 2 && s.length < 90 && !numeric.test(s)) seen.add(s);
    };
    document
      .querySelectorAll('td, dd, h1, h2, h3, [role="cell"]')
      .forEach((el) => add(el.textContent));
    document.querySelectorAll("input, textarea").forEach((el) => add(el.value));
    return [...seen].sort();
  }

  window.__carmenScanCandidates = scanCandidates;

  window.__carmenSetMap = function (input) {
    const entries = [];
    (input.orgs || []).forEach((s) => entries.push([s, pick(ORGS, s)]));
    (input.people || []).forEach((s) => entries.push([s, pick(PEOPLE, s)]));
    (input.phones || []).forEach((s) => entries.push([s, fakePhone(s)]));
    (input.addresses || []).forEach((s) => entries.push([s, pick(ADDRESSES, s)]));
    // ยาวก่อนสั้น เพื่อไม่ให้สตริงสั้นไปกินชิ้นส่วนของสตริงยาวที่ยังไม่ถูกแทนที่
    entries.sort((a, b) => b[0].length - a[0].length);
    window.__carmenMap = entries;
    return entries.length;
  };

  window.__carmenSanitize = sweep;
})();
"__carmenSanitize ready";
```

- [ ] **Step 2: ตรวจไวยากรณ์**

Run: `node --check scripts/investor/sanitize-dom.js`
Expected: ไม่มี output (ผ่าน) — ถ้ามี `SyntaxError` ให้แก้ก่อนไปต่อ

- [ ] **Step 3: Commit**

```bash
git add scripts/investor/sanitize-dom.js
git commit -m "feat(investor): สคริปต์เซ็นเซอร์ชื่อบนหน้าจอก่อนถ่ายภาพให้นักลงทุน

ฐาน dev เป็นฐานที่ใช้ร่วมกัน ภาพหน้าจอจึงมีชื่อองค์กร/คน/อีเมล/เบอร์/ที่อยู่จริง
ติดมาได้ สคริปต์แทนที่ด้วยชื่อสมมติที่ผูกกับ hash ของค่าเดิม ชื่อเดียวกันจึงออกมา
เหมือนกันทุกหน้า operator เป็นคนชี้ว่าสตริงไหนของจริงผ่าน __carmenSetMap เพราะ
สคริปต์แยกไม่ออกเองระหว่างชื่อลูกค้ากับ label ของ UI

ไม่แตะตัวเลขราคาและจำนวน สุ่มแล้วยอดรวมในตารางจะไม่ตรง คนที่บวกตามจับได้"
```

---

## Task 2: ตั้งสภาพแวดล้อม + ถ่ายภาพ 01–04 (Procure-to-pay)

**Files:**
- Create: `docs/investor/assets/01-purchase-request-list.jpg`
- Create: `docs/investor/assets/02-purchase-request-detail.jpg`
- Create: `docs/investor/assets/03-purchase-order-detail.jpg`
- Create: `docs/investor/assets/04-goods-receive-note-detail.jpg`

**Interfaces:**
- Consumes: `window.__carmenScanCandidates()` / `__carmenSetMap()` / `__carmenSanitize()` จาก Task 1
- Produces: ไฟล์ JPEG สี่ไฟล์ที่ Task 7 จะฝังเป็น data URI ผ่านโทเคน `{{IMG_01}}`–`{{IMG_04}}`

- [ ] **Step 1: ยืนยันว่า backend รันอยู่**

Run: `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:4000/api/health || curl -s -o /dev/null -w '%{http_code}\n' http://localhost:4000/`
Expected: ได้ status code ที่ไม่ใช่ `000` — ถ้าได้ `000` แปลว่า backend ไม่ได้รัน **หยุดและแจ้ง user** ให้เปิด gateway ที่ `carmen-turborepo-backend-v2` ก่อน อย่าเดินต่อ

- [ ] **Step 2: เปิด dev server**

```bash
VITE_DEV_PROXY_TARGET=http://localhost:4000 bun dev
```

รันแบบ background แล้วรอจน Vite พิมพ์ URL ออกมา (ปกติ `http://localhost:5173`) จดพอร์ตจริงไว้ใช้ทุกขั้นถัดไป

- [ ] **Step 3: เตรียมเบราว์เซอร์**

เรียก skill `claude-in-chrome` ก่อน จากนั้น:
1. `tabs_context_mcp` ด้วย `createIfEmpty: true` → เก็บ `tabId`
2. `resize_window` → `width: 1600, height: 1000` **ห้ามเปลี่ยนขนาดนี้อีกเลยจนจบงานถ่ายภาพทั้งหมด** ภาพในสไลด์เดียวกันต้องสัดส่วนตรงกัน

- [ ] **Step 4: ล็อกอิน**

`navigate` ไป `http://localhost:5173/login` แล้วกรอก `admin@zebra.com` / `12345678` (บัญชีทดสอบของฐาน dev) กด Sign in และรอจนเข้า `/dashboard`

- [ ] **Step 5: ไปหน้า PR list แล้วปิดคอลัมน์ audit**

`navigate` ไป `http://localhost:5173/procurement/purchase-request`

คอลัมน์ Created/Updated จะว่างเพราะบั๊กฝั่ง backend ต้องปิดก่อนถ่าย — เมนู column toggle เป็น Radix ต้องคลิกผ่าน JS:

```js
// เปิดเมนูเลือกคอลัมน์
[...document.querySelectorAll('button')]
  .find(b => /column|คอลัมน์/i.test(b.textContent || b.getAttribute('aria-label') || ''))
  ?.click();
```

รอครึ่งวินาทีแล้วปิดสองรายการ:

```js
[...document.querySelectorAll('[role="menuitemcheckbox"], [role="menuitem"]')]
  .filter(el => /created|updated/i.test(el.textContent))
  .forEach(el => el.click());
```

กด `Escape` ปิดเมนู แล้วถ่ายภาพตรวจด้วย `screenshot` (ไม่ต้อง `save_to_disk`) ยืนยันว่าสองคอลัมน์หายจริงและตารางมีข้อมูลไม่โล่ง ถ้าตารางว่าง ให้ล้าง filter หรือเปลี่ยนหน้า

- [ ] **Step 6: ฉีดสคริปต์เซ็นเซอร์**

อ่าน `scripts/investor/sanitize-dom.js` ด้วย Read แล้วส่งเนื้อไฟล์ทั้งก้อนเป็น `text` ของ `javascript_tool`
Expected: ได้ `"__carmenSanitize ready"` กลับมา

- [ ] **Step 7: สำรวจว่าอะไรบนหน้าคือของจริง**

```js
__carmenScanCandidates()
```

อ่านรายการที่ได้ แยกออกเป็นสี่กอง: ชื่อองค์กร/ร้านค้า (`orgs`) · ชื่อคน (`people`) · เบอร์โทร (`phones`) · ที่อยู่ (`addresses`) — **ข้าม** label ของ UI, ชื่อสินค้าสามัญ (`Jasmine Rice`), หน่วยนับ, สถานะเอกสาร และเลขที่เอกสาร

- [ ] **Step 8: ตั้ง map แล้วกวาด**

```js
__carmenSetMap({
  orgs: ["<ชื่อองค์กรจริงที่เจอ>"],
  people: ["<ชื่อคนจริงที่เจอ>"],
  phones: [],
  addresses: [],
});
__carmenSanitize();
```

Expected: `__carmenSetMap` คืนจำนวน entry > 0 และ `__carmenSanitize` คืนจำนวน node ที่แก้ > 0 · ถ้า `__carmenSanitize` คืน `0` ทั้งที่ map ไม่ว่าง แปลว่าสตริงที่ใส่ไปสะกดไม่ตรงกับบนหน้า ให้ copy จากผลของ `__carmenScanCandidates()` ตรง ๆ

- [ ] **Step 9: ถ่ายภาพ 01 ลงดิสก์**

เรียก `computer` action `screenshot` พร้อม `save_to_disk: true` → เก็บ path ที่คืนมา

- [ ] **Step 10: แปลงเป็น JPEG ตามงบขนาดไฟล์**

```bash
mkdir -p docs/investor/assets
sips -Z 1600 -s format jpeg -s formatOptions 82 "<path ที่ได้จาก step 9>" \
  --out docs/investor/assets/01-purchase-request-list.jpg
ls -lh docs/investor/assets/01-purchase-request-list.jpg
```

Expected: ขนาดไฟล์ราว 150–250KB · ถ้าเกิน 400KB ให้ลด `formatOptions` เป็น 75 แล้วแปลงใหม่

- [ ] **Step 11: ตรวจภาพด้วยตา**

ใช้ Read เปิด `docs/investor/assets/01-purchase-request-list.jpg` แล้วไล่ดูทุกมุมของภาพ

เกณฑ์ผ่าน — **ทุกข้อ**:
- ไม่มีชื่อองค์กร ชื่อคน อีเมล เบอร์โทร หรือที่อยู่จริงหลงเหลือ
- ไม่มีหน้า error ไม่มีตารางว่าง ไม่มี skeleton loader ค้าง
- ไม่มีคอลัมน์ Created/Updated ที่ว่างเปล่า
- ข้อความอ่านออกที่ความกว้าง 1600px

ถ้าไม่ผ่านข้อไหน: แก้ที่ต้นเหตุ (เติม map แล้ว `__carmenSanitize()` ซ้ำ / รอโหลด / เปลี่ยนเรกคอร์ด) แล้วถ่ายใหม่ **ห้ามปล่อยภาพที่ไม่ผ่านเข้าขั้นถัดไป**

- [ ] **Step 12: ถ่ายภาพ 02 — PR detail**

`navigate` ไปใบ PR ที่มีรายการสินค้าและมีประวัติ workflow (เปิดจาก list ใน step 5 เลือกใบที่สถานะไม่ใช่ Draft เพื่อให้ chevron workflow track มีขั้นที่เดินแล้ว)

หลังหน้าโหลดเสร็จ ต้องฉีดสคริปต์ใหม่ (การ navigate ล้าง `window`):

```js
// วางเนื้อ scripts/investor/sanitize-dom.js ทั้งก้อนอีกครั้ง
```

แล้ว:

```js
__carmenScanCandidates()
```

ตั้ง map ใหม่ให้ครอบคลุมชื่อที่โผล่บนหน้านี้ (ชื่อเดิมจะได้ชื่อสมมติเดิมเสมอ เพราะผูกกับ hash):

```js
__carmenSetMap({ orgs: [...], people: [...], phones: [], addresses: [] });
__carmenSanitize();
```

ถ่ายด้วย `save_to_disk: true` แล้วแปลง:

```bash
sips -Z 1600 -s format jpeg -s formatOptions 82 "<path>" \
  --out docs/investor/assets/02-purchase-request-detail.jpg
```

ตรวจด้วยตาตามเกณฑ์ใน Step 11 — เพิ่มเงื่อนไข: **chevron workflow track ต้องเห็นชัดในภาพ** ถ้าอยู่นอกจอให้เลื่อนหน้าให้เห็นก่อนถ่าย

- [ ] **Step 13: ถ่ายภาพ 03 — PO detail**

`navigate` ไป `http://localhost:5173/procurement/purchase-order` เลือกใบที่มีรายการ (`PO20260500006` ยืนยันแล้วว่ามีประวัติ) ฉีดสคริปต์ใหม่ → `__carmenScanCandidates()` → `__carmenSetMap({...})` → `__carmenSanitize()` → ถ่ายด้วย `save_to_disk: true`

```bash
sips -Z 1600 -s format jpeg -s formatOptions 82 "<path>" \
  --out docs/investor/assets/03-purchase-order-detail.jpg
```

ตรวจด้วยตาตามเกณฑ์ใน Step 11

- [ ] **Step 14: ถ่ายภาพ 04 — GRN detail**

`navigate` ไป `http://localhost:5173/procurement/goods-receive-note` เลือกใบที่มีรายการรับของ ฉีดสคริปต์ใหม่ → `__carmenScanCandidates()` → `__carmenSetMap({...})` → `__carmenSanitize()` → ถ่ายด้วย `save_to_disk: true`

```bash
sips -Z 1600 -s format jpeg -s formatOptions 82 "<path>" \
  --out docs/investor/assets/04-goods-receive-note-detail.jpg
```

ตรวจด้วยตาตามเกณฑ์ใน Step 11 · ถ้าไม่มีใบไหนมีรายการเลย ให้ตัดภาพนี้ทิ้งแล้วจดไว้ว่าสไลด์ 4 เหลือ 3 ภาพ

- [ ] **Step 15: Commit**

```bash
git add docs/investor/assets
git commit -m "docs(investor): ภาพหน้าจอสายจัดซื้อ 4 ภาพ เซ็นเซอร์ชื่อแล้ว

PR list, PR detail (เห็น workflow track), PO detail, GRN detail
ปิดคอลัมน์ Created/Updated บน PR list ก่อนถ่าย เพราะฝั่ง backend ยังไม่ส่งค่ามา
ตรวจด้วยตาทุกภาพแล้วว่าไม่เหลือชื่อองค์กร ชื่อคน อีเมล เบอร์ หรือที่อยู่จริง"
```

---

## Task 3: ถ่ายภาพ 05–07 (Inventory)

**Files:**
- Create: `docs/investor/assets/05-physical-count-entry.jpg`
- Create: `docs/investor/assets/06-spot-check.jpg`
- Create: `docs/investor/assets/07-inventory-transactions.jpg`

**Interfaces:**
- Consumes: เบราว์เซอร์ที่ล็อกอินแล้วและขนาดหน้าต่าง 1600×1000 จาก Task 2 · ฟังก์ชันบน `window` จาก Task 1
- Produces: ไฟล์ JPEG สามไฟล์สำหรับโทเคน `{{IMG_05}}`–`{{IMG_07}}`

- [ ] **Step 1: ถ่ายภาพ 05 — Physical count entry**

`navigate` ไป `http://localhost:5173/inventory-management/physical-count` เลือกรอบนับที่มีรายการ แล้วเข้าหน้า entry (URL ลงท้าย `/entry`)

ฉีด `scripts/investor/sanitize-dom.js` ทั้งก้อนผ่าน `javascript_tool` แล้ว:

```js
__carmenScanCandidates()
```

```js
__carmenSetMap({ orgs: [...], people: [...], phones: [], addresses: [] });
__carmenSanitize();
```

ถ่ายด้วย `computer` action `screenshot` + `save_to_disk: true` แล้ว:

```bash
sips -Z 1600 -s format jpeg -s formatOptions 82 "<path>" \
  --out docs/investor/assets/05-physical-count-entry.jpg
ls -lh docs/investor/assets/05-physical-count-entry.jpg
```

ตรวจด้วยตา: ไม่มีชื่อ/อีเมล/เบอร์/ที่อยู่จริง · ไม่มีหน้า error หรือตารางว่าง · ต้องเห็นช่องกรอกจำนวนนับพร้อมข้อมูล

- [ ] **Step 2: ถ่ายภาพ 06 — Spot check**

`navigate` ไป `http://localhost:5173/inventory-management/spot-check` เลือกรายการที่มีข้อมูล ฉีดสคริปต์ใหม่ → `__carmenScanCandidates()` → `__carmenSetMap({...})` → `__carmenSanitize()` → ถ่ายด้วย `save_to_disk: true`

```bash
sips -Z 1600 -s format jpeg -s formatOptions 82 "<path>" \
  --out docs/investor/assets/06-spot-check.jpg
```

ตรวจด้วยตาตามเกณฑ์เดียวกับ Step 1

- [ ] **Step 3: ถ่ายภาพ 07 — Inventory transactions**

`navigate` ไป `http://localhost:5173/inventory-management/transaction` ฉีดสคริปต์ใหม่ → `__carmenScanCandidates()` → `__carmenSetMap({...})` → `__carmenSanitize()` → ถ่ายด้วย `save_to_disk: true`

```bash
sips -Z 1600 -s format jpeg -s formatOptions 82 "<path>" \
  --out docs/investor/assets/07-inventory-transactions.jpg
```

ตรวจด้วยตาตามเกณฑ์เดียวกับ Step 1 — หน้านี้ควรมีหลายแถวเพื่อให้เห็นว่าเป็นบัญชีเคลื่อนไหวจริง ถ้ามีแถวเดียวให้ขยายช่วงวันที่

- [ ] **Step 4: Commit**

```bash
git add docs/investor/assets
git commit -m "docs(investor): ภาพหน้าจอฝั่งสินค้าคงคลัง 3 ภาพ

นับสต๊อกจริง, สุ่มตรวจ, บัญชีเคลื่อนไหว — เล่าว่าตัวเลขสต๊อกมีที่มา ไม่ใช่ตัวเลขที่พิมพ์ทับ
ตรวจด้วยตาทุกภาพแล้ว"
```

---

## Task 4: ถ่ายภาพ 08–10 (Configurable, not hard-coded)

**Files:**
- Create: `docs/investor/assets/08-workflow-designer.jpg`
- Create: `docs/investor/assets/09-business-default-settings.jpg`
- Create: `docs/investor/assets/10-external-interfaces.jpg`

**Interfaces:**
- Consumes: เบราว์เซอร์จาก Task 2 · ฟังก์ชันบน `window` จาก Task 1
- Produces: ไฟล์ JPEG สามไฟล์สำหรับโทเคน `{{IMG_08}}`–`{{IMG_10}}`

นี่คือสไลด์ที่ตั้งใจให้ทำเงิน — สามภาพนี้ต้องคมที่สุดในกอง

- [ ] **Step 1: ถ่ายภาพ 08 — Workflow designer**

`navigate` ไป `http://localhost:5173/system-admin/workflow` เลือก workflow ที่มีหลายขั้น (BU `CARMEN-AVG` มีข้อมูล) เข้าหน้าแก้ไข แล้วเปิดแท็บที่แสดงผังลากวาง React Flow

**ก่อนถ่าย** ต้องจัดผังให้อยู่ในกรอบ:

```js
// ปุ่ม fit view ของ React Flow
document.querySelector('.react-flow__controls-fitview')?.click();
```

ฉีด `scripts/investor/sanitize-dom.js` แล้ว:

```js
__carmenScanCandidates()
```

```js
__carmenSetMap({ orgs: [...], people: [...], phones: [], addresses: [] });
__carmenSanitize();
```

ชื่อขั้นอนุมัติ (`Department Head`, `Finance`) เป็นคำสามัญ ไม่ต้องเปลี่ยน — แต่ถ้ามี**ชื่อคน**เป็นผู้รับผิดชอบขั้น ต้องใส่ใน `people`

ถ่ายด้วย `save_to_disk: true` แล้ว:

```bash
sips -Z 1600 -s format jpeg -s formatOptions 82 "<path>" \
  --out docs/investor/assets/08-workflow-designer.jpg
```

ตรวจด้วยตา: **ต้องเห็นโหนดกับเส้นเชื่อมชัดเจน** ทั้งผังอยู่ในกรอบ ไม่มีโหนดถูกตัดขอบ · ไม่มีชื่อคนจริง

- [ ] **Step 2: ถ่ายภาพ 09 — Default settings**

`navigate` ไป `http://localhost:5173/system-admin/default-setting` ฉีดสคริปต์ → `__carmenScanCandidates()` → `__carmenSetMap({...})` → `__carmenSanitize()` → ถ่ายด้วย `save_to_disk: true`

```bash
sips -Z 1600 -s format jpeg -s formatOptions 82 "<path>" \
  --out docs/investor/assets/09-business-default-settings.jpg
```

ตรวจด้วยตา: ต้องเห็นตัวเลือกตั้งค่าหลายรายการ เพื่อสื่อว่าตั้งค่าได้จริงไม่ใช่หน้าเปล่า

- [ ] **Step 3: ถ่ายภาพ 10 — External interfaces**

`navigate` ไป `http://localhost:5173/system-admin/interface` ฉีดสคริปต์ → `__carmenScanCandidates()` → `__carmenSetMap({...})` → `__carmenSanitize()` → ถ่ายด้วย `save_to_disk: true`

**ระวัง:** หน้านี้มีช่อง secret / token ถ้ามีค่าจริงแสดงอยู่ ต้องล้างก่อนถ่าย:

```js
document.querySelectorAll('input[type="password"], input[name*="token" i], input[name*="secret" i], input[name*="key" i]')
  .forEach(el => { el.value = ""; });
```

```bash
sips -Z 1600 -s format jpeg -s formatOptions 82 "<path>" \
  --out docs/investor/assets/10-external-interfaces.jpg
```

ตรวจด้วยตา: **ไม่มีค่า token / secret / API key ปรากฏแม้แต่บางส่วน** · เห็นรายการระบบภายนอกที่ต่อได้ (Accounting / POS / PMS)

- [ ] **Step 4: Commit**

```bash
git add docs/investor/assets
git commit -m "docs(investor): ภาพหน้าจอฝั่งตั้งค่า 3 ภาพ

ตัวออกแบบ workflow แบบลากวาง, ค่าตั้งต้นต่อหน่วยธุรกิจ, การต่อระบบภายนอก
ล้างช่อง token/secret ก่อนถ่ายหน้า interface ตรวจด้วยตาแล้วว่าไม่มีค่าความลับติดไป"
```

---

## Task 5: ถ่ายภาพ 11–13 (Built for how hotels actually work)

**Files:**
- Create: `docs/investor/assets/11-vendor-price-portal.jpg`
- Create: `docs/investor/assets/12-dark-mode.jpg`
- Create: `docs/investor/assets/13-thai-locale.jpg`

**Interfaces:**
- Consumes: เบราว์เซอร์จาก Task 2 · ฟังก์ชันบน `window` จาก Task 1
- Produces: ไฟล์ JPEG สามไฟล์สำหรับโทเคน `{{IMG_11}}`–`{{IMG_13}}`

- [ ] **Step 1: หา url_token ของ price list สาธารณะ**

`navigate` ไป `http://localhost:5173/vendor-management/request-price-list` เปิดรายการที่มีลิงก์สำหรับซัพพลายเออร์ แล้วคัดลอก `url_token`

**เลือกเรกคอร์ดให้ถูก:** ถ้าเรกคอร์ดที่เจอเป็นราคาตามสัญญาจริงกับซัพพลายเออร์รายเดียว ให้มองหาเรกคอร์ดที่เป็นข้อมูลทดสอบแทน — ราคาชุดนั้นอ่อนไหวเชิงพาณิชย์แม้ชื่อจะถูกเปลี่ยนแล้ว ถ้าไม่มีเรกคอร์ดทดสอบเลย ให้ตัดภาพ 11 ทิ้งแล้วจดไว้ว่าสไลด์ 7 เหลือ 2 ภาพ

- [ ] **Step 2: ถ่ายภาพ 11 — พอร์ทัลซัพพลายเออร์**

`navigate` ไป `http://localhost:5173/pl/<url_token>` (หน้านี้ไม่ต้องล็อกอิน) ฉีด `scripts/investor/sanitize-dom.js` แล้ว:

```js
__carmenScanCandidates()
```

```js
__carmenSetMap({ orgs: [...], people: [...], phones: [], addresses: [] });
__carmenSanitize();
```

ถ่ายด้วย `save_to_disk: true` แล้ว:

```bash
sips -Z 1600 -s format jpeg -s formatOptions 82 "<path>" \
  --out docs/investor/assets/11-vendor-price-portal.jpg
```

ตรวจด้วยตา: **ต้องไม่มี `url_token` จริงปรากฏในภาพ** (แถบ URL ไม่อยู่ในภาพเพราะถ่ายเฉพาะ viewport แต่ถ้าหน้ามีการโชว์ลิงก์ ต้องเซ็นเซอร์)

- [ ] **Step 3: ถ่ายภาพ 12 — โหมดมืด**

`navigate` ไป `http://localhost:5173/procurement/purchase-request` (route เดียวกับภาพ 13 บังคับ — ทั้งคู่วางคู่กันเพื่อให้เห็นว่าเป็นหน้าเดียวกัน)

สลับเป็นโหมดมืด — ตัวสลับธีมเป็น Radix ต้องคลิกผ่าน JS:

```js
localStorage.setItem("theme", "dark");
document.documentElement.classList.add("dark");
```

ถ้าคลาสไม่ติดหรือหน้าไม่เปลี่ยนสี ให้ใช้ตัวสลับใน UI แทน:

```js
[...document.querySelectorAll('button')]
  .find(b => /theme|dark|mode/i.test(b.getAttribute('aria-label') || b.textContent || ''))
  ?.click();
```

ปิดคอลัมน์ Created/Updated เหมือน Task 2 Step 5 แล้วฉีดสคริปต์ → `__carmenScanCandidates()` → `__carmenSetMap({...})` → `__carmenSanitize()` → ถ่ายด้วย `save_to_disk: true`

```bash
sips -Z 1600 -s format jpeg -s formatOptions 82 "<path>" \
  --out docs/investor/assets/12-dark-mode.jpg
```

ตรวจด้วยตา: พื้นหลังมืดจริงทั้งหน้า ไม่มีส่วนที่ยังขาวค้าง · ตัวอักษรอ่านออก

- [ ] **Step 4: ถ่ายภาพ 13 — ภาษาไทย**

อยู่หน้าเดิม สลับกลับโหมดสว่างแล้วเปลี่ยนภาษาเป็นไทย:

```js
localStorage.setItem("carmen.locale", "th");
location.reload();
```

รอโหลดเสร็จ ปิดคอลัมน์ Created/Updated อีกครั้ง (การ reload คืนค่าคอลัมน์) ฉีดสคริปต์ → `__carmenScanCandidates()` → `__carmenSetMap({...})` → `__carmenSanitize()` → ถ่ายด้วย `save_to_disk: true`

```bash
sips -Z 1600 -s format jpeg -s formatOptions 82 "<path>" \
  --out docs/investor/assets/13-thai-locale.jpg
```

ตรวจด้วยตา: **ต้องเป็น route เดียวกับภาพ 12** · เมนูและหัวตารางเป็นภาษาไทยจริง ไม่ใช่ภาษาอังกฤษปนไทยครึ่ง ๆ · ถ้าเห็นคีย์ i18n ดิบอย่าง `procurement.title` โผล่ ให้เปลี่ยนไปหน้าอื่นแล้วถ่ายทั้งคู่ (12 และ 13) ใหม่พร้อมกัน

- [ ] **Step 5: คืนค่าเบราว์เซอร์**

```js
localStorage.setItem("carmen.locale", "en");
localStorage.setItem("theme", "light");
location.reload();
```

- [ ] **Step 6: Commit**

```bash
git add docs/investor/assets
git commit -m "docs(investor): ภาพหน้าจอชุดสุดท้าย 3 ภาพ

พอร์ทัลให้ซัพพลายเออร์กรอกราคาเองโดยไม่ต้องล็อกอิน, โหมดมืด, ภาษาไทย
ภาพ 12 กับ 13 เป็นหน้าเดียวกันตามที่สเปกบังคับ เพราะวางคู่กันเพื่อเทียบภาษา"
```

---

## Task 6: Technical memo

**Files:**
- Create: `docs/investor/carmen-technology-overview.md`

**Interfaces:**
- Consumes: ไม่มี (เขียนจากข้อเท็จจริงที่รวบรวมใน spec)
- Produces: **แหล่งความจริง** ที่ Task 7 หยิบไปทำสไลด์ — deck ห้ามเขียนข้อเท็จจริงที่ memo ไม่มี

- [ ] **Step 1: นับตัวเลขใหม่**

```bash
echo "specs: $(ls docs/superpowers/specs/*.md | wc -l)"
echo "fe routes: $(find routes -name '*.route.tsx' | wc -l)"
echo "fe tests: $(find . -path ./node_modules -prune -o -name '*.test.ts*' -print | wc -l)"
echo "be tests: $(find ../carmen-turborepo-backend-v2/apps ../carmen-turborepo-backend-v2/packages -name '*.spec.ts' -not -path '*/node_modules/*' | wc -l)"
```

ใช้ค่าที่ได้จริงจากคำสั่งนี้ **ห้ามลอกตัวเลขจาก spec** (spec นับไว้เมื่อ 2026-08-07 ค่าอาจขยับแล้ว)

- [ ] **Step 2: เขียน `docs/investor/carmen-technology-overview.md`**

ภาษาอังกฤษ น้ำเสียงแบบ tech memo ไม่ใช่โบรชัวร์ — ประโยคบอกเล่า ไม่มีคำโฆษณาอย่าง "cutting-edge", "world-class", "revolutionary"

หัวเอกสาร: `# Carmen — Technology Overview` · บรรทัดถัดมา `August 2026 · Prepared for prospective investors`

12 หัวข้อ กับสิ่งที่แต่ละหัวข้อต้องมี:

1. **Executive summary** — Carmen คือ supply-chain ERP สำหรับงานโรงแรมและร้านอาหาร ครอบคลุมตั้งแต่ใบขอซื้อถึงบัญชีสต๊อก · จุดยืนทางเทคนิค 5 บรรทัด: multi-tenant แยก schema ต่อหน่วยธุรกิจ · workflow ตั้งค่าได้ไม่ต้องเขียนโค้ด · ส่วนหน้าเป็นไฟล์นิ่งบน CDN ไม่มี app server · สองภาษาในตัว · ลงได้ทั้ง SaaS และในศูนย์ข้อมูลของลูกค้า
2. **Product surface** — ตารางโมดูล: Procurement (purchase request, purchase order, goods receive note, credit note, approval) · Inventory (physical count, spot check, adjustment, transactions, period end) · Store operations (store requisition, wastage, stock replenishment) · Vendors (vendor master, price list, price list template, price requests) · Products & recipes · Reporting (list, schedules, history) · System administration (users, roles, workflow designer, notification templates, external interfaces)
3. **System architecture** — ผัง mermaid: browser/mobile → APISIX edge → NestJS gateway → microservices (business, cluster, file, notification, keycloak) + Go services (report, cronjob) → PostgreSQL / Keycloak · ตามด้วยตารางความรับผิดชอบของแต่ละ service
4. **Multi-tenancy & data model** — platform schema (identity, clusters, business units, roles, subscriptions) ร่วมกันทุก tenant · tenant schema (products, inventory, procurement, recipes) แยกต่อหน่วยธุรกิจ · ลำดับชั้น cluster → business unit · สิ่งที่การแยก schema ให้: การแยกข้อมูลโดยโครงสร้างไม่ใช่โดยเงื่อนไขใน query · สำรอง/กู้คืน/ย้ายทีละ tenant ได้ · รายงานระดับเครือทำได้โดยข้อมูลไม่รั่วข้าม tenant
5. **Identity, authorization & security** — Keycloak เป็น identity provider · สิทธิ์ผูกกับ cluster และ business unit · access token อยู่ในหน่วยความจำเท่านั้น ไม่เคยถูกบันทึกลงดิสก์ refresh token เป็นข้อมูลรับรองเพียงอย่างเดียวที่เก็บ และการเพิกถอนทำที่ฝั่งเซิร์ฟเวอร์ · ความลับของการเชื่อมต่อระบบภายนอกเข้ารหัสตอนพัก · เอกสารธุรกิจทุกใบมีร่องรอยกิจกรรมว่าใครทำอะไรเมื่อไร
6. **Technology choices & rationale** — ไล่ทีละชั้นว่าทำไม เขียนเป็นความเรียง ไม่ใช่รายการเทคโนโลยี ประเด็นหลัก: TypeScript ตลอดสายทำให้สัญญาข้อมูลระหว่างส่วนหน้ากับ API ตรวจได้ตอนคอมไพล์ · Go แยกไปทำงานที่กิน CPU เป็นช่วง ๆ เพื่อไม่ให้ไปแย่งทรัพยากรของ API
7. **Scalability & operational posture** — gateway ไร้สถานะจึงขยายแนวนอนได้ · ส่วนหน้าเป็นไฟล์นิ่งบน CDN ไม่มีเซิร์ฟเวอร์แอปให้ขยายหรือจ่ายค่าเครื่อง · งานตามเวลาประสานกันผ่าน Redis lock จึงรันหลาย replica ได้อย่างปลอดภัย · ขอบระบบจัดการ TLS, จำกัดอัตราเรียก และตรวจ JWT ก่อนถึงโค้ดแอป
8. **Deployment models** — ตาราง 4 แถว: multi-tenant SaaS · single-tenant VM · Docker image (proxy `/api` ในตัว จึงไม่ต้องตั้ง CORS) · static CDN (S3+CloudFront หรือ GCS+Cloud CDN) — แต่ละแถวมีคอลัมน์ "what it unlocks" โดยเน้นว่าเครือโรงแรมใหญ่หลายแห่งบังคับให้ข้อมูลอยู่ในศูนย์ข้อมูลของตัวเอง และ Carmen รองรับได้โดยไม่ต้องแยกสายผลิตภัณฑ์
9. **Engineering practice & quality** — TypeScript strict ตลอดสาย · ทุกฟีเจอร์เริ่มจากเอกสารออกแบบที่เขียนไว้ก่อน (ใช้จำนวน spec จริงจาก Step 1) · ทุกการเปลี่ยนแปลงผ่านด่าน type-check, lint และ test ก่อนรวมเข้าสายหลัก · จำนวนไฟล์เทสต์จาก Step 1 · **ห้ามเขียนอัตราการผ่าน**
10. **Extensibility & integrations** — เฟรมเวิร์กต่อระบบภายนอกแยกตามหมวด (Accounting / POS / PMS) และตามยี่ห้อ โดยแต่ละยี่ห้อมีฟอร์มตั้งค่าของตัวเอง · เทมเพลตรายงานเป็น XML แก้ได้โดยไม่ต้อง deploy · เทมเพลตการแจ้งเตือนตั้งค่าได้ต่อหน่วยธุรกิจ
11. **Technical roadmap & known constraints** — เขียนถึง**ทิศทางที่กำลังแก้** ไม่ใช่**อาการที่พัง** ตัวอย่างที่เขียนได้: การตั้งค่า CORS ที่ขอบระบบกำลังทำให้จบก่อนเปิดใช้บนคลาวด์สาธารณะ · ความละเอียดของหน่วยนับกำลังทำให้ตรงกันตลอดสายระหว่างสัญญา API กับชั้นจัดเก็บ · การสร้างรายงานแยกเป็นบริการ Go ต่างหากเพื่อไม่ให้งานหนักไปบล็อกชั้น API · **ห้าม**ใส่ชื่อ endpoint ชื่อไฟล์ หมายเลข PR หรือข้อความ error
12. **Appendix** — ตาราง stack เต็มแยกตามชั้น (web / admin / mobile / edge / API / Go services / data / identity / infra)

- [ ] **Step 3: ตรวจทานคำต้องห้าม**

```bash
grep -niE "all tests pass|100% (green|pass)|tests? (are )?passing|PR #[0-9]|\.tsx?:|carmen-turborepo|micro-business|localhost|500 error|dev\.blueledgers" docs/investor/carmen-technology-overview.md
```

Expected: ไม่มี output · ถ้ามีบรรทัดไหนโผล่ ให้แก้แล้วรันซ้ำจนเงียบ

- [ ] **Step 4: Commit**

```bash
git add docs/investor/carmen-technology-overview.md
git commit -m "docs(investor): technical memo 12 หัวข้อ ภาษาอังกฤษ

เล่า stack ทั้งแพลตฟอร์ม ไม่ใช่แค่ส่วนหน้า — multi-tenant แยก schema, สิทธิ์ผ่าน
Keycloak, สองภาษา, ลงได้ทั้ง SaaS และในศูนย์ข้อมูลลูกค้า

ตัวเลขทุกตัวนับใหม่ตอนเขียน อ้างเฉพาะจำนวนที่นับได้ ไม่อ้างอัตราการผ่านเทสต์
หัวข้อข้อจำกัดเขียนถึงทิศทางที่กำลังแก้ ไม่ใช่อาการที่พัง"
```

---

## Task 7: Deck template + build script

**Files:**
- Create: `docs/investor/deck/carmen-tech-deck.template.html`
- Create: `scripts/investor/build-deck.mjs`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `docs/investor/assets/*.jpg` จาก Task 2–5 · ข้อเท็จจริงจาก `carmen-technology-overview.md` (Task 6)
- Produces: `docs/investor/deck/carmen-tech-deck.html` (generate ไม่ commit) สำหรับ Task 8 นำไปเผยแพร่

- [ ] **Step 1: โหลด skill ที่จำเป็น**

เรียก skill `artifact-design` แล้วตามด้วย `artifact-diagramming` — อ่านให้จบก่อนเขียน HTML

- [ ] **Step 2: เขียน `scripts/investor/build-deck.mjs`**

```js
/**
 * ฝังภาพหน้าจอเป็น data URI ลง template ของ deck
 *
 * CSP ของ Artifact บล็อกทุกคำขอไปโฮสต์ภายนอก ภาพจึงต้องฝังมาในหน้า และ base64
 * ของ 13 ภาพพิมพ์ด้วยมือไม่ได้ template จึงใช้โทเคน {{IMG_01}}..{{IMG_13}}
 * แล้วให้สคริปต์นี้แทนที่
 *
 * รัน: bun scripts/investor/build-deck.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ASSETS = "docs/investor/assets";
const TEMPLATE = "docs/investor/deck/carmen-tech-deck.template.html";
const OUTPUT = "docs/investor/deck/carmen-tech-deck.html";

const files = readdirSync(ASSETS).filter((f) => f.endsWith(".jpg"));
let html = readFileSync(TEMPLATE, "utf8");

for (const file of files) {
  const token = `{{IMG_${file.slice(0, 2)}}}`;
  if (!html.includes(token)) continue;
  const b64 = readFileSync(join(ASSETS, file)).toString("base64");
  html = html.split(token).join(`data:image/jpeg;base64,${b64}`);
}

const leftover = html.match(/\{\{IMG_\d{2}\}\}/g);
if (leftover) {
  console.error(`โทเคนที่ไม่มีไฟล์ภาพรองรับ: ${[...new Set(leftover)].join(", ")}`);
  process.exit(1);
}

writeFileSync(OUTPUT, html);
const mb = (Buffer.byteLength(html) / 1024 / 1024).toFixed(2);
console.log(`เขียน ${OUTPUT} — ${mb} MB`);
if (Number(mb) > 12) {
  console.error("เกิน 12MB — ลดคุณภาพ JPEG เป็น 75 หรือย่อเหลือ 1400px แล้วแปลงภาพใหม่");
  process.exit(1);
}
```

- [ ] **Step 3: เขียน `docs/investor/deck/carmen-tech-deck.template.html`**

เขียนเนื้อหน้าเท่านั้น — **ห้ามมี** `<!DOCTYPE>`, `<html>`, `<head>`, `<body>` (Artifact ครอบให้เอง) แต่**ต้องมี** `<title>Carmen — Technology & Product Overview</title>`

CSS ต้อง inline ใน `<style>` และนิยาม token สีครบทั้งสามสถานะธีม:

```html
<style>
  :root {
    --bg: #ffffff;
    --surface: #f6f7f9;
    --text: #16191d;
    --muted: #5b6470;
    --border: #d9dde3;
    --accent: #1f6feb;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --bg: #0f1115;
      --surface: #171a20;
      --text: #e8eaed;
      --muted: #9aa4b2;
      --border: #2a2f38;
      --accent: #6ea8ff;
    }
  }
  :root[data-theme="dark"] {
    --bg: #0f1115;
    --surface: #171a20;
    --text: #e8eaed;
    --muted: #9aa4b2;
    --border: #2a2f38;
    --accent: #6ea8ff;
  }
  body { background: var(--bg); color: var(--text); }
  .slide {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 4vh 6vw;
    border-bottom: 1px solid var(--border);
  }
  .shots { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }
  .shots img { width: 100%; height: auto; border: 1px solid var(--border); border-radius: 6px; }
  .scroll-x { overflow-x: auto; }
  table { border-collapse: collapse; width: 100%; }
</style>
```

ตารางและผังทุกอันต้องอยู่ใน `<div class="scroll-x">` — ตัวหน้าห้ามเลื่อนแนวนอน

15 สไลด์ แต่ละสไลด์เป็น `<section class="slide">` เนื้อหาภาษาอังกฤษ:

1. **Title** — `Carmen` · `Supply-chain ERP for hotel and restaurant operations` · `Technology & Product Overview · August 2026`
2. **The operating problem** — Hotel F&B buys through spreadsheets, email and chat · Every property runs its own process, so group management has no comparable cost data · Stock counts happen on paper and reconcile late, if at all · Cost of goods is one of the largest lines in a hotel P&L and the least instrumented
3. **What Carmen is** — ประโยคนำ `One system from requisition to receipt to stock ledger, across every property in a group.` ตามด้วยผังโมดูลจากหัวข้อ 2 ของ memo
4. **Procure-to-pay as one thread** — `A request becomes an order becomes a receipt — and the approval trail travels with the document.` · `<div class="shots">` วางภาพ `{{IMG_01}}` `{{IMG_02}}` `{{IMG_03}}` `{{IMG_04}}`
5. **Inventory you can trust** — `Counts, spot checks and adjustments are separate auditable workflows — not edits to a number.` · ภาพ `{{IMG_05}}` `{{IMG_06}}` `{{IMG_07}}`
6. **Configurable, not hard-coded** — `A new property is a configuration exercise, not an engineering project. Approval flows, document rules and external-system connections are all set up inside the product.` · ภาพ `{{IMG_08}}` `{{IMG_09}}` `{{IMG_10}}`
7. **Built for how hotels actually work** — `Suppliers submit prices through a link, not a spreadsheet. Staff work in their own language, on their own screens.` · ภาพ `{{IMG_11}}` `{{IMG_12}}` `{{IMG_13}}`
8. **System architecture** — ผัง mermaid ใน `<pre class="mermaid">` (Artifact render ให้เอง) ตามหัวข้อ 3 ของ memo
9. **Multi-tenancy & data isolation** — `A shared platform schema holds identity, roles and subscriptions. Each business unit's operational data lives in its own schema.` + 4 bullet จากหัวข้อ 4 ของ memo
10. **Security & identity** — 5 bullet จากหัวข้อ 5 ของ memo โดยเน้นบรรทัด access token อยู่ในหน่วยความจำเท่านั้น
11. **Polyglot by purpose** — ตาราง 2 แถว: `TypeScript / NestJS` → domain surface, changes weekly, type contract shared with the web app · `Go / Gin` → report rendering and scheduled jobs, CPU-bound and bursty, isolated so it cannot starve the API tier · ปิดท้าย `Two languages, each where it pays for itself.`
12. **Scale & cost posture** — 4 bullet จากหัวข้อ 7 ของ memo
13. **Engineering rigor** — 4 bullet จากหัวข้อ 9 ของ memo พร้อมตัวเลขที่นับจริง
14. **Deployment flexibility** — ตาราง 4 แถวจากหัวข้อ 8 ของ memo
15. **Appendix — full stack** — ตารางจากหัวข้อ 12 ของ memo

**กติกา:** ทุกข้อเท็จจริงบนสไลด์ต้องมีอยู่ใน memo แล้ว ถ้าอยากเขียนอะไรที่ memo ไม่มี ให้ไปเติมใน memo ก่อน

- [ ] **Step 4: เพิ่มไฟล์ generate ลง `.gitignore`**

เติมบรรทัดนี้ท้ายไฟล์ `.gitignore`:

```
# deck ที่ generate จาก template + ภาพ (สร้างใหม่ได้ด้วย bun scripts/investor/build-deck.mjs)
docs/investor/deck/carmen-tech-deck.html
```

- [ ] **Step 5: รัน build**

Run: `bun scripts/investor/build-deck.mjs`
Expected: `เขียน docs/investor/deck/carmen-tech-deck.html — X.XX MB` โดย X < 12 · ถ้าสคริปต์ exit ด้วย error เรื่องโทเคนค้าง แปลว่ามีภาพที่ตัดทิ้งไปแล้วแต่ template ยังอ้างอยู่ ให้ลบบล็อกภาพนั้นออกจาก template · ถ้า error เรื่องขนาดเกิน ให้แปลงภาพใหม่ด้วย `formatOptions 75` แล้วรัน build ซ้ำ

- [ ] **Step 6: Commit**

```bash
git add docs/investor/deck/carmen-tech-deck.template.html scripts/investor/build-deck.mjs .gitignore
git commit -m "feat(investor): template สไลด์ 15 หน้า พร้อมสคริปต์ฝังภาพ

CSP ของ Artifact บล็อกโฮสต์ภายนอก ภาพจึงต้องฝังเป็น data URI ซึ่งพิมพ์มือไม่ได้
แยกเป็น template ที่คนแก้ กับสคริปต์ที่แทนโทเคนด้วย base64 แล้วเช็กงบ 12MB ให้

ไฟล์ผลลัพธ์ไม่ commit สร้างใหม่ได้เสมอจาก template + ภาพ"
```

---

## Task 8: ตรวจขั้นสุดท้ายแล้วเผยแพร่

**Files:**
- ไม่สร้างไฟล์ใหม่ — ตรวจและเผยแพร่ของที่มี

**Interfaces:**
- Consumes: `docs/investor/deck/carmen-tech-deck.html` จาก Task 7 · `carmen-technology-overview.md` จาก Task 6 · ภาพจาก Task 2–5
- Produces: URL ของ Artifact ที่ส่งให้นักลงทุนได้

- [ ] **Step 1: ไล่ดูภาพทุกใบอีกรอบ**

ใช้ Read เปิดทีละไฟล์ใน `docs/investor/assets/` ไล่ครบทุกใบ

เกณฑ์ — ทุกใบต้องผ่านทุกข้อ:
- ไม่มีชื่อองค์กร ชื่อคน อีเมล เบอร์โทร ที่อยู่จริง
- ไม่มี token / secret / API key แม้บางส่วน
- ไม่มีหน้า error ไม่มีตารางว่าง ไม่มี skeleton ค้าง
- อ่านออกที่ความกว้าง 1600px

ใบไหนไม่ผ่าน → กลับไปถ่ายใหม่ตาม task ที่เกี่ยวข้อง แล้วรัน `bun scripts/investor/build-deck.mjs` ใหม่

- [ ] **Step 2: ตรวจคำต้องห้ามใน deck**

```bash
grep -niE "all tests pass|100% (green|pass)|PR #[0-9]|carmen-turborepo|micro-business|localhost|dev\.blueledgers|admin@zebra" docs/investor/deck/carmen-tech-deck.template.html
```

Expected: ไม่มี output

- [ ] **Step 3: ตรวจว่า deck ไม่มีข้อเท็จจริงนอก memo**

อ่าน template ทั้งไฟล์เทียบกับ `carmen-technology-overview.md` ทีละสไลด์ ทุกตัวเลขและทุกคำกล่าวอ้างบนสไลด์ต้องหาเจอใน memo ถ้าเจอข้อไหนที่ memo ไม่มี ให้เลือกอย่างใดอย่างหนึ่ง: เติมลง memo แล้ว commit หรือลบออกจากสไลด์

- [ ] **Step 4: วัดขนาดสุดท้าย**

```bash
ls -lh docs/investor/deck/carmen-tech-deck.html
```

Expected: ต่ำกว่า 12MB · เกินเมื่อไรให้แปลงภาพใหม่ที่ `formatOptions 75` แล้ว build ซ้ำ **อย่าลองเผยแพร่แล้วรอให้ล้มเหลว**

- [ ] **Step 5: เผยแพร่เป็น Artifact**

เรียก Artifact ด้วย:
- `file_path`: `docs/investor/deck/carmen-tech-deck.html`
- `favicon`: `📊`
- `description`: `Technology and product overview of Carmen, a supply-chain ERP for hotel and restaurant operations.`

เก็บ URL ที่ได้ไว้รายงาน user

- [ ] **Step 6: Commit สิ่งที่ค้าง แล้วรายงาน**

```bash
git status --short
git add -A docs/investor scripts/investor
git commit -m "docs(investor): ตรวจขั้นสุดท้ายและเผยแพร่สไลด์" || echo "ไม่มีอะไรค้าง"
```

รายงาน user: URL ของ Artifact · จำนวนภาพที่เข้า deck จริง (ถ้าไม่ครบ 13 บอกว่าตัดใบไหนเพราะอะไร) · ยืนยันว่าตรวจภาพครบทุกใบแล้ว

---

## Self-Review

**1. Spec coverage**

| ข้อกำหนดใน spec | Task |
| --- | --- |
| deck 15 สไลด์ ตั้งชื่อว่า Technology & Product Overview | 7 |
| memo 12 หัวข้อ ภาษาอังกฤษ | 6 |
| ภาพ 13 ภาพ สไลด์ 4–7 ตาม route ที่ระบุ | 2, 3, 4, 5 |
| หน้าต่าง 1600×1000 ทุกภาพ | 2 (Step 3) |
| ปิดคอลัมน์ Created/Updated บน PR list | 2 (Step 5), 5 (Step 3–4) |
| ห้ามใช้ dashboard เป็นภาพ 12/13 | 5 (ใช้ PR list แทน) |
| ภาพ 12/13 ต้อง route เดียวกัน | 5 (Step 3–4) |
| price list ที่เป็นราคาตามสัญญา → เปลี่ยนเรกคอร์ด | 5 (Step 1) |
| สคริปต์กวาด DOM ครอบคลุม text node / value / attr / option / SVG | 1 |
| map แบบ hash ให้ผลคงที่ | 1 |
| ไม่แตะตัวเลขราคา | 1 (คอมเมนต์ + ไม่มี regex เบอร์โทร) |
| ตรวจด้วยตาทุกภาพ | 2–5 ทุก task + 8 (Step 1) |
| ห้ามเขียนลง DB | Global Constraints |
| JPEG q82 กว้าง ≤1600 | 2–5 ทุก task |
| งบ ≤16MB วัดก่อนเผยแพร่ | 7 (Step 5), 8 (Step 4) |
| Artifact self-contained + theme-aware | 7 (Step 3) |
| ห้ามอ้างอัตราการผ่านเทสต์ | 6 (Step 3), 8 (Step 2) |
| ห้ามให้บั๊กภายในหลุด | 6 (Step 3), 8 (Step 2) |
| ไม่มีตัวเลขธุรกิจกุขึ้น | Global Constraints |
| roadmap ยังไม่มี | ไม่มี task — ตามที่ spec ระบุ ถ้า user ส่งมาให้แทรกเป็นสไลด์ 15 แล้วเลื่อน appendix เป็น 16 |

**2. Placeholder scan** — ไม่มี TBD/TODO · ทุก step ที่ต้องใช้โค้ดมีโค้ดจริง · ทุกคำสั่งมี expected output · task ที่ทำงานซ้ำรูปแบบเดียวกัน (3, 4, 5) เขียนคำสั่งซ้ำเต็มทุกครั้ง ไม่อ้าง "เหมือน Task ก่อน"

**3. Type consistency** — ชื่อฟังก์ชันบน `window` ใช้ `__carmenScanCandidates` / `__carmenSetMap` / `__carmenSanitize` ตรงกันทุก task · โทเคนภาพเป็น `{{IMG_NN}}` โดย `NN` มาจากสองอักขระแรกของชื่อไฟล์ ซึ่งตรงกับรูปแบบ `01-`…`13-` ที่ Task 2–5 ตั้งไว้ · path ของ assets เป็น `docs/investor/assets` เหมือนกันทั้ง Task 2–5 และ build script
