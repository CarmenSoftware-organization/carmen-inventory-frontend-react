
import { useState } from "react";
import { useRouter } from "@/lib/compat/navigation";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import type { UseFormReturn } from "react-hook-form";
import {
  useCreatePriceListTemplate,
  useDeletePriceListTemplate,
  useUpdatePriceListTemplate,
} from "@/hooks/use-price-list-template";
import { useDiscardConfirm } from "@/hooks/use-discard-confirm";
import type {
  CreatePriceListTemplateDto,
  PriceListTemplate,
} from "@/types/price-list-template";
import type { FormMode } from "@/types/form";
import {
  groupDetailsToProducts,
  type PltFormValues,
} from "./plt-form-schema";

interface UsePltFormActionsParams {
  form: UseFormReturn<PltFormValues>;
  priceListTemplate?: PriceListTemplate;
  defaultValues: PltFormValues;
  mode: FormMode;
  setMode: (mode: FormMode) => void;
}

export function usePltFormActions({
  form,
  priceListTemplate,
  defaultValues,
  mode,
  setMode,
}: UsePltFormActionsParams) {
  const router = useRouter();
  const t = useTranslations("vendorManagement.priceListTemplate");
  const tt = useTranslations("toast");

  const isEdit = mode === "edit";
  const isAdd = mode === "add";

  const createTemplate = useCreatePriceListTemplate();
  const updateTemplate = useUpdatePriceListTemplate();
  const deleteTemplate = useDeletePriceListTemplate();

  const [showDelete, setShowDelete] = useState(false);

  const isPending = createTemplate.isPending || updateTemplate.isPending;
  const isDeletePending = deleteTemplate.isPending;

  const discard = useDiscardConfirm({
    isDirty: form.formState.isDirty,
    isPending: isPending || isDeletePending,
  });

  const onSubmit = (values: PltFormValues) => {
    const products = groupDetailsToProducts(values.details);
    const detailsDirty = Boolean(form.formState.dirtyFields.details);
    const shouldSendProducts = products.length > 0 && (isAdd || detailsDirty);

    const payload: CreatePriceListTemplateDto = {
      name: values.name,
      description: values.description,
      status: values.status,
      currency_id: values.currency_id,
      validity_period: values.validity_period,
      vendor_instruction: values.vendor_instruction,
      products: shouldSendProducts ? { add: products } : {},
    };

    if (isEdit && priceListTemplate) {
      updateTemplate.mutate(
        { id: priceListTemplate.id, ...payload },
        {
          onSuccess: () => {
            toast.success(tt("updateSuccess", { entity: t("entity") }));
            form.reset(values);
            setMode("view");
          },
          onError: (err) => toast.error(err.message),
        },
      );
    } else if (isAdd) {
      createTemplate.mutate(payload, {
        onSuccess: () => {
          toast.success(tt("createSuccess", { entity: t("entity") }));
          router.push("/vendor-management/price-list-template");
        },
        onError: (err) => toast.error(err.message),
      });
    }
  };

  const handleCancel = () => {
    discard.confirm(() => {
      if (isEdit && priceListTemplate) {
        form.reset(defaultValues);
        setMode("view");
      } else {
        router.push("/vendor-management/price-list-template");
      }
    });
  };

  const handleBack = () => {
    if (isEdit || isAdd) {
      discard.confirm(() => router.back());
    } else {
      router.back();
    }
  };

  const handleConfirmDelete = () => {
    if (!priceListTemplate) return;
    deleteTemplate.mutate(priceListTemplate.id, {
      onSuccess: () => {
        toast.success(tt("deleteSuccess", { entity: t("entity") }));
        router.push("/vendor-management/price-list-template");
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return {
    isPending,
    isDeletePending,
    showDelete,
    setShowDelete,
    onSubmit,
    handleCancel,
    handleBack,
    handleConfirmDelete,
    discardDialogProps: discard.dialogProps,
  };
}
