import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntlProvider } from "use-intl";

// react-signature-canvas relies on a real canvas 2D context, which jsdom does
// not provide. Stub it so the dialog/SignaturePad wiring is testable; the draw
// path is verified manually (jsdom can't draw anyway).
vi.mock("react-signature-canvas", async () => {
  const React = await import("react");
  class FakeSignatureCanvas extends React.Component<{
    canvasProps?: Record<string, unknown>;
  }> {
    isEmpty() {
      return true;
    }
    clear() {}
    getCanvas() {
      return document.createElement("canvas");
    }
    render() {
      return React.createElement("canvas", this.props.canvasProps);
    }
  }
  return { default: FakeSignatureCanvas };
});

import { SignatureDialog } from "../signature-dialog";
import en from "@/messages/en.json";

function renderDialog(
  props?: Partial<React.ComponentProps<typeof SignatureDialog>>,
) {
  const onConfirm = vi.fn();
  const onOpenChange = vi.fn();
  // pointerEventsCheck disabled: the Radix Dialog overlay sets the body to
  // pointer-events:none, which userEvent would otherwise reject.
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  render(
    <IntlProvider locale="en" messages={en}>
      <SignatureDialog
        open
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
        {...props}
      />
    </IntlProvider>,
  );
  return { onConfirm, onOpenChange, user };
}

describe("SignatureDialog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects an oversized upload file and does not confirm", async () => {
    const { onConfirm, user } = renderDialog();
    await user.click(screen.getByRole("tab", { name: /upload/i }));
    const input = screen.getByTestId(
      "signature-file-input",
    ) as HTMLInputElement;
    const big = new File([new Uint8Array(3 * 1024 * 1024)], "big.png", {
      type: "image/png",
    });
    await user.upload(input, big);
    await waitFor(() =>
      expect(screen.getByTestId("signature-upload-error")).toBeInTheDocument(),
    );
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("confirms with a File built from a valid upload", async () => {
    const { onConfirm, user } = renderDialog();
    await user.click(screen.getByRole("tab", { name: /upload/i }));
    const input = screen.getByTestId(
      "signature-file-input",
    ) as HTMLInputElement;
    const good = new File(["x"], "sig.png", { type: "image/png" });
    await user.upload(input, good);
    const saveBtn = screen.getByRole("button", { name: /save/i });
    await waitFor(() => expect(saveBtn).toBeEnabled());
    await user.click(saveBtn);
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(onConfirm.mock.calls[0][0]).toBeInstanceOf(File);
  });
});
