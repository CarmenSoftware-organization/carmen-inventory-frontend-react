
import { useEffect, useState } from "react";
import {
  useFieldArray,
  useForm,
  useWatch,
  type Resolver,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import { useTranslations } from "use-intl";
import { toast } from "sonner";

import { ChevronLeft, Pencil, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { useDiscardConfirm } from "@/hooks/use-discard-confirm";
import { useNavigationGuard } from "@/hooks/use-navigation-guard";
import { cn } from "@/lib/utils";
import {
  buildItemChanges,
  scrollToFirstInvalidField,
} from "@/lib/form-helpers";
import {
  useCreatePriceList,
  useDeletePriceList,
  useUpdatePriceList,
} from "@/hooks/use-price-list";
import { useProfile } from "@/hooks/use-profile";
import type { CreatePriceListDto, PriceList } from "@/types/price-list";
import type { FormMode } from "@/types/form";
import {
  createPriceListSchema,
  getDefaultValues,
  mapDetailToPayload,
  PRICE_LIST_DETAIL_EMPTY,
  type PriceListFormValues,
} from "./pl-form-schema";
import { PLGeneralCard } from "./pl-general-card";
import { PLProductsSection } from "./pl-products-section";

const FORM_ID = "pl-form";

interface PriceListFormProps {
  readonly priceList?: PriceList;
}

export function PriceListForm({ priceList }: PriceListFormProps) {
  const navigate = useNavigate();
  const t = useTranslations("vendorManagement.priceList");
  const tt = useTranslations("toast");
  const tv = useTranslations("validation");
  const tfl = useTranslations("field");
  const tc = useTranslations("common");
  const tform = useTranslations("form");
  const ts = useTranslations("status");

  const [mode, setMode] = useState<FormMode>(priceList ? "view" : "add");
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isAdd = mode === "add";

  const createPriceList = useCreatePriceList();
  const updatePriceList = useUpdatePriceList();
  const deletePriceList = useDeletePriceList();
  const [showDelete, setShowDelete] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const isPending = createPriceList.isPending || updatePriceList.isPending;
  const isDisabled = isView || isPending;

  const { defaultCurrencyId } = useProfile();
  const defaultValues = getDefaultValues(priceList, { defaultCurrencyId });

  const form = useForm<PriceListFormValues>({
    resolver: zodResolver(
      createPriceListSchema(tv, tfl),
    ) as Resolver<PriceListFormValues>,
    defaultValues,
  });

  const discard = useDiscardConfirm({
    isDirty: form.formState.isDirty,
    isPending,
  });
  const navGuard = useNavigationGuard(
    (isAdd || isEdit) && form.formState.isDirty,
  );

  useEffect(() => {
    if (isAdd && defaultCurrencyId && !form.getValues("currency_id")) {
      // reset baseline (ไม่ใช่ setValue) ให้ currency_id เป็น default — กัน isDirty
      // ค้างทำให้ back/navigate ติด discard ทั้งที่ยังไม่ได้กรอก (ดู pr-form.tsx)
      form.reset(
        { ...defaultValues, currency_id: defaultCurrencyId },
        { keepDirtyValues: true },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- defaultValues stable; run on isAdd/defaultCurrencyId
  }, [isAdd, defaultCurrencyId, form]);

  // After a successful edit-save the byId query is invalidated and refetches,
  // so the `priceList` prop returns with server-assigned ids for any newly
  // added pricelist_detail rows. Re-sync the form to it in view mode so a
  // second consecutive edit does not re-send those rows as new (which would
  // duplicate them server-side). PriceList has no version field, so key on a
  // signature of the detail ids — it changes exactly when rows are added or
  // removed (the cases where the stale-id bug bites). NOT keyed on `mode`, so
  // it cannot fire on the edit→view transition before the refetch lands.
  const detailIdsKey = (priceList?.pricelist_detail ?? [])
    .map((d) => d.id)
    .join(",");
  useEffect(() => {
    if (mode === "view" && priceList) {
      form.reset(getDefaultValues(priceList, { defaultCurrencyId }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form/getDefaultValues stable; mode/defaultCurrencyId read intentionally without retriggering
  }, [detailIdsKey, priceList?.id]);

  const {
    fields: detailFields,
    prepend: prependDetail,
    remove: removeDetail,
  } = useFieldArray({ control: form.control, name: "pricelist_detail" });

  const watchedName = useWatch({ control: form.control, name: "name" });
  const watchedFrom = useWatch({
    control: form.control,
    name: "effective_from_date",
  });
  const watchedTo = useWatch({
    control: form.control,
    name: "effective_to_date",
  });
  const watchedStatus = useWatch({ control: form.control, name: "status" });

  const handleAddDetail = () => prependDetail({ ...PRICE_LIST_DETAIL_EMPTY });

  const handleSubmit = (values: PriceListFormValues) => {
    if (isEdit && priceList) {
      submitUpdate({
        values,
        priceList,
        defaultValues,
        form,
        mutate: updatePriceList.mutate,
        onSuccess: () => {
          toast.success(tt("updateSuccess", { entity: t("entity") }));
          form.reset(values);
          setMode("view");
        },
      });
    } else if (isAdd) {
      submitCreate({
        values,
        mutate: createPriceList.mutate,
        onSuccess: (id) => {
          toast.success(tt("createSuccess", { entity: t("entity") }));
          navigate(`/vendor-management/price-list/${id}`, { replace: true });
          setMode("view");
        },
      });
    }
  };

  const handleCancel = () => {
    discard.confirm(() => {
      if (isEdit && priceList) {
        form.reset(defaultValues);
        setMode("view");
      } else {
        navigate("/vendor-management/price-list");
      }
    });
  };

  const handleBack = () => {
    if (isEdit || isAdd) {
      discard.confirm(() => navigate(-1));
    } else {
      navigate(-1);
    }
  };

  const handleConfirmDelete = () => {
    if (!priceList) return;
    deletePriceList.mutate(priceList.id, {
      onSuccess: () => {
        toast.success(tt("deleteSuccess", { entity: t("entity") }));
        navigate("/vendor-management/price-list");
      },
    });
  };

  const plNo = priceList?.no ?? null;
  const productsHeaderLabels = useProductsHeaderLabels(t);
  const removeItemLabel = t("detail.removeItem");
  const tsStatus = ts as (key: "draft" | "active" | "inactive") => string;
  const submitLabel = getSubmitLabel(isPending, isAdd, tc, tform);

  return (
    <div className="mx-auto max-w-4xl p-[max(1rem,env(safe-area-inset-bottom))]">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={tc("goBack")}
            onClick={handleBack}
          >
            <ChevronLeft />
          </Button>
          <h1
            className={cn(
              "truncate text-lg font-semibold tracking-tight",
              watchedName
                ? "text-foreground"
                : "text-muted-foreground italic",
            )}
          >
            {watchedName || t("namePlaceholder")}
          </h1>
          {plNo && (
            <span className="text-muted-foreground shrink-0 text-sm">
              · {plNo}
            </span>
          )}
          <Badge variant="secondary" size="sm">
            {tsStatus(watchedStatus)}
          </Badge>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isView ? (
            <Button size="sm" onClick={() => setMode("edit")}>
              <Pencil />
              {tc("edit")}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isPending}
              >
                <X />
                {tc("cancel")}
              </Button>
              <Button
                type="submit"
                size="sm"
                form={FORM_ID}
                disabled={isPending}
              >
                <Save />
                {submitLabel}
              </Button>
              {isEdit && priceList && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDelete(true)}
                  disabled={deletePriceList.isPending || isPending}
                >
                  <Trash2 />
                  {tc("delete")}
                </Button>
              )}
            </>
          )}
        </div>
      </header>

      <form
        id={FORM_ID}
        onSubmit={form.handleSubmit(handleSubmit, () =>
          scrollToFirstInvalidField(),
        )}
      >
        <PLGeneralCard
          form={form}
          priceList={priceList}
          isView={isView}
          isDisabled={isDisabled}
          watchedFrom={watchedFrom}
          watchedTo={watchedTo}
          tfl={tfl}
          t={t}
          ts={tsStatus}
        />
        <PLProductsSection
          form={form}
          detailFields={detailFields}
          priceList={priceList}
          isView={isView}
          isDisabled={isDisabled}
          onAdd={handleAddDetail}
          onRemove={setDeleteIndex}
          tfl={tfl}
          removeLabel={removeItemLabel}
          headerLabels={productsHeaderLabels}
        />
      </form>

      <DiscardDialog {...discard.dialogProps} variant="warning" />

      <DiscardDialog
        open={navGuard.isOpen}
        onOpenChange={(o) => {
          if (!o) navGuard.cancel();
        }}
        onConfirm={navGuard.confirm}
        onCancel={navGuard.cancel}
        variant="warning"
      />

      {priceList && (
        <DeleteDialog
          open={showDelete}
          onOpenChange={(open) =>
            !open && !deletePriceList.isPending && setShowDelete(false)
          }
          title={t("deleteTitle")}
          description={t("deleteConfirm", { name: priceList.name })}
          isPending={deletePriceList.isPending}
          onConfirm={handleConfirmDelete}
        />
      )}

      <DeleteDialog
        open={deleteIndex !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteIndex(null);
        }}
        title={t("detail.removeItemTitle")}
        description={t("detail.removeItemConfirm")}
        onConfirm={() => {
          if (deleteIndex === null) return;
          removeDetail(deleteIndex);
          setDeleteIndex(null);
        }}
      />
    </div>
  );
}

/* ── label hooks ─────────────────────────────────────────────── */

function getSubmitLabel(
  isPending: boolean,
  isAdd: boolean,
  tc: (key: string) => string,
  tform: (key: string) => string,
): string {
  if (isPending) return isAdd ? tform("creating") : tform("saving");
  return isAdd ? tc("create") : tc("save");
}

function useProductsHeaderLabels(t: ReturnType<typeof useTranslations>) {
  return {
    title: t("detail.title"),
    noItems: t("detail.noItems"),
    noItemsDesc: t("detail.noItemsDesc"),
    addLabel: t("detail.addDetail"),
    itemSingular: t("itemSingular"),
    itemPlural: t("itemPlural"),
  };
}

/* ── submit helpers ──────────────────────────────────────────── */

function submitUpdate({
  values,
  priceList,
  defaultValues,
  form,
  mutate,
  onSuccess,
}: {
  values: PriceListFormValues;
  priceList: PriceList;
  defaultValues: PriceListFormValues;
  form: ReturnType<typeof useForm<PriceListFormValues>>;
  mutate: ReturnType<typeof useUpdatePriceList>["mutate"];
  onSuccess: () => void;
}) {
  const pricelist_detail = buildItemChanges(
    values.pricelist_detail,
    defaultValues.pricelist_detail,
    // RHF 7.78 type drift
    form.formState.dirtyFields.pricelist_detail as Record<string, unknown>[] | undefined,
    (item, _i) => {
      const actualIndex = values.pricelist_detail.indexOf(item);
      return mapDetailToPayload(item, actualIndex >= 0 ? actualIndex : _i);
    },
  );

  mutate(
    {
      id: priceList.id,
      doc_version: priceList.doc_version,
      ...buildBasePayload(values),
      pricelist_detail,
    },
    { onSuccess },
  );
}

function submitCreate({
  values,
  mutate,
  onSuccess,
}: {
  values: PriceListFormValues;
  mutate: ReturnType<typeof useCreatePriceList>["mutate"];
  onSuccess: (id: string) => void;
}) {
  const pricelist_detail: CreatePriceListDto["pricelist_detail"] = {};
  if (values.pricelist_detail.length > 0) {
    pricelist_detail.add = values.pricelist_detail.map((item, i) =>
      mapDetailToPayload(item, i),
    );
  }

  mutate(
    { ...buildBasePayload(values), pricelist_detail },
    {
      onSuccess: (data) => {
        const created = data as { data: { id: string } };
        onSuccess(created.data.id);
      },
    },
  );
}

function buildBasePayload(values: PriceListFormValues) {
  return {
    vendor_id: values.vendor_id,
    name: values.name,
    description: values.description,
    status: values.status,
    currency_id: values.currency_id,
    effective_from_date: new Date(values.effective_from_date).toISOString(),
    effective_to_date: new Date(values.effective_to_date).toISOString(),
    note: values.note,
  };
}
