import { useState } from "react";
import { useTranslations } from "use-intl";
import { useProfile } from "@/hooks/use-profile";
import {
  useUserRoleMatrixFetch,
  type UserRoleMatrix,
} from "@/hooks/use-user";
import { useExportErrorToast } from "@/hooks/use-export-error-toast";
import { escapeHtml, printHtmlDocument } from "@/lib/print-html";
import { formatDate } from "@/lib/date-utils";
import type { UserApplicationRole } from "@/types/user";

/** escape ค่าใน cell ของ CSV — ครอบ quote เมื่อมี comma/quote/newline */
const csvCell = (v: string) =>
  /[",\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v;

/**
 * Hook รายงาน user × role ของหน้า user list — print (ตาราง matrix แนวนอน)
 * และ export CSV (คอลัมน์เดียวกัน cell เป็น Y/ว่าง) จากข้อมูล
 * `GET /api/config/{bu}/user-application-roles` ทั้ง BU
 * @returns { printReport, exportCsv, isBusy }
 * @example
 * const { printReport, exportCsv, isBusy } = useUserRoleReport();
 */
export function useUserRoleReport() {
  const t = useTranslations("systemAdmin.user");
  const tc = useTranslations("common");
  const ts = useTranslations("status");
  const tfl = useTranslations("field");
  const { defaultBu, fullName, dateTimeFormat } = useProfile();
  const fetchMatrix = useUserRoleMatrixFetch();
  const exportErrorToast = useExportErrorToast();
  const [isBusy, setIsBusy] = useState(false);

  const displayName = (u: UserApplicationRole) =>
    [u.firstname, u.middlename, u.lastname].filter(Boolean).join(" ") ||
    u.username;
  const buRoleLabel = (r: string) =>
    r === "admin" ? t("buRoleAdmin") : r === "user" ? t("buRoleUser") : r;
  const statusLabel = (u: UserApplicationRole) =>
    u.is_active && u.is_bu_active ? ts("active") : ts("inactive");

  const withMatrix = async (fn: (matrix: UserRoleMatrix) => void) => {
    setIsBusy(true);
    try {
      fn(await fetchMatrix());
    } catch (err) {
      exportErrorToast(err);
    } finally {
      setIsBusy(false);
    }
  };

  const printReport = () =>
    withMatrix(({ users, roles }) => {
      const esc = escapeHtml;
      const head = [
        "#",
        tfl("name"),
        tfl("email"),
        tfl("buRole"),
        tfl("status"),
        ...roles.map((r) => r.name),
      ]
        .map((h, i) => `<th${i >= 5 ? ' class="center"' : ""}>${esc(h)}</th>`)
        .join("");
      const rows = users
        .map((u, i) => {
          const cells = [
            `<td>${i + 1}</td>`,
            `<td>${esc(displayName(u))}</td>`,
            `<td>${esc(u.email)}</td>`,
            `<td>${esc(buRoleLabel(u.bu_role))}</td>`,
            `<td>${esc(statusLabel(u))}</td>`,
            ...roles.map(
              (r) =>
                `<td class="center">${u.role_ids.includes(r.id) ? "✓" : ""}</td>`,
            ),
          ];
          return `<tr>${cells.join("")}</tr>`;
        })
        .join("");

      printHtmlDocument({
        title: t("roleReport"),
        buLine: defaultBu
          ? `${defaultBu.name}${defaultBu.code ? ` (${defaultBu.code})` : ""}`
          : "",
        docType: t("roleReport"),
        heading: t("roleReport"),
        metaItems: [
          t("nUsers", { count: users.length }),
          `${tc("printedBy")}: ${fullName || "-"}`,
          `${tc("printedAt")}: ${formatDate(
            new Date().toISOString(),
            dateTimeFormat || "DD/MM/YYYY HH:mm",
          )}`,
        ],
        bodyHtml: `<table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`,
        landscape: true,
      });
    });

  const exportCsv = () =>
    withMatrix(({ users, roles }) => {
      const header = [
        tfl("name"),
        tfl("email"),
        tfl("buRole"),
        tfl("status"),
        ...roles.map((r) => r.name),
      ];
      const lines = [
        header.map(csvCell).join(","),
        ...users.map((u) =>
          [
            displayName(u),
            u.email,
            buRoleLabel(u.bu_role),
            statusLabel(u),
            ...roles.map((r) => (u.role_ids.includes(r.id) ? "Y" : "")),
          ]
            .map(csvCell)
            .join(","),
        ),
      ];
      // BOM จำเป็น — ไม่งั้น Excel เปิดชื่อไทยเพี้ยน
      const blob = new Blob(["﻿" + lines.join("\r\n")], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `user-roles_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });

  return { printReport, exportCsv, isBusy };
}
