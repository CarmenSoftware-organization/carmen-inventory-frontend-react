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
  // ไม่ใช้ common.commit เพราะภาษาไทยของ key นั้นคือ "ยืนยันรับสินค้า" (ของ GRN)
  const t = useTranslations("inventoryManagement.inventoryAdjustment");
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

  const leading = (
    <TypeIcon
      className="text-muted-foreground size-5 shrink-0"
      aria-hidden="true"
    />
  );

  const badges = statusConfig ? (
    <Badge className={statusConfig.className} size="sm">
      {statusConfig.label}
    </Badge>
  ) : undefined;

  // meta row: วันที่ · location → subtitle slot
  const subtitle = (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
      {watchedDate && (
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="size-3 shrink-0" aria-hidden="true" />
          {formatDate(watchedDate, dateFormat)}
        </span>
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
            {t("commit")}
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

  // ไม่มีกล่อง card ครอบ header แล้ว — วางบนพื้นหน้าตรง ๆ เหมือน price-list /
  // company-profile (flush ให้ title align กับ field ใน SettingSection ข้างล่าง)
  return (
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
  );
}
