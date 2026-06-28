
import { useState } from "react";
import { useTranslations } from "use-intl";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { CardLabel, GlassCard } from "@/components/share/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/date-utils";
import { useProfile } from "@/hooks/use-profile";
import { useCertification } from "@/hooks/use-certification";
import {
  useDeleteVendorCertificate,
  useVendorCertificates,
} from "@/hooks/use-vendor-certificate";
import type { VendorCertificate } from "@/types/vendor-certificate";
import { VendorCertificateDialog } from "./vendor-certificate-dialog";

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
  const ts = useTranslations("status");
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
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <GlassCard>
      <div className="flex items-center justify-between gap-2">
        <CardLabel>{t("certificatesTitle")}</CardLabel>
        {!readOnly && (
          <Button type="button" size="xs" onClick={handleAdd}>
            <Plus />
            {t("addCertificate")}
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="mt-2 space-y-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="border-border/60 text-muted-foreground mt-2 rounded-lg border border-dashed py-6 text-center text-xs">
          {t("noCertificates")}
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <div className="border-border/60 mt-2 overflow-hidden rounded-lg border">
          <table className="w-full text-xs">
            <thead className="bg-muted/60 text-foreground border-b">
              <tr>
                <th
                  scope="col"
                  className="w-10 px-3 py-2 text-center font-semibold"
                >
                  #
                </th>
                <th scope="col" className="px-3 py-2 text-left font-semibold">
                  {tfl("certificateNo")}
                </th>
                <th scope="col" className="px-3 py-2 text-left font-semibold">
                  {tfl("certificate")}
                </th>
                <th scope="col" className="px-3 py-2 text-left font-semibold">
                  {tfl("issuedDate")}
                </th>
                <th scope="col" className="px-3 py-2 text-left font-semibold">
                  {tfl("expiryDate")}
                </th>
                <th scope="col" className="px-3 py-2 text-center font-semibold">
                  {tfl("status")}
                </th>
                {!readOnly && <th scope="col" className="w-16 px-3 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-border/40 divide-y">
              {items.map((item, index) => (
                <tr key={item.id} className="hover:bg-muted/20">
                  <td className="text-muted-foreground px-3 py-1.5 text-center tabular-nums">
                    {index + 1}
                  </td>
                  <td className="text-muted-foreground px-3 py-1.5">
                    {item.certificate_no}
                  </td>
                  <td className="px-3 py-1.5 font-semibold">
                    {masterMap.get(item.master_certificate_id)?.name ??
                      item.master_certificate_id}
                  </td>
                  <td className="px-3 py-1.5 tabular-nums">
                    {item.issued_date
                      ? formatDate(item.issued_date, dateFormat)
                      : "—"}
                  </td>
                  <td className="px-3 py-1.5 tabular-nums">
                    {item.expiry_date
                      ? formatDate(item.expiry_date, dateFormat)
                      : "—"}
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <Badge
                      variant={item.is_active ? "success" : "secondary"}
                      size="xs"
                    >
                      {item.is_active ? ts("active") : ts("inactive")}
                    </Badge>
                  </td>
                  {!readOnly && (
                    <td className="px-3 py-1.5">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon-xs"
                          aria-label={tc("edit")}
                          onClick={() => handleEdit(item)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon-xs"
                          aria-label={tc("delete")}
                          onClick={() => setDeleteItem(item)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
    </GlassCard>
  );
}
