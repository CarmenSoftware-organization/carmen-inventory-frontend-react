
import { lazy, Suspense, useRef, useState } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import { Boxes, MapPin, Users } from "lucide-react";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import { AnimationStyles, Reveal } from "@/components/share/reveal";
import { Badge } from "@/components/ui/badge";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { useDiscardConfirm } from "@/hooks/use-discard-confirm";
import {
  Field,
  FieldGroup,
  FieldInput,
  FieldLabel,
  FieldSelect,
} from "@/components/ui/field";
import { FormToolbar } from "@/components/ui/form-toolbar";
import { ProductTable } from "@/components/ui/product-table";
import { SelectContent, SelectItem } from "@/components/ui/select";
import { StatusSwitch } from "@/components/ui/status-switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { cn } from "@/lib/utils";
import {
  INVENTORY_TYPE_OPTIONS,
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
      className="relative isolate -mx-3 -my-3 outline-none"
    >
      <AnimationStyles />
      <div className="relative px-4 pt-4 pb-8 lg:p-4">
        {/* ── Toolbar ─────────── */}
        <Reveal>
          <div className="max-w-5xl">
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
          </div>
        </Reveal>

        {/* ── General Info ─────────── */}
        <Reveal delay={80}>
          <div className="border-border/60 bg-card mt-4 max-w-3xl rounded-xl border p-4">
            <SectionLabel icon={MapPin}>{t("entity")}</SectionLabel>

            <form
              id={FORM_ID}
              onSubmit={(e) =>
                form.handleSubmit(onSubmit, () =>
                  scrollToFirstInvalidField(),
                )(e)
              }
              className="space-y-4"
            >
              <FieldGroup className="gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel htmlFor="location-code" required>
                      {tfl("code")}
                    </FieldLabel>
                    {isView ? (
                      <PlainText value={location?.code} />
                    ) : (
                      <FieldInput
                        id="location-code"
                        placeholder={t("codePlaceholder")}
                        className="h-8"
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
                      <PlainText value={location?.name} />
                    ) : (
                      <FieldInput
                        id="location-name"
                        placeholder={t("namePlaceholder")}
                        className="h-8"
                        disabled={isDisabled}
                        error={form.formState.errors.name?.message}
                        maxLength={100}
                        {...form.register("name")}
                      />
                    )}
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel required>{tfl("locationType")}</FieldLabel>
                    {isView ? (
                      <PlainText
                        value={
                          INVENTORY_TYPE_OPTIONS.find(
                            (o) => o.value === location?.location_type,
                          )?.label
                        }
                      />
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
                            className="h-8 text-sm"
                          >
                            <SelectContent>
                              {INVENTORY_TYPE_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
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
                      <PlainText
                        value={
                          PHYSICAL_COUNT_TYPE_OPTIONS.find(
                            (o) => o.value === location?.physical_count_type,
                          )?.label
                        }
                      />
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
                            className="h-8 text-sm"
                          >
                            <SelectContent>
                              {PHYSICAL_COUNT_TYPE_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </FieldSelect>
                        )}
                      />
                    )}
                  </Field>
                </div>

                <Field>
                  <FieldLabel required>{tfl("deliveryPoint")}</FieldLabel>
                  {isView ? (
                    <PlainText value={location?.delivery_point?.name} />
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
                          error={
                            form.formState.errors.delivery_point_id?.message
                          }
                        />
                      )}
                    />
                  )}
                </Field>

                <Field>
                  <FieldLabel htmlFor="location-description">
                    {tfl("description")}
                  </FieldLabel>
                  {isView ? (
                    <PlainText value={location?.description} multiline />
                  ) : (
                    <Textarea
                      id="location-description"
                      placeholder={tfl("optional")}
                      disabled={isDisabled}
                      maxLength={256}
                      {...form.register("description")}
                    />
                  )}
                </Field>

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
                      hideBadge
                    />
                  )}
                />
              </FieldGroup>
            </form>
          </div>
        </Reveal>

        {/* ── Users + Products ─────────── */}
        {isView ? (
          location && (
            <Reveal delay={160}>
              <div className="border-border/60 bg-card mt-4 max-w-5xl rounded-xl border p-4">
                <Tabs defaultValue="users">
                  <TabsList variant="line">
                    <TabsTrigger value="users" className="text-xs">
                      <Users className="size-3" aria-hidden="true" />
                      {t("locationUsers")} ({location.user_location.length})
                    </TabsTrigger>
                    <TabsTrigger value="products" className="text-xs">
                      <Boxes className="size-3" aria-hidden="true" />
                      {t("products")} ({enrichedProducts.length})
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="users" className="mt-3">
                    <UserTable users={enrichedUsers} />
                  </TabsContent>
                  <TabsContent value="products" className="mt-3">
                    <ProductTable products={enrichedProducts} />
                  </TabsContent>
                </Tabs>
              </div>
            </Reveal>
          )
        ) : (
          <>
            <Reveal delay={160}>
              <div className="border-border/60 bg-card mt-4 max-w-5xl rounded-xl border p-4">
                <SectionLabel icon={Users} count={userTargetKeys.length}>
                  {t("locationUsers")}
                </SectionLabel>
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
              </div>
            </Reveal>

            <Reveal delay={220}>
              <div className="border-border/60 bg-card mt-4 max-w-5xl rounded-xl border p-4">
                <SectionLabel icon={Boxes} count={selectedProductIds.size}>
                  {t("products")}
                </SectionLabel>
                <TreeProductLookup
                  products={allProducts}
                  selectedProductIds={selectedProductIds}
                  onSelectionChange={handleProductSelectionChange}
                  disabled={isDisabled}
                  loading={isLoadingProducts}
                />
              </div>
            </Reveal>
          </>
        )}

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
    </div>
  );
}

/* ── Plain text display (view mode) ─────────── */

function PlainText({
  value,
  multiline,
}: {
  readonly value?: string | null;
  readonly multiline?: boolean;
}) {
  const empty = !value;
  return (
    <div className="min-h-8 py-1.5">
      <div
        className={cn(
          "text-foreground",
          multiline
            ? "text-xs leading-relaxed whitespace-pre-wrap"
            : "text-sm font-semibold tracking-tight",
          empty && "text-muted-foreground text-xs font-normal italic",
        )}
      >
        {empty ? "—" : value}
      </div>
    </div>
  );
}

/* ── Section label atom ─────────── */

function SectionLabel({
  icon: Icon,
  children,
  count,
}: {
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly children: React.ReactNode;
  readonly count?: number;
}) {
  return (
    <div className="text-muted-foreground mb-3 flex items-center gap-1.5 text-[0.5625rem] font-semibold tracking-widest uppercase">
      <Icon className="size-2.5" aria-hidden="true" />
      <span>{children}</span>
      {typeof count === "number" && (
        <span
          className={cn(
            "inline-flex h-4 min-w-6 items-center justify-center rounded-full px-1.5 text-[0.5625rem] font-bold tabular-nums tracking-wider",
            count > 0
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground",
          )}
        >
          {count}
        </span>
      )}
    </div>
  );
}
