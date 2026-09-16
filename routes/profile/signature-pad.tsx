import { forwardRef, useImperativeHandle, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";

export interface SignaturePadHandle {
  isEmpty: () => boolean;
  clear: () => void;
  toPngDataUrl: () => string | null;
}

interface SignaturePadProps {
  readonly disabled?: boolean;
  readonly onBeginStroke?: () => void;
}

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
