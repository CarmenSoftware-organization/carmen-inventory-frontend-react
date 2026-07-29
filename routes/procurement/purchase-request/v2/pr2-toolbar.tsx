import { Search, Wand2, X } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** ลำดับที่โชว์ในแถบสรุป — เรียงตามที่คนอนุมัติสนใจ: ค้างก่อน เสร็จทีหลัง */
const SUMMARY_ORDER = ["pending", "review", "approved", "rejected"] as const;

interface Pr2ToolbarProps {
  readonly totalCount: number;
  readonly counts: Record<string, number>;
  readonly statusFilter: string | null;
  readonly onStatusFilter: (status: string | null) => void;
  readonly search: string;
  readonly onSearch: (value: string) => void;
  /** ดึงราคาจาก price list ให้ทุกรายการ — เฉพาะตอนแก้ไขได้และมีรายการ */
  readonly onAutoAllocate?: () => void;
  readonly isAllocating?: boolean;
  /** เมนูถาม AI — caller ประกอบเอง (ต้องใช้รายการสินค้าจริง) */
  readonly askAi?: ReactNode;
}

/**
 * โซน 4 — สรุปสถานะ + ค้นหา + เลือกชุดคอลัมน์
 *
 * สองอย่างแรกมีเพราะใบนึงมีได้ถึง 100 รายการ: กวาดตาหาว่า "เหลืออะไรยังไม่เสร็จ"
 * ไม่ไหว และหาสินค้าตัวเดียวใน 100 แถวก็ไม่ไหว · กดตัวเลขสรุป = กรองทันที
 * เพราะนั่นคือสิ่งที่คนกดอนุมัติอยากทำต่อจากการอ่านมันอยู่แล้ว
 */
export function Pr2Toolbar({
  totalCount,
  counts,
  statusFilter,
  onStatusFilter,
  search,
  onSearch,
  onAutoAllocate,
  isAllocating,
  askAi,
}: Pr2ToolbarProps) {
  const t = useTranslations("procurement.purchaseRequest");
  const tv2 = useTranslations("procurement.purchaseRequest.v2");

  return (
    <div className="bg-background border-border flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-2">
      <span className="text-sm font-medium">
        {t("nItems", { count: totalCount })}
      </span>

      <div className="flex flex-wrap items-center gap-1">
        {SUMMARY_ORDER.filter((s) => counts[s] > 0).map((s) => {
          const active = statusFilter === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => onStatusFilter(active ? null : s)}
              aria-pressed={active}
              className={cn(
                "rounded px-2 py-0.5 text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent",
              )}
            >
              {/* เป็นกลางโดยตั้งใจ — สีของสถานะถือโดยป้ายในตารางที่เดียว
                  ย้ำสีเดิมอีกรอบตรงนี้ = สัญญาณกระจุก อ่านเป็น "เรืองแสง" */}
              <span className={active ? undefined : "text-muted-foreground"}>
                {tv2(`itemStatus.${s}` as "itemStatus.pending")}{" "}
                <span className="text-foreground font-semibold tabular-nums">
                  {counts[s]}
                </span>
              </span>
            </button>
          );
        })}
        {statusFilter && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => onStatusFilter(null)}
            aria-label={tv2("clearFilter")}
          >
            <X />
          </Button>
        )}
      </div>

      <div className="ml-auto flex items-center gap-1">
        {onAutoAllocate && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isAllocating || totalCount === 0}
            onClick={onAutoAllocate}
          >
            {isAllocating ? <Spinner /> : <Wand2 />}
            {t("autoAllocate")}
          </Button>
        )}
        {askAi}
      </div>

      <div className="relative w-full sm:w-56">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={tv2("searchPlaceholder")}
          className="h-8 pl-8 text-sm"
        />
      </div>

    </div>
  );
}
