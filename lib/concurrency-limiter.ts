/**
 * คิว FIFO ที่ปล่อยงานวิ่งพร้อมกันได้ไม่เกิน `max` ตัว
 *
 * ต่างจาก rate limiter ใน `http-client` (นับ request ต่อช่วงเวลา) — ตัวนี้นับ
 * request ที่ค้างอยู่ ณ ขณะหนึ่ง
 *
 * `signal` ใช้แค่ถอดงานออกจากคิวตอนยังไม่ได้เริ่ม (เช่น React Query ยกเลิกเพราะ
 * เปลี่ยนหน้า) — งานที่เริ่มแล้วไม่ถูกตัด
 *
 * @param max - จำนวนงานที่วิ่งพร้อมกันได้สูงสุด
 * @returns `run(task, signal?)` ที่ resolve/reject ตามผลของ task
 */
export function createConcurrencyLimiter(max: number) {
  let active = 0;
  const queue: Array<() => void> = [];

  const next = () => {
    if (active >= max) return;
    queue.shift()?.();
  };

  return function run<T>(task: () => Promise<T>, signal?: AbortSignal) {
    return new Promise<T>((resolve, reject) => {
      if (signal?.aborted) {
        reject(signal.reason);
        return;
      }

      const start = () => {
        signal?.removeEventListener("abort", onAbort);
        active++;
        task()
          .then(resolve, reject)
          .finally(() => {
            active--;
            next();
          });
      };

      function onAbort() {
        const index = queue.indexOf(start);
        if (index !== -1) queue.splice(index, 1);
        reject(signal?.reason);
      }

      signal?.addEventListener("abort", onAbort, { once: true });
      queue.push(start);
      next();
    });
  };
}
