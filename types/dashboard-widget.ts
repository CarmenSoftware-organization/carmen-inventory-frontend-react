// =============================================================
// Dashboard types — canonical schema synced with backend enums
// =============================================================

/** 7 shapes — backend enum_dataset_shape */
export type DatasetShape =
  | "scalar"
  | "scalar_delta"
  | "time_series"
  | "categorical"
  | "ranked"
  | "matrix"
  | "table";

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
type DatasetCategory =
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
// Dataset parameters — descriptors drive the widget param form,
// values are stored on the widget (`params` jsonb) and sent to exec
// -------------------------------------------------------------
/** One parameter a dataset accepts. `options` present → render a dropdown. */
export interface DatasetParam {
  readonly name: string;
  readonly label: string;
  readonly type: "text" | "int";
  readonly required: boolean;
  readonly default?: string | number;
  readonly options?: readonly string[];
}

/** Config-sourced param values — widget `params` jsonb / exec request body. */
export type WidgetParams = Record<string, string | number>;

// -------------------------------------------------------------
// Dataset data — discriminated by shape
// -------------------------------------------------------------
interface ScalarData {
  readonly value: number;
}

interface ScalarDeltaData {
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

interface RankedPoint {
  readonly rank: number;
  readonly label: string;
  readonly value: number;
  readonly extras?: Record<string, unknown>;
}

interface MatrixData {
  readonly rows: readonly string[];
  readonly cols: readonly string[];
  readonly values: readonly (readonly number[])[];
}

type TableColumnType = "text" | "number" | "currency" | "date" | "icon";

/** One column of a table-shaped dataset (header label + the row key it reads). */
export interface TableColumn {
  readonly key: string;
  readonly label: string;
  readonly type?: TableColumnType;
}

/** Arbitrary-column table payload — column metadata + row objects keyed by column key. */
export interface TableData {
  readonly columns: readonly TableColumn[];
  readonly rows: readonly Record<string, unknown>[];
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
            : S extends "table"
              ? TableData
              : never;

// -------------------------------------------------------------
// Response — GET /api/:bu/datasets/:id (single resolved dataset)
// -------------------------------------------------------------
type DatasetResponse = {
  [S in DatasetShape]: {
    readonly meta: DatasetMeta & { readonly shape: S };
    readonly data: DatasetData<S>;
  };
}[DatasetShape];

// -------------------------------------------------------------
// Personal saved widget — bound to dataset_id + widget_type
// -------------------------------------------------------------
interface WidgetConfig {
  readonly id: string;
  readonly dataset_id: string;
  readonly widget_type: WidgetType;
  readonly title?: string | null;
  readonly order_index: number;
  readonly params?: WidgetParams | null;
}

interface CreateWidgetDto {
  readonly dataset_id: string;
  readonly widget_type: WidgetType;
  readonly title?: string;
  readonly order_index?: number;
  readonly params?: WidgetParams;
}

interface UpdateWidgetDto {
  readonly title?: string;
  readonly order_index?: number;
  readonly params?: WidgetParams;
}

interface WidgetConfigListResponse {
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

interface CompositeWidgetListResponse {
  readonly items: readonly CompositeWidgetItem[];
  readonly count: number;
}

// -------------------------------------------------------------
// Shape ↔ Widget type compatibility (picker filter)
// -------------------------------------------------------------
/** First entry of each list is the default widget type for that shape. */
export const SUPPORTED_WIDGETS: Record<DatasetShape, readonly WidgetType[]> = {
  scalar: ["kpi", "gauge"],
  scalar_delta: ["kpi", "gauge"],
  time_series: ["line", "area", "sparkline"],
  categorical: ["pie", "bar"],
  ranked: ["bar", "table"],
  matrix: ["heatmap", "table"],
  table: ["table"],
};

export function getWidgetsForShape(shape: DatasetShape): readonly WidgetType[] {
  return SUPPORTED_WIDGETS[shape] ?? [];
}

// -------------------------------------------------------------
// Type guards
// -------------------------------------------------------------
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
  return (
    Array.isArray(data) &&
    (data.length === 0 ||
      (typeof (data[0] as CategoricalPoint).label === "string" &&
        typeof (data[0] as CategoricalPoint).value === "number"))
  );
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

/** Table guard — object with array `columns` and `rows` (rejects matrix and array shapes). */
export function isTableData(data: unknown): data is TableData {
  return (
    !!data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    Array.isArray((data as TableData).columns) &&
    Array.isArray((data as TableData).rows)
  );
}

// =============================================================
// Aliases for migration (deprecated names — keep until consumers refactor)
// =============================================================
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
