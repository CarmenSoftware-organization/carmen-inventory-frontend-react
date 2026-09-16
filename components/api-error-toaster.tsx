import { useEffect } from "react";
import { useErrorToast } from "@/hooks/use-error-toast";
import { ApiError, ERROR_CODES } from "@/lib/api-error";
import { setApiErrorHandler } from "@/lib/api-error-handler";

export function ApiErrorToaster() {
  const errorToast = useErrorToast();

  useEffect(() => {
    setApiErrorHandler((error) => {
      // 401/403 มี UI ของตัวเองอยู่แล้ว (redirect ไป login / PermissionDeniedDialog)
      // — toast ซ้ำจะกลายเป็นเสียงรบกวนที่ user ทำอะไรกับมันไม่ได้
      if (error instanceof ApiError && isHandledElsewhere(error.code)) return;
      errorToast(error);
    });
    return () => setApiErrorHandler(null);
  }, [errorToast]);

  return null;
}

const isHandledElsewhere = (code: string) =>
  code === ERROR_CODES.UNAUTHORIZED ||
  code === ERROR_CODES.SESSION_EXPIRED ||
  code === ERROR_CODES.FORBIDDEN;
