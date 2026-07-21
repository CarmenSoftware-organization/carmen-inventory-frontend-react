import { formatDate } from "@/lib/date-utils";
import type { PricelistExternalDto } from "@/types/price-list-external";
import { Badge } from "@/components/ui/badge";

const DATE_FORMAT = "yyyy-MM-dd";

// align กับ pl-card convention (draft→outline, active→success, inactive→secondary)
// — สถานะไม่ใช่ action ดังนั้นไม่ใช้ default primary
const STATUS_VARIANT: Record<string, "outline" | "success" | "secondary"> = {
  draft: "outline",
  active: "success",
  inactive: "secondary",
};

interface PriceListHeaderProps {
  data: PricelistExternalDto;
}

/** meta cell แบบ stacked: eyebrow label เล็ก recede อยู่บน, value เด่นอยู่ล่าง */
function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

/**
 * Header ของหน้า price list external — eyebrow (เลขที่) + ชื่อเป็น hero + สถานะ
 * แล้วตามด้วยแถว meta (vendor / สกุลเงิน / ช่วงวันที่มีผล) แบบ stacked label/value
 *
 * @param props - data ของ price list ที่จะแสดงบน header
 * @returns element ของส่วน header price list
 * @example
 * ```tsx
 * <PriceListExternalHeader data={priceListData} />
 * ```
 */
export default function PriceListExternalHeader({
  data,
}: PriceListHeaderProps) {
  return (
    <header className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
            {data.pricelist_no}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {data.name}
          </h1>
        </div>
        <Badge variant={STATUS_VARIANT[data.status] ?? "outline"}>
          {data.status.toLocaleUpperCase()}
        </Badge>
      </div>

      <dl className="flex flex-wrap gap-x-10 gap-y-4">
        <Meta label="Vendor" value={data.vendor_name || "—"} />
        <Meta label="Currency" value={data.currency_code} />
        <Meta
          label="Effective"
          value={`${formatDate(data.effective_from_date, DATE_FORMAT)} – ${formatDate(
            data.effective_to_date,
            DATE_FORMAT,
          )}`}
        />
      </dl>

      {(data.description || data.note) && (
        <dl className="space-y-4 border-t border-border pt-4">
          {data.description && (
            <Meta label="Description" value={data.description} />
          )}
          {data.note && <Meta label="Note" value={data.note} />}
        </dl>
      )}
    </header>
  );
}
