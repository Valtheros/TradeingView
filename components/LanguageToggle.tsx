"use client";

import { Languages } from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import { cn } from "@/lib/utils";

export default function LanguageToggle({ className }: { className?: string }) {
  const { locale, dictionary, setLocale, isPending } = useLanguage();
  return (
    <button type="button" className={cn("language-toggle", className)}
      onClick={() => setLocale(locale === "en" ? "th" : "en")}
      disabled={isPending} aria-busy={isPending} aria-label={`${dictionary.common.language} ${locale === "en" ? "TH" : "EN"}`} title={dictionary.common.language}>
      <Languages size={18} /><span>{locale === "en" ? "TH" : "EN"}</span>
    </button>
  );
}
