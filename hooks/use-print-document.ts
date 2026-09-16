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
import { useErrorToast } from "@/hooks/use-error-toast";

export interface UsePrintDocumentResult {
  print: (
    documentType: PrintDocumentType,
    options?: PrintDocumentOptions,
  ) => Promise<PrintDocumentResult | null>;
  isPrinting: boolean;
}

export function usePrintDocument(): UsePrintDocumentResult {
  const buCode = useBuCode();
  const { defaultBu } = useProfile();
  const { data: businessUnit } = useBusinessUnit(defaultBu?.id);
  const tErr = useTranslations("errors");
  const errorToast = useErrorToast();
  const [isPrinting, setIsPrinting] = useState(false);

  const print = async (
    documentType: PrintDocumentType,
    options?: PrintDocumentOptions,
  ): Promise<PrintDocumentResult | null> => {
    if (!buCode) {
      // ยังเลือกกิจการไม่ได้ = ทำไม่ได้ตอนนี้ ไม่ใช่ระบบพัง · และเดิมเป็น
      // ภาษาอังกฤษฝังไว้ในโค้ด ทั้งที่คนใช้ส่วนใหญ่อ่านไทย
      toast.warning(tErr("noBusinessUnit"));
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
      // เดิมต่อ err.message ท้ายคำว่า "พิมพ์" ซึ่งเป็นข้อความของ dev ล้วน ๆ
      errorToast(err);
      return null;
    } finally {
      setIsPrinting(false);
    }
  };

  return { print, isPrinting };
}
