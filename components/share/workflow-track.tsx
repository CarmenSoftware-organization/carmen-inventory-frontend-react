import { Check, Circle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkflowTrackProps {
  readonly previousStage?: string;
  readonly currentStage: string;
  readonly nextStage?: string;
  readonly terminalState?: "voided";
}

type StageState = "done" | "current" | "pending" | "voided";

/**
 * ตำแหน่งในลำดับ → สถานะของช่อง
 *
 * `currentIndex` เป็น -1 ได้เมื่อ `currentStage` เป็นสตริงว่าง (ถูก filter ทิ้งไป
 * ก่อนหน้า) — กรณีนั้นทุกช่องกลายเป็น pending ซึ่งตรงกับพฤติกรรมเดิมของไฟล์นี้
 */
function resolveState(
  i: number,
  currentIndex: number,
  isVoided: boolean,
): StageState {
  if (i < currentIndex) return "done";
  if (i > currentIndex) return "pending";
  return isVoided ? "voided" : "current";
}

/**
 * พื้น tint + สีข้อความของแต่ละสถานะ
 *
 * `pending` ใช้ bg-muted ไม่ใช่ tint ของ --status-draft เพราะเทา 10% ผสมกับ --card
 * ในโหมดมืดจางจนมองไม่เห็นรูปลูกศร และในเชิงความหมาย "ยังไม่ถึง" คือยังไม่มี
 * สถานะ ไม่ใช่สถานะสีเทา — bg-muted เป็น token ที่ badge variant `-light` ใช้เป็น
 * กล่องกลางอยู่แล้ว
 *
 * `voided` ใช้ --status-voided (ชมพูเข้ม) ไม่ใช่ text-destructive แบบโค้ดเดิม —
 * DESIGN.md ห้ามปน semantic token กับ document status และแอปมี token voided อยู่แล้ว
 */
const STATE_STYLE: Record<StageState, string> = {
  done: "bg-status-approved-soft text-muted-foreground",
  current: "bg-status-in-progress-soft text-foreground font-medium",
  pending: "bg-muted text-muted-foreground/70",
  voided: "bg-status-voided-soft text-foreground font-medium line-through",
};

/** ไอคอนนำหน้าชื่อขั้น — รูปต่างกันต่อสถานะ ไม่ได้ต่างแค่สี */
function StateIcon({ state }: { readonly state: StageState }) {
  switch (state) {
    case "done":
      return (
        <Check
          className="text-status-approved size-3 shrink-0"
          aria-hidden="true"
        />
      );
    case "current":
      return (
        <Circle
          className="text-status-in-progress size-3 shrink-0 fill-current"
          aria-hidden="true"
        />
      );
    case "voided":
      return (
        <X className="text-status-voided size-3 shrink-0" aria-hidden="true" />
      );
    case "pending":
      return (
        <Circle
          className="text-muted-foreground size-3 shrink-0"
          aria-hidden="true"
        />
      );
  }
}

/**
 * ลำดับขั้น workflow ของเอกสาร — ลูกศรต่อกันใต้เลขที่ใบ
 *
 * เดิมเป็น breadcrumb ข้อความล้วนที่แยกสถานะด้วยความเข้มของสีเทากับน้ำหนัก
 * ตัวอักษรเท่านั้น ในแถบหัวเอกสารที่มีทั้ง badge สถานะ เลข version และช่องข้อมูล
 * อีกหลายช่อง ความต่างระดับนั้นเบาเกินกว่าจะกวาดตาเจอ
 *
 * การกลับมาใช้สีบอกสถานะเป็นการย้อน comment เดิมของไฟล์นี้อย่างตั้งใจ — กฎจริง
 * ใน docs/DESIGN.md คือ "สถานะเป็นข้อมูล ไม่ใช่การประดับ และปรากฏครั้งเดียว
 * ต่อองค์ประกอบ" ไม่ใช่ "ห้ามใช้สี" · สิ่งที่โค้ดเดิมแก้คือการยิงสี info ใส่ขั้น
 * ปัจจุบันสี่ชั้นพร้อมกัน (ป้าย CURRENT + จุด + halo ที่เต้น + ชื่อขั้น) ซึ่งที่นี่
 * ไม่ทำซ้ำ ข้อจำกัดที่ตั้งไว้กันไม่ให้ไหลกลับไปทางนั้น:
 *
 * - **หนึ่งเฉดต่อหนึ่งช่อง** ปรากฏสองระดับความเข้ม — พื้น tint 14–18% กับไอคอน
 *   เต็มความเข้ม เป็นสีเดียวกันคนละน้ำหนัก ไม่ใช่สองสัญญาณแข่งกัน
 * - **ข้อความเป็นสีกลางเสมอ** ไม่รับสีสถานะ — contrast จึงผ่าน 4.5:1 ทั้งสองธีม
 *   โดยไม่ต้องทำ ink token เพิ่ม
 * - **ไอคอนต่างรูปต่อสถานะ** คนตาบอดสีเขียว-เหลืองยังแยก ✓ / ● / ○ / ✕ ออก
 *   (WCAG 1.4.1 — ห้ามใช้สีเป็นตัวบอกอย่างเดียว)
 * - **ไม่มี animation** ความเคลื่อนไหวควรบอกว่ามีอะไรเปลี่ยน ไม่ใช่ประดับสถานะที่นิ่ง
 *
 * ยังไม่ใช้ `components/ui/breadcrumb` เพราะตัวนั้นเป็น `<nav aria-label="breadcrumb">`
 * ซึ่งแอปมีอยู่แล้วบน navbar — ใส่ซ้ำในหน้าเดียวกันจะกลายเป็น breadcrumb สองชุด
 * สำหรับ screen reader ทั้งที่ขั้น workflow เป็นสถานะ ไม่ใช่เส้นทางการนำทาง
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
    <div className="flex min-w-0 items-center gap-0.5">
      {stages.map((stage, i) => {
        const state = resolveState(i, currentIndex, isVoided);

        return (
          <div
            key={`${i}-${stage}`}
            className={cn(
              "wf-chevron text-micro flex h-6 min-w-0 items-center gap-1 pr-4",
              // ช่องแรกไม่มีรอยบากซ้าย จึงต้องการ padding น้อยกว่าช่องอื่น
              i === 0 ? "wf-chevron-head pl-2" : "pl-4",
              STATE_STYLE[state],
            )}
          >
            <StateIcon state={state} />
            <span className="max-w-20 truncate sm:max-w-32" title={stage}>
              {stage}
            </span>
          </div>
        );
      })}
    </div>
  );
}
