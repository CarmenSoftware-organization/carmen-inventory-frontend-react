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
}: {
  readonly priceListTemplate?: PriceListTemplate;
  readonly showDelete: boolean;
  readonly setShowDelete: (open: boolean) => void;
  readonly isDeletePending: boolean;
  readonly onConfirmDelete: () => void;
  readonly removeDetailIndex: number | null;
  readonly setRemoveDetailIndex: (i: number | null) => void;
  readonly onConfirmRemoveTier: () => void;
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
    </>
  );
}
