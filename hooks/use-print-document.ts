
import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import {
  printDocument,
  type PrintDocumentOptions,
  type PrintDocumentResult,
  type PrintDocumentType,
} from "@/lib/print-document";
import { resolvePrintFormTemplateId } from "@/lib/print-form-config";
import { useBuCode } from "@/hooks/use-bu-code";
import { useBusinessUnit } from "@/hooks/use-business-unit";
import { useProfile } from "@/hooks/use-profile";

export interface UsePrintDocumentResult {
  print: (
    documentType: PrintDocumentType,
    options?: PrintDocumentOptions,
  ) => Promise<PrintDocumentResult | null>;
  isPrinting: boolean;
}

/**
 * UI-side wrapper around printDocument(): pulls buCode from context, applies the
 * BU's configured print form, manages a loading flag so callers can disable
 * buttons, and surfaces failures via toast.
 *
 * The form comes from the BU record (`useBusinessUnit`), not from the profile —
 * `useProfile().defaultBu.config` is a different, curated object shape that does
 * not carry the config array the Default Setting page edits. The query is cached
 * for 5 minutes, so this costs no extra request per print.
 */
export function usePrintDocument(): UsePrintDocumentResult {
  const buCode = useBuCode();
  const { defaultBu } = useProfile();
  const { data: businessUnit } = useBusinessUnit(defaultBu?.id);
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
      // caller-supplied templateId wins over the BU config
      const templateId =
        options?.templateId ??
        resolvePrintFormTemplateId(businessUnit?.config, documentType);
      const result = await printDocument(buCode, documentType, {
        ...options,
        templateId,
      });
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
