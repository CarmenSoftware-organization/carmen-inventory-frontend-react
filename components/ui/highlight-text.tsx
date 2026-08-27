/**
 * ไฮไลต์ส่วนของข้อความที่ตรงกับคำค้น
 *
 * ใช้กับตารางที่กรองในหน่วยความจำแล้วยังเหลือหลายสิบแถว — คนกวาดตาหาว่าแถวนี้
 * ติดมาเพราะคำไหน ถ้าไม่ไฮไลต์ก็ต้องอ่านทั้งแถวเทียบเอง
 *
 * `query` ถูก escape ก่อนเข้า RegExp — คนพิมพ์ `(` หรือ `[` ลงช่องค้นได้ ถ้าไม่
 * escape จะพังเป็น SyntaxError กลางการ render ไม่ใช่แค่หาไม่เจอ
 *
 * @param text - ข้อความเต็มของเซลล์
 * @param query - คำค้นดิบจากช่องค้น
 * @example
 * <HighlightText text={row.original.name} query={search} />
 */
export const HighlightText = ({
  text,
  query,
}: {
  readonly text: string;
  readonly query: string;
}) => {
  "use no memo";
  if (!text) return null;
  if (!query.trim()) return <>{text}</>;

  const escaped = query.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  // split ด้วย capturing group → index คี่คือส่วนที่ตรงคำค้นเสมอ
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));

  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark
            key={`${i}-${part}`}
            className="bg-warning/30 text-foreground rounded-sm font-bold"
          >
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
};
