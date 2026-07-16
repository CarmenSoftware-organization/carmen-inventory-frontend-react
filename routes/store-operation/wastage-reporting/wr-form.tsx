
import { useState } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import {
  buildItemChanges,
  scrollToFirstInvalidField,
} from "@/lib/form-helpers";
import { useTranslations } from "use-intl";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { LookupLocation } from "@/components/lookup/lookup-location";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";
import {
  useCreateWastageReport,
  useUpdateWastageReport,
  useDeleteWastageReport,
} from "@/hooks/use-wastage-report";
import { useProfile } from "@/hooks/use-profile";
import type {
  WastageReport,
  CreateWastageReportDto,
} from "@/types/wastage-reporting";
import { WR_STATUS_CONFIG } from "@/constant/wastage-reporting";
import { getModeLabels, type FormMode } from "@/types/form";
import {
  createWrSchema,
  type WrFormValues,
  mapItemToPayload,
} from "./wr-form-schema";
import { WrItemFields } from "./wr-item-fields";

interface WastageReportFormProps {
  readonly wastageReport?: WastageReport;
}

/**
 * ฟอร์มรายงานของเสีย (Wastage Report) รองรับโหมด add/view/edit
 * มีส่วนหัว, เลือกวันที่/สถานที่, เหตุผล, รายการสินค้า และปุ่มลบ
 *
 * @param props - wastageReport (optional) สำหรับโหมดแก้ไข/ดู
 * @param props.wastageReport - entity เดิมสำหรับโหมด view/edit
 * @returns คอมโพเนนต์ฟอร์ม WR
 * @example
 * <WastageReportForm />                           // add
 * <WastageReportForm wastageReport={entity} />    // view/edit
 */
export function WastageReportForm({ wastageReport }: WastageReportFormProps) {
  const navigate = useNavigate();
  const t = useTranslations("storeOperation.wastageReporting");
  const tfl = useTranslations("field");
  const tv = useTranslations("validation");
  const tc = useTranslations("common");
  const tt = useTranslations("toast");
  const { data: profile } = useProfile();
  const [mode, setMode] = useState<FormMode>(wastageReport ? "view" : "add");
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isAdd = mode === "add";

  const createWr = useCreateWastageReport();
  const updateWr = useUpdateWastageReport();
  const deleteWr = useDeleteWastageReport();
  const [showDelete, setShowDelete] = useState(false);

  const isPending = createWr.isPending || updateWr.isPending;
  const isDisabled = isView || isPending;

  const wrSchema = createWrSchema(tv, tfl);

  const reportorName =
    wastageReport?.reportor_name ??
    (profile
      ? `${profile.user_info.firstname} ${profile.user_info.lastname}`
      : "");

  const defaultValues: WrFormValues = wastageReport
    ? {
        date: wastageReport.date ?? "",
        location_id: wastageReport.location_id ?? "",
        reason: wastageReport.reason ?? "",
        items:
          wastageReport.items?.map((d) => ({
            id: d.id,
            product_id: d.product_id,
            product_name: d.product_name,
            product_code: d.product_code,
            qty: d.qty,
            unit_id: d.unit_id,
            unit_name: d.unit_name,
            unit_cost: d.unit_cost,
          })) ?? [],
      }
    : {
        date: "",
        location_id: "",
        reason: "",
        items: [],
      };

  const form = useForm<WrFormValues>({
    resolver: zodResolver(wrSchema) as Resolver<WrFormValues>,
    defaultValues,
  });

  const onSubmit = (values: WrFormValues) => {
    const wastage_report_detail = buildItemChanges(
      values.items,
      defaultValues.items,
      // RHF 7.78 type drift
      form.formState.dirtyFields.items as Record<string, unknown>[] | undefined,
      mapItemToPayload,
    );

    const payload: CreateWastageReportDto = {
      date: values.date,
      location_id: values.location_id,
      reason: values.reason,
      wastage_report_detail,
    };

    if (isEdit && wastageReport) {
      updateWr.mutate(
        { id: wastageReport.id, ...payload },
        {
          onSuccess: () => {
            toast.success(tt("updateSuccess", { entity: t("entity") }));
            navigate("/store-operation/wastage-reporting");
          },
        },
      );
    } else if (isAdd) {
      createWr.mutate(payload, {
        onSuccess: () => {
          toast.success(tt("createSuccess", { entity: t("entity") }));
          navigate("/store-operation/wastage-reporting");
        },
      });
    }
  };

  const handleCancel = () => {
    if (isEdit && wastageReport) {
      form.reset(defaultValues);
      setMode("view");
    } else {
      navigate("/store-operation/wastage-reporting");
    }
  };

  const labels = getModeLabels(mode, t("entity"));

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 bg-background flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={tc("goBack")}
            onClick={() => navigate("/store-operation/wastage-reporting")}
          >
            <ArrowLeft />
          </Button>
          {isAdd ? (
            <h1 className="font-semibold text-lg">{labels.title}</h1>
          ) : (
            <div className="flex items-center gap-1.5">
              <h1 className="font-semibold text-lg">{wastageReport?.wr_no}</h1>
              {wastageReport?.status && (
                <Badge
                  className={WR_STATUS_CONFIG[wastageReport.status]?.className}
                >
                  {WR_STATUS_CONFIG[wastageReport.status]?.label ??
                    wastageReport.status}
                </Badge>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isView ? (
            <Button size="sm" onClick={() => setMode("edit")}>
              <Pencil aria-hidden="true" />
              {tc("edit")}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isPending}
              >
                {tc("cancel")}
              </Button>
              <Button
                type="submit"
                size="sm"
                form="wastage-report-form"
                disabled={isPending}
              >
                {isPending ? labels.pending : labels.submit}
              </Button>
            </>
          )}
          {isEdit && wastageReport && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setShowDelete(true)}
              disabled={isPending || deleteWr.isPending}
            >
              <Trash2 aria-hidden="true" />
              {tc("delete")}
            </Button>
          )}
        </div>
      </div>

      <form
        id="wastage-report-form"
        onSubmit={form.handleSubmit(onSubmit, () => scrollToFirstInvalidField())}
        className="space-y-4"
      >
        <div className="max-w-3xl space-y-3">
          <div className="flex gap-6">
            <InfoCell label={tfl("reporter")} value={reportorName} />
          </div>

          <section className="space-y-3">
            <FieldGroup className="gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Field data-invalid={!!form.formState.errors.date}>
                  <FieldLabel>{tfl("date")}</FieldLabel>
                  <Controller
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <DatePicker
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isDisabled}
                        placeholder={t("pickDate")}
                        className="w-full"
                      />
                    )}
                  />
                  <FieldError>{form.formState.errors.date?.message}</FieldError>
                </Field>

                <Field data-invalid={!!form.formState.errors.location_id}>
                  <FieldLabel>{tfl("location")}</FieldLabel>
                  <Controller
                    control={form.control}
                    name="location_id"
                    render={({ field }) => (
                      <LookupLocation
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isDisabled}
                        className="w-full"
                      />
                    )}
                  />
                  <FieldError>
                    {form.formState.errors.location_id?.message}
                  </FieldError>
                </Field>
              </div>

              <Field data-invalid={!!form.formState.errors.reason}>
                <FieldLabel htmlFor="wr-reason">
                  {tfl("reason")}
                </FieldLabel>
                <Textarea
                  id="wr-reason"
                  placeholder={t("reasonPlaceholder")}
                  className="text-xs min-h-13"
                  disabled={isDisabled}
                  maxLength={256}
                  {...form.register("reason")}
                />
                <FieldError>{form.formState.errors.reason?.message}</FieldError>
              </Field>
            </FieldGroup>
          </section>
        </div>

        <WrItemFields form={form} disabled={isDisabled} />
      </form>

      {wastageReport && (
        <DeleteDialog
          open={showDelete}
          onOpenChange={(open) =>
            !open && !deleteWr.isPending && setShowDelete(false)
          }
          title={t("deleteTitle")}
          description={t("deleteConfirm", { wrNo: wastageReport.wr_no })}
          isPending={deleteWr.isPending}
          onConfirm={() => {
            deleteWr.mutate(wastageReport.id, {
              onSuccess: () => {
                toast.success(tt("deleteSuccess", { entity: t("entity") }));
                navigate("/store-operation/wastage-reporting");
              },
            });
          }}
        />
      )}
    </div>
  );
}

/**
 * เซลล์แสดงข้อมูลแบบ label/value สำหรับส่วนหัวของฟอร์ม WR
 * ใช้แสดงข้อมูล readonly เช่น WR No, ผู้รายงาน, ช่วงเวลา
 *
 * @param props - label และ value ที่จะแสดง
 * @param props.label - ข้อความหัวข้อ
 * @param props.value - ค่า (แสดง "—" ถ้าว่าง)
 * @returns คอมโพเนนต์ข้อความ
 * @example
 * <InfoCell label="WR No" value="WR-2026-001" />
 */
const InfoCell = ({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) => {
  return (
    <div>
      <span className="text-muted-foreground">{label}</span>
      <p className="font-semibold truncate">{value || "—"}</p>
    </div>
  );
};
