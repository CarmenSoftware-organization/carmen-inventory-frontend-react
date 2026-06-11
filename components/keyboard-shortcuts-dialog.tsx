
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Shortcut {
  keys: string[];
  description: string;
}

const SHORTCUTS: Shortcut[] = [
  { keys: ["?"], description: "Show this dialog" },
  { keys: ["/"], description: "Focus search input on current page" },
  { keys: ["Esc"], description: "Close dialog / clear focus" },
  { keys: ["g", "d"], description: "Go to Dashboard" },
  { keys: ["g", "p"], description: "Go to Purchase Request" },
  { keys: ["g", "o"], description: "Go to Purchase Order" },
  { keys: ["g", "r"], description: "Go to GRN" },
  { keys: ["n"], description: "Create new (on list pages)" },
];

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="bg-muted inline-flex h-5 min-w-5 items-center justify-center rounded border px-1.5 text-[0.6875rem] font-medium">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing in input/textarea/contenteditable
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === "/") {
        // Focus first search input on page
        const input = document.querySelector<HTMLInputElement>(
          'input[type="search"], input[placeholder*="earch"]',
        );
        if (input) {
          e.preventDefault();
          input.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">Keyboard Shortcuts</DialogTitle>
          <DialogDescription className="text-xs">
            Press <Key>?</Key> anytime to toggle this dialog.
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-2">
          {SHORTCUTS.map((sc) => (
            <li
              key={sc.description}
              className="flex items-center justify-between gap-3 text-xs"
            >
              <span className="text-muted-foreground">{sc.description}</span>
              <span className="flex items-center gap-1">
                {sc.keys.map((k, i) => (
                  <span
                    key={`${sc.description}-${i}`}
                    className="flex items-center gap-1"
                  >
                    <Key>{k}</Key>
                    {i < sc.keys.length - 1 && (
                      <span className="text-muted-foreground">then</span>
                    )}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
