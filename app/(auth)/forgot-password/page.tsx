"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/better-auth/auth-client";
import { interpolate } from "@/lib/i18n";
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

type ResetForm = { email: string; otp: string; password: string; confirmPassword: string };

export default function ForgotPassword() {
  const { dictionary } = useLanguage();
  const copy = dictionary.forgotPassword;
  const authCopy = dictionary.signIn;
  const [stage, setStage] = useState<"email" | "reset" | "done">("email");
  const [sentEmail, setSentEmail] = useState("");
  const [message, setMessage] = useState<keyof typeof copy | "">("");
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const { register, handleSubmit, getValues, reset, formState: { errors, isSubmitting } } = useForm<ResetForm>({
    defaultValues: { email: "", otp: "", password: "", confirmPassword: "" },
    mode: "onBlur",
    shouldUnregister: true,
  });
  const busy = isSubmitting || resending;

  useEffect(() => {
    if (cooldown === 0) return;
    const timer = setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const onRateLimit = ({ response }: { response: Response }) => {
    if (response.status === 429) {
      const seconds = Number(response.headers.get("X-Retry-After"));
      setCooldown(Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : 60);
    }
  };

  const sendCode = async (email: string) => {
    const { error } = await authClient.emailOtp.requestPasswordReset({ email, fetchOptions: { onError: onRateLimit, timeout: 20_000 } });
    if (error) {
      setMessage(error.status === 429 ? "rateLimited" : "requestFailed");
      return false;
    }
    setCooldown(60);
    setMessage("");
    return true;
  };

  const onSubmit = async (data: ResetForm) => {
    setMessage("");
    try {
      if (stage === "email") {
        const email = data.email.trim().toLowerCase();
        if (await sendCode(email)) {
          setSentEmail(email);
          setStage("reset");
        }
        return;
      }
      const { error } = await authClient.emailOtp.resetPassword({
        email: sentEmail, otp: data.otp, password: data.password,
        fetchOptions: { onError: onRateLimit, timeout: 20_000 },
      });
      if (error) {
        setMessage(error.status === 429 ? "rateLimited"
          : error.code === "OTP_EXPIRED" ? "expiredCode"
          : error.code === "TOO_MANY_ATTEMPTS" ? "tooManyAttempts"
          : error.code === "INVALID_OTP" ? "invalidCode" : "resetFailed");
        return;
      }
      reset();
      setStage("done");
    } catch {
      setMessage(stage === "email" ? "requestFailed" : "resetFailed");
    }
  };

  const resend = async () => {
    setResending(true);
    setMessage("");
    try {
      await sendCode(sentEmail);
    } catch {
      setMessage("requestFailed");
    } finally {
      setResending(false);
    }
  };

  if (stage === "done") return (
    <div className="space-y-5" role="status">
      <CheckCircle2 className="size-10 text-yellow-500" aria-hidden="true" />
      <h1 className="form-title !mb-0">{copy.successTitle}</h1>
      <p className="text-sm leading-relaxed text-gray-400">{copy.success}</p>
      <Button asChild className="yellow-btn w-full"><Link href="/sign-in">{authCopy.submit}</Link></Button>
    </div>
  );

  return (
    <>
      <Mail className="mb-5 size-8 text-yellow-500" aria-hidden="true" />
      <h1 className="form-title !mb-3">{stage === "email" ? copy.title : copy.resetTitle}</h1>
      <p className="mb-6 text-sm leading-relaxed text-gray-400" role="status">{stage === "email" ? copy.description : copy.sent}</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" aria-busy={busy}>
        {stage === "email" ? (
          <div className="space-y-2">
            <Label htmlFor="reset-email" className="form-label">{authCopy.emailLabel}</Label>
            <Input id="reset-email" type="email" autoComplete="email" autoCapitalize="none" maxLength={254}
              className="form-input" placeholder="you@example.com" disabled={busy}
              aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "reset-email-error" : undefined}
              {...register("email", { required: authCopy.emailRequired, pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: authCopy.emailInvalid } })} />
            {errors.email && <p id="reset-email-error" className="text-sm text-red-400" role="alert">{errors.email.message}</p>}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="min-w-0 break-all text-sm text-gray-300">{sentEmail}</p>
              <Button type="button" variant="link" className="min-h-11 px-0 text-yellow-500" disabled={busy}
                onClick={() => { reset({ email: sentEmail, otp: "", password: "", confirmPassword: "" }); setStage("email"); setMessage(""); }}>
                {copy.changeEmail}
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-otp" className="form-label">{copy.codeLabel}</Label>
              <Input id="reset-otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6}
                className="form-input font-mono tabular-nums" placeholder="000000" disabled={busy}
                aria-invalid={Boolean(errors.otp)} aria-describedby={errors.otp ? "reset-otp-error" : undefined}
                {...register("otp", { required: copy.codeInvalid, pattern: { value: /^\d{6}$/, message: copy.codeInvalid } })} />
              {errors.otp && <p id="reset-otp-error" className="text-sm text-red-400" role="alert">{errors.otp.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-password" className="form-label">{copy.newPassword}</Label>
              <Input id="reset-password" type="password" autoComplete="new-password" maxLength={128}
                className="form-input" disabled={busy}
                aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "reset-password-error" : undefined}
                {...register("password", { required: authCopy.passwordRequired, minLength: { value: 8, message: authCopy.passwordMin }, maxLength: { value: 128, message: copy.passwordMax } })} />
              {errors.password && <p id="reset-password-error" className="text-sm text-red-400" role="alert">{errors.password.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-confirm" className="form-label">{copy.confirmPassword}</Label>
              <Input id="reset-confirm" type="password" autoComplete="new-password" maxLength={128}
                className="form-input" disabled={busy}
                aria-invalid={Boolean(errors.confirmPassword)} aria-describedby={errors.confirmPassword ? "reset-confirm-error" : undefined}
                {...register("confirmPassword", { required: copy.confirmRequired, validate: value => value === getValues("password") || copy.passwordMismatch })} />
              {errors.confirmPassword && <p id="reset-confirm-error" className="text-sm text-red-400" role="alert">{errors.confirmPassword.message}</p>}
            </div>
          </>
        )}
        {message && <p className="text-sm leading-relaxed text-red-400" role="alert">{copy[message]}</p>}
        <Button type="submit" className="yellow-btn w-full" disabled={busy || (stage === "email" && cooldown > 0)}>
          {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {stage === "email" ? (isSubmitting ? copy.sending : cooldown > 0 ? interpolate(copy.resendIn, { seconds: cooldown }) : copy.sendCode) : (isSubmitting ? copy.resetting : copy.reset)}
        </Button>
        {stage === "reset" && (
          <Button type="button" variant="ghost" className="min-h-11 w-full text-gray-300" onClick={resend} disabled={busy || cooldown > 0}>
            {resending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {cooldown > 0 ? interpolate(copy.resendIn, { seconds: cooldown }) : copy.resend}
          </Button>
        )}
        <Link href="/sign-in" className="footer-link flex min-h-11 items-center justify-center gap-2 text-sm">
          <ArrowLeft className="size-4" aria-hidden="true" />{copy.back}
        </Link>
      </form>
    </>
  );
}
