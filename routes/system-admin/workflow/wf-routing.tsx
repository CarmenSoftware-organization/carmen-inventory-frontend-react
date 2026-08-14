
import { useState } from "react";
import {
  Controller,
  useWatch,
  type UseFormReturn,
  type UseFieldArrayReturn,
} from "react-hook-form";
import { Plus, Trash2, Search, Waypoints } from "lucide-react";
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
import type { Product } from "@/types/workflows";
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
  readonly allProducts: Product[];
}

export function WfRouting({
  form,
  fieldArray,
  stages,
  isDisabled,
  allProducts,
}: WfRoutingProps) {
  const { fields, append, remove } = fieldArray;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
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

  const filteredFields = fields
    .map((f, i) => ({ ...f, originalIndex: i }))
    .filter((f) => {
      if (!searchQuery) return true;
      const ruleName = watchedRules?.[f.originalIndex]?.name ?? f.name;
      return ruleName.toLowerCase().includes(searchQuery.toLowerCase());
    });

  return (
    <div className="flex flex-col gap-6 pt-4 lg:flex-row">
      {/* Left: Rule list */}
      <div className="w-full shrink-0 space-y-4 lg:w-72 xl:w-80">
        <div className="flex items-center justify-between px-1">
          <span className="text-sm font-semibold text-foreground/80">{t("rules")}</span>
          {!isDisabled && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddRule}
              className="h-9 px-4 text-sm font-medium shadow-sm transition-all hover:bg-muted/50"
            >
              <Plus className="mr-1.5 size-3.5" />
              {tc("add")}
            </Button>
          )}
        </div>

        <div className="px-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder={tc("search") || "Search..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {filteredFields.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center animate-in fade-in zoom-in-95 duration-200">
            <Waypoints className="size-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-foreground">{tc("noData") || "No routing rules found"}</p>
            {!isDisabled && !searchQuery && (
              <Button variant="outline" size="sm" onClick={handleAddRule} className="mt-4">
                <Plus className="mr-1.5 size-3.5" />
                {tc("add")}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredFields.map((field) => {
              const idx = field.originalIndex;
              return (
              <div
                key={field.id}
                className={cn(
                  "group flex items-center justify-between gap-2 rounded-xl border p-1 pl-4 transition-all duration-200 animate-in fade-in slide-in-from-left-2 duration-300",
                  safeIndex === idx
                    ? "border-primary/30 bg-primary/5 shadow-sm ring-1 ring-primary/20"
                    : "border-border hover:border-border/80 hover:bg-muted/40"
                )}
              >
                <button
                  type="button"
                  className={cn(
                    "flex-1 truncate text-left text-sm transition-colors",
                    safeIndex === idx ? "font-semibold text-primary" : "font-medium text-foreground"
                  )}
                  onClick={() => setSelectedIndex(idx)}
                >
                  {watchedRules?.[idx]?.name || `Rule ${idx + 1}`}
                </button>
                {!isDisabled && (
                  <button
                    type="button"
                    className={cn(
                      "flex shrink-0 cursor-pointer items-center justify-center rounded p-1.5 transition-all duration-200",
                      safeIndex === idx ? "text-destructive hover:bg-destructive/10" : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    )}
                    onClick={() => handleRemoveRule(idx)}
                    aria-label={tc("delete")}
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            );
          })}
          </div>
        )}
      </div>

      {/* Right: Rule detail */}
      <div className="flex-1 rounded-xl border bg-card p-4 shadow-sm md:p-6">
        {fields.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm">
            {t("selectOrAddRule")}
          </p>
        ) : (
          <div className="space-y-8">
            <FieldGroup className="gap-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Field>
                  <FieldLabel>{t("ruleName")}</FieldLabel>
                  <Input
                    className="h-9"
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
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {stageNames.map((name) => (
                            <SelectItem
                              key={name}
                              value={name}
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
                  className="min-h-[80px]"
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
            <div className="space-y-4">
              <span className="text-sm font-semibold text-foreground/80 border-b pb-3 block">{t("condition")}</span>

              <FieldGroup className="gap-6 pt-4">
                <div
                  className={cn(
                    "grid gap-6",
                    watchedField === "total_amount"
                      ? "grid-cols-1 md:grid-cols-2"
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
                      <SelectTrigger className="h-9">
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
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {operatorValues.map((value) => (
                                <SelectItem
                                  key={value}
                                  value={value}
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
                        className="h-9"
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
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <Field>
                        <FieldLabel>{t("minValue")}</FieldLabel>
                        <Input
                          type="number"
                          className="h-9"
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
                          className="h-9"
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
                    allProducts={allProducts}
                  />
                )}
              </FieldGroup>
            </div>

            {/* Action section */}
            <div className="space-y-4">
              <span className="text-sm font-semibold text-foreground/80 border-b pb-3 block">{t("actionLabel")}</span>

              <div className="grid grid-cols-1 gap-6 pt-4 md:grid-cols-2">
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
                        <SelectTrigger className="h-9">
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
                        <SelectTrigger className="h-9">
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

