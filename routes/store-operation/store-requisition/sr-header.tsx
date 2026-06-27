
import { useTranslations } from "use-intl";
import { MessageCircle, Pencil, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PrintDocumentButton } from "@/components/print-document-button";
import {
  DocFormHeader,
  DocumentRibbon,
  RibbonCell,
} from "@/components/share/doc-form-header";
import { formatDate } from "@/lib/date-utils";
import {
  SR_STATUS_CONFIG,
  SR_TYPE_VARIANT,
} from "@/constant/store-requisition";
import { getModeLabels, type FormMode } from "@/types/form";
import { STAGE_ROLE } from "@/types/stage-role";
import type {
  StoreRequisition,
  StoreRequisitionType,
} from "@/types/store-requisition";

interface SrHeaderProps {
  readonly storeRequisition?: StoreRequisition;
  readonly srType?: StoreRequisitionType;
  readonly mode: FormMode;
  readonly isPending: boolean;
  readonly hasDepartment: boolean;
  readonly isDeletePending: boolean;
  /** ribbon — document info (date/requester/department) */
  readonly srDate?: string;
  readonly dateFormat: string;
  readonly requesterName: string;
  readonly departmentName: string;
  readonly departmentCode: string;
  readonly isLoading?: boolean;
  readonly onBack: () => void;
  readonly onEdit: () => void;
  readonly onCancel: () => void;
  readonly onDelete: () => void;
  readonly onComment?: () => void;
}

/**
 * Header ของฟอร์ม Store Requisition — ใช้ `DocFormHeader` กลางร่วมกับ
 * PO/PR/GRN/CN พร้อม ribbon แสดง document info (sr_date / requester /
 * department)
 */
export function SrHeader({
  storeRequisition,
  srType,
  mode,
  isPending,
  hasDepartment,
  isDeletePending,
  srDate,
  dateFormat,
  requesterName,
  departmentName,
  departmentCode,
  isLoading,
  onBack,
  onEdit,
  onCancel,
  onDelete,
  onComment,
}: SrHeaderProps) {
  const t = useTranslations("storeOperation.storeRequisition");
  const tc = useTranslations("common");
  const ts = useTranslations("status");
  const tfl = useTranslations("field");

  const isView = mode === "view";
  const isAdd = mode === "add";
  const isEdit = mode === "edit";
  const docStatus = storeRequisition?.doc_status;

  const role = storeRequisition?.role ?? STAGE_ROLE.CREATE;
  const canEdit =
    role === STAGE_ROLE.CREATE ||
    role === STAGE_ROLE.APPROVE ||
    role === STAGE_ROLE.ISSUE;

  const badges = (
    <>
      {docStatus && (
        <Badge className={SR_STATUS_CONFIG[docStatus]?.className}>
          {ts(docStatus).toUpperCase()}
        </Badge>
      )}
      {srType && (
        <Badge
          variant={SR_TYPE_VARIANT[srType]}
          size="sm"
          className="uppercase"
        >
          {srType}
        </Badge>
      )}
      {isAdd && (
        <Badge variant="secondary" size="sm">
          {t("breadcrumbNew")}
        </Badge>
      )}
    </>
  );

  const actions = (
    <>
      {isView ? (
        canEdit && (
          <Button type="button" size="sm" variant="outline" onClick={onEdit}>
            <Pencil aria-hidden="true" />
            {tc("edit")}
          </Button>
        )
      ) : (
        <>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
          >
            <X aria-hidden="true" />
            {tc("cancel")}
          </Button>
          <Button
            type="submit"
            form="store-requisition-form"
            size="sm"
            disabled={isPending || !hasDepartment}
            title={hasDepartment ? undefined : t("noDepartment")}
          >
            <Save aria-hidden="true" />
            {isPending ? getModeLabels(mode, t("entity")).pending : tc("save")}
          </Button>
          {isEdit && storeRequisition && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={onDelete}
              disabled={isPending || isDeletePending}
            >
              <Trash2 aria-hidden="true" />
              {tc("delete")}
            </Button>
          )}
        </>
      )}
      {storeRequisition && onComment && (
        <Button type="button" size="sm" variant="info" onClick={onComment}>
          <MessageCircle aria-hidden="true" />
          {tc("comment")}
        </Button>
      )}
      {isView && storeRequisition?.id && (
        <PrintDocumentButton
          documentType="SR"
          documentId={storeRequisition.id}
          filters={
            storeRequisition.sr_no
              ? { DocumentNo: storeRequisition.sr_no }
              : undefined
          }
        />
      )}
    </>
  );

  const departmentValue = (() => {
    if (isLoading) return "—";
    if (!departmentName) {
      return (
        <span className="text-destructive font-semibold" role="alert">
          {t("noDepartment")}
        </span>
      );
    }
    return (
      <span>
        {departmentName}
        {departmentCode && (
          <span className="text-muted-foreground ml-2 text-xs font-normal">
            {departmentCode}
          </span>
        )}
      </span>
    );
  })();

  const ribbon = (
    <DocumentRibbon>
      <RibbonCell label={tfl("srDate")}>
        {srDate ? formatDate(srDate, dateFormat) : "—"}
      </RibbonCell>
      <RibbonCell label={tfl("requester")}>
        {isLoading ? "—" : requesterName || "—"}
      </RibbonCell>
      <RibbonCell label={tfl("department")}>{departmentValue}</RibbonCell>
    </DocumentRibbon>
  );

  const subtitle =
    storeRequisition?.doc_version != null
      ? `${tfl("version")} ${storeRequisition.doc_version}`
      : undefined;

  return (
    <DocFormHeader
      title={storeRequisition?.sr_no ?? t("title")}
      subtitle={subtitle}
      backLabel={tc("goBack")}
      onBack={onBack}
      badges={badges}
      actions={actions}
      infoLabel={t("documentInfo")}
      ribbon={ribbon}
    />
  );
}
