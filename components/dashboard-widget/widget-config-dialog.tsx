import { useEffect, useState } from "react";
import { Save, X } from "lucide-react";
import { useLocale, useTranslations } from "use-intl";
import {
  WidgetRouter,
  WidgetSkeleton,
} from "@/components/dashboard-widget/dashboard-widget-grid";
import { gridSize } from "@/components/dashboard-widget/widget-display";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDashboardDatasetPreview } from "@/hooks/use-dashboard-dataset";
import type { DashboardDataset } from "@/types/dashboard-dataset";
import type {
  LocalizedTitle,
  WidgetDisplay,
  WidgetParams,
  WidgetType,
} from "@/types/dashboard-widget";
import { useDatasetLabel } from "./use-widget-title";
import { resolveWidgetTitle } from "./widget-title";
import { WidgetDisplayFields } from "./widget-display-fields";
import { WidgetParamFields } from "./widget-param-fields";
import {
  defaultParamsFor,
  inferModuleName,
  inferSubTile,
  defaultWidgetTypeFor,
} from "./widget-shape";

interface WidgetConfigDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly dataset: DashboardDataset;
  readonly initialParams?: WidgetParams | null;
  /** ค่าการแสดงผลเดิม — ไม่ส่ง = ยังไม่เคยตั้ง */
  readonly initialDisplay?: WidgetDisplay | null;
  /** ชนิดกราฟที่ใช้อยู่ — คุมทั้ง preview และฟิลด์ที่โผล่ (min/max เฉพาะ gauge) */
  readonly widgetType?: WidgetType;
  readonly isPending?: boolean;
  /** ชื่อที่ผู้ใช้ตั้งเอง — null/ไม่ส่ง = ใช้ชื่อตั้งต้นของ dataset (ดู `customWidgetTitle`) */
  readonly initialTitle?: LocalizedTitle | null;
  readonly onSubmit: (
    params: WidgetParams,
    display: WidgetDisplay,
    titleI18n: LocalizedTitle | null,
  ) => void;
}

export function WidgetConfigDialog({
  open,
  onOpenChange,
  dataset,
  initialParams,
  initialDisplay,
  initialTitle,
  widgetType,
  isPending,
  onSubmit,
}: WidgetConfigDialogProps) {
  const t = useTranslations("dashboard.savedWidget");
  const tc = useTranslations("common");
  const params = dataset.params ?? [];

  const [values, setValues] = useState<WidgetParams>(() =>
    defaultParamsFor(params),
  );
  const [display, setDisplay] = useState<WidgetDisplay>({});
  const locale = useLocale();
  const datasetLabel = useDatasetLabel();
  const [titleEn, setTitleEn] = useState("");
  const [titleTh, setTitleTh] = useState("");
  const renderType = widgetType ?? defaultWidgetTypeFor(dataset);
  // 1 แถว = 4rem (64px) + gap 0.75rem (12px) ระหว่างแถว — ตรงกับ auto-rows ของกริดจริง
  const previewRows = gridSize(renderType, display).height;
  const previewHeight = previewRows * 64 + (previewRows - 1) * 12;

  useEffect(() => {
    if (!open) return;
    setValues(initialParams ?? defaultParamsFor(dataset.params));
    setDisplay(initialDisplay ?? {});
    setTitleEn(initialTitle?.en ?? "");
    setTitleTh(initialTitle?.th ?? "");
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

  const en = titleEn.trim();
  const th = titleTh.trim();
  const isTitleInvalid = !!th && !en;
  const titleI18n: LocalizedTitle | null = en
    ? th
      ? { en, th }
      : { en }
    : null;
  const defaultTitle = datasetLabel(dataset.id, dataset.name);
  const previewTitle = resolveWidgetTitle(
    { dataset_id: dataset.id, title_i18n: titleI18n },
    { locale, datasetName: dataset.name, translatedDatasetName: defaultTitle },
  );

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
          <div className="space-y-1.5">
            <h3 className="text-muted-foreground text-micro-legal font-bold tracking-[0.16em] uppercase">
              {t("titleSection")}
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="widget-title-en">{t("titleEn")}</Label>
                <Input
                  id="widget-title-en"
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                  placeholder={dataset.name}
                  maxLength={255}
                  disabled={isPending}
                  aria-invalid={isTitleInvalid}
                  aria-describedby={
                    isTitleInvalid ? "widget-title-en-error" : undefined
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="widget-title-th">{t("titleTh")}</Label>
                <Input
                  id="widget-title-th"
                  value={titleTh}
                  onChange={(e) => setTitleTh(e.target.value)}
                  placeholder={locale === "th" ? defaultTitle : undefined}
                  maxLength={255}
                  disabled={isPending}
                />
              </div>
            </div>
            {isTitleInvalid && (
              <p
                id="widget-title-en-error"
                role="alert"
                className="text-destructive text-sm"
              >
                {t("titleEnRequired")}
              </p>
            )}
          </div>

          <WidgetParamFields
            params={params}
            values={values}
            onChange={handleChange}
            disabled={isPending}
          />

          <div className="space-y-1.5">
            <h3 className="text-muted-foreground text-micro-legal font-bold tracking-[0.16em] uppercase">
              {t("display.section")}
            </h3>
            <WidgetDisplayFields
              widgetType={renderType}
              value={display}
              onChange={setDisplay}
              disabled={isPending}
            />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-muted-foreground text-micro-legal font-bold tracking-[0.16em] uppercase">
              {t("preview")}
            </h3>
            {/* การ์ดกิน 100% ของช่องกริด — ใน dialog ไม่มีกริด ต้องกำหนดความสูงให้
                ตามขนาดที่เลือก ไม่งั้นพื้นที่กราฟยุบเป็น 0 แล้ว preview ว่างเปล่า */}
            {isError ? (
              <p role="alert" className="text-destructive text-sm">
                {t("previewError", {
                  message: error?.message ?? "Unknown error",
                })}
              </p>
            ) : isLoading || !preview ? (
              <div style={{ height: previewHeight }}>
                <WidgetSkeleton />
              </div>
            ) : (
              <div style={{ height: previewHeight }}>
                <WidgetRouter
                  widget={{
                    id: "preview",
                    dataset_id: dataset.id,
                    widget_type: renderType,
                    title: previewTitle,
                    order_index: 0,
                    params: values,
                    display,
                    meta: preview.meta,
                    data: preview.data,
                  }}
                  moduleName={inferModuleName(dataset.id)}
                  subTileFor={inferSubTile}
                />
              </div>
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
            onClick={() => onSubmit(values, display, titleI18n)}
            disabled={isPending || isTitleInvalid}
          >
            <Save />
            {tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
