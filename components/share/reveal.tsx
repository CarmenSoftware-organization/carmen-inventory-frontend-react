
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Global animation styles — keyframes for ping/bar/reveal และ class definitions
 * Mount ครั้งเดียวต่อหน้า (วางใน root component หรือ section ใหญ่)
 */
export function AnimationStyles() {
  return (
    <style>{`
      @keyframes inv-ping {
        0% { transform: scale(0.8); opacity: 0.6; }
        80%, 100% { transform: scale(2.2); opacity: 0; }
      }
      @keyframes inv-bar {
        0% { transform: translateX(-110%); }
        100% { transform: translateX(310%); }
      }
      .inv-reveal {
        opacity: 0;
        transform: translateY(0.75rem);
        transition: opacity 0.6s ease-out, transform 0.6s ease-out;
      }
      .inv-reveal.is-visible {
        opacity: 1;
        transform: translateY(0);
      }
      @media (prefers-reduced-motion: reduce) {
        .inv-reveal { opacity: 1; transform: none; transition: none; }
      }
    `}</style>
  );
}

/**
 * Scroll-triggered reveal wrapper — fade-in + translate-y เมื่อเข้า viewport
 * ใช้ IntersectionObserver, รองรับ prefers-reduced-motion
 *
 * @param delay - หน่วง animation (ms) สำหรับ stagger entrance
 */
export function Reveal({
  children,
  delay = 0,
}: {
  readonly children: React.ReactNode;
  readonly delay?: number;
}) {
  const [ref, visible] = useInViewRef();
  return (
    <div
      ref={ref}
      className={cn("inv-reveal", visible && "is-visible")}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

function useInViewRef() {
  const [visible, setVisible] = useState(false);
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(node);
        }
      },
      { threshold: 0.1, rootMargin: "-2% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);
  return [setNode, visible] as const;
}

/**
 * Animated number counter — ease-out cubic จาก 0 → target
 * รักษา decimal precision ที่ frame สุดท้าย (สำคัญสำหรับ currency)
 */
export function useCountUp(target: number, duration = 600) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(t === 1 ? target : Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}
