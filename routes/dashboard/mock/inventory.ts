// ── Status Pipeline ───────────────────────────────────────────────────────────

export const inventoryPipeline = {
  locationNotComplete: 5,
  locationComplete: 10,
  uncommittedDocs: 22,
  expiringItems: 35,
  inventoryValue: 195000,
};

// ── Location filter options ───────────────────────────────────────────────────

export const INVENTORY_LOCATIONS = ["Main Store", "Kitchen", "Bar"] as const;
export type InventoryLocation = (typeof INVENTORY_LOCATIONS)[number];

// ── Slow-Moving / Dead Stock ──────────────────────────────────────────────────

export interface SlowMovingItem {
  itemName: string;
  sku: string;
  location: InventoryLocation;
  daysNoMovement: number;
  estValue: number;
}

export const slowMovingItems: SlowMovingItem[] = [
  {
    itemName: "Aged Chedder",
    sku: "Aged Chedder",
    location: "Main Store",
    daysNoMovement: 20,
    estValue: 18000,
  },
  {
    itemName: "Special Malt Whisky",
    sku: "Shaft Whisky",
    location: "Kitchen",
    daysNoMovement: 17,
    estValue: 18000,
  },
  {
    itemName: "Bulk Cleaning Agent",
    sku: "Bulk Cleaning",
    location: "Kitchen",
    daysNoMovement: 5,
    estValue: 1000,
  },
];

// ── Inventory Replenishment (Below Par) ───────────────────────────────────────

export interface ReplenishmentItem {
  itemName: string;
  sku: string;
  location: string;
  onHand: number;
  parLevel: number;
  maxLevel: number;
  orderQty: number;
}

export const replenishmentItems: ReplenishmentItem[] = [
  {
    itemName: "Aged Chedder",
    sku: "APO-220101",
    location: "Kitchen",
    onHand: 250,
    parLevel: 10,
    maxLevel: 30,
    orderQty: 0,
  },
  {
    itemName: "Special Malt Whisky",
    sku: "APO-220105",
    location: "F&B Dept",
    onHand: 450,
    parLevel: 25,
    maxLevel: 50,
    orderQty: 0,
  },
  {
    itemName: "Bulk Cleaning Agent",
    sku: "APO-220107",
    location: "Kitchen",
    onHand: 100,
    parLevel: 5,
    maxLevel: 10,
    orderQty: 0,
  },
];

// ── Physical Stock Take Status ────────────────────────────────────────────────

export type PstStatus = "completed" | "awaiting_approval" | "in_progress";

export interface PstRecord {
  location: string;
  dept: string;
  lastCountDate: string;
  pstStatus: PstStatus;
  svfName: string;
}

export const pstRecords: PstRecord[] = [
  {
    location: "Main Store",
    dept: "Department Center",
    lastCountDate: "04/12/2026",
    pstStatus: "completed",
    svfName: "SVF-001",
  },
  {
    location: "Kitchen (Main)",
    dept: "F&B Dept",
    lastCountDate: "04/12/2026",
    pstStatus: "awaiting_approval",
    svfName: "SVF-002",
  },
  {
    location: "Bar (Cocktail)",
    dept: "Bar (Cocktail)",
    lastCountDate: "04/12/2026",
    pstStatus: "in_progress",
    svfName: "SVF-003",
  },
];

// ── Inventory Value by Material Group ────────────────────────────────────────

export const inventoryByMaterialGroup = [
  { name: "Food ($887,750 - 45%)", shortName: "Food", value: 45, amount: 887750 },
  { name: "Beverage ($58,800 - 30%)", shortName: "Beverage", value: 30, amount: 58800 },
  { name: "Chemical Supplies ($48,730 - 25%)", shortName: "Chemical", value: 25, amount: 48730 },
];

// ── Expired Items Alert ───────────────────────────────────────────────────────

export interface ExpiredItem {
  itemName: string;
  expiryDate: string;
}

export const expiredItems: ExpiredItem[] = [
  { itemName: "Fresh Produce Lot 12", expiryDate: "15/03/2026" },
  { itemName: "Specific Wine Vintage", expiryDate: "01/06/2026" },
  { itemName: "Fresh Produce Lot 12", expiryDate: "20/03/2026" },
  { itemName: "Fresh Produce Lot 12", expiryDate: "01/04/2026" },
];

// ── Total Consumption by Location ─────────────────────────────────────────────

export const consumptionByLocation = [
  { location: "Main Store", amount: 78000 },
  { location: "Kitchen", amount: 55500 },
  { location: "Bar", amount: 12000 },
];

// ── Total Consumption by Category ────────────────────────────────────────────

export const srAwaitingReceipt = [
  { srNumber: "SR900156", details: "Check Details" },
];

export const consumptionByCategory = [
  { category: "Food", amount: 38000 },
  { category: "Beverage", amount: 28000 },
  { category: "Guest Supply", amount: 12000 },
  { category: "Chemical", amount: 6000 },
];
