/**
 * พิมพ์เอกสาร HTML ฝั่ง client ผ่าน iframe ซ่อนในหน้าเดิม — ได้ print preview
 * โดยไม่เปิด tab ใหม่และไม่ติด popup blocker ใช้กับรายงานที่ backend ไม่มี
 * template ให้ (เช่น สรุปสิทธิ์ role, ตาราง user×role) — เอกสารที่ backend มี
 * template ใช้ lib/print-document.ts ตามเดิม
 */

/**
 * escape ข้อความก่อนฝังลง HTML (ชื่อ role/user มาจากผู้ใช้)
 *
 * escape เครื่องหมายคำพูดด้วย ทั้งที่ทุก call site วันนี้ฝังใน text node ล้วน ๆ —
 * วันที่มีคนเอาไปใช้ใน attribute (`title="${esc(name)}"`) มันจะหลุดทันทีโดยที่ชื่อ
 * ฟังก์ชันยังอ่านว่าปลอดภัยอยู่ ซึ่งเป็นกับดักที่ไม่มีอะไรจับได้
 */
export const escapeHtml = (s: string) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export interface PrintHtmlDocumentParts {
  /** ชื่อเอกสาร (title ของหน้า print) */
  title: string;
  /** บรรทัด BU มุมซ้ายหัวกระดาษ เช่น "Grand Hotel (GH01)" */
  buLine: string;
  /** ประเภทเอกสาร มุมขวาหัวกระดาษ เช่น "Role · Permissions" */
  docType: string;
  /** หัวเรื่องใหญ่ใต้หัวกระดาษ */
  heading: string;
  /** รายการ meta ใต้หัวเรื่อง (จำนวน/พิมพ์โดย/พิมพ์เมื่อ) — escape ให้แล้ว */
  metaItems: string[];
  /** เนื้อเอกสาร — caller ประกอบ (และ escape ข้อความ) เอง */
  bodyHtml: string;
  /** พิมพ์แนวนอน — สำหรับตาราง matrix ที่คอลัมน์เยอะ */
  landscape?: boolean;
}

/**
 * ประกอบเอกสารตาม chrome มาตรฐาน (หัว BU/ประเภท · meta · footer brand)
 * แล้วสั่งพิมพ์ผ่าน iframe ซ่อน
 * @param parts - ส่วนประกอบเอกสาร ดู PrintHtmlDocumentParts
 * @example
 * printHtmlDocument({ title, buLine, docType, heading, metaItems, bodyHtml });
 */
export function printHtmlDocument(parts: PrintHtmlDocumentParts) {
  const esc = escapeHtml;
  const meta = parts.metaItems
    .map((m) => `<span>${esc(m)}</span>`)
    .join("\n  ");

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(parts.title)}</title>
<style>
  ${parts.landscape ? "@page { size: A4 landscape; }" : ""}
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Sarabun", "Noto Sans Thai", sans-serif; color: #111; margin: 2rem; font-size: 0.75rem; }
  header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #111; padding-bottom: 0.5rem; margin-bottom: 1rem; }
  .bu { font-size: 0.875rem; font-weight: 600; }
  .doc-type { color: #666; font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.05em; }
  h1 { font-size: 1.25rem; margin: 0 0 0.25rem; }
  .meta { color: #666; margin: 0 0 1.5rem; }
  .meta span + span::before { content: " · "; }
  h2 { font-size: 0.875rem; margin: 1.25rem 0 0.5rem; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 0.375rem 0.5rem; border-bottom: 1px solid #ddd; vertical-align: top; }
  th { color: #666; font-weight: 600; }
  .empty { color: #666; font-size: 0.875rem; }
  section { break-inside: avoid; }
  .center { text-align: center; }
  footer { margin-top: 2rem; padding-top: 0.5rem; border-top: 1px solid #ddd; color: #999; font-size: 0.625rem; display: flex; justify-content: space-between; }
</style>
</head>
<body>
<header>
  <span class="bu">${esc(parts.buLine)}</span>
  <span class="doc-type">${esc(parts.docType)}</span>
</header>
<h1>${esc(parts.heading)}</h1>
<p class="meta">
  ${meta}
</p>
${parts.bodyHtml}
<footer>
  <span>CARMEN BLUE · Hotel ERP Platform</span>
  <span>${esc(parts.buLine)}</span>
</footer>
</body>
</html>`;

  // เก็บกวาด iframe หลังพิมพ์ (afterprint ไม่ยิงในบาง browser จึงมี timeout กันค้าง)
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  const cleanup = () => iframe.remove();
  win.addEventListener("afterprint", cleanup);
  globalThis.setTimeout(cleanup, 60_000);
  win.focus();
  win.print();
}
