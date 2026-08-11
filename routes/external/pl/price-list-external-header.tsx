import { formatDate } from "@/lib/date-utils";
import type { PricelistExternalDto } from "@/types/price-list-external";
import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import { PL_STATUS_TONE } from "@/constant/price-list";

const DATE_FORMAT = "yyyy-MM-dd";

interface PriceListHeaderProps {
  data: PricelistExternalDto;
}

/** meta cell แบบ stacked: eyebrow label เล็ก recede อยู่บน, value เด่นอยู่ล่าง */
function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-micro font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

/**
 * Header ของเอกสารคำขอเสนอราคา (RFQ) ที่โรงแรมยื่นให้ vendor กรอกราคา — เรียง
 * ความสำคัญตามที่ vendor ต้องเห็น: (1) นี่คือคำขอเสนอราคา (2) โรงแรมผู้ขอเป็น hero
 * (3) ช่วงเวลาที่ราคามีผล + สกุลเงิน · ชื่อ price list เป็นแค่ reference เล็ก ๆ
 *
 * @param props - data ของ price list ที่จะแสดงบน header
 * @returns element ของส่วน header
 */
export default function PriceListExternalHeader({
  data,
}: PriceListHeaderProps) {
  return (
    <header className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <p className="text-micro font-semibold uppercase tracking-wider text-muted-foreground">
            Request for Pricing · {data.pricelist_no}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {data.hotel?.name ?? "—"}
          </h1>
          {data.hotel?.address && (
            <p className="text-sm text-muted-foreground">
              {data.hotel.address}
            </p>
          )}
        </div>
        <StatusDotBadge tone={PL_STATUS_TONE[data.status] ?? "neutral"}>
          {data.status.toLocaleUpperCase()}
        </StatusDotBadge>
      </div>

      <dl className="grid grid-cols-2 md:grid-cols-4 gap-6 p-5 bg-slate-50/80 rounded-lg border border-slate-100">
        <Meta label="Vendor" value={data.vendor?.name || "—"} />
        <Meta label="Currency" value={data.currency_code} />
        <Meta
          label="Effective period"
          value={`${formatDate(data.effective_from_date, DATE_FORMAT)} – ${formatDate(
            data.effective_to_date,
            DATE_FORMAT,
          )}`}
        />
        <Meta label="Reference" value={data.name} />
      </dl>

      {(data.description || data.note) && (
        <dl className="grid gap-4 border-t border-slate-100 pt-6 mt-6">
          {data.description && (
            <Meta label="Instructions" value={data.description} />
          )}
          {data.note && <Meta label="Note" value={data.note} />}
        </dl>
      )}
    </header>
  );
}
