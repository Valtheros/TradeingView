import Header from "@/components/Header";
import { getCurrentSession } from "@/lib/better-auth/session";
import { Suspense } from "react";
import AppBootSkeleton from "@/components/AppBootSkeleton";
import NavItems from "@/components/NavItems";
import LanguageSurface from "@/components/LanguageSurface";
import { AppAccessProvider } from "@/components/AppAccessProvider";
import { SearchProvider } from "@/components/SearchCommand";

async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  const user = session?.user ? {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  } : null;
  return (
    <AppAccessProvider user={user} key={user?.id || "guest"}><SearchProvider><div className="app-shell">
      <Header user={user} />
      <main className="app-content"><LanguageSurface>{children}</LanguageSurface></main>
      <NavItems mobile />
    </div></SearchProvider></AppAccessProvider>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<AppBootSkeleton />}><AppShell>{children}</AppShell></Suspense>;
}
