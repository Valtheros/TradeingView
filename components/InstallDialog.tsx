"use client";
import { useState } from "react";
import { Download, Share2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";
import { useLanguage } from "./LanguageProvider";

export default function InstallDialog({ ios, secure, canInstall, onClose, onInstall }: { ios: boolean; secure: boolean; canInstall: boolean; onClose: () => void; onInstall: () => Promise<void> }) {
  const { dictionary } = useLanguage();
  const copy = dictionary.daily;
  const [error, setError] = useState(false);
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="install-dialog">
    <Download size={28} className="text-yellow-500" /><DialogTitle>{copy.installTitle}</DialogTitle>
    <DialogDescription>{!secure ? copy.installSecure : ios ? copy.installIos : copy.installOther}</DialogDescription>
    {error && <p role="alert">{copy.loadError}</p>}
    {canInstall && <button className="action-button" onClick={async () => { try { await onInstall(); } catch { setError(true); } }}><Download size={18} />{copy.install}</button>}
    {ios && <Share2 size={24} aria-hidden="true" />}
  </DialogContent></Dialog>;
}
