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
  DialogFooter,
  DialogHeader,
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
      onError: (err: Error) => void;
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
          onError: (err) => toast.error(err.message),
        },
      );
    } else {
      create.mutate(payload, {
        onSuccess: (data) => {
          toast.success(tt("createSuccess", { entity: t("entity") }));
          onOpenChange(false);
          onCreated?.(data);
        },
        onError: (err) => toast.error(err.message),
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
      <DialogContent className={cn("gap-0 p-0 sm:max-w-md", contentClassName)}>
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
        >
          <DialogHeader className="gap-0 px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="bg-muted text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                <Icon className="size-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base">
                  {isEdit
                    ? tf("editTitle", { entity: t("entity") })
                    : tf("addTitle", { entity: t("entity") })}
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-3 border-t px-5 py-4">
            <FieldGroup className="gap-3">
              {children({ form, disabled: isPending || !!readOnly })}
            </FieldGroup>
          </div>
          <DialogFooter className="bg-muted/20 border-t px-5 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {readOnly ? tc("close") : tc("cancel")}
            </Button>
            {!readOnly && (
              <Button type="submit" size="sm" disabled={isPending}>
                {submitLabel}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
