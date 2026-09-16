import { useEffect } from "react";

export function useUnsavedChanges(isDirty: boolean, message?: string) {
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Most browsers ignore the custom message but still prompt
      if (message) e.returnValue = message;
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty, message]);
}
