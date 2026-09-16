import { createContext, useContext } from "react";
import type { SupportedLocale } from "@/i18n/config";

export const LocaleSwitchContext = createContext<
  (locale: SupportedLocale) => void
>(() => {});

export const useSwitchLocale = () => useContext(LocaleSwitchContext);
