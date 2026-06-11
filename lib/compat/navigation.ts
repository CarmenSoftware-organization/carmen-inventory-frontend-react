import { useMemo } from "react";
import {
  useLocation,
  useNavigate,
  useParams as useRouterParams,
  useSearchParams as useRouterSearchParams,
} from "react-router";

/**
 * Drop-in replacement ของ next/navigation บน react-router
 * — codemod เปลี่ยน import path มาที่นี่ ทำให้ 77 ไฟล์เดิมไม่ต้องแก้ logic
 * โมดูลใหม่ๆ ควร import จาก react-router ตรงๆ
 */

export function usePathname(): string {
  return useLocation().pathname;
}

/**
 * อ่านอย่างเดียวเหมือน next/navigation (การเขียน URL ใช้ useURL/useSetSearchParams เดิม)
 *
 * WARNING: Mutating the returned object will NOT update the router URL — use react-router's setSearchParams or the app's useURL hook for writes.
 */
export function useSearchParams(): Readonly<URLSearchParams> {
  const [searchParams] = useRouterSearchParams();
  return searchParams;
}

export function useParams<
  T extends Record<string, string | string[] | undefined> = Record<string, string | undefined>,
>(): T {
  return useRouterParams() as T;
}

export interface CompatRouter {
  push: (href: string) => void;
  replace: (href: string) => void;
  back: () => void;
  forward: () => void;
  refresh: () => void;
  prefetch: (href: string) => void;
}

export function useRouter(): CompatRouter {
  const navigate = useNavigate();
  return useMemo(
    () => ({
      push: (href: string) => void navigate(href),
      replace: (href: string) => void navigate(href, { replace: true }),
      back: () => void navigate(-1),
      forward: () => void navigate(1),
      // SPA: ข้อมูลมาจาก TanStack Query — invalidate ที่ฝั่ง caller แทน
      refresh: () => {},
      // ไม่มี per-route prefetch แบบ Next; Vite preload ผ่าน dynamic import เอง
      prefetch: () => {},
    }),
    [navigate],
  );
}
