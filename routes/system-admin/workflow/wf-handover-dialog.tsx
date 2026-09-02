import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "use-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { User } from "@/types/workflows";
import type {
  WorkflowAssigneeReplacement,
  WorkflowAssigneeStage,
} from "./use-workflow-assignee-impact";

interface WfHandoverDialogProps {
  readonly open: boolean;
  /** เฉพาะ stage ที่ผู้ใช้ถือคนเดียว — stage ที่มีคนอื่นอยู่ด้วยไม่ต้องหาคนแทน */
  readonly stages: WorkflowAssigneeStage[];
  readonly leavingUserName: string;
  readonly candidates: User[];
  readonly isPending: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: (replacements: WorkflowAssigneeReplacement[]) => void;
}

/**
 * ให้เลือกคนรับช่วงของทุก stage ที่ผู้ใช้คนนี้ถืออยู่คนเดียว ก่อนที่เขาจะถูกลบ
 *
 * ถ้าลบไปเลย stage เหล่านั้นจะเหลือคนอนุมัติ 0 คน เอกสารที่รออยู่จะหยุดเดินโดยไม่มี error แจ้งใคร —
 * ปุ่มอนุมัติจะหายไปเฉย ๆ เพราะระบบคืน view_only ให้ทุกคนเมื่อไม่มีใครถูก assign
 *
 * เรียง stage ที่มีเอกสารค้างเยอะสุดขึ้นก่อน เพราะนั่นคือตัวที่ต้องรีบตัดสินใจที่สุด
 * @param props - ตัวเลือกของ dialog
 * @param props.open - เปิดอยู่หรือไม่
 * @param props.stages - stage ที่ต้องหาคนแทน
 * @param props.leavingUserName - ชื่อผู้ใช้ที่กำลังจะถูกลบ
 * @param props.candidates - รายชื่อผู้ใช้ที่เลือกเป็นคนแทนได้
 * @param props.isPending - กำลังบันทึกการส่งมอบอยู่หรือไม่
 * @param props.onCancel - ยกเลิก
 * @param props.onConfirm - ยืนยันพร้อมรายการผู้รับช่วงที่เลือกครบแล้ว
 * @returns dialog เลือกผู้รับช่วง
 */
export function WfHandoverDialog({
  open,
  stages,
  leavingUserName,
  candidates,
  isPending,
  onCancel,
  onConfirm,
}: WfHandoverDialogProps) {
  const t = useTranslations("systemAdmin.workflow.handover");
  const tc = useTranslations("common");
  const [picked, setPicked] = useState<Record<string, string>>({});

  const keyOf = (row: WorkflowAssigneeStage) =>
    `${row.workflow_id}|${row.stage}`;
  const ordered = [...stages].sort(
    (a, b) => b.in_progress_documents - a.in_progress_documents,
  );
  // ต้องเลือกครบทุก stage ถึงจะยืนยันได้ — ส่งไปครึ่งเดียวก็เหลือ stage ที่ยังไม่มีคนอยู่ดี
  const isComplete = ordered.every((row) => picked[keyOf(row)]);

  const handleConfirm = () =>
    onConfirm(
      ordered.map((row) => ({
        workflow_id: row.workflow_id,
        stage: row.stage,
        replacement_user_id: picked[keyOf(row)],
      })),
    );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !next && !isPending && onCancel()}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="text-warning-ink flex items-center gap-2">
            <AlertTriangle className="size-5" aria-hidden="true" />
            <DialogTitle className="text-warning-ink">{t("title")}</DialogTitle>
          </div>
          <DialogDescription>
            {t("description", { name: leavingUserName, count: ordered.length })}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-80 space-y-3 overflow-y-auto">
          {ordered.map((row) => (
            <div key={keyOf(row)} className="rounded-lg border p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{row.workflow_name}</span>
                <span className="text-muted-foreground">›</span>
                <span>{row.stage}</span>
                {row.in_progress_documents > 0 && (
                  <Badge variant="secondary" size="sm">
                    {t("waiting", { count: row.in_progress_documents })}
                  </Badge>
                )}
              </div>
              <Select
                value={picked[keyOf(row)] ?? ""}
                onValueChange={(value) =>
                  setPicked((prev) => ({ ...prev, [keyOf(row)]: value }))
                }
                disabled={isPending}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("pickReplacement")} />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.firstname} {user.lastname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isPending}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleConfirm} disabled={!isComplete || isPending}>
            {isPending ? t("applying") : t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
