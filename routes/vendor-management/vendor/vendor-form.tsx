import { useEffect, useState } from "react";
import { useFieldArray, useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import { ChevronLeft, Pencil, Save, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { useDiscardConfirm } from "@/hooks/use-discard-confirm";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import { cn } from "@/lib/utils";
import {
  useCreateVendor,
  useDeleteVendor,
  useUpdateVendor,
} from "@/hooks/use-vendor";
import type { CreateVendorDto, VendorDetail } from "@/types/vendor";
import type { FormMode } from "@/types/form";
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
  "use no memo";
  const navigate = useNavigate();
  const t = useTranslations("vendorManagement.vendor");
  const tt = useTranslations("toast");
  const tv = useTranslations("validation");
  const tfl = useTranslations("field");
  const tc = useTranslations("common");
  const tform = useTranslations("form");

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
  // Keyed on a signature of the address/contact ids (the GET response carries
  // no top-level updated_at — the timestamp lives under `audit`, which is not
  // on the typed shape), NOT on `mode`: the signature changes exactly when rows
  // are added/removed (the cases the stale-id bug bites), and keying off mode
  // would fire on the edit→view transition before the refetch lands, resetting
  // to the stale prop and momentarily dropping the just-added rows.
  const vendorSyncKey = [
    ...(vendor?.vendor_address ?? []).map((a) => a.id ?? ""),
    ...(vendor?.vendor_contact ?? []).map((c) => c.id ?? ""),
  ].join("|");
  useEffect(() => {
    if (mode === "view" && vendor) {
      form.reset(getDefaultValues(vendor));
      setRemovedAddressIds([]);
      setRemovedContactIds([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form/getDefaultValues stable; mode read intentionally without retriggering
  }, [vendorSyncKey, vendor?.id]);

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
        // doc_version round-trips the loaded record's version — backend requires
        // it for optimistic concurrency on PATCH (same as the config modules).
        { id: vendor.id, doc_version: vendor.doc_version, ...payload },
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
            navigate(`/vendor-management/vendor/${id}`, { replace: true });
          } else {
            navigate("/vendor-management/vendor");
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
        navigate("/vendor-management/vendor");
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
    if (!vendor) return;
    deleteVendor.mutate(vendor.id, {
      onSuccess: () => {
        toast.success(tt("deleteSuccess", { entity: t("entity") }));
        navigate("/vendor-management/vendor");
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const submitLabel = getSubmitLabel(isPending, isAdd, tc, tform);

  return (
    <div className="mx-auto max-w-4xl p-[max(1rem,env(safe-area-inset-bottom))]">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
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
                {watchedCode && (
                  <span className="text-muted-foreground shrink-0 text-sm">
                    · {watchedCode}
                  </span>
                )}
                {!isAdd && <StatusBadge active={watchedActive} />}
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
      </header>

      <form
        id={FORM_ID}
        onSubmit={form.handleSubmit(onSubmit, (errors) => {
          console.warn("[vendor-form] validation failed:", errors);
          console.warn("[vendor-form] values:", form.getValues());
          scrollToFirstInvalidField();
        })}
      >
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
      </form>

      {/* Certificates — CRUD อิสระ (นอก form, ยิง API เอง) แสดงเมื่อมี vendor */}
      {vendor?.id && <VendorCertificateSection vendorId={vendor.id} />}

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
