export type FormMode = "add" | "view" | "edit";

export interface ModeLabels {
  title: string;
  submit: string;
  pending: string;
}

/**
 * สร้าง label สำหรับฟอร์มตามโหมดการทำงาน (add/edit/view)
 *
 * ใช้สำหรับแสดงชื่อหัวข้อฟอร์ม ปุ่ม submit และข้อความระหว่าง pending
 *
 * @param mode - โหมดของฟอร์ม (add, edit, view)
 * @param entity - ชื่อ entity ที่จะแสดงในหัวข้อ เช่น "Vendor"
 * @returns object ที่มี title, submit และ pending label สำหรับโหมดนั้น
 * @example
 * ```ts
 * const labels = getModeLabels("add", "Vendor");
 * // { title: "Add Vendor", submit: "Create", pending: "Creating..." }
 * ```
 */
export function getModeLabels(mode: FormMode, entity: string): ModeLabels {
  const labels: Record<FormMode, ModeLabels> = {
    add: { title: `Add ${entity}`, submit: "Create", pending: "Creating..." },
    edit: { title: `Edit ${entity}`, submit: "Save", pending: "Saving..." },
    view: { title: entity, submit: "", pending: "" },
  };
  return labels[mode];
}
