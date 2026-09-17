# Golden snapshot ของ API contract (ก่อนแปลง flat → object)

19 ไฟล์ในโฟลเดอร์นี้คือ response จริงของ backend **ก่อน** งานแปลง entity reference
จาก flat field (`vendor_id` + `vendor_name`) เป็น object (`vendor: {id, name}`)
เป็นตาข่ายตัวเดียวที่ตรวจได้ว่าการแปลงไม่ทำข้อมูลหาย

## ใช้ยังไง

```bash
CARMEN_TOKEN=<access token ของ dev> python3 scripts/probe-contract.py
```

สคริปต์ยิง endpoint จริง แล้วยุบ object ซ้อนกลับเป็น flat alias ก่อนเทียบกับไฟล์ที่นี่
ผ่านหมายถึงค่าที่เคยอยู่ที่ `vendor_name` ตอนนี้ยังหาเจอที่ `vendor.name`

**ผลที่คาดไว้ตอนบันทึกนี้: 17/19 ผ่าน** สองตัวที่ไม่ผ่านไม่ใช่ contract เปลี่ยน
- `product.detail` — `delivery_point` ที่ยังเป็น flat ค้างอยู่ บันทึกไว้แล้ว
- `sr.list` — มีแถวใหม่ในฐานข้อมูล dev ดันหน้าแรก ไม่ใช่ค่าเพี้ยน

## ข้อห้าม

**ห้ามอัปเดตทับด้วย response หลังแปลง** ไฟล์พวกนี้มีค่าเพราะมันเป็นภาพ "ก่อน" เท่านั้น
เขียนทับเมื่อไหร่ก็เหลือแค่ไฟล์ที่เทียบกับตัวเองได้ ตรวจอะไรไม่ได้อีกเลย

`url_token` ถูกแทนด้วย `REDACTED` — เป็น token จริงของ vendor portal ที่ไม่ต้องล็อกอิน
สคริปต์ข้ามฟิลด์ที่มีค่า `REDACTED` ให้แล้ว และ **token ของ API ไม่อยู่ในรีโป** ส่งทาง env เท่านั้น

## ข้อจำกัดที่ต้องรู้

ครอบแค่ **read 40% · write 0% · รวม 22%** ของ route ที่แปลง และเป็น GET ล้วน —
ฝั่งเขียน (`@ExpandRefs`) ไม่มีอะไรตรวจเลย ยังไม่ได้ต่อเข้า CI
