import { cn } from "@/lib/utils";

interface NameWithSubtextProps {
  primary: string;
  secondary?: string;
  align?: "start" | "end";
}

export function NameWithSubtext({
  primary,
  secondary,
  align = "start",
}: NameWithSubtextProps) {
  const isEnd = align === "end";
  return (
    <div
      className={cn(
        "group w-full",
        isEnd ? "text-right tabular-nums" : "text-left",
      )}
    >
      {/* title = ข้อความเต็ม — บรรทัดนี้ truncate ได้ที่ font scale ใหญ่ๆ และไม่มี
          ทางอื่นให้ผู้ใช้อ่านค่าที่ถูกตัดทิ้ง */}
      <p
        className="truncate py-0 leading-[normal] font-semibold"
        title={primary}
      >
        {primary}
      </p>
      {secondary && (
        <p
          className="text-muted-foreground text-micro-legal truncate py-0.5 leading-[normal]"
          title={secondary}
        >
          {secondary}
        </p>
      )}
    </div>
  );
}
