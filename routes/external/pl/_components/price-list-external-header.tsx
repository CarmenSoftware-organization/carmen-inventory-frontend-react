import { formatDate } from "@/lib/date-utils";
import type { PricelistExternalDto } from "@/types/price-list-external";
import { Badge } from "@/components/ui/badge";

const DATE_FORMAT = "yyyy-MM-dd";

interface PriceListHeaderProps {
  data: PricelistExternalDto;
}

/**
 * Header ของหน้า price list external แสดงเลขที่ ชื่อ สถานะ vendor สกุลเงิน และช่วงวันที่มีผล
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
    <div className="p-4 space-y-2">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-lg font-semibold">{data.pricelist_no}</h1>
          <p className="text-muted-foreground">{data.name}</p>
        </div>
        <Badge className="font-bold">{data.status.toLocaleUpperCase()}</Badge>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm pt-2">
        <div>
          <span className="text-muted-foreground">Vendor Name:</span>{" "}
          <span className="font-medium">{data.vendor_name || "-"}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Currency:</span>{" "}
          <span className="font-medium">{data.currency_code}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Date:</span>{" "}
          <span className="font-medium">
            {formatDate(data.effective_from_date, DATE_FORMAT)} -{" "}
            {formatDate(data.effective_to_date, DATE_FORMAT)}
          </span>
        </div>
        {data.description && (
          <div className="col-span-2 md:col-span-4">
            <span className="text-muted-foreground">Description:</span>{" "}
            <span className="font-medium">{data.description}</span>
          </div>
        )}
        {data.note && (
          <div className="col-span-2 md:col-span-4">
            <span className="text-muted-foreground">Note:</span>{" "}
            <span className="font-medium">{data.note}</span>
          </div>
        )}
      </div>
    </div>
  );
}
