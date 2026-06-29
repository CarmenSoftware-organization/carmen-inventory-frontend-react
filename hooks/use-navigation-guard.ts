
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

interface UseNavigationGuardReturn {
  readonly isOpen: boolean;
  readonly confirm: () => void;
  readonly cancel: () => void;
}

/**
 * Block in-app navigation (link clicks + browser back) when `enabled` is true.
 * Caller renders its own confirm dialog using the returned isOpen / confirm / cancel.
 *
 * Notes:
 * - Browser-level events (refresh, close tab) are NOT covered — pair this with
 *   `useUnsavedChanges` for those (they get the browser-native dialog).
 * - Programmatic `navigate()` calls are NOT intercepted — only <a> clicks +
 *   browser back/forward.
 */
export function useNavigationGuard(enabled: boolean): UseNavigationGuardReturn {
  const navigate = useNavigate();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [pendingBack, setPendingBack] = useState(false);
  const skipNextPopstateRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const clickHandler = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (e.button !== 0) return;

      const target = e.target as HTMLElement | null;
      const link = target?.closest("a");
      if (!link) return;

      const href = link.getAttribute("href");
      if (!href) return;
      if (link.target === "_blank") return;
      if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        return;
      }

      let url: URL;
      try {
        url = new URL(href, window.location.origin);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;

      const linkUrl = url.pathname + url.search;
      const currentUrl = window.location.pathname + window.location.search;
      if (linkUrl === currentUrl) return;

      e.preventDefault();
      e.stopPropagation();
      setPendingHref(href);
    };

    // Pre-push a sentinel history entry at the SAME URL. The first back-press
    // pops this sentinel (URL stays unchanged → React Router won't trigger a
    // route transition), giving us a clean window to intercept.
    window.history.pushState({ __navGuard: true }, "");

    const popHandler = () => {
      if (skipNextPopstateRef.current) {
        skipNextPopstateRef.current = false;
        return;
      }
      window.history.pushState({ __navGuard: true }, "");
      setPendingBack(true);
    };

    document.addEventListener("click", clickHandler, true);
    window.addEventListener("popstate", popHandler);

    return () => {
      document.removeEventListener("click", clickHandler, true);
      window.removeEventListener("popstate", popHandler);
      // Neutralize the leaked sentinel: when the guard is torn down without a
      // back-press (e.g. the form went dirty → clean after save), the sentinel
      // is still the top entry. Pop it so it doesn't accumulate as a dead
      // same-URL entry that makes the user's next Back press appear to do
      // nothing. Only pop when the sentinel is actually on top — in the
      // click/back confirm paths the user has already navigated past it.
      if (window.history.state?.__navGuard) {
        window.history.back();
      }
    };
  }, [enabled]);

  const confirm = () => {
    if (pendingHref) {
      const href = pendingHref;
      setPendingHref(null);
      navigate(href);
    } else if (pendingBack) {
      setPendingBack(false);
      skipNextPopstateRef.current = true;
      window.history.go(-2);
    }
  };

  const cancel = () => {
    setPendingHref(null);
    setPendingBack(false);
  };

  return {
    isOpen: pendingHref !== null || pendingBack,
    confirm,
    cancel,
  };
}
