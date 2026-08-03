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
 * `pending` ใช้ --status-pending-soft ซึ่งเป็นเทาไร้ hue (ผสม --foreground 2% เข้า
 * --muted) ไม่ใช่ tint ของ --status-draft — ในเชิงความหมาย "ยังไม่ถึง" คือยังไม่มี
 * สถานะ ไม่ใช่สถานะสีเทา · เดิมใช้ bg-muted เปล่า ๆ แต่ในโหมดมืดมันต่างจากพื้นหน้า
 * แค่ 1.13:1 รูปลูกศรจึงแทบไม่ปรากฏ (ช่อง pending มักเป็นช่องสุดท้าย ไม่มีเพื่อนบ้าน
 * ช่วยตัดขอบ) — token ใหม่ดัน 1.15 / 1.18 โดยข้อความยังผ่าน AA
 *
 * `voided` ใช้ --status-voided (ชมพูเข้ม) ไม่ใช่ text-destructive แบบโค้ดเดิม —
 * DESIGN.md ห้ามปน semantic token กับ document status และแอปมี token voided อยู่แล้ว
 *
 * `line-through` ของ voided ไม่ได้อยู่ที่นี่ แต่ไปอยู่ที่ <span> ของชื่อขั้น —
 * text-decoration propagate ลง in-flow descendant ทุกตัว ถ้าใส่ที่กล่องนอกเส้นจะ
 * ถูกลากทับไอคอน ✕ ด้วย
 */
const STATE_STYLE: Record<StageState, string> = {
  done: "bg-[var(--status-approved-soft)] text-muted-foreground",
  current: "bg-[var(--status-in-progress-soft)] text-foreground font-medium",
  pending: "bg-[var(--status-pending-soft)] text-muted-foreground",
  voided: "bg-[var(--status-voided-soft)] text-foreground font-medium",
};

/**
 * ไอคอนนำหน้าชื่อขั้น — รูปต่างกันต่อสถานะ ไม่ได้ต่างแค่สี
 *
 * ใช้ `-ink` ไม่ใช่ token สีสถานะตรง ๆ: token ตัวเปล่าเป็นสี "พื้น" ที่จูนไว้ให้มี
 * -fg วางทับ เอามาเป็นไอคอนบน tint ของตัวเองแล้ว contrast ตก (in-progress เหลือ
 * 1.47:1 ในโหมดสว่าง · voided 2.75:1 ในโหมดมืด) `-ink` เป็นเฉดเดียวกันคนละ L
 * ดูที่มาใน styles/badge-status.css
 */
function StateIcon({ state }: { readonly state: StageState }) {
  switch (state) {
    case "done":
      return (
        <Check
          className="text-[var(--status-approved-ink)] size-3 shrink-0"
          aria-hidden="true"
        />
      );
    case "current":
      return (
        <Circle
          className="text-[var(--status-in-progress-ink)] size-3 shrink-0 fill-current"
          aria-hidden="true"
        />
      );
    case "voided":
      return (
        <X
          className="text-[var(--status-voided-ink)] size-3 shrink-0"
          aria-hidden="true"
        />
      );
    case "pending":
      return (
        <Circle
          className="text-muted-foreground size-3 shrink-0"
          aria-hidden="true"
        />
      );
    // เพิ่ม StageState ตัวใหม่แล้วลืมเติม case ที่นี่ → TS error ตรงบรรทัดนี้
    // (STATE_STYLE เป็น Record<StageState, …> จับให้อยู่แล้ว แต่ switch ไม่จับเอง
    //  มันจะเงียบแล้วคืน undefined)
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
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
 * - **หนึ่งเฉดต่อหนึ่งช่อง** ปรากฏสองระดับความเข้ม — พื้น tint 7–18% กับไอคอนที่เป็น
 *   เฉดเดียวกันแต่เข้มกว่า (`--status-*-ink`) ไม่ใช่สองสัญญาณแข่งกัน
 * - **ข้อความเป็นสีกลางเสมอ** ไม่รับสีสถานะ — วัดแล้วผ่าน 4.5:1 ทั้งสองธีมทุกสถานะ
 *   (โหมดมืดฉิวเฉียด 4.5–4.6 เพราะ --muted-foreground บน --card เริ่มต้นที่ 4.89
 *   อยู่แล้ว จึงเป็นตัวกำหนดเพดานของ % ที่พื้น tint ผสมได้ ดู badge-status.css)
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
            <span
              className={cn(
                "max-w-20 truncate sm:max-w-32",
                // ขีดทับอยู่ที่ชื่อขั้นเท่านั้น ไม่ใช่ที่กล่องนอก — text-decoration
                // propagate ลง descendant เส้นจะถูกลากทับไอคอน ✕ ไปด้วย
                state === "voided" && "line-through",
              )}
              title={stage}
            >
              {stage}
            </span>
          </div>
        );
      })}
    </div>
  );
}
