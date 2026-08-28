import { useTranslations } from "use-intl";
import { usePermission } from "./use-permission";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import { escapeHtml as esc, printHtmlDocument } from "@/lib/print-html";
import {
  ACTION_TKEY,
  CATEGORY_META,
  MAIN_ACTIONS,
} from "./permission-picker";

/**
 * Hook พิมพ์สรุปสิทธิ์ของ role — ตารางว่า role นี้ทำอะไรได้บ้างในแต่ละโมดูล
 * (เฉพาะที่ได้รับสิทธิ์) พิมพ์ผ่าน iframe ของ lib/print-html ไม่เปิด tab ใหม่
 * ใช้ catalog + label ชุดเดียวกับ PermissionPicker เพื่อให้ชื่อตรงกันเสมอ
 * @returns { printRole } — printRole(roleName, grantedIds)
 * @example
 * const { printRole } = useRolePrint();
 * printRole("Procurement Manager", watchedPermissions);
 */
export function useRolePrint() {
  const t = useTranslations("systemAdmin.role");
  const tc = useTranslations("common");
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

    printHtmlDocument({
      title: roleName,
      buLine: defaultBu
        ? `${defaultBu.name}${defaultBu.code ? ` (${defaultBu.code})` : ""}`
        : "",
      docType: `${t("entity")} · ${t("permissions")}`,
      heading: roleName,
      metaItems: [
        `${t("permissions")}: ${grantedIds.length}`,
        `${tc("printedBy")}: ${fullName || "-"}`,
        `${tc("printedAt")}: ${formatDate(
          new Date().toISOString(),
          dateTimeFormat || "DD/MM/YYYY HH:mm",
        )}`,
      ],
      bodyHtml:
        sections || `<p class="empty">${esc(t("noPermissions"))}</p>`,
    });
  };

  return { printRole };
}
