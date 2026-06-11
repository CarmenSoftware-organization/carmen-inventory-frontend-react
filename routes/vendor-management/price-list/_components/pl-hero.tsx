
import { Controller, type UseFormReturn } from "react-hook-form";
import { useLocale } from "use-intl";
import type { PriceList } from "@/types/price-list";
import { NameField } from "./pl-name-field";
import { daysBetween, formatLocalizedDate } from "@/lib/date-utils";
import type { PriceListFormValues } from "./pl-form-schema";

interface PLHeroProps {
  readonly form: UseFormReturn<PriceListFormValues>;
  readonly priceList?: PriceList;
  readonly isDisabled: boolean;
  readonly watchedFrom: string;
  readonly watchedTo: string;
  readonly labels: {
    readonly namePlaceholder: string;
    readonly nameLabel: string;
    readonly tapToEdit: string;
    readonly pressEnterToSave: string;
    readonly clickToRename: string;
    readonly requiredField: string;
    readonly descriptorEmpty: string;
    readonly descriptorFilled: (vars: {
      vendor: string;
      days: number;
      date: string;
    }) => string;
  };
}

/** Hero section — name input + descriptor */
export function PLHero({
  form,
  priceList,
  isDisabled,
  watchedFrom,
  watchedTo,
  labels,
}: PLHeroProps) {
  const locale = useLocale();
  const hasFullDescriptor = Boolean(
    priceList?.vendor?.name && watchedFrom && watchedTo,
  );

  return (
    <>
      <Controller
        control={form.control}
        name="name"
        render={({ field }) => (
          <NameField
            value={field.value}
            onChange={field.onChange}
            placeholder={labels.namePlaceholder}
            disabled={isDisabled}
            error={form.formState.errors.name?.message}
            labels={{
              nameLabel: labels.nameLabel,
              tapToEdit: labels.tapToEdit,
              pressEnterToSave: labels.pressEnterToSave,
              clickToRename: labels.clickToRename,
              requiredField: labels.requiredField,
            }}
          />
        )}
      />

      <p className="text-foreground/80 mt-2 max-w-xl text-xs leading-relaxed">
        {hasFullDescriptor ? (
          <span className="text-foreground/80">
            {labels.descriptorFilled({
              vendor: priceList!.vendor!.name,
              days: daysBetween(watchedFrom, watchedTo),
              date: formatLocalizedDate(watchedFrom, locale),
            })}
          </span>
        ) : (
          <span className="text-muted-foreground italic">
            {labels.descriptorEmpty}
          </span>
        )}
      </p>
    </>
  );
}
