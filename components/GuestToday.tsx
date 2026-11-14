"use client";

import GuestMarketData from "./GuestMarketData";
import MarketOverview from "./MarketOverview";
import SearchCommand from "./SearchCommand";
import { useLanguage } from "./LanguageProvider";
import { useAppAccess } from "./AppAccessProvider";

export default function GuestToday() {
  const { dictionary } = useLanguage();
  const { requestSignIn } = useAppAccess();
  return <>
    <div className="guest-search-bar"><SearchCommand label={dictionary.common.search} /><span className="section-meta skeleton-text">{dictionary.guest.catalogLimit}</span></div>
    <GuestMarketData />
    <MarketOverview publicOnly />
    <section className="guest-news"><h2 className="skeleton-text">{dictionary.daily.news}</h2><p>{dictionary.guest.newsDescription}</p><button type="button" className="action-button" onClick={() => requestSignIn("/news")}>{dictionary.signIn.submit}</button></section>
  </>;
}
