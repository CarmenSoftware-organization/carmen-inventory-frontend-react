import type { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "use-intl";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { useConfigTable } from "@/components/ui/data-grid/use-config-table";
import { ActivityActionLabel } from "../shared/activity-action-label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import { getLogCreatedAt, type ActivityLog } from "@/types/activity-log";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";

/**
 * แปลงข้อความ snake_case เป็น Title Case สำหรับแสดงชื่อ entity type
 * @param value - ข้อความรูปแบบ snake_case ที่ต้องการแปลง
 * @returns ข้อความในรูปแบบ Title Case
 * @example
 * formatEntityType("purchase_order"); // "Purchase Order"
 */
function formatEntityType(value: string): string {
  if (!value) return "";
  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

interface UseActivityLogTableOptions {
  logs: ActivityLog[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
}

/**
 * Hook กำหนดคอลัมน์และ config ของตาราง Activity Log (เวลา, action, user, entity, description, IP)
 * @param options - อาร์เรย์ logs, จำนวน totalRecords, params และ tableConfig จาก useDataGridState
 * @returns TanStack Table instance สำหรับ Activity Log
 * @example
 * const table = useActivityLogTable({ logs, totalRecords, params, tableConfig });
 */
export function useActivityLogTable({
  logs,
  totalRecords,
  params,
  tableConfig,
}: UseActivityLogTableOptions) {
  "use no memo";
  const t = useTranslations("systemAdmin.activityLog");
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
            <p className="text-muted-foreground text-micro">{time}</p>
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
      cell: ({ row }) => (
        <ActivityActionLabel action={row.getValue("action")} />
      ),
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
              <p className="text-muted-foreground text-micro">{username}</p>
            )}
          </div>
        );
      },
      meta: { headerTitle: t("user") },
      size: 160,
    },
    {
      accessorKey: "entity_type",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={t("entityType")} />
      ),
      cell: ({ row }) => (
        <span className="text-xs">
          {formatEntityType(row.getValue("entity_type")) || "—"}
        </span>
      ),
      meta: { headerTitle: t("entityType") },
      size: 150,
    },
    {
      accessorKey: "description",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={t("description")} />
      ),
      cell: ({ row }) => {
        const desc: string = row.getValue("description") ?? "";
        return (
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <span className="text-muted-foreground block max-w-72 cursor-default truncate text-xs">
                {desc || "—"}
              </span>
            </TooltipTrigger>
            {desc.length > 40 && (
              <TooltipContent
                side="top"
                className="bg-popover text-popover-foreground max-w-[20rem] rounded-lg border px-3 py-2 shadow-md"
              >
                <p className="text-xs leading-snug">{desc}</p>
              </TooltipContent>
            )}
          </Tooltip>
        );
      },
      meta: { headerTitle: t("description") },
      size: 260,
    },
    {
      accessorKey: "entity_id",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={t("entityId")} />
      ),
      cell: ({ row }) => {
        const id: string = row.getValue("entity_id") ?? "";
        return (
          <span className="text-muted-foreground text-micro block max-w-28 truncate">
            {id ? `${id.slice(0, 8)}…` : "—"}
          </span>
        );
      },
      meta: { headerTitle: t("entityId") },
      size: 110,
    },
    {
      accessorKey: "ip_address",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={t("ipAddress")} />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-micro">
          {row.getValue("ip_address") || "—"}
        </span>
      ),
      meta: { headerTitle: t("ipAddress") },
      size: 120,
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
