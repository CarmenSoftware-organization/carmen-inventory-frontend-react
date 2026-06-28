import { Users } from "lucide-react";
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
import type { Department } from "@/types/department";

interface DepartmentCardProps {
  readonly item: Department;
  readonly index?: number;
  readonly onEdit: (item: Department) => void;
}

/**
 * การ์ดแสดงข้อมูล Department สำหรับมุมมอง mobile พร้อมจำนวนสมาชิก
 *
 * ใช้ภายใน `ConfigListTemplate` ผ่าน prop `renderCard` เมื่ออยู่ในมุมมอง
 * card แสดง name, code, status และจำนวนสมาชิก
 *
 * @param props - ข้อมูล item, index และ callback onEdit
 * @returns React element ของการ์ด Department
 * @example
 * ```tsx
 * <DepartmentCard item={department} index={0} onEdit={handleEdit} />
 * ```
 */
export default function DepartmentCard({
  item,
  index,
  onEdit,
}: DepartmentCardProps) {
  const t = useTranslations("config.department");
  const ts = useTranslations("status");

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
      className="hover:border-primary/30 focus-visible:ring-ring cursor-pointer gap-0 py-0 transition-colors focus-visible:ring-2"
    >
      <CardHeader className="px-4 py-3">
        <div className="flex items-start gap-2">
          {typeof index === "number" && (
            <span className="bg-muted text-muted-foreground mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.625rem] font-semibold tabular-nums">
              {index + 1}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-sm">{item.name || "..."}</CardTitle>
            <p className="text-muted-foreground text-xs">{item.code}</p>
          </div>
        </div>
        <CardAction>
          <Badge
            variant={item.is_active ? "success" : "secondary"}
            size="sm"
            className="text-xs"
          >
            {item.is_active ? ts("active") : ts("inactive")}
          </Badge>
        </CardAction>
      </CardHeader>

      {((item.department_users?.length ?? 0) > 0 || item.description) && (
        <>
          <Separator />
          <CardContent className="space-y-2 px-4 py-3 text-xs">
            {(item.department_users?.length ?? 0) > 0 && (
              <div className="flex items-center gap-2">
                <Users
                  className="text-muted-foreground size-3 shrink-0"
                  aria-hidden="true"
                />
                <p className="text-muted-foreground text-xs">
                  {t("members")}: {item.department_users?.length ?? 0}
                </p>
              </div>
            )}
            {item.description && (
              <p className="text-muted-foreground line-clamp-2 text-xs">
                {item.description}
              </p>
            )}
          </CardContent>
        </>
      )}
    </Card>
  );
}
