"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import dynamic from "next/dynamic";
import { useLanguage } from "./LanguageProvider";
const SearchDialog = dynamic(() => import("./SearchDialog"), { ssr: false, loading: () => <div className="dialog-loading-backdrop" role="status" aria-label="Loading"><div className="dialog-loading-panel"><span className="skeleton-block h-6 w-24" /><span className="skeleton-block h-12 w-full" />{[0, 1, 2].map((i) => <span className="skeleton-block h-14 w-full" key={i} />)}</div></div> });

const SearchContext = createContext<() => void>(() => {});

export function SearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, []);

  return <SearchContext.Provider value={() => setOpen(true)}>
    {children}
    {open && <SearchDialog onClose={() => setOpen(false)} />}
  </SearchContext.Provider>;
}

export default function SearchCommand({ label, renderAs = "button", className = "" }: { label?: string; renderAs?: "button" | "text"; className?: string; initialStocks?: StockWithWatchlistStatus[] }) {
  const open = useContext(SearchContext);
  const { dictionary } = useLanguage();
  return <button type="button" onClick={open} className={`${renderAs === "text" ? "nav-search" : "action-button"} ${className}`}><Search size={19} /><span>{label || dictionary.searchCommand.addStock}</span></button>;
}
