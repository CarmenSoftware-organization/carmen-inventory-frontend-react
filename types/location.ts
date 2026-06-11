import type { DeliveryPoint } from "@/types/delivery-point";
import type { TransferPayload } from "@/types/transfer";
import type { INVENTORY_TYPE } from "@/constant/location";

export type { DeliveryPoint };

export type PhysicalCountType = "yes" | "no";

export interface UserLocation {
  id: string;
  firstname: string;
  lastname: string;
  middlename: string | null;
  telephone: string;
}

export interface ProductLocation {
  id: string;
  name: string | null;
  code: string | null;
  min_qty: number | null;
  max_qty: number | null;
  re_order_qty: number | null;
  par_qty: number | null;
}

export interface Location {
  id: string;
  code: string;
  name: string;
  location_type: INVENTORY_TYPE;
  physical_count_type: PhysicalCountType;
  delivery_point_name?: string;
  description: string;
  is_active: boolean;
  info: Record<string, string | number | boolean>;
  user_location: UserLocation[];
  product_location: ProductLocation[];
  delivery_point: DeliveryPoint | null;
}

export interface CreateLocationDto {
  code: string;
  name: string;
  location_type: INVENTORY_TYPE;
  physical_count_type: PhysicalCountType;
  description: string;
  is_active: boolean;
  delivery_point_id?: string;
  delivery_point_name?: string;
  users: TransferPayload;
  products: TransferPayload;
}
