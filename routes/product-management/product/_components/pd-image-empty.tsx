
import { useId, useRef, useState } from "react";
import { ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
  formatBytes,
} from "./pd-image-utils";

interface Props {
  readonly onAddFiles: (files: FileList | File[]) => void;
}

export function EmptyImage({ onAddFiles }: Props) {
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      onAddFiles(e.dataTransfer.files);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setIsDragging(false);
        }}
        onDrop={handleDrop}
        aria-label="Upload images"
        className={cn(
          "text-muted-foreground hover:text-foreground hover:border-primary hover:bg-primary/5 ring-offset-background focus-visible:ring-ring flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
          isDragging && "border-primary bg-primary/10 text-primary",
        )}
      >
        <ImageIcon className="size-10 opacity-70" aria-hidden="true" />
        <div className="space-y-0.5 text-center">
          <p className="text-sm font-medium">
            {isDragging ? "Drop to upload" : "Add product images"}
          </p>
          <p className="text-[0.6875rem] opacity-80">
            Drag &amp; drop or click to browse
          </p>
          <p className="text-[0.625rem] opacity-60">
            {ALLOWED_EXTENSIONS.join(", ").toUpperCase()} · max{" "}
            {formatBytes(MAX_FILE_SIZE)}
          </p>
        </div>
      </button>
      <Input
        ref={fileInputRef}
        id={fileInputId}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onAddFiles(e.target.files);
            e.target.value = "";
          }
        }}
      />
    </>
  );
}
