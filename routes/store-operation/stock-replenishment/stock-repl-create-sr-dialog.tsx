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
import { LookupLocation } from "@/components/lookup/lookup-location";
import { useCreateStockReplSr } from "@/hooks/use-stock-replenishment";
import { WORKFLOW_TYPE } from "@/types/workflows";
import type { ProductLocation } from "@/types/stock-replenishment";

interface StockReplCreateSrDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly products: ProductLocation[];
  /** สร้างสำเร็จ — parent ใช้ล้าง selection */
  readonly onCreated?: () => void;
}

/**
 * Dialog สร้าง SR จากรายการที่เลือกในหน้า Stock Replenishment
 * เลือก workflow + คลังต้นทาง (from_location) แล้วยิง
 * `POST /api/{bu}/stock-replenishments/sr`
 */
export function StockReplCreateSrDialog({
  open,
  onOpenChange,
  products,
  onCreated,
}: StockReplCreateSrDialogProps) {
  const t = useTranslations("storeOperation.stockReplenishment");
  const tc = useTranslations("common");
  const tt = useTranslations("toast");
  const tfl = useTranslations("field");
  const [workflowId, setWorkflowId] = useState("");
  const [fromLocationId, setFromLocationId] = useState("");
  const createSr = useCreateStockReplSr();

  const handleOpenChange = (next: boolean) => {
    if (createSr.isPending) return;
    if (!next) {
      setWorkflowId("");
      setFromLocationId("");
    }
    onOpenChange(next);
  };

  const handleSubmit = () => {
    createSr.mutate(
      {
        product_ids: products.map((p) => p.id),
        workflow_id: workflowId,
        from_location: fromLocationId,
      },
      {
        onSuccess: () => {
          toast.success(tt("createSuccess", { entity: "SR" }));
          setWorkflowId("");
          setFromLocationId("");
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
          <DialogTitle>{t("createSrTitle")}</DialogTitle>
          <DialogDescription>{t("createSrDesc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel required>{tfl("workflow")}</FieldLabel>
              <LookupWorkflow
                value={workflowId}
                onValueChange={setWorkflowId}
                workflowType={WORKFLOW_TYPE.SR}
                creatableOnly
                disabled={createSr.isPending}
                className="text-xs"
              />
            </Field>
            <Field>
              <FieldLabel required>{tfl("fromLocation")}</FieldLabel>
              <LookupLocation
                value={fromLocationId}
                onValueChange={setFromLocationId}
                disabled={createSr.isPending}
                className="text-xs"
                modal
              />
            </Field>
          </div>

          <p className="text-muted-foreground text-xs">
            {t("nItems", { count: products.length })}
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={createSr.isPending}
          >
            {tc("cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={
              !workflowId ||
              !fromLocationId ||
              products.length === 0 ||
              createSr.isPending
            }
          >
            {createSr.isPending && (
              <Loader2 className="animate-spin" aria-hidden="true" />
            )}
            {tc("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
