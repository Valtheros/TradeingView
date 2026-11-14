"use client";

import { createContext, useContext, useState } from "react";
import Link from "next/link";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { useLanguage } from "./LanguageProvider";
import { authHref, safeReturnTo } from "@/lib/auth-navigation";
import { interpolate } from "@/lib/i18n";

const AccessContext = createContext<{ user: User | null; requestSignIn: (returnTo: string) => void } | null>(null);

export function AppAccessProvider({ user, children }: { user: User | null; children: React.ReactNode }) {
  const [destination, setDestination] = useState<string | null>(null);
  const { dictionary } = useLanguage();
  const copy = dictionary.guest;
  const stock = destination?.startsWith("/stocks/") ? destination.slice(8) : null;
  return <AccessContext.Provider value={{ user, requestSignIn: path => setDestination(safeReturnTo(path)) }}>
    {children}
    <Dialog open={destination !== null} onOpenChange={open => { if (!open) setDestination(null); }}>
      <DialogContent className="access-dialog">
        <DialogTitle>{stock ? interpolate(copy.followTitle, { symbol: stock }) : copy.signInTitle}</DialogTitle>
        <DialogDescription>{stock ? copy.followDescription : destination === "/news" ? copy.newsDescription : copy.watchlistDescription}</DialogDescription>
        <Link className="action-button" href={authHref("/sign-in", destination)} onClick={() => setDestination(null)}>{dictionary.signIn.submit}</Link>
        <Link className="action-button secondary" href={authHref("/sign-up", destination)} onClick={() => setDestination(null)}>{dictionary.signIn.createAccount}</Link>
        <button type="button" className="text-action" onClick={() => setDestination(null)}>{copy.keepExploring}</button>
      </DialogContent>
    </Dialog>
  </AccessContext.Provider>;
}

export function useAppAccess() {
  const access = useContext(AccessContext);
  if (!access) throw new Error("AppAccessProvider is missing");
  return access;
}
