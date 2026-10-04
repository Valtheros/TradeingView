"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Search, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { searchStocks } from "@/lib/actions/finnhub.actions";
import { useLanguage } from "./LanguageProvider";
import WatchlistButton from "./WatchlistButton";

const SearchContext = createContext<() => void>(() => {});

export function SearchProvider({ children }: { children: ReactNode }) {
  const { dictionary } = useLanguage();
  const copy = dictionary.searchCommand;
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [stocks, setStocks] = useState<StockWithWatchlistStatus[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const results = await searchStocks(term.trim());
        if (!cancelled) setStocks(results);
      } catch {
        if (!cancelled) setStocks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, term.trim() ? 350 : 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [open, term]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setLoading(true);
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, []);

  return <SearchContext.Provider value={() => { setLoading(true); setOpen(true); }}>
    {children}
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="stock-search-dialog max-md:translate-x-0 max-md:translate-y-0">
        <DialogTitle>{dictionary.nav.search}</DialogTitle>
        <DialogDescription className="sr-only">{copy.placeholder}</DialogDescription>
        <label className="stock-search-field"><Search size={20} />
          <input autoComplete="off" autoCapitalize="characters" spellCheck={false} value={term} onChange={(e) => { setLoading(true); setTerm(e.target.value); }} placeholder={copy.placeholder} aria-label={copy.placeholder} />
        </label>
        <div className="stock-search-results" aria-busy={loading}>
          <p className="section-meta">{term.trim() ? copy.results : copy.popular}</p>
          {loading ? <div role="status" aria-label={copy.loading}>{Array.from({ length: 6 }, (_, i) => <div className="search-placeholder" key={i}><span className="skeleton-block" /><span className="skeleton-block" /></div>)}</div>
            : stocks.length === 0 ? <p className="empty-message">{copy.noResults}</p>
            : <ul>{stocks.map((stock) => <li key={stock.symbol} className="stock-search-row">
                <Link href={`/stocks/${encodeURIComponent(stock.symbol)}`} onClick={() => setOpen(false)}>
                  <TrendingUp size={20} /><span><strong>{stock.symbol}</strong><small>{stock.name}</small><small>{stock.exchange}</small></span>
                </Link>
                <WatchlistButton symbol={stock.symbol} company={stock.name} isInWatchlist={stock.isInWatchlist} type="icon" onWatchlistChange={(symbol, added) => setStocks((items) => items.map((s) => s.symbol === symbol ? { ...s, isInWatchlist: added } : s))} />
              </li>)}</ul>}
        </div>
      </DialogContent>
    </Dialog>
  </SearchContext.Provider>;
}

export default function SearchCommand({ label, renderAs = "button", className = "" }: { label?: string; renderAs?: "button" | "text"; className?: string; initialStocks?: StockWithWatchlistStatus[] }) {
  const open = useContext(SearchContext);
  const { dictionary } = useLanguage();
  return <button type="button" onClick={open} className={`${renderAs === "text" ? "nav-search" : "action-button"} ${className}`}><Search size={19} /><span>{label || dictionary.searchCommand.addStock}</span></button>;
}
