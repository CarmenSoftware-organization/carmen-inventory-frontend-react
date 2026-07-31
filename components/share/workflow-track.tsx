import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkflowTrackProps {
  readonly previousStage?: string;
  readonly currentStage: string;
  readonly nextStage?: string;
  readonly terminalState?: "voided";
}

/**
 * ลำดับขั้น workflow ของเอกสาร — บรรทัดเดียวแบบ breadcrumb ใต้เลขที่ใบ
 *
 * เขียนใหม่แทน `WorkflowStep` โดยยึด docs/DESIGN.md เป็นหลัก:
 *
 * - **สีเดียวต่อหนึ่งองค์ประกอบ** ของเดิมยิงสี info ใส่ขั้นปัจจุบันสี่ชั้น
 *   (ป้าย CURRENT + จุด + halo ที่เต้น + ชื่อขั้น) ซึ่งเป็นกรณีตัวอย่างของกฎ
 *   "avoid neon" ตรง ๆ · ที่นี่ไม่ใช้สีบอกสถานะเลย ใช้น้ำหนักตัวอักษรกับ
 *   ความเข้มแทน — เหลือสีไว้ที่เดียวคือใบที่ถูกยกเลิก ซึ่งเป็นเรื่องผิดปกติจริง
 * - **ตัด CURRENT / PREVIOUS / NEXT ทิ้ง** ลำดับซ้ายไปขวาบอกอยู่แล้วว่าอันไหน
 *   ผ่านมาแล้ว/กำลังอยู่/ยังไม่ถึง ป้ายสามอันคือการอธิบายสิ่งที่ตาเห็นอยู่แล้ว
 * - **ไม่มี animation** ของเดิมมี `animate-ping` เต้นตลอดเวลาบนเอกสารที่ไม่ได้
 *   กำลังทำอะไร — ความเคลื่อนไหวควรบอกว่ามีอะไรเปลี่ยน ไม่ใช่ประดับสถานะที่นิ่ง
 * - **น้ำหนัก 500 ไม่ใช่ 700** ตาม DESIGN.md 500 คือชั้นของ "ค่า" ที่ต้องเด่นกว่า
 *   ของข้าง ๆ โดยไม่ตะโกน
 *
 * ใช้หน้าตาแบบ breadcrumb แต่ไม่ได้ใช้ `components/ui/breadcrumb` เพราะตัวนั้น
 * เป็น `<nav aria-label="breadcrumb">` ซึ่งแอปมีอยู่แล้วบน navbar — ใส่ซ้ำใน
 * หน้าเดียวกันจะกลายเป็น breadcrumb สองชุดสำหรับ screen reader ทั้งที่ขั้น
 * workflow เป็นสถานะ ไม่ใช่เส้นทางการนำทาง
 */
export function WorkflowTrack({
  previousStage,
  currentStage,
  nextStage,
  terminalState,
}: WorkflowTrackProps) {
  const isVoided = terminalState === "voided";
  const resolvedNext = isVoided || nextStage === "-" ? undefined : nextStage;
  const stages = [previousStage, currentStage, resolvedNext].filter(
    (s): s is string => !!s,
  );

  if (stages.length === 0) return null;

  const currentIndex = stages.indexOf(currentStage);

  return (
    <div className="flex min-w-0 items-center gap-1 text-micro">
      {stages.map((stage, i) => {
        const isCurrent = i === currentIndex;
        const currentIsVoided = isCurrent && isVoided;

        return (
          <div key={`${i}-${stage}`} className="flex min-w-0 items-center gap-1">
            {i > 0 && (
              <ChevronRight
                className="text-muted-foreground/40 size-3 shrink-0"
                aria-hidden="true"
              />
            )}
            <span
              title={stage}
              className={cn(
                "max-w-32 truncate",
                // ขั้นที่ยังไม่ถึงจางกว่าขั้นที่ผ่านมาแล้ว — อดีตยังเป็นข้อมูล
                // ที่อ่านได้ อนาคตเป็นแค่การบอกว่ายังมีต่อ
                i > currentIndex
                  ? "text-muted-foreground/60"
                  : "text-muted-foreground",
                isCurrent && "text-foreground font-medium",
                currentIsVoided && "text-destructive line-through",
              )}
            >
              {stage}
            </span>
          </div>
        );
      })}
    </div>
  );
}
