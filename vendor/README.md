# vendor/

## `xlsx-0.20.3.tgz` (SheetJS)

SheetJS ไม่อยู่บน npm registry แล้ว — เวอร์ชันบน npm ค้างที่ 0.18.5 ทางการจึงให้ติดตั้ง
จาก `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` ซึ่ง **bun ไม่บันทึก integrity
hash ให้ dependency แบบ URL** (package อื่นอีกพันกว่าตัวใน `bun.lock` มี `sha512-` กันหมด
มีตัวนี้ตัวเดียวที่ไม่มี) ผลคือทุก `bun install` = ดาวน์โหลดจากโฮสต์ภายนอกโดยไม่มีอะไร
ยืนยันว่าไฟล์ยังเป็นก้อนเดิม วันที่ CDN หรือ DNS ของ sheetjs โดน โค้ดแปลกปลอมจะเข้า
production build เงียบ ๆ

เก็บ tarball ไว้ในรีโปแล้ว pin เป็น `file:./vendor/xlsx-0.20.3.tgz` แทน — bun ใส่
`sha512-` ให้ใน `bun.lock` ทันทีเมื่อเป็นไฟล์ในเครื่อง และ build ไม่ต้องต่อเน็ตออกนอก

```
sha256  8dc73fc3b00203e72d176e85b50938627c7b086e607c682e8d3c22c02bb99fe8
```

ไฟล์นี้ถูกตรวจแล้วว่า extract ออกมาตรงกับ `node_modules/xlsx` ที่ใช้อยู่ก่อนเปลี่ยนทุกไบต์

### วิธีอัปเกรดเวอร์ชัน

```bash
curl -sSfL -o vendor/xlsx-<new>.tgz https://cdn.sheetjs.com/xlsx-<new>/xlsx-<new>.tgz
shasum -a 256 vendor/xlsx-<new>.tgz        # จดค่าใหม่ลง README นี้
rm vendor/xlsx-0.20.3.tgz                  # ลบก้อนเก่า
# แก้ dependencies.xlsx ใน package.json ให้ชี้ไฟล์ใหม่ แล้ว bun install
```

หมายเหตุสำหรับ Docker: `Dockerfile` ต้อง `COPY vendor/` ก่อน `bun install --frozen-lockfile`
ไม่งั้น build ล้มเพราะหา tarball ไม่เจอ
