import { memo } from "react";
import { useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { StatusDotBadge, type DotTone } from "@/components/ui/status-dot-badge";
import { DocFormHeader } from "@/components/share/doc-form-header";
import type { FormMode } from "@/types/form";
import type { ProductDetail, ProductFormInstance } from "@/types/product";
import { History, Pencil, Save, Trash2, X } from "lucide-react";
import { useTranslations } from "use-intl";
import { openActivity } from "@/components/share/activity-sheet-host";

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
  const tActivity = useTranslations("activity");
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

  // status → global dot badge (draft=info · active=success · inactive=neutral)
  const statusTone: DotTone = isAdd
    ? "info"
    : watchedStatus === "active"
      ? "success"
      : "neutral";
  const statusLabel = isAdd
    ? t("draft")
    : watchedStatus === "active"
      ? t("active")
      : t("inactive");

  function getButtonLabel() {
    if (isPending) {
      return isEdit ? tf("saving") : tf("creating");
    }
    return isEdit ? tc("save") : t("createProduct");
  }

  // status + code/hint แสดงข้าง title (badges slot)
  const badges = (
    <>
      <StatusDotBadge tone={statusTone} size="xs">
        {statusLabel}
      </StatusDotBadge>
      {!isAdd && displayCode && (
        <span className="text-muted-foreground text-xs">{displayCode}</span>
      )}
      {isAdd && (
        <span className="text-muted-foreground text-xs">
          {t("fillRequiredBefore")}
        </span>
      )}
    </>
  );

  // subtitle: add → neverSaved · view/edit → local_name (custom Thai font)
  const subtitle = isAdd ? (
    t("neverSaved")
  ) : product?.local_name ? (
    <span>{product.local_name}</span>
  ) : undefined;

  const actions = (
    <>
      {/* ปุ่มประวัติอยู่ซ้ายสุด — เป็นการดู ไม่ใช่การแก้ จึงเห็นได้ทุกโหมด */}
      {product && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => openActivity(product.id, product.code)}
        >
          <History aria-hidden="true" />
          {tActivity("title")}
        </Button>
      )}
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
    </>
  );

  return (
    <DocFormHeader
      title={displayName}
      subtitle={subtitle}
      backLabel={tc("goBack")}
      onBack={onBack}
      badges={badges}
      actions={actions}
      flush
    />
  );
}

export default memo(FormToolbar);
