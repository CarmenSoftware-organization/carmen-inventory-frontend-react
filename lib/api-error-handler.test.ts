import { describe, it, expect, vi, afterEach } from "vitest";
import {
  reportApiError,
  setApiErrorHandler,
  skipsGlobalErrorToast,
} from "./api-error-handler";

afterEach(() => setApiErrorHandler(null));

describe("reportApiError", () => {
  it("forwards the error to the installed handler", () => {
    const handler = vi.fn();
    setApiErrorHandler(handler);
    const err = new Error("boom");

    reportApiError(err);

    expect(handler).toHaveBeenCalledExactlyOnceWith(err);
  });

  // The QueryClient is a module-level singleton, so a mutation can fail before
  // <ApiErrorToaster /> mounts (or after it unmounts). Swallowing beats throwing
  // a second error out of a mutation's error path.
  it("is a no-op when nothing is installed", () => {
    expect(() => reportApiError(new Error("boom"))).not.toThrow();
  });

  it("stops forwarding once the handler is removed", () => {
    const handler = vi.fn();
    setApiErrorHandler(handler);
    setApiErrorHandler(null);

    reportApiError(new Error("boom"));

    expect(handler).not.toHaveBeenCalled();
  });
});

describe("skipsGlobalErrorToast", () => {
  it("is true only for an explicit opt-out", () => {
    expect(skipsGlobalErrorToast({ skipGlobalErrorToast: true })).toBe(true);
  });

  it.each([
    ["undefined meta", undefined],
    ["null", null],
    ["empty meta", {}],
    ["explicitly false", { skipGlobalErrorToast: false }],
    ["a truthy non-boolean", { skipGlobalErrorToast: "yes" }],
    ["an unrelated key", { somethingElse: true }],
  ])("is false for %s", (_label, meta) => {
    expect(skipsGlobalErrorToast(meta)).toBe(false);
  });
});
