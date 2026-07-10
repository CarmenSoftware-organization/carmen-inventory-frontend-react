import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * โครงหนึ่ง section ของหน้า settings — 2 คอลัมน์แบบ Business Setting
 *
 * ซ้าย = ชื่อ section + คำอธิบายสั้น (+ count / action), ขวา = grid ของ field
 * มีเส้นคั่นด้านบนทุก section ยกเว้นอันแรก (คุมด้วย prop `first`)
 *
 * Shared primitive — ใช้ทั้ง company-profile, config-email, notification-template
 * และทุกฟอร์มใน vendor-management
 *
 * @param title - ชื่อ section
 * @param description - คำอธิบายสั้นว่า section นี้เกี่ยวกับอะไร
 * @param first - true = section แรก (ไม่มีเส้นคั่น/padding บน)
 * @param count - ตัวเลขต่อท้าย title (เช่นจำนวนแถวใน dynamic section)
 * @param action - คอนโทรลใต้คำอธิบาย (เช่นปุ่ม Add)
 * @param wide - body กินเต็มความกว้าง (เช่นตารางกว้าง) → title/desc วางด้านบน
 * @param children - field ต่างๆ
 */
export function SettingSection({
  title,
  description,
  first,
  count,
  action,
  wide,
  children,
}: {
  readonly title: string;
  readonly description?: string;
  readonly first?: boolean;
  /** optional count shown after the title (e.g. rows in a dynamic section) */
  readonly count?: number;
  /** optional control shown under the description (e.g. an Add button) */
  readonly action?: React.ReactNode;
  /** body needs full width (e.g. a wide table) — title/desc stack on top */
  readonly wide?: boolean;
  readonly children: React.ReactNode;
}) {
  const heading = (
    <>
      <div className="flex items-baseline gap-2">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {count !== undefined && (
          <span className="text-muted-foreground text-xs font-semibold tabular-nums">
            {count}
          </span>
        )}
      </div>
      {description && (
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          {description}
        </p>
      )}
    </>
  );

  if (wide) {
    return (
      <section
        className={cn(
          "space-y-4",
          !first && "border-border/70 mt-8 border-t pt-8",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">{heading}</div>
          {action}
        </div>
        <div className="min-w-0">{children}</div>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "grid gap-x-10 gap-y-4 md:grid-cols-3",
        !first && "border-border/70 mt-8 border-t pt-8",
      )}
    >
      <div className="md:col-span-1">
        {heading}
        {action && <div className="mt-3">{action}</div>}
      </div>
      <div className="grid gap-4 md:col-span-2 sm:grid-cols-2">{children}</div>
    </section>
  );
}

/**
 * Skeleton ที่ mirror โครง `SettingSection` เป๊ะ — ใช้ตอน loading ให้ความสูง
 * เท่ากับเนื้อหาจริง โดยรับ `fields` เป็น layout ของแต่ละช่อง ("full" กินเต็มแถว
 * เหมือน field ที่ `sm:col-span-2`, "half" = ครึ่งแถว, "tall" = textarea) reuse ได้
 */
export function SettingSectionSkeleton({
  first,
  fields,
}: {
  readonly first?: boolean;
  /** "half" = one grid cell · "full" = whole row · "tall" = full-row textarea */
  readonly fields: ReadonlyArray<"full" | "half" | "tall">;
}) {
  return (
    <div
      className={cn(
        "grid gap-x-10 gap-y-4 md:grid-cols-3",
        !first && "border-border/70 mt-8 border-t pt-8",
      )}
    >
      <div className="space-y-2 md:col-span-1">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-44" />
      </div>
      <div className="grid gap-4 md:col-span-2 sm:grid-cols-2">
        {fields.map((w, j) => (
          <Skeleton
            key={j}
            className={cn(
              "w-full",
              w === "tall" ? "h-24" : "h-14",
              (w === "full" || w === "tall") && "sm:col-span-2",
            )}
          />
        ))}
      </div>
    </div>
  );
}
