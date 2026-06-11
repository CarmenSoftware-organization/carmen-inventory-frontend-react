
import { useState } from "react";
import { useTranslations } from "use-intl";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Skeleton } from "@/components/ui/skeleton";
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
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{t("ecoLabelsTitle")}</h2>
        {!readOnly && (
          <Button type="button" size="xs" onClick={handleAdd}>
            <Plus />
            {t("addEcoLabel")}
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="border-border/60 text-muted-foreground rounded-lg border border-dashed py-6 text-center text-xs">
          {t("noEcoLabels")}
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <div className="border-border/60 overflow-hidden rounded-lg border">
          <table className="w-full text-xs">
            <thead className="bg-muted/60 text-foreground border-b">
              <tr>
                <th
                  scope="col"
                  className="w-10 px-3 py-2 text-center font-medium"
                >
                  #
                </th>
                <th scope="col" className="px-3 py-2 text-left font-medium">
                  {tfl("certificateNo")}
                </th>
                <th scope="col" className="px-3 py-2 text-left font-medium">
                  {tfl("ecoLabel")}
                </th>
                <th scope="col" className="px-3 py-2 text-left font-medium">
                  {tfl("issuedDate")}
                </th>
                <th scope="col" className="px-3 py-2 text-left font-medium">
                  {tfl("expiryDate")}
                </th>
                <th scope="col" className="px-3 py-2 text-center font-medium">
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
                  <td className="px-3 py-1.5 font-medium">
                    {masterMap.get(item.master_eco_label_id)?.name ??
                      item.master_eco_label_id}
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
                      variant={item.is_active ? "success" : "destructive"}
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
    </section>
  );
}
