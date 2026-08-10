import { useState } from "react";
import { RedirectIfAuthed } from "@/components/auth/redirect-if-authed";
import CheckInbox from "./check-inbox";
import SignupEmailForm from "./signup-email-form";

/**
 * หน้า `/register` ขั้นที่หนึ่ง — กรอกอีเมลเพื่อขอลิงก์ยืนยัน
 *
 * บัญชียังไม่ถูกสร้างที่ขั้นนี้ ผู้ใช้จะสร้างบัญชีที่ `/register/verify` หลังกดลิงก์ในอีเมล
 * ขั้นตอนกลับด้านจากเดิมโดยตั้งใจ — เดิมสมัครก่อนแล้วค่อยยืนยัน ทำให้มีบัญชีที่ไม่มีใครยืนยัน
 * ค้างจองอีเมลของคนอื่นไว้ได้ public เหมือน `/login` และครอบด้วย `RedirectIfAuthed`
 * เพื่อไม่ให้คนที่ล็อกอินอยู่แล้วเดินกลับมาสมัครซ้ำ
 */
export function Component() {
  const [sentTo, setSentTo] = useState<string | null>(null);

  return (
    <RedirectIfAuthed>
      {sentTo ? (
        <CheckInbox email={sentTo} />
      ) : (
        <SignupEmailForm onSent={setSentTo} />
      )}
    </RedirectIfAuthed>
  );
}
