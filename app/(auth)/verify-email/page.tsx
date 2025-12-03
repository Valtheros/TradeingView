import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import VerifyEmailForm from "./VerifyEmailForm";

export default async function VerifyEmailPage() {
  const cookieStore = await cookies();
  const email = cookieStore.get("email_to_verify");

  if (!email) {
    redirect("/sign-up");
  }

  return <VerifyEmailForm />;
}
