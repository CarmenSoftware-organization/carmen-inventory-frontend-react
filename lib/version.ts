/**
 * เวอร์ชันแอปที่ footer แสดง — ฉีดตอน build จากฟิลด์ `version` ของ `package.json`
 * (ดูคีย์ `define` ใน vite.config.ts / vitest.config.ts) bump ด้วย `bun run build:bump`
 */
export const APP_VERSION = __APP_VERSION__;
