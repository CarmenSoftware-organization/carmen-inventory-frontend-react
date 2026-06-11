import { Building2, Phone, Mail } from "lucide-react";
import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Vendor } from "@/types/vendor";

interface VendorCardProps {
  readonly item: Vendor;
  readonly index?: number;
  readonly onEdit: (item: Vendor) => void;
}

/**
 * การ์ดแสดงข้อมูล vendor สำหรับ grid view
 *
 * รายละเอียด: แสดงชื่อ รหัส สถานะ active/inactive, ประเภทธุรกิจ (business_type)
 * และผู้ติดต่อหลัก (primary contact) พร้อมรองรับการคลิก/กด Enter เพื่อเปิดแก้ไข
 *
 * @param props - `item` ข้อมูล vendor, `index` ลำดับในกริด (optional), `onEdit` callback เมื่อคลิกการ์ด
 * @returns React element ของการ์ด vendor
 * @example
 * ```tsx
 * <VendorCard item={vendor} index={0} onEdit={(v) => router.push(`/vendor-management/vendor/${v.id}`)} />
 * ```
 */
export default function VendorCard({ item, index, onEdit }: VendorCardProps) {
  const tfl = useTranslations("field");
  const ts = useTranslations("status");
  const primaryContact = item.tb_vendor_contact?.find((c) => c.is_primary);

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onEdit(item)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEdit(item);
        }
      }}
      className="hover:border-primary/30 focus-visible:ring-ring cursor-pointer gap-0 py-0 transition-all hover:shadow-md focus-visible:ring-2"
    >
      <CardHeader className="px-4 py-3">
        <div className="flex items-start gap-2">
          {typeof index === "number" && (
            <span className="bg-muted text-muted-foreground mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.625rem] font-semibold tabular-nums">
              {index + 1}
            </span>
          )}
          <CardTitle className="text-sm flex-1 min-w-0 break-words">{item.name}</CardTitle>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-xs">{item.code}</p>
          <Badge
            variant={item.is_active ? "success" : "secondary"}
            size="xs"
            className="text-xs"
          >
            {item.is_active ? ts("active") : ts("inactive")}
          </Badge>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="space-y-2 px-4 py-3 text-xs">
        {item.business_type?.length > 0 && (
          <div className="flex items-start gap-2">
            <Building2
              className="text-muted-foreground mt-0.5 size-3 shrink-0"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">
                {tfl("businessType")}
              </p>
              <div className="mt-0.5 flex flex-wrap gap-1">
                {item.business_type.map((bt) => (
                  <Badge key={bt.id} variant="outline" size="xs">
                    {bt.name}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
        {primaryContact && (
          <>
            {primaryContact.phone && (
              <div className="flex items-start gap-2">
                <Phone
                  className="text-muted-foreground mt-0.5 size-3 shrink-0"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs">{primaryContact.name}</p>
                  <p className="truncate font-medium">{primaryContact.phone}</p>
                </div>
              </div>
            )}
            {primaryContact.email && (
              <div className="flex items-start gap-2">
                <Mail
                  className="text-muted-foreground mt-0.5 size-3 shrink-0"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="truncate font-medium">{primaryContact.email}</p>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
