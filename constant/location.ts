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

/** i18n key (namespace `config.location`) ของ label แต่ละประเภท location */
export const INVENTORY_TYPE_LABEL_KEY: Record<INVENTORY_TYPE, string> = {
  [INVENTORY_TYPE.INVENTORY]: "typeInventory",
  [INVENTORY_TYPE.DIRECT]: "typeDirect",
  [INVENTORY_TYPE.CONSIGNMENT]: "typeConsignment",
};

/**
 * คืน i18n key (namespace `config.location`) ของประเภท location จาก string ใดๆ
 * — คืน undefined ถ้าไม่รู้จัก เพื่อให้ caller fallback ได้อย่างปลอดภัย
 */
export function inventoryTypeLabelKey(type: string): string | undefined {
  return INVENTORY_TYPE_LABEL_KEY[type as INVENTORY_TYPE];
}

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

/** i18n key (namespace `config.location`) ของ label physical-count */
export const PHYSICAL_COUNT_LABEL_KEY: Record<string, string> = {
  yes: "pcYes",
  no: "pcNo",
};

