import { useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import {
  Ban,
  CalendarDays,
  Check,
  MapPin,
  Pencil,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DocFormHeader } from "@/components/share/doc-form-header";
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
  const isStockIn = adjustmentType === "stock-in";
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const TypeIcon = IA_TYPE_ICON[adjustmentType];
  const docNo = inventoryAdjustment?.si_no ?? inventoryAdjustment?.so_no ?? "";
  const canDelete = !!inventoryAdjustment && !isReadOnly;
  const canVoid = isEdit && !!inventoryAdjustment && !isReadOnly;
  const canPrint = isView && !!inventoryAdjustment?.id;

  /** Save = ฉบับร่าง (draft) / Submit = ปิดเอกสาร (completed) — ตั้ง doc_status ก่อน submit */
  const submitWith = (docStatus: "draft" | "completed") => () =>
    form.setValue("doc_status", docStatus);

  /* useWatch subscribes only to `date` so re-render is scoped */
  const watchedDate = useWatch({ control: form.control, name: "date" });

  const statusConfig = inventoryAdjustment
    ? IA_STATUS_CONFIG[inventoryAdjustment.doc_status]
    : null;

  // type icon block (สี success/destructive ตาม type) → leading slot
  const leading = (
    <div
      className={cn(
        "ring-background flex size-14 shrink-0 items-center justify-center rounded-2xl ring-4 ring-inset",
        isStockIn
          ? "bg-success/10 text-success ring-success/20"
          : "bg-destructive/10 text-destructive ring-destructive/20",
      )}
      aria-hidden="true"
    >
      <TypeIcon className="size-6" strokeWidth={2.25} />
    </div>
  );

  const badges = statusConfig ? (
    <Badge className={statusConfig.className} size="sm">
      {statusConfig.label}
    </Badge>
  ) : undefined;

  // meta row: type (สี) · วันที่ · location → subtitle slot
  const subtitle = (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
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
            <CalendarDays className="size-3 shrink-0" aria-hidden="true" />
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
    </span>
  );

  const actions = (
    <>
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
            variant="outline"
            size="sm"
            form={formId}
            disabled={isPending}
            onClick={submitWith("draft")}
          >
            <Save />
            {tc("save")}
          </Button>
          <Button
            type="submit"
            size="sm"
            form={formId}
            disabled={isPending}
            onClick={submitWith("completed")}
          >
            <Check />
            {tc("submit")}
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
    </>
  );

  // section คง colored left-border (บอก type) + bg card; DocFormHeader flush
  // เพราะ p-5 จัด padding ให้แล้ว
  return (
    <section
      className={cn(
        "bg-card relative rounded-lg border border-l-[3px] p-5",
        isStockIn ? "border-l-success" : "border-l-destructive",
      )}
    >
      <DocFormHeader
        leading={leading}
        title={docNo || typeLabel}
        subtitle={subtitle}
        backLabel={tc("goBack")}
        onBack={onBack}
        badges={badges}
        actions={actions}
        flush
      />
    </section>
  );
}
