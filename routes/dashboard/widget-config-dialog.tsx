import { useEffect, useState } from "react";
import { Save, X } from "lucide-react";
import { useTranslations } from "use-intl";
import { WidgetSkeleton } from "@/components/dashboard-widget/dashboard-widget-grid";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDashboardDatasetPreview } from "@/hooks/use-dashboard-dataset";
import type { DashboardDataset } from "@/types/dashboard-dataset";
import type { WidgetParams } from "@/types/dashboard-widget";
import { WidgetRenderer } from "./sortable-widget-item";
import { WidgetParamFields } from "./widget-param-fields";
import {
  defaultParamsFor,
  inferModuleName,
  inferSubTile,
  inferWidgetTypeFromShape,
} from "./widget-shape";

interface WidgetConfigDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly dataset: DashboardDataset;
  /** ค่าเดิมของ widget ที่ save แล้ว — ไม่ส่ง = ใช้ default จาก descriptor */
  readonly initialParams?: WidgetParams | null;
  readonly isPending?: boolean;
  readonly onSubmit: (params: WidgetParams) => void;
}

/**
 * ตั้งค่า param ของ widget — ใช้ทั้งตอน add และตอนแก้ของที่ save แล้ว
 * มี live preview ที่ยิง exec ตามค่าที่กรอกอยู่ ทำให้เห็นผลก่อนกด save
 */
export function WidgetConfigDialog({
  open,
  onOpenChange,
  dataset,
  initialParams,
  isPending,
  onSubmit,
}: WidgetConfigDialogProps) {
  const t = useTranslations("dashboard.savedWidget");
  const tc = useTranslations("common");
  const params = dataset.params ?? [];

  const [values, setValues] = useState<WidgetParams>(() =>
    defaultParamsFor(params),
  );

  useEffect(() => {
    if (open) setValues(initialParams ?? defaultParamsFor(dataset.params));
    // seed เฉพาะตอนเปิด/เปลี่ยน dataset — ไม่ผูกกับ values ที่ผู้ใช้กำลังพิมพ์
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dataset.id]);

  const {
    data: preview,
    isLoading,
    isError,
    error,
  } = useDashboardDatasetPreview(dataset.id, values, open);

  const handleChange = (name: string, value: string | number) =>
    setValues((prev) => ({ ...prev, [name]: value }));

  return (
    <Dialog open={open} onOpenChange={(o) => !isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("configureTitle")}</DialogTitle>
          <DialogDescription>
            {t("configureDescription", { name: dataset.name })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <WidgetParamFields
            params={params}
            values={values}
            onChange={handleChange}
            disabled={isPending}
          />

          <div className="space-y-1.5">
            <h3 className="text-muted-foreground text-micro-legal font-bold tracking-[0.16em] uppercase">
              {t("preview")}
            </h3>
            {isError ? (
              <p role="alert" className="text-destructive text-sm">
                {t("previewError", { message: error?.message ?? "Unknown error" })}
              </p>
            ) : isLoading || !preview ? (
              <WidgetSkeleton />
            ) : (
              <WidgetRenderer
                widget={{
                  id: "preview",
                  dataset_id: dataset.id,
                  widget_type: inferWidgetTypeFromShape(dataset.shape),
                  title: dataset.name,
                  order_index: 0,
                  params: values,
                  meta: preview.meta,
                  data: preview.data,
                }}
                moduleName={inferModuleName(dataset.id)}
                subTileFor={inferSubTile}
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            <X />
            {tc("cancel")}
          </Button>
          <Button
            type="button"
            onClick={() => onSubmit(values)}
            disabled={isPending}
          >
            <Save />
            {tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
