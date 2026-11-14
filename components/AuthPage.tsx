import { getCurrentSession } from "@/lib/better-auth/session";
import { redirect } from "next/navigation";
import { safeReturnTo } from "@/lib/auth-navigation";

export default async function AuthPage({ returnTo, children }: { returnTo: string; children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (session?.user) redirect(safeReturnTo(returnTo));
  return children;
}
