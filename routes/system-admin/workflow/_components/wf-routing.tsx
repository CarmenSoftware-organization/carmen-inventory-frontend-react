
import { useState } from "react";
import {
  Controller,
  useWatch,
  type UseFormReturn,
  type UseFieldArrayReturn,
} from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { useDepartment } from "@/hooks/use-department";
import type { WorkflowCreateModel } from "./wf-form-schema";
import { cn } from "@/lib/utils";
import {
  actionTypeKeys,
  actionTypeValues,
  conditionFieldKeys,
  conditionFieldValues,
  operatorKeys,
  operatorValues,
} from "./wf-routing-constants";
import { CategoryCheckboxList } from "./wf-routing-category-list";
import { DepartmentCheckboxList } from "./wf-routing-department-list";

interface WfRoutingProps {
  readonly form: UseFormReturn<WorkflowCreateModel>;
  readonly fieldArray: UseFieldArrayReturn<
    WorkflowCreateModel,
    "data.routing_rules"
  >;
  readonly stages: { id: string; name: string }[];
  readonly isDisabled: boolean;
}

export function WfRouting({
  form,
  fieldArray,
  stages,
  isDisabled,
}: WfRoutingProps) {
  const { fields, append, remove } = fieldArray;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { data: deptData } = useDepartment();
  const departments = deptData?.data ?? [];
  const t = useTranslations("systemAdmin.workflow");
  const tc = useTranslations("common");
  const tfl = useTranslations("field");

  const stageNames = stages.map((s) => s.name);

  const safeIndex =
    selectedIndex >= fields.length
      ? Math.max(0, fields.length - 1)
      : selectedIndex;

  const handleAddRule = () => {
    append({
      name: t("newRule", { n: fields.length + 1 }),
      description: "",
      trigger_stage: stageNames[0] ?? "",
      condition: { field: "", operator: "eq", value: [] },
      action: {
        type: "NEXT_STAGE",
        parameters: { target_stage: stageNames[stageNames.length - 1] ?? "" },
      },
    });
    setSelectedIndex(fields.length);
  };

  const handleRemoveRule = (idx: number) => {
    remove(idx);
    if (safeIndex >= fields.length - 1) {
      setSelectedIndex(Math.max(0, fields.length - 2));
    }
  };

  const watchedRules = useWatch({
    control: form.control,
    name: "data.routing_rules",
  });
  const currentRule = watchedRules?.[safeIndex];
  const watchedField = currentRule?.condition?.field;
  const watchedOperator = currentRule?.condition?.operator;
  const watchedConditionValue = currentRule?.condition?.value;

  const handleFieldChange = (value: string) => {
    form.setValue(`data.routing_rules.${safeIndex}.condition.field`, value);
    form.setValue(`data.routing_rules.${safeIndex}.condition.operator`, "eq");
    form.setValue(`data.routing_rules.${safeIndex}.condition.value`, []);
    form.setValue(
      `data.routing_rules.${safeIndex}.condition.min_value`,
      undefined,
    );
    form.setValue(
      `data.routing_rules.${safeIndex}.condition.max_value`,
      undefined,
    );
  };

  return (
    <div className="flex gap-3 pt-3">
      {/* Left: Rule list */}
      <div className="w-48 shrink-0 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">{t("rules")}</span>
          {!isDisabled && (
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={handleAddRule}
              className="h-6 px-1.5 text-xs"
            >
              <Plus className="size-2.5" />
              {tc("add")}
            </Button>
          )}
        </div>

        {fields.length === 0 ? (
          <p className="text-muted-foreground py-3 text-center text-sm">
            {t("noRoutingRules")}
          </p>
        ) : (
          <div className="space-y-0.5">
            {fields.map((field, idx) => (
              <div
                key={field.id}
                className={cn(
                  "flex items-center rounded border text-xs",
                  safeIndex === idx && "border-primary bg-primary/5",
                )}
              >
                <button
                  type="button"
                  className="flex-1 truncate px-1.5 py-1 text-left"
                  onClick={() => setSelectedIndex(idx)}
                >
                  {watchedRules?.[idx]?.name || `Rule ${idx + 1}`}
                </button>
                {!isDisabled && (
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-destructive px-1"
                    onClick={() => handleRemoveRule(idx)}
                  >
                    <Trash2 className="size-2.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: Rule detail */}
      <div className="flex-1 rounded border p-3">
        {fields.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-xs">
            {t("selectOrAddRule")}
          </p>
        ) : (
          <div className="space-y-3">
            <FieldGroup className="gap-2">
              <div className="grid grid-cols-2 gap-2">
                <Field>
                  <FieldLabel>{t("ruleName")}</FieldLabel>
                  <Input
                    className="h-8 text-xs"
                    disabled={isDisabled}
                    {...form.register(`data.routing_rules.${safeIndex}.name`)}
                  />
                </Field>

                <Field>
                  <FieldLabel>{t("triggerStage")}</FieldLabel>
                  <Controller
                    control={form.control}
                    name={`data.routing_rules.${safeIndex}.trigger_stage`}
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
                          {stageNames.map((name) => (
                            <SelectItem
                              key={name}
                              value={name}
                              className="text-xs"
                            >
                              {name}
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
                  {...form.register(
                    `data.routing_rules.${safeIndex}.description`,
                  )}
                />
              </Field>
            </FieldGroup>

            {/* Condition section */}
            <div className="space-y-2">
              <span className="text-xs font-medium">{t("condition")}</span>

              <FieldGroup className="gap-2">
                <div
                  className={cn(
                    "grid gap-2",
                    watchedField === "total_amount"
                      ? "grid-cols-2"
                      : "grid-cols-1",
                  )}
                >
                  <Field>
                    <FieldLabel>{tfl("field")}</FieldLabel>
                    <Select
                      value={watchedField ?? ""}
                      onValueChange={handleFieldChange}
                      disabled={isDisabled}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder={t("selectField")} />
                      </SelectTrigger>
                      <SelectContent>
                        {conditionFieldValues.map((value) => (
                          <SelectItem key={value} value={value}>
                            {t(conditionFieldKeys[value])}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  {watchedField === "total_amount" && (
                    <Field>
                      <FieldLabel>{t("operator")}</FieldLabel>
                      <Controller
                        control={form.control}
                        name={`data.routing_rules.${safeIndex}.condition.operator`}
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
                              {operatorValues.map((value) => (
                                <SelectItem
                                  key={value}
                                  value={value}
                                  className="text-xs"
                                >
                                  {t(operatorKeys[value])}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </Field>
                  )}
                </div>

                {watchedField === "total_amount" &&
                  watchedOperator !== "between" && (
                    <Field>
                      <FieldLabel>{t("value")}</FieldLabel>
                      <Input
                        type="number"
                        className="h-7 text-xs"
                        disabled={isDisabled}
                        value={watchedConditionValue?.[0] ?? ""}
                        onChange={(e) =>
                          form.setValue(
                            `data.routing_rules.${safeIndex}.condition.value`,
                            e.target.value ? [e.target.value] : [],
                          )
                        }
                      />
                    </Field>
                  )}

                {watchedField === "total_amount" &&
                  watchedOperator === "between" && (
                    <div className="grid grid-cols-2 gap-2">
                      <Field>
                        <FieldLabel>{t("minValue")}</FieldLabel>
                        <Input
                          type="number"
                          className="h-7 text-xs"
                          disabled={isDisabled}
                          {...form.register(
                            `data.routing_rules.${safeIndex}.condition.min_value`,
                          )}
                        />
                      </Field>
                      <Field>
                        <FieldLabel>{t("maxValue")}</FieldLabel>
                        <Input
                          type="number"
                          className="h-7 text-xs"
                          disabled={isDisabled}
                          {...form.register(
                            `data.routing_rules.${safeIndex}.condition.max_value`,
                          )}
                        />
                      </Field>
                    </div>
                  )}

                {watchedField === "department" && (
                  <DepartmentCheckboxList
                    departments={departments}
                    value={watchedConditionValue ?? []}
                    onChange={(val) =>
                      form.setValue(
                        `data.routing_rules.${safeIndex}.condition.value`,
                        val,
                      )
                    }
                    isDisabled={isDisabled}
                  />
                )}

                {watchedField === "category" && (
                  <CategoryCheckboxList
                    form={form}
                    ruleIndex={safeIndex}
                    isDisabled={isDisabled}
                  />
                )}
              </FieldGroup>
            </div>

            {/* Action section */}
            <div className="space-y-2">
              <span className="text-xs font-medium">{t("actionLabel")}</span>

              <div className="grid grid-cols-2 gap-2">
                <Field>
                  <FieldLabel>{tfl("type")}</FieldLabel>
                  <Controller
                    control={form.control}
                    name={`data.routing_rules.${safeIndex}.action.type`}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isDisabled}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {actionTypeValues.map((value) => (
                            <SelectItem key={value} value={value}>
                              {t(actionTypeKeys[value])}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>

                <Field>
                  <FieldLabel>{t("targetStage")}</FieldLabel>
                  <Controller
                    control={form.control}
                    name={`data.routing_rules.${safeIndex}.action.parameters.target_stage`}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isDisabled}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {stageNames.map((name) => (
                            <SelectItem key={name} value={name}>
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

