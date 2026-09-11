import { useState } from "react";
import { Link } from "react-router";
import { useTranslations } from "use-intl";
import { Loader2, Mail, Send, Settings, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useEmailProfiles } from "@/hooks/use-email-profiles";
import type { EmailProfile } from "@/types/email-profile";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * รายการอีเมลแบบ chip — พิมพ์แล้วกด Enter/เพิ่ม เพื่อเติม กด × ที่ chip เพื่อลบ
 *
 * เขียนซ้ำกับของ `po-send-email-dialog.tsx` โดยตั้งใจ — สองไฟล์อยู่คนละโมดูล
 * (`procurement` / `vendor-management`) ซึ่ง ESLint ห้ามอ้างข้ามกัน วันที่ RFP
 * ส่งอีเมลจากระบบได้จริง ค่อยยกตัวนี้ไป `components/` ให้ทั้งคู่ใช้ร่วมกัน
 */
function EmailChipField({
  id,
  value,
  onChange,
  placeholder,
}: {
  readonly id: string;
  readonly value: string[];
  readonly onChange: (next: string[]) => void;
  readonly placeholder: string;
}) {
  const t = useTranslations("vendorManagement.requestPriceList.sendEmail");
  const tv = useTranslations("validation");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const commit = () => {
    const email = draft.trim();
    if (!email) return;
    if (!EMAIL_RE.test(email)) {
      setError(tv("invalidEmail"));
      return;
    }
    if (value.some((e) => e.toLowerCase() === email.toLowerCase())) {
      setError(t("duplicateEmail"));
      return;
    }
    onChange([...value, email]);
    setDraft("");
    setError(null);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5">
        <Input
          id={id}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            commit();
          }}
          placeholder={placeholder}
          aria-invalid={!!error}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={commit}
          disabled={!draft.trim()}
        >
          {t("add")}
        </Button>
      </div>
      {error && <FieldError>{error}</FieldError>}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((email) => (
            <Badge
              key={email}
              variant="outline"
              className="gap-1 py-0.5 pr-1 font-normal"
            >
              <span className="max-w-56 truncate">{email}</span>
              <button
                type="button"
                aria-label={t("remove", { email })}
                onClick={() => onChange(value.filter((e) => e !== email))}
                className="hover:bg-muted rounded-sm p-0.5"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

interface RfpSendEmailDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly vendorName: string;
  readonly vendorEmail?: string | null;
  /** ชื่อใบขอราคา — ใช้ในหัวเรื่องกับข้อความตั้งต้น */
  readonly rfpName: string;
  /**
   * ลิงก์ของผู้ขายรายนี้ — สร้างจาก token ของแถวนั้น ไม่ใช่ค่าคงที่ ว่างได้ถ้าใบ
   * ยังไม่ถูกบันทึก (ผู้ขายยังไม่มี token)
   */
  readonly vendorUrl: string;
}

/**
 * Dialog ส่งคำขอรายการราคาให้ผู้ขาย — **UI พร้อม แต่ยังส่งไม่ได้**
 *
 * ทรงเดียวกับ `po-send-email-dialog.tsx` ตั้งใจให้เปลี่ยนไปยิง API ได้ทันทีที่
 * หลังบ้านเปิดเส้นให้ (schema ของฟอร์มมี `email_template_id` รออยู่แล้ว) —
 * ตอนนี้ปุ่มส่งปิดไว้พร้อมบอกเหตุผล ไม่ใช่ปล่อยให้กดแล้วได้ 404 เงียบ ๆ
 *
 * ต่างจากของ PO ตรงที่ยังไม่มีตัวเลือกแนบไฟล์ — คำขอราคาไม่มีเอกสาร PDF ให้แนบ
 * สิ่งที่ผู้ขายต้องได้คือลิงก์สำหรับกรอกราคา ซึ่งอยู่ในเนื้อความ
 */
export function RfpSendEmailDialog({
  open,
  onOpenChange,
  vendorName,
  vendorEmail,
  rfpName,
  vendorUrl,
}: RfpSendEmailDialogProps) {
  const t = useTranslations("vendorManagement.requestPriceList.sendEmail");
  const tc = useTranslations("common");
  const { value: emailProfiles, isLoading, isError } = useEmailProfiles();

  const enabledProfiles = emailProfiles.profiles.filter((p) => p.enabled);
  const hasNoProfiles = !isLoading && (isError || enabledProfiles.length === 0);

  // ผู้เรียก mount dialog เฉพาะตอนเปิด (ดู VendorActionsCell) — ค่าตั้งต้นจึงทำ
  // ตอน mount ได้เลย ไม่ต้องมี effect คอยเติมค่าเมื่อ `open` เปลี่ยน
  const [to, setTo] = useState<string[]>(vendorEmail ? [vendorEmail] : []);
  const [subject, setSubject] = useState(() =>
    t("defaultSubject", { name: rfpName }),
  );
  // ลิงก์ถูกเติมลงในข้อความที่เดียว ไม่แสดงซ้ำที่อื่นในกล่องนี้ — ผู้ใช้แก้ข้อความ
  // ได้เต็มที่ รวมถึงย้าย/ตัดลิงก์ ซึ่งเป็นสิ่งที่จะถูกส่งออกไปจริง
  const [body, setBody] = useState(() =>
    t("defaultBody", { vendor: vendorName, name: rfpName, url: vendorUrl }),
  );

  // โปรไฟล์กับ CC มาจากข้อมูลที่โหลดทีหลัง — เก็บเฉพาะ "ค่าที่ผู้ใช้เลือกเอง"
  // แล้วค่อยตกไปใช้ค่าตั้งต้นตอน render แทนการ setState ใน effect ซึ่งจะทำให้
  // render ซ้อนกันเป็นทอด ๆ
  const [pickedProfileId, setPickedProfileId] = useState<string | null>(null);
  const [pickedCc, setPickedCc] = useState<string[] | null>(null);

  const defaultProfile =
    enabledProfiles.find((p) => p.id === emailProfiles.default_profile_id) ??
    enabledProfiles[0];
  const profileId = pickedProfileId ?? defaultProfile?.id ?? "";
  // CC ผูกกับโปรไฟล์ตรง ๆ — สลับโปรไฟล์แล้วเปลี่ยนตามเสมอ ต่างจากหัวเรื่อง/ข้อความ
  // ที่เป็นของคำขอใบนี้ ไม่ใช่ค่ามาตรฐานของผู้ส่ง
  const cc =
    pickedCc ??
    enabledProfiles.find((p) => p.id === profileId)?.default_cc ??
    [];

  const handleProfileChange = (nextId: string) => {
    setPickedProfileId(nextId);
    // เลือกโปรไฟล์ใหม่ = CC กลับไปตามโปรไฟล์นั้น ทิ้งที่แก้ไว้เอง
    setPickedCc(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] gap-3 overflow-y-auto p-4 sm:max-w-xl">
        <DialogHeader className="gap-0 pb-1">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Mail className="size-4" aria-hidden="true" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>
            {t("desc", { vendor: vendorName, name: rfpName })}
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-10">
            <Loader2
              className="text-muted-foreground size-5 animate-spin"
              aria-hidden="true"
            />
          </div>
        )}

        {!isLoading && hasNoProfiles && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Settings
              className="text-muted-foreground size-8"
              aria-hidden="true"
            />
            <p className="text-muted-foreground text-sm">
              {isError ? t("loadError") : t("noProfiles")}
            </p>
            <Button asChild size="sm" variant="outline">
              <Link to="/system-admin/email-profile">{t("goToSettings")}</Link>
            </Button>
          </div>
        )}

        {!isLoading && !hasNoProfiles && (
          <div className="space-y-4">
            <Field>
              <FieldLabel htmlFor="rse-profile">{t("profile")}</FieldLabel>
              <Select value={profileId} onValueChange={handleProfileChange}>
                <SelectTrigger id="rse-profile" className="w-full">
                  <SelectValue placeholder={t("profilePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {enabledProfiles.map((profile: EmailProfile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="rse-to">{t("to")}</FieldLabel>
              <EmailChipField
                id="rse-to"
                value={to}
                onChange={setTo}
                placeholder={t("toPlaceholder")}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="rse-cc">{t("cc")}</FieldLabel>
              <EmailChipField
                id="rse-cc"
                value={cc}
                onChange={setPickedCc}
                placeholder={t("ccPlaceholder")}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="rse-subject">{t("subject")}</FieldLabel>
              <Input
                id="rse-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="rse-body">{t("body")}</FieldLabel>
              <Textarea
                id="rse-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={7}
                className="min-h-36 text-xs"
              />
            </Field>
          </div>
        )}

        <DialogFooter className="pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            {tc("cancel")}
          </Button>
          <Button type="button" size="sm" disabled title={t("unavailable")}>
            <Send aria-hidden="true" />
            {t("send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
