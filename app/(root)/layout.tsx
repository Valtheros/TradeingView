import Header from "@/components/Header";
import { getCurrentSession } from "@/lib/better-auth/session";
import { Suspense } from "react";
import AppBootSkeleton from "@/components/AppBootSkeleton";
import { redirect } from "next/navigation";
import NavItems from "@/components/NavItems";
import LanguageSurface from "@/components/LanguageSurface";

async function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if(!session?.user) redirect('/sign-in');
  const user = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  }
  return (
    <div className="app-shell">
      <Header user={user} />
      <main className="app-content"><LanguageSurface>{children}</LanguageSurface></main>
      <NavItems mobile />
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<AppBootSkeleton />}><AuthenticatedShell>{children}</AuthenticatedShell></Suspense>;
}
