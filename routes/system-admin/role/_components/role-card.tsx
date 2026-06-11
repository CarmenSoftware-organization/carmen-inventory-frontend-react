import { Shield } from "lucide-react";
import { useTranslations } from "use-intl";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Role } from "@/types/role";

interface RoleCardProps {
  readonly item: Role;
  readonly index?: number;
  readonly onEdit: (item: Role) => void;
}

/**
 * การ์ดแสดงข้อมูล Role สำหรับมุมมอง mobile/card
 * @param props - ข้อมูล item (Role), ลำดับ index และ callback onEdit เมื่อคลิกการ์ด
 * @returns JSX element ของการ์ด Role
 * @example
 * <RoleCard item={role} index={0} onEdit={handleEdit} />
 */
export default function RoleCard({ item, index, onEdit }: RoleCardProps) {
  const t = useTranslations("systemAdmin.role");
  const permCount = item.permissions?.length ?? 0;

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
      className="cursor-pointer gap-0 py-0 transition-all hover:border-primary/30 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CardHeader className="px-4 py-3">
        <div className="flex items-start gap-2">
          {typeof index === "number" && (
            <span className="bg-muted text-muted-foreground mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.625rem] font-semibold tabular-nums">
              {index + 1}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-sm">{item.name}</CardTitle>
          </div>
        </div>
        <CardAction>
          <Badge variant="secondary" size="sm" className="text-xs">
            {permCount} {t("permissions")}
          </Badge>
        </CardAction>
      </CardHeader>

      {item.description && (
        <>
          <Separator />
          <CardContent className="space-y-2 px-4 py-3 text-xs">
            <div className="flex items-start gap-2">
              <Shield
                className="text-muted-foreground mt-0.5 size-3 shrink-0"
                aria-hidden="true"
              />
              <p className="text-muted-foreground line-clamp-2">
                {item.description}
              </p>
            </div>
          </CardContent>
        </>
      )}
    </Card>
  );
}
