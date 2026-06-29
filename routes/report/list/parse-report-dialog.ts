interface LabelNode {
  type: "label";
  name: string;
  text: string;
  visible: boolean;
}

export interface LookupNode {
  type: "lookup";
  name: string;
  dataSource: string;
  items: string[];
  values: string[];
  value: string;
  multi: boolean; // Multi="true" → render as checkbox group, submit comma-joined values
}

export interface DateNode {
  type: "date";
  name: string;
  value: string;
}

type DialogNode = LabelNode | LookupNode | DateNode;

export interface RangeField {
  kind: "range";
  label: string;
  from: LookupNode | DateNode;
  to: LookupNode | DateNode;
}

export interface SingleField {
  kind: "single";
  label: string;
  control: LookupNode | DateNode;
}

export type FormField = RangeField | SingleField;

const attr = (el: Element, name: string): string => {
  return el.getAttribute(name) ?? "";
};

// Map @variable DataSource names to micro-report lookup types
const dataSourceMap: Record<string, string> = {
  "@product_list": "product",
  "@category_list": "category",
  "@subcategory_list": "sub-category",
  "@itemgroup_list": "item-group",
  "@location_list": "location",
  "@location_inventory_list": "location-inventory",
  "@location_direct_list": "location-direct",
  "@location_consigment_list": "location-consignment",
  "@location_count_list": "location-count",
  "@vendor_list": "vendor",
  "@period_list": "period",
};

/**
 * แปลงชื่อ DataSource ดิบ (เช่น @product_list) เป็นประเภท lookup
 * ที่ใช้ภายในระบบรายงาน
 * @param raw - ชื่อ DataSource ดิบจาก XML
 * @returns ชื่อ lookup ที่ map แล้ว หรือคืนค่าเดิมถ้าไม่พบ
 */
function resolveDataSource(raw: string): string {
  if (!raw) return raw;
  const mapped = dataSourceMap[raw.toLowerCase()] ?? dataSourceMap[raw];
  return mapped ?? raw;
}

const isControl = (
  node: DialogNode | undefined,
): node is LookupNode | DateNode => {
  return node?.type === "lookup" || node?.type === "date";
};

const isToLabel = (node: DialogNode | undefined): boolean => {
  if (node?.type !== "label") return false;
  return !node.visible || node.text === "to";
};

/**
 * แปลง XML ของ Dialog รายงานเป็นโครงสร้าง FormField สำหรับสร้าง UI
 *
 * @param xml - สตริง XML ของ Dialog ที่อธิบายพารามิเตอร์รายงาน
 * @returns อาร์เรย์ของ FormField ที่จัดกลุ่มเป็น single/range แล้ว
 * @example
 * ```ts
 * const fields = parseReportDialog(report.Dialog);
 * // fields = [{ kind: "range", label: "Date", from: {...}, to: {...} }]
 * ```
 */
export function parseReportDialog(xml: string): FormField[] {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const dialogEl = doc.querySelector("Dialog");
  if (!dialogEl) return [];

  const nodes = parseNodes(dialogEl);
  return groupFields(nodes);
}

const parseNodes = (dialogEl: Element): DialogNode[] => {
  const nodes: DialogNode[] = [];

  for (const child of Array.from(dialogEl.children)) {
    const tag = child.tagName;

    if (tag === "Label") {
      nodes.push({
        type: "label",
        name: attr(child, "Name"),
        text: attr(child, "Text"),
        visible: child.getAttribute("Visible") !== "false",
      });
    } else if (tag === "Lookup") {
      const rawItems = attr(child, "Items");
      const rawValues = attr(child, "Values");
      nodes.push({
        type: "lookup",
        name: attr(child, "Name"),
        dataSource: resolveDataSource(attr(child, "DataSource")),
        items: rawItems ? rawItems.split("~") : [],
        values: rawValues ? rawValues.split("~") : [],
        value: attr(child, "Value"),
        multi: attr(child, "Multi") === "true",
      });
    } else if (tag === "Date") {
      nodes.push({
        type: "date",
        name: attr(child, "Name"),
        value: attr(child, "Value"),
      });
    }
  }

  return nodes;
};

const groupFields = (nodes: DialogNode[]): FormField[] => {
  const fields: FormField[] = [];
  let i = 0;

  while (i < nodes.length) {
    const node = nodes[i];

    if (node.type !== "label" || !node.visible) {
      i++;
      continue;
    }

    const next = nodes[i + 1];
    if (!isControl(next)) {
      i++;
      continue;
    }

    const afterControl = nodes[i + 2];
    const toControl = nodes[i + 3];

    if (isToLabel(afterControl) && isControl(toControl)) {
      fields.push({
        kind: "range",
        label: node.text,
        from: next,
        to: toControl,
      });
      i += 4;
    } else {
      fields.push({ kind: "single", label: node.text, control: next });
      i += 2;
    }
  }

  return fields;
};
