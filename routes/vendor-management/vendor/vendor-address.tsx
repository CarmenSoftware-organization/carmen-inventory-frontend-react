"use no memo";

import { useEffect, useState } from "react";
import { Controller, type useFieldArray, type useForm } from "react-hook-form";
import { useTranslations } from "use-intl";
import { useQueryClient } from "@tanstack/react-query";
import type { VendorFormValues } from "./vendor-form-schema";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ADDRESS_TYPE_OPTIONS } from "@/constant/vendor";
import { MapPin, Plus, X } from "lucide-react";
import { EMPTY_VENDOR_ADDRESS } from "./vendor-form-schema";
import { LookupThaiProvince } from "@/components/lookup/lookup-thai-province";
import { LookupThaiDistrict } from "@/components/lookup/lookup-thai-district";
import { LookupThaiSubDistrict } from "@/components/lookup/lookup-thai-subdistrict";
import type {
  ThaiDistrict,
  ThaiProvince,
  ThaiSubDistrict,
} from "@/hooks/use-thai-address";
import { CACHE_STATIC } from "@/lib/cache-config";
import { cn } from "@/lib/utils";
import { CardLabel, GlassCard } from "@/components/share/glass-card";

interface VendorAddressTabProps {
  form: ReturnType<typeof useForm<VendorFormValues>>;
  isDisabled: boolean;
  addressFields: ReturnType<
    typeof useFieldArray<VendorFormValues, "vendor_address">
  >["fields"];
  prependAddress: ReturnType<
    typeof useFieldArray<VendorFormValues, "vendor_address">
  >["prepend"];
  removeAddress: (index: number) => void;
}

export function VendorAddress({
  form,
  isDisabled,
  addressFields,
  prependAddress,
  removeAddress,
}: VendorAddressTabProps) {
  const t = useTranslations("vendorManagement.vendor");
  const isView = isDisabled && !form.formState.isSubmitting;
  const handleAdd = () => prependAddress(EMPTY_VENDOR_ADDRESS);

  return (
    <GlassCard>
      <div className="mb-3 flex items-center justify-between">
        <CardLabel>
          {t("address.titleCount", { count: addressFields.length })}
        </CardLabel>
        {!isView && (
          <Button type="button" size="xs" onClick={handleAdd}>
            <Plus />
            {t("address.addAddress")}
          </Button>
        )}
      </div>

      {addressFields.length === 0 ? (
        <div className="border-primary/35 bg-primary/5 rounded-xl border border-dashed p-6 text-center">
          <div className="text-primary-foreground mx-auto mb-2 flex size-9 items-center justify-center rounded-xl bg-primary">
            <MapPin className="size-4" />
          </div>
          <div className="text-foreground text-xs font-semibold">
            {t("address.noAddresses")}
          </div>
          <p className="text-muted-foreground mt-0.5 text-[0.6875rem]">
            {t("address.noAddressesDesc")}
          </p>
          {!isView && (
            <Button
              type="button"
              size="xs"
              onClick={handleAdd}
              className="mt-2 rounded-full"
            >
              <Plus />
              {t("address.addAddress")}
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {addressFields.map((field, index) => (
            <AddressRow
              key={field.id}
              form={form}
              index={index}
              isDisabled={isDisabled}
              onRemove={() => removeAddress(index)}
            />
          ))}
        </div>
      )}
    </GlassCard>
  );
}

interface AddressRowProps {
  form: ReturnType<typeof useForm<VendorFormValues>>;
  index: number;
  isDisabled: boolean;
  onRemove: () => void;
}

const AddressRow = ({ form, index, isDisabled, onRemove }: AddressRowProps) => {
  const t = useTranslations("vendorManagement.vendor");
  const addressTypeLabels: Record<string, string> = {
    contact_address: t("address.contactAddress"),
    mailing_address: t("address.mailingAddress"),
    register_address: t("address.registeredAddress"),
  };
  const hasError =
    !!form.formState.errors.vendor_address?.[index]?.address_type;
  const initialCountry =
    form.getValues(`vendor_address.${index}.country`) ?? "";
  const [isThai, setIsThai] = useState(
    !initialCountry || initialCountry === "Thailand",
  );
  const [provinceCode, setProvinceCode] = useState<number | "">("");
  const [districtCode, setDistrictCode] = useState<number | "">("");
  const [subdistrictCode, setSubdistrictCode] = useState<number | "">("");
  const queryClient = useQueryClient();

  const resolveFromPostalCode = async (postalCode: string) => {
    if (postalCode.length !== 5) return;

    const [allSub, allDist, allProv] = await Promise.all([
      queryClient.ensureQueryData<ThaiSubDistrict[]>({
        queryKey: ["thai-subdistricts-all"],
        queryFn: () =>
          fetch("/data/thai-subdistricts.json").then((r) => r.json()),
        ...CACHE_STATIC,
      }),
      queryClient.ensureQueryData<ThaiDistrict[]>({
        queryKey: ["thai-districts-all"],
        queryFn: () => fetch("/data/thai-districts.json").then((r) => r.json()),
        ...CACHE_STATIC,
      }),
      queryClient.ensureQueryData<ThaiProvince[]>({
        queryKey: ["thai-provinces"],
        queryFn: () => fetch("/data/thai-provinces.json").then((r) => r.json()),
        ...CACHE_STATIC,
      }),
    ]);

    const matches = allSub.filter((d) => d.postalCode === Number(postalCode));
    if (matches.length === 0) return;

    const first = matches[0];
    const district = allDist.find((d) => d.districtCode === first.districtCode);
    const province = allProv.find((p) => p.provinceCode === first.provinceCode);

    setProvinceCode(first.provinceCode);
    setDistrictCode(first.districtCode);
    form.setValue(
      `vendor_address.${index}.province`,
      province?.provinceNameEn ?? "",
    );
    form.setValue(
      `vendor_address.${index}.district`,
      district?.districtNameEn ?? "",
    );

    form.setValue(`vendor_address.${index}.country`, "Thailand");

    if (matches.length === 1) {
      setSubdistrictCode(matches[0].subdistrictCode);
      form.setValue(
        `vendor_address.${index}.sub_district`,
        matches[0].subdistrictNameEn,
      );
    } else {
      setSubdistrictCode("");
      form.setValue(`vendor_address.${index}.sub_district`, "");
    }
  };

  // Resolve dropdown states from existing address data on mount
  useEffect(() => {
    const postalCode =
      form.getValues(`vendor_address.${index}.postal_code`) ?? "";
    const savedSubDistrict =
      form.getValues(`vendor_address.${index}.sub_district`) ?? "";
    if (postalCode && isThai) {
      resolveFromPostalCode(postalCode).then(async () => {
        // If sub_district name was saved, resolve its code for the dropdown
        if (!savedSubDistrict) return;
        const allSub = await queryClient.ensureQueryData<ThaiSubDistrict[]>({
          queryKey: ["thai-subdistricts-all"],
          queryFn: () =>
            fetch("/data/thai-subdistricts.json").then((r) => r.json()),
          ...CACHE_STATIC,
        });
        const match = allSub.find(
          (s) =>
            s.postalCode === Number(postalCode) &&
            s.subdistrictNameEn === savedSubDistrict,
        );
        if (match) {
          setSubdistrictCode(match.subdistrictCode);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePostalCodeChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value;
    form.setValue(`vendor_address.${index}.postal_code`, value);
    if (isThai) {
      await resolveFromPostalCode(value);
    }
  };

  const handleLocationChange = (value: string) => {
    const isThailand = value === "thai";
    setIsThai(isThailand);

    if (!isThailand) {
      // Switching to International - reset Thai selections
      setProvinceCode("");
      setDistrictCode("");
      setSubdistrictCode("");
    } else {
      // Switching to Thailand - auto-fill country
      form.setValue(`vendor_address.${index}.country`, "Thailand");
    }
  };

  return (
    <div className="border-border/60 bg-card rounded-xl border p-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Controller
            control={form.control}
            name={`vendor_address.${index}.address_type`}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isDisabled}
              >
                <SelectTrigger
                  className={cn(
                    "h-7 w-40 rounded-md text-xs",
                    hasError && "border-destructive",
                  )}
                >
                  <SelectValue placeholder={t("address.typePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {ADDRESS_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {addressTypeLabels[opt.value] ?? opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <RadioGroup
            value={isThai ? "thai" : "international"}
            onValueChange={handleLocationChange}
            disabled={isDisabled}
            className="flex items-center gap-2"
          >
            <div className="flex items-center gap-1">
              <RadioGroupItem value="thai" id={`thai-${index}`} />
              <Label
                htmlFor={`thai-${index}`}
                className="cursor-pointer text-[0.6875rem] font-normal"
              >
                {t("address.thailand")}
              </Label>
            </div>
            <div className="flex items-center gap-1">
              <RadioGroupItem
                value="international"
                id={`international-${index}`}
              />
              <Label
                htmlFor={`international-${index}`}
                className="cursor-pointer text-[0.6875rem] font-normal"
              >
                {t("address.international")}
              </Label>
            </div>
          </RadioGroup>
        </div>
        {!isDisabled && (
          <Button
            type="button"
            size="icon-xs"
            aria-label={t("address.removeAddress")}
            onClick={onRemove}
            className="bg-primary/10 text-muted-foreground hover:text-destructive hover:bg-primary/20 rounded-md"
          >
            <X />
          </Button>
        )}
      </div>
      <div className="space-y-2">
        <Input
          placeholder={t("address.addressLine1")}
          className="h-7 text-xs"
          disabled={isDisabled}
          maxLength={256}
          {...form.register(`vendor_address.${index}.address_line1`)}
        />

        <Input
          placeholder={t("address.addressLine2")}
          className="h-7 text-xs"
          disabled={isDisabled}
          maxLength={256}
          {...form.register(`vendor_address.${index}.address_line2`)}
        />

        {isThai ? (
          <>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <LookupThaiProvince
                value={provinceCode}
                onValueChange={(code) => {
                  setProvinceCode(code);
                  setDistrictCode("");
                  setSubdistrictCode("");
                }}
                onItemChange={(province) => {
                  form.setValue(
                    `vendor_address.${index}.province`,
                    province.provinceNameEn,
                  );
                  form.setValue(`vendor_address.${index}.district`, "");
                  form.setValue(`vendor_address.${index}.sub_district`, "");
                  form.setValue(`vendor_address.${index}.postal_code`, "");
                }}
                disabled={isDisabled}
                className="h-7 text-xs"
              />
              <LookupThaiDistrict
                provinceCode={provinceCode}
                value={districtCode}
                onValueChange={(code) => {
                  setDistrictCode(code);
                  setSubdistrictCode("");
                }}
                onItemChange={(district) => {
                  form.setValue(
                    `vendor_address.${index}.district`,
                    district.districtNameEn,
                  );
                  form.setValue(`vendor_address.${index}.sub_district`, "");
                  form.setValue(`vendor_address.${index}.postal_code`, "");
                }}
                disabled={isDisabled}
                className="h-7 text-xs"
              />
              <LookupThaiSubDistrict
                districtCode={districtCode}
                value={subdistrictCode}
                onValueChange={setSubdistrictCode}
                onItemChange={(subdistrict) => {
                  form.setValue(
                    `vendor_address.${index}.sub_district`,
                    subdistrict.subdistrictNameEn,
                  );
                  form.setValue(
                    `vendor_address.${index}.postal_code`,
                    subdistrict.postalCode.toString(),
                  );
                }}
                disabled={isDisabled}
                className="h-7 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder={t("address.postalCodeAuto")}
                className="h-7 text-xs"
                disabled={isDisabled}
                maxLength={5}
                {...form.register(`vendor_address.${index}.postal_code`, {
                  onChange: handlePostalCodeChange,
                })}
              />
              <Input
                placeholder={t("address.country")}
                className="h-7 text-xs"
                disabled
                value="Thailand"
                readOnly
              />
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1">
                <Input
                  placeholder={t("address.city")}
                  className={`h-7 text-xs${form.formState.errors.vendor_address?.[index]?.city ? "ring-destructive ring-1" : ""}`}
                  disabled={isDisabled}
                  maxLength={100}
                  {...form.register(`vendor_address.${index}.city`)}
                />
                {form.formState.errors.vendor_address?.[index]?.city && (
                  <p className="text-destructive text-[0.625rem]">
                    {form.formState.errors.vendor_address[index].city.message}
                  </p>
                )}
              </div>
              <Input
                placeholder={t("address.district")}
                className="h-7 text-xs"
                disabled={isDisabled}
                maxLength={100}
                {...form.register(`vendor_address.${index}.district`)}
              />
              <Input
                placeholder={t("address.subDistrict")}
                className="h-7 text-xs"
                disabled={isDisabled}
                maxLength={100}
                {...form.register(`vendor_address.${index}.sub_district`)}
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <Input
                placeholder={t("address.provinceState")}
                className="h-7 text-xs"
                disabled={isDisabled}
                maxLength={100}
                {...form.register(`vendor_address.${index}.province`)}
              />
              <Input
                placeholder={t("address.postalCode")}
                className="h-7 text-xs"
                disabled={isDisabled}
                maxLength={20}
                {...form.register(`vendor_address.${index}.postal_code`)}
              />
              <Input
                placeholder={t("address.country")}
                className="h-7 text-xs"
                disabled={isDisabled}
                maxLength={100}
                {...form.register(`vendor_address.${index}.country`)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
