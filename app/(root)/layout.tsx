import Header from "@/components/Header";
import { getAuth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import NavItems from "@/components/NavItems";
import LanguageSurface from "@/components/LanguageSurface";

const layout = async ({ children }: { children: React.ReactNode }) => {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
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
};

export default layout;
