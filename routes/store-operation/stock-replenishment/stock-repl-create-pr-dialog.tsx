import { useState } from "react";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { LookupWorkflow } from "@/components/lookup/lookup-workflow";
import { useCreateStockReplPr } from "@/hooks/use-stock-replenishment";
import { WORKFLOW_TYPE } from "@/types/workflows";
import type { ProductLocation } from "@/types/stock-replenishment";

interface StockReplCreatePrDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly products: ProductLocation[];
  /** สร้างสำเร็จ — parent ใช้ล้าง selection */
  readonly onCreated?: () => void;
}

/**
 * Dialog สร้าง PR จากรายการที่เลือกในหน้า Stock Replenishment
 * เลือก workflow (แบบเดียวกับ PrWorkflowField ใน pr-form) แล้วยิง
 * `POST /api/{bu}/stock-replenishments/pr`
 */
export function StockReplCreatePrDialog({
  open,
  onOpenChange,
  products,
  onCreated,
}: StockReplCreatePrDialogProps) {
  const t = useTranslations("storeOperation.stockReplenishment");
  const tc = useTranslations("common");
  const tt = useTranslations("toast");
  const tfl = useTranslations("field");
  const [workflowId, setWorkflowId] = useState("");
  const createPr = useCreateStockReplPr();

  const handleOpenChange = (next: boolean) => {
    if (createPr.isPending) return;
    if (!next) setWorkflowId("");
    onOpenChange(next);
  };

  const handleSubmit = () => {
    createPr.mutate(
      {
        product_ids: products.map((p) => p.id),
        workflow_id: workflowId,
      },
      {
        onSuccess: () => {
          toast.success(tt("createSuccess", { entity: "PR" }));
          setWorkflowId("");
          onOpenChange(false);
          onCreated?.();
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("createPrTitle")}</DialogTitle>
          <DialogDescription>{t("createPrDesc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field>
            <FieldLabel required>{tfl("workflow")}</FieldLabel>
            <LookupWorkflow
              value={workflowId}
              onValueChange={setWorkflowId}
              workflowType={WORKFLOW_TYPE.PR}
              creatableOnly
              disabled={createPr.isPending}
              className="text-xs"
            />
          </Field>

          <p className="text-muted-foreground text-xs">
            {t("nItems", { count: products.length })}
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={createPr.isPending}
          >
            {tc("cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!workflowId || products.length === 0 || createPr.isPending}
          >
            {createPr.isPending && (
              <Loader2 className="animate-spin" aria-hidden="true" />
            )}
            {tc("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
