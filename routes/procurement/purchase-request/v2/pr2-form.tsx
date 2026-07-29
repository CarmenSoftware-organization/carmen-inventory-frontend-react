import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import {
  useFieldArray,
  useForm,
  useWatch,
  type Resolver,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "use-intl";
import { AlertTriangle, Check } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useProfile } from "@/hooks/use-profile";
import { usePrPreviousStages } from "@/hooks/use-purchase-request";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import { formatDate } from "@/lib/date-utils";
import { STAGE_ROLE } from "@/types/stage-role";
import { type FormMode } from "@/types/form";
import {
  PR_STATUS,
  type PurchaseRequest,
  type PurchaseRequestTemplate,
} from "@/types/purchase-request";
import {
  PR_ITEM,
  createPrSchema,
  getDefaultValues,
  isAllItemsComplete,
  type PrFormValues,
} from "../pr-form-schema";
import { PR_ITEM_STAGE_STATUS } from "@/types/purchase-request";
import { usePrFormActions } from "../use-pr-form-actions";
import { PrFormActions } from "../pr-form-actions";
import { PrFormDialogs } from "../pr-form-dialogs";

// lazy เหมือนหน้าเดิม — dialog นี้เปิดนานๆ ครั้ง
const PrSelectDialog = lazy(() =>
  import("../pr-select-dialog").then((m) => ({ default: m.PrSelectDialog })),
);
import { Pr2DocStrip } from "./pr2-doc-strip";
import { Pr2Trail } from "./pr2-trail";
import { Pr2Toolbar } from "./pr2-toolbar";
import { Pr2Grid } from "./pr2-grid";
import { usePr2Rows, type Pr2Sort } from "./pr2-use-rows";
import { Pr2Totals } from "./pr2-totals";
import { Pr2Actions } from "./pr2-actions";
import { Pr2BulkBar } from "./pr2-bulk-bar";
import { PrAskAiMenu } from "../ai/pr-ask-ai-menu";
import { runPrAutoAllocate } from "../pr-auto-allocate";
import { resolvePr2Permissions } from "./pr2-permissions";

/**
 * หน้าใบขอซื้อ v2 — จัดวางใหม่ทั้งใบ ตรรกะเดิมทั้งหมด
 *
 * ใช้ hook เดิม (`usePrFormActions`), schema เดิม (`createPrSchema`), dialog เดิม
 * และเงื่อนไขปุ่มเดิม — เปลี่ยนเฉพาะการจัดพื้นที่: ยุบหัวใบ เอาเส้นทางอนุมัติขึ้นมาไว้
 * บนหน้า และให้ตารางเป็นตารางเดียวไม่มีอะไรซ่อน
 */
export function PurchaseRequestFormV2({
  purchaseRequest,
  template,
}: {
  readonly purchaseRequest?: PurchaseRequest;
  /** สร้างใบใหม่จากเทมเพลต — รายการถูก seed มาให้แล้ว */
  readonly template?: PurchaseRequestTemplate;
}) {
  const t = useTranslations("procurement.purchaseRequest");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");
  const tfl = useTranslations("field");
  const {
    data: profile,
    defaultBu,
    buCode,
    dateFormat,
    hasDepartment,
  } = useProfile();

  const [mode, setMode] = useState<FormMode>(purchaseRequest ? "view" : "add");
  const isView = mode === "view";
  const isAdd = mode === "add";

  const defaultValues = getDefaultValues(purchaseRequest, template);
  const role = purchaseRequest?.role ?? STAGE_ROLE.CREATE;

  const form = useForm<PrFormValues>({
    resolver: zodResolver(
      createPrSchema(tv, tfl, role),
    ) as Resolver<PrFormValues>,
    defaultValues,
    mode: role === STAGE_ROLE.PURCHASE ? "onSubmit" : "onChange",
    reValidateMode: "onChange",
  });

  /**
   * ตารางลงทะเบียนวิธีเลื่อนไปหาแถวไว้ตรงนี้ (ฟอร์มเป็นคนสั่ง ตารางเป็นคนทำ)
   * เพราะโหมดแก้ไขที่แถวเยอะเรนเดอร์แค่ ~20 แถว แถวนอกช่วงไม่มีตัวตนใน DOM
   */
  const scrollToRowRef = useRef<((itemIndex: number) => void) | null>(null);

  /**
   * พาไปหาช่องแรกที่กรอกไม่ครบ — ต้องทำสองจังหวะ
   *
   * `scrollToFirstInvalidField` หา element จาก DOM ตรงๆ ซึ่งใช้ได้กับหน้าเดิมที่
   * เรนเดอร์ครบทุกแถว แต่ v2 virtualize + มีตัวกรอง แถวที่ผิดจึงอาจไม่อยู่ใน DOM
   * เลย ผลคือกดบันทึกแล้วไม่มีอะไรเกิดขึ้น ไม่รู้ด้วยซ้ำว่าติดตรงไหน
   *
   * จึงหาเลขแถวจาก error ของฟอร์มก่อน ล้างตัวกรองถ้าแถวนั้นถูกกรองหายไป สั่ง
   * ตารางเลื่อนมาให้แถวโผล่ แล้วค่อยปล่อยให้ตัวช่วยเดิมทำงานต่อ (มัน retry
   * ให้อยู่แล้ว 12 เฟรม รอ DOM ตามทัน)
   */
  const revealFirstInvalidItem = () => {
    const itemErrors = form.formState.errors.items;
    if (!itemErrors) return;
    const invalid = Object.keys(itemErrors)
      .map(Number)
      .filter((n) => Number.isInteger(n) && !!itemErrors[n]);
    if (invalid.length === 0) return;
    const target = Math.min(...invalid);

    if (!rows.includes(target)) {
      setSearch("");
      setStatusFilter(null);
    }
    // รอให้ตัวกรองที่เพิ่งล้างมีผลกับรายการแถวก่อน ค่อยสั่งเลื่อน
    requestAnimationFrame(() => scrollToRowRef.current?.(target));
  };

  const showFirstInvalid = () => {
    revealFirstInvalidItem();
    // behavior "auto" ไม่ใช่ smooth (ค่า default) — smooth คือ animation ที่กิน
    // เวลาหลายร้อย ms แล้วมันจะไปลงเอยทับตำแหน่งที่ตารางจัดไว้ให้ทีหลัง
    // (ตัวจัดตำแหน่งใน pr2-grid ต้องเป็นคนสุดท้ายที่แตะ scrollLeft)
    scrollToFirstInvalidField({ behavior: "auto" });
  };

  const validatePurchase = () =>
    new Promise<boolean>((resolve) => {
      form.handleSubmit(
        () => resolve(true),
        () => {
          showFirstInvalid();
          resolve(false);
        },
      )();
    });

  useEffect(() => {
    if (form.formState.isSubmitted) form.trigger();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form is stable
  }, [role]);

  useUnsavedChanges(form.formState.isDirty);

  const actions = usePrFormActions({
    form,
    purchaseRequest,
    defaultValues,
    mode,
    setMode,
    role,
  });

  const { data: previousStages, isLoading: stagesLoading } =
    usePrPreviousStages(
      purchaseRequest?.id,
      !!purchaseRequest?.workflow_id &&
        !!purchaseRequest?.workflow_current_stage,
    );

  const showNoDepartment = isAdd && !!profile && !!defaultBu && !hasDepartment;
  const hasHistory = !!purchaseRequest?.workflow_history?.length;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());

  // ไม่มี default sort — ลำดับตามที่อยู่ในใบจริง เลขแถวจึงเรียง 1,2,3 ตามธรรมชาติ
  const [sort, setSort] = useState<Pr2Sort | null>(null);

  const { rows, counts, totalCount } = usePr2Rows(
    form.control,
    search,
    statusFilter,
    sort,
  );

  // กดหัวคอลัมน์: ยังไม่เรียง → น้อยไปมาก → มากไปน้อย → กลับไปลำดับเดิม
  const toggleSort = (key: string) =>
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });

  const watchedDescription = useWatch({
    control: form.control,
    name: "description",
  });

  const requesterName = useMemo(() => {
    if (purchaseRequest?.requestor_name) return purchaseRequest.requestor_name;
    if (!profile) return "";
    return `${profile.user_info.firstname} ${profile.user_info.lastname}`;
  }, [purchaseRequest?.requestor_name, profile]);

  const departmentName =
    purchaseRequest?.department_name ?? defaultBu?.department?.name ?? "";

  const [todayIso] = useState(() => new Date().toISOString());
  const prDateDisplay = formatDate(
    purchaseRequest?.pr_date || todayIso,
    dateFormat,
  );

  const isDraft =
    !purchaseRequest?.pr_status ||
    purchaseRequest.pr_status === PR_STATUS.DRAFT;

  const defaultRequestorId = profile?.id ?? "";
  const defaultDepartmentId = defaultBu?.department?.id ?? "";

  // Auto-populate ค่า default ที่ซ่อนไว้ (pr_date/requestor/department) — ต้อง
  // reset baseline ไม่ใช่ setValue. RHF คิด isDirty = !deepEqual(getValues(),
  // defaultValues) ทั้งฟอร์ม; setValue ค่าที่ต่างจาก default จะ "ค้าง" อยู่ใน
  // formValues แล้วพอมี action ใดไป trigger การ recompute ฟอร์มจะกลายเป็น dirty
  // ทั้งที่ยังไม่ได้กรอกจริง → back/navigate ติด discard. reset + keepDirtyValues
  // ทำให้ค่า auto เป็น baseline (ไม่นับ dirty) แต่ยังคงค่าที่ผู้ใช้แก้ไว้ตามเดิม
  useEffect(() => {
    const values = form.getValues();
    const patch: Partial<PrFormValues> = {};
    if (!values.pr_date) {
      patch.pr_date = new Date().toISOString().split("T")[0];
    }
    if (profile && defaultBu) {
      if (!values.requestor_id) patch.requestor_id = defaultRequestorId;
      if (!values.department_id) patch.department_id = defaultDepartmentId;
    }
    if (Object.keys(patch).length === 0) return;
    form.reset(
      {
        ...defaultValues,
        pr_date: patch.pr_date ?? values.pr_date,
        requestor_id: patch.requestor_id ?? values.requestor_id,
        department_id: patch.department_id ?? values.department_id,
      },
      { keepDirtyValues: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form stable; defaultValues โครงสร้างคงที่ในโหมด add
  }, [profile, defaultBu, form, defaultRequestorId, defaultDepartmentId]);

  // Enter ในช่อง input ไม่ควร submit ทั้งใบ (ตารางมีช่องกรอกเยอะ กดพลาดง่าย)
  useEffect(() => {
    const formEl = document.getElementById("purchase-request-form");
    if (!formEl) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
        e.preventDefault();
      }
    };
    formEl.addEventListener("keydown", handler);
    return () => formEl.removeEventListener("keydown", handler);
  }, []);

  const toggleOne = (index: number, checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(index);
      else next.delete(index);
      return next;
    });

  // ติ๊ก "เลือกทั้งหมด" ไม่ได้เลือกทันที — หน้าเดิมเปิด dialog ถามก่อนว่าจะเอา
  // ทุกรายการหรือเฉพาะที่ยังรออยู่ (`pr-item-table.tsx:99-104`) เพราะใบที่ตัดสินไป
  // บางส่วนแล้ว การเลือกทั้งใบมักไม่ใช่สิ่งที่ตั้งใจ · ติ๊กออก = ล้างทันที
  const [selectDialogOpen, setSelectDialogOpen] = useState(false);
  const [showOverQtyWarning, setShowOverQtyWarning] = useState(false);

  const toggleAll = (checked: boolean) => {
    if (checked) setSelectDialogOpen(true);
    else setSelected(new Set());
  };

  const { prepend: prependItem, remove: removeItem } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const [today] = useState(() => new Date());
  const [isAllocating, setIsAllocating] = useState(false);

  // ดึงราคาให้ทุกรายการรวดเดียว — ตรรกะเดียวกับหน้าเดิม (ไฟล์กลาง pr-auto-allocate)
  const handleAutoAllocate = async () => {
    setIsAllocating(true);
    await runPrAutoAllocate(form, buCode, {
      allocating: (count) => t("allocating", { count }),
      allocated: (allocated, total) => t("allocated", { allocated, total }),
      allocateFailed: (count) => t("allocateFailed", { count }),
      noPriceListFound: t("noPriceListFound"),
    });
    setIsAllocating(false);
  };

  // lock หลัง submit (สถานะ ≠ draft) เฉพาะ role ผู้สร้าง — role ใน workflow
  // (purchase/approve) ยังต้องแก้รายการได้ กติกาเดียวกับหน้าเดิม
  const isDisabled =
    isView || actions.isPending || (!isDraft && role === STAGE_ROLE.CREATE);

  // สิทธิ์รายอย่างตาม role — กฎยกมาจากหน้าเดิมทั้งชุด (ดู pr2-permissions)
  const perms = resolvePr2Permissions({ role, isDisabled, isDraft });

  const watchedItems = useWatch({ control: form.control, name: "items" });

  // นับจากแถวที่แสดงอยู่จริง (กรองแล้ว) เพื่อให้ตัวเลขใน dialog ตรงกับสิ่งที่จะถูก
  // เลือกจริง — เท่ากับหน้าเดิมเมื่อไม่ได้กรองอะไร
  const pendingRows = rows.filter((i) => {
    const status = watchedItems?.[i]?.current_stage_status ?? "";
    return !status || status === PR_ITEM_STAGE_STATUS.PENDING;
  });

  const handleSelectAll = () => {
    setSelected(new Set(rows));
    setSelectDialogOpen(false);
  };

  const handleSelectPending = () => {
    setSelected(new Set(pendingRows));
    setSelectDialogOpen(false);
  };
  // หน้าเดิมตัดคอลัมน์ action ทิ้งเมื่ออยู่โหมดอ่านและไม่มีรายการไหนมีประวัติเลย
  // (`pr-item-table.tsx:397`) — ไม่มีปุ่มอะไรให้กดก็ไม่ต้องกินที่คอลัมน์
  const hasAnyHistory = (watchedItems ?? []).some(
    (it) => (it?.history?.length ?? 0) > 0,
  );
  const showAction = !isDisabled || hasAnyHistory;

  const workflowId = useWatch({ control: form.control, name: "workflow_id" });
  // ปุ่มบันทึกกดได้เมื่อเลือกสายอนุมัติแล้วและทุกรายการกรอกครบ (กติกาเดิม)
  const canSave = !!workflowId && isAllItemsComplete(watchedItems ?? []);
  // หน้าเดิมกันเพิ่มรายการก่อนเลือกสายอนุมัติ (pr-item-fields.tsx:112)
  const canAddItem = !!workflowId;

  const handleAddItem = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    prependItem(
      {
        ...PR_ITEM,
        currency_id: defaultBu?.config?.default_currency_id ?? null,
        delivery_date: tomorrow.toISOString(),
      },
      { shouldFocus: false },
    );
  };

  const selectedIndexes = [...selected].sort((a, b) => a - b);

  const bulkItems = selectedIndexes.map((index) => ({
    index,
    productName: watchedItems?.[index]?.product_name ?? "",
    locationName: watchedItems?.[index]?.location_name ?? "",
  }));

  // ตั้งสถานะรายแถวตรงๆ เหมือนหน้าเดิม — ยังไม่ยิง API รอกดปุ่ม action ที่ footer
  const setBulkStatus = (status: string, messages?: Record<number, string>) => {
    for (const index of selectedIndexes) {
      form.setValue(`items.${index}.stage_status`, status, {
        shouldDirty: true,
      });
      form.setValue(`items.${index}.current_stage_status`, status, {
        shouldDirty: true,
      });
      if (messages) {
        form.setValue(`items.${index}.stage_message`, messages[index] ?? "");
      }
    }
    setSelected(new Set());
  };

  /**
   * ตรวจรายการที่เลือกก่อนอนุมัติ — ยกมาจาก `pr-item-fields.tsx:191`
   *
   * ถ้ามีแถวที่ zod ไม่ผ่าน (role purchase บังคับผู้ขาย/ราคา/ภาษี) ให้เลื่อนไปช่องแรก
   * ที่ผิด + เตือน แล้วคืน true ให้ผู้เรียก block การอนุมัติไว้
   *
   * v2 ไม่มีการกางแถว ตรงนี้เลยไม่ต้อง setExpanded เหมือนหน้าเดิม — ทุกช่องเห็นอยู่แล้ว
   */
  const guardSelectedItemErrors = async (): Promise<boolean> => {
    if (selectedIndexes.length === 0) return false;
    // ตรวจเฉพาะแถวที่เลือก — `trigger("items")` ทั้งก้อนจะไปทำให้แถวที่ไม่ได้เลือก
    // ขึ้นกรอบแดงด้วย ทั้งที่คนใช้ยังไม่ได้จะทำอะไรกับมันตอนนี้ (แถวพวกนั้นจะถูก
    // ตรวจอีกทีตอนกดบันทึกซึ่ง handleSubmit ตรวจทั้งใบอยู่แล้ว)
    form.clearErrors("items");
    await form.trigger(
      selectedIndexes.map((i) => `items.${i}` as `items.${number}`),
    );
    const errored = selectedIndexes.filter((index) => {
      const itemErr = form.formState.errors.items?.[index];
      return !!itemErr && Object.keys(itemErr).length > 0;
    });
    if (errored.length === 0) return false;
    showFirstInvalid();
    toast.warning(t("purchaseIncomplete"));
    return true;
  };

  /** อนุมัติเกินจำนวนที่ขอมาได้ แต่ต้องยืนยันก่อน (กติกาเดิม) */
  const handleBulkApprove = async () => {
    if (await guardSelectedItemErrors()) return;

    const hasOverQty = selectedIndexes.some((index) => {
      const approvedQty = form.getValues(`items.${index}.approved_qty`);
      const requestedQty = form.getValues(`items.${index}.requested_qty`);
      return approvedQty > requestedQty;
    });
    if (hasOverQty) {
      setShowOverQtyWarning(true);
      return;
    }

    setBulkStatus(PR_ITEM_STAGE_STATUS.APPROVE);
  };

  const handleOverQtyConfirm = () => {
    setBulkStatus(PR_ITEM_STAGE_STATUS.APPROVE);
    setShowOverQtyWarning(false);
  };

  /** ไม่ยืนยัน = ดึงจำนวนอนุมัติกลับเท่าที่ขอมา แล้วปล่อยให้เลือกไว้เหมือนเดิม */
  const handleOverQtyCancel = () => {
    for (const index of selectedIndexes) {
      const approvedQty = form.getValues(`items.${index}.approved_qty`);
      const requestedQty = form.getValues(`items.${index}.requested_qty`);
      if (approvedQty > requestedQty) {
        form.setValue(`items.${index}.approved_qty`, requestedQty, {
          shouldDirty: true,
        });
      }
    }
    setShowOverQtyWarning(false);
  };

  /**
   * ปฏิเสธ/ส่งกลับ ไม่ต้องกรอกผู้ขาย ราคา ภาษี ให้ครบ — ไม่ตรวจ (กติกาเดียวกับ
   * หน้าเดิมที่ข้าม guard ในสองทางนี้) และล้างกรอบแดงที่ค้างจากการกดอนุมัติ
   * ก่อนหน้าทิ้งด้วย ไม่งั้นแถวยังแดงอยู่ทั้งที่การกระทำนี้ไม่สนใจช่องพวกนั้นเลย
   */
  const clearItemValidation = () => form.clearErrors("items");

  const handleBulkReviewClick = (
    messages: Record<number, string>,
    desStage: string,
  ) => {
    clearItemValidation();
    const detailIds = selectedIndexes
      .map((i) => watchedItems?.[i]?.id)
      .filter((id): id is string => !!id);
    if (desStage && detailIds.length > 0) {
      actions.handleBulkReview(detailIds, messages, desStage);
      setSelected(new Set());
      return;
    }
    setBulkStatus(PR_ITEM_STAGE_STATUS.REVIEW, messages);
  };

  const handleBulkSplit = () => {
    const detailIds = selectedIndexes
      .map((i) => watchedItems?.[i]?.id)
      .filter((id): id is string => !!id);
    if (detailIds.length === 0) return;
    actions.handleSplit(detailIds);
    setSelected(new Set());
  };

  return (
    // min-h-0 จำเป็น — flex item default เป็น min-height:auto แล้วจะยืดตามเนื้อหา
    // ทำให้ตารางไม่มีความสูงจำกัด virtualizer เลยเรนเดอร์ครบทุกแถว (เจอมาแล้ว)
    <div className="flex min-h-0 flex-1 flex-col">
      <Pr2DocStrip
        purchaseRequest={purchaseRequest}
        requesterName={requesterName}
        departmentName={departmentName}
        prDateDisplay={prDateDisplay}
        description={watchedDescription}
        form={form}
        // หน้าเดิม: workflow เลือกได้เฉพาะตอน draft + ผู้สร้าง (pr-general-fields.tsx:29)
        canEditWorkflow={
          isDraft && !isView && role === STAGE_ROLE.CREATE && !template
        }
        isAdd={isAdd}
        // หน้าเดิม: notes แก้ได้เฉพาะผู้สร้างและยังไม่ view (pr-form.tsx:127)
        canEditDescription={!isView && role === STAGE_ROLE.CREATE}
        isPending={actions.isPending}
        onBack={actions.handleBack}
        actions={
          <PrFormActions
            mode={mode}
            role={role}
            prStatus={purchaseRequest?.pr_status}
            prId={purchaseRequest?.id}
            prNo={purchaseRequest?.pr_no}
            isPending={actions.isPending}
            isDeletePending={actions.deletePr.isPending}
            hasRecord={!!purchaseRequest}
            canSave={canSave}
            onEdit={() => setMode("edit")}
            onCancel={actions.handleCancel}
            onDelete={() => actions.setShowDelete(true)}
            onComment={() => actions.setShowComment(true)}
          />
        }
      />

      {!isDraft && (
        <Pr2Trail
          purchaseRequest={purchaseRequest}
          dateFormat={dateFormat}
          onShowHistory={
            hasHistory ? () => actions.setShowHistory(true) : undefined
          }
        />
      )}

      <Pr2Toolbar
        totalCount={totalCount}
        counts={counts}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
        search={search}
        onSearch={setSearch}
        onAutoAllocate={perms.canAutoAllocate ? handleAutoAllocate : undefined}
        isAllocating={isAllocating}
        askAi={
          // หน้าเดิมโชว์ปุ่มนี้เฉพาะตอนเลือกแถว และถามเฉพาะแถวที่เลือก
          // (pr-item-fields.tsx:351) — ไม่ใช่ยิงทั้งใบ
          selectedIndexes.length > 0 ? (
            <PrAskAiMenu
              items={selectedIndexes.map((i) => ({
                productName: watchedItems?.[i]?.product_name ?? "",
                productLocalName:
                  watchedItems?.[i]?.product_local_name || undefined,
                locationName: watchedItems?.[i]?.location_name || undefined,
              }))}
            />
          ) : null
        }
      />

      <form
        id="purchase-request-form"
        onSubmit={form.handleSubmit(actions.onSubmit, showFirstInvalid)}
        className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-3"
      >
        <Pr2BulkBar
          count={selected.size}
          role={role}
          isPending={actions.isPending}
          items={bulkItems}
          previousStages={previousStages}
          stagesLoading={stagesLoading}
          onClear={() => setSelected(new Set())}
          onApprove={handleBulkApprove}
          onReject={(messages) => {
            clearItemValidation();
            setBulkStatus(PR_ITEM_STAGE_STATUS.REJECTED, messages);
          }}
          onReview={handleBulkReviewClick}
          onSplit={purchaseRequest ? handleBulkSplit : undefined}
        />

        <Pr2Grid
          control={form.control}
          form={form}
          rows={rows}
          sort={sort}
          onSort={toggleSort}
          showAction={showAction}
          selected={selected}
          onSelect={toggleOne}
          onSelectAll={toggleAll}
          scrollToRowRef={scrollToRowRef}
          dateFormat={dateFormat}
          currencyCode={defaultBu?.config?.default_currency?.code}
          isEmptyDocument={totalCount === 0}
          perms={perms}
          buCode={buCode}
          today={today}
          role={role}
          onAddItem={perms.canAddItems ? handleAddItem : undefined}
          addItemDisabledReason={
            canAddItem ? undefined : t("selectWorkflowFirst")
          }
          onRemoveItem={perms.canAddItems ? removeItem : undefined}
        />
      </form>

      <Pr2Totals
        control={form.control}
        currencyCode={defaultBu?.config?.default_currency?.code}
        actions={
          <Pr2Actions
            role={role}
            prStatus={purchaseRequest?.pr_status}
            isPending={actions.isPending}
            hasRecord={!!purchaseRequest}
            control={form.control}
            previousStages={previousStages}
            stagesLoading={stagesLoading}
            onSubmitPr={actions.handleSubmitPr}
            onApprove={actions.handleApprove}
            onReject={actions.handleReject}
            onReview={actions.handleReview}
            onPurchaseApprove={actions.handlePurchaseApprove}
            onValidatePurchase={validatePurchase}
          />
        }
      />

      <AlertDialog
        open={showOverQtyWarning}
        onOpenChange={setShowOverQtyWarning}
      >
        <AlertDialogContent className="gap-0 p-0 sm:max-w-md">
          <div className="p-5">
            <div className="flex items-start gap-3">
              <div className="bg-muted text-warning-ink flex size-9 shrink-0 items-center justify-center rounded-lg">
                <AlertTriangle className="size-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <AlertDialogTitle className="text-warning-ink text-base">
                  {t("overQtyWarningTitle")}
                </AlertDialogTitle>
                <AlertDialogDescription className="mt-1">
                  {t("overQtyWarningDesc")}
                </AlertDialogDescription>
              </div>
            </div>
          </div>
          <AlertDialogFooter className="border-t px-5 py-3">
            <AlertDialogCancel onClick={handleOverQtyCancel}>
              {tc("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="warning"
              size="default"
              onClick={handleOverQtyConfirm}
            >
              <Check />
              {tc("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Suspense fallback={null}>
        <PrSelectDialog
          open={selectDialogOpen}
          onOpenChange={setSelectDialogOpen}
          allCount={rows.length}
          pendingCount={pendingRows.length}
          onSelectAll={handleSelectAll}
          onSelectPending={handleSelectPending}
        />
      </Suspense>

      <PrFormDialogs
        purchaseRequest={purchaseRequest}
        showDelete={actions.showDelete}
        setShowDelete={actions.setShowDelete}
        deletePr={actions.deletePr}
        showComment={actions.showComment}
        setShowComment={actions.setShowComment}
        showHistory={actions.showHistory}
        setShowHistory={actions.setShowHistory}
        workflowHistory={purchaseRequest?.workflow_history}
        requestorName={purchaseRequest?.requestor_name}
        createdAt={purchaseRequest?.created_at}
        showNoDepartment={showNoDepartment}
        discardDialogProps={actions.discardDialogProps}
        navDiscardDialogProps={actions.navDiscardDialogProps}
        actionDialog={actions.actionDialog}
        setActionDialog={actions.setActionDialog}
        isPending={actions.isPending}
        onActionConfirm={actions.handleActionConfirm}
      />
    </div>
  );
}
