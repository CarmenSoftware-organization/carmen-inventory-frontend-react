import { useState, useEffect } from "react";

/**
 * Hook สำหรับ debounce ค่าใดๆ โดยจะอัพเดตหลังจาก delay ที่กำหนด
 *
 * เหมาะสำหรับ debounce search input ก่อนยิง API เพื่อลดจำนวน request
 * ใช้ `setTimeout` ภายใน `useEffect` จึง cleanup อัตโนมัติเมื่อ value/delay เปลี่ยน
 * ค่าที่คืนจะ lag หลังค่าปัจจุบันเสมอเป็นเวลา delay ms
 *
 * @param value - ค่าที่ต้องการ debounce
 * @param delay - ระยะเวลา debounce (ms)
 * @returns ค่าที่ debounce แล้ว
 * @example
 * ```ts
 * const [search, setSearch] = useState("");
 * const debounced = useDebouncedValue(search, 300);
 * const { data } = useVendor({ search: debounced });
 * ```
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
