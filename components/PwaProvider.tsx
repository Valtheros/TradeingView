"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { Download, Share2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";
import { useLanguage } from "./LanguageProvider";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const PwaContext = createContext({ installed: false, open: () => {} });
const standalone = () => matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
const subscribeStandalone = (callback: () => void) => {
  const mode = matchMedia("(display-mode: standalone)");
  mode.addEventListener("change", callback);
  return () => mode.removeEventListener("change", callback);
};

export function PwaProvider({ children }: { children: ReactNode }) {
  const { dictionary } = useLanguage();
  const copy = dictionary.daily;
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [open, setOpen] = useState(false);
  const [ios, setIos] = useState(false);
  const [secure, setSecure] = useState(true);
  const isStandalone = useSyncExternalStore(subscribeStandalone, standalone, () => false);
  useEffect(() => {
    const before = (event: Event) => { event.preventDefault(); setPrompt(event as InstallEvent); };
    const complete = () => { setInstalled(true); setPrompt(null); setOpen(false); };
    window.addEventListener("beforeinstallprompt", before);
    window.addEventListener("appinstalled", complete);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", before);
      window.removeEventListener("appinstalled", complete);
    };
  }, []);
  return <PwaContext.Provider value={{ installed: installed || isStandalone, open: () => {
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    setSecure(window.isSecureContext);
    setOpen(true);
  } }}>
    {children}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="install-dialog">
      <Download size={28} className="text-yellow-500" />
      <DialogTitle>{copy.installTitle}</DialogTitle>
      <DialogDescription>{!secure ? copy.installSecure : ios ? copy.installIos : copy.installOther}</DialogDescription>
      {prompt && !installed && <button className="action-button" onClick={async () => {
        try { await prompt.prompt(); const result = await prompt.userChoice; if (result.outcome === "accepted") setOpen(false); }
        finally { setPrompt(null); }
      }}><Download size={18} />{copy.install}</button>}
      {ios && <Share2 size={24} aria-hidden="true" />}
    </DialogContent></Dialog>
  </PwaContext.Provider>;
}

export function InstallAppButton() {
  const { installed, open } = useContext(PwaContext);
  const { dictionary } = useLanguage();
  if (installed) return null;
  return <button className="language-toggle w-full" onClick={open}><Download size={18} />{dictionary.daily.install}</button>;
}
