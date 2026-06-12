"use no memo";

import { useEffect, useMemo, useState } from "react";
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
  type Resolver,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@/lib/compat/navigation";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import {
  Building2,
  ChevronLeft,
  Pencil,
  Save,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { useDiscardConfirm } from "@/hooks/use-discard-confirm";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import { StatusSwitch } from "@/components/ui/status-switch";
import {
  useCreateVendor,
  useDeleteVendor,
  useUpdateVendor,
} from "@/hooks/use-vendor";
import type { CreateVendorDto, VendorDetail } from "@/types/vendor";
import type { FormMode } from "@/types/form";
import {
  CardLabel,
  GlassCard,
  InfoRow,
  StatusPill,
} from "@/components/share/glass-card";
import { NameField } from "../../price-list/_components/pl-name-field";
import {
  buildNestedPayload,
  createVendorSchema,
  getDefaultValues,
  mapAddressPayload,
  mapContactPayload,
  type VendorFormValues,
} from "./vendor-form-schema";
import { VendorCertificateSection } from "./vendor-certificate-section";
import { VendorGeneral } from "./vendor-general";
import { VendorInfo } from "./vendor-info";
import { VendorAddress } from "./vendor-address";
import { VendorContact } from "./vendor-contact";

const FORM_ID = "vendor-form";

interface VendorFormProps {
  readonly vendor?: VendorDetail;
}

export function VendorForm({ vendor }: VendorFormProps) {
  const router = useRouter();
  const t = useTranslations("vendorManagement.vendor");
  const tt = useTranslations("toast");
  const tv = useTranslations("validation");
  const tfl = useTranslations("field");
  const tc = useTranslations("common");
  const tform = useTranslations("form");
  const ts = useTranslations("status");

  const [mode, setMode] = useState<FormMode>(vendor ? "view" : "add");
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isAdd = mode === "add";

  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor();
  const deleteVendor = useDeleteVendor();
  const [showDelete, setShowDelete] = useState(false);
  const isPending = createVendor.isPending || updateVendor.isPending;
  const isDisabled = isView || isPending;

  const defaultValues = getDefaultValues(vendor);
  const form = useForm<VendorFormValues>({
    resolver: zodResolver(
      createVendorSchema(tv, tfl),
    ) as Resolver<VendorFormValues>,
    defaultValues,
  });

  const discard = useDiscardConfirm({
    isDirty: form.formState.isDirty,
    isPending,
  });

  const {
    fields: infoFields,
    prepend: prependInfo,
    remove: removeInfo,
  } = useFieldArray({ control: form.control, name: "info" });

  const {
    fields: addressFields,
    prepend: prependAddress,
    remove: removeAddress,
  } = useFieldArray({ control: form.control, name: "vendor_address" });

  const {
    fields: contactFields,
    prepend: prependContact,
    remove: removeContact,
  } = useFieldArray({ control: form.control, name: "vendor_contact" });

  const [removedAddressIds, setRemovedAddressIds] = useState<string[]>([]);
  const [removedContactIds, setRemovedContactIds] = useState<string[]>([]);

  // After a successful edit-save the byId query is invalidated and refetches,
  // so the `vendor` prop returns with server-assigned ids for any newly added
  // address/contact rows. Re-sync the form to it in view mode so a second
  // consecutive edit does not re-send those rows as new (buildNestedPayload
  // keys add-vs-update on id presence → would create duplicates server-side).
  //
  // Keyed ONLY on updated_at (+ id), NOT on `mode`: keying on mode would fire
  // on the edit→view transition before the refetch lands, resetting to the
  // stale prop and momentarily dropping the just-added rows. updated_at changes
  // only when the server entity actually updates.
  useEffect(() => {
    if (mode === "view" && vendor) {
      form.reset(getDefaultValues(vendor));
      setRemovedAddressIds([]);
      setRemovedContactIds([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form/getDefaultValues stable; mode read intentionally without retriggering
  }, [vendor?.updated_at, vendor?.id]);

  const handleRemoveAddress = (index: number) => {
    const id = form.getValues(`vendor_address.${index}.id`);
    if (id) setRemovedAddressIds((prev) => [...prev, id]);
    removeAddress(index);
  };

  const handleRemoveContact = (index: number) => {
    const id = form.getValues(`vendor_contact.${index}.id`);
    if (id) setRemovedContactIds((prev) => [...prev, id]);
    removeContact(index);
  };

  const watchedName = useWatch({ control: form.control, name: "name" });
  const watchedCode = useWatch({ control: form.control, name: "code" });
  const watchedActive = useWatch({ control: form.control, name: "is_active" });
  const watchedBuTypes = useWatch({
    control: form.control,
    name: "business_types",
  });
  const watchedAddresses = useWatch({
    control: form.control,
    name: "vendor_address",
  });
  const watchedContacts = useWatch({
    control: form.control,
    name: "vendor_contact",
  });
  const watchedInfo = useWatch({ control: form.control, name: "info" });

  const stats = useMemo(
    () => ({
      addresses: (watchedAddresses ?? []).length,
      contacts: (watchedContacts ?? []).length,
      businessTypes: (watchedBuTypes ?? []).length,
      info: (watchedInfo ?? []).length,
    }),
    [watchedAddresses, watchedContacts, watchedBuTypes, watchedInfo],
  );

  const statusConfig = watchedActive
    ? {
        label: ts("active"),
        className: "bg-success/15 text-success-foreground",
      }
    : {
        label: ts("inactive"),
        className: "bg-muted text-muted-foreground",
      };

  const onSubmit = (values: VendorFormValues) => {
    const { dirtyFields } = form.formState;
    const payload: CreateVendorDto = {
      code: values.code,
      name: values.name,
      description: values.description,
      is_active: values.is_active,
      business_type: values.business_types,
      info: (values.info ?? []).map(({ label, value, data_type }) => ({
        label,
        value,
        data_type,
      })),
      vendor_address: buildNestedPayload(
        values.vendor_address,
        // RHF 7.78 type drift
        dirtyFields.vendor_address as Record<string, unknown>[] | undefined,
        removedAddressIds,
        mapAddressPayload,
        "vendor_address_id",
      ) as CreateVendorDto["vendor_address"],
      vendor_contact: buildNestedPayload(
        values.vendor_contact,
        // RHF 7.78 type drift
        dirtyFields.vendor_contact as Record<string, unknown>[] | undefined,
        removedContactIds,
        mapContactPayload,
        "vendor_contact_id",
      ) as CreateVendorDto["vendor_contact"],
    };

    if (isEdit && vendor) {
      updateVendor.mutate(
        { id: vendor.id, ...payload },
        {
          onSuccess: () => {
            toast.success(tt("updateSuccess", { entity: t("entity") }));
            form.reset(values);
            setRemovedAddressIds([]);
            setRemovedContactIds([]);
            setMode("view");
          },
          onError: (err) => toast.error(err.message),
        },
      );
    } else if (isAdd) {
      createVendor.mutate(payload, {
        onSuccess: (res) => {
          toast.success(tt("createSuccess", { entity: t("entity") }));
          const data = res as unknown as { data?: { id?: string } };
          const id = data?.data?.id;
          if (id) {
            router.replace(`/vendor-management/vendor/${id}`);
          } else {
            router.push("/vendor-management/vendor");
          }
        },
        onError: (err) => toast.error(err.message),
      });
    }
  };

  const handleCancel = () => {
    discard.confirm(() => {
      if (isEdit && vendor) {
        form.reset(defaultValues);
        setRemovedAddressIds([]);
        setRemovedContactIds([]);
        setMode("view");
      } else {
        router.push("/vendor-management/vendor");
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
    if (!vendor) return;
    deleteVendor.mutate(vendor.id, {
      onSuccess: () => {
        toast.success(tt("deleteSuccess", { entity: t("entity") }));
        router.push("/vendor-management/vendor");
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const submitLabel = getSubmitLabel(isPending, isAdd, tc, tform);
  const primaryContact = (watchedContacts ?? []).find((c) => c.is_primary);

  return (
    <div className="relative isolate -mx-3 -my-3">
      <form
        id={FORM_ID}
        onSubmit={form.handleSubmit(onSubmit, (errors) => {
          // 🐛 DEBUG: ดูว่า field ไหน validate ไม่ผ่าน (บล็อก save)
          console.warn("[vendor-form] validation failed:", errors);
          console.warn("[vendor-form] values:", form.getValues());
          scrollToFirstInvalidField();
        })}
        className="relative px-4 pt-4 pb-8 lg:p-4"
      >
        {/* Hero section */}
        <section className="mb-5">
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
                  <Building2 className="size-2.5" />
                  {t("entity")}
                </span>
                {watchedCode && (
                  <span className="bg-foreground text-background inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.625rem] font-semibold tracking-wider uppercase">
                    {watchedCode}
                  </span>
                )}
                <StatusPill statusConfig={statusConfig} large />
              </div>
              <div className="flex items-center gap-2">
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
                    {isEdit && vendor && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowDelete(true)}
                        disabled={deleteVendor.isPending || isPending}
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
                    tapToEdit: t("vendorNameHint"),
                    pressEnterToSave: t("pressEnterToSave"),
                    clickToRename: t("clickToRename"),
                    requiredField: t("requiredField"),
                  }}
                />
              )}
            />

            {/* Descriptor */}
            <p className="text-foreground/80 mt-2 max-w-xl text-xs leading-relaxed">
              {watchedName && watchedCode ? (
                <span className="text-foreground/80">
                  {t("descriptorFilled", {
                    contacts: stats.contacts,
                    addresses: stats.addresses,
                  })}
                </span>
              ) : (
                <span className="text-muted-foreground italic">
                  {t("descriptorEmpty")}
                </span>
              )}
            </p>
          </div>
        </section>

        {/* Body grid */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_22rem]">
          <div className="flex flex-col gap-4">
            <VendorGeneral form={form} isDisabled={isDisabled} />
            <VendorInfo
              form={form}
              isDisabled={isDisabled}
              infoFields={infoFields}
              prependInfo={prependInfo}
              removeInfo={removeInfo}
            />
            <VendorAddress
              form={form}
              isDisabled={isDisabled}
              addressFields={addressFields}
              prependAddress={prependAddress}
              removeAddress={handleRemoveAddress}
            />
            <VendorContact
              form={form}
              isDisabled={isDisabled}
              contactFields={contactFields}
              prependContact={prependContact}
              removeContact={handleRemoveContact}
            />
          </div>

          {/* Sidebar */}
          <aside className="hidden flex-col gap-3 self-start lg:sticky lg:top-20 lg:flex">
            <GlassCard>
              <CardLabel>{t("primaryContactTitle")}</CardLabel>
              {primaryContact && primaryContact.name ? (
                <div className="flex items-start gap-2.5">
                  <div className="from-primary to-primary/70 text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br font-serif text-base font-medium">
                    {primaryContact.name[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-foreground truncate text-xs font-semibold">
                      {primaryContact.name}
                    </div>
                    {primaryContact.email && (
                      <div className="text-muted-foreground mt-0.5 truncate text-[0.6875rem]">
                        {primaryContact.email}
                      </div>
                    )}
                    {primaryContact.phone && (
                      <div className="text-muted-foreground truncate text-[0.625rem]">
                        {primaryContact.phone}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="border-primary/35 bg-primary/5 rounded-lg border border-dashed p-3 text-center">
                  <div className="border-primary/30 bg-card/60 mx-auto mb-2 flex size-7 items-center justify-center rounded-lg border">
                    <Users className="text-primary size-3" />
                  </div>
                  <div className="text-foreground text-[0.6875rem] font-semibold">
                    {t("noPrimaryContact")}
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-[0.625rem]">
                    {t("noPrimaryContactDesc")}
                  </p>
                </div>
              )}
            </GlassCard>

            <GlassCard>
              <CardLabel>{t("vendorSummary")}</CardLabel>
              <div className="grid gap-1.5">
                <InfoRow
                  k={t("businessTypesLabel")}
                  v={stats.businessTypes || "—"}
                  muted={!stats.businessTypes}
                />
                <InfoRow
                  k={t("addressesLabel")}
                  v={stats.addresses || "—"}
                  muted={!stats.addresses}
                />
                <InfoRow
                  k={t("contactsLabel")}
                  v={stats.contacts || "—"}
                  muted={!stats.contacts}
                />
                <InfoRow
                  k={t("infoLabel")}
                  v={stats.info || "—"}
                  muted={!stats.info}
                />
              </div>

              {/* Status switcher */}
              {!isView && (
                <div className="border-border/60 mt-3 border-t pt-3">
                  <Controller
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <StatusSwitch
                        id="vendor-is-active"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isDisabled}
                      />
                    )}
                  />
                </div>
              )}
            </GlassCard>

            <GlassCard>
              <CardLabel>{t("tipTitle")}</CardLabel>
              <p className="text-foreground/80 text-[0.6875rem] leading-relaxed">
                {t("tipBody")}
              </p>
            </GlassCard>
          </aside>
        </div>
      </form>

      {/* Certificates — CRUD อิสระ (นอก form, ยิง API เอง) แสดงเมื่อมี vendor */}
      {vendor?.id && (
        <div className="px-4 pb-8 lg:px-4">
          <VendorCertificateSection vendorId={vendor.id} />
        </div>
      )}

      <DiscardDialog {...discard.dialogProps} variant="warning" />

      {vendor && (
        <DeleteDialog
          open={showDelete}
          onOpenChange={(open) =>
            !open && !deleteVendor.isPending && setShowDelete(false)
          }
          title={t("deleteTitle")}
          description={t("deleteConfirm", { name: vendor.name })}
          isPending={deleteVendor.isPending}
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
