import { Link } from "react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "use-intl";
import {
  Bell,
  Mail,
  MessageCircle,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { useConfigTable } from "@/components/ui/data-grid/use-config-table";
import { columnSkeletons } from "@/components/ui/data-grid/columns";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";
import type {
  NotificationTemplate,
  NotificationTemplateType,
} from "@/types/noti-tmpl";

interface UseNotiTmplTableOptions {
  readonly data: NotificationTemplate[];
  readonly totalRecords: number;
  readonly params: ParamsDto;
  readonly tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
}

const CHANNEL: Record<
  NotificationTemplateType,
  { label: string; Icon: LucideIcon }
> = {
  email: { label: "Email", Icon: Mail },
  app: { label: "App", Icon: Bell },
  line: { label: "LINE", Icon: MessageCircle },
  sms: { label: "SMS", Icon: Smartphone },
};

const ChannelBadge = ({
  type,
}: {
  readonly type: NotificationTemplateType;
}) => {
  const { label, Icon } = CHANNEL[type];
  return (
    <Badge variant="secondary" size="sm" className="gap-1 font-semibold">
      <Icon aria-hidden />
      {label}
    </Badge>
  );
};

export function useNotiTmplTable({
  data,
  totalRecords,
  params,
  tableConfig,
}: UseNotiTmplTableOptions) {
  const t = useTranslations("systemAdmin.notificationTemplate");

  const columns: ColumnDef<NotificationTemplate>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={t("colName")} />
      ),
      cell: ({ row }) => (
        <Link
          to={`/system-admin/notification-template/${row.original.id}`}
          className="focus-visible:ring-ring/50 text-primary font-semibold hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:outline-none"
        >
          {row.original.name || "..."}
        </Link>
      ),
      meta: { headerTitle: t("colName"), skeleton: columnSkeletons.text },
    },
    {
      accessorKey: "type",
      enableSorting: false,
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={t("colChannel")} />
      ),
      cell: ({ row }) => <ChannelBadge type={row.original.type} />,
      meta: { headerTitle: t("colChannel"), skeleton: columnSkeletons.badge },
    },
    {
      accessorKey: "subject",
      enableSorting: false,
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={t("colSubject")} />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.subject ?? "—"}
        </span>
      ),
      meta: { headerTitle: t("colSubject"), skeleton: columnSkeletons.text },
    },
  ];

  return useConfigTable<NotificationTemplate>({
    data,
    columns,
    totalRecords,
    params,
    tableConfig,
  });
}
