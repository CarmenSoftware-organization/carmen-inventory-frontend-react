import { useEffect, useRef, useState } from "react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { useLocationPairProducts } from "@/hooks/use-location-pair-products";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import { BoxIcon, Check, Eye, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import EmptyComponent from "@/components/empty-component";
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

  // โหลดสินค้าของคลังคู่นี้ไว้ล่วงหน้าตั้งแต่เลือกคลังครบ ไม่ต้องรอให้มีแถวก่อน —
  // ตัวที่ยิงจริงคือ lookup ในแต่ละแถว ซึ่งกว่าจะ mount ก็ตอนกดเพิ่มรายการแล้ว
  // observer ตัวนี้อยู่ตลอดอายุแท็บรายการ ของที่โหลดมาเลยไม่ถูกทิ้งทั้งที่ gcTime
  // เป็น 0 · params ต้องตรงกับที่ useLookupPagination ยิงหน้าแรกเป๊ะ ไม่งั้นคนละ key
  useLocationPairProducts(
    fromLocationId || undefined,
    toLocationId || undefined,
    {
      search: undefined,
      perpage: 30,
      page: 1,
    },
  );

  // เปลี่ยนคลังแล้วสินค้าที่เลือกไว้อาจไม่มีในคู่ใหม่ — ล้างของที่เลือกไว้ทุกแถว
  // เช็คว่า "คู่เดิมครบทั้งสองข้าง" ก่อนล้าง ไม่งั้นตอนเปิดใบเก่าที่ค่าทยอยมาจาก
  // ว่าง → มีจริง จะไปล้างสินค้าที่เพิ่งโหลดมาทิ้ง
  const prevPair = useRef<string | null>(null);
  useEffect(() => {
    const pair = `${fromLocationId}|${toLocationId}`;
    const prev = prevPair.current;
    prevPair.current = pair;
    if (prev === null || prev === pair) return;
    const [prevFrom, prevTo] = prev.split("|");
    if (!prevFrom || !prevTo) return;
    itemFields.forEach((_, index) => {
      form.setValue(`items.${index}.product_id`, "");
      form.setValue(`items.${index}.product_name`, "");
      form.setValue(`items.${index}.product_local_name`, "");
      form.setValue(`items.${index}.unit_name`, "");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ล้างเมื่อคู่คลังเปลี่ยนเท่านั้น
  }, [fromLocationId, toLocationId]);

  // ต้องมีคลังครบทั้งคู่ก่อน เพราะช่องเลือกสินค้าดึงเฉพาะของที่มีอยู่ทั้งสองคลัง —
  // เพิ่มแถวเปล่าไปก่อนได้แต่จะกดเลือกอะไรไม่ได้เลย บอกไปตรง ๆ ดีกว่าปล่อยให้งง
  const handleAddItem = () => {
    if (!fromLocationId || !toLocationId) {
      toast.warning(t("selectLocationsFirst"));
      return;
    }
    prependItem({ ...SR_ITEM });
  };

  // กด Save แล้วติดที่ "ต้องมีอย่างน้อย 1 รายการ" — เติมแถวเปล่าให้เห็นว่าต้อง
  // กรอกอะไร (กติกาเดียวกับ PR/PO) · ต้องเลือกคลังต้นทาง/ปลายทางก่อนถึงจะเพิ่มได้
  const submitCount = form.formState.submitCount;
  useEffect(() => {
    if (!submitCount) return;
    if (itemFields.length === 0 && !disabled && !disableAdd) handleAddItem();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ยิงครั้งเดียวต่อการกด submit
  }, [submitCount]);

  const {
    table,
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
      {/* แถวเดียว: ปุ่มตัดสินชิดซ้าย (เป็นการกระทำกับแถวที่เพิ่งติ๊ก มือไปหาปุ่ม
          ตรงนั้น ไม่ต้องกวาดตาไปสุดขวา) · ปุ่มเพิ่มรายการเป็นของทั้งตาราง ดันไป
          ขวาด้วย ms-auto — ไม่ใช้ justify-between เพราะตอนไม่มีปุ่มตัดสินมันจะ
          เหลือลูกตัวเดียวแล้วไปกองซ้าย · ลำดับตาม PR: อนุมัติ → ปฏิเสธ → ส่งกลับ */}
      <div className="flex flex-wrap items-center gap-1.5">
        {selectedRows.length > 0 && canBulkAction && (
          <>
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
          </>
        )}
        {!disabled && (
          <Button
            type="button"
            onClick={handleAddItem}
            size="sm"
            className="ms-auto"
          >
            <Plus /> {t("addItem")}
          </Button>
        )}
      </div>

      <DataGrid
        table={table}
        recordCount={itemFields.length}
        tableLayout={{ rowClamp: false, checkbox: !disabled }}
        emptyMessage={
          <EmptyComponent
            icon={BoxIcon}
            title={t("noItems")}
            description={t("noItemsDesc")}
          />
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
