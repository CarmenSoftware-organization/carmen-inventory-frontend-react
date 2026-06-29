
import { useState, useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import { useFormatter, useTranslations } from "use-intl";
import { Card, CardContent } from "@/components/ui/card";
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
import { VoidDialog } from "@/components/share/void-dialog";
import { AnimationStyles, Reveal } from "@/components/share/reveal";
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
import { AdjSummarySidebar } from "./ia-summary";
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
  useEffect(() => {
    if (inventoryAdjustment || !currentPeriod?.end_at) return;
    if (form.formState.dirtyFields.date) return;
    form.setValue("date", resolveDefaultDate(currentPeriod.end_at));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPeriod?.end_at, inventoryAdjustment]);

  const typeLabel =
    adjustmentType === "stock-in" ? tfl("stockIn") : tfl("stockOut");
  const isReadOnly =
    inventoryAdjustment?.doc_status === "voided" ||
    inventoryAdjustment?.doc_status === "completed";

  const errorToast = useErrorToast();
  const handleMutationError = (err: unknown) => errorToast(err);

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
      // RHF 7.78 type drift
      form.formState.dirtyFields.items as Record<string, unknown>[] | undefined,
      mapItemToPayload,
    );
    updateAdj.mutate(
      {
        id: inventoryAdjustment.id,
        type: adjustmentType,
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

  const handleBack = () => {
    if (isEdit || isAdd) {
      discard.confirm(() => navigate(INVENTORY_ADJUSTMENT_BASE_PATH));
    } else {
      navigate(INVENTORY_ADJUSTMENT_BASE_PATH);
    }
  };

  return (
    <div className="space-y-4">
      <AnimationStyles />

      <Reveal>
        <IaFormHero
          adjustmentType={adjustmentType}
          inventoryAdjustment={inventoryAdjustment}
          form={form}
          typeLabel={typeLabel}
          dateFormat={dateFormat}
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
      </Reveal>

      <form
        id="inventory-adjustment-form"
        onSubmit={form.handleSubmit(onSubmit, () =>
          scrollToFirstInvalidField(),
        )}
        className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_20rem]"
      >
        <div className="min-w-0 space-y-4">
          <Reveal delay={80}>
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
          </Reveal>

          {/* ── Line items ── */}
          <Reveal delay={140}>
            <Card className="border-border/60 bg-card gap-0 overflow-hidden py-0">
              <CardContent className="px-5 py-4">
                <AdjItemFields
                  form={form}
                  disabled={isDisabled}
                  adjustmentType={adjustmentType}
                />
              </CardContent>
            </Card>
          </Reveal>
        </div>

        <Reveal delay={200}>
          <AdjSummarySidebar
            form={form}
            adjustmentType={adjustmentType}
            inventoryAdjustment={inventoryAdjustment}
            adjTypeName={
              adjTypes.find(
                (at) => at.id === form.getValues("adjustment_type_id"),
              )?.name
            }
            formatter={formatter}
            dateFormat={dateFormat}
            t={t}
            tfl={tfl}
          />
        </Reveal>
      </form>

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
