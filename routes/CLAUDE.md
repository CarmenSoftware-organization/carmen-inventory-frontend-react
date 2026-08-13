# routes/

## React Compiler กับตาราง (`DataGrid`) — กับดักที่เจอซ้ำได้

TanStack table instance เป็น **reference คงที่แต่ mutate ข้างในตัวเอง** React
Compiler จึงมองว่าบล็อก JSX ที่ห่อ `<DataGrid table={table} recordCount={n}
isLoading={x}>` มี dependency คงที่ (ตัว table เดิม · จำนวนแถวรวมเท่าเดิม ·
isLoading เท่าเดิม) แล้ว **reuse ผลลัพธ์เดิมทั้งก้อน** — กดเปลี่ยนหน้าแล้ว URL
กับ query เปลี่ยนจริง แต่ตารางค้างอยู่หน้าเดิม ไม่มี request ใหม่ สั่ง re-render
ยังไงก็ไม่ขยับ (เจอจริงที่หน้า transaction: กดหน้า 3 แล้วกลับหน้า 1 ได้
`page=1` บน URL แต่ตารางยังโชว์แถว 21–30)

**แก้:** ใส่ `"use no memo";` บรรทัดแรกของคอมโพเนนต์**หน้านั้น** — directive นี้
เป็นระดับฟังก์ชัน ใส่ที่ layout แม่ไม่ตกทอดถึงลูก และใส่ใน `useXxxTable` ก็ไม่พอ
เพราะสิ่งที่ถูกแช่คือ JSX ของหน้า ไม่ใช่ตัว hook · ตัว `data-grid-table.tsx`,
`data-grid-pagination.tsx` และ `use-config-table.ts` ใส่ไว้แล้วด้วยเหตุผลเดียวกัน

หน้า list ส่วนใหญ่ยัง**ไม่ได้**ใส่และยังทำงานปกติ (ขึ้นกับรูปร่างของ JSX ล้วน ๆ)
จึงไม่ได้ไล่ใส่ยกชุด — เจอตารางค้างตอนเปลี่ยนหน้าเมื่อไร ใส่หน้านั้นทีละหน้า
