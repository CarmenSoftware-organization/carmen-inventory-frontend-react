import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  InputSuffixField,
  InputSuffixInput,
} from "@/components/ui/input/input-suffix";

/**
 * error โผล่แล้วต้องไม่เด้งคนที่กำลังพิมพ์ออกจากช่อง
 *
 * ของเดิม `InputSuffixField` สลับทั้งก้อนระหว่าง `<div>` เปล่ากับ tooltip ที่ครอบ
 * ตาม `errorMessage` — React unmount/mount ใหม่ `<input>` เลยเป็นคนละ node
 * โฟกัสหลุดกลางพิมพ์พอดีจังหวะที่คนกำลังแก้ให้ถูก (ช่องยอดลดหนี้ของ CN,
 * จำนวนคืน, requested/approved ของ PR ใช้ prop นี้กันหมด)
 */
function Harness() {
  const [value, setValue] = useState("");
  const over = Number(value) > 500;
  return (
    <TooltipProvider>
      <InputSuffixField errorMessage={over ? "เกินเพดาน" : undefined}>
        <InputSuffixInput
          aria-label="amount"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </InputSuffixField>
    </TooltipProvider>
  );
}

describe("InputSuffixField", () => {
  it("ยังโฟกัสอยู่ที่ช่องเดิมเมื่อ errorMessage โผล่ระหว่างพิมพ์", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByLabelText("amount"));

    await user.keyboard("501");

    expect(screen.getByLabelText("amount")).toHaveValue("501");
    expect(screen.getByLabelText("amount")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(document.activeElement).toBe(screen.getByLabelText("amount"));
  });

  it("พิมพ์ต่อได้หลัง error โผล่ และ error หายเมื่อค่ากลับมาถูก", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByLabelText("amount"));

    await user.keyboard("501");
    await user.keyboard("{Backspace}{Backspace}"); // 501 → 5

    expect(screen.getByLabelText("amount")).toHaveValue("5");
    expect(document.activeElement).toBe(screen.getByLabelText("amount"));
  });
});
