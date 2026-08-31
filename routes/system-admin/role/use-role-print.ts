import { useTranslations } from "use-intl";
import { usePermission } from "./use-permission";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import { escapeHtml as esc, printHtmlDocument } from "@/lib/print-html";
import {
  ACTION_TKEY,
  CATEGORY_META,
  MODULE_RESOURCE_KEY,
  actionOrder,
  groupPermissions,
  resourceLabelKeys,
  titleCase,
  type GroupedResource,
  type PermissionRecord,
} from "./permission-catalog";

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
    const permissions = (permData?.data ?? []) as PermissionRecord[];
    const granted = new Set(grantedIds);

    const categoryLabel = (cat: string) => {
      const meta = CATEGORY_META[cat];
      return meta ? t(meta.tkey) : cat;
    };
    const resourceLabel = (r: GroupedResource) => {
      if (r.resourceKey === MODULE_RESOURCE_KEY) return t("moduleAccess");
      const key = resourceLabelKeys(r.category, r.resourceKey).find((k) =>
        tRes.has(k),
      );
      return key ? tRes(key) : titleCase(r.resourceKey);
    };
    const actionLabel = (a: string) =>
      ACTION_TKEY[a] ? t(ACTION_TKEY[a]) : titleCase(a);

    // จัดกลุ่มด้วยตัวเดียวกับ PermissionPicker แล้วเหลือเฉพาะที่ role นี้ได้สิทธิ์
    // (ตัวจัดกลุ่มคัดสิทธิ์ที่ถูกลบทิ้งให้แล้ว และเก็บสิทธิ์ระดับโมดูลไว้ด้วย)
    const grantedSections = groupPermissions(permissions, resourceLabel)
      .map((group) => ({
        category: group.category,
        resources: group.resources
          .map((r) => ({
            label: resourceLabel(r),
            actions: Array.from(r.actions.entries())
              .filter(([, id]) => granted.has(id))
              .map(([action]) => action)
              .sort((a, b) => actionOrder(a) - actionOrder(b)),
          }))
          .filter((r) => r.actions.length > 0),
      }))
      .filter((g) => g.resources.length > 0);

    const sections = grantedSections
      .map((group) => {
        const rows = group.resources
          .map(
            (r) =>
              `<tr><td>${esc(r.label)}</td><td>${r.actions
                .map((a) => esc(actionLabel(a)))
                .join(" · ")}</td></tr>`,
          )
          .join("");
        return `
          <section>
            <h2>${esc(categoryLabel(group.category))}</h2>
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
      bodyHtml: sections || `<p class="empty">${esc(t("noPermissions"))}</p>`,
    });
  };

  return { printRole };
}
