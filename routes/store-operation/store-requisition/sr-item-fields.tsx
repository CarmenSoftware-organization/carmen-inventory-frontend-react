import { useEffect, useState } from "react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { BoxIcon, Check, Eye, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import EmptyComponent from "@/components/empty-component";
import SearchInput from "@/components/search-input";
import { STAGE_ROLE } from "@/types/stage-role";
import type { SrFormValues } from "./sr-form-schema";
import { SR_ITEM, SR_ITEM_STAGE } from "./sr-form-schema";
import { useSrItemTable } from "./sr-item-table";
import { SrSelectDialog } from "./sr-select-dialog";
import { SrActionDialog } from "./sr-action-dialog";
import { getDeleteDescription } from "@/lib/form-utils";

interface SrItemFieldsProps {
  readonly form: UseFormReturn<SrFormValues>;
  readonly disabled: boolean;
  readonly disableAdd?: boolean;
  readonly fromLocationId: string;
  readonly toLocationId: string;
  readonly role?: string;
}

export function SrItemFields({
  form,
  disabled,
  disableAdd,
  fromLocationId,
  toLocationId,
  role,
}: SrItemFieldsProps) {
  "use no memo";
  const t = useTranslations("storeOperation.storeRequisition");
  const tc = useTranslations("common");
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [bulkAction, setBulkAction] = useState<"approve" | "reject" | null>(
    null,
  );

  const {
    fields: itemFields,
    prepend: prependItem,
    remove: removeItem,
  } = useFieldArray({ control: form.control, name: "items" });

  const handleAddItem = () => {
    // แถวใหม่ยังว่าง ไม่มีทางตรงคำค้น — ค้างตัวกรองไว้ก็เหมือนกดเพิ่มแล้วเงียบ
    setSearch("");
    prependItem({ ...SR_ITEM });
  };

  // กด Save แล้วติดที่ "ต้องมีอย่างน้อย 1 รายการ" — เติมแถวเปล่าให้เห็นว่าต้อง
  // กรอกอะไร (กติกาเดียวกับ PR/PO) · ต้องเลือกคลังต้นทาง/ปลายทางก่อนถึงจะเพิ่มได้
  const submitCount = form.formState.submitCount;
  useEffect(() => {
    if (!submitCount) return;
    // แถวที่กรอกไม่ครบอาจโดนคำค้นซ่อนอยู่ — เตือนไปก็ไม่มีช่องให้ดู ล้างทิ้งก่อน
    if (form.formState.errors.items) setSearch("");
    if (itemFields.length === 0 && !disabled && !disableAdd) handleAddItem();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ยิงครั้งเดียวต่อการกด submit
  }, [submitCount]);

  const {
    table,
    search,
    setSearch,
    visibleCount,
    selectDialogOpen,
    setSelectDialogOpen,
    allCount,
    pendingCount,
    handleSelectAll,
    handleSelectPending,
  } = useSrItemTable({
    form,
    itemFields,
    disabled,
    onDelete: setDeleteIndex,
    fromLocationId,
    toLocationId,
    role,
  });

  const selectedRows = table.getSelectedRowModel().rows;
  const canBulkAction =
    !disabled && (role === STAGE_ROLE.APPROVE || role === STAGE_ROLE.ISSUE);

  const getSelectedIndices = () =>
    table.getSelectedRowModel().rows.map((row) => row.index);

  const applyBulkStatus = (status: string) => {
    const indices = getSelectedIndices();
    for (const index of indices) {
      form.setValue(`items.${index}.stage_status`, status, {
        shouldDirty: true,
      });
    }
    table.resetRowSelection();
  };

  const handleBulkApprove = () => {
    applyBulkStatus(SR_ITEM_STAGE.APPROVE);
  };

  const handleBulkReject = () => {
    applyBulkStatus(SR_ITEM_STAGE.REJECT);
    setBulkAction(null);
  };

  const handleBulkReview = () => {
    applyBulkStatus(SR_ITEM_STAGE.REVIEW);
  };

  return (
    <div className="space-y-2">
      {/* ค้นหาซ้าย ปุ่มเพิ่มรายการขวา แถวเดียวกัน — ทั้งคู่เป็นเรื่องของตาราง
            ข้างล่าง ไม่ใช่ของทั้งฟอร์ม */}
      <div className="flex items-center justify-end gap-2">
        {itemFields.length > 0 && (
          // SearchInput ห่อตัวเองด้วย div flex อยู่แล้ว — mr-auto ต้องอยู่ชั้นนอก
          <div className="mr-auto">
            <SearchInput
              defaultValue={search}
              onSearch={setSearch}
              onInputChange={setSearch}
              containerClassName="w-48 sm:w-64"
            />
          </div>
        )}
        {!disabled && (
          <Button
            type="button"
            onClick={handleAddItem}
            disabled={disableAdd}
            size={'sm'}
          >
            <Plus /> {t("addItem")}
          </Button>
        )}
      </div>
      {selectedRows.length > 0 && canBulkAction && (
        // ปุ่มตัดสินชิดซ้ายเหมือน PR — มือไปหาปุ่มก่อน ไม่ต้องกวาดตาไปสุดขวา
        // ลำดับตาม PR ด้วย: อนุมัติ → ปฏิเสธ → ส่งกลับ
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant="success"
            size="xs"
            onClick={handleBulkApprove}
          >
            <Check />
            {tc("approve")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="xs"
            onClick={() => setBulkAction("reject")}
          >
            <X />
            {tc("reject")}
          </Button>
          <Button
            type="button"
            variant="warning"
            size="xs"
            onClick={handleBulkReview}
          >
            <Eye />
            {tc("sendBack")}
          </Button>
        </div>
      )}

      <DataGrid
        table={table}
        recordCount={visibleCount}
        tableLayout={{ checkbox: !disabled }}
        emptyMessage={
          // มีรายการอยู่แต่ค้นแล้วไม่เหลือ = หาไม่เจอ ไม่ใช่ใบเปล่า
          // ชวนกด "เพิ่มรายการ" ตอนนั้นคือชวนผิดเรื่อง
          itemFields.length > 0 ? (
            <EmptyComponent
              icon={BoxIcon}
              title={tc("noSearchResult")}
              content={
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => setSearch("")}
                >
                  {tc("clearSearch")}
                </Button>
              }
            />
          ) : (
            <EmptyComponent
              icon={BoxIcon}
              title={t("noItems")}
              description={t("noItemsDesc")}
              content={
                !disabled && (
                  <Button
                    type="button"
                    size="xs"
                    onClick={handleAddItem}
                    disabled={disableAdd}
                  >
                    <Plus /> {t("addItem")}
                  </Button>
                )
              }
            />
          )
        }
      >
        <DataGridContainer>
          <DataGridTable />
        </DataGridContainer>
      </DataGrid>

      <DeleteDialog
        open={deleteIndex !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteIndex(null);
        }}
        title={t("removeItem")}
        description={getDeleteDescription(deleteIndex, form)}
        onConfirm={() => {
          if (deleteIndex === null) return;
          removeItem(deleteIndex);
          setDeleteIndex(null);
        }}
      />

      <SrSelectDialog
        open={selectDialogOpen}
        onOpenChange={setSelectDialogOpen}
        allCount={allCount}
        pendingCount={pendingCount}
        onSelectAll={handleSelectAll}
        onSelectPending={handleSelectPending}
      />

      <SrActionDialog
        open={bulkAction === "reject"}
        onOpenChange={(o) => !o && setBulkAction(null)}
        title={t("rejectTitle")}
        description={t("rejectConfirm")}
        confirmLabel={tc("reject")}
        confirmVariant="destructive"
        items={selectedRows.map((row) => ({
          index: row.index,
          productName: row.original.product_name ?? "",
          locationName: row.original.unit_name ?? "",
        }))}
        onConfirm={(messages) => {
          for (const row of selectedRows) {
            const msg = messages[row.index];
            if (msg !== undefined) {
              form.setValue(`items.${row.index}.stage_message`, msg, {
                shouldDirty: true,
              });
            }
          }
          handleBulkReject();
        }}
      />
    </div>
  );
}
