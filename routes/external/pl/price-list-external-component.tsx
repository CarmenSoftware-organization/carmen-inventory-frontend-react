
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
import PriceListExternalImportDialog from "./price-list-external-import-dialog";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Download, Eye, Pencil, Upload } from "lucide-react";
import { readXlsxFirstSheet } from "@/lib/xlsx-utils";
import {
  applyExcelRows,
  downloadExternalPricelistXlsx,
} from "./price-list-external-excel";

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
  const [importOpen, setImportOpen] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);

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
      setIsViewMode(true);
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
      setIsViewMode(true);
    } catch (err) {
      toast.error(
        err instanceof HttpError ? err.message : "Failed to submit price list",
      );
    }
  };

  // ยืนยันก่อน submit — submit แล้ว vendor แก้ต่อไม่ได้ (finalize)
  const handleConfirmSubmit = async () => {
    await handleSubmit();
    setConfirmSubmitOpen(false);
  };

  // export ค่าปัจจุบันใน form (รวมที่แก้ยังไม่เซฟ) เป็น xlsx
  const handleDownloadExcel = () => {
    downloadExternalPricelistXlsx(form.getValues(), taxProfiles ?? []).catch(
      () => toast.error("Could not generate the Excel file"),
    );
  };

  // vendor เลือกไฟล์ที่กรอกมา → parse → เอาค่ากลับเข้า form → เซฟ draft ให้เลย
  // (setValue array อย่างเดียว useFieldArray ใน table อาจไม่ resync — reset หลัง
  //  save คือตัวที่ sync UI จริง · เซฟเลยกัน submit หลุดค่าเพราะ form ไม่ dirty)
  const handleImportExcel = async (file: File) => {
    let rows: Record<string, unknown>[];
    try {
      rows = await readXlsxFirstSheet(file);
    } catch {
      toast.error("Could not read the Excel file");
      return;
    }
    const result = applyExcelRows(
      rows,
      form.getValues("tb_pricelist_detail"),
      taxProfiles ?? [],
    );
    if (!result.ok) {
      toast.error(
        result.reason === "structure"
          ? "This doesn’t look like a price list file. Please use the downloaded Excel."
          : "This file doesn’t match this price list.",
      );
      return;
    }
    const { updated, applied, skipped } = result;
    try {
      const formData = { ...form.getValues(), tb_pricelist_detail: updated };
      await updateMutation.mutateAsync(formData);
      form.reset(formData);
      setIsViewMode(true);
      toast.success(
        `Imported ${applied} item${applied > 1 ? "s" : ""}` +
          (skipped ? `, ${skipped} row(s) skipped` : "") +
          " and saved as draft",
      );
    } catch (err) {
      toast.error(
        err instanceof HttpError ? err.message : "Failed to save imported data",
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
        <div className="flex items-center gap-2 shrink-0">
          {/* ดาวน์โหลดค่าปัจจุบันไปกรอก/ดูใน excel — ใช้ได้ทุกสถานะ */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadExcel}
            className="gap-1.5"
          >
            <Download className="h-4 w-4" />
            Excel
          </Button>
          {/* submit แล้ว vendor แก้ไม่ได้อีก → ซ่อน upload + สลับ edit mode */}
          {data.status !== "submitted" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImportOpen(true)}
                disabled={updateMutation.isPending}
                className="gap-1.5"
              >
                <Upload className="h-4 w-4" />
                Import
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsViewMode(!isViewMode)}
                className="gap-1.5"
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
            </>
          )}
        </div>
      </div>
      <PriceListExternalProductTable
        form={form}
        isViewMode={isViewMode}
        onSave={handleSave}
        onSubmit={() => setConfirmSubmitOpen(true)}
        isSaving={updateMutation.isPending}
        isSubmitting={submitMutation.isPending}
        taxProfiles={taxProfiles ?? []}
      />
      <PriceListExternalImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onFile={handleImportExcel}
        isImporting={updateMutation.isPending}
      />

      <AlertDialog
        open={confirmSubmitOpen}
        onOpenChange={
          submitMutation.isPending || updateMutation.isPending
            ? undefined
            : setConfirmSubmitOpen
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit price list?</AlertDialogTitle>
            <AlertDialogDescription>
              Once submitted, you won’t be able to edit this price list anymore.
              Any unsaved changes will be saved first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={submitMutation.isPending || updateMutation.isPending}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmSubmit();
              }}
              disabled={submitMutation.isPending || updateMutation.isPending}
            >
              {submitMutation.isPending || updateMutation.isPending
                ? "Submitting…"
                : "Submit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
