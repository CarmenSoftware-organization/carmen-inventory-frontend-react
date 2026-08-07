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
