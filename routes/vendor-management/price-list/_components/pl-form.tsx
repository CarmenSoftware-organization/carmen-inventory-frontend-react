
import { useEffect, useState } from "react";
import {
  useFieldArray,
  useForm,
  useWatch,
  type Resolver,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@/lib/compat/navigation";
import { useTranslations } from "use-intl";
import { toast } from "sonner";

import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { useDiscardConfirm } from "@/hooks/use-discard-confirm";
import { AnimationStyles, Reveal } from "@/components/share/reveal";
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
import { PL_STATUS_CONFIG } from "@/constant/price-list";
import type { CreatePriceListDto, PriceList } from "@/types/price-list";
import type { FormMode } from "@/types/form";
import {
  createPriceListSchema,
  getDefaultValues,
  mapDetailToPayload,
  PRICE_LIST_DETAIL_EMPTY,
  type PriceListFormValues,
} from "./pl-form-schema";
import { PLToolbar } from "./pl-toolbar";
import { PLHero } from "./pl-hero";
import { PLGeneralCard } from "./pl-general-card";
import { PLProductsSection } from "./pl-products-section";
import { PLSidebar } from "./pl-sidebar";

const FORM_ID = "pl-form";

interface PriceListFormProps {
  readonly priceList?: PriceList;
}

export function PriceListForm({ priceList }: PriceListFormProps) {
  const router = useRouter();
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

  useEffect(() => {
    if (isAdd && defaultCurrencyId && !form.getValues("currency_id")) {
      form.setValue("currency_id", defaultCurrencyId);
    }
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

  const watchedDetails = useWatch({
    control: form.control,
    name: "pricelist_detail",
  });
  const watchedFrom = useWatch({
    control: form.control,
    name: "effective_from_date",
  });
  const watchedTo = useWatch({
    control: form.control,
    name: "effective_to_date",
  });
  const watchedStatus = useWatch({ control: form.control, name: "status" });

  const stats = (() => {
    // Derive price (incl. tax) จาก price_without_tax + tax_rate
    // หลีกเลี่ยงการพึ่ง d.price ที่ไม่ sync จาก cell แล้ว (กัน infinite loop)
    const prices = (watchedDetails ?? []).map((d) => {
      const noTax = Number(d.price_without_tax) || 0;
      const rate = Number(d.tax_rate) || 0;
      return noTax + (noTax * rate) / 100;
    });
    const n = prices.length;
    const leadAvg =
      n > 0
        ? (watchedDetails ?? []).reduce(
            (a, d) => a + (Number(d.lead_time_days) || 0),
            0,
          ) / n
        : 0;
    return {
      count: n,
      avg: n > 0 ? prices.reduce((a, b) => a + b, 0) / n : 0,
      min: n > 0 ? Math.min(...prices) : 0,
      max: n > 0 ? Math.max(...prices) : 0,
      avgLead: leadAvg,
    };
  })();

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
        onError: (err) => toast.error(err.message),
      });
    } else if (isAdd) {
      submitCreate({
        values,
        mutate: createPriceList.mutate,
        onSuccess: (id) => {
          toast.success(tt("createSuccess", { entity: t("entity") }));
          router.replace(`/vendor-management/price-list/${id}`);
          setMode("view");
        },
        onError: (err) => toast.error(err.message),
      });
    }
  };

  const handleCancel = () => {
    discard.confirm(() => {
      if (isEdit && priceList) {
        form.reset(defaultValues);
        setMode("view");
      } else {
        router.push("/vendor-management/price-list");
      }
    });
  };

  const handleBack = () => {
    if (isEdit || isAdd) {
      discard.confirm(() => router.back());
    } else {
      router.back();
    }
  };

  const handleConfirmDelete = () => {
    if (!priceList) return;
    deletePriceList.mutate(priceList.id, {
      onSuccess: () => {
        toast.success(tt("deleteSuccess", { entity: t("entity") }));
        router.push("/vendor-management/price-list");
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const plNo = priceList?.no ?? null;
  const statusConfig =
    PL_STATUS_CONFIG[watchedStatus] ?? PL_STATUS_CONFIG.draft;

  const heroLabels = useHeroLabels(t);
  const productsHeaderLabels = useProductsHeaderLabels(t);
  const sidebarLabels = useSidebarLabels(t, tfl);
  const toolbarLabels = useToolbarLabels(tc, tform);
  const removeItemLabel = t("detail.removeItem");

  return (
    <div className="relative isolate -mx-3 -my-3">
      <AnimationStyles />
      <form
        id={FORM_ID}
        onSubmit={form.handleSubmit(handleSubmit, () =>
          scrollToFirstInvalidField(),
        )}
        className="relative px-4 pt-4 pb-8 lg:p-4"
      >
        <section className="mb-5">
          <Reveal>
            <PLToolbar
              mode={mode}
              plNo={plNo}
              statusConfig={statusConfig}
              isPending={isPending}
              isDeleting={deletePriceList.isPending}
              onBack={handleBack}
              onEdit={() => setMode("edit")}
              onCancel={handleCancel}
              onDelete={() => setShowDelete(true)}
              formId={FORM_ID}
              labels={toolbarLabels}
            />
          </Reveal>

          <Reveal delay={80}>
            <PLHero
              form={form}
              priceList={priceList}
              isDisabled={isDisabled}
              watchedFrom={watchedFrom}
              watchedTo={watchedTo}
              labels={heroLabels}
            />
          </Reveal>
        </section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_22rem]">
          <Reveal delay={160}>
            <PLGeneralCard
              form={form}
              priceList={priceList}
              isView={isView}
              isDisabled={isDisabled}
              watchedFrom={watchedFrom}
              watchedTo={watchedTo}
              tfl={tfl}
            />
          </Reveal>

          <Reveal delay={200}>
            <PLSidebar
              form={form}
              stats={stats}
              watchedFrom={watchedFrom}
              watchedTo={watchedTo}
              isView={isView}
              isDisabled={isDisabled}
              tfl={tfl}
              ts={ts as (key: "draft" | "active" | "inactive") => string}
              labels={sidebarLabels}
            />
          </Reveal>
        </div>
        <Reveal delay={220}>
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
        </Reveal>
      </form>

      <DiscardDialog {...discard.dialogProps} variant="warning" />

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

function useHeroLabels(t: ReturnType<typeof useTranslations>) {
  return {
    namePlaceholder: t("namePlaceholder"),
    nameLabel: t("nameLabel"),
    tapToEdit: t("tapToEdit"),
    pressEnterToSave: t("pressEnterToSave"),
    clickToRename: t("clickToRename"),
    requiredField: t("requiredField"),
    descriptorEmpty: t("descriptorEmpty"),
    descriptorFilled: (vars: {
      vendor: string;
      days: number;
      date: string;
    }) => t("descriptorFilled", vars),
  };
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

function useSidebarLabels(
  t: ReturnType<typeof useTranslations>,
  tfl: ReturnType<typeof useTranslations>,
) {
  return {
    summary: t("summary"),
    duration: t("duration"),
    priceRange: t("priceRange"),
    daysSuffix: (count: number) => t("daysSuffix", { count }),
    detailTitle: t("detail.title"),
    avgUnitPrice: t("avgUnitPrice"),
    selectStatus: tfl("selectStatus"),
  };
}

function useToolbarLabels(
  tc: ReturnType<typeof useTranslations>,
  tform: ReturnType<typeof useTranslations>,
) {
  return {
    goBack: tc("goBack"),
    edit: tc("edit"),
    cancel: tc("cancel"),
    save: tc("save"),
    create: tc("create"),
    saving: tform("saving"),
    creating: tform("creating"),
    delete: tc("delete"),
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
  onError,
}: {
  values: PriceListFormValues;
  priceList: PriceList;
  defaultValues: PriceListFormValues;
  form: ReturnType<typeof useForm<PriceListFormValues>>;
  mutate: ReturnType<typeof useUpdatePriceList>["mutate"];
  onSuccess: () => void;
  onError: (err: Error) => void;
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
      ...buildBasePayload(values),
      pricelist_detail,
    },
    { onSuccess, onError },
  );
}

function submitCreate({
  values,
  mutate,
  onSuccess,
  onError,
}: {
  values: PriceListFormValues;
  mutate: ReturnType<typeof useCreatePriceList>["mutate"];
  onSuccess: (id: string) => void;
  onError: (err: Error) => void;
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
      onError,
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
