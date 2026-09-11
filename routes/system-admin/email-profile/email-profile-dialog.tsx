import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "use-intl";
import { ChevronDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import { cn } from "@/lib/utils";
import { SECRET_MASK, type EmailProfile } from "@/types/email-profile";
import {
  emailProfileSchema,
  fromEmailProfileFormValues,
  toEmailProfileFormValues,
  type EmailProfileFormValues,
} from "./email-profile-schema";

interface EmailProfileDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** โปรไฟล์ที่กำลังแก้ไข — ไม่ใส่/null = โหมดสร้างใหม่ */
  readonly profile?: EmailProfile | null;
  /** คืนโปรไฟล์ที่แก้เสร็จแล้วหนึ่งรายการ — ตัวเรียกเป็นคนประกอบเข้ากับ `profiles[]` ทั้งชุด */
  readonly onSave: (profile: EmailProfile) => void;
  readonly isSaving: boolean;
}

/**
 * Dialog สร้าง/แก้ไขโปรไฟล์อีเมลผู้ส่งหนึ่งรายการ
 *
 * **ไม่ถือ array `profiles[]` ทั้งชุด** — คืนแค่โปรไฟล์เดียวที่แก้เสร็จผ่าน `onSave`
 * ผู้เรียก (`email-profile.route.tsx`) เป็นคนประกอบเข้ากับ array เดิมก่อนบันทึกจริง เพราะ
 * save เป็นการเขียนทับ value ทั้งก้อน (ไม่ส่งของเดิมมาด้วย = รายการที่ไม่ได้แก้หายไปเงียบๆ)
 * backend จับคู่รหัสผ่านที่เก็บไว้ด้วย `id` ของโปรไฟล์ — โปรไฟล์ใหม่ (id ใหม่) จึงต้องมี
 * รหัสผ่านจริงเสมอ ห้ามส่ง mask กลับไป ไม่งั้น backend throw
 *
 * ฟิลด์ที่ใช้บ่อยอยู่หน้าแรก ส่วนที่ตั้งครั้งเดียวแล้วแทบไม่แตะ (reply-to, สำเนาถึง,
 * เทมเพลต) ยุบไว้ใน "ตั้งค่าขั้นสูง" — ยังบันทึกและใช้งานเหมือนเดิมทุกประการ แค่ไม่กินพื้นที่
 *
 * @param props.profile - โปรไฟล์ที่จะแก้ไข (ไม่ใส่ = สร้างใหม่)
 * @param props.onSave - callback รับโปรไฟล์ที่แก้เสร็จแล้ว
 * @returns React element ของ Dialog
 */
export function EmailProfileDialog({
  open,
  onOpenChange,
  profile,
  onSave,
  isSaving,
}: EmailProfileDialogProps) {
  const isEdit = !!profile;
  const t = useTranslations("systemAdmin.emailProfile");
  const tc = useTranslations("common");
  const tf = useTranslations("form");
  const tfl = useTranslations("field");

  /**
   * โปรไฟล์เดิมมีรหัสผ่านเก็บไว้แล้ว ฟอร์มจึงไม่โชว์ช่องกรอกจนกว่าจะกด "เปลี่ยนรหัสผ่าน" —
   * ตราบใดที่ยังไม่กด ค่าที่ส่งกลับคือ `SECRET_MASK` ซึ่ง backend แปลว่า "ใช้ของเดิม"
   * โปรไฟล์ใหม่ไม่มีของเดิมให้ใช้ จึงเปิดช่องกรอกไว้ตั้งแต่แรกเสมอ
   */
  const [changingPassword, setChangingPassword] = useState(!isEdit);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const form = useForm<EmailProfileFormValues>({
    resolver: zodResolver(
      emailProfileSchema,
    ) as Resolver<EmailProfileFormValues>,
    defaultValues: toEmailProfileFormValues(),
  });

  useEffect(() => {
    if (open) {
      form.reset(toEmailProfileFormValues(profile ?? undefined));
      setChangingPassword(!profile);
      setAdvancedOpen(false);
    }
  }, [open, profile, form]);

  const submit = form.handleSubmit(
    (values) => {
      onSave(fromEmailProfileFormValues(values, profile ?? undefined));
    },
    () => scrollToFirstInvalidField(),
  );

  const enabled = form.watch("enabled");
  const secure = form.watch("smtp_secure");

  const startChangingPassword = () => {
    // ล้าง mask ออกก่อน ไม่งั้นผู้ใช้จะเห็นจุดไข่ปลาที่ไม่ใช่รหัสผ่านจริงค้างในช่อง
    form.setValue("smtp_password", "", { shouldDirty: true });
    setChangingPassword(true);
  };

  const cancelChangingPassword = () => {
    form.setValue("smtp_password", SECRET_MASK, { shouldDirty: false });
    form.clearErrors("smtp_password");
    setChangingPassword(false);
  };

  return (
    <Dialog open={open} onOpenChange={isSaving ? undefined : onOpenChange}>
      <DialogContent className="max-h-[85vh] gap-3 overflow-y-auto p-4 sm:max-w-2xl">
        <DialogHeader className="gap-0 pb-1">
          <DialogTitle className="text-sm">
            {isEdit
              ? tf("editTitle", { entity: t("entity") })
              : tf("addTitle", { entity: t("entity") })}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <FieldGroup className="gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field data-invalid={!!form.formState.errors.name}>
                <FieldLabel htmlFor="ep-name" required>
                  {t("dialog.profileName")}
                </FieldLabel>
                <Input
                  id="ep-name"
                  {...form.register("name")}
                  placeholder={t("dialog.namePlaceholder")}
                  disabled={isSaving}
                />
                <FieldError>{form.formState.errors.name?.message}</FieldError>
              </Field>

              <Field data-invalid={!!form.formState.errors.from_email}>
                <FieldLabel htmlFor="ep-from-email" required>
                  {t("dialog.fromEmail")}
                </FieldLabel>
                <Input
                  id="ep-from-email"
                  {...form.register("from_email")}
                  type="email"
                  placeholder="purchasing@example.com"
                  disabled={isSaving}
                />
                <FieldError>
                  {form.formState.errors.from_email?.message}
                </FieldError>
              </Field>

              <Field data-invalid={!!form.formState.errors.from_name}>
                <FieldLabel htmlFor="ep-from-name">
                  {t("dialog.fromName")}
                </FieldLabel>
                <Input
                  id="ep-from-name"
                  {...form.register("from_name")}
                  disabled={isSaving}
                />
                <FieldError>
                  {form.formState.errors.from_name?.message}
                </FieldError>
              </Field>

              <Field data-invalid={!!form.formState.errors.smtp_host}>
                <FieldLabel htmlFor="ep-host" required>
                  {t("dialog.host")}
                </FieldLabel>
                <Input
                  id="ep-host"
                  {...form.register("smtp_host")}
                  placeholder="smtp.gmail.com"
                  disabled={isSaving}
                />
                <FieldError>
                  {form.formState.errors.smtp_host?.message}
                </FieldError>
              </Field>

              <Field data-invalid={!!form.formState.errors.smtp_port}>
                <FieldLabel htmlFor="ep-port" required>
                  {t("dialog.port")}
                </FieldLabel>
                <Input
                  id="ep-port"
                  {...form.register("smtp_port")}
                  type="number"
                  placeholder="587"
                  disabled={isSaving}
                />
                <FieldError>
                  {form.formState.errors.smtp_port?.message}
                </FieldError>
              </Field>

              <Field data-invalid={!!form.formState.errors.smtp_username}>
                <FieldLabel htmlFor="ep-username" required>
                  {tfl("username")}
                </FieldLabel>
                <Input
                  id="ep-username"
                  {...form.register("smtp_username")}
                  disabled={isSaving}
                />
                <FieldError>
                  {form.formState.errors.smtp_username?.message}
                </FieldError>
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field data-invalid={!!form.formState.errors.smtp_password}>
                <FieldLabel htmlFor="ep-password" required={changingPassword}>
                  {t("dialog.password")}
                </FieldLabel>
                {changingPassword ? (
                  <>
                    <Input
                      id="ep-password"
                      {...form.register("smtp_password")}
                      type="password"
                      autoComplete="new-password"
                      disabled={isSaving}
                    />
                    {isEdit && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        className="self-start px-0"
                        onClick={cancelChangingPassword}
                        disabled={isSaving}
                      >
                        {t("dialog.keepPassword")}
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      {t("dialog.passwordIsSet")}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={startChangingPassword}
                      disabled={isSaving}
                    >
                      {t("dialog.changePassword")}
                    </Button>
                  </div>
                )}
                <FieldError>
                  {form.formState.errors.smtp_password?.message}
                </FieldError>
              </Field>

              <Field>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="ep-secure"
                    checked={secure}
                    onCheckedChange={(v) =>
                      form.setValue("smtp_secure", v === true, {
                        shouldDirty: true,
                      })
                    }
                    disabled={isSaving}
                  />
                  <FieldLabel htmlFor="ep-secure" className="font-normal">
                    {t("dialog.secure")}
                  </FieldLabel>
                </div>
                <p className="text-muted-foreground text-micro">
                  {t("dialog.secureHint")}
                </p>
              </Field>
            </div>

            <Field>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ep-enabled"
                  checked={enabled}
                  onCheckedChange={(v) =>
                    form.setValue("enabled", v === true, { shouldDirty: true })
                  }
                  disabled={isSaving}
                />
                <FieldLabel htmlFor="ep-enabled" className="font-normal">
                  {t("dialog.enabled")}
                </FieldLabel>
              </div>
            </Field>

            <Field>
              <FieldLabel htmlFor="ep-note">{t("dialog.note")}</FieldLabel>
              <Input
                id="ep-note"
                {...form.register("note")}
                placeholder={t("dialog.notePlaceholder")}
                disabled={isSaving}
              />
            </Field>
          </FieldGroup>

          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="text-muted-foreground gap-1 px-0"
              >
                <ChevronDown
                  className={cn(
                    "size-3.5 transition-transform",
                    advancedOpen && "rotate-180",
                  )}
                  aria-hidden="true"
                />
                {t("dialog.advancedSection")}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <FieldGroup className="gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field data-invalid={!!form.formState.errors.reply_to}>
                    <FieldLabel htmlFor="ep-reply-to">
                      {t("dialog.replyTo")}
                    </FieldLabel>
                    <Input
                      id="ep-reply-to"
                      {...form.register("reply_to")}
                      type="email"
                      disabled={isSaving}
                    />
                    <FieldError>
                      {form.formState.errors.reply_to?.message}
                    </FieldError>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="ep-default-cc">
                      {t("dialog.defaultCc")}
                    </FieldLabel>
                    <Input
                      id="ep-default-cc"
                      {...form.register("default_cc")}
                      placeholder="finance@example.com"
                      disabled={isSaving}
                    />
                    <p className="text-muted-foreground text-micro">
                      {t("dialog.defaultCcHint")}
                    </p>
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="ep-subject-template">
                    {t("dialog.subjectTemplate")}
                  </FieldLabel>
                  <Input
                    id="ep-subject-template"
                    {...form.register("subject_template")}
                    disabled={isSaving}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="ep-body-template">
                    {t("dialog.bodyTemplate")}
                  </FieldLabel>
                  <Textarea
                    id="ep-body-template"
                    {...form.register("body_template")}
                    rows={4}
                    className="min-h-24 text-xs"
                    disabled={isSaving}
                  />
                </Field>
              </FieldGroup>
            </CollapsibleContent>
          </Collapsible>

          <DialogFooter className="pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              {tc("cancel")}
            </Button>
            <Button type="submit" size="sm" disabled={isSaving}>
              {isSaving && isEdit && tf("saving")}
              {isSaving && !isEdit && tf("creating")}
              {!isSaving && isEdit && tc("save")}
              {!isSaving && !isEdit && tc("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
