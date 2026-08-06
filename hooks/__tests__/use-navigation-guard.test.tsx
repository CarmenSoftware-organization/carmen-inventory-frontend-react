import { describe, it, expect, beforeEach } from "vitest";
import { useState } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router";
import { useNavigationGuard } from "../use-navigation-guard";

function ListPage() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate("/detail")}>
      open detail
    </button>
  );
}

/** Mirrors a form page: dirty guard + its own toolbar Back that already asked. */
function DetailPage() {
  const guard = useNavigationGuard(true);
  return (
    <>
      <p>detail page</p>
      <button type="button" onClick={() => guard.back()}>
        toolbar back
      </button>
      {guard.isOpen && <p>guard dialog</p>}
    </>
  );
}

function renderApp() {
  return render(
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ListPage />} />
        <Route path="/detail" element={<DetailPage />} />
      </Routes>
    </BrowserRouter>,
  );
}

describe("useNavigationGuard — programmatic back", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("leaves the page without re-prompting when the caller already confirmed", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "open detail" }));
    expect(await screen.findByText("detail page")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "toolbar back" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "open detail" })).toBeInTheDocument(),
    );
    expect(screen.queryByText("guard dialog")).not.toBeInTheDocument();
  });
});

/**
 * ฟอร์มที่กด submit แล้ว validation ไม่ผ่าน — guard ถูกปิดแล้วเปิดกลับทันที
 * ในจังหวะเดียวกัน (setIsSubmitting(true) → handleSubmit ล้มเหลว → false)
 */
function SubmitFailPage() {
  const [submitting, setSubmitting] = useState(false);
  const guard = useNavigationGuard(!submitting);
  return (
    <>
      <p>detail page</p>
      <button
        type="button"
        onClick={async () => {
          setSubmitting(true);
          // handleSubmit ของ RHF เป็น async — callback ตอน validation ไม่ผ่าน
          // จึงวิ่งหลัง React commit รอบที่ปิด guard ไปแล้ว (teardown ทำงานจริง)
          await Promise.resolve();
          setSubmitting(false);
        }}
      >
        save draft
      </button>
      {guard.isOpen && <p>guard dialog</p>}
    </>
  );
}

describe("useNavigationGuard — teardown แล้ว arm ใหม่ทันที", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("ไม่เปิด dialog เมื่อ guard ปิดแล้วเปิดกลับเอง (validation ไม่ผ่าน)", async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ListPage />} />
          <Route path="/detail" element={<SubmitFailPage />} />
        </Routes>
      </BrowserRouter>,
    );

    await user.click(screen.getByRole("button", { name: "open detail" }));
    await screen.findByText("detail page");

    await user.click(screen.getByRole("button", { name: "save draft" }));

    // popstate ตัวจริงต้อง dispatch เอง: jsdom คิว history.back() ไว้เป็น task
    // แล้ว "ทิ้ง" ทันทีที่มี pushState มาคั่น (guard arm ใหม่) — เบราว์เซอร์จริง
    // ส่ง event นั้นมาตามปกติ ซึ่งคือต้นเหตุของบั๊ก ตรงนี้จึงจำลอง event ที่
    // เบราว์เซอร์ส่งมาแทน เพื่อทดสอบว่า handler รอบใหม่ข้ามมันได้จริง
    await act(async () => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
    });

    expect(screen.queryByText("guard dialog")).toBeNull();
    expect(screen.getByText("detail page")).toBeTruthy();
  });
});
