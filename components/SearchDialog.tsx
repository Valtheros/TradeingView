"use client";

import { useEffect, useState } from "react";
import { Search, TrendingUp } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { searchStocks } from "@/lib/actions/finnhub.actions";
import { useLanguage } from "./LanguageProvider";
import WatchlistButton from "./WatchlistButton";
import StockLink from "./StockLink";

export default function SearchDialog({ onClose }: { onClose: () => void }) {
  const { dictionary } = useLanguage();
  const copy = dictionary.searchCommand;
  const [term, setTerm] = useState("");
  const [stocks, setStocks] = useState<StockWithWatchlistStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const results = await searchStocks(term.trim());
        if (!cancelled) { setStocks(results); setError(false); }
      } catch { if (!cancelled) { setStocks([]); setError(true); } }
      finally { if (!cancelled) setLoading(false); }
    }, term.trim() ? 150 : 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [term, attempt]);

  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="stock-search-dialog max-md:translate-x-0 max-md:translate-y-0">
    <DialogTitle>{dictionary.nav.search}</DialogTitle><DialogDescription className="sr-only">{copy.placeholder}</DialogDescription>
    <label className="stock-search-field"><Search size={20} /><input autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={80} value={term} onChange={(event) => { setLoading(true); setTerm(event.target.value); }} placeholder={copy.placeholder} aria-label={copy.placeholder} /></label>
    <div className="stock-search-results" aria-busy={loading}><p className="section-meta">{term.trim() ? copy.results : copy.popular}</p>
      {loading ? <div role="status" aria-label={copy.loading}>{Array.from({ length: 6 }, (_, i) => <div className="search-placeholder" key={i}><span className="skeleton-block" /><span className="skeleton-block" /></div>)}</div>
        : error ? <div className="load-failure" role="alert"><p>{dictionary.daily.loadError}</p><button className="action-button secondary" onClick={() => { setLoading(true); setAttempt((value) => value + 1); }}>{dictionary.daily.retry}</button></div>
        : stocks.length === 0 ? <p className="empty-message">{copy.noResults}</p>
        : <ul>{stocks.map((stock) => <li key={stock.symbol} className="stock-search-row"><StockLink href={`/stocks/${encodeURIComponent(stock.symbol)}`} onClick={onClose}><TrendingUp size={20} /><span><strong>{stock.symbol}</strong><small>{stock.name}</small><small>{stock.exchange}</small></span></StockLink><WatchlistButton symbol={stock.symbol} company={stock.name} isInWatchlist={stock.isInWatchlist} type="icon" onWatchlistChange={(symbol, added) => setStocks((items) => items.map((item) => item.symbol === symbol ? { ...item, isInWatchlist: added } : item))} /></li>)}</ul>}
    </div>
  </DialogContent></Dialog>;
}
