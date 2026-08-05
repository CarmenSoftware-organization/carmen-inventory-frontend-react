import { useMemo, useState } from "react";
import { useTranslations } from "use-intl";
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { SettingSection } from "@/components/ui/setting-section";
import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import EmptyComponent from "@/components/empty-component";
import { formatDate } from "@/lib/date-utils";
import { useProfile } from "@/hooks/use-profile";
import { useEcoLabel } from "@/hooks/use-eco-label";
import {
  useDeleteProductEcoLabel,
  useProductEcoLabels,
} from "@/hooks/use-product-eco-label";
import type { ProductEcoLabel } from "@/types/product-eco-label";
import { ProductEcoLabelDialog } from "./pd-eco-label-dialog";

interface ProductEcoLabelSectionProps {
  readonly productId: string;
  readonly readOnly?: boolean;
}

/**
 * Section จัดการ eco label ของ product — CRUD อิสระ (ยิง API ทันที ไม่ผ่าน product form)
 * แสดงเฉพาะตอนมี product แล้ว (มี productId)
 */
export function ProductEcoLabelSection({
  productId,
  readOnly,
}: ProductEcoLabelSectionProps) {
  const t = useTranslations("productManagement.product");
  const tc = useTranslations("common");
  const tfl = useTranslations("field");
  const ts = useTranslations("status");
  const tt = useTranslations("toast");
  const { dateFormat } = useProfile();

  const { data, isLoading } = useProductEcoLabels(productId);
  const items = data?.data ?? [];
  const { data: masterData } = useEcoLabel({ perpage: -1 });
  const masterMap = new Map(
    (masterData?.data ?? []).map((c) => [c.id, c] as const),
  );

  const deleteEcoLabel = useDeleteProductEcoLabel();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<ProductEcoLabel | null>(null);
  const [deleteItem, setDeleteItem] = useState<ProductEcoLabel | null>(null);

  const handleAdd = () => {
    setEditItem(null);
    setDialogOpen(true);
  };
  const handleEdit = (item: ProductEcoLabel) => {
    setEditItem(item);
    setDialogOpen(true);
  };
  const handleConfirmDelete = () => {
    if (!deleteItem) return;
    deleteEcoLabel.mutate(deleteItem.id, {
      onSuccess: () => {
        toast.success(tt("deleteSuccess", { entity: tfl("ecoLabel") }));
        setDeleteItem(null);
      },
    });
  };

  const columns = useMemo<ColumnDef<ProductEcoLabel>[]>(
    () => [
      {
        id: "index",
        header: "#",
        cell: ({ row }) => row.index + 1,
        enableSorting: false,
        size: 32,
        meta: {
          headerClassName: "text-center",
          cellClassName: "text-center text-muted-foreground",
        },
      },
      {
        id: "certificate_no",
        header: tfl("certificateNo"),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.certificate_no}
          </span>
        ),
      },
      {
        id: "eco_label",
        header: tfl("ecoLabel"),
        cell: ({ row }) => (
          <span className="font-medium">
            {masterMap.get(row.original.master_eco_label_id)?.name ??
              row.original.master_eco_label_id}
          </span>
        ),
      },
      {
        id: "issued_date",
        header: tfl("issuedDate"),
        cell: ({ row }) =>
          row.original.issued_date
            ? formatDate(row.original.issued_date, dateFormat)
            : "—",
        meta: { cellClassName: "tabular-nums" },
      },
      {
        id: "expiry_date",
        header: tfl("expiryDate"),
        cell: ({ row }) =>
          row.original.expiry_date
            ? formatDate(row.original.expiry_date, dateFormat)
            : "—",
        meta: { cellClassName: "tabular-nums" },
      },
      {
        id: "status",
        header: tfl("status"),
        // StatusDotBadge เหมือนทั้งโมดูล (list, การ์ด, หัวฟอร์ม, แท็บคลัง) — ของเดิม
        // เป็น Badge เขียวทึบ ซึ่งทั้งดังเกินสำหรับแถวในตารางและใช้ semantic
        // "success" มาแทนความหมาย "เปิดใช้งานอยู่"
        cell: ({ row }) => (
          <StatusDotBadge
            tone={row.original.is_active ? "success" : "neutral"}
            size="xs"
          >
            {row.original.is_active ? ts("active") : ts("inactive")}
          </StatusDotBadge>
        ),
        enableSorting: false,
        meta: {
          headerClassName: "text-center",
          cellClassName: "text-center",
        },
      },
      ...(readOnly
        ? []
        : [
            {
              id: "action",
              header: () => "",
              cell: ({ row }) => (
                <div className="flex items-center justify-end gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={tc("edit")}
                    onClick={() => handleEdit(row.original)}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={tc("delete")}
                    onClick={() => setDeleteItem(row.original)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ),
              enableSorting: false,
              size: 72,
              meta: {
                headerClassName: "text-right",
                cellClassName: "text-right",
              },
            } as ColumnDef<ProductEcoLabel>,
          ]),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- masterMap สร้างใหม่ทุก render
    [readOnly, dateFormat, tfl, tc, ts, masterData],
  );

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  return (
    <SettingSection
      first
      wide
      title={t("ecoLabelsTitle")}
      count={items.length}
      action={
        !readOnly ? (
          <Button type="button" size="sm" onClick={handleAdd}>
            <Plus />
            {t("addEcoLabel")}
          </Button>
        ) : undefined
      }
    >
      <DataGrid
        table={table}
        recordCount={items.length}
        isLoading={isLoading}
        emptyMessage={<EmptyComponent title={t("noEcoLabels")} />}
      >
        <DataGridContainer>
          <DataGridTable />
        </DataGridContainer>
      </DataGrid>

      <ProductEcoLabelDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        productId={productId}
        ecoLabel={editItem}
      />

      <DeleteDialog
        open={!!deleteItem}
        onOpenChange={(open) =>
          !open && !deleteEcoLabel.isPending && setDeleteItem(null)
        }
        title={t("deleteEcoLabelTitle")}
        description={t("deleteEcoLabelConfirm", {
          no: deleteItem?.certificate_no ?? "",
        })}
        isPending={deleteEcoLabel.isPending}
        onConfirm={handleConfirmDelete}
      />
    </SettingSection>
  );
}
