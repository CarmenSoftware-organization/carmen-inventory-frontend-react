import { Mail, Building2 } from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { User } from "@/types/workflows";

interface UserCardProps {
  readonly item: User;
  readonly index?: number;
  readonly onEdit: (item: User) => void;
}

/**
 * การ์ดแสดงข้อมูลผู้ใช้สำหรับมุมมอง mobile/card รองรับคลิก/คีย์บอร์ด
 * @param props - ข้อมูล item (User), ลำดับ index และ callback onEdit เมื่อคลิกการ์ด
 * @returns JSX element ของการ์ดผู้ใช้
 * @example
 * <UserCard item={user} index={0} onEdit={handleEdit} />
 */
export default function UserCard({ item, index, onEdit }: UserCardProps) {
  const fullName = `${item.firstname} ${item.middlename ? item.middlename + " " : ""}${item.lastname}`.trim();

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
          <CardTitle className="truncate text-sm">{fullName}</CardTitle>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="space-y-1.5 px-4 py-3 text-xs">
        <div className="flex items-center gap-2">
          <Mail
            className="text-muted-foreground size-3 shrink-0"
            aria-hidden="true"
          />
          <p className="text-muted-foreground truncate">{item.email}</p>
        </div>
        {item.department?.name && (
          <div className="flex items-center gap-2">
            <Building2
              className="text-muted-foreground size-3 shrink-0"
              aria-hidden="true"
            />
            <p className="text-muted-foreground truncate">
              {item.department.name}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
