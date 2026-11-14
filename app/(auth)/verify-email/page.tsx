import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import VerifyEmailForm from "./VerifyEmailForm";
import { getCurrentSession } from "@/lib/better-auth/session";
import { authHref, safeReturnTo, type AuthSearchParams } from "@/lib/auth-navigation";

export default async function VerifyEmailPage({ searchParams }: { searchParams: AuthSearchParams }) {
  const returnTo = safeReturnTo((await searchParams).returnTo);
  if ((await getCurrentSession())?.user) redirect(returnTo);
  const cookieStore = await cookies();
  const email = cookieStore.get("email_to_verify");

  if (!email) {
    redirect(authHref("/sign-up", returnTo));
  }

  return <VerifyEmailForm returnTo={returnTo} />;
}
