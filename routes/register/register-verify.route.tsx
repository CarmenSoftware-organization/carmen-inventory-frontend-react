import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "use-intl";
import { Link, useNavigate, useSearchParams } from "react-router";
import { CheckCircle2 } from "lucide-react";
import { ApiError } from "@/lib/api-error";
import {
  register as registerUser,
  verifySignupToken,
} from "@/lib/auth/auth-api";
import { AuthSplitShell } from "@/components/auth/auth-split-shell";
import { RedirectIfAuthed } from "@/components/auth/redirect-if-authed";
import { Button } from "@/components/ui/button";
import SignupProfileForm from "./signup-profile-form";
import type { SignupProfileValues } from "./signup-schema";

type LinkState =
  | { kind: "checking" }
  | { kind: "valid"; email: string }
  | { kind: "gone" };

/**
 * หน้า `/register/verify?token=...` ขั้นที่สอง — token พิสูจน์อีเมลไปแล้ว เหลือกรอกโปรไฟล์และรหัสผ่าน
 *
 * token อ่านจาก query แล้วส่งไปกับ request เท่านั้น ไม่ถูกเก็บลง localStorage หรือ sessionStorage
 * เพราะมันเป็นความลับที่ใช้สร้างบัญชีได้จริงจนกว่าจะถูกใช้
 *
 * ลิงก์ที่ไม่มีจริง หมดอายุ และถูกใช้แล้ว แสดงหน้าจอเดียวกันทั้งหมด ตรงกับที่ backend ตอบ 410
 * เหมือนกันทุกกรณี — การแยกให้เห็นจะบอกคนที่ถือ token มั่ว ๆ ว่ามันมีอยู่จริงหรือไม่
 */
export function Component() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const t = useTranslations("auth");
  // ลิงก์ที่ไม่มี `?token=` เลย ตัดสินได้ตั้งแต่ค่าเริ่มต้น ไม่ต้องรอ effect — และการ setState
  // แบบ synchronous ใน effect จะทำให้เกิด render ซ้อนโดยไม่จำเป็น
  const [state, setState] = useState<LinkState>(() =>
    token ? { kind: "checking" } : { kind: "gone" },
  );

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    verifySignupToken(token)
      .then((r) => {
        if (!cancelled) setState({ kind: "valid", email: r.email });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "gone" });
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const createAccount = useMutation({
    mutationFn: (values: SignupProfileValues) =>
      registerUser({
        token,
        password: values.password,
        user_info: {
          first_name: values.firstName.trim(),
          last_name: values.lastName.trim(),
          ...(values.telephone.trim()
            ? { telephone: values.telephone.trim() }
            : {}),
        },
      }),
    onSuccess: () =>
      navigate("/login", { replace: true, state: { justRegistered: true } }),
  });

  // token ตายคาฟอร์ม — แสดงข้อความแต่ไม่ล้างสิ่งที่กรอกไว้ ผู้ใช้ขอลิงก์ใหม่แล้วกลับมากรอกซ้ำ
  // ทั้งชุดคือสิ่งที่แย่ที่สุดที่จะเกิดขึ้นได้ตรงนี้
  const errorMessage =
    createAccount.error instanceof ApiError
      ? createAccount.error.statusCode === 410
        ? t("signup.linkDeadDuringForm")
        : createAccount.error.statusCode === 409
          ? t("signup.alreadyRegistered")
          : createAccount.error.message
      : createAccount.error
        ? t("signup.createFailed")
        : null;

  if (state.kind === "checking") {
    return (
      <AuthSplitShell
        title={t("signup.title")}
        subtitle={t("signup.checkingLink")}
      >
        <div className="mt-5 flex justify-center">
          <span
            className="border-muted-foreground/30 border-t-muted-foreground inline-block size-6 animate-spin rounded-full border-2"
            role="status"
            aria-label={t("signup.checkingLink")}
          />
        </div>
      </AuthSplitShell>
    );
  }

  if (state.kind === "gone") {
    return (
      <AuthSplitShell
        title={t("signup.linkDeadTitle")}
        subtitle={t("signup.linkDeadDescription")}
      >
        <Button asChild className="mt-5 h-10 w-full">
          <Link to="/register">{t("signup.requestNewLink")}</Link>
        </Button>
      </AuthSplitShell>
    );
  }

  return (
    <RedirectIfAuthed>
      <AuthSplitShell
        title={t("signup.title")}
        subtitle={t("signup.profileStepDescription")}
      >
        <p className="text-muted-foreground mt-4 flex items-center justify-center gap-2 text-xs">
          <CheckCircle2 className="text-positive-ink size-4" aria-hidden="true" />
          {t("signup.emailVerified", { email: state.email })}
        </p>
        <SignupProfileForm
          onSubmit={(values) => createAccount.mutate(values)}
          isPending={createAccount.isPending}
          errorMessage={errorMessage}
          submitLabel={
            createAccount.isPending
              ? t("signup.creating")
              : t("signup.createAccount")
          }
        />
      </AuthSplitShell>
    </RedirectIfAuthed>
  );
}
