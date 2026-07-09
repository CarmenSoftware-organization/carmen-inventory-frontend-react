import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDuplicateProductConfirm } from "../use-duplicate-product-confirm";

describe("useDuplicateProductConfirm", () => {
  it("starts closed", () => {
    const { result } = renderHook(() => useDuplicateProductConfirm());
    expect(result.current.dialogProps.open).toBe(false);
    expect(result.current.dialogProps.productName).toBeUndefined();
  });

  it("opens the dialog and stores the product name on confirm()", () => {
    const { result } = renderHook(() => useDuplicateProductConfirm());
    const action = vi.fn();

    act(() => result.current.confirm(action, "Mango"));

    expect(result.current.dialogProps.open).toBe(true);
    expect(result.current.dialogProps.productName).toBe("Mango");
    expect(action).not.toHaveBeenCalled();
  });

  it("runs the action and closes when confirmed", () => {
    const { result } = renderHook(() => useDuplicateProductConfirm());
    const action = vi.fn();

    act(() => result.current.confirm(action, "Mango"));
    act(() => result.current.dialogProps.onConfirm());

    expect(action).toHaveBeenCalledTimes(1);
    expect(result.current.dialogProps.open).toBe(false);
  });

  it("does NOT run the action when cancelled (revert)", () => {
    const { result } = renderHook(() => useDuplicateProductConfirm());
    const action = vi.fn();

    act(() => result.current.confirm(action, "Mango"));
    act(() => result.current.dialogProps.onCancel());

    expect(action).not.toHaveBeenCalled();
    expect(result.current.dialogProps.open).toBe(false);
  });

  it("does NOT run the action when closed via onOpenChange(false)", () => {
    const { result } = renderHook(() => useDuplicateProductConfirm());
    const action = vi.fn();

    act(() => result.current.confirm(action, "Mango"));
    act(() => result.current.dialogProps.onOpenChange(false));

    expect(action).not.toHaveBeenCalled();
    expect(result.current.dialogProps.open).toBe(false);
  });
});
