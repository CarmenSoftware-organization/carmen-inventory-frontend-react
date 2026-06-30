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
//
// FLAT design (DESIGN.md "avoid neon"): badges are a NEUTRAL chip
// (`bg-muted` box, `text-foreground` label) with the status color carried
// as ONE signal — a small dot rendered via the `::before` pseudo-element.
// The dot color is the only place the status hue appears, so the chip never
// reads as a glowing/clustered block. `DOT` holds the shared neutral chip +
// dot geometry; each entry only appends `before:bg-[var(--status-X)]`.

/**
 * Flat dotted-chip base (DESIGN.md "avoid neon"): a neutral `bg-muted` box with
 * a single `::before` dot. Append `before:bg-…` for the dot color. Reusable for
 * any status/flag chip — not only doc statuses.
 */
export const STATUS_DOT_CHIP =
  "bg-muted text-foreground border-transparent px-2 gap-1.5 before:size-1.5 before:shrink-0 before:rounded-full before:content-['']";
const DOT = STATUS_DOT_CHIP;

const STATUS_CLASSNAMES: Record<string, string> = {
  /* Neutral / Initial */
  draft: `${DOT} before:bg-[var(--status-draft)]`,
  pending: `${DOT} before:bg-[var(--status-pending)]`,
  /* Info / Submitted */
  submitted: `${DOT} before:bg-[var(--status-submitted)]`,
  sent: `${DOT} before:bg-[var(--status-sent)]`,
  open: `${DOT} before:bg-[var(--status-open)]`,
  /* Progress / Active */
  active: `${DOT} before:bg-[var(--status-approved)]`,
  inactive: `${DOT} before:bg-[var(--status-closed)]`,
  in_progress: `${DOT} before:bg-[var(--status-in-progress)]`,
  review: `${DOT} before:bg-[var(--status-review)]`,
  partial: `${DOT} before:bg-[var(--status-partial)]`,
  save: `${DOT} before:bg-[var(--status-save)]`,
  saved: `${DOT} before:bg-[var(--status-save)]`,
  /* Positive / Complete */
  approved: `${DOT} before:bg-[var(--status-approved)]`,
  completed: `${DOT} before:bg-[var(--status-completed)]`,
  committed: `${DOT} before:bg-[var(--status-committed)]`,
  /* Negative / Terminal */
  rejected: `${DOT} before:bg-[var(--status-rejected)]`,
  cancelled: `${DOT} before:bg-[var(--status-cancelled)]`,
  closed: `${DOT} before:bg-[var(--status-closed)]`,
  locked: `${DOT} before:bg-[var(--status-locked)]`,
  voided: `${DOT} before:bg-[var(--status-voided)]`,
  /* Workflow action badges */
  reviewed: `${DOT} before:bg-[var(--status-review)]`,
  sent_back: `${DOT} before:bg-[var(--status-review)]`,
  /* Type badges (Inventory Adjustment) */
  "stock-in": `${DOT} before:bg-[var(--status-stock-in)]`,
  "stock-out": `${DOT} before:bg-[var(--status-stock-out)]`,
  /* Workflow type badges — uses sub-module colors from module-colors.css */
  purchase_request_workflow: `${DOT} before:bg-[var(--sub-pr)]`,
  purchase_order_workflow: `${DOT} before:bg-[var(--sub-po)]`,
  store_requisition_workflow: `${DOT} before:bg-[var(--sub-store-requisition)]`,
  /* CN type badges */
  quantity_return: `${DOT} before:bg-[var(--status-quantity-return)]`,
  amount_discount: `${DOT} before:bg-[var(--status-amount-discount)]`,
  /* GRN type badges */
  grn_purchase_order: `${DOT} before:bg-[var(--status-grn-po)]`,
  grn_manual: `${DOT} before:bg-[var(--status-grn-manual)]`,
  /* PO type badges — uses sub-module colors */
  purchase_request: `${DOT} before:bg-[var(--sub-pr)]`,
  manual: `${DOT} before:bg-[var(--sub-po)]`,
  pricelist: `${DOT} before:bg-[var(--sub-price-list)]`,
  /* Cuisine region badges */
  ASIA: `${DOT} before:bg-[var(--status-cuisine-asia)]`,
  EUROPE: `${DOT} before:bg-[var(--status-cuisine-europe)]`,
  AMERICAS: `${DOT} before:bg-[var(--status-cuisine-americas)]`,
  AFRICA: `${DOT} before:bg-[var(--status-cuisine-africa)]`,
  MIDDLE_EAST: `${DOT} before:bg-[var(--status-cuisine-middle-east)]`,
  OCEANIA: `${DOT} before:bg-[var(--status-cuisine-oceania)]`,
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
