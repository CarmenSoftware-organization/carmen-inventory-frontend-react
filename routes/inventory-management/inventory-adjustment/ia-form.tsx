import { useState, useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, useNavigate } from "react-router";
import { useFormatter, useTranslations } from "use-intl";
import { toast } from "sonner";
import {
  useCreateInventoryAdjustment,
  useUpdateInventoryAdjustment,
  useDeleteInventoryAdjustment,
  useVoidInventoryAdjustment,
} from "@/hooks/use-inventory-adjustment";
import { useAdjustmentType } from "@/hooks/use-adjustment-type";
import { useProfile } from "@/hooks/use-profile";
import { ADJUSTMENT_TYPE } from "@/types/adjustment-type";
import {
  INVENTORY_ADJUSTMENT_BASE_PATH,
  type InventoryAdjustment,
  type InventoryAdjustmentType,
} from "@/types/inventory-adjustment";
import type { FormMode } from "@/types/form";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { useDiscardConfirm } from "@/hooks/use-discard-confirm";
import { useErrorToast } from "@/hooks/use-error-toast";
import { ApiError, ERROR_CODES } from "@/lib/api-error";
import { VoidDialog } from "@/components/share/void-dialog";
import {
  buildItemChanges,
  scrollToFirstInvalidField,
} from "@/lib/form-helpers";
import {
  createAdjSchema,
  type AdjFormValues,
  getDefaultValues,
  mapItemToPayload,
  resolveDefaultDate,
} from "./ia-form-schema";
import { AdjItemFields } from "./ia-item-fields";
import { DocumentInfo } from "./ia-doc-info";
import { AdjSummaryFooter } from "./ia-summary";
import { IaFormHero } from "./ia-form-hero";

interface InventoryAdjustmentFormProps {
  readonly adjustmentType: InventoryAdjustmentType;
  readonly inventoryAdjustment?: InventoryAdjustment;
}

export function InventoryAdjustmentForm({
  adjustmentType,
  inventoryAdjustment,
}: InventoryAdjustmentFormProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<FormMode>(
    inventoryAdjustment ? "view" : "add",
  );
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isAdd = mode === "add";

  const createAdj = useCreateInventoryAdjustment();
  const updateAdj = useUpdateInventoryAdjustment();
  const deleteAdj = useDeleteInventoryAdjustment();
  const voidAdj = useVoidInventoryAdjustment();
  const [showDelete, setShowDelete] = useState(false);
  const [showVoid, setShowVoid] = useState(false);
  const isPending = createAdj.isPending || updateAdj.isPending;
  const isDisabled = isView || isPending;

  const t = useTranslations("inventoryManagement.inventoryAdjustment");
  const tc = useTranslations("common");
  const tfl = useTranslations("field");
  const tt = useTranslations("toast");
  const tv = useTranslations("validation");
  const formatter = useFormatter();

  const { currentPeriod, dateFormat } = useProfile();
  const adjTypeFilter =
    adjustmentType === "stock-in"
      ? ADJUSTMENT_TYPE.STOCK_IN
      : ADJUSTMENT_TYPE.STOCK_OUT;
  const { data: adjTypeData } = useAdjustmentType({ perpage: -1 });
  const adjTypes =
    adjTypeData?.data?.filter(
      (at) => at.is_active && at.type === adjTypeFilter,
    ) ?? [];

  const defaultValues = getDefaultValues(
    inventoryAdjustment,
    currentPeriod?.end_at,
  );

  const adjSchema = createAdjSchema(
    tv,
    tfl,
    currentPeriod?.start_at,
    currentPeriod?.end_at,
  );
  const form = useForm<AdjFormValues>({
    resolver: zodResolver(adjSchema) as Resolver<AdjFormValues>,
    defaultValues,
  });

  const discard = useDiscardConfirm({
    isDirty: form.formState.isDirty,
    isPending: isPending || deleteAdj.isPending || voidAdj.isPending,
  });

  // currentPeriod loads async after mount — sync the default date once it arrives.
  // reset baseline (ไม่ใช่ setValue) ให้ date เป็น default — กัน isDirty ค้างทำให้
  // back ติด discard ทั้งที่ยังไม่ได้แก้ (ดู pr-form.tsx). keepDirtyValues คงค่าที่แก้
  useEffect(() => {
    if (inventoryAdjustment || !currentPeriod?.end_at) return;
    if (form.formState.dirtyFields.date) return;
    form.reset(
      { ...defaultValues, date: resolveDefaultDate(currentPeriod.end_at) },
      { keepDirtyValues: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPeriod?.end_at, inventoryAdjustment]);

  const typeLabel =
    adjustmentType === "stock-in" ? tfl("stockIn") : tfl("stockOut");
  const isReadOnly =
    inventoryAdjustment?.doc_status === "voided" ||
    inventoryAdjustment?.doc_status === "completed";

  const errorToast = useErrorToast();
  const handleMutationError = (err: unknown) => {
    // backend คืน business error (เช่น "Insufficient stock. Requested: 3,
    // Available: 1") เป็น HTTP 500 → INTERNAL_ERROR ซึ่ง errorToast จะกลบเป็น
    // ข้อความ generic — กรณีนี้แสดง message จาก server ตรง ๆ
    if (err instanceof ApiError && err.code === ERROR_CODES.INTERNAL_ERROR) {
      toast.error(err.message);
      return;
    }
    errorToast(err);
  };

  const handleMutationSuccess =
    (msgKey: "createSuccess" | "updateSuccess") => () => {
      toast.success(tt(msgKey, { entity: t("entity") }));
      navigate(INVENTORY_ADJUSTMENT_BASE_PATH);
    };

  const buildBasePayload = (values: AdjFormValues) => {
    const dateKey = adjustmentType === "stock-in" ? "si_date" : "so_date";
    return {
      description: values.description,
      doc_status: values.doc_status,
      adjustment_type_id: values.adjustment_type_id ?? "",
      [dateKey]: values.date,
      location_id: values.location_id,
    };
  };

  const detailsKey =
    adjustmentType === "stock-in" ? "stock_in_detail" : "stock_out_detail";

  const submitUpdate = (values: AdjFormValues) => {
    if (!inventoryAdjustment) return;
    const details = buildItemChanges(
      values.items,
      defaultValues.items,
      mapItemToPayload,
    );
    updateAdj.mutate(
      {
        id: inventoryAdjustment.id,
        type: adjustmentType,
        doc_version: inventoryAdjustment.doc_version,
        ...buildBasePayload(values),
        [detailsKey]: details,
      },
      {
        onSuccess: handleMutationSuccess("updateSuccess"),
        onError: handleMutationError,
      },
    );
  };

  const submitCreate = (values: AdjFormValues) => {
    createAdj.mutate(
      {
        type: adjustmentType,
        ...buildBasePayload(values),
        [detailsKey]: { add: values.items.map(mapItemToPayload) },
      },
      {
        onSuccess: handleMutationSuccess("createSuccess"),
        onError: handleMutationError,
      },
    );
  };

  const onSubmit = (values: AdjFormValues) => {
    if (isEdit && inventoryAdjustment) return submitUpdate(values);
    if (isAdd) return submitCreate(values);
  };

  const handleCancel = () => {
    discard.confirm(() => {
      if (isEdit && inventoryAdjustment) {
        form.reset(defaultValues);
        setMode("view");
        return;
      }
      navigate(INVENTORY_ADJUSTMENT_BASE_PATH);
    });
  };

  const goBack = () => {
    if (location.key !== "default") {
      navigate(-1);
    } else {
      navigate(INVENTORY_ADJUSTMENT_BASE_PATH);
    }
  };

  const handleBack = () => {
    if (isEdit || isAdd) {
      discard.confirm(goBack);
    } else {
      goBack();
    }
  };

  // shell เดียวกับ price-list / company-profile / config forms: กล่องกลางจอ
  // max-w-4xl, header วางบนพื้นตรง ๆ (ไม่มี card), เนื้อแบ่งเป็น SettingSection
  return (
    // flex min-h-full flex-col = ให้แถบสรุปที่มี mt-auto ถูกดันไปติดก้นจอจริง
    // แม้เนื้อหาจะสั้นกว่าหน้าจอ (โครงเดียวกับ po-form)
    <div className="mx-auto flex min-h-full max-w-4xl flex-col p-[max(1rem,env(safe-area-inset-bottom))]">
      <IaFormHero
        adjustmentType={adjustmentType}
        inventoryAdjustment={inventoryAdjustment}
        form={form}
        typeLabel={typeLabel}
        mode={mode}
        isReadOnly={isReadOnly}
        isPending={isPending}
        deleteIsPending={deleteAdj.isPending}
        voidIsPending={voidAdj.isPending}
        formId="inventory-adjustment-form"
        onBack={handleBack}
        onCancel={handleCancel}
        onEdit={() => setMode("edit")}
        onDelete={() => setShowDelete(true)}
        onVoid={() => setShowVoid(true)}
      />

      <form
        id="inventory-adjustment-form"
        onSubmit={form.handleSubmit(onSubmit, () =>
          scrollToFirstInvalidField(),
        )}
        // คอลัมน์เดียว — ยอดรวมย้ายลง footer bar แล้ว ตารางรายการจึงได้ 20rem
        // ที่ sidebar เคยกินคืนไป (DESIGN.md: an ERP table wants the pixels)
        className="mt-6 min-w-0"
      >
        <DocumentInfo
          form={form}
          isView={isView}
          isDisabled={isDisabled}
          adjTypes={adjTypes}
          inventoryAdjustment={inventoryAdjustment}
          currentPeriodStart={currentPeriod?.start_at}
          currentPeriodEnd={currentPeriod?.end_at}
          dateFormat={dateFormat}
          t={t}
          tc={tc}
          tfl={tfl}
        />

        {/* ── Line items ── */}
        <AdjItemFields
          form={form}
          disabled={isDisabled}
          adjustmentType={adjustmentType}
        />
      </form>

      {/* footer อยู่นอก form เป็นพี่น้องกัน (โครงเดียวกับ po-form) */}
      <AdjSummaryFooter form={form} formatter={formatter} t={t} />

      <DiscardDialog {...discard.dialogProps} variant="warning" />

      {inventoryAdjustment && (
        <DeleteDialog
          open={showDelete}
          onOpenChange={(open) =>
            !open && !deleteAdj.isPending && setShowDelete(false)
          }
          title={t("deleteTitle")}
          description={t("deleteConfirm", {
            documentNo:
              inventoryAdjustment.si_no ?? inventoryAdjustment.so_no ?? "",
          })}
          isPending={deleteAdj.isPending}
          onConfirm={() => {
            deleteAdj.mutate(
              { id: inventoryAdjustment.id, type: adjustmentType },
              {
                onSuccess: () => {
                  toast.success(tt("deleteSuccess", { entity: t("entity") }));
                  navigate(INVENTORY_ADJUSTMENT_BASE_PATH);
                },
                onError: errorToast,
              },
            );
          }}
        />
      )}

      {inventoryAdjustment && (
        <VoidDialog
          open={showVoid}
          onOpenChange={(open) =>
            !open && !voidAdj.isPending && setShowVoid(false)
          }
          title={t("voidTitle")}
          description={t("voidConfirm", {
            documentNo:
              inventoryAdjustment.si_no ?? inventoryAdjustment.so_no ?? "",
          })}
          isPending={voidAdj.isPending}
          onConfirm={(voidReason) => {
            voidAdj.mutate(
              {
                id: inventoryAdjustment.id,
                type: adjustmentType,
                void_reason: voidReason,
                doc_version: inventoryAdjustment.doc_version,
              },
              {
                onSuccess: () => {
                  toast.success(tt("voidSuccess", { entity: t("entity") }));
                  navigate(INVENTORY_ADJUSTMENT_BASE_PATH);
                },
                onError: errorToast,
              },
            );
          }}
        />
      )}
    </div>
  );
}
