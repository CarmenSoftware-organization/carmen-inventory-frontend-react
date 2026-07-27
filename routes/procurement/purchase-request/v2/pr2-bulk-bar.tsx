import { useState } from "react";
import { Check, Eye, Scissors, X } from "lucide-react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { STAGE_ROLE } from "@/types/stage-role";
import {
  PrActionDialog,
  type ActionDialogItem,
  type StageOption,
} from "../workflow/pr-action-dialog";

interface Pr2BulkBarProps {
  readonly count: number;
  readonly role?: string;
  readonly isPending: boolean;
  readonly items: ActionDialogItem[];
  readonly previousStages?: StageOption[];
  readonly stagesLoading?: boolean;
  readonly onClear: () => void;
  readonly onApprove: () => void;
  readonly onReject: (messages: Record<number, string>) => void;
  readonly onReview: (messages: Record<number, string>, desStage: string) => void;
  readonly onSplit?: () => void;
}

/**
 * แถบที่โผล่เมื่อเลือกแถว — ใบนึงมีได้ถึง 100 รายการ ไม่มีใครกดทีละแถว 100 ครั้ง
 * flow จริงคือเลือกทั้งหมดแล้วอนุมัติรวด เหลือเฉพาะตัวที่มีปัญหาค่อยจัดการทีละตัว
 *
 * ปุ่มที่โผล่อิง role เดียวกับ footer — approve/purchase เท่านั้นที่ตัดสินรายแถวได้
 */
export function Pr2BulkBar({
  count,
  role,
  isPending,
  items,
  previousStages,
  stagesLoading,
  onClear,
  onApprove,
  onReject,
  onReview,
  onSplit,
}: Pr2BulkBarProps) {
  const t = useTranslations("procurement.purchaseRequest");
  const tc = useTranslations("common");
  const tv2 = useTranslations("procurement.purchaseRequest.v2");
  const [dialog, setDialog] = useState<"reject" | "review" | null>(null);

  const canDecide =
    role === STAGE_ROLE.APPROVE || role === STAGE_ROLE.PURCHASE;
  if (count === 0 || !canDecide) return null;

  return (
    <>
      <div className="bg-primary/10 border-primary/30 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2">
        <span className="text-sm font-medium">
          {tv2("nSelected", { count })}
        </span>
        {/* accent เดียวคือปุ่มที่พางานเดินหน้า (อนุมัติ) — ที่เหลือ outline
            แดงเก็บไว้เฉพาะปฏิเสธซึ่งทำลายจริง ส่งกลับเป็นกลาง (ดู pr2-actions) */}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={onApprove}
          >
            <Check />
            {tc("approve")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive"
            disabled={isPending}
            onClick={() => setDialog("reject")}
          >
            <X />
            {tc("reject")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => setDialog("review")}
          >
            <Eye />
            {tc("sendBack")}
          </Button>
          {onSplit && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={isPending}
              onClick={onSplit}
            >
              <Scissors />
              {t("split")}
            </Button>
          )}
          <Button type="button" size="sm" variant="ghost" onClick={onClear}>
            {tv2("clearSelection")}
          </Button>
        </div>
      </div>

      <PrActionDialog
        open={dialog === "reject"}
        onOpenChange={(o) => {
          if (!o) setDialog(null);
        }}
        title={t("rejectItemsTitle")}
        description={t("rejectItemsDesc")}
        confirmLabel={tc("reject")}
        confirmVariant="destructive"
        isPending={isPending}
        items={items}
        onConfirm={(messages) => {
          onReject(messages);
          setDialog(null);
        }}
      />

      <PrActionDialog
        open={dialog === "review"}
        onOpenChange={(o) => {
          if (!o) setDialog(null);
        }}
        title={t("reviewItemsTitle")}
        description={t("reviewItemsDesc")}
        confirmLabel={tc("sendBack")}
        confirmVariant="warning"
        isPending={isPending}
        stages={previousStages}
        stagesLoading={stagesLoading}
        items={items}
        onConfirm={(messages, desStage) => {
          onReview(messages, desStage ?? "");
          setDialog(null);
        }}
      />
    </>
  );
}
