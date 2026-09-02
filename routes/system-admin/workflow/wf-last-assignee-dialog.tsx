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
import type { WorkflowCreateModel } from "./wf-form-schema";

/** ชนิดของ assigned_users ตามสคีมาฟอร์ม — หลวมกว่า `User` ตรงที่ department เป็น optional */
type StageAssignee = NonNullable<
  WorkflowCreateModel["data"]["stages"][number]["assigned_users"]
>[number];

interface WfLastAssigneeDialogProps {
  /** ผู้ใช้ที่กำลังจะถูกเอาออก และเป็นคนสุดท้ายของ stage นี้ (null = ปิด) */
  readonly leavingUser: StageAssignee | null;
  readonly candidates: StageAssignee[];
  /** เรียกพร้อมคนแทนเมื่อกดยืนยัน หรือไม่ส่งอะไรเมื่อยกเลิก */
  readonly onResolve: (replacement?: StageAssignee) => void;
}

/**
 * ขอคนแทนก่อนเอา assignee คนสุดท้ายออกจาก stage
 *
 * stage ที่ไม่เหลือใครจะทำให้เอกสารที่รออยู่หยุดเดิน โดยระบบคืน view_only ให้ทุกคน ปุ่มอนุมัติหายไป
 * เฉย ๆ ไม่มี error ที่ไหน — backend ปฏิเสธตอนกดบันทึกอยู่แล้ว การถามตรงนี้จึงกันไม่ให้ผู้ใช้กรอกต่อ
 * จนเสร็จแล้วค่อยรู้ว่าบันทึกไม่ได้
 * @param props - ตัวเลือกของ dialog
 * @param props.leavingUser - ผู้ใช้ที่กำลังจะถูกเอาออก
 * @param props.candidates - รายชื่อที่เลือกเป็นคนแทนได้
 * @param props.onResolve - ปิดกล่อง พร้อมคนแทนถ้ามี
 * @returns dialog ขอคนแทน
 */
export function WfLastAssigneeDialog({
  leavingUser,
  candidates,
  onResolve,
}: WfLastAssigneeDialogProps) {
  const t = useTranslations("systemAdmin.workflow.handover");
  const tc = useTranslations("common");
  const [picked, setPicked] = useState("");

  const close = (replacement?: StageAssignee) => {
    setPicked("");
    onResolve(replacement);
  };

  return (
    <Dialog open={!!leavingUser} onOpenChange={(next) => !next && close()}>
      <DialogContent>
        <DialogHeader>
          <div className="text-warning-ink flex items-center gap-2">
            <AlertTriangle className="size-5" aria-hidden="true" />
            <DialogTitle className="text-warning-ink">
              {t("lastAssigneeTitle")}
            </DialogTitle>
          </div>
          <DialogDescription>
            {t("lastAssigneeDescription", {
              name: leavingUser
                ? `${leavingUser.firstname} ${leavingUser.lastname}`
                : "",
            })}
          </DialogDescription>
        </DialogHeader>

        <Select value={picked} onValueChange={setPicked}>
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

        <DialogFooter>
          <Button variant="outline" onClick={() => close()}>
            {tc("cancel")}
          </Button>
          <Button
            disabled={!picked}
            onClick={() =>
              close(candidates.find((user) => user.user_id === picked))
            }
          >
            {t("replaceAndRemove")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
