/**
 * Shared form helpers for converting between API data types and form text fields.
 */

/**
 * Scroll และ focus ไปยัง field แรกที่มี validation error
 *
 * Query DOM หา element ที่มี `aria-invalid="true"` หรือ `data-invalid="true"`
 * แล้ว scroll ให้อยู่ตรงกลางจอแบบ smooth จากนั้น focus input ภายใน
 *
 * Retry ข้ามหลายเฟรม (`maxAttempts`) เพื่อรองรับ field ที่อยู่ใน section ซึ่งเพิ่ง
 * ถูก auto-expand หลัง submit (เช่น expanded row ของ PR/PO) — ตัว field จะ render
 * ช้ากว่า callback นี้ 1-2 เฟรม ถ้า query ครั้งเดียวจะหาไม่เจอ
 *
 * ใช้คู่กับ react-hook-form: `form.handleSubmit(onValid, scrollToFirstInvalidField)`
 *
 * @param options - ตัวเลือก scroll behavior + selector + จำนวนเฟรมที่ retry
 * @example
 * ```tsx
 * <form onSubmit={form.handleSubmit(onSubmit, () => scrollToFirstInvalidField())}>
 * ```
 */
export const scrollToFirstInvalidField = (options?: {
  block?: ScrollLogicalPosition;
  behavior?: ScrollBehavior;
  selector?: string;
  maxAttempts?: number;
}): void => {
  const {
    block = "center",
    behavior = "smooth",
    selector = '[aria-invalid="true"], [data-invalid="true"]',
    maxAttempts = 12,
  } = options ?? {};

  if (typeof document === "undefined") return;

  // retry ทีละเฟรม: field ที่ผิดอาจอยู่ใน row ที่เพิ่งถูก auto-expand
  // (setExpanded → re-render → mount expand) ซึ่งช้ากว่า callback นี้
  let attempts = 0;
  const tick = () => {
    const el = document.querySelector<HTMLElement>(selector);
    if (el) {
      el.scrollIntoView({ behavior, block });
      const focusable = el.matches(
        "input, textarea, button, select, [tabindex]",
      )
        ? el
        : el.querySelector<HTMLElement>(
            "input, textarea, button, select, [tabindex]",
          );
      focusable?.focus({ preventScroll: true });
      return;
    }
    attempts += 1;
    if (attempts < maxAttempts) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

/**
 * แปลง array ของ string เป็นข้อความบรรทัดเดียว โดยแยกด้วย newline เพื่อแสดงใน textarea
 *
 * @param value - array ของ string หรือ null/undefined
 * @returns ข้อความที่คั่นด้วย newline หรือ empty string หากไม่มีข้อมูล
 * @example
 * ```ts
 * arrayToText(["a", "b", "c"]); // "a\nb\nc"
 * arrayToText(null); // ""
 * ```
 */
export const arrayToText = (value: string[] | null | undefined): string => {
  if (!value || value.length === 0) return "";
  return value.join("\n");
};

/**
 * แปลงข้อความจาก textarea กลับเป็น array ของ string โดยตัด whitespace และบรรทัดว่าง
 *
 * @param value - ข้อความจาก textarea
 * @returns array ของ string หรือ null หากไม่มีข้อมูล
 * @example
 * ```ts
 * textToArray("a\n b \n\nc"); // ["a", "b", "c"]
 * textToArray(""); // null
 * ```
 */
export const textToArray = (value: string): string[] | null => {
  const items = value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length > 0 ? items : null;
};

/**
 * แปลง object เป็น JSON string แบบ indented 2 spaces สำหรับแสดงใน textarea
 *
 * @param value - object หรือ null/undefined
 * @returns JSON string หรือ empty string หากไม่มีข้อมูล
 * @example
 * ```ts
 * objectToText({ a: 1 }); // "{\n  \"a\": 1\n}"
 * objectToText(null); // ""
 * ```
 */
export function objectToText(
  value: Record<string, unknown> | null | undefined,
): string {
  if (!value || Object.keys(value).length === 0) return "";
  return JSON.stringify(value, null, 2);
}

/**
 * แปลง JSON string จาก textarea กลับเป็น object โดยไม่ throw error หาก parse ล้มเหลว
 *
 * @param value - JSON string
 * @returns object หรือ null หาก parse ล้มเหลวหรือ input ว่าง
 * @example
 * ```ts
 * textToObject('{"a":1}'); // { a: 1 }
 * textToObject("invalid"); // null
 * ```
 */
export function textToObject(value: string): Record<string, unknown> | null {
  if (!value.trim()) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

// ── Key-value pair helpers ──

export interface KeyValueRow {
  _id: string;
  key: string;
  value: string;
}

let _kvId = 0;

/**
 * สร้าง id แบบ sequential สำหรับ KeyValueRow ใช้ภายในโมดูลเท่านั้น
 *
 * @returns id ในรูปแบบ `kv_N`
 * @example
 * ```ts
 * kvId(); // "kv_1"
 * kvId(); // "kv_2"
 * ```
 */
function kvId(): string {
  return `kv_${++_kvId}`;
}

/**
 * สร้าง KeyValueRow ใหม่พร้อม id ที่ unique สำหรับใช้ใน form แบบ key-value table
 *
 * @param key - ค่าเริ่มต้นของ key
 * @param value - ค่าเริ่มต้นของ value
 * @returns KeyValueRow object ที่มี _id, key และ value
 * @example
 * ```ts
 * createKeyValueRow("name", "John"); // { _id: "kv_1", key: "name", value: "John" }
 * ```
 */
export function createKeyValueRow(key = "", value = ""): KeyValueRow {
  return { _id: kvId(), key, value };
}

/**
 * แปลง object เป็น array ของ KeyValueRow สำหรับแสดงในตาราง editable
 *
 * @param value - object หรือ null/undefined
 * @returns array ของ KeyValueRow (ว่างหากไม่มีข้อมูล)
 * @example
 * ```ts
 * objectToKeyValues({ a: 1, b: "x" });
 * // [{ _id, key: "a", value: "1" }, { _id, key: "b", value: "x" }]
 * ```
 */
export function objectToKeyValues(
  value: Record<string, unknown> | null | undefined,
): KeyValueRow[] {
  if (!value || Object.keys(value).length === 0) return [];
  return Object.entries(value).map(([k, v]) =>
    createKeyValueRow(k, String(v ?? "")),
  );
}

// ── Item changes helpers (add / update / remove) ──

export interface ItemChanges<P> {
  add?: P[];
  update?: (P & { id: string })[];
  remove?: { id: string }[];
}

/**
 * เปรียบเทียบ items ปัจจุบันกับ default values เพื่อสร้าง payload { add, update, remove } สำหรับ API
 *
 * ใช้ dirtyFields จาก react-hook-form เป็นหลักเพื่อตัดสินใจว่า item ไหนถูกแก้ไข
 * หากไม่มี dirtyFields จะ fallback เป็น shallow compare
 *
 * @param currentItems - items ปัจจุบันจาก form values (เช่น `values.items`)
 * @param defaultItems - items เดิมจาก default values (เช่น `defaultValues.items`)
 * @param dirtyFields - dirty field markers จาก react-hook-form (`form.formState.dirtyFields.items`)
 * @param mapFn - ฟังก์ชันแปลง form item เป็นรูปแบบ API payload
 * @returns ItemChanges ที่มี add, update, remove (เฉพาะที่มีข้อมูล)
 * @example
 * ```ts
 * const details = buildItemChanges(
 *   values.items,
 *   defaultValues.items,
 *   form.formState.dirtyFields.items,
 *   (item) => ({ product_id: item.product_id, qty: item.qty }),
 * );
 * // { add: [...], update: [...], remove: [...] }
 * ```
 */
export function buildItemChanges<
  T extends { id?: string | null },
  P,
>(
  currentItems: T[],
  defaultItems: T[],
  dirtyFields: Record<string, unknown>[] | undefined,
  mapFn: (item: T, index: number) => P,
): ItemChanges<P> {
  const newItems = currentItems.filter((item) => !item.id);
  const existingItems = currentItems.filter(
    (item): item is T & { id: string } => !!item.id,
  );

  const currentIds = new Set(existingItems.map((item) => item.id));
  const removedItems = defaultItems
    .filter(
      (item): item is T & { id: string } =>
        !!item.id && !currentIds.has(item.id),
    )
    .map((item) => ({ id: item.id }));

  const updatedItems = existingItems.filter((item) => {
    const idx = currentItems.findIndex((v) => v.id === item.id);

    // Use dirtyFields when available (react-hook-form subscription active)
    if (dirtyFields) {
      const dirty = dirtyFields[idx];
      return dirty != null && Object.keys(dirty).length > 0;
    }

    // Fallback: shallow-compare against default item
    const defaultItem = defaultItems.find((d) => d.id === item.id);
    if (!defaultItem) return true;
    const record = item as unknown as Record<string, unknown>;
    const defaultRecord = defaultItem as unknown as Record<string, unknown>;
    return Object.keys(record).some(
      (key) => key !== "id" && record[key] !== defaultRecord[key],
    );
  });

  const result: ItemChanges<P> = {};
  if (newItems.length > 0) {
    result.add = newItems.map((item, i) => mapFn(item, i));
  }
  if (updatedItems.length > 0) {
    result.update = updatedItems.map((item, i) => ({
      id: item.id,
      ...mapFn(item, i),
    }));
  }
  if (removedItems.length > 0) {
    result.remove = removedItems;
  }
  return result;
}

/**
 * แปลง array ของ KeyValueRow กลับเป็น object โดย auto-cast เป็น number/boolean หากเป็นไปได้
 *
 * @param rows - array ของ KeyValueRow จาก form
 * @returns object ที่แปลงแล้ว หรือ null หากไม่มี row ที่มี key
 * @example
 * ```ts
 * keyValuesToObject([
 *   { _id: "kv_1", key: "count", value: "5" },
 *   { _id: "kv_2", key: "active", value: "true" },
 * ]);
 * // { count: 5, active: true }
 * ```
 */
export function keyValuesToObject(
  rows: KeyValueRow[],
): Record<string, unknown> | null {
  const filtered = rows.filter((r) => r.key.trim());
  if (filtered.length === 0) return null;
  const result: Record<string, unknown> = {};
  for (const row of filtered) {
    const k = row.key.trim();
    const v = row.value.trim();
    const num = Number(v);
    if (v !== "" && !Number.isNaN(num)) {
      result[k] = num;
    } else if (v === "true") {
      result[k] = true;
    } else if (v === "false") {
      result[k] = false;
    } else {
      result[k] = v;
    }
  }
  return result;
}
