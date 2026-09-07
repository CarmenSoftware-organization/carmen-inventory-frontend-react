import type { DatasetParam } from "@/types/dashboard-widget";

type DashboardDatasetShape = "scalar" | "scalar_delta" | (string & {});
type DashboardDatasetCategory = "workflow" | "inventory" | (string & {});

export interface DashboardDataset {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly shape: DashboardDatasetShape;
  readonly category: DashboardDatasetCategory;
  readonly unit: string;
  /** Parameters the dataset accepts — empty for datasets that take none. */
  readonly params?: readonly DatasetParam[];
  /**
   * ชนิดกราฟที่ shape ของ dataset นี้วาดได้ — backend เป็นเจ้าของสัญญานี้
   * (`SupportedRenders` ใน micro-data) frontend เอามาตัดกับการ์ดที่มีจริง
   * ดู `availableRenders` — optional เพราะ backend รุ่นเก่ายังไม่ส่งฟิลด์นี้
   */
  readonly supported_renders?: readonly string[];
}
