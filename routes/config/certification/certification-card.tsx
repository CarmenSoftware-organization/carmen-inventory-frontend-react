import { useTranslations } from "use-intl";
import { Award, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Certification } from "@/types/certification";

interface CertificationCardProps {
  readonly item: Certification;
  readonly onEdit: (item: Certification) => void;
  readonly onDelete: (item: Certification) => void;
}

export default function CertificationCard({
  item,
  onEdit,
  onDelete,
}: CertificationCardProps) {
  const tc = useTranslations("common");

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onEdit(item)}
      onKeyDown={(e) => {
        // ข้าม keydown ที่มาจาก child (ปุ่ม footer) ไม่ให้ trigger edit
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEdit(item);
        }
      }}
      className="group hover:border-primary/40 focus-visible:ring-ring flex h-full cursor-pointer flex-col gap-0 overflow-hidden py-0 transition-colors focus-visible:ring-2"
    >
      <CardHeader className="px-4 pt-4 pb-3">
        <div className="flex items-start gap-3">
          <div className="bg-muted text-primary group-hover:bg-accent flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors">
            <Award className="size-4.5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="line-clamp-2 min-h-10 text-sm leading-snug font-semibold">
              {item.name || "..."}
            </CardTitle>
            <Badge variant="secondary" size="xs" className="mt-1 font-normal">
              {item.code}
            </Badge>
          </div>
          <StatusBadge active={item.is_active} className="shrink-0" />
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="flex-1 px-4 py-3">
        <p className="text-muted-foreground line-clamp-2 text-xs leading-snug">
          {item.description || "—"}
        </p>
      </CardContent>

      <Separator />

      <CardFooter className="justify-end px-2 py-1.5">
        <Button
          type="button"
          variant="destructive"
          size="xs"
          aria-label={tc("delete")}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item);
          }}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </CardFooter>
    </Card>
  );
}
