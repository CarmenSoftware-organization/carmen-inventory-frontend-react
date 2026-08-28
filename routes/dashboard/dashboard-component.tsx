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
import { useQueries, useQueryClient } from "@tanstack/react-query";
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
import { useBuCode } from "@/hooks/use-bu-code";
import { useDashboardDatasets } from "@/hooks/use-dashboard-dataset";
import { useProfile } from "@/hooks/use-profile";
import {
  myDashboardWidgetDataQueryOptions,
  useCreateMyDashboardWidget,
  useDeleteMyDashboardWidget,
  useMyDashboardWidgets,
  useUpdateMyDashboardWidget,
} from "./use-my-dashboard-widgets";
import type { DashboardDataset } from "@/types/dashboard-dataset";
import type {
  MyDashboardWidget,
  MyDashboardWidgetListResponse,
  WidgetParams,
} from "@/types/dashboard-widget";
import { SortableWidgetItem } from "./sortable-widget-item";
import {
  GROUP_DATASETS,
  groupCreateParams,
  groupStatusesOfPreset,
  groupVisibilityOfPreset,
  isGroupDatasetId,
  isGroupWidget,
  normalizeGroupDatasetId,
  parseGroupWidget,
} from "./status-group";
import { StatusGroupCard } from "./status-group-card";
import { WidgetConfigDialog } from "./widget-config-dialog";
import { inferWidgetTypeFromShape, SUPPORTED_SHAPES } from "./widget-shape";

const greetingKeyFor = (hour: number): "morning" | "afternoon" | "evening" => {
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
  const buCode = useBuCode();
  const [pendingDelete, setPendingDelete] = useState<MyDashboardWidget | null>(
    null,
  );
  // dataset ที่เลือกมาแล้วแต่ยังไม่ได้ save — รอตั้งค่า param ก่อน
  const [pendingAdd, setPendingAdd] = useState<DashboardDataset | null>(null);
  // widget ที่ save แล้วและกำลังแก้ param
  const [pendingConfig, setPendingConfig] = useState<MyDashboardWidget | null>(
    null,
  );
  const { data, isLoading, isError, error } = useMyDashboardWidgets();
  // catalogue ใช้ query key เดียวกับ LookupDataset — ดึงตรงนี้ = warm cache ให้ picker ด้วย
  const { data: catalogue } = useDashboardDatasets();
  const createWidget = useCreateMyDashboardWidget();
  const updateWidget = useUpdateMyDashboardWidget();
  const deleteWidget = useDeleteMyDashboardWidget();

  const datasetById = new Map(
    (catalogue?.items ?? []).map((d) => [d.id, d] as const),
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const items = (data?.items ?? [])
    .slice()
    .sort((a, b) => a.order_index - b.order_index);
  // group widgets render แยก (full-width, ไม่ร่วม dnd grid); ที่เหลือเข้ากริดปกติ
  const groupItems = items.filter(isGroupWidget);
  const normalItems = items.filter((w) => !isGroupWidget(w));

  // กัน add ซ้ำเฉพาะ dataset ที่ไม่มี param — ตัวที่มี param เพิ่มหลายใบได้
  // (เช่น trend 30 วัน คู่กับ 365 วัน) ซึ่งเป็น use case หลักของฟีเจอร์นี้
  const excludeIds = new Set(
    items
      .filter((w) => !w.params || Object.keys(w.params).length === 0)
      .map((w) => w.dataset_id),
  );

  // widget ที่บันทึกไว้อาจ resolve ไม่ได้ใน BU ปัจจุบัน (dataset ไม่มีในสคีมานี้ →
  // backend ตอบ 404) fetch ที่นี่แทนที่จะให้แต่ละการ์ด fetch เอง เพราะต้องรู้ก่อนว่า
  // เหลือกี่ตัวถึงจะตัดสินใจได้ว่าโชว์ grid หรือ empty state
  // ยิงตาม widget id ไม่ใช่ dataset id — backend เอา `params` ที่เก็บบน widget ไป exec ให้
  const detailQueries = useQueries({
    queries: normalItems.map((w) =>
      myDashboardWidgetDataQueryOptions(buCode, w.id),
    ),
  });

  // ตัวที่พังทิ้งไปเงียบๆ — ผู้ใช้ยังเห็นมันตอนสลับกลับไป BU เดิม
  const renderable = normalItems
    .map((widget, i) => ({ widget, query: detailQueries[i] }))
    .filter(({ query }) => !query?.isError);

  const handleAdd = (ds: DashboardDataset) => {
    // group widget → สร้างด้วย params ยืนพื้น (ไม่เปิด config dialog)
    if (isGroupDatasetId(ds.id)) {
      createWidget.mutate(
        {
          dataset_id: normalizeGroupDatasetId(ds.id),
          widget_type: "kpi",
          title: ds.name,
          params: groupCreateParams(
            groupVisibilityOfPreset(ds.id),
            groupStatusesOfPreset(ds.id),
          ),
        },
        {
          onSuccess: () =>
            toast.success(tt("createSuccess", { entity: t("entity") })),
        },
      );
      return;
    }
    // มี param → ให้ตั้งค่าก่อน; ไม่มี → POST เลยเหมือนเดิม
    if (ds.params?.length) {
      setPendingAdd(ds);
      return;
    }
    createWidget.mutate(
      {
        dataset_id: ds.id,
        widget_type: inferWidgetTypeFromShape(ds.shape),
        title: ds.name,
      },
      {
        onSuccess: () =>
          toast.success(tt("createSuccess", { entity: t("entity") })),
      },
    );
  };

  const handleCreateWithParams = (params: WidgetParams) => {
    if (!pendingAdd) return;
    createWidget.mutate(
      {
        dataset_id: pendingAdd.id,
        widget_type: inferWidgetTypeFromShape(pendingAdd.shape),
        title: pendingAdd.name,
        params,
      },
      {
        onSuccess: () => {
          toast.success(tt("createSuccess", { entity: t("entity") }));
          setPendingAdd(null);
        },
      },
    );
  };

  const handleUpdateParams = (params: WidgetParams) => {
    if (!pendingConfig) return;
    const target = pendingConfig;
    updateWidget.mutate(
      { id: target.id, params },
      {
        onSuccess: () => {
          toast.success(tt("updateSuccess", { entity: t("entity") }));
          // เจาะจงตัวเดียว — invalidate ทั้งก้อนจะทำให้ทุก widget refetch พร้อมกัน
          queryClient.invalidateQueries({
            queryKey: [QUERY_KEYS.MY_DASHBOARD_WIDGET_DATA, buCode, target.id],
          });
          setPendingConfig(null);
        },
      },
    );
  };

  // ปรับ time_range ของ group (dropdown มุมขวาบน) — persist ที่ params ของ widget
  const handleGroupTimeRange = (w: MyDashboardWidget, value: string) => {
    const newParams = { ...(w.params ?? {}), time_range: value };
    // optimistic — cache อัปเดตทันที (dropdown + tile ลูก refetch ด้วย time_range ใหม่)
    queryClient.setQueryData<MyDashboardWidgetListResponse>(
      [QUERY_KEYS.MY_DASHBOARD_WIDGETS, buCode],
      (old) =>
        old
          ? {
              ...old,
              items: old.items.map((it) =>
                it.id === w.id ? { ...it, params: newParams } : it,
              ),
            }
          : old,
    );
    updateWidget.mutate(
      { id: w.id, params: newParams },
      {
        onError: () => {
          queryClient.invalidateQueries({
            queryKey: [QUERY_KEYS.MY_DASHBOARD_WIDGETS],
          });
        },
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
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = normalItems.findIndex((i) => i.id === active.id);
    const newIndex = normalItems.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(normalItems, oldIndex, newIndex).map(
      (w, idx) => ({
        ...w,
        order_index: (idx + 1) * 10,
      }),
    );

    // Optimistic — update cache ทันที (UI ไม่กระตุก); group items คงไว้ด้านหน้า
    // key ต้องมี buCode ให้ตรงกับ useMyDashboardWidgets ไม่งั้นเขียนไม่ลง
    queryClient.setQueryData<MyDashboardWidgetListResponse>(
      [QUERY_KEYS.MY_DASHBOARD_WIDGETS, buCode],
      (old) => (old ? { ...old, items: [...groupItems, ...reordered] } : old),
    );

    // PATCH เฉพาะ items ที่ order_index เปลี่ยน
    reordered.forEach((w) => {
      const orig = normalItems.find((o) => o.id === w.id);
      if (orig && orig.order_index !== w.order_index) {
        updateWidget.mutate({ id: w.id, order_index: w.order_index }, {});
      }
    });
  };

  const deleteTitleText =
    pendingDelete?.title || pendingDelete?.dataset_id || "";
  const configDataset = pendingConfig
    ? datasetById.get(pendingConfig.dataset_id)
    : undefined;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h2 className="text-muted-foreground text-micro-legal font-bold tracking-[0.16em] uppercase">
            {t("section")}
          </h2>
          {data && (
            <span className="text-muted-foreground text-micro tabular-nums">
              {renderable.length}
            </span>
          )}
        </div>
        <LookupDataset
          value=""
          onValueChange={() => {}}
          onItemChange={handleAdd}
          excludeIds={excludeIds}
          extraItems={GROUP_DATASETS}
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

      {!isLoading &&
        !isError &&
        renderable.length === 0 &&
        groupItems.length === 0 && <EmptyState />}

      {groupItems.length > 0 && (
        <div className="space-y-3">
          {groupItems.map((w) => {
            const g = parseGroupWidget(w);
            return (
              <StatusGroupCard
                key={w.id}
                title={w.title || t("section")}
                datasetId={g.baseDatasetId}
                statuses={g.statuses}
                timeRange={g.timeRange}
                ownerVisibility={g.ownerVisibility}
                onDelete={() => setPendingDelete(w)}
                onTimeRangeChange={(v) => handleGroupTimeRange(w, v)}
              />
            );
          })}
        </div>
      )}

      {renderable.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={renderable.map(({ widget }) => widget.id)}
            strategy={rectSortingStrategy}
          >
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {renderable.map(({ widget, query }) => (
                <SortableWidgetItem
                  key={widget.id}
                  widget={widget}
                  dataset={datasetById.get(widget.dataset_id)}
                  detail={query?.data}
                  isLoading={query?.isLoading ?? true}
                  onDelete={() => setPendingDelete(widget)}
                  onConfigure={() => setPendingConfig(widget)}
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

      {pendingAdd && (
        <WidgetConfigDialog
          open
          onOpenChange={(o) => !o && setPendingAdd(null)}
          dataset={pendingAdd}
          isPending={createWidget.isPending}
          onSubmit={handleCreateWithParams}
        />
      )}

      {pendingConfig && configDataset && (
        <WidgetConfigDialog
          open
          onOpenChange={(o) => !o && setPendingConfig(null)}
          dataset={configDataset}
          initialParams={pendingConfig.params}
          isPending={updateWidget.isPending}
          onSubmit={handleUpdateParams}
        />
      )}
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
                className="bg-muted text-micro inline-flex items-center gap-1.5 rounded-full border px-2 py-1 font-semibold"
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
