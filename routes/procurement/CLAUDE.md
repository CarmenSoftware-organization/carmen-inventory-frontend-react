# routes/procurement/

## Backend bug: PR list ไม่มี `audit` เลย (ไม่ใช่บั๊กฝั่ง frontend)

`GET /api/purchase-requests` ติด `@EnrichAuditUsers()` เปล่า ๆ ซึ่ง enrich แค่ path `''`
แต่แถวจริงอยู่ที่ `data[].data[]` (envelope แบบหลาย BU) interceptor จึงไปไม่ถึง
แถวที่ได้กลับมามี `created_at` ดิบติดมาแต่ **ไม่มี object `audit` เลย** คอลัมน์
Created/Updated บนหน้า PR list จึงว่าง (`pr-export-columns.ts` Excel export, `pr-card.tsx`
grid card) ยืนยันด้วยการยิง gateway ตรง ๆ เมื่อ 2026-08-04

**วิธีแก้:** ใส่ `paths` ให้ decorator ไปถึงแถวที่ซ้อนอยู่ — คลาสเดียวกับที่แก้ SR list ไปแล้ว

**Frontend จงใจอ่าน `audit` ต่อไป ไม่ fallback ไปฟิลด์ดิบ** — ฟิลด์ดิบจะหายทันทีที่ decorator ถูกแก้
