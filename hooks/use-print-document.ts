
import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import {
  printDocument,
  type PrintDocumentOptions,
  type PrintDocumentResult,
  type PrintDocumentType,
} from "@/lib/print-document";
import { useBuCode } from "@/hooks/use-bu-code";

export interface UsePrintDocumentResult {
  print: (
    documentType: PrintDocumentType,
    options?: PrintDocumentOptions,
  ) => Promise<PrintDocumentResult | null>;
  isPrinting: boolean;
}

/**
 * UI-side wrapper around printDocument(): pulls buCode from context, manages a
 * loading flag so callers can disable buttons, and surfaces failures via toast.
 */
export function usePrintDocument(): UsePrintDocumentResult {
  const buCode = useBuCode();
  const t = useTranslations("common");
  const [isPrinting, setIsPrinting] = useState(false);

  const print = async (
    documentType: PrintDocumentType,
    options?: PrintDocumentOptions,
  ): Promise<PrintDocumentResult | null> => {
    if (!buCode) {
      toast.error("Business unit not selected");
      return null;
    }
    setIsPrinting(true);
    try {
      const result = await printDocument(buCode, documentType, options);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`${t("print")}: ${message}`);
      return null;
    } finally {
      setIsPrinting(false);
    }
  };

  return { print, isPrinting };
}
