import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import type { UseFormReturn } from "react-hook-form";
import {
  useCreatePriceListTemplate,
  useDeletePriceListTemplate,
  useUpdatePriceListTemplate,
} from "@/hooks/use-price-list-template";
import { useDiscardConfirm } from "@/hooks/use-discard-confirm";
import { useNavigationGuard } from "@/hooks/use-navigation-guard";
import type {
  CreatePriceListTemplateDto,
  PriceListTemplate,
} from "@/types/price-list-template";
import type { FormMode } from "@/types/form";
import { groupDetailsToProducts, type PltFormValues } from "./plt-form-schema";

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
  const navigate = useNavigate();
  const t = useTranslations("vendorManagement.priceListTemplate");
  const tt = useTranslations("toast");

  const isEdit = mode === "edit";
  const isAdd = mode === "add";

  const createTemplate = useCreatePriceListTemplate();
  const updateTemplate = useUpdatePriceListTemplate();
  const deleteTemplate = useDeletePriceListTemplate();

  const [showDelete, setShowDelete] = useState(false);
  // ระหว่าง submit ตอน create ต้องปิด navigation guard — ไม่งั้น sentinel ที่ guard
  // ดันไว้ที่ /new ค้างอยู่ในสแตก แล้ว back หลังสร้างเสร็จเด้งกลับหน้า /new
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isPending = createTemplate.isPending || updateTemplate.isPending;
  const isDeletePending = deleteTemplate.isPending;

  // RHF formState เป็น proxy — ต้อง "access ตอน render" ถึงจะ subscribe/อัปเดต
  // ถ้าอ่าน dirtyFields แค่ใน onSubmit (callback) มันจะค้าง empty ตลอด →
  // detailsDirty เป็น false เสมอ → products (add/update item) ไม่ถูกส่งไป backend
  const { isDirty, dirtyFields } = form.formState;

  const discard = useDiscardConfirm({
    isDirty,
    isPending: isPending || isDeletePending,
  });

  // in-app navigation guard: เตือนก่อนออกเมื่อ add/edit และฟอร์มถูกแก้ไข
  const navGuard = useNavigationGuard(
    (isAdd || isEdit) && isDirty && !isSubmitting,
  );

  const onSubmit = (values: PltFormValues) => {
    const products = groupDetailsToProducts(values.details);
    const detailsDirty = Boolean(dirtyFields.details);

    // products payload:
    // - create → add ชุดที่กรอก
    // - update (details เปลี่ยน) → full replace: remove ของเดิมทั้งหมด + add ชุดปัจจุบัน
    //   (backend มองว่า add คือ "เพิ่ม" ไม่ใช่ "แทนที่" ถ้า add เฉย ๆ จะ duplicate
    //    ของเดิมทุกครั้งที่ save) · ครอบทั้งเพิ่ม/แก้/ลบ item ในทีเดียว
    // - update (details ไม่เปลี่ยน) → ไม่แตะ products
    let productsPayload: CreatePriceListTemplateDto["products"] = {};
    if (isAdd) {
      if (products.length > 0) productsPayload = { add: products };
    } else if (detailsDirty) {
      const removeIds = (priceListTemplate?.products ?? []).map((p) => ({
        id: p.id,
      }));
      productsPayload = {
        ...(removeIds.length ? { remove: removeIds } : {}),
        ...(products.length ? { add: products } : {}),
      };
    }

    const payload: CreatePriceListTemplateDto = {
      name: values.name,
      description: values.description,
      status: values.status,
      currency_id: values.currency_id,
      validity_period: values.validity_period,
      vendor_instruction: values.vendor_instruction,
      products: productsPayload,
    };

    if (isEdit && priceListTemplate) {
      updateTemplate.mutate(
        {
          id: priceListTemplate.id,
          doc_version: priceListTemplate.doc_version,
          ...payload,
        },
        {
          onSuccess: () => {
            toast.success(tt("updateSuccess", { entity: t("entity") }));
            form.reset(values);
            setMode("view");
          },
        },
      );
    } else if (isAdd) {
      // ปิด guard ก่อนยิง mutation → sentinel ถูก teardown ลบระหว่างรอ network
      setIsSubmitting(true);
      createTemplate.mutate(payload, {
        onError: () => setIsSubmitting(false),
        onSuccess: () => {
          toast.success(tt("createSuccess", { entity: t("entity") }));
          navigate("/vendor-management/price-list-template");
        },
      });
    }
  };

  const handleCancel = () => {
    discard.confirm(() => {
      if (isEdit && priceListTemplate) {
        form.reset(defaultValues);
        setMode("view");
      } else {
        navigate("/vendor-management/price-list-template");
      }
    });
  };

  const handleBack = () => {
    if (isEdit || isAdd) {
      // navGuard.back() ไม่ใช่ navigate(-1) — ผู้ใช้ยืนยัน discard ไปแล้ว
      // ไม่ต้องให้ guard ถามซ้ำ และต้องข้าม sentinel ที่ guard ดันไว้
      discard.confirm(() => navGuard.back());
    } else {
      navigate(-1);
    }
  };

  const handleConfirmDelete = () => {
    if (!priceListTemplate) return;
    deleteTemplate.mutate(priceListTemplate.id, {
      onSuccess: () => {
        toast.success(tt("deleteSuccess", { entity: t("entity") }));
        navigate("/vendor-management/price-list-template");
      },
    });
  };

  return {
    isPending,
    isSubmitting,
    isDeletePending,
    showDelete,
    setShowDelete,
    onSubmit,
    handleCancel,
    handleBack,
    handleConfirmDelete,
    navGuard,
    discardDialogProps: discard.dialogProps,
  };
}
