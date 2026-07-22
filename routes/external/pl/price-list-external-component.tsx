
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  usePriceListExternal,
  useExternalTaxProfiles,
  useUpdatePriceListExternal,
  useSubmitPriceListExternal,
  HttpError,
} from "@/hooks/use-price-list-external";
import { toast } from "sonner";
import type { PricelistExternalDto } from "@/types/price-list-external";
import { ErrorState } from "@/components/ui/error-state";
import PriceListExternalHeader from "./price-list-external-header";
import PriceListExternalProductTable from "./price-list-external-product-table";
import PriceListExternalSkeleton from "./price-list-external-skeleton";
import PriceListExternalExpired from "./price-list-external-expired";
import { Button } from "@/components/ui/button";
import { Eye, Pencil } from "lucide-react";

interface PriceListExternalComponentProps {
  urlToken: string;
}

/**
 * Component หลักสำหรับหน้า price list external
 * จัดการ form, โหมด view/edit, save และ submit price list ผ่าน url token
 *
 * @param props - urlToken สำหรับระบุ price list ที่จะเปิด
 * @returns element ของหน้า price list external
 * @example
 * ```tsx
 * <PriceListExternalComponent urlToken="abc123" />
 * ```
 */
export default function PriceListExternalComponent({
  urlToken,
}: PriceListExternalComponentProps) {
  const { data, isLoading, isError, error, refetch } =
    usePriceListExternal(urlToken);
  const { data: taxProfiles } = useExternalTaxProfiles(urlToken);

  const updateMutation = useUpdatePriceListExternal(urlToken);
  const submitMutation = useSubmitPriceListExternal(urlToken);

  const [isViewMode, setIsViewMode] = useState(true);

  // Initialize form
  const form = useForm<PricelistExternalDto>({
    defaultValues: {
      id: "",
      pricelist_no: "",
      name: "",
      status: "draft",
      vendor: { id: null, name: null },
      hotel: null,
      currency_id: "",
      currency_code: "",
      effective_from_date: "",
      effective_to_date: "",
      description: null,
      note: null,
      tb_pricelist_detail: [],
    },
  });

  // Reset form when data is loaded — MOQ ขั้นต่ำ default เป็น 1 (0 ไม่สมเหตุผล)
  useEffect(() => {
    if (data) {
      form.reset({
        ...data,
        tb_pricelist_detail: data.tb_pricelist_detail.map((d) => ({
          ...d,
          moq_qty: d.moq_qty || 1,
        })),
      });
    }
  }, [data, form]);

  const handleSave = async () => {
    // vendor save draft ได้ตลอด (ไม่บังคับว่าต้องมีการเปลี่ยนแปลง) — โพสต์ค่าปัจจุบัน
    const formData = form.getValues();

    try {
      await updateMutation.mutateAsync(formData);
      toast.success("Draft saved");
      form.reset(formData);
    } catch (err) {
      // surface ข้อความจริงจาก backend (เช่น validation / ลิงก์หมดอายุ) ให้ vendor
      // ภายนอกเห็น แทนข้อความ generic — invalidate/refetch จัดการ reset เอง
      toast.error(err instanceof HttpError ? err.message : "Failed to save changes");
    }
  };

  const handleSubmit = async () => {
    try {
      // ถ้ายังมีการแก้ที่ยังไม่เซฟ → save draft ก่อน แล้วค่อย submit
      // (submit เอง finalize อย่างเดียว ไม่มี payload) · ไม่ dirty ก็ submit เลย
      if (form.formState.isDirty) {
        const formData = form.getValues();
        await updateMutation.mutateAsync(formData);
        form.reset(formData);
      }
      await submitMutation.mutateAsync();
      toast.success("Price list submitted successfully");
    } catch (err) {
      toast.error(
        err instanceof HttpError ? err.message : "Failed to submit price list",
      );
    }
  };

  if (isLoading) {
    return <PriceListExternalSkeleton />;
  }

  if (isError) {
    // 401 = ลิงก์หมดอายุ/ใช้ไม่ได้ — โชว์หน้าเป็นมิตร (ไม่พูดถึง token) แทน
    // error ดิบ · error อื่นค่อยใช้ ErrorState ที่ retry ได้
    if (error instanceof HttpError && error.status === 401) {
      return <PriceListExternalExpired />;
    }
    return <ErrorState message={error?.message} onRetry={() => refetch()} />;
  }

  if (!data) {
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <PriceListExternalHeader data={data} />
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {isViewMode
            ? "Items requested for pricing."
            : "Enter your price and tax for each item, then submit."}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsViewMode(!isViewMode)}
          className="gap-1.5 shrink-0"
        >
          {isViewMode ? (
            <>
              <Pencil className="h-4 w-4" />
              Edit Mode
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" />
              View Mode
            </>
          )}
        </Button>
      </div>
      <PriceListExternalProductTable
        form={form}
        isViewMode={isViewMode}
        onSave={handleSave}
        onSubmit={handleSubmit}
        isSaving={updateMutation.isPending}
        isSubmitting={submitMutation.isPending}
        taxProfiles={taxProfiles ?? []}
      />
    </div>
  );
}
