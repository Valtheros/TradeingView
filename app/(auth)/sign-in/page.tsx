import AuthPage from "@/components/AuthPage";
import { safeReturnTo, type AuthSearchParams } from "@/lib/auth-navigation";
import SignInForm from "./SignInForm";

export default async function SignInPage({ searchParams }: { searchParams: AuthSearchParams }) {
  const returnTo = safeReturnTo((await searchParams).returnTo);
  return <AuthPage returnTo={returnTo}><SignInForm returnTo={returnTo} /></AuthPage>;
}
