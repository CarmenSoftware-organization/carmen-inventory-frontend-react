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
  | "claude"
  | "chatgpt"
  | "gemini"
  | "deepseek"
  | "grok"
  | "google";

/** icon ที่รับ `className` — รองรับทั้ง lucide icon และ custom brand icon */
export type ProviderIcon = ComponentType<{ readonly className?: string }>;

export interface AiProvider {
  readonly id: AiProviderId;
  readonly label: string;
  readonly icon: ProviderIcon;
  /** สร้าง URL เปิดหน้า provider พร้อม prompt/query (เปิด tab ใหม่) */
  readonly buildUrl: (query: string) => string;
  /**
   * provider รองรับ prefill prompt ผ่าน URL ไหม
   * ถ้า false (เช่น Gemini) caller ควร copy prompt ลง clipboard ช่วย
   * เพราะเปิดหน้า app เปล่า ๆ
   */
  readonly supportsPrefill: boolean;
}

/**
 * Registry ของ AI/search provider ที่ใช้ในปุ่ม "Ask AI" ของ PR
 * เพิ่ม provider ใหม่ได้โดยเติม entry ที่นี่ที่เดียว
 */
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
