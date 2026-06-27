import type { ToolbarLabels } from "./plt-form-labels";

export const FORM_ID = "plt-form";

export function getSubmitLabel(
  isPending: boolean,
  isAdd: boolean,
  labels: ToolbarLabels,
): string {
  if (isPending) return isAdd ? labels.creating : labels.saving;
  return isAdd ? labels.create : labels.save;
}
