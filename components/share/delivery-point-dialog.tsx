
import { useEffect } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusSwitch } from "@/components/ui/status-switch";
import {
  Field,
  FieldGroup,
  FieldInput,
  FieldLabel,
} from "@/components/ui/field";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import {
  useCreateDeliveryPoint,
  useUpdateDeliveryPoint,
} from "@/hooks/use-delivery-point";
import type { DeliveryPoint } from "@/types/delivery-point";
import type { TranslationFn } from "@/lib/i18n-schema";

function createDeliveryPointSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, tv("required", { field: tf("name") })),
    is_active: z.boolean(),
  });
}

type DeliveryPointFormValues = z.infer<
  ReturnType<typeof createDeliveryPointSchema>
>;

interface DeliveryPointDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly deliveryPoint?: DeliveryPoint | null;
  /** view-only mode: user มี view permission แต่ไม่มี update — disable form + hide save */
  readonly readOnly?: boolean;
}

/**
 * Dialog สร้าง/แก้ไข Delivery Point (จุดส่งสินค้า) — premium ERP design
 *
 * มี icon-beside-title header + primary accent strip + gradient overlay
 * รองรับทั้ง create (deliveryPoint ไม่มี) และ edit (มี deliveryPoint)
 */
export function DeliveryPointDialog({
  open,
  onOpenChange,
  deliveryPoint,
  readOnly,
}: DeliveryPointDialogProps) {
  const isEdit = !!deliveryPoint;
  const createDeliveryPoint = useCreateDeliveryPoint();
  const updateDeliveryPoint = useUpdateDeliveryPoint();
  const isPending =
    createDeliveryPoint.isPending || updateDeliveryPoint.isPending;
  const t = useTranslations("config.deliveryPoint");
  const tc = useTranslations("common");
  const tf = useTranslations("form");
  const tfl = useTranslations("field");
  const tt = useTranslations("toast");
  const tv = useTranslations("validation");

  const deliveryPointSchema = createDeliveryPointSchema(tv, tfl);
  const form = useForm<DeliveryPointFormValues>({
    resolver: zodResolver(
      deliveryPointSchema,
    ) as Resolver<DeliveryPointFormValues>,
    defaultValues: { name: "", is_active: true },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        deliveryPoint
          ? { name: deliveryPoint.name, is_active: deliveryPoint.is_active }
          : { name: "", is_active: true },
      );
    }
  }, [open, deliveryPoint, form]);

  const onSubmit = (values: DeliveryPointFormValues) => {
    const payload = {
      name: values.name,
      is_active: values.is_active,
    };

    if (isEdit) {
      updateDeliveryPoint.mutate(
        // doc_version round-trips the loaded record's version — backend
        // requires it for optimistic-concurrency checks on update
        { id: deliveryPoint.id, doc_version: deliveryPoint.doc_version, ...payload },
        {
          onSuccess: () => {
            toast.success(tt("updateSuccess", { entity: t("entity") }));
            onOpenChange(false);
          },
          onError: (err) => toast.error(err.message),
        },
      );
    } else {
      createDeliveryPoint.mutate(payload, {
        onSuccess: () => {
          toast.success(tt("createSuccess", { entity: t("entity") }));
          onOpenChange(false);
        },
        onError: (err) => toast.error(err.message),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={isPending ? undefined : onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-md">
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader className="gap-0 px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                <MapPin className="size-4.5" />
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
              <Field>
                <FieldLabel required htmlFor="delivery-point-name">
                  {tfl("name")}
                </FieldLabel>
                <FieldInput
                  id="delivery-point-name"
                  placeholder={t("namePlaceholder")}
                  className="h-8"
                  error={form.formState.errors.name?.message}
                  disabled={isPending || readOnly}
                  maxLength={100}
                  {...form.register("name")}
                />
              </Field>

              <Controller
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <StatusSwitch
                    id="delivery-point-is-active"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isPending || readOnly}
                  />
                )}
              />
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
              <Button
                type="submit"
                size="default"
                disabled={isPending}
              >
                {isPending
                  ? isEdit
                    ? tf("saving")
                    : tf("creating")
                  : isEdit
                    ? tc("save")
                    : tc("create")}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
