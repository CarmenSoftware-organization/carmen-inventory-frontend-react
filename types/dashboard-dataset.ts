export type DashboardDatasetShape = "scalar" | "scalar_delta" | (string & {});
export type DashboardDatasetCategory =
  | "workflow"
  | "inventory"
  | (string & {});

export interface DashboardDataset {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly shape: DashboardDatasetShape;
  readonly category: DashboardDatasetCategory;
  readonly unit: string;
}
