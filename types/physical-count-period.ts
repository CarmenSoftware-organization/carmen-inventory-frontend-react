/**
 * แถวของ `GET physical-count-periods` — วันที่ของงวดอยู่ที่งวดบัญชีที่ผูก
 * (`tb_inventory_period`) ไม่มี `counting_period_*` บน wire (probe T02 2026-09-29)
 * ของเดิมอ่านฟิลด์ที่ไม่มีจริง → dropdown ว่างเสมอ
 */
export interface PhysicalCountPeriod {
  id: string;
  period_id: string;
  tb_inventory_period: {
    id: string;
    period: string;
    start_at: string;
    end_at: string;
    status: string;
  };
  status: string;
}

export interface CreatePhysicalCountPeriodDto {
  counting_period_from_date: string;
  counting_period_to_date: string;
  status: string;
}
