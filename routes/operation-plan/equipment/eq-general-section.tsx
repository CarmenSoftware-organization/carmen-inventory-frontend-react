
import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldInput } from "@/components/ui/field";
import { LookupEquipmentCategory } from "@/components/lookup/lookup-equipment-category";
import { Card } from "./eq-card-shell";
import { EqImageField, type EqImageChange } from "./eq-image-field";
import type { EquipmentFormValues } from "./eq-form-schema";

interface EqGeneralSectionProps {
  readonly form: UseFormReturn<EquipmentFormValues>;
  readonly isDisabled: boolean;
  readonly imageUrl?: string | null;
  readonly imageFile: File | null;
  readonly imageRemoved: boolean;
  readonly onImageChange: (next: EqImageChange) => void;
}

/** General info — image · code · name · category · brand/model/serial · station · capacity · power · description */
export function EqGeneralSection({
  form,
  isDisabled,
  imageUrl,
  imageFile,
  imageRemoved,
  onImageChange,
}: EqGeneralSectionProps) {
  const t = useTranslations("operationPlan.equipment");
  const tfl = useTranslations("field");
  const tf = useTranslations("form");
  const errors = form.formState.errors;

  return (
    <Card label={tf("generalInfo")}>
      <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <EqImageField
          disabled={isDisabled}
          serverImageUrl={imageUrl}
          file={imageFile}
          removed={imageRemoved}
          onChange={onImageChange}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field>
          <FieldLabel htmlFor="equipment-code" required>
            {tfl("code")}
          </FieldLabel>
          <FieldInput
            id="equipment-code"
            placeholder={t("codePlaceholder")}
            className="h-8"
            disabled={isDisabled}
            maxLength={10}
            error={errors.code?.message}
            {...form.register("code")}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="equipment-name" required>
            {tfl("name")}
          </FieldLabel>
          <FieldInput
            id="equipment-name"
            placeholder={t("namePlaceholder")}
            className="h-8"
            disabled={isDisabled}
            maxLength={100}
            error={errors.name?.message}
            {...form.register("name")}
          />
        </Field>

        <Field>
          <FieldLabel required>{tfl("category")}</FieldLabel>
          <Controller
            control={form.control}
            name="category_id"
            render={({ field }) => (
              <LookupEquipmentCategory
                value={field.value ?? ""}
                onValueChange={field.onChange}
                disabled={isDisabled}
                error={errors.category_id?.message}
              />
            )}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="equipment-brand">{tfl("brand")}</FieldLabel>
          <FieldInput
            id="equipment-brand"
            placeholder={t("brandPlaceholder")}
            className="h-8"
            disabled={isDisabled}
            maxLength={100}
            error={errors.brand?.message}
            {...form.register("brand")}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="equipment-model">{tfl("model")}</FieldLabel>
          <FieldInput
            id="equipment-model"
            placeholder={t("modelPlaceholder")}
            className="h-8"
            disabled={isDisabled}
            maxLength={100}
            error={errors.model?.message}
            {...form.register("model")}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="equipment-serial-no">
            {tfl("serialNo")}
          </FieldLabel>
          <FieldInput
            id="equipment-serial-no"
            placeholder={t("serialNoPlaceholder")}
            className="h-8"
            disabled={isDisabled}
            maxLength={100}
            error={errors.serial_no?.message}
            {...form.register("serial_no")}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="equipment-station">{tfl("station")}</FieldLabel>
          <FieldInput
            id="equipment-station"
            placeholder={t("stationPlaceholder")}
            className="h-8"
            disabled={isDisabled}
            maxLength={100}
            error={errors.station?.message}
            {...form.register("station")}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="equipment-capacity">
            {tfl("capacity")}
          </FieldLabel>
          <FieldInput
            id="equipment-capacity"
            placeholder={t("capacityPlaceholder")}
            className="h-8"
            disabled={isDisabled}
            maxLength={100}
            error={errors.capacity?.message}
            {...form.register("capacity")}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="equipment-power-rating">
            {tfl("powerRating")}
          </FieldLabel>
          <FieldInput
            id="equipment-power-rating"
            placeholder={t("powerRatingPlaceholder")}
            className="h-8"
            disabled={isDisabled}
            maxLength={100}
            error={errors.power_rating?.message}
            {...form.register("power_rating")}
          />
        </Field>

          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="equipment-description">
              {tfl("description")}
            </FieldLabel>
            <Textarea
              id="equipment-description"
              placeholder={tfl("optional")}
              rows={2}
              disabled={isDisabled}
              maxLength={256}
              {...form.register("description")}
            />
          </Field>
        </div>
      </div>
    </Card>
  );
}
