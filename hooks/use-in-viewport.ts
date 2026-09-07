import { useEffect, useRef, useState } from "react";

/**
 * true เมื่อ element เข้าใกล้ viewport แล้ว (เผื่อ 200px ให้โหลดทันก่อนเห็นจริง)
 * ปิด observer ทันทีที่ติด — โหลดครั้งเดียว ไม่ยิงซ้ำตอน scroll ผ่านไปมา
 * environment ที่ไม่มี IntersectionObserver (jsdom/เบราว์เซอร์เก่า) ถือว่าเห็นเลย
 *
 * @returns `ref` ที่ต้องผูกกับ element และ `inView` ที่กลายเป็น true ครั้งเดียว
 */
export function useInViewport<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  // ตั้งค่าตอน init ไม่ใช่ใน effect — กัน cascading render
  const [inView, setInView] = useState(
    () => typeof IntersectionObserver === "undefined",
  );

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, inView };
}
