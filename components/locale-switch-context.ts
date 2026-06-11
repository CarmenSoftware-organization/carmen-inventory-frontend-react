import { createContext, useContext } from "react";
import type { SupportedLocale } from "@/i18n/config";

export const LocaleSwitchContext = createContext<
  (locale: SupportedLocale) => void
>(() => {});

/** ใช้โดย hooks/use-locale-switch.ts */
export const useSwitchLocale = () => useContext(LocaleSwitchContext);
