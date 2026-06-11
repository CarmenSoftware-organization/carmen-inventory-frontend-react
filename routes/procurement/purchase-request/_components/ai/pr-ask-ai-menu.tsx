
import { Sparkle } from "lucide-react";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AI_PROVIDERS, type AiProvider } from "./ai-providers";
import { buildPrAiQuery, type PrAiQueryItem } from "./build-pr-ai-query";

interface PrAskAiMenuProps {
  readonly items: readonly PrAiQueryItem[];
  readonly disabled?: boolean;
}

/**
 * ปุ่ม "Ask AI" + dropdown เลือก provider (Claude/ChatGPT/Gemini/Google)
 * กดเลือก → สร้าง prompt จาก item ที่เลือก แล้วเปิดหน้า provider ใน tab ใหม่
 * provider ที่ prefill ผ่าน URL ไม่ได้ (Gemini) จะ copy prompt ลง clipboard ช่วย
 */
export function PrAskAiMenu({ items, disabled }: PrAskAiMenuProps) {
  const t = useTranslations("procurement.purchaseRequest");

  const handlePick = (provider: AiProvider) => {
    const query = buildPrAiQuery(items);
    if (!provider.supportsPrefill && navigator.clipboard) {
      navigator.clipboard
        .writeText(query)
        .then(() => toast.success(t("askAiCopied", { provider: provider.label })))
        .catch(() => toast.error(t("askAiCopyFailed")));
    }
    window.open(provider.buildUrl(query), "_blank", "noopener,noreferrer");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="xs" disabled={disabled}>
          <Sparkle />
          {t("askAi")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {AI_PROVIDERS.map((provider) => {
          const Icon = provider.icon;
          return (
            <DropdownMenuItem
              key={provider.id}
              onClick={() => handlePick(provider)}
            >
              <Icon className="size-3.5" />
              {provider.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
