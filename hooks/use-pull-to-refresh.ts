import { useEffect, useRef, useState } from "react";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<unknown> | void;
  threshold?: number;
  disabled?: boolean;
}

/**
 * Hook รองรับท่า pull-to-refresh บนมือถือ
 * ตรวจจับ touch event บน window และเรียก onRefresh เมื่อผู้ใช้ดึงเกิน threshold
 * ทำงานเฉพาะเมื่อ scrollY = 0 และคืน progress 0..1 สำหรับ animation feedback
 * @param options - object รวม onRefresh, threshold (default 80px), disabled
 * @returns object ที่มี containerRef, distance, isRefreshing, progress
 * @example
 * const { containerRef, progress, isRefreshing } = usePullToRefresh({
 *   onRefresh: () => refetch(),
 * });
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  disabled = false,
}: UsePullToRefreshOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [distance, setDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const pullingRef = useRef(false);

  useEffect(() => {
    if (disabled) return;
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 0) return;
      startYRef.current = e.touches[0].clientY;
      pullingRef.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pullingRef.current || startYRef.current == null) return;
      if (window.scrollY > 0) {
        pullingRef.current = false;
        setDistance(0);
        return;
      }
      const dy = e.touches[0].clientY - startYRef.current;
      if (dy > 0) {
        setDistance(Math.min(dy * 0.5, threshold * 1.5));
      }
    };

    const onTouchEnd = async () => {
      if (!pullingRef.current) return;
      pullingRef.current = false;
      if (distance >= threshold) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          setDistance(0);
        }
      } else {
        setDistance(0);
      }
      startYRef.current = null;
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [disabled, distance, onRefresh, threshold]);

  return {
    containerRef,
    distance,
    isRefreshing,
    progress: Math.min(distance / threshold, 1),
  };
}
