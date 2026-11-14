"use client";

import { House, Newspaper, Star } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "./LanguageProvider";
import SearchCommand from "./SearchCommand";
import { LinkFeedback } from "./StockLink";
import { useAppAccess } from "./AppAccessProvider";

export default function NavItems({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const { user, requestSignIn } = useAppAccess();
  const { dictionary } = useLanguage();
  const items = [
    { href: "/", label: dictionary.nav.dashboard, Icon: House },
    { href: "/watchlist", label: dictionary.nav.watchlist, Icon: Star },
    { href: "/news", label: dictionary.nav.news, Icon: Newspaper },
  ];
  return <nav className={mobile ? "mobile-nav" : "desktop-nav"} aria-label={mobile ? "Mobile" : "Main"}>
    {items.map(({ href, label, Icon }) => <Link key={href} href={href} prefetch={!user && href !== "/" ? false : undefined}
      onClick={event => { if (!user && href !== "/" && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); requestSignIn(href); } }}
      aria-current={pathname === href ? "page" : undefined}><Icon size={20} /><span>{label}</span><LinkFeedback /></Link>)}
    <SearchCommand renderAs="text" label={dictionary.nav.search} />
  </nav>;
}
