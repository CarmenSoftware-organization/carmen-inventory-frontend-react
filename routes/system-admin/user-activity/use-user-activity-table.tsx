import type { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "use-intl";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { useConfigTable } from "@/components/ui/data-grid/use-config-table";
import { Badge } from "@/components/ui/badge";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import { getLogCreatedAt, type ActivityLog } from "@/types/activity-log";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";

const ACTION_VARIANT: Record<string, string> = {
  login:
    "bg-[var(--status-in-progress)] text-[var(--status-in-progress-fg)] border-transparent",
  logout:
    "bg-[var(--status-draft)] text-[var(--status-draft-fg)] border-transparent",
};

interface UseUserActivityTableOptions {
  logs: ActivityLog[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
}

/**
 * Hook กำหนดคอลัมน์และ config ของตาราง User Activity (เวลา, action, user, IP, user agent)
 * @param options - อาร์เรย์ logs, totalRecords, params และ tableConfig
 * @returns TanStack Table instance สำหรับ User Activity
 * @example
 * const table = useUserActivityTable({ logs, totalRecords, params, tableConfig });
 */
export function useUserActivityTable({
  logs,
  totalRecords,
  params,
  tableConfig,
}: UseUserActivityTableOptions) {
  "use no memo";
  const t = useTranslations("systemAdmin.userActivity");
  const { dateFormat } = useProfile();

  const columns: ColumnDef<ActivityLog>[] = [
    {
      id: "created_at",
      accessorFn: (row) => getLogCreatedAt(row),
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={t("timestamp")} />
      ),
      cell: ({ row }) => {
        const iso: string = row.getValue("created_at");
        const date = formatDate(iso, dateFormat);
        const time = formatDate(iso, "HH:mm:ss");
        return (
          <div className="leading-tight tabular-nums">
            <p className="text-xs">{date}</p>
            <p className="text-muted-foreground text-[0.6875rem]">{time}</p>
          </div>
        );
      },
      meta: { headerTitle: t("timestamp") },
      size: 140,
    },
    {
      accessorKey: "action",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={t("action")} />
      ),
      cell: ({ row }) => {
        const action: string = row.getValue("action");
        const className =
          ACTION_VARIANT[action.toLowerCase()] ??
          "bg-muted text-muted-foreground";
        return (
          <Badge size="sm" className={`${className} text-xs`}>
            {action}
          </Badge>
        );
      },
      meta: { headerTitle: t("action") },
      size: 100,
    },
    {
      id: "actor_user",
      accessorFn: (row) => {
        const parts = [
          row.actor_firstname,
          row.actor_middlename,
          row.actor_lastname,
        ].filter(Boolean);
        return parts.length > 0
          ? parts.join(" ")
          : (row.actor_username ?? row.actor_id ?? "");
      },
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={t("user")} />
      ),
      cell: ({ row }) => {
        const fullName = row.getValue("actor_user") as string;
        const username = row.original.actor_username;
        return (
          <div className="leading-tight">
            <p className="text-xs font-semibold">{fullName || "—"}</p>
            {username && fullName !== username && (
              <p className="text-muted-foreground text-[0.6875rem]">
                {username}
              </p>
            )}
          </div>
        );
      },
      meta: { headerTitle: t("user") },
      size: 160,
    },
    {
      accessorKey: "description",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={t("description")} />
      ),
      cell: ({ row }) => {
        const desc: string = row.getValue("description") ?? "";
        return (
          <span className="text-muted-foreground block max-w-72 truncate text-xs">
            {desc || "—"}
          </span>
        );
      },
      meta: { headerTitle: t("description") },
      size: 260,
    },
    {
      accessorKey: "ip_address",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={t("ipAddress")} />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-[0.6875rem]">
          {row.getValue("ip_address") || "—"}
        </span>
      ),
      meta: { headerTitle: t("ipAddress") },
      size: 120,
    },
    {
      accessorKey: "user_agent",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={t("userAgent")} />
      ),
      cell: ({ row }) => {
        const ua: string | null = row.original.user_agent;
        return (
          <span className="text-muted-foreground block max-w-48 truncate text-[0.6875rem]">
            {ua || "—"}
          </span>
        );
      },
      meta: { headerTitle: t("userAgent") },
      size: 200,
    },
  ];

  return useConfigTable<ActivityLog>({
    data: logs,
    columns,
    totalRecords,
    params,
    tableConfig,
    hideStatus: true,
  });
}
