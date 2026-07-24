import { useTranslations } from "use-intl";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import type { PriceListTemplate } from "@/types/price-list-template";

export function PltFormDialogs({
  priceListTemplate,
  showDelete,
  setShowDelete,
  isDeletePending,
  onConfirmDelete,
  removeDetailIndex,
  setRemoveDetailIndex,
  onConfirmRemoveTier,
  removeProductId,
  removeProductName,
  setRemoveProductId,
  onConfirmRemoveProduct,
}: {
  readonly priceListTemplate?: PriceListTemplate;
  readonly showDelete: boolean;
  readonly setShowDelete: (open: boolean) => void;
  readonly isDeletePending: boolean;
  readonly onConfirmDelete: () => void;
  readonly removeDetailIndex: number | null;
  readonly setRemoveDetailIndex: (i: number | null) => void;
  readonly onConfirmRemoveTier: () => void;
  readonly removeProductId: string | null;
  readonly removeProductName: string;
  readonly setRemoveProductId: (id: string | null) => void;
  readonly onConfirmRemoveProduct: () => void;
}) {
  const t = useTranslations("vendorManagement.priceListTemplate");

  return (
    <>
      {priceListTemplate && (
        <DeleteDialog
          open={showDelete}
          onOpenChange={(open) =>
            !open && !isDeletePending && setShowDelete(false)
          }
          title={t("deleteTitle")}
          description={t("deleteConfirm", { name: priceListTemplate.name })}
          isPending={isDeletePending}
          onConfirm={onConfirmDelete}
        />
      )}

      <DeleteDialog
        open={removeDetailIndex !== null}
        onOpenChange={(o) => {
          if (!o) setRemoveDetailIndex(null);
        }}
        title={t("removeTierTitle")}
        description={t("removeTierConfirm")}
        onConfirm={onConfirmRemoveTier}
      />

      <DeleteDialog
        open={removeProductId !== null}
        onOpenChange={(o) => {
          if (!o) setRemoveProductId(null);
        }}
        title={t("removeProductTitle", { name: removeProductName })}
        description={t("removeProductConfirm")}
        onConfirm={onConfirmRemoveProduct}
      />
    </>
  );
}
