import { ModuleLanding } from "@/components/module-landing";

/**
 * หน้า Landing ของโมดูล Store Operation แสดงรายการ sub-modules ทั้งหมด
 * @returns คอมโพเนนต์หน้า landing ของ store operation
 */
export default function StoreOperationPage() {
  return (
    <ModuleLanding
      modulePath="/store-operation"
      description="storeOperationsDesc"
    />
  );
}

export const Component = StoreOperationPage;
