import { memo } from "react";
import { useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { FormMode } from "@/types/form";
import type { ProductDetail, ProductFormInstance } from "@/types/product";
import { ArrowLeft, Pencil, Save, Trash2, X } from "lucide-react";
import { useTranslations } from "use-intl";

interface FormToolbarProps {
  readonly product?: ProductDetail;
  readonly form: ProductFormInstance;
  readonly mode: FormMode;
  readonly isPending: boolean;
  readonly deleteIsPending: boolean;
  readonly onBack: () => void;
  readonly onEdit: () => void;
  readonly onCancel: () => void;
  readonly onDelete: () => void;
}

function FormToolbar({
  product,
  form,
  mode,
  isPending,
  deleteIsPending,
  onBack,
  onEdit,
  onCancel,
  onDelete,
}: FormToolbarProps) {
  const tc = useTranslations("common");
  const tf = useTranslations("form");
  const t = useTranslations("productManagement.product");
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isAdd = mode === "add";

  // Subscribe ONLY to the 3 fields the toolbar displays — `form.watch`
  // would subscribe to every form change (toolbar re-renders on every keystroke).
  const [watchedName, watchedCode, watchedStatus] = useWatch({
    control: form.control,
    name: ["name", "code", "product_status_type"],
  });

  const displayName = isAdd
    ? watchedName || t("newProductTitle")
    : (product?.name ?? watchedName);
  const displayCode = product?.code ?? watchedCode;
  const isDirty = form.formState.isDirty;
  const saveDisabled = isPending || (isEdit && !isDirty);

  function renderStatusBadge() {
    if (isAdd) {
      return (
        <Badge variant="info-light" size="xs">
          ● {t("draft")}
        </Badge>
      );
    }
    if (watchedStatus === "active") {
      return (
        <Badge variant="success-light" size="xs">
          ● {t("active")}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" size="xs">
        ○ {t("inactive")}
      </Badge>
    );
  }

  function getButtonLabel() {
    if (isPending) {
      return isEdit ? tf("saving") : tf("creating");
    }
    return isEdit ? tc("save") : t("createProduct");
  }

  return (
    <div className="flex flex-col gap-2 border-b pt-2 pb-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onBack}
            aria-label={tc("goBack")}
            className="mt-0.5 shrink-0"
          >
            <ArrowLeft />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1
                className="truncate text-lg font-semibold"
                title={displayName}
              >
                {displayName}
              </h1>
              {renderStatusBadge()}
              {!isAdd && displayCode && (
                <span className="text-muted-foreground text-xs">
                  {displayCode}
                </span>
              )}
              {isAdd && (
                <span className="text-muted-foreground text-xs">
                  {t("fillRequiredBefore")}
                </span>
              )}
            </div>
            {isAdd ? (
              <p className="text-muted-foreground text-xs">{t("neverSaved")}</p>
            ) : (
              product?.local_name && (
                <p
                  className="text-muted-foreground text-xs"
                  style={{
                    fontFamily: '"IBM Plex Sans Thai", var(--font-sans)',
                  }}
                >
                  {product.local_name}
                </p>
              )
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isEdit && product && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDelete}
              disabled={isPending || deleteIsPending}
              className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 aria-hidden="true" />
              {tc("delete")}
            </Button>
          )}
          {isView ? (
            <Button size="sm" onClick={onEdit}>
              <Pencil aria-hidden="true" />
              {tc("edit")}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCancel}
                disabled={isPending}
              >
                <X className="size-4" aria-hidden="true" />
                {tc("cancel")}
              </Button>
              <Button
                type="submit"
                size="sm"
                form="product-form"
                disabled={saveDisabled}
              >
                <Save className="size-4" aria-hidden="true" />
                {getButtonLabel()}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(FormToolbar);
