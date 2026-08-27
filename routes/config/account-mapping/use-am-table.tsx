import type { ColumnDef } from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useTranslations } from "use-intl";
import { Check, Pencil, X } from "lucide-react";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { NameWithSubtext } from "@/components/share/name-with-sub-text";
import {
  columnSkeletons,
  customActionColumn,
} from "@/components/ui/data-grid/columns";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/date-utils";
import { useProfile } from "@/hooks/use-profile";
import type { AccountMappingRow, CodeName } from "@/types/account-mapping";

/** เซลล์ code+name — รหัสเป็นตัวหลัก ชื่อเป็นบรรทัดรอง (ว่างทั้งคู่ = ยังไม่ผูก) */
const codeNameCell = (value: CodeName) =>
  value.code || value.name ? (
    <NameWithSubtext primary={value.code} secondary={value.name} />
  ) : (
    <span className="text-muted-foreground">—</span>
  );

interface UseAmTableOptions {
  data: AccountMappingRow[];
}

/**
 * ตารางผังการผูกบัญชี — อ่านอย่างเดียว ไม่มีปุ่มแก้/ลบรายแถว
 *
 * ใช้ `useReactTable` ตรง ๆ ไม่ผ่าน `useConfigTable` เพราะตัวนั้นผูกกับ row action
 * และ permission ของ config CRUD ซึ่งหน้านี้ยังไม่มี
 *
 * @param options - data ของตาราง
 * @returns TanStack table instance
 */
export function useAmTable({ data }: UseAmTableOptions) {
  "use no memo";
  const tfl = useTranslations("field");
  const tc = useTranslations("common");
  const t = useTranslations("config.accountMapping");
  const { dateTimeFormat } = useProfile();

  const columns: ColumnDef<AccountMappingRow>[] = [
    {
      id: "index",
      header: "#",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.index + 1}</span>
      ),
      enableSorting: false,
      size: 55,
      meta: { headerClassName: "text-center", cellClassName: "text-center" },
    },
    {
      id: "store_location",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("location")} />
      ),
      cell: ({ row }) => codeNameCell(row.original.store_location),
      size: 160,
      meta: { headerTitle: tfl("location"), skeleton: columnSkeletons.text },
    },
    {
      id: "category",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("category")} />
      ),
      cell: ({ row }) => codeNameCell(row.original.category),
      size: 150,
      meta: { headerTitle: tfl("category"), skeleton: columnSkeletons.text },
    },
    {
      id: "sub_category",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("subCategory")} />
      ),
      cell: ({ row }) => codeNameCell(row.original.sub_category),
      size: 150,
      meta: { headerTitle: tfl("subCategory"), skeleton: columnSkeletons.text },
    },
    {
      id: "item_group",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("itemGroup")} />
      ),
      cell: ({ row }) => codeNameCell(row.original.item_group),
      size: 150,
      meta: { headerTitle: tfl("itemGroup"), skeleton: columnSkeletons.text },
    },
    {
      id: "department",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("department")} />
      ),
      cell: ({ row }) => codeNameCell(row.original.department),
      size: 160,
      meta: { headerTitle: tfl("department"), skeleton: columnSkeletons.text },
    },
    {
      id: "account_code",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("accountCode")} />
      ),
      cell: ({ row }) => codeNameCell(row.original.account_code),
      size: 200,
      meta: { headerTitle: tfl("accountCode"), skeleton: columnSkeletons.text },
    },
    {
      accessorKey: "is_mapped",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title={t("mapped")}
          className="justify-center"
        />
      ),
      // ผูกแล้ว/ยังไม่ผูก อ่านจากรูปทรงได้โดยไม่ต้องพึ่งสี — ชุดเดียวกับสถานะเอกสาร
      cell: ({ row }) =>
        row.original.is_mapped ? (
          <Check
            className="mx-auto size-3.5"
            style={{ color: "var(--status-approved)" }}
            aria-label={t("mapped")}
          />
        ) : (
          <X
            className="mx-auto size-3.5"
            style={{ color: "var(--status-rejected)" }}
            aria-label={t("notMapped")}
          />
        ),
      size: 100,
      meta: {
        headerTitle: t("mapped"),
        cellClassName: "text-center",
        headerClassName: "text-center",
        skeleton: columnSkeletons.textShort,
      },
    },
    {
      accessorKey: "last_scanned_at",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={t("lastScannedAt")} />
      ),
      cell: ({ row }) =>
        row.original.last_scanned_at ? (
          <span className="tabular-nums">
            {formatDate(row.original.last_scanned_at, dateTimeFormat)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
      size: 160,
      meta: { headerTitle: t("lastScannedAt"), skeleton: columnSkeletons.text },
    },
    // ยังไม่ผูก handler — วาง UI ไว้ก่อนตามที่ตกลง
    customActionColumn<AccountMappingRow>(() => (
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={tc("edit")}
      >
        <Pencil className="size-3.5" />
      </Button>
    )),
  ];

  return useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });
}
