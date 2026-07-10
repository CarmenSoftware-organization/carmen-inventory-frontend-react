import { useState } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { LookupCurrency } from "@/components/lookup/lookup-currency";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { useProfile } from "@/hooks/use-profile";
import { useDiscardConfirm } from "@/hooks/use-discard-confirm";
import { useNavigationGuard } from "@/hooks/use-navigation-guard";
import {
  useBusinessUnit,
  useUpdateBusinessUnit,
} from "@/hooks/use-business-unit";
import type { BusinessUnitNumberFormat } from "@/types/business-unit";
import {
  SettingSection,
  SettingSectionSkeleton,
} from "@/components/ui/setting-section";
import {
  SettingField,
  EditableField,
  SelectField,
  NumberFormatField,
  ConfigField,
} from "./business-setting-ui";
import {
  TIMEZONES,
  DATE_FORMATS,
  DATE_TIME_FORMATS,
  TIME_FORMATS,
  SHORT_TIME_FORMATS,
  LONG_TIME_FORMATS,
  LOCALES,
} from "./business-setting-options";
import {
  createBusinessSettingSchema,
  toFormValues,
  buildPatch,
  normalizeConfig,
  mergeSeededConfig,
  type BusinessSettingFormValues,
} from "./business-setting-form-schema";
import {
  groupConfigForRender,
  resolveConfigOptions,
} from "./business-setting-config-registry";

/**
 * หน้า Business Setting (system-admin) — แสดง/แก้ไขรายละเอียด business unit ปัจจุบัน
 * (จาก `useProfile().defaultBu`) จัดเป็น section ตาม layout settings
 *
 * โหมด view = read-only, กด Edit → field กลายเป็น input (toggle ในหน้าเดียว)
 * Save ส่งเฉพาะ field ที่เปลี่ยน (`PATCH` partial). ดึงข้อมูลจาก
 * `GET api/business-units` — แสดงทุก field ยกเว้น `users[]`
 *
 * @returns React element ของหน้า business setting
 */

export default function BusinessSettingComponent() {
  const tm = useTranslations("modules");
  const t = useTranslations("businessSetting");
  const tv = useTranslations("validation");
  const tf = useTranslations("businessSetting.fields");
  const { defaultBu, isProfileReady } = useProfile();
  const buId = defaultBu?.id;
  const { data, isLoading, isError, refetch } = useBusinessUnit(buId);
  const update = useUpdateBusinessUnit(buId);
  const [editing, setEditing] = useState(false);

  const form = useForm<BusinessSettingFormValues>({
    resolver: zodResolver(
      createBusinessSettingSchema(tv, tf),
    ) as Resolver<BusinessSettingFormValues>,
    values: data ? toFormValues(data) : undefined,
  });

  const fmtNumber = (f: BusinessUnitNumberFormat | null | undefined) =>
    f
      ? `${f.locales} · ${t("minDigits", { n: f.minimumIntegerDigits })}`
      : null;

  const configGroups = data
    ? groupConfigForRender(mergeSeededConfig(normalizeConfig(data.config)))
    : { sections: [], other: [] };
  const isBusy = !isProfileReady || isLoading;

  // มีการแก้ค้าง (dirty) ระหว่างโหมด edit → กัน discard โดยไม่ได้ตั้งใจ
  const hasUnsaved = editing && form.formState.isDirty;
  const discard = useDiscardConfirm({
    isDirty: hasUnsaved,
    isPending: update.isPending,
  });
  const navGuard = useNavigationGuard(hasUnsaved);

  const exitEdit = () => {
    if (data) form.reset(toFormValues(data));
    setEditing(false);
  };

  const handleEdit = () => {
    if (data) form.reset(toFormValues(data));
    setEditing(true);
  };

  // กด Cancel ตอนมีการแก้ค้าง → confirm ก่อน (ผ่าน useDiscardConfirm)
  const handleCancel = () => discard.confirm(exitEdit);

  const onSubmit = form.handleSubmit((values) => {
    if (!data) return;
    const patch = buildPatch(values, toFormValues(data));
    if (Object.keys(patch).length === 0) {
      setEditing(false);
      return;
    }
    // แนบ doc_version (optimistic lock) ไปกับ payload เพื่อกัน 409 version ค้าง
    update.mutate(
      { ...patch, doc_version: data.doc_version },
      {
        onSuccess: () => {
          toast.success(t("saved"));
          setEditing(false);
        },
        onError: (e) => toast.error(e.message || t("saveError")),
      },
    );
  });

  return (
    <div className="mx-auto max-w-4xl p-[max(1rem,env(safe-area-inset-bottom))]">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            {tm("businessSetting")}
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {t("pageDescription")}
          </p>
        </div>
        {!isError && !isBusy && data && (
          <div className="flex shrink-0 items-center gap-2">
            {editing ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={update.isPending}
                >
                  <X className="size-3.5" aria-hidden="true" />
                  {t("cancel")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={onSubmit}
                  disabled={update.isPending}
                >
                  {update.isPending ? (
                    <Loader2
                      className="size-3.5 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Save className="size-3.5" aria-hidden="true" />
                  )}
                  {t("save")}
                </Button>
              </>
            ) : (
              <Button type="button" size="sm" onClick={handleEdit}>
                <Pencil className="size-3.5" aria-hidden="true" />
                {t("edit")}
              </Button>
            )}
          </div>
        )}
      </header>

      {isError && (
        <ErrorState message={t("loadError")} onRetry={() => refetch()} />
      )}

      {!isError && isBusy && (
        <div>
          {/* mirror each real section's field layout so the skeleton is as tall */}
          <SettingSectionSkeleton
            first
            fields={[
              "half",
              "half",
              "half",
              "full",
              "full",
              "half",
              "half",
              "half",
              "half",
            ]}
          />
          <SettingSectionSkeleton
            fields={["full", "half", "half", "full", "half"]}
          />
          <SettingSectionSkeleton
            fields={["full", "half", "half", "half", "half", "full", "half"]}
          />
          <SettingSectionSkeleton fields={["half", "half"]} />
          <SettingSectionSkeleton
            fields={["half", "half", "half", "half", "half", "half"]}
          />
          <SettingSectionSkeleton fields={["half", "half", "half", "half"]} />
        </div>
      )}

      {!isError && !isBusy && data && (
        <form onSubmit={onSubmit}>
          {/* General */}
          <SettingSection
            first
            title={t("sections.general")}
            description={t("sections.generalDesc")}
          >
            <EditableField
              editing={editing}
              form={form}
              name="name"
              label={t("fields.name")}
              description={t("fields.nameDesc")}
              displayValue={data.name}
            />
            <EditableField
              editing={editing}
              form={form}
              name="alias_name"
              label={t("fields.aliasName")}
              description={t("fields.aliasNameDesc")}
              displayValue={data.alias_name}
            />
            <SettingField
              label={t("fields.clusterName")}
              description={t("fields.clusterNameDesc")}
              value={data.cluster_name}
            />
            <EditableField
              editing={editing}
              form={form}
              name="description"
              type="textarea"
              label={t("fields.description")}
              description={t("fields.descriptionDesc")}
              displayValue={data.description}
              fullWidth
            />
            <EditableField
              editing={editing}
              form={form}
              name="info"
              label={t("fields.info")}
              description={t("fields.infoDesc")}
              displayValue={data.info}
              fullWidth
            />
            {/* costing method + max license users: read-only เสมอ (แก้ผ่านหน้านี้ไม่ได้) */}
            <SettingField
              label={t("fields.calculationMethod")}
              description={t("fields.calculationMethodDesc")}
              value={data.calculation_method}
            />
            <SettingField
              label={t("fields.maxLicenseUsers")}
              description={t("fields.maxLicenseUsersDesc")}
              value={data.max_license_users}
            />
            <div className="min-w-0 space-y-1">
              <div className="text-foreground text-xs font-semibold">
                {t("fields.defaultCurrencyId")}
              </div>
              <p className="text-muted-foreground/80 text-[0.6875rem] leading-snug">
                {t("fields.defaultCurrencyIdDesc")}
              </p>
              <Controller
                control={form.control}
                name="default_currency_id"
                render={({ field }) => (
                  <LookupCurrency
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    readOnly={!editing}
                  />
                )}
              />
            </div>
          </SettingSection>

          {/* Hotel */}
          <SettingSection
            title={t("sections.hotel")}
            description={t("sections.hotelDesc")}
          >
            <EditableField
              editing={editing}
              form={form}
              name="hotel_name"
              label={t("fields.hotelName")}
              description={t("fields.hotelNameDesc")}
              displayValue={data.hotel_name}
              fullWidth
            />
            <EditableField
              editing={editing}
              form={form}
              name="hotel_email"
              label={t("fields.hotelEmail")}
              description={t("fields.hotelEmailDesc")}
              displayValue={data.hotel_email}
            />
            <EditableField
              editing={editing}
              form={form}
              name="hotel_tel"
              label={t("fields.hotelTel")}
              description={t("fields.hotelTelDesc")}
              displayValue={data.hotel_tel}
            />
            <EditableField
              editing={editing}
              form={form}
              name="hotel_address_line1"
              label={t("fields.hotelAddressLine1")}
              description={t("fields.hotelAddressLine1Desc")}
              displayValue={data.hotel_address_line1}
              fullWidth
            />
            <EditableField
              editing={editing}
              form={form}
              name="hotel_address_line2"
              label={t("fields.hotelAddressLine2")}
              description={t("fields.hotelAddressLine2Desc")}
              displayValue={data.hotel_address_line2}
              fullWidth
            />
            <EditableField
              editing={editing}
              form={form}
              name="hotel_sub_district"
              label={t("fields.hotelSubDistrict")}
              description={t("fields.hotelSubDistrictDesc")}
              displayValue={data.hotel_sub_district}
            />
            <EditableField
              editing={editing}
              form={form}
              name="hotel_district"
              label={t("fields.hotelDistrict")}
              description={t("fields.hotelDistrictDesc")}
              displayValue={data.hotel_district}
            />
            <EditableField
              editing={editing}
              form={form}
              name="hotel_city"
              label={t("fields.hotelCity")}
              description={t("fields.hotelCityDesc")}
              displayValue={data.hotel_city}
            />
            <EditableField
              editing={editing}
              form={form}
              name="hotel_province"
              label={t("fields.hotelProvince")}
              description={t("fields.hotelProvinceDesc")}
              displayValue={data.hotel_province}
            />
            <EditableField
              editing={editing}
              form={form}
              name="hotel_postal_code"
              label={t("fields.hotelPostalCode")}
              description={t("fields.hotelPostalCodeDesc")}
              displayValue={data.hotel_postal_code}
            />
            <EditableField
              editing={editing}
              form={form}
              name="hotel_country"
              label={t("fields.hotelCountry")}
              description={t("fields.hotelCountryDesc")}
              displayValue={data.hotel_country}
            />
            <EditableField
              editing={editing}
              form={form}
              name="hotel_latitude"
              label={t("fields.hotelLatitude")}
              description={t("fields.hotelLatitudeDesc")}
              displayValue={data.hotel_latitude}
            />
            <EditableField
              editing={editing}
              form={form}
              name="hotel_longitude"
              label={t("fields.hotelLongitude")}
              description={t("fields.hotelLongitudeDesc")}
              displayValue={data.hotel_longitude}
            />
          </SettingSection>

          {/* Company */}
          <SettingSection
            title={t("sections.company")}
            description={t("sections.companyDesc")}
          >
            <EditableField
              editing={editing}
              form={form}
              name="company_name"
              label={t("fields.companyName")}
              description={t("fields.companyNameDesc")}
              displayValue={data.company_name}
              fullWidth
            />
            <EditableField
              editing={editing}
              form={form}
              name="branch_no"
              label={t("fields.branchNo")}
              description={t("fields.branchNoDesc")}
              displayValue={data.branch_no}
            />
            <EditableField
              editing={editing}
              form={form}
              name="tax_no"
              label={t("fields.taxNo")}
              description={t("fields.taxNoDesc")}
              displayValue={data.tax_no}
            />
            <EditableField
              editing={editing}
              form={form}
              name="company_email"
              label={t("fields.companyEmail")}
              description={t("fields.companyEmailDesc")}
              displayValue={data.company_email}
            />
            <EditableField
              editing={editing}
              form={form}
              name="company_tel"
              label={t("fields.companyTel")}
              description={t("fields.companyTelDesc")}
              displayValue={data.company_tel}
            />
            <EditableField
              editing={editing}
              form={form}
              name="company_address_line1"
              label={t("fields.companyAddressLine1")}
              description={t("fields.companyAddressLine1Desc")}
              displayValue={data.company_address_line1}
              fullWidth
            />
            <EditableField
              editing={editing}
              form={form}
              name="company_address_line2"
              label={t("fields.companyAddressLine2")}
              description={t("fields.companyAddressLine2Desc")}
              displayValue={data.company_address_line2}
              fullWidth
            />
            <EditableField
              editing={editing}
              form={form}
              name="company_sub_district"
              label={t("fields.companySubDistrict")}
              description={t("fields.companySubDistrictDesc")}
              displayValue={data.company_sub_district}
            />
            <EditableField
              editing={editing}
              form={form}
              name="company_district"
              label={t("fields.companyDistrict")}
              description={t("fields.companyDistrictDesc")}
              displayValue={data.company_district}
            />
            <EditableField
              editing={editing}
              form={form}
              name="company_city"
              label={t("fields.companyCity")}
              description={t("fields.companyCityDesc")}
              displayValue={data.company_city}
            />
            <EditableField
              editing={editing}
              form={form}
              name="company_province"
              label={t("fields.companyProvince")}
              description={t("fields.companyProvinceDesc")}
              displayValue={data.company_province}
            />
            <EditableField
              editing={editing}
              form={form}
              name="company_postal_code"
              label={t("fields.companyPostalCode")}
              description={t("fields.companyPostalCodeDesc")}
              displayValue={data.company_postal_code}
            />
            <EditableField
              editing={editing}
              form={form}
              name="company_country"
              label={t("fields.companyCountry")}
              description={t("fields.companyCountryDesc")}
              displayValue={data.company_country}
            />
            <EditableField
              editing={editing}
              form={form}
              name="company_latitude"
              label={t("fields.companyLatitude")}
              description={t("fields.companyLatitudeDesc")}
              displayValue={data.company_latitude}
            />
            <EditableField
              editing={editing}
              form={form}
              name="company_longitude"
              label={t("fields.companyLongitude")}
              description={t("fields.companyLongitudeDesc")}
              displayValue={data.company_longitude}
            />
          </SettingSection>

          {/* Branding (read-only — upload flow อยู่ที่หน้า profile) */}
          <SettingSection
            title={t("sections.branding")}
            description={t("sections.brandingDesc")}
          >
            <SettingField
              label={t("fields.logo")}
              description={t("fields.logoDesc")}
            >
              <BrandImage url={data.logo?.url} shape="landscape" />
            </SettingField>
            <SettingField
              label={t("fields.avatar")}
              description={t("fields.avatarDesc")}
            >
              <BrandImage url={data.avatar?.url} shape="round" />
            </SettingField>
          </SettingSection>

          {/* Date & Time */}
          <SettingSection
            title={t("sections.dateTime")}
            description={t("sections.dateTimeDesc")}
          >
            <SelectField
              editing={editing}
              form={form}
              name="timezone"
              options={TIMEZONES}
              label={t("fields.timezone")}
              description={t("fields.timezoneDesc")}
              placeholder={t("fields.timezone")}
              displayValue={data.timezone}
            />
            <SelectField
              editing={editing}
              form={form}
              name="date_format"
              options={DATE_FORMATS}
              label={t("fields.dateFormat")}
              description={t("fields.dateFormatDesc")}
              placeholder={t("fields.dateFormat")}
              displayValue={data.date_format}
            />
            <SelectField
              editing={editing}
              form={form}
              name="date_time_format"
              options={DATE_TIME_FORMATS}
              label={t("fields.dateTimeFormat")}
              description={t("fields.dateTimeFormatDesc")}
              placeholder={t("fields.dateTimeFormat")}
              displayValue={data.date_time_format}
            />
            <SelectField
              editing={editing}
              form={form}
              name="time_format"
              options={TIME_FORMATS}
              label={t("fields.timeFormat")}
              description={t("fields.timeFormatDesc")}
              placeholder={t("fields.timeFormat")}
              displayValue={data.time_format}
            />
            <SelectField
              editing={editing}
              form={form}
              name="short_time_format"
              options={SHORT_TIME_FORMATS}
              label={t("fields.shortTimeFormat")}
              description={t("fields.shortTimeFormatDesc")}
              placeholder={t("fields.shortTimeFormat")}
              displayValue={data.short_time_format}
            />
            <SelectField
              editing={editing}
              form={form}
              name="long_time_format"
              options={LONG_TIME_FORMATS}
              label={t("fields.longTimeFormat")}
              description={t("fields.longTimeFormatDesc")}
              placeholder={t("fields.longTimeFormat")}
              displayValue={data.long_time_format}
            />
          </SettingSection>

          {/* Number Formats */}
          <SettingSection
            title={t("sections.numberFormats")}
            description={t("sections.numberFormatsDesc")}
          >
            <NumberFormatField
              editing={editing}
              form={form}
              name="amount_format"
              label={t("fields.amountFormat")}
              description={t("fields.amountFormatDesc")}
              displayValue={fmtNumber(data.amount_format)}
              localeOptions={LOCALES}
              localesPlaceholder={t("fields.locales")}
              digitsPlaceholder={t("fields.minimumIntegerDigits")}
            />
            <NumberFormatField
              editing={editing}
              form={form}
              name="quantity_format"
              label={t("fields.quantityFormat")}
              description={t("fields.quantityFormatDesc")}
              displayValue={fmtNumber(data.quantity_format)}
              localeOptions={LOCALES}
              localesPlaceholder={t("fields.locales")}
              digitsPlaceholder={t("fields.minimumIntegerDigits")}
            />
            <NumberFormatField
              editing={editing}
              form={form}
              name="perpage_format"
              label={t("fields.perpageFormat")}
              description={t("fields.perpageFormatDesc")}
              displayValue={fmtNumber(data.perpage_format)}
              localeOptions={LOCALES}
              localesPlaceholder={t("fields.locales")}
              digitsPlaceholder={t("fields.minimumIntegerDigits")}
            />
            <NumberFormatField
              editing={editing}
              form={form}
              name="recipe_format"
              label={t("fields.recipeFormat")}
              description={t("fields.recipeFormatDesc")}
              displayValue={fmtNumber(data.recipe_format)}
              localeOptions={LOCALES}
              localesPlaceholder={t("fields.locales")}
              digitsPlaceholder={t("fields.minimumIntegerDigits")}
            />
          </SettingSection>

          {/* Registry sections (เช่น PR) — seeded config จัดกลุ่มตาม section */}
          {configGroups.sections.map((section) => (
            <SettingSection
              key={section.id}
              title={t(section.titleKey)}
              description={t(section.descKey)}
            >
              {section.entries.map((entry) => {
                const options = entry.options
                  ? resolveConfigOptions(
                      entry.options,
                      data.calculation_method,
                      entry.item.value,
                    ).map((o) => ({ value: o.value, label: t(o.labelKey) }))
                  : undefined;
                return (
                  <ConfigField
                    key={entry.item.key}
                    editing={editing}
                    form={form}
                    index={entry.index}
                    item={entry.item}
                    label={t(entry.labelKey)}
                    yesLabel={t("yes")}
                    noLabel={t("no")}
                    options={options}
                  />
                );
              })}
            </SettingSection>
          ))}

          {/* Configuration — config จาก backend ที่ไม่อยู่ใน registry section */}
          <SettingSection
            title={t("sections.config")}
            description={t("sections.configDesc")}
          >
            {configGroups.other.length === 0 ? (
              <p className="text-muted-foreground/70 text-sm sm:col-span-2">
                {t("configEmpty")}
              </p>
            ) : (
              configGroups.other.map((entry) => (
                <ConfigField
                  key={entry.item.key}
                  editing={editing}
                  form={form}
                  index={entry.index}
                  item={entry.item}
                  yesLabel={t("yes")}
                  noLabel={t("no")}
                />
              ))
            )}
          </SettingSection>
        </form>
      )}

      {/* Cancel ตอนมีการแก้ค้าง */}
      <DiscardDialog {...discard.dialogProps} variant="warning" />
      {/* นำทางออก/กด back ระหว่างแก้ค้าง */}
      <DiscardDialog
        open={navGuard.isOpen}
        onOpenChange={(o) => {
          if (!o) navGuard.cancel();
        }}
        onConfirm={navGuard.confirm}
        onCancel={navGuard.cancel}
        variant="warning"
      />
    </div>
  );
}

/** รูป branding (logo/avatar) แบบ read-only — landscape หรือ round */
function BrandImage({
  url,
  shape,
}: {
  readonly url: string | undefined;
  readonly shape: "landscape" | "round";
}) {
  const t = useTranslations("businessSetting");
  const box =
    shape === "landscape" ? "h-16 w-32 rounded-md" : "size-16 rounded-full";
  const fit = shape === "landscape" ? "object-contain" : "object-cover";
  return (
    <div
      className={`bg-muted/50 relative flex items-center justify-center overflow-hidden border ${box}`}
    >
      {url ? (
        <img
          src={url}
          alt=""
          className={`absolute inset-0 size-full ${fit}`}
          loading="lazy"
        />
      ) : (
        <span className="text-muted-foreground/60 text-[0.625rem]">
          {t("noImage")}
        </span>
      )}
    </div>
  );
}
