import LoginForm from "@/components/login-form";
import { RedirectIfAuthed } from "@/components/auth/redirect-if-authed";

/**
 * หน้า `/login` — ครอบ `LoginForm` ด้วย `RedirectIfAuthed` เพื่อให้ user ที่
 * login แล้ว (มี access token) ถูกเด้งไป /dashboard แทนที่จะเห็นฟอร์มซ้ำ
 */
export default function LoginPage() {
  return (
    <RedirectIfAuthed>
      <LoginForm />
    </RedirectIfAuthed>
  );
}

export const Component = LoginPage;
