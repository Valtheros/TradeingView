import Image from "next/image"
import Link from "next/link"
import LanguageToggle from "@/components/LanguageToggle";
import { Suspense } from "react";
import { AuthSkeleton } from "@/components/PageSkeleton";

const layout = ({ children }: { children: React.ReactNode }) => {
    return (
    <main className="auth-layout">
            <header className="auth-logo">
                <Link href="/" className="brand-link">
                <Image src="/assets/icons/logo.svg" alt="StockMarket" width={156} height={30} priority />
                </Link>
                <LanguageToggle />
            </header>
            <section className="auth-form">
                <Suspense fallback={<AuthSkeleton />}>{children}</Suspense>
            </section>
    </main>
  )
}

export default layout
