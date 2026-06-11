export const CUISINE_REGION = {
  ASIA: "ASIA",
  EUROPE: "EUROPE",
  AMERICAS: "AMERICAS",
  AFRICA: "AFRICA",
  MIDDLE_EAST: "MIDDLE_EAST",
  OCEANIA: "OCEANIA",
} as const;

export type CuisineRegion = (typeof CUISINE_REGION)[keyof typeof CUISINE_REGION];

import { createStatusConfig } from "@/constant/status-config";

export const CUISINE_REGION_OPTIONS: { value: CuisineRegion; label: string }[] =
  [
    { value: CUISINE_REGION.ASIA, label: "Asia" },
    { value: CUISINE_REGION.EUROPE, label: "Europe" },
    { value: CUISINE_REGION.AMERICAS, label: "Americas" },
    { value: CUISINE_REGION.AFRICA, label: "Africa" },
    { value: CUISINE_REGION.MIDDLE_EAST, label: "Middle East" },
    { value: CUISINE_REGION.OCEANIA, label: "Oceania" },
  ];

export const CUISINE_REGION_CONFIG = createStatusConfig(
  [
    CUISINE_REGION.ASIA,
    CUISINE_REGION.EUROPE,
    CUISINE_REGION.AMERICAS,
    CUISINE_REGION.AFRICA,
    CUISINE_REGION.MIDDLE_EAST,
    CUISINE_REGION.OCEANIA,
  ] as const,
  {
    ASIA: { label: "Asia" },
    EUROPE: { label: "Europe" },
    AMERICAS: { label: "Americas" },
    AFRICA: { label: "Africa" },
    MIDDLE_EAST: { label: "Middle East" },
    OCEANIA: { label: "Oceania" },
  },
);
