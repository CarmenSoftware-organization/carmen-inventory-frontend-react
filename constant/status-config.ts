import type { BadgeProps } from "@/components/ui/badge";

// ── Types ──────────────────────────────────────────────────────────────

/** Reusable badge variant type derived from the Badge component */
export type BadgeVariant = NonNullable<BadgeProps["variant"]>;

/** Shape of a single status config entry */
export interface StatusConfigEntry {
  /** Tailwind classes referencing CSS variables from badge-status.css */
  className: string;
  label: string;
}

/** A full status config record (keys are lowercase status strings) */
export type StatusConfig<S extends string = string> = Record<
  string,
  StatusConfigEntry
> & { [K in S]: StatusConfigEntry };

// ── Static class map ───────────────────────────────────────────────────
// Tailwind scans source for complete class names at build time.
// Dynamic construction (template literals) won't be detected.
// Every status className MUST be written out in full here.

const STATUS_CLASSNAMES: Record<string, string> = {
  /* Neutral / Initial */
  draft:       "bg-[var(--status-draft)] text-[var(--status-draft-fg)] border-transparent px-2",
  pending:     "bg-[var(--status-pending)] text-[var(--status-pending-fg)] border-transparent px-2",
  /* Info / Submitted */
  submitted:   "bg-[var(--status-submitted)] text-[var(--status-submitted-fg)] border-transparent px-2",
  sent:        "bg-[var(--status-sent)] text-[var(--status-sent-fg)] border-transparent px-2",
  open:        "bg-[var(--status-open)] text-[var(--status-open-fg)] border-transparent px-2",
  /* Progress / Active */
  active:      "bg-[var(--status-approved)] text-[var(--status-approved-fg)] border-transparent px-2",
  inactive:    "bg-[var(--status-closed)] text-[var(--status-closed-fg)] border-transparent px-2",
  in_progress: "bg-[var(--status-in-progress)] text-[var(--status-in-progress-fg)] border-transparent px-2",
  review:      "bg-[var(--status-review)] text-[var(--status-review-fg)] border-transparent px-2",
  partial:     "bg-[var(--status-partial)] text-[var(--status-partial-fg)] border-transparent px-2",
  save:        "bg-[var(--status-save)] text-[var(--status-save-fg)] border-transparent px-2",
  saved:       "bg-[var(--status-save)] text-[var(--status-save-fg)] border-transparent px-2",
  /* Positive / Complete */
  approved:    "bg-[var(--status-approved)] text-[var(--status-approved-fg)] border-transparent px-2",
  completed:   "bg-[var(--status-completed)] text-[var(--status-completed-fg)] border-transparent px-2",
  committed:   "bg-[var(--status-committed)] text-[var(--status-committed-fg)] border-transparent px-2",
  /* Negative / Terminal */
  rejected:    "bg-destructive text-destructive-foreground border-transparent px-2",
  cancelled:   "bg-[var(--status-cancelled)] text-[var(--status-cancelled-fg)] border-transparent px-2",
  closed:      "bg-[var(--status-closed)] text-[var(--status-closed-fg)] border-transparent px-2",
  locked:      "bg-[var(--status-locked)] text-[var(--status-locked-fg)] border-transparent px-2",
  voided:      "bg-destructive text-destructive-foreground border-transparent px-2",
  /* Workflow action badges */
  reviewed:  "bg-[var(--status-review)] text-[var(--status-review-fg)] border-transparent px-2",
  sent_back: "bg-[var(--status-review)] text-[var(--status-review-fg)] border-transparent px-2",
  /* Type badges (Inventory Adjustment) */
  "stock-in":  "bg-[var(--status-stock-in)] text-[var(--status-stock-in-fg)] border-transparent px-2",
  "stock-out": "bg-[var(--status-stock-out)] text-[var(--status-stock-out-fg)] border-transparent px-2",
  /* Workflow type badges — uses sub-module colors from module-colors.css */
  purchase_request_workflow:    "bg-[var(--sub-pr)] text-white border-transparent px-2",
  purchase_order_workflow:      "bg-[var(--sub-po)] text-white border-transparent px-2",
  store_requisition_workflow:   "bg-[var(--sub-store-requisition)] text-white border-transparent px-2",
  /* CN type badges */
  quantity_return:   "bg-[var(--status-quantity-return)] text-[var(--status-quantity-return-fg)] border-transparent px-2",
  amount_discount:   "bg-[var(--status-amount-discount)] text-[var(--status-amount-discount-fg)] border-transparent px-2",
  /* GRN type badges */
  grn_purchase_order: "bg-[var(--status-grn-po)] text-[var(--status-grn-po-fg)] border-transparent px-2",
  grn_manual:         "bg-[var(--status-grn-manual)] text-[var(--status-grn-manual-fg)] border-transparent px-2",
  /* PO type badges — uses sub-module colors */
  purchase_request:            "bg-[var(--sub-pr)] text-white border-transparent px-2",
  manual:                      "bg-[var(--sub-po)] text-white border-transparent px-2",
  pricelist:                   "bg-[var(--sub-price-list)] text-white border-transparent px-2",
  /* Cuisine region badges */
  ASIA:        "bg-[var(--status-cuisine-asia)] text-[var(--status-cuisine-asia-fg)] border-transparent px-2",
  EUROPE:      "bg-[var(--status-cuisine-europe)] text-[var(--status-cuisine-europe-fg)] border-transparent px-2",
  AMERICAS:    "bg-[var(--status-cuisine-americas)] text-[var(--status-cuisine-americas-fg)] border-transparent px-2",
  AFRICA:      "bg-[var(--status-cuisine-africa)] text-[var(--status-cuisine-africa-fg)] border-transparent px-2",
  MIDDLE_EAST: "bg-[var(--status-cuisine-middle-east)] text-[var(--status-cuisine-middle-east-fg)] border-transparent px-2",
  OCEANIA:     "bg-[var(--status-cuisine-oceania)] text-[var(--status-cuisine-oceania-fg)] border-transparent px-2",
};

// ── Factory functions ──────────────────────────────────────────────────

/**
 * สร้าง StatusConfig สำหรับ module หนึ่ง ๆ โดยแต่ละ status จะได้ className (Tailwind) และ label อัตโนมัติ
 *
 * - className: Tailwind classes ที่อ้างถึง CSS variables จาก badge-status.css
 * - label: generate อัตโนมัติเป็น `STATUS.toUpperCase().replace(/_/g, " ")`
 * - สามารถ override ต่อ status ผ่าน parameter `overrides`
 *
 * @param statuses - readonly array ของ status string
 * @param overrides - object override className หรือ label ต่อ status (optional)
 * @returns StatusConfig object ที่มี key เป็น status และ value เป็น { className, label }
 * @example
 * ```ts
 * const PR_STATUS_CONFIG = createStatusConfig(
 *   ["draft", "approved"] as const,
 *   { draft: { label: "Draft" } },
 * );
 * ```
 */
export function createStatusConfig<S extends string>(
  statuses: readonly S[],
  overrides?: Partial<Record<S, Partial<StatusConfigEntry>>>,
): StatusConfig<S> {
  const config = {} as Record<string, StatusConfigEntry>;
  for (const status of statuses) {
    const override = overrides?.[status];
    config[status] = {
      className: override?.className ?? STATUS_CLASSNAMES[status] ?? "",
      label: override?.label ?? status.toUpperCase().replace(/_/g, " "),
    };
  }
  return config as StatusConfig<S>;
}

/** Filter option shape for list page status dropdowns */
export interface StatusFilterOption {
  label: string;
  value: string;
}

/**
 * สร้าง array ของ filter options จาก StatusConfig สำหรับใช้ใน dropdown ของหน้า list
 *
 * value จะอยู่ในรูปแบบ `${fieldName}|string:${status}` ตามมาตรฐานของ filter string
 *
 * @param fieldName - ชื่อ field ของ API ที่จะ filter (เช่น "pr_status", "doc_status")
 * @param config - StatusConfig ที่ใช้ดึงรายการ
 * @param include - subset ของ status ที่ต้องการ (default: ทั้งหมด)
 * @returns array ของ { label, value } สำหรับ MultiSelectFilter
 * @example
 * ```ts
 * const options = createStatusFilterOptions("pr_status", PR_STATUS_CONFIG);
 * // [{ label: "DRAFT", value: "pr_status|string:draft" }, ...]
 * ```
 */
export function createStatusFilterOptions<S extends string>(
  fieldName: string,
  config: StatusConfig<S>,
  include?: S[],
): StatusFilterOption[] {
  const keys = include ?? (Object.keys(config) as S[]);
  return keys.map((status) => ({
    label: config[status].label,
    value: `${fieldName}|string:${status}`,
  }));
}

/**
 * สร้าง map ของ semantic badge variant สำหรับ workflow action หรือ status map แบบเบา
 *
 * ใช้เมื่อไม่ต้องการ CSS custom color แต่ใช้ variant ของ Badge component แทน
 *
 * @param entries - object ที่ map จาก status key → BadgeVariant
 * @returns Record ที่ key เป็น string และ value เป็น BadgeVariant
 * @example
 * ```ts
 * const ACTION_VARIANTS = createVariantMap({
 *   approve: "success",
 *   reject: "destructive",
 * });
 * ```
 */
export function createVariantMap<S extends string>(
  entries: Record<S, BadgeVariant>,
): Record<string, BadgeVariant> {
  return entries;
}
