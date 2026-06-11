import LoginForm from "@/components/login-form";

/** หน้า `/login` — render เฉพาะ `LoginForm` เป็น entry point ของการเข้าสู่ระบบ */
export default function LoginPage() {
  return <LoginForm />;
}

export const Component = LoginPage;
