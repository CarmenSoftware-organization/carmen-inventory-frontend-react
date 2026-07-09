import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useForm, useFieldArray } from "react-hook-form";
import { getDefaultValues, PR_ITEM, type PrFormValues } from "./pr-form-schema";

// Regression: ตอน add PR การ auto-populate hidden defaults (pr_date /
// requestor_id / department_id) ต้องไม่ทำให้ฟอร์มค้าง dirty ทั้งที่ยังไม่ได้
// กรอกค่าจริง — ไม่งั้นกด back/navigate จะติด discard dialog.
//
// isDirty ของ react-hook-form = !deepEqual(getValues(), defaultValues) ทั้งฟอร์ม
// setValue (shouldDirty:false) จะ "เลื่อน" การ recompute isDirty ออกไป ทำให้
// ดูเหมือนสะอาดตอนแรก แต่พอมี action ใด trigger การ recompute (เพิ่ม/ลบ item ฯลฯ)
// ค่าที่ setValue ไว้ต่างจาก default จะทำให้ isDirty ค้างเป็น true.
// วิธีแก้: reset baseline ให้ค่า auto กลายเป็น default (keepDirtyValues คงค่า
// ที่ผู้ใช้แก้).

const AUTO = { pr_date: "2026-07-09", requestor_id: "u1", department_id: "d1" };

const renderPrForm = () =>
  renderHook(() => {
    const defaults = getDefaultValues();
    const form = useForm<PrFormValues>({
      defaultValues: defaults,
      mode: "onChange",
    });
    const fa = useFieldArray({ control: form.control, name: "items" });
    // อ่าน isDirty ทุก render เหมือน component จริง (pr-form.tsx) เพื่อให้ RHF
    // subscribe proxy → recompute isDirty เมื่อมี field-array op (ไม่งั้น proxy
    // จะคืนค่า stale ทำให้ test ไม่ตรงพฤติกรรมจริง)
    const isDirty = form.formState.isDirty;
    return { form, fa, defaults, isDirty };
  });

describe("PR add form — dirty state after auto-populating hidden defaults", () => {
  it("BUG: setValue auto-populate → ฟอร์มค้าง dirty หลังเพิ่ม/ลบ item ทั้งที่ว่าง", () => {
    const { result } = renderPrForm();

    act(() => {
      result.current.form.setValue("pr_date", AUTO.pr_date);
      result.current.form.setValue("requestor_id", AUTO.requestor_id);
      result.current.form.setValue("department_id", AUTO.department_id);
    });

    // เพิ่มแล้วลบ item (กลับมาว่างเหมือนเดิม) → ควร clean แต่ setValue ทำให้ค้าง dirty
    act(() =>
      result.current.fa.prepend({ ...PR_ITEM } as never, { shouldFocus: false }),
    );
    act(() => result.current.fa.remove(0));

    // นี่คือ bug ที่รายงาน: ยังไม่ได้กรอกค่าจริง แต่ isDirty=true → back ติด discard
    expect(result.current.form.formState.isDirty).toBe(true);
  });

  it("FIX: reset baseline → ยัง clean หลังเพิ่ม/ลบ item และยังจับ edit จริงเป็น dirty", () => {
    const { result } = renderPrForm();

    // fix: reset baseline (แทน setValue) ให้ค่า auto เป็น default
    act(() =>
      result.current.form.reset(
        { ...result.current.defaults, ...AUTO },
        { keepDirtyValues: true },
      ),
    );

    act(() =>
      result.current.fa.prepend({ ...PR_ITEM } as never, { shouldFocus: false }),
    );
    act(() => result.current.fa.remove(0));

    // เพิ่ม/ลบ item ว่างแล้วกลับมา clean → back/navigate ผ่านได้ ไม่เด้ง discard
    expect(result.current.form.formState.isDirty).toBe(false);

    // ผู้ใช้เลือก workflow จริง → ต้อง dirty (discard ควรเด้ง)
    act(() =>
      result.current.form.setValue("workflow_id", "wf1", {
        shouldDirty: true,
        shouldValidate: true,
      }),
    );
    expect(result.current.form.formState.isDirty).toBe(true);
  });

  // จำลอง effect จริงใน pr-form.tsx: reset baseline โดยยกค่า auto ที่ตั้งไว้แล้ว
  // มาต่อ (patch.X ?? values.X)
  const autoPopulateReset = (
    result: ReturnType<typeof renderPrForm>["result"],
    ready: { requestor?: boolean },
  ) => {
    const values = result.current.form.getValues();
    const patch: Partial<PrFormValues> = {};
    if (!values.pr_date) patch.pr_date = AUTO.pr_date;
    if (ready.requestor) {
      if (!values.requestor_id) patch.requestor_id = AUTO.requestor_id;
      if (!values.department_id) patch.department_id = AUTO.department_id;
    }
    if (Object.keys(patch).length === 0) return;
    result.current.form.reset(
      {
        ...result.current.defaults,
        pr_date: patch.pr_date ?? values.pr_date,
        requestor_id: patch.requestor_id ?? values.requestor_id,
        department_id: patch.department_id ?? values.department_id,
      },
      { keepDirtyValues: true },
    );
  };

  it("FIX 2-phase: profile โหลดทีหลัง → reset รอบสองต้องไม่ wipe pr_date และไม่ dirty", () => {
    const { result } = renderPrForm();

    // เฟส 1: mount ยังไม่มี profile → ตั้งแค่ pr_date
    act(() => autoPopulateReset(result, { requestor: false }));
    expect(result.current.form.getValues("pr_date")).toBe(AUTO.pr_date);

    // เฟส 2: profile มาแล้ว → ตั้ง requestor/department (ต้องคง pr_date ไว้)
    act(() => autoPopulateReset(result, { requestor: true }));

    expect(result.current.form.getValues("pr_date")).toBe(AUTO.pr_date);
    expect(result.current.form.getValues("requestor_id")).toBe(AUTO.requestor_id);
    expect(result.current.form.formState.isDirty).toBe(false);
  });
});
