import { FileText, GitBranch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { PurchaseRequestTemplate } from "@/types/purchase-request";

interface PrtCardProps {
  readonly item: PurchaseRequestTemplate;
  readonly index?: number;
  readonly onEdit: (item: PurchaseRequestTemplate) => void;
}

/**
 * การ์ดแสดงข้อมูลเทมเพลต PR สำหรับ mobile view
 * @param props - ข้อมูลเทมเพลต, ลำดับ และ callback แก้ไข
 * @returns React element ของการ์ด PRT
 */
export default function PrtCard({ item, index, onEdit }: PrtCardProps) {
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
          <CardTitle className="truncate text-sm flex-1 min-w-0">{item.name || "..."}</CardTitle>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground truncate text-xs">
            {item.description || "-"}
          </p>
          <Badge
            variant={item.is_active ? "success" : "secondary"}
            size="xs"
            className="shrink-0 text-xs"
          >
            {item.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="space-y-2 px-4 py-3 text-xs">
        {item.workflow_name && (
          <div className="flex items-start gap-2">
            <GitBranch
              className="text-muted-foreground mt-0.5 size-3 shrink-0"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">Workflow</p>
              <p className="truncate font-medium">{item.workflow_name}</p>
            </div>
          </div>
        )}
        {item.department_name && (
          <div className="flex items-start gap-2">
            <FileText
              className="text-muted-foreground mt-0.5 size-3 shrink-0"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">Department</p>
              <p className="truncate font-medium">{item.department_name}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
