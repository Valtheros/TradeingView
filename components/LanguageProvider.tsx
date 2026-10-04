"use client";

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  dictionaries,
  getDictionary,
  type Dictionary,
  type Locale,
} from "@/lib/i18n";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

type LanguageContextValue = {
  locale: Locale;
  dictionary: Dictionary;
  setLocale: (locale: Locale) => void;
  isPending: boolean;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const value = useMemo<LanguageContextValue>(() => {
    const setLocale = (nextLocale: Locale) => {
      setLocaleState(nextLocale);
      document.cookie = `${LOCALE_COOKIE}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = nextLocale;
      document.documentElement.dataset.locale = nextLocale;
      startTransition(() => router.refresh());
    };

    return {
      locale,
      dictionary: getDictionary(locale),
      setLocale,
      isPending,
    };
  }, [locale, isPending, router]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      locale: DEFAULT_LOCALE,
      dictionary: dictionaries[DEFAULT_LOCALE],
      setLocale: () => undefined,
      isPending: false,
    };
  }

  return context;
}
