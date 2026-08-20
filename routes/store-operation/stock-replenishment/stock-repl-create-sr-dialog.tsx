import { useTranslations } from "use-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ProductLocation } from "@/types/stock-replenishment";

interface StockReplCreateSrDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly products: ProductLocation[];
}

/**
 * Dialog wizard สร้าง SR จากรายการที่เลือกในหน้า Stock Replenishment
 * ตอนนี้เป็นโครง dialog เปล่า — ขั้นตอนของ wizard จะตามมาทีหลัง
 */
export function StockReplCreateSrDialog({
  open,
  onOpenChange,
  products,
}: StockReplCreateSrDialogProps) {
  const t = useTranslations("storeOperation.stockReplenishment");
  const tc = useTranslations("common");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("createSrTitle")}</DialogTitle>
          <DialogDescription>{t("createSrDesc")}</DialogDescription>
        </DialogHeader>
        <div className="text-muted-foreground py-8 text-center text-xs">
          {t("nItems", { count: products.length })} · {tc("comingSoon")}
        </div>
      </DialogContent>
    </Dialog>
  );
}
