import { forwardRef, useImperativeHandle, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";

export interface SignaturePadHandle {
  /** True when no stroke has been drawn */
  isEmpty: () => boolean;
  /** Erase all strokes */
  clear: () => void;
  /** Export the drawing as a transparent-background PNG data URL, or null if empty */
  toPngDataUrl: () => string | null;
}

interface SignaturePadProps {
  readonly disabled?: boolean;
  /** Called when the user starts drawing — use to flip a parent "dirty" flag */
  readonly onBeginStroke?: () => void;
}

/**
 * Thin wrapper over react-signature-canvas. signature_pad draws on a
 * transparent canvas with a black pen, so getCanvas().toDataURL("image/png")
 * is already a transparent PNG — no extra processing needed.
 */
export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  function SignaturePad({ disabled = false, onBeginStroke }, ref) {
    const padRef = useRef<SignatureCanvas | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        isEmpty: () => padRef.current?.isEmpty() ?? true,
        clear: () => padRef.current?.clear(),
        toPngDataUrl: () => {
          const pad = padRef.current;
          if (!pad || pad.isEmpty()) return null;
          return pad.getCanvas().toDataURL("image/png");
        },
      }),
      [],
    );

    return (
      <div className="bg-muted/30 relative w-full overflow-hidden rounded-lg border">
        <SignatureCanvas
          ref={padRef}
          penColor="black"
          onBegin={onBeginStroke}
          canvasProps={{
            className: "w-full h-40 touch-none cursor-crosshair",
            "aria-label": "signature drawing area",
          }}
          clearOnResize={false}
        />
        {disabled && (
          <div className="absolute inset-0 cursor-not-allowed bg-transparent" />
        )}
      </div>
    );
  },
);
