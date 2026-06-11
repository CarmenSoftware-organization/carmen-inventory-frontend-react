export type WastageReportStatus = "pending" | "approved" | "rejected";

export interface WastageReportItem {
  id: string;
  product_id: string;
  product_name: string;
  product_code: string;
  qty: number;
  unit_id: string;
  unit_name: string;
  unit_cost: number;
  loss_value: number;
}

export interface WastageReportAttachment {
  id: string;
  name: string;
  url: string;
}

export interface WastageReport {
  id: string;
  wr_no: string;
  date: string;
  location_id: string;
  location_name: string;
  reason: string;
  reportor_id: string;
  reportor_name: string;
  status: WastageReportStatus;
  qty_sum: number;
  loss_value: number;
  items: WastageReportItem[];
  attachments: WastageReportAttachment[];
  created_at: string;
  updated_at: string;
}

export interface WrDetailPayload {
  product_id: string;
  qty: number;
  unit_id: string;
  unit_cost: number;
}

export interface CreateWastageReportDto {
  date: string;
  location_id: string;
  reason: string;
  wastage_report_detail: {
    add?: WrDetailPayload[];
    update?: (WrDetailPayload & { id: string })[];
    remove?: { id: string }[];
  };
}
