"use client";

import { House, Newspaper, Star } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "./LanguageProvider";
import SearchCommand from "./SearchCommand";

export default function NavItems({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const { dictionary } = useLanguage();
  const items = [
    { href: "/", label: dictionary.nav.dashboard, Icon: House },
    { href: "/watchlist", label: dictionary.nav.watchlist, Icon: Star },
    { href: "/news", label: dictionary.nav.news, Icon: Newspaper },
  ];
  return <nav className={mobile ? "mobile-nav" : "desktop-nav"} aria-label={mobile ? "Mobile" : "Main"}>
    {items.map(({ href, label, Icon }) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}><Icon size={20} /><span>{label}</span></Link>)}
    <SearchCommand renderAs="text" label={dictionary.nav.search} />
  </nav>;
}
