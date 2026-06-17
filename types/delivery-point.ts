export interface DeliveryPoint {
  id: string;
  doc_version: number;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateDeliveryPointDto {
  doc_version?: number;
  name: string;
  is_active: boolean;
}
