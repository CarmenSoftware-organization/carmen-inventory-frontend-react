import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import {
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from "@/hooks/use-product";
import { useUploadProductImages } from "@/hooks/use-product-image";
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
import PdTabGeneral from "./pd-tab-general";
import PdTabLocations from "./pd-tab-locations";
import PdTabUnitConversion from "./pd-tab-unit-conversion";
import TabArrayCount, { TabEcoLabelCount } from "./pd-tab-count";
import { PdTabEco } from "./pd-tab-eco";

const getDefaultValues = (product?: ProductDetail): ProductFormValues => {
  if (!product) {
    return {
      name: "",
      code: "",
      local_name: "",
      description: "",
      inventory_unit_id: "",
      product_category_id: "",
      product_sub_category_id: "",
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
    product_category_id: product.product_category?.id ?? "",
    product_sub_category_id: product.product_sub_category?.id ?? "",
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

export const buildPayload = (
  values: ProductFormValues,
  product?: ProductDetail,
  isAdd?: boolean,
): CreateProductDto => {
  const locationDiff = buildItemChanges(
    values.locations,
    product?.locations ?? [],
    mapLocationToPayload,
  );

  const orderDiff = buildItemChanges(
    values.order_units,
    product?.order_units ?? [],
    mapUnitToPayload,
  );
  const ingredientDiff = buildItemChanges(
    values.ingredient_units,
    product?.ingredient_units ?? [],
    mapUnitToPayload,
  );

  return {
    name: values.name,
    code: isAdd ? undefined : values.code,
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
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
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
  // รูปที่เลือกไว้แต่ยังไม่อัปโหลด — ค้างอยู่ในฟอร์มจนกว่าจะกด Save ถ้ากดยกเลิก
  // ก็หายไปพร้อมกัน ไม่มีรูปค้างบน backend
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const uploadImages = useUploadProductImages();
  const isPending =
    createProduct.isPending ||
    updateProduct.isPending ||
    uploadImages.isPending;
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
    "product_category_id",
    "product_sub_category_id",
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

  /** อัปโหลดรูปที่ค้างอยู่ (ถ้ามี) — ต้องมี id ของ product แล้วเท่านั้น */
  const flushPendingImages = async (id: string) => {
    if (pendingImages.length === 0) return;
    await uploadImages.mutateAsync({ product_id: id, images: pendingImages });
    setPendingImages([]);
  };

  const onSubmit = async (values: ProductFormValues) => {
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

    const payload = buildPayload(normalizedValues, product, isAdd);

    try {
      if (isEdit && product) {
        // รูปขึ้นก่อน แล้วค่อยบันทึกฟอร์ม — ถ้ารูปพลาดจะได้ไม่บันทึกครึ่ง ๆ กลาง ๆ
        await flushPendingImages(product.id);
        await updateProduct.mutateAsync({
          id: product.id,
          doc_version: product.doc_version,
          ...payload,
        });
        toast.success(tt("updateSuccess", { entity: t("entity") }));
        form.reset(normalizedValues);
        setMode("view");
        return;
      }
      if (isAdd) {
        // ตอนสร้างยังไม่มี id ให้แนบรูป ต้องสร้างก่อนแล้วค่อยอัปโหลดตามไป
        const res = await createProduct.mutateAsync(payload);
        toast.success(tt("createSuccess", { entity: t("entity") }));
        const newId = (res as { data?: { id?: string } })?.data?.id;
        if (newId) {
          await flushPendingImages(newId);
          navigate(`/product-management/product/${newId}`);
        } else {
          navigate(returnUrl);
        }
      }
    } catch {
      // toast ขึ้นจาก MutationCache กลางแล้ว — แค่ค้างอยู่หน้าเดิมให้แก้ต่อ
    }
  };

  const discard = useDiscardConfirm({
    // รูปที่เลือกไว้แต่ยังไม่ได้อัปโหลดก็นับเป็นของที่จะหาย — ไม่งั้นกดออกแล้วรูป
    // หายเงียบ ๆ โดยไม่ถามสักคำ
    isDirty: form.formState.isDirty || pendingImages.length > 0,
    isPending,
  });

  /**
   * กรอกไม่ครบ → บอกสั้น ๆ ว่าไม่ครบแล้วพาไปที่ช่องแรกที่ผิด (กติกาเดียวกับ PR)
   *
   * เดิมไล่ยิงทุก message มาต่อกันเป็นพรืดใน toast เดียว — ยาวจนอ่านไม่ทัน
   * และซ้ำกับกรอบแดง/ข้อความใต้ช่องที่บอกอยู่แล้วว่าช่องไหนขาด
   */
  const onInvalid = () => {
    toast.warning(tv("incompleteDocument"));
    scrollToFirstInvalidField();
  };

  const handleCancel = () => {
    discard.confirm(() => {
      if (isEdit && product) {
        form.reset(getDefaultValues(product));
        setMode("view");
      } else {
        navigate(returnUrl);
      }
    });
  };

  const goBack = () => {
    if (location.key !== "default") {
      navigate(-1);
    } else {
      navigate(returnUrl);
    }
  };

  const handleBack = () => {
    if (isEdit || isAdd) {
      discard.confirm(() => goBack());
    } else {
      goBack();
    }
  };

  return (
    // px-4 ให้ header+form มี gutter ซ้าย · max-w-4xl คุมทั้งฟอร์มให้เท่า
    // company profile (ทุก tab รวมตาราง units/locations)
    //
    // w-full ขาดไม่ได้: พ่อเป็น flex column และ mx-auto ทำให้ margin แกนขวางเป็น
    // auto ซึ่งยกเลิก align-self: stretch ของ flex item — กล่องจะถูกวัดตามเนื้อหา
    // แทน แท็บที่เนื้อหาน้อย (eco label ที่ยังไม่มีข้อมูล) เลยหดแล้วเลื่อนตำแหน่ง
    // ทั้งบล็อกรวมหัวเรื่องกับแถบแท็บ
    <div className="mx-auto w-full max-w-4xl space-y-4 px-4">
      <FormToolbar
        product={product}
        form={form}
        mode={mode}
        isPending={isPending}
        deleteIsPending={deleteProduct.isPending}
        hasPendingImages={pendingImages.length > 0}
        onBack={handleBack}
        onEdit={() => setMode("edit")}
        onCancel={handleCancel}
        onDelete={() => setShowDelete(true)}
      />

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
                <TabEcoLabelCount productId={product.id} />
              </TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="general">
            <PdTabGeneral
              form={form}
              isDisabled={isDisabled}
              product={product}
              pendingImages={pendingImages}
              onPendingImagesChange={setPendingImages}
            />
          </TabsContent>
          <TabsContent value="units">
            <div className="space-y-6">
              <PdTabUnitConversion
                form={form}
                name="order_units"
                label={t("orderUnit")}
                isDisabled={isDisabled}
              />
              <PdTabUnitConversion
                form={form}
                name="ingredient_units"
                label={t("ingredientUnit")}
                isDisabled={isDisabled}
              />
            </div>
          </TabsContent>
          <TabsContent value="locations">
            <PdTabLocations form={form} isDisabled={isDisabled} />
          </TabsContent>
          {product?.id && (
            <TabsContent value="eco-labels">
              <PdTabEco
                productId={product.id}
                readOnly={isDisabled}
              />
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
                navigate(returnUrl);
              },
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
