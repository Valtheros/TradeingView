import AuthPage from "@/components/AuthPage";
import { safeReturnTo, type AuthSearchParams } from "@/lib/auth-navigation";
import SignUpForm from "./SignUpForm";

export default async function SignUpPage({ searchParams }: { searchParams: AuthSearchParams }) {
  const returnTo = safeReturnTo((await searchParams).returnTo);
  return <AuthPage returnTo={returnTo}><SignUpForm returnTo={returnTo} /></AuthPage>;
}
