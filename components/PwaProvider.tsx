"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { Download } from "lucide-react";
import dynamic from "next/dynamic";
import { useLanguage } from "./LanguageProvider";

const InstallDialog = dynamic(() => import("./InstallDialog"), { ssr: false });

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const PwaContext = createContext({ installed: false, open: () => {} });
const standalone = () => matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
const subscribeStandalone = (callback: () => void) => {
  const mode = matchMedia("(display-mode: standalone)");
  mode.addEventListener("change", callback);
  return () => mode.removeEventListener("change", callback);
};

export function PwaProvider({ children }: { children: ReactNode }) {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [open, setOpen] = useState(false);
  const [ios, setIos] = useState(false);
  const [secure, setSecure] = useState(true);
  const isStandalone = useSyncExternalStore(subscribeStandalone, standalone, () => false);
  useEffect(() => {
    const before = (event: Event) => { event.preventDefault(); setPrompt(event as InstallEvent); };
    const complete = () => { setInstalled(true); setPrompt(null); setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("beforeinstallprompt", before);
    window.addEventListener("appinstalled", complete);
    window.addEventListener("keydown", escape);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", before);
      window.removeEventListener("appinstalled", complete);
      window.removeEventListener("keydown", escape);
    };
  }, []);
  return <PwaContext.Provider value={{ installed: installed || isStandalone, open: () => {
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    setSecure(window.isSecureContext);
    setOpen(true);
  } }}>
    {children}
    {open && <InstallDialog ios={ios} secure={secure} canInstall={Boolean(prompt) && !installed} onClose={() => setOpen(false)} onInstall={async () => {
        if (!prompt) return;
        try { await prompt.prompt(); const result = await prompt.userChoice; if (result.outcome === "accepted") setOpen(false); }
        finally { setPrompt(null); }
      }} />}
  </PwaContext.Provider>;
}

export function InstallAppButton() {
  const { installed, open } = useContext(PwaContext);
  const { dictionary } = useLanguage();
  if (installed) return null;
  return <button className="language-toggle w-full" onClick={open}><Download size={18} />{dictionary.daily.install}</button>;
}
