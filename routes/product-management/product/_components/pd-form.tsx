
import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "@/lib/compat/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import {
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from "@/hooks/use-product";
import {
  type ProductDetail,
  type ProductFormValues,
  type ProductUnitConversion,
  type CreateProductDto,
  createProductSchema,
} from "@/types/product";
import type { FormMode } from "@/types/form";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { useDiscardConfirm } from "@/hooks/use-discard-confirm";
import {
  buildItemChanges,
  scrollToFirstInvalidField,
} from "@/lib/form-helpers";
import FormToolbar from "./pd-form-toolbar";
import GeneralTab from "./pd-general-tab";
import LocationsTab from "./pd-location-tab";
import UnitConversionTab from "./pd-unit-conversion-tab";
import RequiredChecklist from "./pd-required-checklist";
import TabArrayCount from "./pd-tab-count";
import { ProductEcoLabelSection } from "./pd-eco-label-section";

const getDefaultValues = (product?: ProductDetail): ProductFormValues => {
  if (!product) {
    return {
      name: "",
      code: "",
      local_name: "",
      description: "",
      inventory_unit_id: "",
      product_item_group_id: "",
      product_status_type: "active",
      tax_profile_id: "",
      is_used_in_recipe: false,
      is_sold_directly: false,
      barcode: "",
      sku: "",
      price: 0,
      price_deviation_limit: 0,
      qty_deviation_limit: 0,
      info: [],
      locations: [],
      order_units: [],
      ingredient_units: [],
    };
  }

  return {
    name: product.name,
    code: product.code,
    local_name: product.local_name ?? "",
    description: product.description ?? "",
    inventory_unit_id: product.inventory_unit.id ?? "",
    product_item_group_id: product.product_item_group?.id ?? "",
    product_status_type: product.product_status_type,
    tax_profile_id: product.tax_profile_id ?? "",
    is_used_in_recipe: product.is_used_in_recipe ?? false,
    is_sold_directly: product.is_sold_directly ?? false,
    barcode: product.barcode ?? "",
    sku: product.sku ?? "",
    price: product.price ?? 0,
    price_deviation_limit: product.price_deviation_limit ?? 0,
    qty_deviation_limit: product.qty_deviation_limit ?? 0,
    info: product.info ?? [],
    locations: product.locations ?? [],
    order_units: product.order_units ?? [],
    ingredient_units: product.ingredient_units ?? [],
  };
};

const mapUnitToPayload = (unit: ProductUnitConversion) => ({
  from_unit_id: unit.from_unit_id,
  from_unit_qty: unit.from_unit_qty,
  to_unit_id: unit.to_unit_id,
  to_unit_qty: unit.to_unit_qty,
  description: unit.description,
  is_default: unit.is_default,
  is_active: unit.is_active,
});

const mapLocationToPayload = (l: ProductFormValues["locations"][number]) => ({
  location_id: l.location_id,
  min_qty: l.min_qty ?? null,
  max_qty: l.max_qty ?? null,
  re_order_qty: l.re_order_qty ?? null,
  par_qty: l.par_qty ?? null,
});

type ProductDirtyFields = {
  locations?: Record<string, unknown>[];
  order_units?: Record<string, unknown>[];
  ingredient_units?: Record<string, unknown>[];
};

const buildPayload = (
  values: ProductFormValues,
  product?: ProductDetail,
  dirtyFields?: ProductDirtyFields,
): CreateProductDto => {
  const locationDiff = buildItemChanges(
    values.locations,
    product?.locations ?? [],
    dirtyFields?.locations,
    mapLocationToPayload,
  );

  const orderDiff = buildItemChanges(
    values.order_units,
    product?.order_units ?? [],
    dirtyFields?.order_units,
    mapUnitToPayload,
  );
  const ingredientDiff = buildItemChanges(
    values.ingredient_units,
    product?.ingredient_units ?? [],
    dirtyFields?.ingredient_units,
    mapUnitToPayload,
  );

  return {
    name: values.name,
    code: values.code,
    local_name: values.local_name,
    description: values.description ?? "",
    inventory_unit_id: values.inventory_unit_id,
    product_item_group_id: values.product_item_group_id,
    product_status_type: values.product_status_type,
    tax_profile_id: values.tax_profile_id || null,
    price_deviation_limit: values.price_deviation_limit ?? null,
    qty_deviation_limit: values.qty_deviation_limit ?? null,
    product_info: {
      is_used_in_recipe: values.is_used_in_recipe,
      is_sold_directly: values.is_sold_directly,
      barcode: values.barcode ?? "",
      sku: values.sku ?? "",
      price: values.price,
      info: values.info,
    },
    ...((locationDiff.add?.length ||
      locationDiff.update?.length ||
      locationDiff.remove?.length) && {
      locations: {
        ...(locationDiff.add?.length && { add: locationDiff.add }),
        ...(locationDiff.update?.length && { update: locationDiff.update }),
        ...(locationDiff.remove?.length && { remove: locationDiff.remove }),
      },
    }),
    ...((orderDiff.add?.length ||
      orderDiff.update?.length ||
      orderDiff.remove?.length) && {
      order_units: {
        ...(orderDiff.add?.length && { add: orderDiff.add }),
        ...(orderDiff.update?.length && {
          update: orderDiff.update.map(({ id, ...rest }) => ({
            ...rest,
            product_order_unit_id: id,
          })),
        }),
        ...(orderDiff.remove?.length && {
          remove: orderDiff.remove.map(({ id }) => ({
            product_order_unit_id: id,
          })),
        }),
      },
    }),
    ...((ingredientDiff.add?.length ||
      ingredientDiff.update?.length ||
      ingredientDiff.remove?.length) && {
      ingredient_units: {
        ...(ingredientDiff.add?.length && { add: ingredientDiff.add }),
        ...(ingredientDiff.update?.length && {
          update: ingredientDiff.update,
        }),
        ...(ingredientDiff.remove?.length && {
          remove: ingredientDiff.remove,
        }),
      },
    }),
  };
};

interface ProductFormProps {
  readonly product?: ProductDetail;
}

export function ProductForm({ product }: ProductFormProps) {
  const t = useTranslations("productManagement.product");
  const tt = useTranslations("toast");
  const tv = useTranslations("validation");
  const tfl = useTranslations("field");
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawReturnUrl = searchParams.get("returnUrl");
  const returnUrl =
    rawReturnUrl &&
    rawReturnUrl.startsWith("/") &&
    !rawReturnUrl.startsWith("//")
      ? rawReturnUrl
      : "/product-management/product";

  const [mode, setMode] = useState<FormMode>(product ? "view" : "add");
  const isEdit = mode === "edit";
  const isAdd = mode === "add";

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const [showDelete, setShowDelete] = useState(false);
  const isPending = createProduct.isPending || updateProduct.isPending;
  const isDisabled = mode === "view" || isPending;

  const defaultValues = getDefaultValues(product);
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(
      createProductSchema(tv, tfl),
    ) as Resolver<ProductFormValues>,
    defaultValues,
  });

  const fieldErrors = form.formState.errors;
  const GENERAL_FIELDS = [
    "name",
    "code",
    "local_name",
    "description",
    "barcode",
    "sku",
    "price",
    "inventory_unit_id",
    "tax_profile_id",
    "product_item_group_id",
    "product_status_type",
    "price_deviation_limit",
    "qty_deviation_limit",
    "is_used_in_recipe",
    "is_sold_directly",
  ] as const;
  const hasGeneralError =
    GENERAL_FIELDS.some(
      (key) => fieldErrors[key as keyof typeof fieldErrors] !== undefined,
    ) || fieldErrors.info !== undefined;
  const hasUnitsError =
    fieldErrors.order_units !== undefined ||
    fieldErrors.ingredient_units !== undefined;
  const hasLocationsError = fieldErrors.locations !== undefined;

  const onSubmit = (values: ProductFormValues) => {
    const normalizedValues: ProductFormValues =
      values.order_units.length === 0 && values.inventory_unit_id
        ? {
            ...values,
            order_units: [
              {
                from_unit_id: values.inventory_unit_id,
                from_unit_qty: 1,
                to_unit_id: values.inventory_unit_id,
                to_unit_qty: 1,
                description: "",
                is_default: true,
                is_active: true,
              },
            ],
          }
        : values;

    const dirty = form.formState.dirtyFields as unknown as ProductDirtyFields;
    const payload = buildPayload(normalizedValues, product, {
      locations: dirty.locations ?? [],
      order_units: dirty.order_units ?? [],
      ingredient_units: dirty.ingredient_units ?? [],
    });

    if (isEdit && product) {
      updateProduct.mutate(
        { id: product.id, ...payload },
        {
          onSuccess: () => {
            toast.success(tt("updateSuccess", { entity: t("entity") }));
            form.reset(normalizedValues);
            setMode("view");
          },
          onError: (err: Error) => toast.error(err.message),
        },
      );
    } else if (isAdd) {
      createProduct.mutate(payload, {
        onSuccess: (res) => {
          toast.success(tt("createSuccess", { entity: t("entity") }));
          const newId = (res as { data?: { id?: string } })?.data?.id;
          if (newId) {
            router.push(`/product-management/product/${newId}`);
          } else {
            router.push(returnUrl);
          }
        },
        onError: (err: Error) => toast.error(err.message),
      });
    }
  };

  const discard = useDiscardConfirm({
    isDirty: form.formState.isDirty,
    isPending,
  });

  const onInvalid = (errors: Record<string, unknown>) => {
    const messages: string[] = [];
    for (const [key, val] of Object.entries(errors)) {
      const err = val as { message?: string; root?: { message?: string } };
      if (err?.message) {
        messages.push(err.message);
      } else if (Array.isArray(val)) {
        const nested = val.flatMap(
          (item: Record<string, { message?: string }> | undefined) =>
            item
              ? Object.values(item)
                  .map((v) => v?.message)
                  .filter(Boolean)
              : [],
        );
        if (nested.length > 0) messages.push(`${key}: ${nested[0]}`);
      } else {
        messages.push(key);
      }
    }
    toast.error(messages.join(", ") || t("fillRequired"));
    scrollToFirstInvalidField();
  };

  const handleCancel = () => {
    discard.confirm(() => {
      if (isEdit && product) {
        form.reset(getDefaultValues(product));
        setMode("view");
      } else {
        router.push(returnUrl);
      }
    });
  };

  const handleBack = () => {
    if (isEdit || isAdd) {
      discard.confirm(() => router.push(returnUrl));
    } else {
      router.push(returnUrl);
    }
  };

  return (
    <div className="space-y-4">
      <FormToolbar
        product={product}
        form={form}
        mode={mode}
        isPending={isPending}
        deleteIsPending={deleteProduct.isPending}
        onBack={handleBack}
        onEdit={() => setMode("edit")}
        onCancel={handleCancel}
        onDelete={() => setShowDelete(true)}
      />

      {isAdd && <RequiredChecklist form={form} />}

      <form
        id="product-form"
        onSubmit={form.handleSubmit(onSubmit, onInvalid)}
        className="space-y-4"
      >
        <Tabs defaultValue="general">
          <TabsList variant="line">
            <TabsTrigger value="general" className="text-xs">
              {t("tabGeneral")}
              <TabArrayCount form={form} name="info" />
              {hasGeneralError && <TabErrorDot />}
            </TabsTrigger>
            <TabsTrigger value="units" className="text-xs">
              {t("tabUnits")}
              <TabArrayCount
                form={form}
                name={["order_units", "ingredient_units"]}
              />
              {hasUnitsError && <TabErrorDot />}
            </TabsTrigger>
            <TabsTrigger value="locations" className="text-xs">
              {t("tabLocations")}
              <TabArrayCount form={form} name="locations" />
              {hasLocationsError && <TabErrorDot />}
            </TabsTrigger>
            {product?.id && (
              <TabsTrigger value="eco-labels" className="text-xs">
                {t("tabEcoLabels")}
              </TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="general">
            <GeneralTab form={form} isDisabled={isDisabled} product={product} />
          </TabsContent>
          <TabsContent value="units">
            <div className="space-y-6">
              <UnitConversionTab
                form={form}
                name="order_units"
                label={t("orderUnit")}
                isDisabled={isDisabled}
              />
              <UnitConversionTab
                form={form}
                name="ingredient_units"
                label={t("ingredientUnit")}
                isDisabled={isDisabled}
              />
            </div>
          </TabsContent>
          <TabsContent value="locations">
            <LocationsTab form={form} isDisabled={isDisabled} />
          </TabsContent>
          {product?.id && (
            <TabsContent value="eco-labels">
              <ProductEcoLabelSection productId={product.id} />
            </TabsContent>
          )}
        </Tabs>
      </form>

      {product && (
        <DeleteDialog
          open={showDelete}
          onOpenChange={(open) =>
            !open && !deleteProduct.isPending && setShowDelete(false)
          }
          title={t("deleteTitle")}
          description={t("deleteConfirm", { name: product.name })}
          isPending={deleteProduct.isPending}
          onConfirm={() => {
            deleteProduct.mutate(product.id, {
              onSuccess: () => {
                toast.success(tt("deleteSuccess", { entity: t("entity") }));
                router.push(returnUrl);
              },
              onError: (err) => toast.error(err.message),
            });
          }}
        />
      )}

      <DiscardDialog {...discard.dialogProps} variant="warning" />
    </div>
  );
}

function TabErrorDot() {
  return (
    <span
      aria-label="has errors"
      className="bg-destructive ml-1.5 inline-block size-1.5 rounded-full"
    />
  );
}
