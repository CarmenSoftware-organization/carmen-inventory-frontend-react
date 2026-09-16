import type { ComponentType } from "react";
import {
  ClaudeIcon,
  ChatGptIcon,
  GeminiIcon,
  GoogleIcon,
  DeepseekIcon,
  GrokIcon,
} from "@/components/icons/provider-icons";

export type AiProviderId =
  "claude" | "chatgpt" | "gemini" | "deepseek" | "grok" | "google";

export type ProviderIcon = ComponentType<{ readonly className?: string }>;

export interface AiProvider {
  readonly id: AiProviderId;
  readonly label: string;
  readonly icon: ProviderIcon;
  readonly buildUrl: (query: string) => string;
  readonly supportsPrefill: boolean;
}

export const AI_PROVIDERS: readonly AiProvider[] = [
  {
    id: "claude",
    label: "Claude",
    icon: ClaudeIcon,
    buildUrl: (q) => `https://claude.ai/new?q=${encodeURIComponent(q)}`,
    supportsPrefill: true,
  },
  {
    id: "chatgpt",
    label: "ChatGPT",
    icon: ChatGptIcon,
    buildUrl: (q) => `https://chatgpt.com/?q=${encodeURIComponent(q)}`,
    supportsPrefill: true,
  },
  {
    id: "gemini",
    label: "Gemini",
    icon: GeminiIcon,
    // Gemini ไม่มี query param สำหรับ prefill prompt — เปิดหน้า app เปล่า
    buildUrl: () => "https://gemini.google.com/app",
    supportsPrefill: false,
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    icon: DeepseekIcon,
    // DeepSeek chat ไม่มี URL param สำหรับ prefill prompt → copy + paste
    buildUrl: () => "https://chat.deepseek.com/",
    supportsPrefill: false,
  },
  {
    id: "grok",
    label: "Grok",
    icon: GrokIcon,
    // Grok ไม่มี URL param สำหรับ prefill prompt ที่ documented → copy + paste
    buildUrl: () => "https://grok.com/",
    supportsPrefill: false,
  },
  {
    id: "google",
    label: "Google Search",
    icon: GoogleIcon,
    buildUrl: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
    supportsPrefill: true,
  },
] as const;
