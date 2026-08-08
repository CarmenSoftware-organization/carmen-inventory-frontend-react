import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "use-intl";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { ApiError } from "@/lib/api-error";
import { tokenStore } from "@/lib/auth/token-store";
import {
  acceptInvitation,
  acceptInvitationWithSignup,
  declineInvitation,
  getInvitation,
  type InvitationPreview,
} from "@/lib/invitation-api";
import { AuthFormAlert } from "@/components/auth/floating-field";
import { AuthSplitShell } from "@/components/auth/auth-split-shell";
import { Button } from "@/components/ui/button";
import SignupProfileForm from "../register/signup-profile-form";
import type { SignupProfileValues } from "../register/signup-schema";
import InvitationSummary from "./invitation-summary";

type LinkState =
  | { kind: "loading" }
  | { kind: "gone" }
  | { kind: "ready"; invitation: InvitationPreview };

/**
 * หน้า `/invitations/:token` — public เพราะคนที่เปิดลิงก์อาจยังไม่มีบัญชี
 *
 * หน้าจอถาม backend ว่าอีเมลของคำเชิญมีบัญชีอยู่แล้วหรือไม่ (`has_account`) เพื่อเสนอทางเข้าทางเดียว
 * ที่ใช้ได้จริง ข้อเท็จจริงนี้ถูกเปิดเผยอยู่แล้วในรูป 409 ตอนกดสร้างบัญชี การถามก่อนจึงไม่ได้จ่ายความลับ
 * เพิ่ม แต่ตัดการกรอกฟอร์มทิ้งออกไป เมื่อ backend ตอบไม่ได้ (`null`) หน้าจอกลับไปเสนอทั้งสองทาง และ
 * backend ยังเป็นผู้ตัดสินความจริงเสมอ — กดสร้างบัญชีทั้งที่มีอยู่แล้วยังได้ 409 พร้อมคำแนะนำให้ไปเข้าสู่ระบบ
 *
 * รับ token ได้ทั้งสองรูปแบบโดยตั้งใจ — `/invitations/<token>` และ `/invitations?token=<token>`
 * เพราะ backend ประกอบลิงก์ด้วย `searchParams.set('token', …)` ต่อท้าย Base URL ที่ผู้ดูแลตั้งไว้
 * จึงได้รูปแบบ query ส่วนรูปแบบ path เป็นสิ่งที่คนอ่านลิงก์แล้วเดาว่าน่าจะเป็น การรับทั้งคู่ทำให้ค่า
 * Base URL ที่ตั้งผิดรูปแบบไม่กลายเป็นลิงก์เสียที่ผู้ถูกเชิญแก้เองไม่ได้
 */
export function Component() {
  const { token: pathToken } = useParams();
  const [searchParams] = useSearchParams();
  const token = pathToken ?? searchParams.get("token") ?? "";
  const navigate = useNavigate();
  const t = useTranslations("auth");
  const [state, setState] = useState<LinkState>({ kind: "loading" });
  const [mode, setMode] = useState<"choose" | "signup">("choose");
  const isAuthed = tokenStore.get() !== null;

  useEffect(() => {
    let cancelled = false;
    getInvitation(token)
      .then((invitation) => {
        if (!cancelled) setState({ kind: "ready", invitation });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "gone" });
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const signup = useMutation({
    mutationFn: (values: SignupProfileValues) =>
      acceptInvitationWithSignup(token, {
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

  const accept = useMutation({
    mutationFn: () => acceptInvitation(token),
    onSuccess: () => navigate("/dashboard", { replace: true }),
  });

  const decline = useMutation({
    mutationFn: () => declineInvitation(token),
    onSuccess: () => navigate("/login", { replace: true }),
  });

  if (state.kind === "loading") {
    return (
      <AuthSplitShell
        title={t("invitation.title")}
        subtitle={t("invitation.loading")}
      >
        <div className="mt-5 flex justify-center">
          <span
            className="border-muted-foreground/30 border-t-muted-foreground inline-block size-6 animate-spin rounded-full border-2"
            role="status"
            aria-label={t("invitation.loading")}
          />
        </div>
      </AuthSplitShell>
    );
  }

  if (state.kind === "gone") {
    return (
      <AuthSplitShell
        title={t("invitation.deadTitle")}
        subtitle={t("invitation.deadDescription")}
      >
        <Button asChild className="mt-5 h-10 w-full">
          <Link to="/login">{t("signIn")}</Link>
        </Button>
      </AuthSplitShell>
    );
  }

  // ล็อกอินอยู่แล้ว — ไม่ต้องเดาฝั่ง client ว่าเป็นบัญชีที่ถูกคนหรือไม่ backend เทียบอีเมลเองและตอบ 403
  if (isAuthed) {
    const failed = accept.error ?? decline.error;
    const wrongAccount = failed instanceof ApiError && failed.statusCode === 403;
    const errorMessage = failed
      ? wrongAccount
        ? t("invitation.wrongAccount")
        : failed instanceof ApiError
          ? failed.message
          : t("invitation.actionFailed")
      : null;

    return (
      <AuthSplitShell
        title={t("invitation.title")}
        subtitle={t("invitation.reviewDescription")}
      >
        <InvitationSummary invitation={state.invitation} />
        {errorMessage && (
          <div className="mt-4">
            <AuthFormAlert>{errorMessage}</AuthFormAlert>
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <Button
            className="h-10 flex-1"
            disabled={accept.isPending || decline.isPending}
            onClick={() => accept.mutate()}
          >
            {accept.isPending ? t("invitation.accepting") : t("invitation.accept")}
          </Button>
          <Button
            variant="outline"
            className="h-10 flex-1"
            disabled={accept.isPending || decline.isPending}
            onClick={() => decline.mutate()}
          >
            {t("invitation.decline")}
          </Button>
        </div>
      </AuthSplitShell>
    );
  }

  if (mode === "signup") {
    const errorMessage =
      signup.error instanceof ApiError
        ? signup.error.statusCode === 409
          ? t("invitation.alreadyHasAccount")
          : signup.error.statusCode === 410
            ? t("invitation.deadDescription")
            : signup.error.message
        : signup.error
          ? t("signup.createFailed")
          : null;

    return (
      <AuthSplitShell
        title={t("invitation.title")}
        subtitle={t("invitation.signupDescription")}
      >
        <InvitationSummary invitation={state.invitation} />
        <SignupProfileForm
          onSubmit={(values) => signup.mutate(values)}
          isPending={signup.isPending}
          errorMessage={errorMessage}
          submitLabel={
            signup.isPending
              ? t("signup.creating")
              : t("invitation.createAndJoin")
          }
        />
      </AuthSplitShell>
    );
  }

  // true = มีบัญชีแล้ว · false = ยังไม่มี · null/undefined = backend ตอบไม่ได้ (auth ไม่ตอบ หรือยัง
  // ไม่ได้ deploy) กรณีที่สามต้องคงสองทางเลือกไว้เหมือนเดิม เพราะเดาผิดทางไหนก็พาผู้ใช้ไปชนกำแพง —
  // เดาว่าไม่มีบัญชีจะจบที่ 409 หลังกรอกฟอร์ม เดาว่ามีจะขังคนไว้ที่หน้าเข้าสู่ระบบที่เขาผ่านไม่ได้
  const hasAccount = state.invitation.has_account;

  return (
    <AuthSplitShell
      title={t("invitation.title")}
      subtitle={
        hasAccount === true
          ? t("invitation.signInDescription")
          : hasAccount === false
            ? t("invitation.createDescription")
            : t("invitation.chooseDescription")
      }
    >
      <InvitationSummary invitation={state.invitation} />
      <div className="mt-4 flex flex-col gap-2">
        {hasAccount !== true && (
          <Button className="h-10 w-full" onClick={() => setMode("signup")}>
            {t("invitation.createAccount")}
          </Button>
        )}
        {hasAccount !== false && (
          <Button
            variant={hasAccount === true ? "default" : "outline"}
            className="h-10 w-full"
            asChild
          >
            <Link
              to={`/login?next=${encodeURIComponent(`/invitations/${token}`)}`}
            >
              {hasAccount === true
                ? t("signIn")
                : t("invitation.haveAccount")}
            </Link>
          </Button>
        )}
      </div>
    </AuthSplitShell>
  );
}
