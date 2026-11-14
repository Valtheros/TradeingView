"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { useLanguage } from "./LanguageProvider";
import { searchPublicStocks } from "@/lib/public-stocks";
import StockLink from "./StockLink";
import StockLogo from "./StockLogo";
import WatchlistButton from "./WatchlistButton";

export default function GuestSearchDialog({ onClose }: { onClose: () => void }) {
  const { dictionary } = useLanguage();
  const [term, setTerm] = useState("");
  const stocks = searchPublicStocks(term);
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="stock-search-dialog max-md:translate-x-0 max-md:translate-y-0">
    <DialogTitle>{dictionary.nav.search}</DialogTitle><DialogDescription className="sr-only">{dictionary.guest.catalogLimit}</DialogDescription>
    <label className="stock-search-field"><Search size={20} /><input autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={80} value={term} onChange={event => setTerm(event.target.value)} placeholder={dictionary.searchCommand.placeholder} aria-label={dictionary.searchCommand.placeholder} /></label>
    <div className="stock-search-results"><p className="section-meta">{dictionary.guest.catalogLimit}</p>
      {stocks.length === 0 ? <p className="empty-message">{dictionary.searchCommand.noResults}</p> : <ul>{stocks.map(stock => <li className="stock-search-row" key={stock.symbol}>
        <StockLink href={`/stocks/${stock.symbol}`} onClick={onClose}><StockLogo logo={null} /><span><strong>{stock.symbol}</strong><small>{stock.name}</small><small>{stock.exchange}</small></span></StockLink>
        <WatchlistButton symbol={stock.symbol} company={stock.name} isInWatchlist={false} type="icon" onAuthRequired={onClose} />
      </li>)}</ul>}
    </div>
  </DialogContent></Dialog>;
}
