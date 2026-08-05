import { useTranslations } from "use-intl";
import { useWorkflowById } from "@/hooks/use-workflow";
import { useUser } from "@/hooks/use-user";
import { useProduct } from "@/hooks/use-product";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";
import { parseWorkflowData } from "./wf-form-schema";
import { WfDetail } from "./wf-detail";

export function EditWorkflowContent({ id }: { id: string }) {
  const t = useTranslations("systemAdmin.workflow");
  const {
    data: workflow,
    isLoading: wfLoading,
    error: wfError,
    refetch: wfRefetch,
  } = useWorkflowById(id);
  // perpage: -1 ดึงทั้งหมด — ไม่งั้น picker เห็นแค่ user/product หน้าแรก (default
  // pagination ของ backend) ทำให้เลือกคนหรือสินค้าที่อยู่หน้าถัด ๆ ไปไม่ได้
  const { data: userData, isLoading: userLoading } = useUser({ perpage: -1 });
  const { data: productData, isLoading: productLoading } = useProduct({
    perpage: -1,
  });

  const isLoading = wfLoading || userLoading || productLoading;

  const users = userData?.data ?? [];
  const products = (productData?.data ?? []).map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    local_name: p.local_name,
    description: p.description,
    product_status_type: p.product_status_type,
    inventory_unit: {
      id: p.inventory_unit?.id ?? "",
      name: p.inventory_unit?.name ?? "",
    },
    product_item_group: {
      id: p.product_item_group?.id ?? "",
      name: p.product_item_group?.name ?? "",
    },
    product_sub_category: {
      id: p.product_sub_category?.id ?? "",
      name: p.product_sub_category?.name ?? "",
    },
    product_category: {
      id: p.product_category?.id ?? "",
      name: p.product_category?.name ?? "",
    },
  }));

  if (isLoading) return <FormSkeleton />;
  if (wfError || !workflow)
    return (
      <ErrorState
        error={wfError}
        notFoundMessage={t("notFound")}
        onRetry={() => wfRefetch()}
        backTo="/system-admin/workflow"
      />
    );
  // อ่าน data ไม่ได้ = ห้ามเปิดฟอร์ม ไม่งั้นกด Save แล้วทับ stages จริงด้วยของว่าง
  if (!parseWorkflowData(workflow.data).success)
    return (
      <ErrorState
        message={t("incompatibleData")}
        backTo="/system-admin/workflow"
      />
    );

  return <WfDetail workflow={workflow} users={users} products={products} />;
}
