import { useState } from "react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import { Pencil, Save, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { PrintDocumentButton } from "@/components/print-document-button";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { useDiscardConfirm } from "@/hooks/use-discard-confirm";
import { useNavigationGuard } from "@/hooks/use-navigation-guard";
import {
  Field,
  FieldDatePicker,
  FieldInput,
  FieldLabel,
  FieldPlainText,
} from "@/components/ui/field";
import { LookupPrt } from "@/components/lookup/lookup-prt";
import { Input } from "@/components/ui/input";
import { DocFormHeader } from "@/components/share/doc-form-header";
import { formatDate } from "@/lib/date-utils";
import { useProfile } from "@/hooks/use-profile";
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

import { SettingSection } from "@/components/ui/setting-section";
import {
  createRfpSchema,
  getDefaultValues,
  type RfpFormValues,
} from "./rfp-form-schema";
import RfpVendorTable from "./rfp-vendor-table";

const FORM_ID = "rfp-form";

type VendorAddItem = RfpFormValues["vendors"]["add"][number];

interface RequestPriceListFormProps {
  readonly requestPriceList?: RequestPriceList;
}

export function RequestPriceListForm({
  requestPriceList,
}: RequestPriceListFormProps) {
  const navigate = useNavigate();
  const { dateFormat } = useProfile();
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
  const navGuard = useNavigationGuard(
    (isAdd || isEdit) && form.formState.isDirty,
  );

  const today = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  })();

  const startDate = useWatch({ control: form.control, name: "start_date" });
  const endDate = useWatch({ control: form.control, name: "end_date" });
  const watchedName = useWatch({ control: form.control, name: "name" });

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
        {
          id: requestPriceList.id,
          doc_version: requestPriceList.doc_version,
          ...payload,
        },
        {
          onSuccess: () => {
            toast.success(tt("updateSuccess", { entity: t("entity") }));
            // เคลียร์ delta vendors.add/remove หลัง save สำเร็จ — refetch ทำให้
            // existingVendors มี vendor ที่เพิ่งเพิ่มแล้ว ถ้ายังค้าง add ไว้ใน form
            // จะ render ซ้ำใน view mode และ Save รอบถัดไปจะ re-send สร้าง vendor ซ้ำ
            form.reset({ ...values, vendors: { add: [], remove: [] } });
            setMode("view");
          },
        },
      );
    } else if (isAdd) {
      createRfp.mutate(payload, {
        onSuccess: (res) => {
          const id = (res as { data: { id: string } }).data.id;
          toast.success(tt("createSuccess", { entity: t("entity") }));
          navigate(`/vendor-management/request-price-list/${id}`, {
            replace: true,
          });
        },
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
        navigate("/vendor-management/request-price-list");
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
    if (!requestPriceList) return;
    deleteRfp.mutate(requestPriceList.id, {
      onSuccess: () => {
        toast.success(tt("deleteSuccess", { entity: t("entity") }));
        navigate("/vendor-management/request-price-list");
      },
    });
  };

  const submitLabel = getSubmitLabel(isPending, isAdd, tc, tform);

  return (
    <div className="mx-auto max-w-5xl p-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="mb-6">
        <DocFormHeader
          flush
          title={watchedName || t("namePlaceholder")}
          titleMuted={!watchedName}
          backLabel={tc("goBack")}
          onBack={handleBack}
          actions={
            isView ? (
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
            )
          }
        />
      </div>

      <form
        id={FORM_ID}
        onSubmit={form.handleSubmit(onSubmit, () =>
          scrollToFirstInvalidField(),
        )}
      >
        {/* General */}
        <SettingSection
          first
          title={tfl("general")}
          description={t("generalDesc")}
        >
          {/* Name */}
          <Field>
            <FieldLabel htmlFor="rfp-name">
              {tfl("name")}
              {!isView && <span className="text-destructive"> *</span>}
            </FieldLabel>
            {isView ? (
              <FieldPlainText>{form.getValues("name")}</FieldPlainText>
            ) : (
              <FieldInput
                id="rfp-name"
                placeholder={t("namePlaceholder")}
                disabled={isDisabled}
                error={form.formState.errors.name?.message}
                maxLength={100}
                {...form.register("name")}
              />
            )}
          </Field>

          {/* Template */}
          <Field>
            <FieldLabel>
              {tfl("template")}
              {!isView && <span className="text-destructive"> *</span>}
            </FieldLabel>
            {isView ? (
              <FieldPlainText>
                {requestPriceList?.pricelist_template?.name}
              </FieldPlainText>
            ) : (
              <Controller
                control={form.control}
                name="pricelist_template_id"
                render={({ field }) => (
                  <LookupPrt
                    value={field.value ?? ""}
                    onValueChange={(value) => field.onChange(value)}
                    disabled={isDisabled}
                    className="w-full"
                    error={form.formState.errors.pricelist_template_id?.message}
                  />
                )}
              />
            )}
          </Field>

          {/* Start date */}
          <Field>
            <FieldLabel>{tfl("startDate")}</FieldLabel>
            {isView ? (
              <FieldPlainText>
                {startDate ? formatDate(startDate, dateFormat) : ""}
              </FieldPlainText>
            ) : (
              <Controller
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FieldDatePicker
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isDisabled}
                    className="w-full"
                    placeholder={tfl("pickDate")}
                    fromDate={today}
                    error={form.formState.errors.start_date?.message}
                  />
                )}
              />
            )}
          </Field>

          {/* End date */}
          <Field>
            <FieldLabel>{tfl("endDate")}</FieldLabel>
            {isView ? (
              <FieldPlainText>
                {endDate ? formatDate(endDate, dateFormat) : ""}
              </FieldPlainText>
            ) : (
              <Controller
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FieldDatePicker
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isDisabled}
                    className="w-full"
                    placeholder={tfl("pickDate")}
                    fromDate={startDate ? new Date(startDate) : today}
                    error={form.formState.errors.end_date?.message}
                  />
                )}
              />
            )}
          </Field>
        </SettingSection>

        {/* Custom message */}
        <SettingSection
          title={t("customMessageTitle")}
          description={t("customMessageHelp")}
        >
          <Field className="sm:col-span-2">
            <FieldLabel>{t("customMessageTitle")}</FieldLabel>
            {isView ? (
              <FieldPlainText className="items-start whitespace-pre-wrap">
                {requestPriceList?.custom_message}
              </FieldPlainText>
            ) : (
              <Input
                type="text"
                disabled={isDisabled}
                placeholder={t("customMessagePlaceholder")}
                maxLength={500}
                {...form.register("custom_message")}
              />
            )}
          </Field>
        </SettingSection>

        <RfpVendorTable
          isDisabled={isDisabled}
          isAdding={isAdding}
          setIsAdding={setIsAdding}
          displayVendors={displayVendors}
          selectedVendorIds={selectedVendorIds}
          onAddVendor={handleAddVendor}
          onRemoveVendor={handleRemoveVendor}
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

function getSubmitLabel(
  isPending: boolean,
  isAdd: boolean,
  tc: (key: string) => string,
  tform: (key: string) => string,
): string {
  if (isPending) return isAdd ? tform("creating") : tform("saving");
  return isAdd ? tc("create") : tc("save");
}
