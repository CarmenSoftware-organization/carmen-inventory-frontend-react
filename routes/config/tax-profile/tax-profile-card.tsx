import { Percent } from "lucide-react";
import { useTranslations } from "use-intl";

import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui/status-badge";
import type { TaxProfile } from "@/types/tax-profile";

interface TaxProfileCardProps {
  readonly item: TaxProfile;
  readonly index?: number;
  readonly onEdit: (item: TaxProfile) => void;
}

/**
 * การ์ดแสดงข้อมูล Tax Profile สำหรับมุมมอง mobile
 * @param props - ข้อมูล item, index และ callback onEdit
 * @returns React element ของการ์ด Tax Profile
 * @example
 * // route: /config/tax-profile (mobile card view)
 * <TaxProfileCard item={item} index={0} onEdit={handleEdit} />
 */
export default function TaxProfileCard({ item, index, onEdit }: TaxProfileCardProps) {
  const tfl = useTranslations("field");

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
      className="cursor-pointer gap-0 py-0 transition-colors hover:border-primary/30 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CardHeader className="px-4 py-3">
        <div className="flex items-start gap-2">
          {typeof index === "number" && (
            <span className="bg-muted text-muted-foreground mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.625rem] font-semibold tabular-nums">
              {index + 1}
            </span>
          )}
          <CardTitle className="truncate text-sm flex-1 min-w-0">{item.name || "..."}</CardTitle>
        </div>
        <CardAction>
          <StatusBadge active={item.is_active} />
        </CardAction>
      </CardHeader>

      <Separator />

      <CardContent className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <Percent
            className="text-muted-foreground size-3 shrink-0"
            aria-hidden="true"
          />
          <span className="text-muted-foreground text-xs">
            {tfl("taxRate")}
          </span>
        </div>
        <span className="text-sm font-semibold tabular-nums">
          {item.tax_rate}%
        </span>
      </CardContent>
    </Card>
  );
}
