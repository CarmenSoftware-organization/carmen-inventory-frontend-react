import { type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DocFormHeaderProps {
  readonly title: string;
  /** บรรทัดย่อยใต้ title (เช่น document version) */
  readonly subtitle?: ReactNode;
  readonly backLabel: string;
  readonly onBack: () => void;
  readonly badges?: ReactNode;
  readonly actions?: ReactNode;
  readonly ribbon?: ReactNode;
  readonly workflowStep?: ReactNode;
  /** icon/visual block ก่อน title — สำหรับ icon-hero (เช่น IA, period-end) */
  readonly leading?: ReactNode;
  /**
   * content column ไม่มี px-4 — ใช้เมื่อ consumer จัด horizontal padding ให้
   * header+form body เองแล้ว (เช่นอยู่ใน centered card `p-4` หรือ container ที่
   * form body ก็ flush) เพื่อให้ title/ribbon align กับ form body ตัวจริง
   * (form body ที่มี px-4 ของตัวเอง เช่น PR/PO → ปล่อย default false)
   */
  readonly flush?: boolean;
}

export function DocFormHeader({
  title,
  subtitle,
  backLabel,
  onBack,
  badges,
  actions,
  ribbon,
  workflowStep,
  leading,
  flush = false,
}: DocFormHeaderProps) {
  return (
    <div>
      {/* ── Content column ── px-4 (เว้น flush) ให้ title/ribbon align กับ form
          body; ปุ่ม back absolute อ้าง title-row (start = ตำแหน่ง title เสมอ ไม่ว่า
          column จะ px-4 หรือ flush) จึง hang ออกซ้ายด้วย translate เดียวกันทั้งสอง
          โหมด — อยู่บรรทัดเดียวกับ title โดยไม่ push ให้ title เยื้อง */}
      <div className={cn("relative", !flush && "px-4")}>
        <div className="relative flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onBack}
            aria-label={backLabel}
            className="absolute top-1/2 left-0 -translate-x-[calc(100%+0.5rem)] -translate-y-1/2"
          >
            <ArrowLeft />
          </Button>
          {leading}
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <h1
              className="truncate text-xl font-semibold tracking-tight sm:text-2xl"
              title={title}
            >
              {title}
            </h1>
            {badges}
          </div>
          {actions && (
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          )}
        </div>
        {subtitle && (
          <div className="text-muted-foreground mt-0.5 text-xs">{subtitle}</div>
        )}

        {/* ── Document info ribbon ── */}
        {ribbon && (
          <div className="flex items-center justify-between pt-4">
            {/* -ml-4 หัก px-4 ของ RibbonCell ตัวแรก → content ตัวแรกเสมอกับ title */}
            <div className="-ml-4 flex items-center gap-2">{ribbon}</div>
            {workflowStep}
          </div>
        )}
      </div>
    </div>
  );
}

export function DocumentRibbon({ children }: { readonly children: ReactNode }) {
  return <div className="flex flex-wrap items-stretch">{children}</div>;
}

export function RibbonCell({
  label,
  children,
  className,
}: {
  readonly label: string;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <div className={cn("min-w-0 px-4", className)}>
      <p className="text-muted-foreground text-[0.625rem] font-semibold tracking-wider uppercase">
        {label}
      </p>
      <div className="mt-0.5 truncate text-sm font-semibold">{children}</div>
    </div>
  );
}
