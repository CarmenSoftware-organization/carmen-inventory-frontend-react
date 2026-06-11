import { CalendarDays, User, Globe, Monitor } from "lucide-react";
import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import { getLogCreatedAt, type ActivityLog } from "@/types/activity-log";

const ACTION_VARIANT: Record<string, string> = {
  login:
    "bg-[var(--status-in-progress)] text-[var(--status-in-progress-fg)] border-transparent",
  logout:
    "bg-[var(--status-draft)] text-[var(--status-draft-fg)] border-transparent",
};

/**
 * แถวแสดงข้อมูลคู่ label/value พร้อมไอคอนใน detail sheet
 * @param props - icon component, ข้อความ label และ children ที่จะแสดงเป็น value
 * @returns React element ของแถวข้อมูล
 * @example
 * <InfoRow icon={User} label="User">John</InfoRow>
 */
function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon
        className="text-muted-foreground mt-0.5 size-3.5 shrink-0"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-[0.6875rem]">{label}</p>
        <div className="text-xs">{children}</div>
      </div>
    </div>
  );
}

/**
 * บล็อกแสดงข้อมูล JSON แบบ pretty-printed ใน detail sheet
 * @param props - ออบเจกต์ data ของ JSON ที่จะแสดง (null หรือว่างจะแสดงขีด)
 * @returns React element ของบล็อก JSON
 * @example
 * <JsonBlock data={{ role: "admin" }} />
 */
function JsonBlock({ data }: { data: Record<string, unknown> | null }) {
  if (!data || Object.keys(data).length === 0)
    return <span className="text-muted-foreground">—</span>;
  return (
    <pre className="bg-muted/50 max-h-60 overflow-x-auto rounded-md border p-2.5 text-[0.625rem] leading-relaxed">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

interface UserActivityDetailSheetProps {
  log: ActivityLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Sheet แสดงรายละเอียดของกิจกรรมผู้ใช้ (User Activity) เมื่อคลิกเลือกรายการ
 * @param props - log ที่เลือก, สถานะ open และ callback onOpenChange
 * @returns React element ของ detail sheet
 * @example
 * <UserActivityDetailSheet log={selected} open={!!selected} onOpenChange={setOpen} />
 */
export function UserActivityDetailSheet({
  log,
  open,
  onOpenChange,
}: UserActivityDetailSheetProps) {
  const t = useTranslations("systemAdmin.userActivity");
  const { dateFormat } = useProfile();

  const actionClass = log
    ? (ACTION_VARIANT[log.action?.toLowerCase()] ??
      "bg-muted text-muted-foreground")
    : "";

  const actorName = log
    ? [log.actor_firstname, log.actor_middlename, log.actor_lastname]
        .filter(Boolean)
        .join(" ")
    : "";

  const datetimeFormat = dateFormat.includes("HH")
    ? dateFormat
    : `${dateFormat} HH:mm:ss`;

  const hasMetaData = !!log?.meta_data && Object.keys(log.meta_data).length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-hidden sm:max-w-md">
        {log && (
          <>
            <SheetHeader className="animate-fade-in-left space-y-1">
              <SheetTitle className="text-sm">
                <Badge size="sm" className={`${actionClass} text-xs`}>
                  {log.action}
                </Badge>
              </SheetTitle>
              <SheetDescription className="text-xs">
                {log.description || t("desc")}
              </SheetDescription>
            </SheetHeader>

            <Separator className="animate-fade-in-left mx-4 [animation-delay:75ms]" />

            <ScrollArea className="animate-fade-in-left min-h-0 flex-1 px-4 pb-4 [animation-delay:150ms]">
              <div className="space-y-4">
                <section className="space-y-0.5">
                  <h3 className="text-muted-foreground mb-1 text-xs font-semibold tracking-wider uppercase">
                    {t("generalInfo")}
                  </h3>

                  <InfoRow icon={CalendarDays} label={t("timestamp")}>
                    {formatDate(getLogCreatedAt(log), datetimeFormat)}
                  </InfoRow>

                  <InfoRow icon={User} label={t("user")}>
                    <div>
                      {actorName && <p className="font-medium">{actorName}</p>}
                      {log.actor_username && (
                        <p className="text-muted-foreground">
                          {log.actor_username}
                        </p>
                      )}
                      {!actorName && !log.actor_username && "—"}
                    </div>
                  </InfoRow>

                  <InfoRow icon={Globe} label={t("ipAddress")}>
                    <span>{log.ip_address || "—"}</span>
                  </InfoRow>

                  {log.user_agent && (
                    <InfoRow icon={Monitor} label={t("userAgent")}>
                      <span className="text-muted-foreground text-[0.6875rem] break-all">
                        {log.user_agent}
                      </span>
                    </InfoRow>
                  )}
                </section>

                {/* Metadata */}
                {hasMetaData && (
                  <section className="space-y-2">
                    <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                      {t("metadata")}
                    </h3>
                    <JsonBlock data={log.meta_data} />
                  </section>
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
