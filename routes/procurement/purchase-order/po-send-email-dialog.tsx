import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import { Loader2, Mail, Send, Settings, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { useProfile } from "@/hooks/use-profile";
import { useEmailProfiles } from "@/hooks/use-email-profiles";
import { useVendorById } from "@/hooks/use-vendor";
import { formatDate } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/currency-utils";
import type { EmailProfile } from "@/types/email-profile";
import type { PurchaseOrder } from "@/types/purchase-order";
import { usePoSendEmail } from "./use-po-send-email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** แทน `{{po_no}}` `{{vendor_name}}` `{{bu_name}}` `{{total}}` `{{delivery_date}}` ด้วยค่าจริงของ PO */
function fillTemplate(
  template: string,
  values: {
    po_no: string;
    vendor_name: string;
    bu_name: string;
    total: string;
    delivery_date: string;
  },
): string {
  return template
    .replaceAll("{{po_no}}", values.po_no)
    .replaceAll("{{vendor_name}}", values.vendor_name)
    .replaceAll("{{bu_name}}", values.bu_name)
    .replaceAll("{{total}}", values.total)
    .replaceAll("{{delivery_date}}", values.delivery_date);
}

interface PoSendEmailDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly purchaseOrder: PurchaseOrder;
}

/**
 * รายการอีเมลแบบ chip — พิมพ์แล้วกด Enter/Add เพื่อเติม กด × ที่ chip เพื่อลบ
 *
 * ใช้ร่วมกันทั้งช่อง To และ CC — validate รูปแบบอีเมลเบื้องต้นฝั่ง client เท่านั้น
 * (ชั้นที่ตัดสินจริงคือ backend ตอน parse ที่อยู่แต่ละรายการ)
 */
function EmailChipField({
  id,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  readonly id: string;
  readonly value: string[];
  readonly onChange: (next: string[]) => void;
  readonly placeholder: string;
  readonly disabled?: boolean;
}) {
  const t = useTranslations("procurement.purchaseOrder.sendEmail");
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
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={!!error}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={commit}
          disabled={disabled || !draft.trim()}
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
                disabled={disabled}
                onClick={() => onChange(value.filter((e) => e !== email))}
                className="hover:bg-muted rounded-sm p-0.5 disabled:pointer-events-none"
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

/**
 * Dialog เลือกโปรไฟล์ผู้ส่ง แก้ผู้รับ/หัวเรื่อง/ข้อความ แล้วส่งใบสั่งซื้อ (พร้อม PDF)
 * ให้ผู้ขายทางอีเมล
 *
 * - ไม่มีโปรไฟล์ที่เปิดใช้งานเลย → แสดงข้อความ + ลิงก์ไปหน้าตั้งค่า ไม่มีปุ่มส่งให้กด
 * - Subject/Body ตั้งต้นจาก template ของโปรไฟล์ที่เลือก แทน placeholder ด้วยค่าจริงของ PO
 *   — ผู้ใช้แก้ช่องไหนแล้ว สลับโปรไฟล์จะไม่ทับช่องนั้นอีก (เก็บ dirty flag แยกต่อช่อง
 *   ผ่าน ref ไม่ใช้ `formState.isDirty` เพราะฟอร์มนี้ไม่ได้ใช้ react-hook-form)
 * - CC ผูกกับโปรไฟล์ตรง ๆ (`default_cc`) — สลับโปรไฟล์แล้วเปลี่ยนตามเสมอ ต่างจาก
 *   subject/body เพราะเป็นค่ามาตรฐานของผู้ส่งคนนั้น ไม่ใช่ข้อความที่ผู้ใช้พิมพ์เอง
 * - ส่งเสร็จอ่าน `sent`/`rejected` เสมอ — ไม่ปิด dialog ถ้าส่งไม่ถึงผู้รับบางคน/ทั้งหมด
 *   ให้ผู้ใช้เห็นค่าที่กรอกไว้และลองใหม่ได้ทันที
 */
export function PoSendEmailDialog({
  open,
  onOpenChange,
  purchaseOrder,
}: PoSendEmailDialogProps) {
  const t = useTranslations("procurement.purchaseOrder.sendEmail");
  const tc = useTranslations("common");
  const { defaultBu, dateFormat } = useProfile();
  const {
    value: emailProfiles,
    isLoading: profilesLoading,
    isError: profilesError,
  } = useEmailProfiles();
  const vendorQuery = useVendorById(purchaseOrder.vendor_id);
  const sendEmail = usePoSendEmail(purchaseOrder.id);

  const enabledProfiles = emailProfiles.profiles.filter((p) => p.enabled);
  const isLoading = profilesLoading || vendorQuery.isLoading;
  const hasNoProfiles =
    !isLoading && (profilesError || enabledProfiles.length === 0);

  const [profileId, setProfileId] = useState("");
  const [to, setTo] = useState<string[]>([]);
  const [cc, setCc] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachPdf, setAttachPdf] = useState(true);
  const [toError, setToError] = useState(false);
  const isSubjectDirtyRef = useRef(false);
  const isBodyDirtyRef = useRef(false);
  const initializedRef = useRef(false);

  const placeholderValues = {
    po_no: purchaseOrder.po_no,
    vendor_name: purchaseOrder.vendor_name,
    bu_name: defaultBu?.name ?? "",
    total:
      purchaseOrder.total_amount != null
        ? `${formatCurrency(purchaseOrder.total_amount)} ${purchaseOrder.currency_code ?? ""}`.trim()
        : "",
    delivery_date: purchaseOrder.delivery_date
      ? formatDate(purchaseOrder.delivery_date, dateFormat)
      : "",
  };

  // เติมค่าตั้งต้นครั้งเดียวต่อการเปิด dialog หนึ่งรอบ — รอทั้งโปรไฟล์และผู้ขายโหลด
  // เสร็จก่อน (ไม่งั้น "To" จะว่างเพราะยังไม่รู้อีเมลผู้ขาย) ปิดแล้วเปิดใหม่ = เริ่มนับหนึ่งใหม่
  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
      return;
    }
    if (initializedRef.current || isLoading) return;
    initializedRef.current = true;

    const defaultId =
      enabledProfiles.find((p) => p.id === emailProfiles.default_profile_id)
        ?.id ??
      enabledProfiles[0]?.id ??
      "";
    const profile = enabledProfiles.find((p) => p.id === defaultId);

    const contacts = vendorQuery.data?.vendor_contact ?? [];
    const vendorEmail =
      contacts.find((c) => c.is_primary)?.email || contacts[0]?.email || "";

    setProfileId(defaultId);
    setTo(vendorEmail ? [vendorEmail] : []);
    setCc(profile?.default_cc ?? []);
    setSubject(
      profile ? fillTemplate(profile.subject_template, placeholderValues) : "",
    );
    setBody(
      profile ? fillTemplate(profile.body_template, placeholderValues) : "",
    );
    setAttachPdf(true);
    setToError(false);
    isSubjectDirtyRef.current = false;
    isBodyDirtyRef.current = false;
    // placeholderValues ไม่ใส่ใน deps โดยตั้งใจ — เป็น object ใหม่ทุก render, ค่าจริงมาจาก
    // purchaseOrder/defaultBu/dateFormat ซึ่งไม่เปลี่ยนระหว่าง dialog เปิดอยู่ (PoForm
    // ใช้ key={purchaseOrder.id} ทำให้เปลี่ยน PO = component นี้ remount ทั้งก้อนอยู่แล้ว)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    open,
    isLoading,
    enabledProfiles,
    emailProfiles.default_profile_id,
    vendorQuery.data,
  ]);

  const handleProfileChange = (nextId: string) => {
    setProfileId(nextId);
    const profile = enabledProfiles.find((p) => p.id === nextId);
    if (!profile) return;
    setCc(profile.default_cc);
    if (!isSubjectDirtyRef.current) {
      setSubject(fillTemplate(profile.subject_template, placeholderValues));
    }
    if (!isBodyDirtyRef.current) {
      setBody(fillTemplate(profile.body_template, placeholderValues));
    }
  };

  const handleClose = (next: boolean) => {
    if (!next && sendEmail.isPending) return;
    onOpenChange(next);
  };

  const handleSend = () => {
    if (to.length === 0) {
      setToError(true);
      return;
    }
    sendEmail.mutate(
      {
        profile_id: profileId,
        to,
        cc,
        subject,
        body,
        attach_pdf: attachPdf,
      },
      {
        onSuccess: (result) => {
          if (!result.sent) {
            toast.error(t("sendFailed"));
            return;
          }
          if (result.rejected && result.rejected.length > 0) {
            toast.warning(
              t("sendPartial", { emails: result.rejected.join(", ") }),
            );
            return;
          }
          toast.success(t("sendSuccess"));
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[85vh] gap-3 overflow-y-auto p-4 sm:max-w-xl">
        <DialogHeader className="gap-0 pb-1">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Mail className="size-4" aria-hidden="true" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>
            {t("desc", { poNo: purchaseOrder.po_no })}
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
              {profilesError ? t("loadError") : t("noProfiles")}
            </p>
            <Button asChild size="sm" variant="outline">
              <Link to="/system-admin/email-profile">{t("goToSettings")}</Link>
            </Button>
          </div>
        )}

        {!isLoading && !hasNoProfiles && (
          <div className="space-y-4">
            <Field>
              <FieldLabel htmlFor="pse-profile" required>
                {t("profile")}
              </FieldLabel>
              <Select value={profileId} onValueChange={handleProfileChange}>
                <SelectTrigger id="pse-profile" className="w-full">
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

            <Field data-invalid={toError}>
              <FieldLabel htmlFor="pse-to" required>
                {t("to")}
              </FieldLabel>
              <EmailChipField
                id="pse-to"
                value={to}
                onChange={(next) => {
                  setTo(next);
                  if (next.length > 0) setToError(false);
                }}
                placeholder={t("toPlaceholder")}
                disabled={sendEmail.isPending}
              />
              {toError && <FieldError>{t("toRequired")}</FieldError>}
            </Field>

            <Field>
              <FieldLabel htmlFor="pse-cc">{t("cc")}</FieldLabel>
              <EmailChipField
                id="pse-cc"
                value={cc}
                onChange={setCc}
                placeholder={t("ccPlaceholder")}
                disabled={sendEmail.isPending}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="pse-subject">{t("subject")}</FieldLabel>
              <Input
                id="pse-subject"
                value={subject}
                onChange={(e) => {
                  isSubjectDirtyRef.current = true;
                  setSubject(e.target.value);
                }}
                disabled={sendEmail.isPending}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="pse-body">{t("body")}</FieldLabel>
              <Textarea
                id="pse-body"
                value={body}
                onChange={(e) => {
                  isBodyDirtyRef.current = true;
                  setBody(e.target.value);
                }}
                rows={6}
                className="min-h-32 text-xs"
                disabled={sendEmail.isPending}
              />
            </Field>

            <Field orientation="horizontal">
              <Checkbox
                id="pse-attach-pdf"
                checked={attachPdf}
                onCheckedChange={(v) => setAttachPdf(v === true)}
                disabled={sendEmail.isPending}
              />
              <FieldLabel htmlFor="pse-attach-pdf">{t("attachPdf")}</FieldLabel>
            </Field>
          </div>
        )}

        <DialogFooter className="pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleClose(false)}
            disabled={sendEmail.isPending}
          >
            {tc("cancel")}
          </Button>
          {!isLoading && !hasNoProfiles && (
            <Button
              type="button"
              size="sm"
              onClick={handleSend}
              disabled={sendEmail.isPending || !profileId}
            >
              {sendEmail.isPending ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Send aria-hidden="true" />
              )}
              {sendEmail.isPending ? t("sending") : t("send")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
