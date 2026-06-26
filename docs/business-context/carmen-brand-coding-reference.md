# Carmen — Brand Reference (สำหรับ Coding)

> สรุปเฉพาะส่วนที่ใช้ตอนเขียนโค้ด (สี + typography) จาก **Brand Guideline 2026 (v.Handoff)**
> Carmen Hotel Financial Software
> สีแสดงเป็น **OKLCH** (มี hex เดิมกำกับไว้อ้างอิง)

---

## 1. Color Palette

### Primary Colors — ใช้ได้ทั้ง print และ digital
| Name | OKLCH | HEX |
|------|-------|-----|
| Carmen Navy | `oklch(0.410 0.116 257.6)` | `#1C4988` |
| Sky Blue | `oklch(0.706 0.118 236.3)` | `#4CABE0` |
| White | `oklch(1 0 0)` | `#FFFFFF` |
| Black | `oklch(0 0 0)` | `#000000` |

### Secondary Colors — ใช้เฉพาะงาน online/web เท่านั้น
| Name | OKLCH | HEX | Role |
|------|-------|-----|------|
| Carmen Blue | `oklch(0.471 0.179 258.7)` | `#0154BD` | Primary (online) |
| Aquatic | `oklch(0.585 0.171 253.3)` | `#197CDD` | Secondary |
| Lady Blue | `oklch(0.586 0.218 290.0)` | `#8058F1` | Highlight |
| Metallic Cyan | `oklch(0.774 0.111 229.0)` | `#60C3EE` | Highlight |
| Tampa | `oklch(0.861 0.143 187.0)` | `#31EFE1` | Dark shade / accent |

### Special Highlight — สำหรับ online media / website
| OKLCH | HEX |
|-------|-----|
| `oklch(0.861 0.143 187.0)` | `#31EFE1` |
| `oklch(0.894 0.122 201.7)` | `#67F4FE` |
| `oklch(0.869 0.084 348.8)` | `#FFBEDD` |

### ❌ สีที่ "ห้าม" ใช้ (Not Preferred)
โทนที่เลี่ยง: green-bright, yellow-bright/dark, red, beige/earth tone
| OKLCH | HEX |
|-------|-----|
| `oklch(0.666 0.201 24.1)` | `#F75253` |
| `oklch(0.654 0.227 303.1)` | `#AE61FF` |
| `oklch(0.763 0.197 319.6)` | `#E783FF` |
| `oklch(0.720 0.191 49.7)` | `#FF7802` |
| `oklch(0.819 0.150 72.0)` | `#FFB244` |

---

## 2. CSS Variables (พร้อม copy ไปใช้)

```css
:root {
  /* Primary — print + digital */
  --carmen-navy:          oklch(0.410 0.116 257.6); /* #1C4988 */
  --carmen-sky-blue:      oklch(0.706 0.118 236.3); /* #4CABE0 */
  --carmen-white:         oklch(1 0 0);             /* #FFFFFF */
  --carmen-black:         oklch(0 0 0);             /* #000000 */

  /* Secondary — online only */
  --carmen-blue:          oklch(0.471 0.179 258.7); /* #0154BD */
  --carmen-aquatic:       oklch(0.585 0.171 253.3); /* #197CDD */
  --carmen-lady-blue:     oklch(0.586 0.218 290.0); /* #8058F1 */
  --carmen-metallic-cyan: oklch(0.774 0.111 229.0); /* #60C3EE */
  --carmen-tampa:         oklch(0.861 0.143 187.0); /* #31EFE1 */

  /* Special highlight — web */
  --carmen-highlight-cyan: oklch(0.894 0.122 201.7); /* #67F4FE */
  --carmen-highlight-pink: oklch(0.869 0.084 348.8); /* #FFBEDD */
}
```

> สำหรับ React Native: ปัจจุบัน RN ยังไม่ parse string `oklch()` ตรง ๆ ในทุกเวอร์ชัน — ถ้าใช้กับ RN เดิมแนะนำคง hex ไว้ หรือใช้ไลบรารี (เช่น `culori`) แปลงตอน runtime ส่วนบนเว็บ/NativeWind v4+ ใช้ `oklch()` ได้เลย

---

## 3. Typography

**Font families**
- English → `TT Norms Pro`
- Thai → `Sukhumvit Set`

| Level | Weight | Letter spacing | Case |
|-------|--------|----------------|------|
| Heading | Bold / Extra Bold | +5 | — |
| Subheading | Demi Bold / Bold | +5 | — |
| Section Header | Medium | +5 | lowercase |
| Body Text | Normal / Regular | — | lowercase |

> **หมายเหตุ letter-spacing "+5":** เป็นค่า tracking จากโปรแกรมออกแบบ (Illustrator/Figma) ไม่ใช่ px ตรง ๆ
> ตอนทำเว็บ/แอปต้องแปลงเป็น `em` หรือ `px` แล้วปรับด้วยตา — เริ่มลองที่ราว `letter-spacing: 0.05em` แล้วเทียบกับ mockup จริง

---

## 4. App / Web Icon (อ้างอิงเสริม)

Treatments ที่อนุมัติ (เลือกอันที่ contrast ดีสุดต่อ platform):
- White mark บนพื้นดำ
- White mark บนพื้น blue gradient
- White mark บนพื้น solid blue
- Blue mark บนพื้นขาว/อ่อน

กฎ: เว้น margin (X) รอบไอคอนทุกด้าน, ใช้ master file เท่านั้น, lock aspect ratio (scale ตามสัดส่วน)

---

> **หมายเหตุการแปลงสี:** OKLCH คำนวณจาก sRGB → OKLab (รูปแบบ `oklch(L C H)`, L = 0–1, H = องศา)
> ค่าที่ปัดทศนิยมอาจคลาดจาก hex เดิมเล็กน้อยระดับที่ตาแทบมองไม่เห็น — ถ้าต้องการ exact round-trip ใช้ hex เป็นต้นทาง
