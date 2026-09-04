import { useState } from "react";
import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type Resolver,
  type UseFormReturn,
} from "react-hook-form";
import { useNavigate } from "react-router";
import { useDiscardConfirm } from "@/hooks/use-discard-confirm";
import { useNavigationGuard } from "@/hooks/use-navigation-guard";
import type { FormMode } from "@/types/form";

interface UseEntityFormOptions<TValues extends FieldValues> {
  /** entity ที่โหลดมา — ไม่มี = โหมด add */
  entity: unknown;
  resolver: Resolver<TValues>;
  defaultValues: DefaultValues<TValues>;
  /** path ของหน้ารายการ — ปุ่ม Back กับ Cancel ตอน add เด้งไปที่นี่ */
  listPath: string;
  /** mutation ที่กำลังทำงานอยู่ (create/update) */
  isPending: boolean;
  /**
   * dirty ที่ไม่ได้มาจาก RHF — รูปที่เลือกไว้แต่ยังไม่อัปโหลด, gallery, transfer
   * ปล่อยว่างได้ถ้าฟอร์มไม่มี state นอก RHF
   */
  extraDirty?: boolean;
  /** เรียกตอนกด Cancel ในโหมด edit — รีเซ็ต state นอก RHF กลับค่าเดิม */
  onResetExtra?: () => void;
}

/**
 * โครงกลางของฟอร์ม entity — mode, dirty guard สองชั้น, และปุ่ม Back/Edit/Cancel
 *
 * **hook นี้จงใจไม่ตัดสินใจแทนเรื่อง payload กับปลายทางหลัง save** เพราะ 13 ฟอร์ม
 * ที่มีอยู่ตัดสินใจไม่เหมือนกันจริง ๆ (6 ใบเซฟแล้วอยู่หน้าเดิม · 5 ใบเด้งกลับ list ·
 * 2 ใบ create แล้ว replace ไปหน้าใบใหม่) และ payload ก็คนละรูป — role คำนวณ diff
 * ของ permission จากค่าเดิม ยัดเข้า config ไม่ได้เลย
 * ดู characterization test ของแต่ละใบ (`*-form.characterization.test.tsx`)
 * ที่พินพฤติกรรมพวกนั้นไว้ก่อนยุบ
 *
 * สิ่งที่ hook นี้รับผิดชอบคือ **ส่วนที่ทุกใบเหมือนกันจริง** และเป็นส่วนที่เคยลืม
 * ทีละใบมาแล้ว (13 ฟอร์มลืม `useNavigationGuard` — ดู dfbbfc9)
 *
 * @example
 * const f = useEntityForm({ entity: cuisine, resolver, defaultValues, listPath, isPending });
 * const onSubmit = (values) => {
 *   if (f.isEdit && cuisine) {
 *     f.submit(updateCuisine, { id: cuisine.id, ...payload }, () => f.backToList());
 *   } else {
 *     f.submit(createCuisine, payload, () => f.backToList());
 *   }
 * };
 */
export function useEntityForm<TValues extends FieldValues>({
  entity,
  resolver,
  defaultValues,
  listPath,
  isPending,
  extraDirty = false,
  onResetExtra,
}: UseEntityFormOptions<TValues>) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<FormMode>(entity ? "view" : "add");
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isAdd = mode === "add";

  const form = useForm<TValues>({ resolver, defaultValues });

  // guard สองตัวต้องอ่าน dirty ค่าเดียวกัน ไม่งั้นปุ่ม Back ถามแต่เมนู sidebar เงียบ
  const isFormDirty = form.formState.isDirty || extraDirty;

  const discard = useDiscardConfirm({ isDirty: isFormDirty, isPending });

  // ระหว่าง submit ตอน create ปิด guard — ไม่งั้น sentinel ที่ guard ดันไว้ที่ /new
  // ค้างอยู่ใน history stack หลัง navigate ออกไป กด back แล้วเจอ /new ซ้ำ
  const [isSubmitting, setIsSubmitting] = useState(false);

  // useDiscardConfirm ดักได้แค่ปุ่มในฟอร์มเอง (Cancel/Back) — ลิงก์ข้างนอกอย่าง
  // เมนู sidebar ต้องใช้ตัวนี้ดัก ไม่งั้นกดแล้วหลุดออกไปพร้อมข้อมูลที่ยังไม่ได้เซฟ
  const navGuard = useNavigationGuard(
    (isAdd || isEdit) && isFormDirty && !isSubmitting,
  );

  const backToList = () => navigate(listPath);

  // Back = กลับหน้า list เสมอ ไม่ใช่ history back — จากหน้า detail ผู้ใช้เดินไปใบอื่น
  // ได้ (ปุ่ม ↑↓ ของ DocSequenceNav) history จึงเป็นเส้นทางที่เดินผ่านมา ไม่ใช่ที่ที่
  // อยากกลับไป กดครั้งเดียวต้องถึง list ไม่ใช่ถอยทีละใบ
  const handleBack = () => {
    if (isEdit || isAdd) {
      discard.confirm(backToList);
    } else {
      backToList();
    }
  };

  const handleEdit = () => setMode("edit");

  const handleCancel = () => {
    discard.confirm(() => {
      if (isEdit && entity) {
        form.reset(defaultValues);
        onResetExtra?.();
        setMode("view");
      } else {
        backToList();
      }
    });
  };

  /**
   * ยิง mutation แล้วจัดการ guard ให้เอง — ปิดก่อนยิง เปิดกลับเมื่อ error
   *
   * ต้องเปิดกลับทุกทางที่ยิงไม่ผ่าน ไม่งั้น guard ตายค้าง = ฟอร์มที่ยัง dirty
   * ออกได้โดยไม่ถาม ซึ่งแย่กว่าไม่มี guard เลย
   */
  const submit = <TPayload>(
    mutation: {
      mutate: (
        payload: TPayload,
        opts?: {
          onSuccess?: (res: unknown) => void;
          onError?: () => void;
        },
      ) => void;
    },
    payload: TPayload,
    onSuccess: (res: unknown) => void,
  ) => {
    setIsSubmitting(true);
    mutation.mutate(payload, {
      onError: () => setIsSubmitting(false),
      onSuccess,
    });
  };

  return {
    form: form as UseFormReturn<TValues>,
    mode,
    setMode,
    isView,
    isEdit,
    isAdd,
    isDisabled: isView || isPending,
    isFormDirty,
    isSubmitting,
    setIsSubmitting,
    discard,
    navGuard,
    backToList,
    handleBack,
    handleEdit,
    handleCancel,
    submit,
  };
}
