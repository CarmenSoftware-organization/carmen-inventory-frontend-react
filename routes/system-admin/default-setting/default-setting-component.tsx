import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { useProfile } from "@/hooks/use-profile";
import { useDiscardConfirm } from "@/hooks/use-discard-confirm";
import { useNavigationGuard } from "@/hooks/use-navigation-guard";
import {
  useBusinessUnit,
  useUpdateBusinessUnit,
} from "@/hooks/use-business-unit";
import {
  SettingSection,
  SettingSectionSkeleton,
} from "@/components/ui/setting-section";
import { ConfigField } from "../company-profile/company-profile-ui";
import {
  createBusinessSettingSchema,
  toFormValues,
  buildPatch,
  normalizeConfig,
  mergeSeededConfig,
  type BusinessSettingFormValues,
} from "../company-profile/company-profile-form-schema";
import {
  groupConfigForRender,
  resolveConfigOptions,
} from "../company-profile/company-profile-config-registry";
import {
  useReportFormTemplates,
  type ReportFormOption,
} from "@/hooks/use-report-form-templates";

/** input ของ {@link buildPrintFormOptions} — รวมเป็น object เดียวกันจำนวน field ที่มาก */
export interface BuildPrintFormOptionsParams {
  /** ค่าปัจจุบันของ config item (template id หรือ "") */
  current: string;
  /** options ของ report_group นั้น (undefined = ยังไม่มีข้อมูล) */
  list: ReportFormOption[] | undefined;
  /** hook ยังโหลดอยู่ */
  isLoading: boolean;
  /** hook ดึงข้อมูลไม่สำเร็จ (แยกจาก "template ถูกลบ/ปิดใช้งาน") */
  isError: boolean;
  /** ป้ายสำหรับค่าที่หาไม่เจอในรายการ ทั้งที่โหลดสำเร็จแล้ว (unknown template จริง) */
  unknownLabel: string;
  /** ป้ายระหว่างโหลด */
  loadingLabel: string;
  /** ป้ายเมื่อโหลดล้มเหลว — ค่าที่เก็บไว้ยังคงอยู่ แต่ยังสรุปไม่ได้ว่า template หายไปจริงหรือไม่ */
  unavailableLabel: string;
}

/**
 * รวม options ของ dropdown แบบฟอร์มการพิมพ์
 *
 * ถ้าค่าที่เก็บไว้ไม่อยู่ใน list จะเติม option สังเคราะห์ไว้หัวรายการ เพื่อไม่ให้ค่าหายตอน
 * Save — ป้ายของ option สังเคราะห์นี้ขึ้นกับสาเหตุ: กำลังโหลด, โหลดไม่สำเร็จ (ยังสรุปไม่ได้ว่า
 * template หายไปจริง), หรือโหลดสำเร็จแล้วแต่ไม่พบค่านี้ในรายการ (unknown template จริง)
 */
export function buildPrintFormOptions({
  current,
  list,
  isLoading,
  isError,
  unknownLabel,
  loadingLabel,
  unavailableLabel,
}: BuildPrintFormOptionsParams): ReportFormOption[] {
  const base = list ?? [];
  if (!current || base.some((o) => o.value === current)) return base;
  const label = isLoading ? loadingLabel : isError ? unavailableLabel : unknownLabel;
  return [{ value: current, label }, ...base];
}

/**
 * หน้า Default Setting (system-admin) — แสดง/แก้ไข operational config (PR/SI/PO)
 * ของ business unit ปัจจุบัน (จาก `useProfile().defaultBu`)
 *
 * config เก็บใน BU record เดียวกับหน้า Company Profile (field `config`) — save
 * ยิง `PATCH api/business-units` เฉพาะ field ที่เปลี่ยน (หน้านี้แก้แค่ config)
 * โหมด view = read-only, กด Edit → field กลายเป็น input (toggle ในหน้าเดียว)
 *
 * @returns React element ของหน้า default setting
 */
export default function DefaultSettingComponent() {
  const tm = useTranslations("modules");
  const t = useTranslations("defaultSetting");
  const tv = useTranslations("validation");
  const tf = useTranslations("companyProfile.fields");
  const { defaultBu, isProfileReady } = useProfile();
  const buId = defaultBu?.id;
  const { data, isLoading, isError, refetch } = useBusinessUnit(buId);
  const update = useUpdateBusinessUnit(buId);
  const formTemplates = useReportFormTemplates();
  const [editing, setEditing] = useState(false);

  const form = useForm<BusinessSettingFormValues>({
    resolver: zodResolver(
      createBusinessSettingSchema(tv, tf),
    ) as Resolver<BusinessSettingFormValues>,
    values: data ? toFormValues(data) : undefined,
  });

  const configGroups = data
    ? groupConfigForRender(mergeSeededConfig(normalizeConfig(data.config)))
    : { sections: [], other: [] };
  const isBusy = !isProfileReady || isLoading;

  // มีการแก้ค้าง (dirty) ระหว่างโหมด edit → กัน discard โดยไม่ได้ตั้งใจ
  const hasUnsaved = editing && form.formState.isDirty;
  const discard = useDiscardConfirm({
    isDirty: hasUnsaved,
    isPending: update.isPending,
  });
  const navGuard = useNavigationGuard(hasUnsaved);

  const exitEdit = () => {
    if (data) form.reset(toFormValues(data));
    setEditing(false);
  };
  const handleEdit = () => {
    if (data) form.reset(toFormValues(data));
    setEditing(true);
  };
  const handleCancel = () => discard.confirm(exitEdit);

  const onSubmit = form.handleSubmit((values) => {
    if (!data) return;
    const patch = buildPatch(values, toFormValues(data));
    if (Object.keys(patch).length === 0) {
      setEditing(false);
      return;
    }
    // แนบ doc_version (optimistic lock) กัน 409 version ค้าง
    update.mutate(
      { ...patch, doc_version: data.doc_version },
      {
        onSuccess: () => {
          toast.success(t("saved"));
          setEditing(false);
        },
        onError: (e) => toast.error(e.message || t("saveError")),
      },
    );
  });

  return (
    <div className="mx-auto max-w-4xl p-[max(1rem,env(safe-area-inset-bottom))] space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            {tm("defaultSetting")}
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {t("pageDescription")}
          </p>
        </div>
        {!isError && !isBusy && data && (
          <div className="flex shrink-0 items-center gap-2">
            {editing ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={update.isPending}
                >
                  <X className="size-3.5" aria-hidden="true" />
                  {t("cancel")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={onSubmit}
                  disabled={update.isPending}
                >
                  {update.isPending ? (
                    <Loader2
                      className="size-3.5 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Save className="size-3.5" aria-hidden="true" />
                  )}
                  {t("save")}
                </Button>
              </>
            ) : (
              <Button type="button" size="sm" onClick={handleEdit}>
                <Pencil className="size-3.5" aria-hidden="true" />
                {t("edit")}
              </Button>
            )}
          </div>
        )}
      </header>

      {isError && (
        <ErrorState message={t("loadError")} onRetry={() => refetch()} />
      )}

      {!isError && isBusy && (
        <div>
          <SettingSectionSkeleton first fields={["half"]} />
          <SettingSectionSkeleton fields={["half"]} />
          <SettingSectionSkeleton fields={["half"]} />
        </div>
      )}

      {!isError && !isBusy && data && (
        <form onSubmit={onSubmit}>
          {configGroups.sections.map((section, i) => (
            <SettingSection
              key={section.id}
              first={i === 0}
              title={t(section.titleKey)}
              description={t(section.descKey)}
              action={
                section.id === "printForm" && formTemplates.isError ? (
                  <p className="text-destructive text-xs" role="alert">
                    {t("config.printFormLoadError")}
                  </p>
                ) : undefined
              }
            >
              {section.entries.map((entry) => {
                const group = entry.optionsGroup;
                const options = group
                  ? buildPrintFormOptions({
                      current: entry.item.value,
                      list: formTemplates.data?.get(group),
                      isLoading: formTemplates.isLoading,
                      isError: formTemplates.isError,
                      unknownLabel: t("config.printFormUnknown", {
                        id: entry.item.value,
                      }),
                      loadingLabel: t("config.printFormLoading"),
                      unavailableLabel: t("config.printFormUnavailable", {
                        id: entry.item.value,
                      }),
                    })
                  : entry.options
                    ? resolveConfigOptions(
                        entry.options,
                        data.calculation_method,
                        entry.item.value,
                      ).map((o) => ({ value: o.value, label: t(o.labelKey) }))
                    : undefined;
                return (
                  <ConfigField
                    key={entry.item.key}
                    editing={editing}
                    form={form}
                    index={entry.index}
                    item={entry.item}
                    label={t(entry.labelKey)}
                    yesLabel={t("yes")}
                    noLabel={t("no")}
                    options={options}
                    disabled={group !== undefined && formTemplates.isLoading}
                  />
                );
              })}
            </SettingSection>
          ))}
        </form>
      )}

      {/* Cancel ตอนมีการแก้ค้าง */}
      <DiscardDialog {...discard.dialogProps} variant="warning" />
      {/* นำทางออก/กด back ระหว่างแก้ค้าง */}
      <DiscardDialog
        open={navGuard.isOpen}
        onOpenChange={(o) => {
          if (!o) navGuard.cancel();
        }}
        onConfirm={navGuard.confirm}
        onCancel={navGuard.cancel}
        variant="warning"
      />
    </div>
  );
}
