
import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { useTranslations } from "use-intl";
import { GripVertical, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useWatch,
  type UseFormReturn,
  type UseFieldArrayReturn,
} from "react-hook-form";
import type { Stage } from "@/types/workflows";
import { makeRecipients, type WorkflowCreateModel } from "./wf-form-schema";
import SortableStageItem from "./wf-sort-table-item";

interface WfStageListProps {
  readonly form: UseFormReturn<WorkflowCreateModel>;
  readonly fieldArray: UseFieldArrayReturn<WorkflowCreateModel, "data.stages">;
  readonly selectedIndex: number;
  readonly onSelect: (index: number) => void;
  readonly isDisabled: boolean;
}

const buildNewStage = (
  existingNames: string[],
  newStageName: (n: number) => string,
): Stage => {
  let n = 1;
  let name = newStageName(n);
  while (existingNames.includes(name)) {
    n++;
    name = newStageName(n);
  }

  return {
    name,
    description: "",
    sla: "24",
    sla_unit: "hours",
    role: "approve",
    available_actions: {
      submit: { is_active: false, recipients: makeRecipients(false, false, false) },
      approve: { is_active: true, recipients: makeRecipients(true, false, true) },
      reject: { is_active: true, recipients: makeRecipients(true, false, false) },
      sendback: { is_active: true, recipients: makeRecipients(true, false, false) },
    },
    hide_fields: { price_per_unit: false, total_price: false },
    assigned_users: [],
    is_hod: false,
  };
};

export function WfStageList({
  form,
  fieldArray,
  selectedIndex,
  onSelect,
  isDisabled,
}: WfStageListProps) {
  const { fields, move, insert } = fieldArray;
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const t = useTranslations("systemAdmin.workflow");

  const watchedStages = useWatch({
    control: form.control,
    name: "data.stages",
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const stageIds = fields.map((f) => f.id);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = stageIds.indexOf(active.id as string);
    const newIndex = stageIds.indexOf(over.id as string);

    if (oldIndex === 0 || oldIndex === fields.length - 1) return;
    if (newIndex === 0 || newIndex === fields.length - 1) return;

    move(oldIndex, newIndex);
    if (selectedIndex === oldIndex) onSelect(newIndex);
  };

  const handleAddStage = () => {
    const names = fields.map((f) => f.name);
    const newStage = buildNewStage(names, (n) => t("newStage", { n }));
    insert(fields.length - 1, newStage);
    onSelect(fields.length - 1);
  };

  const activeDragIndex = activeDragId ? stageIds.indexOf(activeDragId) : -1;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold">{t("stages")}</span>
        {!isDisabled && (
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={handleAddStage}
            className="h-6 px-1.5 text-xs"
          >
            <Plus className="size-2.5" />
            {t("addStage")}
          </Button>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={stageIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-0.5">
            {fields.map((field, index) => {
              const stage = watchedStages?.[index];
              const isFirst = index === 0;
              const isLast = index === fields.length - 1;
              const isHod = stage?.is_hod ?? false;
              const userCount = stage?.assigned_users?.length ?? 0;
              const hasWarning =
                !isFirst && !isLast && !isHod && userCount === 0;
              return (
                <SortableStageItem
                  key={field.id}
                  id={field.id}
                  index={index}
                  name={stage?.name ?? field.name}
                  isSelected={selectedIndex === index}
                  isFirst={isFirst}
                  isLast={isLast}
                  userCount={userCount}
                  isHod={isHod}
                  hasWarning={hasWarning}
                  dragDisabled={isDisabled}
                  onClick={() => onSelect(index)}
                />
              );
            })}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeDragIndex >= 0 ? (
            <div className="bg-background flex items-center gap-1.5 rounded border px-1.5 py-1 text-xs shadow-md">
              <GripVertical className="text-muted-foreground size-3" />
              <span>
                {watchedStages?.[activeDragIndex]?.name ??
                  fields[activeDragIndex]?.name}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
