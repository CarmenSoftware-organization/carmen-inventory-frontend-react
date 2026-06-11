// =============================================================
// Dashboard types — canonical schema synced with backend enums
// =============================================================

/** 6 shapes — backend enum_dataset_shape */
export type DatasetShape =
  | "scalar"
  | "scalar_delta"
  | "time_series"
  | "categorical"
  | "ranked"
  | "matrix";

/** 9 widget types — backend enum_dashboard_widget_type */
export type WidgetType =
  | "kpi"
  | "line"
  | "area"
  | "bar"
  | "pie"
  | "heatmap"
  | "gauge"
  | "table"
  | "sparkline";

/** Dataset category */
export type DatasetCategory =
  | "inventory"
  | "workflow"
  | "movement"
  | "spend"
  | "variance";

// -------------------------------------------------------------
// Dataset metadata (from GET /api/:bu/datasets)
// -------------------------------------------------------------
export interface DatasetMeta {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly shape: DatasetShape;
  readonly category: DatasetCategory;
  readonly unit?: string;
}

// -------------------------------------------------------------
// Dataset data — discriminated by shape
// -------------------------------------------------------------
export interface ScalarData {
  readonly value: number;
}

export interface ScalarDeltaData {
  readonly value: number;
  readonly prev: number;
  readonly change?: string;
}

export interface TimeSeriesPoint {
  readonly date: string;
  readonly value: number;
}

export interface CategoricalPoint {
  readonly label: string;
  readonly value: number;
  readonly color?: string;
}

export interface RankedPoint {
  readonly rank: number;
  readonly label: string;
  readonly value: number;
  readonly extras?: Record<string, unknown>;
}

export interface MatrixData {
  readonly rows: readonly string[];
  readonly cols: readonly string[];
  readonly values: readonly (readonly number[])[];
}

export type DatasetData<S extends DatasetShape> = S extends "scalar"
  ? ScalarData
  : S extends "scalar_delta"
    ? ScalarDeltaData
    : S extends "time_series"
      ? readonly TimeSeriesPoint[]
      : S extends "categorical"
        ? readonly CategoricalPoint[]
        : S extends "ranked"
          ? readonly RankedPoint[]
          : S extends "matrix"
            ? MatrixData
            : never;

// -------------------------------------------------------------
// Response — GET /api/:bu/datasets/:id (single resolved dataset)
// -------------------------------------------------------------
export type DatasetResponse = {
  [S in DatasetShape]: {
    readonly meta: DatasetMeta & { readonly shape: S };
    readonly data: DatasetData<S>;
  };
}[DatasetShape];

// -------------------------------------------------------------
// Personal saved widget — bound to dataset_id + widget_type
// -------------------------------------------------------------
export interface WidgetConfig {
  readonly id: string;
  readonly dataset_id: string;
  readonly widget_type: WidgetType;
  readonly title?: string | null;
  readonly order_index: number;
}

export interface CreateWidgetDto {
  readonly dataset_id: string;
  readonly widget_type: WidgetType;
  readonly title?: string;
  readonly order_index?: number;
}

export interface UpdateWidgetDto {
  readonly title?: string;
  readonly order_index?: number;
}

export interface WidgetConfigListResponse {
  readonly items: readonly WidgetConfig[];
  readonly count: number;
}

// -------------------------------------------------------------
// Composite widget (from /dashboard-widgets/{procurement|inventory|me})
// — config + resolved data; data may be missing if dataset fetch fails
// -------------------------------------------------------------
export interface CompositeWidgetItem extends WidgetConfig {
  readonly module?: "procurement" | "inventory";
  readonly meta?: DatasetMeta;
  readonly data?: DatasetData<DatasetShape>;
  readonly error?: string;
}

export interface CompositeWidgetListResponse {
  readonly items: readonly CompositeWidgetItem[];
  readonly count: number;
}

// -------------------------------------------------------------
// Shape ↔ Widget type compatibility (picker filter)
// -------------------------------------------------------------
export const SUPPORTED_WIDGETS: Record<DatasetShape, readonly WidgetType[]> = {
  scalar: ["kpi", "gauge"],
  scalar_delta: ["kpi", "gauge"],
  time_series: ["line", "area", "sparkline"],
  categorical: ["bar", "pie"],
  ranked: ["bar", "table"],
  matrix: ["heatmap", "table"],
};

export function getWidgetsForShape(
  shape: DatasetShape,
): readonly WidgetType[] {
  return SUPPORTED_WIDGETS[shape] ?? [];
}

// -------------------------------------------------------------
// Type guards
// -------------------------------------------------------------
export function isShape<S extends DatasetShape>(
  resp: DatasetResponse,
  shape: S,
): resp is Extract<DatasetResponse, { meta: { shape: S } }> {
  return resp.meta.shape === shape;
}

/** Legacy guard — data has `value` and is not an array (scalar / scalar_delta). */
export function isScalarDeltaData(data: unknown): data is ScalarDeltaData {
  return (
    !!data &&
    !Array.isArray(data) &&
    typeof (data as ScalarDeltaData).value === "number"
  );
}

/** Legacy guard — data is an array of {label, value}. */
export function isCategoricalData(
  data: unknown,
): data is readonly CategoricalPoint[] {
  return Array.isArray(data);
}

/** Time-series guard — data is an array of {date, value}. */
export function isTimeSeriesData(
  data: unknown,
): data is readonly TimeSeriesPoint[] {
  return (
    Array.isArray(data) &&
    (data.length === 0 ||
      (typeof (data[0] as TimeSeriesPoint).date === "string" &&
        typeof (data[0] as TimeSeriesPoint).value === "number"))
  );
}

// =============================================================
// Aliases for migration (deprecated names — keep until consumers refactor)
// =============================================================
/** @deprecated use {@link DatasetShape} */
export type WidgetShape = DatasetShape;
/** @deprecated use {@link DatasetMeta} */
export type WidgetMeta = DatasetMeta;
/** @deprecated use {@link CompositeWidgetItem} */
export type DashboardWidget = CompositeWidgetItem;
/** @deprecated use {@link CompositeWidgetListResponse} */
export type DashboardWidgetListResponse = CompositeWidgetListResponse;
/** @deprecated use {@link DatasetResponse} */
export type DashboardDatasetDetail = DatasetResponse;
/** @deprecated use {@link WidgetConfig} */
export type MyDashboardWidget = WidgetConfig;
/** @deprecated use {@link CreateWidgetDto} */
export type CreateMyDashboardWidgetDto = CreateWidgetDto;
/** @deprecated use {@link UpdateWidgetDto} */
export type UpdateMyDashboardWidgetDto = UpdateWidgetDto;
/** @deprecated use {@link WidgetConfigListResponse} */
export type MyDashboardWidgetListResponse = WidgetConfigListResponse;
/** @deprecated use element of {@link DatasetData}<"categorical"> */
export type CategoricalDatum = CategoricalPoint;
/** @deprecated use {@link DatasetData} discriminated by shape */
export type WidgetData =
  | ScalarDeltaData
  | ScalarData
  | readonly CategoricalPoint[];
