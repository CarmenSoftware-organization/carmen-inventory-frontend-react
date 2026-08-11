
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
import { GripVertical, Plus, Search, Waypoints } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeleteDialog } from "@/components/ui/delete-dialog";
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
    is_show_signature: false,
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
  const [stageToDelete, setStageToDelete] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const t = useTranslations("systemAdmin.workflow");
  const tc = useTranslations("common");

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

  const confirmDelete = () => {
    if (stageToDelete === null) return;
    const { remove } = fieldArray;
    remove(stageToDelete);
    if (selectedIndex === stageToDelete) {
      onSelect(Math.max(0, stageToDelete - 1));
    } else if (selectedIndex > stageToDelete) {
      onSelect(selectedIndex - 1);
    }
    setStageToDelete(null);
  };

  const activeDragIndex = activeDragId ? stageIds.indexOf(activeDragId) : -1;

  const filteredFields = fields
    .map((f, i) => ({ ...f, originalIndex: i }))
    .filter((f) => {
      if (!searchQuery) return true;
      const stageName = watchedStages?.[f.originalIndex]?.name ?? f.name;
      return stageName.toLowerCase().includes(searchQuery.toLowerCase());
    });

  const filteredIds = filteredFields.map((f) => f.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <span className="text-sm font-semibold text-foreground/80">{t("stages")}</span>
        {!isDisabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddStage}
            className="h-9 px-4 text-sm font-medium shadow-sm transition-all hover:bg-muted/50"
          >
            <Plus className="mr-1.5 size-3.5" />
            {t("addStage")}
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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={filteredIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1">
            {filteredFields.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center animate-in fade-in zoom-in-95 duration-200">
                <Waypoints className="size-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-foreground">{tc("noData") || "No stages found"}</p>
                {!isDisabled && !searchQuery && (
                  <Button variant="outline" size="sm" onClick={handleAddStage} className="mt-4">
                    <Plus className="mr-1.5 size-3.5" />
                    {t("addStage")}
                  </Button>
                )}
              </div>
            ) : (
              filteredFields.map((field) => {
                const index = field.originalIndex;
                const stage = watchedStages?.[index];
                const isFirst = index === 0;
                const isLast = index === fields.length - 1;
                const isHod = stage?.is_hod ?? false;
                const userCount = stage?.assigned_users?.length ?? 0;
                const hasWarning = !isFirst && !isLast && !isHod && userCount === 0;
                return (
                  <div key={field.id} className="animate-in fade-in slide-in-from-left-2 duration-300">
                    <SortableStageItem
                      id={field.id}
                      index={index}
                      name={stage?.name ?? field.name}
                      isSelected={selectedIndex === index}
                      isFirst={isFirst}
                      isLast={isLast}
                      userCount={userCount}
                      isHod={isHod}
                      hasWarning={hasWarning}
                      dragDisabled={isDisabled || searchQuery.length > 0}
                      onClick={() => onSelect(index)}
                      onDelete={
                        !isDisabled && !isFirst && !isLast
                          ? () => setStageToDelete(index)
                          : undefined
                      }
                    />
                  </div>
                );
              })
            )}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeDragIndex >= 0 ? (
            <div className="bg-background flex items-center gap-3 rounded-lg border px-3 py-2 text-sm shadow-xl ring-1 ring-border opacity-90 scale-[1.02]">
              <GripVertical className="text-muted-foreground/50 size-4" />
              <span className="font-medium">
                {watchedStages?.[activeDragIndex]?.name ??
                  fields[activeDragIndex]?.name}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <DeleteDialog
        open={stageToDelete !== null}
        onOpenChange={(open) => !open && setStageToDelete(null)}
        title={t("deleteTitle")}
        description={stageToDelete !== null ? t("deleteConfirm", { 
          name: watchedStages?.[stageToDelete]?.name ?? fields[stageToDelete]?.name ?? "" 
        }) : ""}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
