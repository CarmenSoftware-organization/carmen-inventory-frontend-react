import type { ReactNode } from "react";
import { useTranslations } from "use-intl";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props {
  /** แถบขั้นตอน (`WorkflowTrack`) ที่จะห่อ */
  readonly children: ReactNode;
  /**
   * เปิดประวัติ — ไม่ส่ง = ใบนี้ยังไม่มีประวัติให้ดู แสดงแถบเฉย ๆ ไม่ทำให้กดได้
   * (ปุ่มที่กดแล้วไม่เกิดอะไรแย่กว่าไม่มีปุ่ม)
   */
  readonly onShowHistory?: () => void;
}

export function WorkflowStepButton({ children, onShowHistory }: Props) {
  const tc = useTranslations("common");

  if (!onShowHistory) return <>{children}</>;

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onShowHistory}
            aria-label={tc("workflowHistoryHint")}
            // w-fit: พื้นหลังตอน hover ต้องกอดเฉพาะแถบ ไม่ใช่ลากยาวเต็มบรรทัด
            // -ml-1: หักล้าง px-1 ของตัวเอง ให้แถบชิดซ้ายตรงกับ title ข้างบน
            className="hover:bg-muted/60 focus-visible:ring-ring -ml-1 w-fit cursor-pointer rounded-lg px-1 py-1 transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            {children}
          </button>
        </TooltipTrigger>
        <TooltipContent>{tc("workflowHistoryHint")}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
