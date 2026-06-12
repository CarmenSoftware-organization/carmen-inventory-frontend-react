
import { useState } from "react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@/lib/compat/navigation";
import { useLocale, useTranslations } from "use-intl";
import { toast } from "sonner";
import {
  Building2,
  Calendar as CalendarIcon,
  ChevronLeft,
  ClipboardList,
  Mail,
  Pencil,
  Save,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { PrintDocumentButton } from "@/components/print-document-button";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { useDiscardConfirm } from "@/hooks/use-discard-confirm";
import { Field, FieldDatePicker, FieldLabel } from "@/components/ui/field";
import { LookupPrt } from "@/components/lookup/lookup-prt";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { daysBetween, formatLocalizedDate } from "@/lib/date-utils";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import {
  useCreateRequestPriceList,
  useDeleteRequestPriceList,
  useUpdateRequestPriceList,
} from "@/hooks/use-request-price-list";
import type { Vendor } from "@/types/vendor";
import type {
  CreateRequestPriceListDto,
  RequestPriceList,
  RequestPriceListVendor,
} from "@/types/request-price-list";
import type { FormMode } from "@/types/form";

import {
  CardLabel,
  DateCard,
  GlassCard,
  InfoRow,
  MetaChip,
  PlainText,
} from "@/components/share/glass-card";
import { NameField } from "../../price-list/_components/pl-name-field";
import {
  createRfpSchema,
  getDefaultValues,
  type RfpFormValues,
} from "./rfp-form-schema";
import RfpVendorSection from "./rfp-vendor-section";

const FORM_ID = "rfp-form";
const LABEL_CLASS = cn(
  "text-muted-foreground text-[0.625rem] font-semibold tracking-[0.1em] uppercase",
);

type VendorAddItem = RfpFormValues["vendors"]["add"][number];

interface RequestPriceListFormProps {
  readonly requestPriceList?: RequestPriceList;
}

export function RequestPriceListForm({
  requestPriceList,
}: RequestPriceListFormProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("vendorManagement.requestPriceList");
  const tt = useTranslations("toast");
  const tv = useTranslations("validation");
  const tfl = useTranslations("field");
  const tc = useTranslations("common");
  const tform = useTranslations("form");

  const [mode, setMode] = useState<FormMode>(requestPriceList ? "view" : "add");
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isAdd = mode === "add";

  const createRfp = useCreateRequestPriceList();
  const updateRfp = useUpdateRequestPriceList();
  const deleteRfp = useDeleteRequestPriceList();
  const [showDelete, setShowDelete] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const isPending = createRfp.isPending || updateRfp.isPending;
  const isDisabled = isView || isPending;

  const defaultValues = getDefaultValues(requestPriceList);

  const form = useForm<RfpFormValues>({
    resolver: zodResolver(createRfpSchema(tv, tfl)) as Resolver<RfpFormValues>,
    defaultValues,
  });

  const discard = useDiscardConfirm({
    isDirty: form.formState.isDirty,
    isPending,
  });

  const today = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  })();

  const startDate = useWatch({ control: form.control, name: "start_date" });
  const endDate = useWatch({ control: form.control, name: "end_date" });

  const watchedAdd = useWatch({ control: form.control, name: "vendors.add" });
  const addedVendors: VendorAddItem[] = watchedAdd ?? [];

  const removedIds = useWatch({
    control: form.control,
    name: "vendors.remove",
  });
  const removedVendorIds = new Set(removedIds ?? []);

  const existingVendors = (requestPriceList?.vendors ?? []).filter(
    (v) => !removedVendorIds.has(v.vendor_id),
  );

  const displayVendors: (RequestPriceListVendor | VendorAddItem)[] = [
    ...existingVendors,
    ...addedVendors,
  ];

  const selectedVendorIds = new Set([
    ...existingVendors.map((v) => v.vendor_id),
    ...addedVendors.map((v) => v.vendor_id),
  ]);

  const submittedCount = existingVendors.filter(
    (v) => "has_submitted" in v && v.has_submitted,
  ).length;

  const handleAddVendor = (vendor: Vendor) => {
    if (selectedVendorIds.has(vendor.id)) {
      toast.error(t("vendorAlreadyAdded"));
      setIsAdding(false);
      return;
    }
    const contacts = vendor.contacts ?? vendor.tb_vendor_contact ?? [];
    const primaryContact = contacts.find((c) => c.is_primary);
    const currentAdd = form.getValues("vendors.add") ?? [];
    form.setValue("vendors.add", [
      ...currentAdd,
      {
        vendor_id: vendor.id,
        vendor_name: vendor.name,
        vendor_code: vendor.code,
        contact_person: primaryContact?.name ?? "",
        contact_phone: primaryContact?.phone ?? "",
        contact_email: primaryContact?.email ?? "",
        dimension: "",
      },
    ]);
    setIsAdding(false);
  };

  const handleRemoveVendor = (vendorId: string) => {
    const currentAdd = form.getValues("vendors.add") ?? [];
    const addIndex = currentAdd.findIndex((v) => v.vendor_id === vendorId);
    if (addIndex >= 0) {
      const updated = [...currentAdd];
      updated.splice(addIndex, 1);
      form.setValue("vendors.add", updated);
    } else {
      const currentRemove = form.getValues("vendors.remove") ?? [];
      form.setValue("vendors.remove", [...currentRemove, vendorId]);
    }
  };

  const onSubmit = (values: RfpFormValues) => {
    if (isAdding) {
      toast.error(t("vendors.selectVendorFirst"));
      return;
    }
    const vendorsAdd = (values.vendors?.add ?? []).map((v, i) => ({
      vendor_id: v.vendor_id,
      vendor_name: v.vendor_name,
      vendor_code: v.vendor_code,
      contact_person: v.contact_person,
      contact_phone: v.contact_phone,
      contact_email: v.contact_email,
      sequence_no: existingVendors.length + i + 1,
      dimension: v.dimension,
      id: "",
    }));
    const vendorsRemove = (values.vendors?.remove ?? []).map((v) => ({
      vendor_id: v,
    }));

    const payload: CreateRequestPriceListDto = {
      name: values.name,
      pricelist_template_id: values.pricelist_template_id || undefined,
      start_date: values.start_date,
      end_date: values.end_date,
      custom_message: values.custom_message ?? "",
      email_template_id: values.email_template_id || undefined,
      info: values.info || undefined,
      dimension: values.dimension || undefined,
      vendors: {
        add: vendorsAdd.length > 0 ? vendorsAdd : undefined,
        remove: vendorsRemove.length > 0 ? vendorsRemove : undefined,
      },
    };

    if (isEdit && requestPriceList) {
      updateRfp.mutate(
        { id: requestPriceList.id, ...payload },
        {
          onSuccess: () => {
            toast.success(tt("updateSuccess", { entity: t("entity") }));
            // เคลียร์ delta vendors.add/remove หลัง save สำเร็จ — refetch ทำให้
            // existingVendors มี vendor ที่เพิ่งเพิ่มแล้ว ถ้ายังค้าง add ไว้ใน form
            // จะ render ซ้ำใน view mode และ Save รอบถัดไปจะ re-send สร้าง vendor ซ้ำ
            form.reset({ ...values, vendors: { add: [], remove: [] } });
            setMode("view");
          },
          onError: (err) => toast.error(err.message),
        },
      );
    } else if (isAdd) {
      createRfp.mutate(payload, {
        onSuccess: (res) => {
          const id = (res as { data: { id: string } }).data.id;
          toast.success(tt("createSuccess", { entity: t("entity") }));
          router.replace(`/vendor-management/request-price-list/${id}`);
        },
        onError: (err) => toast.error(err.message),
      });
    }
  };

  const handleCancel = () => {
    discard.confirm(() => {
      if (isEdit && requestPriceList) {
        form.reset(getDefaultValues(requestPriceList));
        setIsAdding(false);
        setMode("view");
      } else {
        router.push("/vendor-management/request-price-list");
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
    if (!requestPriceList) return;
    deleteRfp.mutate(requestPriceList.id, {
      onSuccess: () => {
        toast.success(tt("deleteSuccess", { entity: t("entity") }));
        router.push("/vendor-management/request-price-list");
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const totalVendors = displayVendors.length;
  const submitLabel = getSubmitLabel(isPending, isAdd, tc, tform);
  const durationDays =
    startDate && endDate ? daysBetween(startDate, endDate) : 0;

  return (
    <div className="relative isolate -mx-3 -my-3">
      <form
        id={FORM_ID}
        onSubmit={form.handleSubmit(onSubmit, () =>
          scrollToFirstInvalidField(),
        )}
        className="relative px-4 pt-4 pb-8 lg:p-4"
      >
        {/* Hero */}
        <section className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_22rem]">
          <div>
            {/* Toolbar */}
            <div className="mb-3 flex flex-wrap items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="w-fit"
                  aria-label={tc("goBack")}
                  onClick={handleBack}
                >
                  <ChevronLeft />
                </Button>
                <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.625rem] font-bold tracking-wider uppercase">
                  <Mail className="size-2.5" />
                  {t("entity")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isView ? (
                  <>
                    <Button size="sm" onClick={() => setMode("edit")}>
                      <Pencil />
                      {tc("edit")}
                    </Button>
                    {requestPriceList?.id && (
                      <PrintDocumentButton
                        documentType="RFQ"
                        documentId={requestPriceList.id}
                        filters={
                          requestPriceList.name
                            ? { DocumentNo: requestPriceList.name }
                            : undefined
                        }
                      />
                    )}
                  </>
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
                    {isEdit && requestPriceList && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowDelete(true)}
                        disabled={deleteRfp.isPending || isPending}
                      >
                        <Trash2 />
                        {tc("delete")}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Name input */}
            <Controller
              control={form.control}
              name="name"
              render={({ field }) => (
                <NameField
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={t("namePlaceholder")}
                  disabled={isDisabled}
                  error={form.formState.errors.name?.message}
                  labels={{
                    nameLabel: tfl("name"),
                    tapToEdit: t("internalNote"),
                    pressEnterToSave: t("pressEnterToSave"),
                    clickToRename: t("clickToRename"),
                    requiredField: t("requiredField"),
                  }}
                />
              )}
            />

            {/* Descriptor */}
            <p className="text-foreground/80 mt-2 max-w-xl text-xs leading-relaxed">
              {totalVendors > 0 && durationDays > 0 ? (
                <span className="text-foreground/80">
                  {t("descriptorFilled", {
                    count: totalVendors,
                    days: durationDays,
                  })}
                </span>
              ) : (
                <span className="text-muted-foreground italic">
                  {t("descriptorEmpty")}
                </span>
              )}
            </p>

            {/* Meta chips */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              <MetaChip
                icon={Users}
                label={
                  totalVendors > 0
                    ? t("vendorsCount", { count: totalVendors })
                    : t("noVendors")
                }
                empty={!totalVendors}
              />
              <MetaChip
                icon={CalendarIcon}
                label={
                  startDate && endDate
                    ? `${formatLocalizedDate(startDate, locale)} → ${formatLocalizedDate(endDate, locale)}`
                    : tfl("startDate")
                }
                empty={!startDate || !endDate}
              />
              <MetaChip
                icon={ClipboardList}
                label={
                  requestPriceList?.pricelist_template?.name || tfl("template")
                }
                empty={!requestPriceList?.pricelist_template}
              />
            </div>
          </div>

          {/* Hero stat card */}
          <RfpHeroStatCard
            totalVendors={totalVendors}
            submittedCount={submittedCount}
            durationDays={durationDays}
            labels={{
              vendors: t("vendorsLabel"),
              submitted: t("submittedLabel"),
              days: t("daysLabel"),
              footer: t("heroFooter"),
              vendorsInvited: t("vendorsInvited"),
            }}
          />
        </section>

        {/* Body grid */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_22rem]">
          <div className="flex flex-col gap-4">
            {/* General settings card */}
            <GlassCard>
              <CardLabel>{tfl("general")}</CardLabel>

              <Field>
                <FieldLabel className={LABEL_CLASS}>
                  {tfl("template")}
                  {!isView && <span className="text-destructive">*</span>}
                </FieldLabel>
                {isView ? (
                  <PlainText
                    value={requestPriceList?.pricelist_template?.name}
                  />
                ) : (
                  <Controller
                    control={form.control}
                    name="pricelist_template_id"
                    render={({ field }) => (
                      <LookupPrt
                        value={field.value ?? ""}
                        onValueChange={(value) => field.onChange(value)}
                        disabled={isDisabled}
                        className="h-8 w-full text-xs"
                        error={
                          form.formState.errors.pricelist_template_id?.message
                        }
                      />
                    )}
                  />
                )}
              </Field>

              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                <DateCard label={tfl("startDate")} value={startDate}>
                  {isView ? (
                    <PlainText
                      value={
                        startDate ? formatLocalizedDate(startDate, locale) : ""
                      }
                    />
                  ) : (
                    <Controller
                      control={form.control}
                      name="start_date"
                      render={({ field }) => (
                        <FieldDatePicker
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={isDisabled}
                          placeholder={tfl("pickDate")}
                          className="h-8 w-full border-0 bg-transparent text-xs shadow-none focus-visible:ring-0"
                          fromDate={today}
                          error={form.formState.errors.start_date?.message}
                        />
                      )}
                    />
                  )}
                </DateCard>
                <DateCard label={tfl("endDate")} value={endDate} highlight>
                  {isView ? (
                    <PlainText
                      value={endDate ? formatLocalizedDate(endDate, locale) : ""}
                    />
                  ) : (
                    <Controller
                      control={form.control}
                      name="end_date"
                      render={({ field }) => (
                        <FieldDatePicker
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={isDisabled}
                          placeholder={tfl("pickDate")}
                          className="h-8 w-full border-0 bg-transparent text-xs shadow-none focus-visible:ring-0"
                          fromDate={startDate ? new Date(startDate) : today}
                          error={form.formState.errors.end_date?.message}
                        />
                      )}
                    />
                  )}
                </DateCard>
              </div>
            </GlassCard>

            {/* Custom message card */}
            <GlassCard>
              <CardLabel>{t("customMessageTitle")}</CardLabel>
              <p className="text-muted-foreground mb-3 max-w-xl text-[0.6875rem] leading-relaxed">
                {t("customMessageHelp")}
              </p>
              {isView ? (
                <PlainText value={requestPriceList?.custom_message} multiline />
              ) : (
                <Input
                  type="text"
                  disabled={isDisabled}
                  placeholder={t("customMessagePlaceholder")}
                  maxLength={500}
                  className="border-border/40 bg-background/60 hover:border-foreground/50 focus-visible:border-primary h-9 rounded-lg border text-xs shadow-none transition-colors focus-visible:ring-0"
                  {...form.register("custom_message")}
                />
              )}
            </GlassCard>

            {/* Vendors section */}
            <RfpVendorSection
              isDisabled={isDisabled}
              isAdding={isAdding}
              setIsAdding={setIsAdding}
              displayVendors={displayVendors}
              selectedVendorIds={selectedVendorIds}
              onAddVendor={handleAddVendor}
              onRemoveVendor={handleRemoveVendor}
            />
          </div>

          {/* Sidebar */}
          <aside className="hidden flex-col gap-3 self-start lg:sticky lg:top-20 lg:flex">
            <GlassCard>
              <CardLabel>{t("templateSummary")}</CardLabel>
              {requestPriceList?.pricelist_template ? (
                <div className="flex items-start gap-2.5">
                  <div className="from-primary to-primary/70 text-primary-foreground flex size-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-semibold">
                    <ClipboardList className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-foreground truncate text-xs font-semibold">
                      {requestPriceList.pricelist_template.name}
                    </div>
                    <div className="text-muted-foreground mt-0.5 text-[0.625rem] tracking-wide uppercase">
                      {requestPriceList.pricelist_template.currency?.code}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-primary/35 bg-primary/5 rounded-lg border border-dashed p-3 text-center">
                  <div className="border-primary/30 bg-card/60 mx-auto mb-2 flex size-7 items-center justify-center rounded-lg border">
                    <Building2 className="text-primary size-3" />
                  </div>
                  <div className="text-foreground text-[0.6875rem] font-semibold">
                    {t("noTemplate")}
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-[0.625rem]">
                    {t("templateEmptyDesc")}
                  </p>
                </div>
              )}
            </GlassCard>

            <GlassCard>
              <CardLabel>{t("rfpSummary")}</CardLabel>
              <div className="grid gap-1.5">
                <InfoRow
                  k={t("vendorsLabel")}
                  v={totalVendors || "—"}
                  muted={!totalVendors}
                />
                <InfoRow
                  k={t("submittedLabel")}
                  v={`${submittedCount} / ${totalVendors || 0}`}
                  muted={!totalVendors}
                />
                <InfoRow
                  k={tfl("startDate")}
                  v={startDate ? formatLocalizedDate(startDate, locale) : "—"}
                  muted={!startDate}
                />
                <InfoRow
                  k={tfl("endDate")}
                  v={endDate ? formatLocalizedDate(endDate, locale) : "—"}
                  muted={!endDate}
                />
                <InfoRow
                  k={t("durationLabel")}
                  v={
                    durationDays > 0
                      ? t("daysSuffix", { count: durationDays })
                      : "—"
                  }
                  muted={!durationDays}
                />
              </div>

              <div className="border-primary/30 bg-primary/5 mt-4 rounded-lg border p-3">
                <div className="text-primary flex items-center gap-1 text-[0.5625rem] font-bold tracking-widest uppercase">
                  <Mail className="size-2.5" />
                  {t("tipTitle")}
                </div>
                <p className="text-foreground/80 mt-1 text-[0.6875rem] leading-relaxed">
                  {t("tipBody")}
                </p>
              </div>
            </GlassCard>
          </aside>
        </div>
      </form>

      <DiscardDialog {...discard.dialogProps} variant="warning" />

      {requestPriceList && (
        <DeleteDialog
          open={showDelete}
          onOpenChange={(open) =>
            !open && !deleteRfp.isPending && setShowDelete(false)
          }
          title={t("deleteTitle")}
          description={t("deleteConfirm", { name: requestPriceList.name })}
          isPending={deleteRfp.isPending}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}

/* ── Hero stat card ─────────────────────────────────────────── */

function RfpHeroStatCard({
  totalVendors,
  submittedCount,
  durationDays,
  labels,
}: {
  readonly totalVendors: number;
  readonly submittedCount: number;
  readonly durationDays: number;
  readonly labels: {
    readonly vendors: string;
    readonly submitted: string;
    readonly days: string;
    readonly footer: string;
    readonly vendorsInvited: string;
  };
}) {
  const isEmpty = !totalVendors;
  return (
    <div className="from-primary via-primary to-primary/70 text-primary-foreground relative hidden overflow-hidden rounded-2xl bg-gradient-to-br p-4 shadow-[0_1rem_2rem_-0.5rem_color-mix(in_oklch,var(--primary),transparent_60%)] lg:block">
      <div className="pointer-events-none absolute -top-10 -right-10 size-36 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.22)_0%,transparent_70%)]" />
      <div className="text-primary-foreground/70 text-[0.5625rem] font-medium tracking-widest uppercase">
        {labels.vendorsInvited}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span
          className={cn(
            "text-3xl leading-none font-semibold tracking-tight tabular-nums",
            isEmpty && "text-primary-foreground/45",
          )}
        >
          {totalVendors}
        </span>
        <span className="text-primary-foreground/70 text-xs">
          {labels.vendors}
        </span>
      </div>

      <div className="bg-primary-foreground/15 mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-lg">
        <Cell k={labels.vendors} v={totalVendors || "—"} empty={isEmpty} />
        <Cell
          k={labels.submitted}
          v={totalVendors ? `${submittedCount}/${totalVendors}` : "—"}
          empty={isEmpty}
        />
        <Cell k={labels.days} v={durationDays || "—"} empty={!durationDays} />
      </div>

      <div className="text-primary-foreground/80 mt-2.5 flex items-center gap-1 text-[0.6875rem]">
        <Mail className="size-2.5" />
        {labels.footer}
      </div>
    </div>
  );
}

function Cell({
  k,
  v,
  empty,
}: {
  readonly k: string;
  readonly v: string | number;
  readonly empty?: boolean;
}) {
  return (
    <div className="bg-primary/40 px-2 py-1.5">
      <div className="text-primary-foreground/65 text-[0.5rem] font-semibold tracking-widest uppercase">
        {k}
      </div>
      <div
        className={cn(
          "mt-0.5 text-[0.6875rem] font-semibold",
          empty ? "text-primary-foreground/45" : "text-primary-foreground",
        )}
      >
        {v}
      </div>
    </div>
  );
}

function getSubmitLabel(
  isPending: boolean,
  isAdd: boolean,
  tc: (key: string) => string,
  tform: (key: string) => string,
): string {
  if (isPending) return isAdd ? tform("creating") : tform("saving");
  return isAdd ? tc("create") : tc("save");
}
