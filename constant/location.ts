export enum INVENTORY_TYPE {
  INVENTORY = "inventory",
  DIRECT = "direct",
  CONSIGNMENT = "consignment",
}

export const INVENTORY_TYPE_OPTIONS = [
  { label: "Inventory", value: INVENTORY_TYPE.INVENTORY },
  { label: "Direct", value: INVENTORY_TYPE.DIRECT },
  { label: "Consignment", value: INVENTORY_TYPE.CONSIGNMENT },
] as const;

/** Badge variant สำหรับแสดงประเภท location — ใช้ร่วมกันทุก lookup/list */
export type LocationTypeBadgeVariant = "info" | "warning" | "secondary";

export const LOCATION_TYPE_BADGE_VARIANT: Record<
  INVENTORY_TYPE,
  LocationTypeBadgeVariant
> = {
  [INVENTORY_TYPE.INVENTORY]: "info",
  [INVENTORY_TYPE.DIRECT]: "warning",
  [INVENTORY_TYPE.CONSIGNMENT]: "secondary",
};

export const PHYSICAL_COUNT_TYPE_OPTIONS = [
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
] as const;

