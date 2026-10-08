import type { ReportScheduleDialogField } from "@/types/report-schedule";

/**
 * แปลง XML/JSON `<Dialog>` ของ report template เป็น flat field list
 * สำหรับใช้กับ `CreateScheduleDialog` (ต่างจาก parser ของหน้า list ที่จับคู่
 * range — schedule ต้องการแค่ flat field สำหรับ pre-set filter ตอน create)
 *
 * รองรับ:
 * - JSON legacy: `{ fields: ReportScheduleDialogField[] }`
 * - XML: `<Dialog>` ที่มี `<Label Text="..."/>`, `<Date Name="..."/>`,
 *   `<Lookup Name="..." Items="a~b~c" Values="..." DataSource="..."/>`,
 *   หรือ element อื่น ๆ จะ fall-through เป็น text input
 *
 * Error parse จะคืน `[]` (ไม่ throw)
 *
 * @param raw - สตริง dialog (XML หรือ JSON)
 * @returns array ของ `ReportScheduleDialogField`
 * @example
 * const fields = parseScheduleDialog(template.dialog);
 */
/** ลูกของ <Dialog> ตามลำดับเอกสาร โดยเปิด <Group> (รวมที่ซ้อนกัน) ออก — layout ไม่มีผลกับฟอร์ม schedule แต่ field ห้ามหาย */
const flattenGroups = (el: Element): Element[] =>
  Array.from(el.children).flatMap((c) =>
    c.tagName === "Group" ? flattenGroups(c) : [c],
  );

export function parseScheduleDialog(
  raw: string | undefined | null,
): ReportScheduleDialogField[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (trimmed.length === 0) return [];

  try {
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      const parsed = JSON.parse(trimmed) as {
        fields?: ReportScheduleDialogField[];
      };
      return parsed.fields ?? [];
    }

    const doc = new DOMParser().parseFromString(trimmed, "application/xml");
    const dialogEl = doc.getElementsByTagName("Dialog")[0];
    if (!dialogEl) return [];

    const fields: ReportScheduleDialogField[] = [];
    let currentLabel = "";

    for (const child of flattenGroups(dialogEl)) {
      const tag = child.tagName;

      if (tag === "Label") {
        currentLabel = child.getAttribute("Text") ?? "";
        continue;
      }

      const name = child.getAttribute("Name") ?? "";
      if (!name) {
        currentLabel = "";
        continue;
      }

      if (tag === "Date") {
        fields.push({ name, type: "date", label: currentLabel || name });
      } else if (tag === "Lookup") {
        const items = (child.getAttribute("Items") ?? "").split("~");
        const source = child.getAttribute("DataSource") ?? undefined;
        fields.push({
          name,
          type: "select",
          label: currentLabel || name,
          options: items.length > 1 || items[0] !== "ALL" ? items : undefined,
          source,
        });
      } else {
        fields.push({ name, type: "text", label: currentLabel || name });
      }
      currentLabel = "";
    }

    return fields;
  } catch {
    return [];
  }
}
