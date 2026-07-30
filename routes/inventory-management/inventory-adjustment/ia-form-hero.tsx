import { type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { Pencil, Save, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DocFormHeader } from "@/components/share/doc-form-header";
import { PrintDocumentButton } from "@/components/print-document-button";
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
  readonly mode: FormMode;
  readonly isReadOnly: boolean;
  readonly isPending: boolean;
  readonly deleteIsPending: boolean;
  readonly formId: string;
  readonly onBack: () => void;
  readonly onCancel: () => void;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
}

export function IaFormHero({
  adjustmentType,
  inventoryAdjustment,
  form,
  typeLabel,
  mode,
  isReadOnly,
  isPending,
  deleteIsPending,
  formId,
  onBack,
  onCancel,
  onEdit,
  onDelete,
}: IaFormHeroProps) {
  const tc = useTranslations("common");
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const TypeIcon = IA_TYPE_ICON[adjustmentType];
  const docNo = inventoryAdjustment?.si_no ?? inventoryAdjustment?.so_no ?? "";
  const canDelete = !!inventoryAdjustment && !isReadOnly;
  const canPrint = isView && !!inventoryAdjustment?.id;

  /** Save = เซฟเป็นฉบับร่าง — ตั้ง doc_status ก่อน submit ฟอร์ม
   *  (Commit ไม่ผ่านทางนี้ ฟอร์มตั้ง completed ตอนผู้ใช้ยืนยันใน dialog) */
  const saveAsDraft = () => form.setValue("doc_status", "draft");

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

  const actions = (
    <>
      {canPrint && (
        <PrintDocumentButton
          documentType={adjustmentType === "stock-in" ? "SI" : "SO"}
          documentId={inventoryAdjustment!.id}
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
            onClick={saveAsDraft}
          >
            <Save />
            {tc("save")}
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
      backLabel={tc("goBack")}
      onBack={onBack}
      badges={badges}
      actions={actions}
      flush
    />
  );
}
