import { getCurrentSession } from "@/lib/better-auth/session";
import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation";
import { getDictionary } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";
import LanguageToggle from "@/components/LanguageToggle";

const layout = async ({ children }: { children: React.ReactNode }) => {
    const locale = await getServerLocale();
    const dictionary = getDictionary(locale);
    const copy = dictionary.authLayout;
    const session = await getCurrentSession();
    if(session?.user) redirect('/')
    return (
    <main className="auth-layout">
        <section className="auth-left-section scrollbar-hide-default">
            <div className="auth-logo flex items-center justify-between">
                <Link href={"/"}>
                <Image src="/assets/icons/logo.svg" alt="trade-logo" width={140} height={32} className="h-8 w-auto" />
                </Link>
                <LanguageToggle />
            </div>
            <div className="pb-6 lg:pb-8 flex-1">
                {children}
            </div>
        </section>
        <section className="auth-right-section">
            <div className="z-10 relative lg:mt-4 lg:mb-16">
                <blockquote className="auth-blockquote">
                    {copy.testimonial}
                </blockquote>
                <div className="flex items-center justify-between">
                    <div>
                        <cite className="auth-testimonial-author">{copy.author}</cite>
                        <p className="max-md:text-xs text-gray-500">{copy.role}</p>
                    </div>
                <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <Image src="assets/icons/star.svg" alt="star" width={20} height={20} key={star} className="w-5 h-5" />
                    ))}
                </div>
                </div>
            </div> 
            <div className="flex-1 relative">
                <Image src="/assets/images/dashboard.png" alt={copy.dashboardPreviewAlt} width={1440} height={1150} className="auth-dashboard-preview absolute top-0" />
                </div> 
        </section>
    </main>
  )
}

export default layout
