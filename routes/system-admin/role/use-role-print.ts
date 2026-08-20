import { useTranslations } from "use-intl";
import { usePermission } from "@/hooks/use-permission";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import {
  ACTION_TKEY,
  CATEGORY_META,
  MAIN_ACTIONS,
} from "./permission-picker";

/** escape ข้อความก่อนฝังลง HTML ของหน้า print (ชื่อ role มาจาก user) */
const esc = (s: string) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

/**
 * Hook พิมพ์สรุปสิทธิ์ของ role — เปิดหน้าต่างใหม่เป็นตารางว่า role นี้ทำอะไร
 * ได้บ้างในแต่ละโมดูล (เฉพาะที่ได้รับสิทธิ์) แล้วสั่ง print ให้เลย
 * ใช้ catalog + label ชุดเดียวกับ PermissionPicker เพื่อให้ชื่อตรงกันเสมอ
 * @returns { printRole } — printRole(roleName, grantedIds)
 * @example
 * const { printRole } = useRolePrint();
 * printRole("Procurement Manager", watchedPermissions);
 */
export function useRolePrint() {
  const t = useTranslations("systemAdmin.role");
  const tRes = useTranslations("systemAdmin.role.resources");
  const { data: permData } = usePermission({ perpage: -1 });
  const { defaultBu, fullName, dateTimeFormat } = useProfile();

  const printRole = (roleName: string, grantedIds: string[]) => {
    const permissions = permData?.data ?? [];
    const granted = new Set(grantedIds);

    // จัดกลุ่มเหมือน PermissionPicker: category → resource → action ที่ได้สิทธิ์
    const byCategory = new Map<string, Map<string, string[]>>();
    for (const perm of permissions) {
      if (!granted.has(perm.id)) continue;
      const dot = perm.resource.indexOf(".");
      if (dot === -1) continue;
      const category = perm.resource.substring(0, dot);
      const resource = perm.resource.substring(dot + 1);
      if (!byCategory.has(category)) byCategory.set(category, new Map());
      const resMap = byCategory.get(category)!;
      if (!resMap.has(resource)) resMap.set(resource, []);
      resMap.get(resource)!.push(perm.action);
    }

    const categoryLabel = (cat: string) => {
      const meta = CATEGORY_META[cat];
      return meta ? t(meta.tkey) : cat;
    };
    const resourceLabel = (key: string) =>
      tRes.has(key)
        ? tRes(key)
        : key
            .split("_")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
    const actionLabel = (a: string) => (ACTION_TKEY[a] ? t(ACTION_TKEY[a]) : a);
    // เรียง action ตามลำดับเดียวกับหน้าจอ (CRUD ก่อน)
    const actionOrder = (a: string) => {
      const i = (MAIN_ACTIONS as readonly string[]).indexOf(a);
      return i === -1 ? MAIN_ACTIONS.length : i;
    };

    const sections = Array.from(byCategory.entries())
      .map(([cat, resources]) => {
        const rows = Array.from(resources.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([resource, actions]) => {
            const labels = actions
              .sort((a, b) => actionOrder(a) - actionOrder(b))
              .map((a) => esc(actionLabel(a)))
              .join(" · ");
            return `<tr><td>${esc(resourceLabel(resource))}</td><td>${labels}</td></tr>`;
          })
          .join("");
        return `
          <section>
            <h2>${esc(categoryLabel(cat))}</h2>
            <table>
              <thead><tr><th>${esc(t("resource"))}</th><th>${esc(t("permissions"))}</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </section>`;
      })
      .join("");

    const buLine = defaultBu
      ? `${defaultBu.name}${defaultBu.code ? ` (${defaultBu.code})` : ""}`
      : "";
    const printedAt = formatDate(
      new Date().toISOString(),
      dateTimeFormat || "DD/MM/YYYY HH:mm",
    );

    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(roleName)}</title>
<style>
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
  td:first-child { width: 40%; font-weight: 500; }
  .empty { color: #666; font-size: 0.875rem; }
  section { break-inside: avoid; }
  footer { margin-top: 2rem; padding-top: 0.5rem; border-top: 1px solid #ddd; color: #999; font-size: 0.625rem; display: flex; justify-content: space-between; }
</style>
</head>
<body>
<header>
  <span class="bu">${esc(buLine)}</span>
  <span class="doc-type">${esc(t("entity"))} · ${esc(t("permissions"))}</span>
</header>
<h1>${esc(roleName)}</h1>
<p class="meta">
  <span>${esc(t("permissions"))}: ${grantedIds.length}</span>
  <span>${esc(t("printedBy"))}: ${esc(fullName || "-")}</span>
  <span>${esc(t("printedAt"))}: ${esc(printedAt)}</span>
</p>
${sections || `<p class="empty">${esc(t("noPermissions"))}</p>`}
<footer>
  <span>CARMEN BLUE · Hotel ERP Platform</span>
  <span>${esc(buLine)}</span>
</footer>
</body>
</html>`;

    // พิมพ์ผ่าน iframe ซ่อนในหน้าเดิม — ได้ print preview โดยไม่เปิด tab ใหม่
    // และไม่ติด popup blocker; เก็บกวาด iframe หลังพิมพ์เสร็จ (afterprint ไม่
    // ยิงในบาง browser จึงมี timeout กันค้าง)
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
  };

  return { printRole };
}
