import { useParams } from "react-router";
import PriceListExternalComponent from "./_components/price-list-external-component";

/**
 * หน้าแสดง price list สำหรับ vendor ภายนอกผ่าน url token (public — ไม่ต้อง auth)
 * url_token มาจาก route param (เดิม: Next params Promise) ส่งต่อให้ component หลัก
 * รวม wrapper `min-h-screen` ของ external layout เดิมไว้ในหน้านี้ (layout เดิมเป็น div ธรรมดา)
 */
export default function PriceListExternalPage() {
  const { url_token } = useParams<{ url_token: string }>();
  if (!url_token) return null; // route จับคู่ :url_token เสมอ — กัน type ระดับ runtime
  return (
    <div className="min-h-screen">
      <PriceListExternalComponent urlToken={url_token} />
    </div>
  );
}

export const Component = PriceListExternalPage;
