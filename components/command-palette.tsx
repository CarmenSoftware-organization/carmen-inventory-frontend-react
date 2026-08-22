import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslations } from "use-intl";
import { History } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useProfile } from "@/hooks/use-profile";
import { useRecentDocuments } from "@/hooks/use-recent-documents";
import {
  useVisibleModules,
  type ModuleWithAccess,
} from "@/hooks/use-visible-modules";

/** หัวกลุ่มเป็น micro-eyebrow ตาม ladder ของ DESIGN.md — ใช้ร่วมทุกกลุ่มในไฟล์นี้ */
const GROUP_HEADING_CLASS =
  "**:[[cmdk-group-heading]]:text-micro-eyebrow **:[[cmdk-group-heading]]:tracking-[0.04em] **:[[cmdk-group-heading]]:uppercase";

/** leaf ทั้งหมดใต้ tree (module ที่ไม่มีลูกก็คือ leaf ของตัวเอง เช่น dashboard) */
function collectLeaves(mods: ModuleWithAccess[]): ModuleWithAccess[] {
  return mods.flatMap((m) =>
    m.subModules?.length ? collectLeaves(m.subModules) : [m],
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="bg-muted text-micro-legal inline-flex h-4.5 min-w-4.5 items-center justify-center rounded border px-1 font-semibold">
      {children}
    </kbd>
  );
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const t = useTranslations("modules");
  const tc = useTranslations("common");
  const modules = useVisibleModules();
  const { buCode } = useProfile();
  const recents = useRecentDocuments(buCode);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // จงใจไม่กัน input/textarea — ⌘K เป็น global convention กดได้แม้กำลังพิมพ์
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const groups = modules
    .map((mod) => ({
      mod,
      leaves: collectLeaves([mod]).filter((l) => !l.denied && !l.locked),
    }))
    .filter((g) => g.leaves.length > 0);

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      showCloseButton={false}
      // Spotlight ลอยช่วงบนจอ ไม่ใช่กลางจอ — จุดโฟกัสสายตาเวลาเรียกใช้ด้วยคีย์บอร์ด
      className="top-[22%] translate-y-0 sm:max-w-xl"
    >
      <CommandInput placeholder={tc("search")} />
      <CommandList className="max-h-80">
        <CommandEmpty>{tc("noOptions")}</CommandEmpty>
        {/* เอกสารที่เพิ่งเปิด (BU ปัจจุบัน) — บันทึกโดย DocFormHeader ตอนเข้าหน้า
            detail ดู use-recent-documents; เลขที่เอกสารค้นเจอจาก value ตรง ๆ */}
        {recents.length > 0 && (
          <CommandGroup heading={tc("recent")} className={GROUP_HEADING_CLASS}>
            {recents.map((doc) => (
              <CommandItem
                key={doc.path}
                value={`${doc.label} ${doc.path}`}
                onSelect={() => go(doc.path)}
              >
                <History aria-hidden="true" className="text-muted-foreground" />
                {doc.label}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {groups.map(({ mod, leaves }) => (
          <CommandGroup
            key={mod.path}
            heading={t(mod.name)}
            className={GROUP_HEADING_CLASS}
          >
            {leaves.map((leaf) => {
              const Icon = leaf.icon;
              return (
                <CommandItem
                  key={leaf.path}
                  // ชื่อ leaf อย่างเดียวซ้ำกันข้ามกลุ่มได้ (เช่น category) —
                  // ผูก path เข้าไปให้ value ไม่ชนกัน และให้ค้นด้วย path ได้เลย
                  value={`${t(mod.name)} ${t(leaf.name)} ${leaf.path}`}
                  onSelect={() => go(leaf.path)}
                >
                  <Icon aria-hidden="true" className="text-muted-foreground" />
                  {t(leaf.name)}
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
      <div className="text-micro-legal text-muted-foreground flex items-center gap-4 border-t px-3 py-2">
        <span className="flex items-center gap-1">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
          {tc("navigate")}
        </span>
        <span className="flex items-center gap-1">
          <Kbd>↵</Kbd>
          {tc("select")}
        </span>
        <span className="ms-auto flex items-center gap-1">
          <Kbd>esc</Kbd>
          {tc("close")}
        </span>
      </div>
    </CommandDialog>
  );
}
