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
  colSpan: number;
}

export interface DateNode {
  type: "date";
  name: string;
  value: string;
  colSpan: number;
}

type DialogNode = LabelNode | LookupNode | DateNode;

/** เพดานคอลัมน์ของ dialog — modal กว้างได้จำกัด เกินนี้ Lookup จะแคบจนอ่านไม่ออก */
export const MAX_COLS = 4;

export type DialogCell = FormField;

export interface ParsedDialog {
  cols: number;
  cells: DialogCell[];
}

const INT = /^\s*\d+\s*$/;

/** จำนวนเต็ม ≥ 1 หรือ undefined ถ้าไม่ใช่ — ค่าผิดทุกแบบถอยไปค่าเริ่มต้น ไม่ throw */
const readPositiveInt = (raw: string | null): number | undefined => {
  if (raw === null || !INT.test(raw)) return undefined;
  const n = Number.parseInt(raw, 10);
  return n >= 1 ? n : undefined;
};

const readCols = (el: Element): number =>
  Math.min(readPositiveInt(el.getAttribute("Cols")) ?? 1, MAX_COLS);

const readSpan = (el: Element, cols: number): number =>
  Math.min(readPositiveInt(el.getAttribute("ColSpan")) ?? 1, cols);

export interface RangeField {
  kind: "range";
  label: string;
  from: LookupNode | DateNode;
  to: LookupNode | DateNode;
  colSpan: number;
}

export interface SingleField {
  kind: "single";
  label: string;
  control: LookupNode | DateNode;
  colSpan: number;
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
 * คู่ control ชื่อ `<X>From` กับ `<X>To` — dialog ปัจจุบันมีป้ายของทั้งสองฝั่ง ("Location From" /
 * "Location To") ซึ่ง isToLabel ไม่จับ จึงเคยขึ้นเป็นสี่แถวแยกกัน ชื่อ control คือสิ่งที่ micro-data ใช้จับคู่
 * ช่วงอยู่แล้ว (<X>From → >=, <X>To → <=)
 */
const isNamedPair = (
  from: LookupNode | DateNode,
  to: DialogNode | undefined,
): boolean =>
  isControl(to) &&
  to.type === from.type &&
  from.name.endsWith("From") &&
  to.name === `${from.name.slice(0, -"From".length)}To`;

export function parseReportDialog(xml: string): ParsedDialog {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const dialogEl = doc.querySelector("Dialog");
  if (!dialogEl) return { cols: 1, cells: [] };

  const cols = readCols(dialogEl);
  const cells: DialogCell[] = groupFields(
    parseNodes(Array.from(dialogEl.children), cols),
  );
  return { cols, cells };
}

/** รวมทุก field เป็น list แบนสำหรับงานที่ไม่สนใจ layout (data source, period, ส่งค่า filter) */
export function flattenFields(cells: DialogCell[]): FormField[] {
  return cells;
}

const parseNodes = (elements: Element[], cols: number): DialogNode[] => {
  const nodes: DialogNode[] = [];

  for (const child of elements) {
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
        colSpan: readSpan(child, cols),
      });
    } else if (tag === "Date") {
      nodes.push({
        type: "date",
        name: attr(child, "Name"),
        value: attr(child, "Value"),
        colSpan: readSpan(child, cols),
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

    const isPaired =
      (isToLabel(afterControl) && isControl(toControl)) ||
      (afterControl?.type === "label" && isNamedPair(next, toControl));
    if (isPaired && isControl(toControl)) {
      fields.push({
        kind: "range",
        label: node.text,
        from: next,
        to: toControl,
        colSpan: next.colSpan,
      });
      i += 4;
    } else {
      fields.push({
        kind: "single",
        label: node.text,
        control: next,
        colSpan: next.colSpan,
      });
      i += 2;
    }
  }

  return fields;
};
