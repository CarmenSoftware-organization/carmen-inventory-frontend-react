
import { Plus, RefreshCw, Sparkles, Wrench } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CHANGELOG, type ChangeItem, type VersionEntry } from "@/lib/changelog";

interface WhatsNewDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

const SECTIONS = [
  { key: "added", label: "Added", Icon: Plus },
  { key: "fixed", label: "Fixed", Icon: Wrench },
  { key: "changed", label: "Changed", Icon: RefreshCw },
] as const;

function ChangeList({ items }: { readonly items: readonly ChangeItem[] }) {
  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <li key={item.hash} className="flex items-start gap-1.5 text-xs leading-snug">
          {item.scope && (
            <span className="bg-muted text-muted-foreground shrink-0 rounded px-1 py-0.5 text-[0.625rem] font-medium">
              {item.scope}
            </span>
          )}
          <span>{item.summary}</span>
        </li>
      ))}
    </ul>
  );
}

function VersionBlock({ entry }: { readonly entry: VersionEntry }) {
  const sections = SECTIONS.filter(({ key }) => entry.changes[key].length > 0);
  return (
    <section className="space-y-2">
      <div className="flex items-baseline gap-2">
        <h3 className="text-sm font-semibold">v{entry.version}</h3>
        <span className="text-muted-foreground text-[0.6875rem]">{entry.date}</span>
      </div>
      {sections.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          {entry.note === "init" ? "Initial release." : "No notable changes."}
        </p>
      ) : (
        sections.map(({ key, label, Icon }) => (
          <div key={key} className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <Icon aria-hidden="true" className="h-3.5 w-3.5" />
              <span>{label}</span>
            </div>
            <ChangeList items={entry.changes[key]} />
          </div>
        ))
      )}
    </section>
  );
}

/**
 * Dialog แสดง "What's New" / changelog ให้ผู้ใช้
 *
 * Render ทุก version จาก `changelog.json` (ล่าสุดอยู่บนสุด) แต่ละ version
 * จัดกลุ่มเป็น Added / Fixed / Changed พร้อม icon และ scope chip โดย
 * **ไม่แสดง** git hash / author / PR เพื่อให้อ่านง่ายสำหรับผู้ใช้ทั่วไป
 * เป็น controlled component — ตัวเรียกใช้คุม `open` / `onOpenChange`
 *
 * @param props - `open` สถานะเปิด, `onOpenChange` callback เมื่อสถานะเปลี่ยน
 * @returns JSX element ของ dialog
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 * <WhatsNewDialog open={open} onOpenChange={setOpen} />
 * ```
 */
export function WhatsNewDialog({ open, onOpenChange }: WhatsNewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-3 p-4 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5 text-sm">
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            What&apos;s New
          </DialogTitle>
          <DialogDescription className="text-xs">
            Recent updates to Carmen Inventory.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          {CHANGELOG.versions.map((entry) => (
            <VersionBlock key={entry.build} entry={entry} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
