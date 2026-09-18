import { useTranslations } from "use-intl";
import { BoxIcon } from "lucide-react";
import EmptyComponent from "@/components/empty-component";

/**
 * ใบนี้ดูการเคลื่อนไหวสต๊อกได้หรือยัง — เกณฑ์เดียวกับ CN/SR: ต้องปิดใบแล้ว
 * (GRN ปิดใบ = committed) ก่อนหน้านั้นของยังไม่เข้าคลังจริง โชว์ตารางไว้มีแต่
 * ทำให้คนเข้าใจว่ารับเข้าสต๊อกไปแล้ว
 */
export function grnStockVisible(docStatus?: string): boolean {
  return docStatus === "committed";
}

/**
 * รอ endpoint `GET /goods-received-note/{id}/stock-movements` ฝั่ง backend —
 * แท็บกับเกณฑ์การเปิดเสร็จแล้ว เหลือเสียบข้อมูล (ทรงเดียวกับ `SrStockTable`)
 */
export function GrnStockTable({ docStatus }: { readonly docStatus?: string }) {
  const t = useTranslations("procurement.goodsReceiveNote");
  return (
    <EmptyComponent
      icon={BoxIcon}
      title={
        grnStockVisible(docStatus)
          ? t("stockComingSoon")
          : t("stockNeedsCommitted")
      }
    />
  );
}
