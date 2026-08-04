import RegisterForm from "@/components/register-form";
import { RedirectIfAuthed } from "@/components/auth/redirect-if-authed";

/**
 * หน้า `/register` — public เหมือน `/login` และครอบด้วย `RedirectIfAuthed`
 * เพื่อไม่ให้คนที่ login อยู่แล้วเดินกลับมาสมัครซ้ำ
 */
export function Component() {
  return (
    <RedirectIfAuthed>
      <RegisterForm />
    </RedirectIfAuthed>
  );
}
