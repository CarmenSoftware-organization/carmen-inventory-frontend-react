import { useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Copy,
  LayoutDashboard,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-error";
import { getErrorId, getUserErrorMessage } from "@/lib/error-message";

/**
 * รหัสมีไว้ให้พนักงานแจ้งทีมงาน — ขึ้นเฉพาะตอนที่ฝั่งเราพัง (5xx) เท่านั้น
 *
 * ของไม่เจอ (404) หรือกรอกไม่ผ่าน (400) ไม่มีอะไรให้ทีมงานตามให้ รหัสตรงนั้น
 * เป็นแค่ตัวอักษรรกหน้าจอที่คนหน้างานไม่รู้ว่าจะเอาไปทำอะไร
 */
function serverFaultId(error: unknown): string | undefined {
  if (!(error instanceof ApiError)) return undefined;
  return (error.statusCode ?? 0) >= 500 ? getErrorId(error) : undefined;
}

const statusOf = (error: unknown): number =>
  error instanceof ApiError ? (error.statusCode ?? 0) : 0;

interface ErrorStateProps {
  /** ข้อความสำเร็จรูป — ใช้เมื่อเรารู้ดีกว่า error ว่าเกิดอะไร (เช่น "ไม่พบใบขอซื้อ") */
  readonly message?: string;
  /**
   * error ดิบ — แปลเป็นข้อความตาม locale และดึงรหัสให้เอง
   *
   * ใช้แทนการส่ง `message={error.message}` ซึ่ง `message` คือสตริงอังกฤษที่ dev
   * เขียน fallback ไว้ตอนเรียก API พนักงานหน้างานอ่านไม่รู้เรื่อง
   */
  readonly error?: unknown;
  /**
   * ข้อความเฉพาะโมดูลตอนของไม่อยู่ เช่น "ไม่พบใบขอซื้อ"
   *
   * ใช้เมื่อ error เป็น 404 หรือเมื่อ query ผ่านแต่ไม่ได้ข้อมูลกลับมา — ตรงกว่า
   * "ไม่พบข้อมูลที่ค้นหา" กลาง ๆ เพราะพนักงานรู้ทันทีว่าใบไหนที่หาย
   */
  readonly notFoundMessage?: string;
  readonly onRetry?: () => void;
  /**
   * ลิงก์กลับหน้ารายการ — ใส่เมื่อของที่เปิดอยู่ไม่มีแล้ว (ถูกลบ/ลิงก์เก่า)
   * เคสนั้นปุ่มลองใหม่ไม่ช่วยอะไร กดกี่ทีก็ไม่เจอเหมือนเดิม
   */
  readonly backTo?: string;
  readonly errorId?: string;
}

export function ErrorState({
  message,
  error,
  notFoundMessage,
  onRetry,
  backTo,
  errorId,
}: ErrorStateProps) {
  const t = useTranslations("errors");
  const [copied, setCopied] = useState(false);

  // useQuery คืน `error: null` ตอนไม่พัง — ไม่ใช่ undefined
  const hasError = error !== null && error !== undefined;
  const status = statusOf(error);
  // ของไม่อยู่ = 404 ตรง ๆ หรือ query ผ่านแต่ได้ค่าว่างกลับมา (caller ส่ง
  // notFoundMessage มาโดยไม่มี error)
  const isMissing =
    status === 404 || (!hasError && notFoundMessage !== undefined);
  // ทางตัน = ลองใหม่กี่ทีก็ได้ผลเดิม (ของหายไปแล้ว / คำขอไม่ถูกต้อง)
  // ต่างจาก 5xx หรือเน็ตหลุด ที่กดลองใหม่แล้วมีสิทธิ์ผ่าน · ไม่มี error object
  // แต่ caller อุตส่าห์ส่ง backTo มา = เขารู้อยู่แล้วว่านี่คือทางตัน
  const isDeadEnd =
    isMissing ||
    status === 400 ||
    status === 422 ||
    (!hasError && backTo !== undefined);

  const shownMessage =
    message ??
    (isMissing
      ? (notFoundMessage ?? t("notFound"))
      : hasError
        ? getUserErrorMessage(error, t)
        : undefined);
  const shownErrorId = errorId ?? serverFaultId(error);

  const handleCopy = async () => {
    if (!shownErrorId) return;
    try {
      await navigator.clipboard.writeText(shownErrorId);
      setCopied(true);
      toast.success(t("errorIdCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard อาจถูกบล็อก — ไม่ทำอะไร
    }
  };

  return (
    <div
      role="alert"
      className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center"
    >
      <div className="bg-muted text-destructive flex size-12 items-center justify-center rounded-full">
        <AlertCircle aria-hidden="true" className="size-6" />
      </div>
      <div className="space-y-1">
        <p className="text-foreground text-sm font-semibold">{t("title")}</p>
        <p className="text-muted-foreground max-w-md text-xs">
          {shownMessage ?? t("unexpected")}
        </p>
      </div>

      {shownErrorId && (
        <button
          type="button"
          onClick={handleCopy}
          aria-label={t("copyErrorId")}
          className="border-border/60 bg-muted/40 hover:bg-muted text-muted-foreground text-micro inline-flex items-center gap-1.5 rounded-md border px-2 py-1 transition-colors"
        >
          <span className="font-semibold tracking-widest uppercase">
            {t("errorId")}
          </span>
          <span>·</span>
          <span>{shownErrorId}</span>
          {copied ? (
            <Check className="text-success-ink size-3" aria-hidden="true" />
          ) : (
            <Copy className="size-3" aria-hidden="true" />
          )}
        </button>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2">
        {onRetry && !isDeadEnd && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="mr-2 size-3" aria-hidden="true" />
            {t("tryAgain")}
          </Button>
        )}

        {/* ทางตันต้องมีทางออกให้กดเสมอ ไม่งั้นพนักงานค้างอยู่หน้านี้ */}
        {isDeadEnd && backTo && (
          <Button variant="outline" size="sm" asChild>
            <Link to={backTo}>
              <ArrowLeft className="mr-2 size-3" aria-hidden="true" />
              {t("backToList")}
            </Link>
          </Button>
        )}

        {isDeadEnd && (
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard">
              <LayoutDashboard className="mr-2 size-3" aria-hidden="true" />
              {t("goToDashboard")}
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
