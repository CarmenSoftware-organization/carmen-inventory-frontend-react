
import { cn } from "@/lib/utils";

interface CardProps {
  readonly label?: string;
  /** คำอธิบายสั้นใต้ title (pattern เดียวกับ company profile/product) */
  readonly description?: string;
  readonly action?: React.ReactNode;
  /** section แรก — ไม่มีเส้นคั่น/padding บน */
  readonly first?: boolean;
  readonly children: React.ReactNode;
  readonly className?: string;
}

/**
 * section หนึ่งช่วงของฟอร์ม recipe — layout เดียวกับ SettingSection ของ company
 * profile/product: ซ้าย = title + คำอธิบาย (+ action), ขวา = เนื้อหา · มีเส้นคั่น
 * ด้านบนทุก section ยกเว้นอันแรก (`first`)
 */
export function Card({
  label,
  description,
  action,
  first,
  children,
  className,
}: CardProps) {
  return (
    <section
      className={cn(
        "grid gap-x-10 gap-y-3 md:grid-cols-3",
        !first && "border-border/70 mt-8 border-t pt-8",
        className,
      )}
    >
      <div className="md:col-span-1">
        {label && (
          <h2 className="text-base font-semibold tracking-tight">{label}</h2>
        )}
        {description && (
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            {description}
          </p>
        )}
        {action && <div className="mt-3">{action}</div>}
      </div>
      <div className="min-w-0 md:col-span-2">{children}</div>
    </section>
  );
}

export function CardSubLabel({
  children,
  className,
}: {
  readonly children: React.ReactNode;
  readonly className?: string;
}) {
  return (
    <div
      className={cn(
        "text-[0.625rem] font-bold uppercase tracking-[0.12em] text-foreground/80",
        className,
      )}
    >
      {children}
    </div>
  );
}
