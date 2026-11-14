import AuthPage from "@/components/AuthPage";
import { safeReturnTo, type AuthSearchParams } from "@/lib/auth-navigation";
import ForgotPasswordForm from "./ForgotPasswordForm";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: AuthSearchParams }) {
  const returnTo = safeReturnTo((await searchParams).returnTo);
  return <AuthPage returnTo={returnTo}><ForgotPasswordForm returnTo={returnTo} /></AuthPage>;
}
