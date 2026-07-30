import type { DashboardDataset } from "@/types/dashboard-dataset";
import type { MyDashboardWidget, WidgetParams } from "@/types/dashboard-widget";

// ── group widget encoding ────────────────────────────────────────────────────
// group เก็บเป็น personal widget แถวเดียว: dataset_id = "group@<base-dataset>",
// params.statuses = สถานะที่จะโชว์ (comma) + params.time_range. backend ไม่เคย
// exec id ตัวนี้ (frontend render เอง โดยลูกยิง <base-dataset> จริง).

export const GROUP_PREFIX = "group@";

/** สถานะยืนพื้นของ group (4 ตัว — ไม่มี voided) */
export const DEFAULT_GROUP_STATUSES = [
  "draft",
  "in_progress",
  "approved",
  "completed",
] as const;

/** ตัวเลือกช่วงเวลา (ตรงกับ time_range ของ document.* dataset ฝั่ง backend) */
export const TIME_RANGE_OPTIONS = [
  "@today",
  "@3days",
  "@7days",
  "@1month",
] as const;

const GROUP_MINE_SUFFIX = "#mine";

/** นิยาม group ต่อ doc type — statuses = stage ของ workflow เอกสารนั้นจริงๆ
 * (ไม่ลอก PR: PO มี sent/ไม่มี approved, SR สั้นกว่า) สีของแต่ละ status มาจาก
 * --status-* canonical ผ่าน statusMeta อยู่แล้ว */
interface GroupDef {
  readonly doc: string; // pr | po | sr
  readonly label: string; // PR | PO | SR
  readonly statuses: readonly string[];
}
const GROUP_DEFS: readonly GroupDef[] = [
  { doc: "pr", label: "PR", statuses: ["draft", "in_progress", "approved", "completed"] },
  { doc: "po", label: "PO", statuses: ["draft", "in_progress", "sent", "completed"] },
  { doc: "sr", label: "SR", statuses: ["draft", "in_progress", "completed"] },
];

/** synthetic datasets สำหรับ dropdown "+ Add Widget" — 2 preset (everyone/mine)
 * ต่อ doc. id ลงท้าย #mine = @current_user (owner axis), นอกนั้น = @everyone. */
export const GROUP_DATASETS: readonly DashboardDataset[] = GROUP_DEFS.flatMap(
  (d): DashboardDataset[] => {
    const baseId = `${GROUP_PREFIX}document.${d.doc}-count`;
    const make = (suffix: string, vis: string): DashboardDataset => ({
      id: baseId + suffix,
      name: `${d.label} summary (status pipeline)(${vis})`,
      description: `${d.label} count by status`,
      shape: "scalar",
      category: "workflow",
      unit: "items",
    });
    return [make("", "everyone"), make(GROUP_MINE_SUFFIX, "mine")];
  },
);

/** statuses (pipeline stages) ของ preset — จาก doc type ใน id (ของ doc นั้นเอง) */
export function groupStatusesOfPreset(presetId: string): string[] {
  const doc = normalizeGroupDatasetId(presetId)
    .slice(GROUP_PREFIX.length)
    .replace(/^document\./, "")
    .replace(/-count$/, "");
  const def = GROUP_DEFS.find((g) => g.doc === doc);
  return def ? [...def.statuses] : [...DEFAULT_GROUP_STATUSES];
}

/** owner_visibility จาก preset id: #mine → @current_user (ฉันสร้าง), นอกนั้น @everyone */
export function groupVisibilityOfPreset(presetId: string): string {
  return presetId.endsWith(GROUP_MINE_SUFFIX) ? "@current_user" : "@everyone";
}

/** id ที่เก็บจริง (ตัด suffix #mine ออก → base group id) */
export function normalizeGroupDatasetId(presetId: string): string {
  return presetId.endsWith(GROUP_MINE_SUFFIX)
    ? presetId.slice(0, -GROUP_MINE_SUFFIX.length)
    : presetId;
}


export function isGroupDatasetId(id: string): boolean {
  return id.startsWith(GROUP_PREFIX);
}

export function isGroupWidget(w: { readonly dataset_id: string }): boolean {
  return isGroupDatasetId(w.dataset_id);
}

/** params เริ่มต้นตอนสร้าง group widget จาก dropdown */
export function groupCreateParams(
  ownerVisibility: string,
  statuses: readonly string[],
): WidgetParams {
  return {
    time_range: "@today",
    statuses: statuses.join(","),
    owner_visibility: ownerVisibility,
  };
}

/** ถอด config จาก group widget ที่ save แล้ว */
export function parseGroupWidget(w: MyDashboardWidget): {
  baseDatasetId: string;
  statuses: string[];
  timeRange: string;
  ownerVisibility: string;
} {
  const statuses =
    typeof w.params?.statuses === "string" && w.params.statuses
      ? w.params.statuses.split(",").filter(Boolean)
      : [...DEFAULT_GROUP_STATUSES];
  const timeRange =
    typeof w.params?.time_range === "string" && w.params.time_range
      ? w.params.time_range
      : "@today";
  const ownerVisibility =
    typeof w.params?.owner_visibility === "string" && w.params.owner_visibility
      ? w.params.owner_visibility
      : "@everyone";
  return {
    baseDatasetId: w.dataset_id.slice(GROUP_PREFIX.length),
    statuses,
    timeRange,
    ownerVisibility,
  };
}
