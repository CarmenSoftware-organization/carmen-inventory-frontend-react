import { useEffect, type ReactNode } from "react";
import {
  useForm,
  type Resolver,
  type UseFormReturn,
  type DefaultValues,
  type FieldValues,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodType } from "zod";
import { type LucideIcon } from "lucide-react";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import type { TranslationFn } from "@/lib/i18n-schema";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { cn } from "@/lib/utils";

/** mutation ที่ template เรียก — ตรงกับ shape ของ TanStack `useMutation` */
interface MutationLike<TVars> {
  mutate: (
    vars: TVars,
    options: {
      onSuccess: (data: unknown) => void;
    },
  ) => void;
  isPending: boolean;
}

export interface ConfigEntityDialogProps<
  TEntity extends { id: string; doc_version?: number },
  TFormValues extends FieldValues,
  TPayload,
> {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** entity ที่กำลังแก้ไข — `null`/`undefined` = โหมดสร้างใหม่ */
  readonly entity?: TEntity | null;
  /** view-only: disable form + ซ่อนปุ่ม submit */
  readonly readOnly?: boolean;

  /** ไอคอนหัว dialog */
  readonly icon: LucideIcon;
  /** namespace ของโมดูล เช่น `"config.businessType"` (ต้องมี key `entity`) */
  readonly translationNamespace: string;

  readonly useCreate: () => MutationLike<TPayload>;
  readonly useUpdate: () => MutationLike<
    TPayload & { id: string; doc_version?: number }
  >;

  /** factory สร้าง zod schema จาก translator (validation/field) */
  readonly buildSchema: (
    tv: TranslationFn,
    tfl: TranslationFn,
  ) => ZodType<TFormValues>;
  /** map entity → ค่าเริ่มต้นฟอร์ม (เรียกตอน reset; `null` = ค่าเปล่าสำหรับสร้างใหม่) */
  readonly toFormValues: (entity?: TEntity | null) => TFormValues;
  /** map ค่าฟอร์ม → payload ที่ส่งเข้า create/update */
  readonly toPayload: (values: TFormValues) => TPayload;

  /** class เพิ่มของ DialogContent (เช่น `sm:max-w-lg` สำหรับฟอร์มกว้าง) */
  readonly contentClassName?: string;
  /**
   * เรียกหลังสร้างสำเร็จ พร้อมผลลัพธ์ดิบจาก create mutation —
   * ใช้กับ flow "สร้าง inline แล้วเลือกทันที" (เช่น unit dialog ส่ง id กลับ)
   */
  readonly onCreated?: (result: unknown) => void;
  /**
   * preventDefault + stopPropagation ตอน submit — จำเป็นเมื่อ dialog ถูก render
   * อยู่ใน React tree ของ form อื่น (synthetic event จะ bubble ทะลุ portal)
   */
  readonly stopPropagationOnSubmit?: boolean;
  /** render fields เฉพาะ entity — รับ `form` + `disabled` */
  readonly children: (ctx: {
    form: UseFormReturn<TFormValues>;
    disabled: boolean;
  }) => ReactNode;
}

/**
 * Template มาตรฐานของ config entity dialog (create/edit) — คู่ขนานกับ
 * `ConfigListTemplate` ของหน้า list
 *
 * ดูดงานซ้ำของ dialog ทุกโมดูลเข้ามาไว้ที่เดียว: create/update hooks,
 * `isPending`, translation hooks, `useForm` + resolver, reset ตอนเปิด,
 * `onSubmit` (payload + doc_version + toast + ปิด dialog), submit label และ
 * chrome (`Dialog` + header ไอคอน + `FieldGroup` + footer cancel/submit)
 *
 * แต่ละโมดูลส่งเฉพาะส่วนที่ต่าง: icon, namespace, hooks, schema, การ map
 * form/payload และ fields (ผ่าน `children`)
 *
 * @example
 * ```tsx
 * <ConfigEntityDialog
 *   open={open} onOpenChange={onOpenChange} entity={businessType} readOnly={readOnly}
 *   icon={Briefcase} translationNamespace="config.businessType"
 *   useCreate={useCreateBusinessType} useUpdate={useUpdateBusinessType}
 *   buildSchema={createBusinessTypeSchema}
 *   toFormValues={(e) => (e ? { name: e.name, is_active: e.is_active } : EMPTY_FORM)}
 *   toPayload={(v) => ({ name: v.name, is_active: v.is_active })}
 * >
 *   {({ form, disabled }) => ( ...fields... )}
 * </ConfigEntityDialog>
 * ```
 */
export function ConfigEntityDialog<
  TEntity extends { id: string; doc_version?: number },
  TFormValues extends FieldValues,
  TPayload,
>({
  open,
  onOpenChange,
  entity,
  readOnly,
  icon: Icon,
  translationNamespace,
  useCreate,
  useUpdate,
  buildSchema,
  toFormValues,
  toPayload,
  contentClassName,
  onCreated,
  stopPropagationOnSubmit,
  children,
}: ConfigEntityDialogProps<TEntity, TFormValues, TPayload>) {
  const isEdit = !!entity;
  const create = useCreate();
  const update = useUpdate();
  const isPending = create.isPending || update.isPending;

  const t = useTranslations(translationNamespace);
  const tc = useTranslations("common");
  const tf = useTranslations("form");
  const tfl = useTranslations("field");
  const tt = useTranslations("toast");
  const tv = useTranslations("validation");

  const form = useForm<TFormValues>({
    // schema input type เป็น generic — cast ให้ผ่าน overload ของ zodResolver
    resolver: zodResolver(buildSchema(tv, tfl) as never) as Resolver<TFormValues>,
    defaultValues: toFormValues(null) as DefaultValues<TFormValues>,
  });

  useEffect(() => {
    if (open) form.reset(toFormValues(entity) as DefaultValues<TFormValues>);
    // toFormValues เป็น pure mapper — reset เฉพาะตอนเปิด/เปลี่ยน entity เท่านั้น
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entity, form]);

  const onSubmit = (values: TFormValues) => {
    const payload = toPayload(values);

    if (isEdit && entity) {
      update.mutate(
        { id: entity.id, doc_version: entity.doc_version, ...payload },
        {
          onSuccess: () => {
            toast.success(tt("updateSuccess", { entity: t("entity") }));
            onOpenChange(false);
          },
        },
      );
    } else {
      create.mutate(payload, {
        onSuccess: (data) => {
          toast.success(tt("createSuccess", { entity: t("entity") }));
          onOpenChange(false);
          onCreated?.(data);
        },
      });
    }
  };

  const submitLabel = isPending
    ? isEdit
      ? tf("saving")
      : tf("creating")
    : isEdit
      ? tc("save")
      : tc("create");

  return (
    <Dialog open={open} onOpenChange={isPending ? undefined : onOpenChange}>
      <DialogContent 
        className={cn(
          "sm:max-w-[425px] p-0 border-0 overflow-hidden bg-transparent shadow-2xl", 
          contentClassName
        )}
        showCloseButton={false}
      >
        <div className="relative overflow-hidden rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-3xl border border-white/80 dark:border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,1)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]">
          <form
            onSubmit={
              stopPropagationOnSubmit
                ? (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    form.handleSubmit(onSubmit)(e);
                  }
                : form.handleSubmit(onSubmit)
            }
            className="flex flex-col relative"
          >
            <div className="px-6 py-6 border-b border-white/60 dark:border-white/10 bg-white/60 dark:bg-black/40">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/90 dark:bg-white/10 text-primary shadow-sm border border-white/80 dark:border-white/20 backdrop-blur-md">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex flex-col">
                  <DialogTitle className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                    {isEdit
                      ? tf("editTitle", { entity: t("entity") })
                      : tf("addTitle", { entity: t("entity") })}
                  </DialogTitle>
                </div>
              </div>
            </div>

            <div className="px-6 py-6 bg-white/50 dark:bg-black/40">
              <FieldGroup className="gap-5">
                {children({ form, disabled: isPending || !!readOnly })}
              </FieldGroup>
            </div>

            <div className="px-6 py-4 flex justify-end gap-3 border-t border-white/60 dark:border-white/10 bg-white/70 dark:bg-black/50">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
                className="rounded-xl bg-white/90 hover:bg-white dark:bg-white/10 dark:hover:bg-white/20 border border-white/80 dark:border-white/20 font-bold backdrop-blur-md shadow-sm transition-all"
              >
                {readOnly ? tc("close") : tc("cancel")}
              </Button>
              {!readOnly && (
                <Button 
                  type="submit" 
                  disabled={isPending}
                  className="rounded-xl bg-primary/90 hover:bg-primary text-primary-foreground font-bold shadow-lg backdrop-blur-md transition-all"
                >
                  {submitLabel}
                </Button>
              )}
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
