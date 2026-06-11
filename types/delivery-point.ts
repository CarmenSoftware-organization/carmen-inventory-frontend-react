export interface DeliveryPoint {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateDeliveryPointDto {
  name: string;
  is_active: boolean;
}
