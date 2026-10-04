"use client";

import { useLanguage } from "./LanguageProvider";

export default function LanguageSurface({ children }: { children: React.ReactNode }) {
  const { isPending, dictionary } = useLanguage();
  return <div data-language-pending={isPending || undefined} aria-busy={isPending}>
    {isPending && <span className="sr-only" role="status">{dictionary.common.loading}</span>}
    {children}
  </div>;
}
