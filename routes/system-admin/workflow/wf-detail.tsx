import { useState } from "react";
import {
  useForm,
  useFieldArray,
  useWatch,
  type Resolver,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { useUpdateWorkflow } from "@/hooks/use-workflow";
import { useNavigationGuard } from "@/hooks/use-navigation-guard";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import { cn } from "@/lib/utils";
import type { Workflow, User, Product, Stage } from "@/types/workflows";
import {
  wfFormSchema,
  getWorkflowFormDefaults,
  type WorkflowCreateModel,
} from "./wf-form-schema";
import { WfHeader } from "./wf-header";
import { WfGeneral } from "./wf-general";
import { WfStages } from "./wf-stages";
import { WfRouting } from "./wf-routing";
import { WfProducts } from "./wf-products";
import WfValidationPanel from "./wf-validation-panel";
import { validateWorkflow } from "./wf-validate";
import WfInsights from "./wf-insights";
import WfDiagram from "./wf-diagram";

interface WfDetailProps {
  readonly workflow: Workflow;
  readonly users: User[];
  readonly products: Product[];
}

export function WfDetail({ workflow, users, products }: WfDetailProps) {
  "use no memo";
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [selectedStageIndex, setSelectedStageIndex] = useState(0);
  const updateWorkflow = useUpdateWorkflow();
  const isPending = updateWorkflow.isPending;
  const isDisabled = !isEditing || isPending;
  const t = useTranslations("systemAdmin.workflow");
  const tt = useTranslations("toast");

  const handleSelectStage = (index: number) => {
    setSelectedStageIndex(index);
    setActiveTab("stages");
  };

  const form = useForm<WorkflowCreateModel>({
    resolver: zodResolver(wfFormSchema) as Resolver<WorkflowCreateModel>,
    defaultValues: getWorkflowFormDefaults(workflow),
  });

  const isDirty = form.formState.isDirty;
  const guardEnabled = isEditing && isDirty;
  useUnsavedChanges(guardEnabled);
  const navGuard = useNavigationGuard(guardEnabled);

  const stagesFieldArray = useFieldArray({
    control: form.control,
    name: "data.stages",
  });

  const watchedStages = useWatch({
    control: form.control,
    name: "data.stages",
  }) as Stage[] | undefined;

  const watchedProducts = useWatch({
    control: form.control,
    name: "data.products",
  }) as { id: string }[] | undefined;

  const routingFieldArray = useFieldArray({
    control: form.control,
    name: "data.routing_rules",
  });

  const hasStages = !!watchedStages && watchedStages.length > 0;

  const onSubmit = (values: WorkflowCreateModel) => {
    updateWorkflow.mutate(
      // doc_version round-trips the loaded record's version — backend requires it for optimistic-concurrency on update
      { id: workflow.id, doc_version: workflow.doc_version, ...values },
      {
        onSuccess: () => {
          toast.success(tt("updateSuccess", { entity: t("entity") }));
          form.reset(values);
          setIsEditing(false);
        },
      },
    );
  };

  const handleCancel = () => {
    form.reset();
    setIsEditing(false);
  };

  return (
    <div className="space-y-3">
      <WfHeader
        workflow={workflow}
        isEditing={isEditing}
        isPending={isPending}
        onEdit={() => setIsEditing(true)}
        onCancel={handleCancel}
        formId="wf-detail-form"
      />

      {watchedStages &&
        watchedStages.length > 0 &&
        (() => {
          const result = validateWorkflow(watchedStages);
          return (
            <WfValidationPanel
              issues={result.issues}
              errorCount={result.errorCount}
              warningCount={result.warningCount}
              isReady={result.isReady}
              onSelectStage={handleSelectStage}
            />
          );
        })()}

      <div
        className={cn(
          "grid gap-4",
          hasStages && "lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start",
        )}
      >
        {watchedStages && watchedStages.length > 0 && (
          <WfDiagram
            orientation="vertical"
            className="lg:sticky lg:top-2"
            stages={watchedStages}
            routingRules={routingFieldArray.fields as never}
            selectedIndex={
              activeTab === "stages" ? selectedStageIndex : undefined
            }
            onSelectStage={handleSelectStage}
            onMoveStage={
              isEditing
                ? (from, to) => {
                    stagesFieldArray.move(from, to);
                    setSelectedStageIndex(to);
                  }
                : undefined
            }
          />
        )}

        <form
          id="wf-detail-form"
          onSubmit={form.handleSubmit(onSubmit, () =>
            scrollToFirstInvalidField(),
          )}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList variant="line">
              <TabsTrigger value="general" className="text-xs">
                {t("general")}
              </TabsTrigger>
              <TabsTrigger value="stages" className="text-xs">
                {t("stages")}
                {watchedStages && watchedStages.length > 0 && (
                  <Badge
                    variant="secondary"
                    size="xs"
                    className="ml-1.5 tabular-nums"
                  >
                    {watchedStages.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="routing" className="text-xs">
                {t("routing")}
                {routingFieldArray.fields.length > 0 && (
                  <Badge
                    variant="secondary"
                    size="xs"
                    className="ml-1.5 tabular-nums"
                  >
                    {routingFieldArray.fields.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="products" className="text-xs">
                {t("products")}
                {watchedProducts && watchedProducts.length > 0 && (
                  <Badge
                    variant="secondary"
                    size="xs"
                    className="ml-1.5 tabular-nums"
                  >
                    {watchedProducts.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="insights" className="text-xs">
                {t("insights")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <WfGeneral form={form} isDisabled={isDisabled} />
            </TabsContent>

            <TabsContent value="stages">
              <WfStages
                form={form}
                fieldArray={stagesFieldArray}
                users={users}
                isDisabled={isDisabled}
                selectedIndex={selectedStageIndex}
                onSelectIndex={setSelectedStageIndex}
              />
            </TabsContent>

            <TabsContent value="routing">
              <WfRouting
                form={form}
                fieldArray={routingFieldArray}
                stages={stagesFieldArray.fields}
                isDisabled={isDisabled}
              />
            </TabsContent>

            <TabsContent value="products">
              <WfProducts
                form={form}
                allProducts={products}
                isDisabled={isDisabled}
              />
            </TabsContent>

            <TabsContent value="insights">
              <WfInsights
                stages={watchedStages ?? []}
                productCount={watchedProducts?.length ?? 0}
                routingCount={routingFieldArray.fields.length}
              />
            </TabsContent>
          </Tabs>
        </form>
      </div>

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
