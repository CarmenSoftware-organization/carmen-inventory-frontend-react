
import { useState, useSyncExternalStore } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { useQueryClient } from "@tanstack/react-query";
import { BarChart3, Hash, PieChart } from "lucide-react";
import { useLocale, useTranslations } from "use-intl";
import { toast } from "sonner";
import { LookupDataset } from "@/components/lookup/lookup-dataset";
import { AnimationStyles, Reveal } from "@/components/share/reveal";
import { AppTile } from "@/components/icons/tiles";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { EyeBrow } from "@/components/ui/eye-brow";
import { formatLocalizedDate } from "@/lib/date-utils";
import { QUERY_KEYS } from "@/constant/query-keys";
import { useProfile } from "@/hooks/use-profile";
import {
  useCreateMyDashboardWidget,
  useDeleteMyDashboardWidget,
  useMyDashboardWidgets,
  useUpdateMyDashboardWidget,
} from "@/hooks/use-my-dashboard-widgets";
import type {
  MyDashboardWidget,
  MyDashboardWidgetListResponse,
} from "@/types/dashboard-widget";
import { SortableWidgetItem } from "./sortable-widget-item";

type RenderableWidgetType = "kpi" | "pie" | "bar";

/** Shapes ที่ frontend render ได้ (มี Card component) */
const SUPPORTED_SHAPES = ["scalar", "scalar_delta", "categorical"] as const;

function inferWidgetTypeFromShape(shape: string): RenderableWidgetType {
  switch (shape) {
    case "scalar":
    case "scalar_delta":
      return "kpi";
    case "categorical":
      return "pie";
    default:
      return "kpi";
  }
}

const greetingKeyFor = (
  hour: number,
): "morning" | "afternoon" | "evening" => {
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
};

const subscribeNoop = () => () => {};
let cachedClientTs: number | null = null;
const getClientTs = () => (cachedClientTs ??= Date.now());
const getServerTs = () => null;

const useClientNow = (): Date | null => {
  const ts = useSyncExternalStore<number | null>(
    subscribeNoop,
    getClientTs,
    getServerTs,
  );
  return ts == null ? null : new Date(ts);
};

export default function DashboardComponent() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const { data: profile } = useProfile();
  const now = useClientNow();

  const fullName =
    [profile?.user_info?.firstname, profile?.user_info?.lastname]
      .map((s) => s?.trim())
      .filter(Boolean)
      .join(" ") || t("fallbackName");

  const hour = now?.getHours() ?? 9;
  const greeting = t(`greeting.${greetingKeyFor(hour)}`);
  const dayLabel = now ? formatLocalizedDate(now, locale) : "—";

  return (
    <div>
      <AnimationStyles />
      <div className="space-y-6 p-4">
        <Reveal>
          <EyeBrow className="mb-2">
            {t("brief")} · {dayLabel}
          </EyeBrow>
          <h1 className="text-foreground text-[1rem] leading-[1.1] font-bold tracking-[-0.05625rem] sm:text-[2rem]">
            {greeting}, {fullName}
          </h1>
        </Reveal>

        <Reveal delay={100}>
          <SavedWidgetsSection />
        </Reveal>
      </div>
    </div>
  );
}

const SavedWidgetsSection = () => {
  const t = useTranslations("dashboard.savedWidget");
  const tt = useTranslations("toast");
  const queryClient = useQueryClient();
  const [pendingDelete, setPendingDelete] = useState<MyDashboardWidget | null>(
    null,
  );
  const { data, isLoading, isError, error } = useMyDashboardWidgets();
  const createWidget = useCreateMyDashboardWidget();
  const updateWidget = useUpdateMyDashboardWidget();
  const deleteWidget = useDeleteMyDashboardWidget();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const items = (data?.items ?? [])
    .slice()
    .sort((a, b) => a.order_index - b.order_index);

  const excludeIds = new Set(items.map((w) => w.dataset_id));

  const handleAdd = (ds: { id: string; name: string; shape: string }) => {
    createWidget.mutate(
      {
        dataset_id: ds.id,
        widget_type: inferWidgetTypeFromShape(ds.shape),
        title: ds.name,
      },
      {
        onSuccess: () =>
          toast.success(tt("createSuccess", { entity: t("entity") })),
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    deleteWidget.mutate(target.id, {
      onSuccess: () => {
        toast.success(tt("deleteSuccess", { entity: t("entity") }));
        setPendingDelete(null);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(items, oldIndex, newIndex).map((w, idx) => ({
      ...w,
      order_index: (idx + 1) * 10,
    }));

    // Optimistic — update cache ทันที (UI ไม่กระตุก)
    queryClient.setQueryData<MyDashboardWidgetListResponse>(
      [QUERY_KEYS.MY_DASHBOARD_WIDGETS],
      (old) => (old ? { ...old, items: reordered } : old),
    );

    // PATCH เฉพาะ items ที่ order_index เปลี่ยน
    reordered.forEach((w) => {
      const orig = items.find((o) => o.id === w.id);
      if (orig && orig.order_index !== w.order_index) {
        updateWidget.mutate(
          { id: w.id, order_index: w.order_index },
          {
            onError: (err) => toast.error(err.message),
          },
        );
      }
    });
  };

  const deleteTitleText =
    pendingDelete?.title || pendingDelete?.dataset_id || "";

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h2 className="text-muted-foreground text-[0.625rem] font-bold tracking-[0.16em] uppercase">
            {t("section")}
          </h2>
          {data && (
            <span className="text-muted-foreground text-[0.6875rem] tabular-nums">
              {data.count}
            </span>
          )}
        </div>
        <LookupDataset
          value=""
          onValueChange={() => {}}
          onItemChange={handleAdd}
          excludeIds={excludeIds}
          shapes={SUPPORTED_SHAPES}
          disabled={createWidget.isPending}
          placeholder={`+ ${t("add")}`}
        />
      </div>

      {isError && (
        <p role="alert" className="text-destructive text-sm">
          {t("loadError", { message: error?.message ?? "Unknown error" })}
        </p>
      )}

      {!isLoading && !isError && items.length === 0 && <EmptyState />}

      {items.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((w) => w.id)}
            strategy={rectSortingStrategy}
          >
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {items.map((w) => (
                <SortableWidgetItem
                  key={w.id}
                  widget={w}
                  onDelete={() => setPendingDelete(w)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <DeleteDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title={t("deleteTitle")}
        description={t("deleteConfirm", { title: deleteTitleText })}
        onConfirm={handleConfirmDelete}
        isPending={deleteWidget.isPending}
      />
    </section>
  );
};

function EmptyState() {
  const t = useTranslations("dashboard.savedWidget");
  const hints = [
    { Icon: Hash, label: t("emptyHintKpi"), color: "var(--chart-1)" },
    { Icon: PieChart, label: t("emptyHintPie"), color: "var(--chart-2)" },
    { Icon: BarChart3, label: t("emptyHintBar"), color: "var(--chart-4)" },
  ];

  return (
    <div className="bg-card rounded-2xl border border-dashed px-6 py-8 text-center sm:px-8">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:gap-5 sm:text-left">
        <AppTile name="dashboard" size={48} />
        <div className="flex min-w-0 flex-col items-center gap-2 sm:items-start">
          <h3 className="text-foreground text-base font-semibold tracking-tight sm:text-lg">
            {t("emptyTitle")}
          </h3>
          <p className="text-muted-foreground text-xs leading-relaxed sm:text-sm">
            {t("emptyDescription")}
          </p>

          <ul className="mt-1 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            {hints.map((h) => (
              <li
                key={h.label}
                className="bg-muted inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[0.6875rem] font-semibold"
              >
                <h.Icon
                  className="size-3"
                  style={{ color: h.color }}
                  aria-hidden="true"
                />
                <span>{h.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
