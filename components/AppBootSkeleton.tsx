"use client";

import Image from "next/image";
import { House, Newspaper, Search, Star } from "lucide-react";
import { usePathname } from "next/navigation";
import { useLanguage } from "./LanguageProvider";
import PageSkeleton, { StockSkeleton } from "./PageSkeleton";

export default function AppBootSkeleton() {
  const { dictionary } = useLanguage();
  const pathname = usePathname();
  const items = [{ Icon: House, label: dictionary.nav.dashboard }, { Icon: Star, label: dictionary.nav.watchlist }, { Icon: Newspaper, label: dictionary.nav.news }, { Icon: Search, label: dictionary.nav.search }];
  return <div className="app-shell app-boot" aria-busy="true" aria-label={dictionary.common.loading}>
    <header className="app-header"><div className="app-header-inner"><div className="brand-link"><Image src="/assets/icons/logo.svg" alt="StockMarket" width={156} height={30} priority /></div><span className="skeleton-block h-9 w-9 rounded-full" /></div></header>
    <main className="app-content">{pathname.startsWith("/stocks/") ? <StockSkeleton /> : <PageSkeleton news={pathname === "/news"} watchlist={pathname === "/watchlist"} />}</main>
    <div className="mobile-nav" aria-hidden="true">{items.map(({ Icon, label }) => <span className="nav-search" key={label}><Icon size={20} /><span>{label}</span></span>)}</div>
  </div>;
}
