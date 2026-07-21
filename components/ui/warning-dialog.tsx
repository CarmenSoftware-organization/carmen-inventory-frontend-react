
import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface WarningDialogProps {
  readonly open: boolean;
  readonly title?: string;
  readonly description: string;
  readonly confirmLabel?: string;
  readonly onConfirm: () => void;
}

export function WarningDialog({
  open,
  title = "Warning",
  description,
  confirmLabel = "Go Back",
  onConfirm,
}: WarningDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <div className="text-warning flex items-center gap-2">
            <AlertTriangle className="size-5" aria-hidden="true" />
            <AlertDialogTitle className="text-warning">
              {title}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex! justify-center!">
          <AlertDialogAction
            // text-black to match the warning Button variant — see offline-banner
            className="bg-warning hover:bg-warning/90 font-semibold text-black"
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
