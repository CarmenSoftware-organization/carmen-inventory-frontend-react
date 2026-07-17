
import { Controller, type UseFormReturn } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "use-intl";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import type { WorkflowCreateModel } from "./wf-form-schema";
import {
  isSignatureCheckboxDisabled,
  type SignatureStageLike,
} from "./wf-signature-limit";

const roleValues = ["create", "approve", "purchase", "issue"] as const;
const slaUnitValues = ["minutes", "hours", "days"] as const;

interface WfStageGeneralProps {
  readonly form: UseFormReturn<WorkflowCreateModel>;
  readonly index: number;
  readonly isFirst: boolean;
  readonly isDisabled: boolean;
}

export function WfStageGeneral({
  form,
  index,
  isFirst,
  isDisabled,
}: WfStageGeneralProps) {
  const t = useTranslations("systemAdmin.workflow");
  const tfl = useTranslations("field");
  const prefix = `data.stages.${index}` as const;

  const watchedStages = form.watch("data.stages") as
    | SignatureStageLike[]
    | undefined;
  const signatureDisabled = isSignatureCheckboxDisabled(
    watchedStages ?? [],
    index,
  );

  const roleLabelKeys = {
    create: "roleCreate",
    approve: "roleApprove",
    purchase: "rolePurchase",
    issue: "roleIssue",
  } as const;

  const slaUnitLabelKeys = {
    minutes: "slaMinutes",
    hours: "slaHours",
    days: "slaDays",
  } as const;

  return (
    <FieldGroup className="gap-2">
      <div className="grid grid-cols-2 gap-2">
        <Field>
          <FieldLabel>{t("stageName")}</FieldLabel>
          <Input
            className="h-8"
            disabled={isDisabled}
            {...form.register(`data.stages.${index}.name`)}
          />
        </Field>

        <Field>
          <FieldLabel>{t("stageRole")}</FieldLabel>
          <Controller
            control={form.control}
            name={`data.stages.${index}.role`}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isDisabled}
              >
                <SelectTrigger size="sm" className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleValues.map((value) => (
                    <SelectItem key={value} value={value} className="text-xs">
                      {t(roleLabelKeys[value])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </div>

      <Field>
        <FieldLabel>{tfl("description")}</FieldLabel>
        <Textarea
          className="min-h-12 text-xs"
          disabled={isDisabled}
          placeholder={tfl("optional")}
          maxLength={256}
          {...form.register(`data.stages.${index}.description`)}
        />
      </Field>

      {isFirst && (
        <Field>
          <FieldLabel>{t("creatorAccess")}</FieldLabel>
          <Controller
            control={form.control}
            name={`data.stages.${index}.creator_access`}
            render={({ field }) => (
              <RadioGroup
                value={field.value ?? "only_creator"}
                onValueChange={field.onChange}
                disabled={isDisabled}
                className="flex gap-3"
              >
                <div className="flex items-center gap-1">
                  <RadioGroupItem
                    value="only_creator"
                    id={`${prefix}-creator-only`}
                  />
                  <label htmlFor={`${prefix}-creator-only`} className="text-xs">
                    {t("onlyCreator")}
                  </label>
                </div>
                <div className="flex items-center gap-1">
                  <RadioGroupItem
                    value="all_department"
                    id={`${prefix}-all-dept`}
                  />
                  <label htmlFor={`${prefix}-all-dept`} className="text-xs">
                    {t("allDepartment")}
                  </label>
                </div>
              </RadioGroup>
            )}
          />
        </Field>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Field>
          <FieldLabel>{t("sla")}</FieldLabel>
          <Input
            type="number"
            className="h-8"
            disabled={isDisabled}
            {...form.register(`data.stages.${index}.sla`)}
          />
        </Field>
        <Field>
          <FieldLabel>{t("slaUnit")}</FieldLabel>
          <Controller
            control={form.control}
            name={`data.stages.${index}.sla_unit`}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isDisabled}
              >
                <SelectTrigger size="sm" className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {slaUnitValues.map((value) => (
                    <SelectItem key={value} value={value} className="text-xs">
                      {t(slaUnitLabelKeys[value])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_1fr] sm:gap-4">
        <div>
          <FieldLabel className="mb-1.5">{t("availableActions")}</FieldLabel>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <Field orientation="horizontal">
              <Controller
                control={form.control}
                name={`data.stages.${index}.available_actions.submit.is_active`}
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isDisabled}
                  />
                )}
              />
              <FieldLabel>{t("actionSubmit")}</FieldLabel>
            </Field>

            {!isFirst && (
              <>
                <Field orientation="horizontal">
                  <Controller
                    control={form.control}
                    name={`data.stages.${index}.available_actions.approve.is_active`}
                    render={({ field }) => (
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isDisabled}
                      />
                    )}
                  />
                  <FieldLabel>
                    <Badge
                      variant="success"
                      className="px-1 py-0 text-[0.5625rem]"
                    >
                      {t("actionApprove")}
                    </Badge>
                  </FieldLabel>
                </Field>
                <Field orientation="horizontal">
                  <Controller
                    control={form.control}
                    name={`data.stages.${index}.available_actions.reject.is_active`}
                    render={({ field }) => (
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isDisabled}
                      />
                    )}
                  />
                  <FieldLabel>
                    <Badge
                      variant="destructive"
                      className="px-1 py-0 text-[0.5625rem]"
                    >
                      {t("actionReject")}
                    </Badge>
                  </FieldLabel>
                </Field>
                <Field orientation="horizontal">
                  <Controller
                    control={form.control}
                    name={`data.stages.${index}.available_actions.sendback.is_active`}
                    render={({ field }) => (
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isDisabled}
                      />
                    )}
                  />
                  <FieldLabel>
                    <Badge
                      variant="warning"
                      className="px-1 py-0 text-[0.5625rem]"
                    >
                      {t("actionSendBack")}
                    </Badge>
                  </FieldLabel>
                </Field>
              </>
            )}
          </div>
        </div>

        <div>
          <FieldLabel className="mb-1.5">{t("hideFields")}</FieldLabel>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <Field orientation="horizontal">
              <Controller
                control={form.control}
                name={`data.stages.${index}.hide_fields.price_per_unit`}
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isDisabled}
                  />
                )}
              />
              <FieldLabel>{t("pricePerUnit")}</FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <Controller
                control={form.control}
                name={`data.stages.${index}.hide_fields.total_price`}
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isDisabled}
                  />
                )}
              />
              <FieldLabel>{t("totalPrice")}</FieldLabel>
            </Field>
          </div>
        </div>

        <div>
          <FieldLabel className="mb-1.5">
            {t("showSignatureInReport")}
          </FieldLabel>
          <Field orientation="horizontal">
            <Controller
              control={form.control}
              name={`data.stages.${index}.is_show_signature`}
              render={({ field }) => (
                <Checkbox
                  aria-label={t("showSignatureInReport")}
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                  disabled={isDisabled || signatureDisabled}
                />
              )}
            />
          </Field>
          {signatureDisabled && (
            <p className="text-muted-foreground mt-1 text-[0.625rem]">
              {t("signatureLimitReached")}
            </p>
          )}
        </div>
      </div>
    </FieldGroup>
  );
}
