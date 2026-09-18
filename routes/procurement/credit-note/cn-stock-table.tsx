import { useTranslations } from "use-intl";
import { BoxIcon } from "lucide-react";
import EmptyComponent from "@/components/empty-component";
import { CN_STATUS } from "@/types/credit-note";

/**
 * ใบนี้ดูการเคลื่อนไหวสต๊อกได้หรือยัง — เกณฑ์เดียวกับ SR: เฉพาะใบที่ปิดจบแล้ว
 * ก่อนถึง completed ของยังไม่ขยับจริง โชว์ตารางไว้มีแต่ทำให้คนเข้าใจว่าตัดสต๊อกแล้ว
 */
export function cnStockVisible(docStatus?: string): boolean {
  return docStatus === CN_STATUS.COMPLETED;
}

/**
 * รอ endpoint `GET /credit-note/{id}/stock-movements` ฝั่ง backend — แท็บกับเกณฑ์
 * การเปิดเสร็จแล้ว เหลือเสียบข้อมูล (ทรงเดียวกับ `SrStockTable`)
 */
export function CnStockTable({ docStatus }: { readonly docStatus?: string }) {
  const t = useTranslations("procurement.creditNote");
  return (
    <EmptyComponent
      icon={BoxIcon}
      title={
        cnStockVisible(docStatus)
          ? t("stockComingSoon")
          : t("stockNeedsCompleted")
      }
    />
  );
}
