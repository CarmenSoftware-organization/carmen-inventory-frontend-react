import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { useTranslations } from "use-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import type { EmailProfile } from "@/types/email-profile";

/** ตรวจรูปแบบอีเมลอย่างหลวม ๆ พอกันพิมพ์ผิด — ด่านตัดสินจริงคือ zod ที่ gateway */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface EmailProfileTestDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** โปรไฟล์ที่จะทดสอบ — ตัวเรียก mount คอมโพเนนต์นี้เฉพาะตอนเปิดจริง จึงไม่มีวันเป็น null */
  readonly profile: EmailProfile;
  readonly onSend: (to: string) => void;
  readonly isSending: boolean;
}

/**
 * ถามอีเมลปลายทางก่อนยิงเมลทดสอบของโปรไฟล์หนึ่ง
 *
 * เดิมกดปุ่มแล้วส่งไปที่ `from_email` ของโปรไฟล์ทันที ซึ่งพิสูจน์ได้แค่ว่า SMTP ยอมรับงาน
 * แต่ผู้ตั้งค่ามักไม่มีสิทธิ์เปิดกล่องจดหมายนั้น เลยไม่รู้ว่าเมลไปถึงจริงไหม — ให้กรอก
 * ปลายทางเองจึงตรวจได้ครบวง ค่าตั้งต้นยังเป็น `from_email` เพราะเป็นที่อยู่ที่ยืนยันได้
 * แน่นอนว่ามีจริง
 *
 * @param props.profile - โปรไฟล์ที่กำลังทดสอบ
 * @param props.onSend - callback พร้อมอีเมลปลายทางที่ผู้ใช้กรอก
 * @returns React element ของ Dialog
 */
export function EmailProfileTestDialog({
  open,
  onOpenChange,
  profile,
  onSend,
  isSending,
}: EmailProfileTestDialogProps) {
  const t = useTranslations("systemAdmin.emailProfile");
  const tc = useTranslations("common");

  // ตัวเรียก mount ใหม่ทุกครั้งที่เปิด (ดู `email-profile.route.tsx`) ค่าตั้งต้นจึงมาจาก
  // initializer ตรง ๆ ไม่ต้องมี effect คอย sync — setState ใน effect ทำให้ render ซ้อนโดยเปล่าประโยชน์
  const [to, setTo] = useState(profile.from_email);
  const [error, setError] = useState<string | null>(null);

  const handleSend = () => {
    const value = to.trim();
    if (!EMAIL_RE.test(value)) {
      setError(t("test.invalidEmail"));
      return;
    }
    setError(null);
    onSend(value);
  };

  return (
    <Dialog open={open} onOpenChange={isSending ? undefined : onOpenChange}>
      <DialogContent className="gap-3 p-4 sm:max-w-md">
        <DialogHeader className="gap-1 pb-1">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Send className="size-4" aria-hidden="true" />
            {t("test.title")}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {t("test.description", { name: profile.name })}
          </DialogDescription>
        </DialogHeader>

        <Field data-invalid={!!error}>
          <FieldLabel htmlFor="ep-test-to" required>
            {t("test.toLabel")}
          </FieldLabel>
          <Input
            id="ep-test-to"
            type="email"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isSending) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="you@example.com"
            aria-invalid={!!error}
            disabled={isSending}
          />
          <FieldError>{error}</FieldError>
        </Field>

        <DialogFooter className="pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            {tc("cancel")}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSend}
            disabled={isSending}
          >
            {isSending ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="size-3.5" aria-hidden="true" />
            )}
            {t("test.send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
