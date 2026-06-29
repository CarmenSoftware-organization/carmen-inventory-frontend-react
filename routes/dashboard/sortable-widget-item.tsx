
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CircleAlert, GripVertical, Trash2 } from "lucide-react";
import { useTranslations } from "use-intl";
import {
  BarCard,
  KpiCard,
  PieCard,
  WidgetSkeleton,
  type ResolvedWidget,
} from "@/components/dashboard-widget/dashboard-widget-grid";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDashboardDatasetDetail } from "@/hooks/use-dashboard-dataset";
import { cn } from "@/lib/utils";
import type {
  DatasetData,
  DatasetMeta,
  DatasetShape,
  MyDashboardWidget,
} from "@/types/dashboard-widget";

const SUPPORTED_SHAPES = new Set(["scalar", "scalar_delta", "categorical"]);

interface SortableWidgetItemProps {
  readonly widget: MyDashboardWidget;
  readonly onDelete: () => void;
}

function inferModuleName(datasetId: string): string {
  const prefix = datasetId.split(".")[0];
  if (prefix === "inventory") return "inventoryManagement";
  return "procurement";
}

function inferSubTile(datasetId: string): string {
  if (datasetId.includes("physical-count")) return "physicalCount";
  if (datasetId.includes("spot-check")) return "spotCheck";
  if (datasetId.includes("store-requisition")) return "storeRequisition";
  if (datasetId.includes("low-stock")) return "stockReplenishment";
  if (datasetId.includes("stock-in") || datasetId.includes("stock-out"))
    return "transaction";
  if (datasetId.includes("pr-by-department")) return "department";
  if (datasetId.includes("by-vendor")) return "vendor";
  if (datasetId.includes("pr-")) return "purchaseRequest";
  if (datasetId.includes("po-")) return "purchaseOrder";
  if (datasetId.includes("grn")) return "goodsReceiveNote";
  if (datasetId.includes("cn-")) return "creditNote";
  return "document";
}

/** col-span ตาม widget_type — match procurement/inventory dashboards */
function getColSpan(widgetType: string): string {
  if (widgetType === "kpi") return "lg:col-span-1";
  return "sm:col-span-2 lg:col-span-2";
}

export function SortableWidgetItem({
  widget,
  onDelete,
}: SortableWidgetItemProps) {
  const t = useTranslations("dashboard.savedWidget");
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const { data: detail, isLoading } = useDashboardDatasetDetail(
    widget.dataset_id,
  );

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const displayTitle = widget.title || detail?.meta.name || widget.dataset_id;
  const moduleName = inferModuleName(widget.dataset_id);
  const colSpanClass = getColSpan(widget.widget_type);

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        colSpanClass,
        "group/sortable relative",
        isDragging && "z-10 opacity-50",
      )}
    >
      <div className="absolute top-1 right-1 z-10 flex items-center gap-0.5 opacity-0 transition-opacity group-hover/sortable:opacity-100 focus-within:opacity-100">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className="text-muted-foreground hover:text-foreground hover:bg-muted/60 inline-flex size-6 cursor-grab touch-none items-center justify-center rounded-md"
        >
          <GripVertical className="size-3.5" aria-hidden="true" />
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onDelete}
          aria-label={t("deleteAria", { title: displayTitle })}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
        </Button>
      </div>

      {isLoading || !detail ? (
        <WidgetSkeleton />
      ) : SUPPORTED_SHAPES.has(detail.meta.shape) ? (
        <WidgetRenderer
          widget={buildFullWidget(widget, detail.meta, detail.data, displayTitle)}
          moduleName={moduleName}
          subTileFor={inferSubTile}
        />
      ) : (
        <UnsupportedCard
          title={displayTitle}
          shape={detail.meta.shape}
        />
      )}
    </li>
  );
}

function WidgetRenderer({
  widget,
  moduleName,
  subTileFor,
}: {
  readonly widget: ResolvedWidget;
  readonly moduleName: string;
  readonly subTileFor: (id: string) => string;
}) {
  switch (widget.widget_type) {
    case "kpi":
      return (
        <KpiCard
          widget={widget}
          moduleName={moduleName}
          subTileFor={subTileFor}
        />
      );
    case "pie":
      return (
        <PieCard
          widget={widget}
          moduleName={moduleName}
          subTileFor={subTileFor}
        />
      );
    case "bar":
      return (
        <BarCard
          widget={widget}
          moduleName={moduleName}
          subTileFor={subTileFor}
        />
      );
    default:
      return null;
  }
}

function UnsupportedCard({
  title,
  shape,
}: {
  readonly title: string;
  readonly shape: string;
}) {
  const t = useTranslations("dashboard.savedWidget");
  return (
    <Card className="border-warning/30 bg-warning/5 gap-2 py-4">
      <CardContent className="flex items-start gap-3 px-4">
        <span className="bg-warning/15 text-warning-foreground inline-flex size-8 shrink-0 items-center justify-center rounded-lg">
          <CircleAlert className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="truncate text-sm font-semibold leading-snug">
            {title}
          </p>
          <p className="text-muted-foreground text-[0.6875rem] font-semibold uppercase tracking-wide">
            {t("unsupportedTitle")}
          </p>
          <p className="text-muted-foreground text-[0.6875rem] leading-snug">
            {t("unsupportedDescription", { shape })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function buildFullWidget(
  saved: MyDashboardWidget,
  meta: DatasetMeta,
  data: DatasetData<DatasetShape>,
  title: string,
): ResolvedWidget {
  return {
    id: saved.id,
    dataset_id: saved.dataset_id,
    widget_type: saved.widget_type,
    title,
    order_index: saved.order_index,
    meta,
    data,
  };
}
