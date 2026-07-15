import { lazy, Suspense, useRef, useState } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import { AnimationStyles, Reveal } from "@/components/share/reveal";
import { Badge } from "@/components/ui/badge";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { useDiscardConfirm } from "@/hooks/use-discard-confirm";
import {
  Field,
  FieldInput,
  FieldLabel,
  FieldPlainText,
  FieldSelect,
} from "@/components/ui/field";
import { FormToolbar } from "@/components/ui/form-toolbar";
import { ProductTable } from "@/components/ui/product-table";
import { SelectContent, SelectItem } from "@/components/ui/select";
import { SettingSection } from "@/components/ui/setting-section";
import { StatusSwitch } from "@/components/ui/status-switch";
import { Textarea } from "@/components/ui/textarea";
import type { TransferItem } from "@/components/ui/transfer";
import { TreeProductLookup } from "@/components/ui/tree-product-lookup";
import { UserTable } from "@/components/ui/user-table";
import { LookupDeliveryPoint } from "@/components/lookup/lookup-delivery-point";
import {
  useCreateLocation,
  useDeleteLocation,
  useUpdateLocation,
} from "@/hooks/use-location";
import { useAllUsers } from "@/hooks/use-all-users";
import { useAllProducts } from "@/hooks/use-all-products";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import {
  INVENTORY_TYPE_LABEL_KEY,
  INVENTORY_TYPE_OPTIONS,
  PHYSICAL_COUNT_LABEL_KEY,
  PHYSICAL_COUNT_TYPE_OPTIONS,
} from "@/constant/location";
import type { Location } from "@/types/location";
import type { FormMode } from "@/types/form";
import { transferHandler } from "@/utils/transfer-handler";
import {
  createLocationSchema,
  getDefaultValues,
  type LocationFormValues,
} from "./location-form-schema";

// แทน next/dynamic ด้วย React.lazy (code-split chunk เหมือนเดิม)
const Transfer = lazy(() =>
  import("@/components/ui/transfer").then((m) => ({ default: m.Transfer })),
);

const FORM_ID = "location-form";

interface LocationFormProps {
  readonly location?: Location;
}

export function LocationForm({ location }: LocationFormProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [mode, setMode] = useState<FormMode>(location ? "view" : "add");
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isAdd = mode === "add";

  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();
  const deleteLocation = useDeleteLocation();
  const [showDelete, setShowDelete] = useState(false);
  const isPending = createLocation.isPending || updateLocation.isPending;
  const isDisabled = isView || isPending;
  const t = useTranslations("config.location");
  const tfl = useTranslations("field");
  const tt = useTranslations("toast");
  const tv = useTranslations("validation");

  const { data: allUsers = [], isLoading: isLoadingUsers } = useAllUsers();
  const { data: allProducts = [], isLoading: isLoadingProducts } =
    useAllProducts();

  const userSource: TransferItem[] = allUsers.map((user) => ({
    key: user.user_id,
    title: `${user.firstname} ${user.lastname}`,
  }));

  const enrichedUsers = (() => {
    if (!location) return [];
    const emailMap = new Map(allUsers.map((u) => [u.user_id, u.email]));
    const seen = new Set<string>();
    return location.user_location
      .filter((u) => {
        if (seen.has(u.id)) return false;
        seen.add(u.id);
        return true;
      })
      .map((u) => ({
        ...u,
        email: emailMap.get(u.id) ?? "",
      }));
  })();

  const enrichedProducts = (() => {
    if (!location) return [];
    const seen = new Set<string>();
    const productMap = new Map(
      allProducts.map((p) => [
        p.id,
        {
          local_name: p.local_name,
          inventory_unit_name:
            (p as unknown as { inventory_unit_name: string | null })
              .inventory_unit_name ?? null,
        },
      ]),
    );
    return location.product_location
      .filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      })
      .map((p) => ({
        ...p,
        ...productMap.get(p.id),
      }));
  })();

  const initialUserKeys = location?.user_location.map((u) => u.id) ?? [];
  const initialProductIds = new Set(
    location?.product_location.map((p) => p.id) ?? [],
  );

  const [userTargetKeys, setUserTargetKeys] =
    useState<string[]>(initialUserKeys);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(
    () => new Set(initialProductIds),
  );

  const locationSchema = createLocationSchema(tv, tfl);
  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema) as Resolver<LocationFormValues>,
    defaultValues: getDefaultValues(location),
  });

  const discard = useDiscardConfirm({
    isDirty: form.formState.isDirty,
    isPending,
  });

  const handleUsersChange = (
    nextTargetKeys: string[],
    direction: "left" | "right",
    moveKeys: string[],
  ) => {
    setUserTargetKeys(nextTargetKeys);
    transferHandler(form, "users", moveKeys, direction);
  };

  const handleProductSelectionChange = (productIds: string[]) => {
    const newIds = new Set(productIds);
    setSelectedProductIds(newIds);

    const toAdd = productIds
      .filter((id) => !initialProductIds.has(id))
      .map((id) => ({ id }));
    const toRemove = Array.from(initialProductIds)
      .filter((id) => !newIds.has(id))
      .map((id) => ({ id }));

    form.setValue("products", { add: toAdd, remove: toRemove });
  };

  const onSubmit = (values: LocationFormValues) => {
    const payload = {
      code: values.code,
      name: values.name,
      location_type: values.location_type,
      physical_count_type: values.physical_count_type,
      description: values.description ?? "",
      is_active: values.is_active,
      ...(values.delivery_point_id
        ? {
            delivery_point_id: values.delivery_point_id,
            delivery_point_name: values.delivery_point_name,
          }
        : {}),
      users: values.users,
      products: values.products,
    };

    if (isEdit && location) {
      updateLocation.mutate(
        // doc_version round-trips the loaded record's version — the backend
        // requires it for optimistic-concurrency checks on update
        { id: location.id, doc_version: location.doc_version, ...payload },
        {
          onSuccess: () => {
            toast.success(tt("updateSuccess", { entity: t("entity") }));
            // เคลียร์ transfer deltas หลัง save — ไม่งั้น users.add/remove และ
            // products.add/remove ยังค้าง ถ้าเข้า edit แล้ว save อีกครั้งจะ re-send
            // การเพิ่ม/ลบเดิมซ้ำ
            form.reset({
              ...values,
              users: { add: [], remove: [] },
              products: { add: [], remove: [] },
            });
            setMode("view");
            requestAnimationFrame(() => {
              containerRef.current?.focus();
            });
          },
          onError: (err) => toast.error(err.message),
        },
      );
    } else if (isAdd) {
      createLocation.mutate(payload, {
        onSuccess: (res) => {
          const { id } = (res as { data: { id: string } }).data;
          toast.success(tt("createSuccess", { entity: t("entity") }));
          navigate(`/config/location/${id}`, { replace: true });
          setMode("view");
        },
        onError: (err) => toast.error(err.message),
      });
    }
  };

  const handleCancel = () => {
    discard.confirm(() => {
      if (isEdit && location) {
        form.reset(getDefaultValues(location));
        setUserTargetKeys(initialUserKeys);
        setSelectedProductIds(new Set(initialProductIds));
        setMode("view");
      } else {
        navigate("/config/location");
      }
    });
  };

  const handleBack = () => {
    if (isEdit || isAdd) {
      discard.confirm(() => navigate("/config/location"));
    } else {
      navigate("/config/location");
    }
  };

  const codeBadge =
    location && !isAdd ? (
      <Badge
        variant="secondary"
        size="sm"
        className="text-xs"
        aria-label={tfl("code")}
      >
        {location.code}
      </Badge>
    ) : undefined;

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="mx-auto max-w-4xl p-[max(1rem,env(safe-area-inset-bottom))] outline-none"
    >
      <AnimationStyles />
      {/* ── Toolbar ─────────── */}
      <Reveal>
        <FormToolbar
          entity={location && mode !== "add" ? location.name : t("entity")}
          mode={mode}
          formId={FORM_ID}
          isPending={isPending}
          onBack={handleBack}
          onEdit={() => setMode("edit")}
          onCancel={handleCancel}
          onDelete={location ? () => setShowDelete(true) : undefined}
          deleteIsPending={deleteLocation.isPending}
          statusBadge={codeBadge}
          permissionPrefix="configuration.location"
        />
      </Reveal>

      <div className="mt-6">
        {/* ── General Info ─────────── */}
        <Reveal delay={80}>
          <form
            id={FORM_ID}
            onSubmit={(e) =>
              form.handleSubmit(onSubmit, () => scrollToFirstInvalidField())(e)
            }
          >
            <SettingSection
              first
              title={tfl("general")}
              description={t("generalDesc")}
            >
              <Field>
                <FieldLabel htmlFor="location-code" required>
                  {tfl("code")}
                </FieldLabel>
                {isView ? (
                  <FieldPlainText>{location?.code}</FieldPlainText>
                ) : (
                  <FieldInput
                    id="location-code"
                    placeholder={t("codePlaceholder")}
                    disabled={isDisabled}
                    error={form.formState.errors.code?.message}
                    maxLength={10}
                    {...form.register("code")}
                  />
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="location-name" required>
                  {tfl("name")}
                </FieldLabel>
                {isView ? (
                  <FieldPlainText>{location?.name}</FieldPlainText>
                ) : (
                  <FieldInput
                    id="location-name"
                    placeholder={t("namePlaceholder")}
                    disabled={isDisabled}
                    error={form.formState.errors.name?.message}
                    maxLength={100}
                    {...form.register("name")}
                  />
                )}
              </Field>

              <Field>
                <FieldLabel required>{tfl("locationType")}</FieldLabel>
                {isView ? (
                  <FieldPlainText>
                    {location?.location_type
                      ? t(INVENTORY_TYPE_LABEL_KEY[location.location_type])
                      : ""}
                  </FieldPlainText>
                ) : (
                  <Controller
                    control={form.control}
                    name="location_type"
                    render={({ field }) => (
                      <FieldSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isDisabled}
                        error={form.formState.errors.location_type?.message}
                        placeholder={tfl("selectLocationType")}
                      >
                        <SelectContent>
                          {INVENTORY_TYPE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {t(INVENTORY_TYPE_LABEL_KEY[opt.value])}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </FieldSelect>
                    )}
                  />
                )}
              </Field>

              <Field>
                <FieldLabel required>{tfl("physicalCount")}</FieldLabel>
                {isView ? (
                  <FieldPlainText>
                    {location?.physical_count_type
                      ? t(
                          PHYSICAL_COUNT_LABEL_KEY[
                            location.physical_count_type
                          ],
                        )
                      : ""}
                  </FieldPlainText>
                ) : (
                  <Controller
                    control={form.control}
                    name="physical_count_type"
                    render={({ field }) => (
                      <FieldSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isDisabled}
                        error={
                          form.formState.errors.physical_count_type?.message
                        }
                        placeholder={tfl("selectPhysicalCountType")}
                      >
                        <SelectContent>
                          {PHYSICAL_COUNT_TYPE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {t(PHYSICAL_COUNT_LABEL_KEY[opt.value])}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </FieldSelect>
                    )}
                  />
                )}
              </Field>

              <Field className="sm:col-span-2">
                <FieldLabel required>{tfl("deliveryPoint")}</FieldLabel>
                {isView ? (
                  <FieldPlainText>
                    {location?.delivery_point?.name}
                  </FieldPlainText>
                ) : (
                  <Controller
                    control={form.control}
                    name="delivery_point_id"
                    render={({ field }) => (
                      <LookupDeliveryPoint
                        value={field.value}
                        onValueChange={field.onChange}
                        onItemChange={(item) =>
                          form.setValue("delivery_point_name", item.name)
                        }
                        // โชว์ชื่อ delivery point เดิมได้แม้ inactive (ไม่อยู่ใน
                        // lookup list ที่กรองเฉพาะ active) แทนการตก placeholder
                        defaultLabel={location?.delivery_point?.name}
                        disabled={isDisabled}
                        error={form.formState.errors.delivery_point_id?.message}
                      />
                    )}
                  />
                )}
              </Field>

              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="location-description">
                  {tfl("description")}
                </FieldLabel>
                {isView ? (
                  <FieldPlainText className="items-start whitespace-pre-wrap">
                    {location?.description}
                  </FieldPlainText>
                ) : (
                  <Textarea
                    id="location-description"
                    placeholder={tfl("optional")}
                    rows={2}
                    disabled={isDisabled}
                    maxLength={256}
                    className="resize-none"
                    {...form.register("description")}
                  />
                )}
              </Field>

              <div className="sm:col-span-2">
                <Controller
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <StatusSwitch
                      id="location-is-active"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isDisabled}
                      description={t("activeDescription")}
                    />
                  )}
                />
              </div>
            </SettingSection>
          </form>
        </Reveal>

        {/* ── Users ─────────── */}
        <Reveal delay={160}>
          <SettingSection
            wide
            title={t("locationUsers")}
            description={t("usersDesc")}
            count={isView ? enrichedUsers.length : userTargetKeys.length}
          >
            {isView ? (
              <UserTable users={enrichedUsers} />
            ) : (
              <Suspense fallback={null}>
                <Transfer
                  dataSource={userSource}
                  targetKeys={userTargetKeys}
                  onChange={handleUsersChange}
                  disabled={isDisabled}
                  loading={isLoadingUsers}
                  titles={[t("availableUsers"), t("locationUsers")]}
                />
              </Suspense>
            )}
          </SettingSection>
        </Reveal>

        {/* ── Products ─────────── */}
        <Reveal delay={220}>
          <SettingSection
            wide
            title={t("products")}
            description={t("productsDesc")}
            count={isView ? enrichedProducts.length : selectedProductIds.size}
          >
            {isView ? (
              <ProductTable products={enrichedProducts} />
            ) : (
              <TreeProductLookup
                products={allProducts}
                selectedProductIds={selectedProductIds}
                onSelectionChange={handleProductSelectionChange}
                disabled={isDisabled}
                loading={isLoadingProducts}
              />
            )}
          </SettingSection>
        </Reveal>
      </div>

      <DiscardDialog {...discard.dialogProps} variant="warning" />

      {location && (
        <DeleteDialog
          open={showDelete}
          onOpenChange={(open) =>
            !open && !deleteLocation.isPending && setShowDelete(false)
          }
          title={t("deleteTitle")}
          description={t("deleteConfirm", { name: location?.name ?? "" })}
          isPending={deleteLocation.isPending}
          onConfirm={() => {
            deleteLocation.mutate(location.id, {
              onSuccess: () => {
                toast.success(tt("deleteSuccess", { entity: t("entity") }));
                navigate("/config/location");
              },
              onError: (err) => toast.error(err.message),
            });
          }}
        />
      )}
    </div>
  );
}
