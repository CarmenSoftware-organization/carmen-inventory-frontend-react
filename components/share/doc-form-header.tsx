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
  /**
   * วาง workflowStep เป็นแถวแยกใต้ ribbon แทนคอลัมน์ขวาข้าง ribbon — ใช้เมื่อ
   * ribbon เป็น grid ที่ต้อง align คอลัมน์กับ form body (เช่น PO): workflowStep
   * ข้างขวาจะหักความกว้าง ribbon ทำให้คอลัมน์ drift
   */
  readonly workflowStepBelow?: boolean;
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
  workflowStepBelow = false,
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
        {/* ribbon เป็น grid ที่ align คอลัมน์กับ form body (PO/PR/GRN/CN/SR); ml-4
            ของตัว ribbon เอง cancel -ml-4 นี้ ให้ content ตัวแรกเสมอกับ title.
            workflowStepBelow → workflowStep แยกแถวล่างเพื่อไม่หักความกว้าง ribbon */}
        {ribbon &&
          (workflowStepBelow ? (
            // ribbon เต็มความกว้าง (columns align กับ form body) + workflowStep
            // absolute มุมขวาบน อยู่ line เดียวกับ ribbon โดยไม่หักความกว้าง ribbon
            // (ribbon ชิดซ้าย cols fixed → มีที่ว่างขวาให้ step ไม่ทับ cells).
            // min-h เผื่อความสูง workflowStep (absolute ไม่กินที่) กัน content ถัดไป
            // (เช่น item table ตอนไม่มี general fields คั่น) ถูก step ทับ
            <div
              className={cn(
                "relative pt-4",
                workflowStep && "min-h-[6.5rem]",
              )}
            >
              <div className="-ml-4 flex w-full min-w-0 items-center">
                {ribbon}
              </div>
              {workflowStep && (
                <div className="absolute top-4 right-0">{workflowStep}</div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 pt-4">
              <div className="-ml-4 flex min-w-0 flex-1 items-center gap-2">
                {ribbon}
              </div>
              {workflowStep}
            </div>
          ))}
      </div>
    </div>
  );
}

/**
 * ribbon cell แบบ grid — label เล็ก uppercase + value; ไม่มี px (spacing มาจาก
 * grid gap ของ container) → align คอลัมน์กับ form body ที่ใช้ grid track เดียวกัน
 * (PO/PR/GRN/CN/SR)
 */
export function RibbonField({
  label,
  value,
  className,
}: {
  readonly label: string;
  readonly value: ReactNode;
  /** เช่น "lg:col-span-2" สำหรับ cell ที่ค่ายาว (department/vendor) */
  readonly className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-muted-foreground text-[0.625rem] font-semibold tracking-wider uppercase">
        {label}
      </p>
      <div className="mt-0.5 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}
