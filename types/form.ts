export type FormMode = "add" | "view" | "edit";

interface ModeLabels {
  title: string;
  submit: string;
  pending: string;
}

export function getModeLabels(mode: FormMode, entity: string): ModeLabels {
  const labels: Record<FormMode, ModeLabels> = {
    add: { title: `Add ${entity}`, submit: "Create", pending: "Creating..." },
    edit: { title: `Edit ${entity}`, submit: "Save", pending: "Saving..." },
    view: { title: entity, submit: "", pending: "" },
  };
  return labels[mode];
}
