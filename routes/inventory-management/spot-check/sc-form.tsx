
import { useState } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import {
  Boxes,
  ChevronLeft,
  ClipboardCheck,
  MapPin,
  Pencil,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { PrintDocumentButton } from "@/components/print-document-button";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { useDiscardConfirm } from "@/hooks/use-discard-confirm";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import {
  useCreateSpotCheck,
  useDeleteSpotCheck,
  useUpdateSpotCheck,
} from "@/hooks/use-spot-check";
import type { SpotCheck } from "@/types/spot-check";
import type { ProductLocation } from "@/types/location";
import type { FormMode } from "@/types/form";
import {
  CardLabel,
  GlassCard,
  InfoRow,
  MetaChip,
  StatusPill,
} from "@/components/share/glass-card";

import { ScGeneralFields } from "./sc-general-fields";
import { ScHeroStat } from "./sc-hero-stat";
import { getMethodConfig, getSubmitLabel } from "./sc-method-config";
import { ScProductTransfer } from "./sc-product-transfer";
import {
  createSpotCheckSchema,
  getDefaultValues,
  mapFormToPayload,
  type SpotCheckFormValues,
} from "./sc-form-schema";

const FORM_ID = "sc-form";

interface ScFormProps {
  /** Spot check entity สำหรับ edit/view mode */
  readonly spotCheck?: SpotCheck;
  /** location_id locked — required เสมอ (SC ต้องเริ่มจาก location) */
  readonly defaultLocationId: string;
  /** ชื่อ location ที่ pre-fill — ใช้แสดงใน title/meta แทน placeholder */
  readonly defaultLocationName?: string;
  /** Products ใน location สำหรับ Transfer UI ใน manual mode */
  readonly availableProducts?: ProductLocation[];
}

export function ScForm({
  spotCheck,
  defaultLocationId,
  defaultLocationName,
  availableProducts = [],
}: ScFormProps) {
  const t = useTranslations("inventoryManagement.spotCheck");
  const tt = useTranslations("toast");
  const tv = useTranslations("validation");
  const tfl = useTranslations("field");
  const tc = useTranslations("common");
  const tform = useTranslations("form");
  const navigate = useNavigate();
  const [mode, setMode] = useState<FormMode>(spotCheck ? "view" : "add");
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isAdd = mode === "add";

  const createSc = useCreateSpotCheck();
  const updateSc = useUpdateSpotCheck();
  const deleteSc = useDeleteSpotCheck();
  const [showDelete, setShowDelete] = useState(false);
  const isPending = createSc.isPending || updateSc.isPending;
  const isDisabled = isView || isPending;

  const defaultValues = {
    ...getDefaultValues(spotCheck),
    location_id: defaultLocationId,
  };

  const spotCheckSchema = createSpotCheckSchema(tv, tfl);
  const form = useForm<SpotCheckFormValues>({
    resolver: zodResolver(spotCheckSchema) as Resolver<SpotCheckFormValues>,
    defaultValues,
  });

  const discard = useDiscardConfirm({
    isDirty: form.formState.isDirty,
    isPending,
  });

  const method = useWatch({ control: form.control, name: "method" });
  const items = useWatch({ control: form.control, name: "items" });
  const minValue = useWatch({ control: form.control, name: "min_value" });
  const products = useWatch({ control: form.control, name: "products" });

  const manualCount = (products ?? []).filter(
    (p) => p.product_id !== "",
  ).length;
  const itemsCount = items ?? 0;
  const stats = {
    manualCount,
    itemsCount,
    currentCount: method === "manual" ? manualCount : itemsCount,
  };

  const methodConfig = getMethodConfig(method, t);
  const displayLocationName = spotCheck?.location_name || defaultLocationName;
  const hideLocation = !spotCheck;

  const onSubmit = (values: SpotCheckFormValues) => {
    const payload = mapFormToPayload(values);

    if (isEdit && spotCheck) {
      updateSc.mutate(
        { id: spotCheck.id, ...payload },
        {
          onSuccess: () => {
            toast.success(tt("updateSuccess", { entity: t("entity") }));
            navigate("/inventory-management/spot-check");
          },
          onError: (err) => toast.error(err.message),
        },
      );
    } else if (isAdd) {
      createSc.mutate(payload, {
        onSuccess: (res) => {
          toast.success(tt("createSuccess", { entity: t("entity") }));
          const newId = (res as { data?: { id?: string } } | undefined)?.data
            ?.id;
          navigate(
            newId
              ? `/inventory-management/spot-check/${newId}`
              : "/inventory-management/spot-check",
          );
        },
        onError: (err) => toast.error(err.message),
      });
    }
  };

  const handleCancel = () => {
    discard.confirm(() => {
      if (isEdit && spotCheck) {
        form.reset(defaultValues);
        setMode("view");
      } else {
        navigate("/inventory-management/spot-check");
      }
    });
  };

  const handleBack = () => {
    if (isEdit || isAdd) {
      discard.confirm(() => navigate(-1));
    } else {
      navigate(-1);
    }
  };

  const handleConfirmDelete = () => {
    if (!spotCheck) return;
    deleteSc.mutate(spotCheck.id, {
      onSuccess: () => {
        toast.success(tt("deleteSuccess", { entity: t("entity") }));
        navigate("/inventory-management/spot-check");
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const submitLabel = getSubmitLabel(isPending, isAdd, tc, tform);

  return (
    <div className="relative isolate -mx-3 -my-3">
      <form
        id={FORM_ID}
        onSubmit={form.handleSubmit(onSubmit, () =>
          scrollToFirstInvalidField(),
        )}
        className="relative px-4 pt-4 pb-8 lg:p-4"
      >
        {/* Hero section */}
        <section className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_22rem]">
          <div>
            {/* Toolbar */}
            <div className="mb-3 flex flex-wrap items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="w-fit"
                  aria-label={tc("goBack")}
                  onClick={handleBack}
                >
                  <ChevronLeft />
                </Button>
                <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.625rem] font-bold tracking-wider uppercase">
                  <ClipboardCheck className="size-2.5" />
                  {t("entity")}
                </span>
                <StatusPill statusConfig={methodConfig} large />
              </div>
              <div className="flex items-center gap-2">
                {isView ? (
                  <>
                    <Button size="sm" onClick={() => setMode("edit")}>
                      <Pencil />
                      {tc("edit")}
                    </Button>
                    {spotCheck?.id && (
                      <PrintDocumentButton
                        documentType="SC"
                        documentId={spotCheck.id}
                      />
                    )}
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCancel}
                      disabled={isPending}
                    >
                      <X />
                      {tc("cancel")}
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      form={FORM_ID}
                      disabled={isPending}
                    >
                      <Save />
                      {submitLabel}
                    </Button>
                    {isEdit && spotCheck && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowDelete(true)}
                        disabled={deleteSc.isPending || isPending}
                      >
                        <Trash2 />
                        {tc("delete")}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Title + descriptor */}
            <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-[0.5625rem] font-bold tracking-[0.16em] uppercase">
              <span className="bg-muted-foreground size-0.5 rounded-sm" />
              {t("entity")}
              <span className="text-muted-foreground/60">·</span>
              <span className="text-muted-foreground text-[0.5625rem] font-semibold tracking-normal normal-case">
                {methodConfig.hint}
              </span>
            </div>
            <h1 className="text-2xl leading-tight font-semibold tracking-tight md:text-[1.75rem]">
              {displayLocationName || t("namePlaceholder")}
            </h1>

            <p className="text-foreground/80 mt-2 max-w-xl text-xs leading-relaxed">
              {displayLocationName ? (
                <span className="text-foreground/80">
                  {t("descriptorFilled", {
                    location: displayLocationName,
                    count: stats.currentCount,
                  })}
                </span>
              ) : (
                <span className="text-muted-foreground italic">
                  {t("descriptorEmpty")}
                </span>
              )}
            </p>

            {/* Meta chips */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              <MetaChip
                icon={MapPin}
                label={displayLocationName || tfl("location")}
                empty={!displayLocationName}
              />
              <MetaChip icon={methodConfig.icon} label={methodConfig.label} />
              <MetaChip
                icon={Boxes}
                label={
                  stats.currentCount > 0
                    ? t("productsCount", { count: stats.currentCount })
                    : t("noProducts")
                }
                empty={!stats.currentCount}
              />
            </div>
          </div>

          {/* Hero stat card */}
          <ScHeroStat
            count={stats.currentCount}
            methodLabel={methodConfig.label}
            labels={{
              productsToCheck: t("productsToCheck"),
              method: tfl("method"),
              location: tfl("location"),
              productsLabel: t("productsLabel"),
              footer: t("heroFooter"),
            }}
            locationName={displayLocationName}
          />
        </section>

        {/* Body grid */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_22rem]">
          <div className="flex flex-col gap-4">
            <ScGeneralFields
              form={form}
              disabled={isDisabled}
              isView={isView}
              hideLocation={hideLocation}
            />
            {method === "manual" && (
              <ScProductTransfer
                form={form}
                disabled={isDisabled}
                isView={isView}
                availableProducts={availableProducts}
              />
            )}
          </div>

          {/* Sidebar */}
          <aside className="hidden flex-col gap-3 self-start lg:sticky lg:top-20 lg:flex">
            <GlassCard>
              <CardLabel>{t("summary")}</CardLabel>
              <div className="grid gap-1.5">
                <InfoRow
                  k={tfl("method")}
                  v={<StatusPill statusConfig={methodConfig} inline />}
                />
                <InfoRow
                  k={tfl("location")}
                  v={displayLocationName || "—"}
                  muted={!displayLocationName}
                />
                <InfoRow
                  k={t("productsLabel")}
                  v={stats.currentCount || "—"}
                  muted={!stats.currentCount}
                />
                {(method === "random" || method === "high_value") && (
                  <InfoRow k={tfl("items")} v={items || "—"} muted={!items} />
                )}
                {method === "high_value" && (
                  <InfoRow
                    k={tfl("minValue")}
                    v={minValue ?? "—"}
                    muted={minValue == null}
                  />
                )}
                {method === "manual" && (
                  <InfoRow
                    k={t("manualPicked")}
                    v={stats.manualCount || "—"}
                    muted={!stats.manualCount}
                  />
                )}
              </div>
            </GlassCard>

            <GlassCard>
              <CardLabel>
                <span className="inline-flex items-center gap-1">
                  <Sparkles className="size-2.5" />
                  {t("tipTitle")}
                </span>
              </CardLabel>
              <p className="text-foreground/80 text-[0.6875rem] leading-relaxed">
                {methodConfig.tipBody}
              </p>
            </GlassCard>
          </aside>
        </div>
      </form>

      <DiscardDialog {...discard.dialogProps} variant="warning" />

      {spotCheck && (
        <DeleteDialog
          open={showDelete}
          onOpenChange={(open) =>
            !open && !deleteSc.isPending && setShowDelete(false)
          }
          title={t("deleteTitle")}
          description={t("deleteConfirm")}
          isPending={deleteSc.isPending}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}

