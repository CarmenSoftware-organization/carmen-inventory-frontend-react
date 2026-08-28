import { useMemo, useState } from "react";
import { useTranslations } from "use-intl";
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Award, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { SettingSection } from "@/components/ui/setting-section";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/date-utils";
import { useProfile } from "@/hooks/use-profile";
import { useCertification } from "@/hooks/use-certification";
import {
  useDeleteVendorCertificate,
  useVendorCertificates,
} from "./use-vendor-certificate";
import type { VendorCertificate } from "@/types/vendor-certificate";
import { VendorCertificateDialog } from "./vendor-certificate-dialog";
import { VendorEmptySection } from "./vendor-empty-section";

interface VendorCertificateSectionProps {
  readonly vendorId: string;
  readonly readOnly?: boolean;
}

/**
 * Section จัดการใบรับรองของ vendor — CRUD อิสระ (ยิง API ทันที ไม่ผ่าน vendor form)
 * วางนอก `<form>` แสดงเฉพาะตอนมี vendor แล้ว (มี vendorId)
 */
export function VendorCertificateSection({
  vendorId,
  readOnly,
}: VendorCertificateSectionProps) {
  const t = useTranslations("vendorManagement.vendor");
  const tc = useTranslations("common");
  const tfl = useTranslations("field");
  const tt = useTranslations("toast");
  const { dateFormat } = useProfile();

  const { data, isLoading } = useVendorCertificates(vendorId);
  const items = data?.data ?? [];
  const { data: masterData } = useCertification({ perpage: -1 });
  const masterMap = new Map(
    (masterData?.data ?? []).map((c) => [c.id, c] as const),
  );

  const deleteCert = useDeleteVendorCertificate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<VendorCertificate | null>(null);
  const [deleteItem, setDeleteItem] = useState<VendorCertificate | null>(null);

  const handleAdd = () => {
    setEditItem(null);
    setDialogOpen(true);
  };
  const handleEdit = (item: VendorCertificate) => {
    setEditItem(item);
    setDialogOpen(true);
  };
  const handleConfirmDelete = () => {
    if (!deleteItem) return;
    deleteCert.mutate(deleteItem.id, {
      onSuccess: () => {
        toast.success(tt("deleteSuccess", { entity: tfl("certificate") }));
        setDeleteItem(null);
      },
    });
  };

  const columns = useMemo<ColumnDef<VendorCertificate>[]>(
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
        size: 120,
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.certificate_no}
          </span>
        ),
      },
      {
        id: "certificate",
        header: tfl("certificate"),
        size: 200,
        cell: ({ row }) => (
          <span className="font-medium">
            {masterMap.get(row.original.master_certificate_id)?.name ??
              row.original.master_certificate_id}
          </span>
        ),
      },
      {
        id: "issued_date",
        header: tfl("issuedDate"),
        size: 120,
        cell: ({ row }) =>
          row.original.issued_date
            ? formatDate(row.original.issued_date, dateFormat)
            : "—",
        meta: { cellClassName: "tabular-nums" },
      },
      {
        id: "expiry_date",
        header: tfl("expiryDate"),
        size: 120,
        cell: ({ row }) =>
          row.original.expiry_date
            ? formatDate(row.original.expiry_date, dateFormat)
            : "—",
        meta: { cellClassName: "tabular-nums" },
      },
      {
        id: "status",
        header: tfl("status"),
        size: 100,
        cell: ({ row }) => <StatusBadge active={!!row.original.is_active} />,
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
            } as ColumnDef<VendorCertificate>,
          ]),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- masterMap สร้างใหม่ทุก render
    [readOnly, dateFormat, tfl, tc, masterData],
  );

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  return (
    <SettingSection
      wide
      frameless
      title={t("certificatesTitle")}
      description={t("certificatesDesc")}
      count={items.length}
      action={
        !readOnly ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAdd}
          >
            <Plus />
            {t("addCertificate")}
          </Button>
        ) : undefined
      }
    >
      <DataGrid
        table={table}
        recordCount={items.length}
        isLoading={isLoading}
        emptyMessage={
          <VendorEmptySection
            icon={Award}
            title={t("noCertificates")}
            description={t("noCertificatesDesc")}
          />
        }
      >
        <DataGridContainer>
          <DataGridTable />
        </DataGridContainer>
      </DataGrid>

      <VendorCertificateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        vendorId={vendorId}
        certificate={editItem}
      />

      <DeleteDialog
        open={!!deleteItem}
        onOpenChange={(open) =>
          !open && !deleteCert.isPending && setDeleteItem(null)
        }
        title={t("deleteCertificateTitle")}
        description={t("deleteCertificateConfirm", {
          no: deleteItem?.certificate_no ?? "",
        })}
        isPending={deleteCert.isPending}
        onConfirm={handleConfirmDelete}
      />
    </SettingSection>
  );
}
