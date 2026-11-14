"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { useLanguage } from "./LanguageProvider";
import LanguageToggle from "./LanguageToggle";
import { InstallAppButton } from "./PwaProvider";
import { authHref } from "@/lib/auth-navigation";

export default function GuestControls() {
  const { dictionary } = useLanguage();
  const pathname = usePathname();
  return <div className="guest-controls">
    <Link className="action-button guest-login" href={authHref("/sign-in", pathname)}>{dictionary.signIn.submit}</Link>
    <DropdownMenu><DropdownMenuTrigger asChild><button type="button" className="icon-button" aria-label={dictionary.guest.more} title={dictionary.guest.more}><MoreHorizontal size={21} /></button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="account-menu">
        <div className="p-2 lg:hidden"><LanguageToggle className="w-full" /></div>
        <div className="p-2"><InstallAppButton /></div>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>;
}
