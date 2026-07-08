import { useState } from "react";
import { type useFieldArray, type useForm } from "react-hook-form";
import { useTranslations } from "use-intl";
import { CheckCircle2, Mail, Phone, Plus, Star, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getDeleteDescription } from "@/lib/form-utils";
import { SettingSection } from "../../system-admin/business-setting/business-setting-ui";
import {
  EMPTY_VENDOR_CONTACT,
  type VendorFormValues,
} from "./vendor-form-schema";

interface VendorContactTabProps {
  readonly form: ReturnType<typeof useForm<VendorFormValues>>;
  readonly isDisabled: boolean;
  readonly contactFields: ReturnType<
    typeof useFieldArray<VendorFormValues, "vendor_contact">
  >["fields"];
  readonly prependContact: ReturnType<
    typeof useFieldArray<VendorFormValues, "vendor_contact">
  >["prepend"];
  readonly removeContact: (index: number) => void;
}

/** Vendor contacts — Soft Sheet card list (replaces DataGrid table) */
export function VendorContact({
  form,
  isDisabled,
  contactFields,
  prependContact,
  removeContact,
}: VendorContactTabProps) {
  "use no memo";
  const t = useTranslations("vendorManagement.vendor");
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const isView = isDisabled && !form.formState.isSubmitting;

  const handleAdd = () => prependContact(EMPTY_VENDOR_CONTACT);

  const handleSetPrimary = (index: number, checked: boolean) => {
    if (checked) {
      contactFields.forEach((_, i) => {
        if (i !== index) {
          form.setValue(`vendor_contact.${i}.is_primary`, false);
        }
      });
    }
    form.setValue(`vendor_contact.${index}.is_primary`, checked);
  };

  return (
    <SettingSection
      title={t("contactsLabel")}
      description={t("contactsDesc")}
      count={contactFields.length}
      action={
        !isView ? (
          <Button type="button" size="xs" onClick={handleAdd}>
            <Plus />
            {t("contact.addContact")}
          </Button>
        ) : undefined
      }
    >
      <div className="sm:col-span-2">
        {contactFields.length === 0 ? (
          <EmptyContacts
            isView={isView}
            title={t("contact.noContacts")}
            description={t("contact.noContactsDesc")}
            addLabel={t("contact.addContact")}
            onAdd={handleAdd}
          />
        ) : (
          <div className="flex flex-col gap-2">
            {contactFields.map((field, index) => (
              <ContactCard
                key={field.id}
                form={form}
                index={index}
                isView={isView}
                isDisabled={isDisabled}
                onSetPrimary={(c) => handleSetPrimary(index, c)}
                onRemove={() => setDeleteIndex(index)}
                t={t}
              />
            ))}
          </div>
        )}
      </div>

      <DeleteDialog
        open={deleteIndex !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteIndex(null);
        }}
        title={t("contact.removeContactTitle")}
        description={getDeleteDescription(deleteIndex, form)}
        onConfirm={() => {
          if (deleteIndex === null) return;
          removeContact(deleteIndex);
          setDeleteIndex(null);
        }}
      />
    </SettingSection>
  );
}

/* ── ContactCard ────────────────────────────────────── */

function ContactCard({
  form,
  index,
  isView,
  isDisabled,
  onSetPrimary,
  onRemove,
  t,
}: {
  readonly form: ReturnType<typeof useForm<VendorFormValues>>;
  readonly index: number;
  readonly isView: boolean;
  readonly isDisabled: boolean;
  readonly onSetPrimary: (checked: boolean) => void;
  readonly onRemove: () => void;
  readonly t: (key: string) => string;
}) {
  "use no memo";
  const errors = form.formState.errors.vendor_contact?.[index];
  const contact = form.getValues(`vendor_contact.${index}`);
  const isPrimary = contact?.is_primary ?? false;
  const initial = (contact?.name?.trim()[0] || "?").toUpperCase();

  return (
    <div
      className={cn(
        "border-border/60 bg-card hover:border-primary/40 relative rounded-xl border p-3 transition-colors",
        isPrimary && "border-primary/40 bg-primary/5",
      )}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="text-primary-foreground flex size-9 items-center justify-center rounded-lg bg-primary font-serif text-base font-semibold">
            {initial}
          </div>
          {isPrimary && (
            <div className="bg-primary text-primary-foreground absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full">
              <Star className="size-2.5 fill-current" />
            </div>
          )}
        </div>

        {/* Name + primary badge */}
        <div className="min-w-0 flex-1 space-y-1">
          {isView ? (
            <div>
              <div className="text-foreground truncate text-sm font-semibold tracking-tight">
                {contact.name || "—"}
              </div>
              {isPrimary && (
                <span className="bg-primary/10 text-primary mt-0.5 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.5625rem] font-bold tracking-widest uppercase">
                  <CheckCircle2 className="size-2.5" />
                  {t("contact.primary")}
                </span>
              )}
            </div>
          ) : (
            <Field>
              <Input
                placeholder={t("contact.namePlaceholder")}
                disabled={isDisabled}
                maxLength={100}
                className={cn(
                  "border-border/40 hover:border-foreground/50 focus-visible:border-primary h-8 rounded-md border bg-transparent text-sm font-semibold shadow-none transition-colors focus-visible:ring-0",
                  errors?.name && "border-destructive",
                )}
                {...form.register(`vendor_contact.${index}.name`)}
              />
              {errors?.name && <FieldError>{errors.name.message}</FieldError>}
            </Field>
          )}
        </div>

        {/* Primary checkbox + remove */}
        {!isView && (
          <div className="flex items-center gap-1">
            <label className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-[0.5625rem] font-semibold tracking-widest uppercase transition-colors">
              <Checkbox
                checked={isPrimary}
                onCheckedChange={(c) => onSetPrimary(!!c)}
                disabled={isDisabled}
                aria-label={t("contact.primary")}
              />
              <span>{t("contact.primary")}</span>
            </label>
            <Button
              type="button"
              size="icon-xs"
              aria-label={t("contact.removeContact")}
              onClick={onRemove}
              className="bg-primary/10 text-muted-foreground hover:text-destructive hover:bg-primary/20 rounded-md"
            >
              <X />
            </Button>
          </div>
        )}
      </div>

      {/* Email + Phone row */}
      <div className="border-border/40 mt-3 grid grid-cols-1 gap-2 border-t pt-3 md:grid-cols-2">
        <ContactSubField
          icon={Mail}
          isView={isView}
          isDisabled={isDisabled}
          value={contact?.email}
          placeholder={t("contact.emailPlaceholder")}
          register={form.register(`vendor_contact.${index}.email`)}
          error={errors?.email?.message}
          href={contact?.email ? `mailto:${contact.email}` : undefined}
          type="email"
        />
        <ContactSubField
          icon={Phone}
          isView={isView}
          isDisabled={isDisabled}
          value={contact?.phone}
          placeholder={t("contact.phonePlaceholder")}
          register={form.register(`vendor_contact.${index}.phone`)}
          href={contact?.phone ? `tel:${contact.phone}` : undefined}
        />
      </div>
    </div>
  );
}

function ContactSubField({
  icon: Icon,
  isView,
  isDisabled,
  value,
  placeholder,
  register,
  error,
  href,
  type = "text",
}: {
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly isView: boolean;
  readonly isDisabled: boolean;
  readonly value?: string;
  readonly placeholder: string;
  readonly register: ReturnType<
    ReturnType<typeof useForm<VendorFormValues>>["register"]
  >;
  readonly error?: string;
  readonly href?: string;
  readonly type?: string;
}) {
  "use no memo";
  if (isView) {
    if (!value) {
      return (
        <div className="text-muted-foreground flex items-center gap-2 text-[0.6875rem]">
          <Icon className="size-3 shrink-0" />
          <span className="italic">—</span>
        </div>
      );
    }
    if (href) {
      return (
        <a
          href={href}
          className="text-muted-foreground hover:text-primary flex items-center gap-2 text-[0.6875rem] transition-colors"
        >
          <Icon className="size-3 shrink-0" />
          <span className="truncate">{value}</span>
        </a>
      );
    }
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-[0.6875rem]">
        <Icon className="size-3 shrink-0" />
        <span className="truncate">{value}</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <Icon className="text-muted-foreground size-3 shrink-0" />
        <Input
          type={type}
          placeholder={placeholder}
          disabled={isDisabled}
          maxLength={type === "email" ? 100 : 20}
          className={cn(
            "border-border/40 hover:border-foreground/50 focus-visible:border-primary h-7 flex-1 rounded-md border bg-transparent text-[0.6875rem] shadow-none transition-colors focus-visible:ring-0",
            error && "border-destructive",
          )}
          {...register}
        />
      </div>
      {error && <FieldError className="mt-1 ml-4.5">{error}</FieldError>}
    </div>
  );
}

function EmptyContacts({
  isView,
  title,
  description,
  addLabel,
  onAdd,
}: {
  readonly isView: boolean;
  readonly title: string;
  readonly description: string;
  readonly addLabel: string;
  readonly onAdd: () => void;
}) {
  "use no memo";
  return (
    <div className="border-primary/35 bg-primary/5 rounded-xl border border-dashed p-6 text-center">
      <div className="text-primary-foreground mx-auto mb-2 flex size-9 items-center justify-center rounded-xl bg-primary">
        <User className="size-4" />
      </div>
      <div className="text-foreground text-xs font-semibold">{title}</div>
      <p className="text-muted-foreground mt-0.5 text-[0.6875rem]">
        {description}
      </p>
      {!isView && (
        <Button
          type="button"
          size="xs"
          onClick={onAdd}
          className="mt-2 rounded-full"
        >
          <Plus />
          {addLabel}
        </Button>
      )}
    </div>
  );
}
