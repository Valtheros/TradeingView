"use client";

import { useLanguage } from "./LanguageProvider";
import { usePathname } from "next/navigation";

export function AuthSkeleton() {
  const { dictionary } = useLanguage();
  const pathname = usePathname();
  return <div aria-busy="true" aria-label={dictionary.common.loading}>
    <span className="skeleton-block h-8 w-40 mb-8" />
    {Array.from({ length: pathname === "/sign-up" ? 7 : 2 }, (_, i) => <div className="mb-5 grid gap-3" key={i}><span className="skeleton-block h-4 w-24" /><span className="skeleton-block h-12 w-full" /></div>)}
    <span className="skeleton-block h-12 w-full mt-8" />
  </div>;
}

export function StocksSkeleton({ count = 6, compact = false }: { count?: number; compact?: boolean }) {
  return <section className="stocks-section" aria-busy="true">
    <div className="section-heading"><span className="skeleton-block w-40 h-6" /><span className="skeleton-block w-16 h-4" /></div>
    <div className="quote-toolbar"><span className="skeleton-block w-28 h-3" /><span className="skeleton-block w-5 h-5 mr-3" /></div>
    {compact ? <div className="compact-stock-grid">{Array.from({ length: count }, (_, i) => <div className="stock-tile" key={i}><div className="stock-tile-link">
      <div className="stock-identity"><span className="skeleton-block stock-logo" /><div className="stock-name"><span className="skeleton-block w-10 h-4" /><span className="skeleton-block w-12 h-3 mt-2" /></div></div>
      <div className="quote-value"><span className="skeleton-block quote-placeholder" /><span className="skeleton-block change-placeholder" /></div>
    </div><span className="skeleton-block absolute bottom-[18px] right-[18px] h-5 w-5" /></div>)}</div> : <><div className="stock-column-labels"><span className="skeleton-block w-12 h-3" /><span className="skeleton-block w-20 h-3" /><span className="skeleton-block w-20 h-3 justify-self-end" /><span /></div>
    {Array.from({ length: count }, (_, i) => <div className="daily-stock-row" key={i}>
      <div className="stock-identity"><span className="skeleton-block stock-logo" /><div className="stock-name"><span className="skeleton-block w-14 h-4" /><span className="skeleton-block w-24 h-3 mt-2" /></div></div>
      <span className="stock-quote-time skeleton-block h-3 w-24" />
      <div className="quote-value"><span className="skeleton-block quote-placeholder" /><span className="skeleton-block change-placeholder" /></div>
      <span className="skeleton-block h-5 w-5 justify-self-center" />
    </div>)}</>}
  </section>;
}

export function DigestSkeleton() {
  return <section className="digest-section" aria-busy="true"><div className="section-heading"><span className="skeleton-block w-36 h-6" /></div>
    <div className="digest-meta"><span className="skeleton-block w-32 h-3" /><span className="skeleton-block w-6 h-3" /></div>
    <div className="skeleton-preview">{[0, 1, 2, 3, 4].map(i => <span className="skeleton-block h-4" key={i} />)}</div>
    <div className="digest-read-link"><span className="skeleton-block w-24 h-4" /><span className="skeleton-block w-4 h-4" /></div>
  </section>;
}

export function StockSkeleton() {
  const { dictionary } = useLanguage();
  return <div className="daily-page stock-details-page" aria-busy="true" aria-label={dictionary.common.loading}>
    <span className="skeleton-block h-11 w-24" />
    <div className="stock-detail-heading"><div className="stock-detail-identity"><span className="stock-logo skeleton-block" /><div className="skeleton-heading"><span className="skeleton-block" /><span className="skeleton-block" /></div></div><span className="skeleton-block h-12 w-24" /></div>
    <div className="stock-detail-actions"><span className="skeleton-block w-40 h-11" /><span className="skeleton-block w-24 h-11" /></div>
    <span className="skeleton-block h-4 w-48" />
    <section className="stock-chart"><div className="section-heading"><span className="skeleton-block w-16 h-6" /><span className="skeleton-block w-36 h-11" /></div><div className="chart-surface skeleton-block" style={{ height: 460 }} /></section>
    <div className="detail-tabs">{[0, 1, 2].map(i => <span className="skeleton-block h-11 w-24" key={i} />)}</div>
  </div>;
}

export default function PageSkeleton({ news = false, watchlist = false }: { news?: boolean; watchlist?: boolean }) {
  const { dictionary } = useLanguage();
  const today = !news && !watchlist;
  return <div className={`daily-page${news ? " news-page" : today ? " today-page" : ""}`} aria-busy="true" aria-label={dictionary.common.loading}>
    <div className={`page-heading${today ? " today-heading" : ""}`}><div className="skeleton-heading"><span className="skeleton-block" /><span className="skeleton-block" />{news && <span className="skeleton-block" />}</div></div>
    {news ? <section><div className="section-heading"><span className="skeleton-block w-36 h-6" /></div><div className="digest-meta"><span className="skeleton-block w-32 h-3" /><span className="skeleton-block w-6 h-3" /></div>
      <div className="digest-full skeleton-news">{[0, 1, 2].map(item => <div className="skeleton-news-story" key={item}><span className="skeleton-block h-6 w-3/4" /><span className="skeleton-block h-14" /><span className="skeleton-block h-14" /><span className="skeleton-block h-12" /></div>)}</div>
    </section> : watchlist ? <StocksSkeleton count={20} /> : <>
      <StocksSkeleton compact />
      <div className="today-secondary"><DigestSkeleton /><div className="market-section"><div className="section-heading"><span className="skeleton-block w-40 h-6" /></div><div className="chart-placeholder skeleton-block" /></div></div>
    </>}
  </div>;
}
