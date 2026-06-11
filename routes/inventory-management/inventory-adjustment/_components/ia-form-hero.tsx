
import { useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import {
  ArrowLeft,
  Ban,
  CalendarDays,
  MapPin,
  Pencil,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PrintDocumentButton } from "@/components/print-document-button";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date-utils";
import {
  IA_STATUS_CONFIG,
  IA_TYPE_ICON,
} from "@/constant/inventory-adjustment";
import type {
  InventoryAdjustment,
  InventoryAdjustmentType,
} from "@/types/inventory-adjustment";
import type { FormMode } from "@/types/form";
import type { AdjFormValues } from "./ia-form-schema";

interface IaFormHeroProps {
  readonly adjustmentType: InventoryAdjustmentType;
  readonly inventoryAdjustment?: InventoryAdjustment;
  readonly form: UseFormReturn<AdjFormValues>;
  readonly typeLabel: string;
  readonly dateFormat: string;
  readonly mode: FormMode;
  readonly isReadOnly: boolean;
  readonly isPending: boolean;
  readonly deleteIsPending: boolean;
  readonly voidIsPending: boolean;
  readonly formId: string;
  readonly onBack: () => void;
  readonly onCancel: () => void;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
  readonly onVoid: () => void;
}

export function IaFormHero({
  adjustmentType,
  inventoryAdjustment,
  form,
  typeLabel,
  dateFormat,
  mode,
  isReadOnly,
  isPending,
  deleteIsPending,
  voidIsPending,
  formId,
  onBack,
  onCancel,
  onEdit,
  onDelete,
  onVoid,
}: IaFormHeroProps) {
  const tc = useTranslations("common");
  const tf = useTranslations("form");
  const isStockIn = adjustmentType === "stock-in";
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isAdd = mode === "add";
  const TypeIcon = IA_TYPE_ICON[adjustmentType];
  const docNo = inventoryAdjustment?.si_no ?? inventoryAdjustment?.so_no ?? "";
  const canDelete = !!inventoryAdjustment && !isReadOnly;
  const canVoid = isEdit && !!inventoryAdjustment && !isReadOnly;
  const canPrint = isView && !!inventoryAdjustment?.id;
  const submitLabel = isAdd ? tc("create") : tc("save");
  const submitPendingLabel = isAdd ? tf("creating") : tf("saving");

  /* useWatch subscribes only to `date` so re-render is scoped */
  const watchedDate = useWatch({ control: form.control, name: "date" });

  const statusConfig = inventoryAdjustment
    ? IA_STATUS_CONFIG[inventoryAdjustment.doc_status]
    : null;

  return (
    <section
      className={cn(
        "bg-card relative rounded-lg border border-l-[3px] p-5",
        isStockIn ? "border-l-success" : "border-l-destructive",
      )}
    >
      <div className="flex flex-wrap items-center gap-4">
        {/* Back button */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onBack}
          aria-label={tc("goBack")}
        >
          <ArrowLeft />
        </Button>

        {/* Type icon block */}
        <div
          className={cn(
            "ring-background flex size-14 shrink-0 items-center justify-center rounded-2xl shadow-md ring-4 ring-inset",
            isStockIn
              ? "bg-success/10 text-success ring-success/20"
              : "bg-destructive/10 text-destructive ring-destructive/20",
          )}
          aria-hidden="true"
        >
          <TypeIcon className="size-6" strokeWidth={2.25} />
        </div>

        {/* Doc info */}
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-foreground truncate text-lg leading-tight font-semibold tracking-tight">
              {docNo || typeLabel}
            </h1>
            {statusConfig && (
              <Badge className={statusConfig.className} size="sm">
                {statusConfig.label}
              </Badge>
            )}
          </div>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
            <span
              className={cn(
                "font-semibold tracking-widest uppercase",
                isStockIn ? "text-success" : "text-destructive",
              )}
            >
              {typeLabel}
            </span>
            {watchedDate && (
              <>
                <span aria-hidden="true" className="opacity-50">
                  ·
                </span>
                <span className="inline-flex items-center gap-1">
                  <CalendarDays
                    className="size-3 shrink-0"
                    aria-hidden="true"
                  />
                  {formatDate(watchedDate, dateFormat)}
                </span>
              </>
            )}
            {inventoryAdjustment?.location_name && (
              <>
                <span aria-hidden="true" className="opacity-50">
                  ·
                </span>
                <span className="inline-flex items-center gap-1 truncate">
                  <MapPin className="size-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">
                    {inventoryAdjustment.location_name}
                  </span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="ml-auto flex items-center gap-2">
          {canVoid && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onVoid}
              disabled={isPending || voidIsPending}
              className="border-warning/50 bg-warning/10 text-warning-foreground hover:bg-warning/20 hover:text-warning-foreground"
            >
              <Ban />
              {tc("void")}
            </Button>
          )}
          {canPrint && (
            <PrintDocumentButton
              documentType="IA"
              documentId={inventoryAdjustment!.id}
              filters={
                inventoryAdjustment!.si_no || inventoryAdjustment!.so_no
                  ? {
                      DocumentNo:
                        inventoryAdjustment!.si_no ??
                        inventoryAdjustment!.so_no ??
                        "",
                    }
                  : undefined
              }
            />
          )}
          {isView && !isReadOnly ? (
            <Button size="sm" onClick={onEdit}>
              <Pencil />
              {tc("edit")}
            </Button>
          ) : !isView ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCancel}
                disabled={isPending}
              >
                <X />
                {tc("cancel")}
              </Button>
              <Button
                type="submit"
                size="sm"
                form={formId}
                disabled={isPending}
              >
                <Save />
                {isPending ? submitPendingLabel : submitLabel}
              </Button>
            </>
          ) : null}
          {isEdit && canDelete && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={onDelete}
              disabled={isPending || deleteIsPending}
            >
              <Trash2 />
              {tc("delete")}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
