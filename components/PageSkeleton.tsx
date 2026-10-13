export function StocksSkeleton({ count = 6 }: { count?: number }) {
  return <section aria-busy="true"><div className="section-heading"><div className="skeleton-block w-40 h-6" /></div><div className="quote-toolbar" />{Array.from({ length: count }, (_, i) => <div className="daily-stock-row" key={i}><div className="stock-identity"><span className="skeleton-block h-9 w-9 shrink-0" /><span className="skeleton-block h-9 w-24" /></div><span className="stock-quote-time skeleton-block h-4" /><span className="skeleton-block h-9 w-20 justify-self-end" /><span className="skeleton-block h-6 w-6 justify-self-center" /></div>)}</section>;
}

export function DigestSkeleton() {
  return <section className="digest-section" aria-busy="true"><div className="section-heading"><div className="skeleton-block w-36 h-6" /></div><div className="skeleton-story"><div className="skeleton-block" /><div className="skeleton-block" /><div className="skeleton-block" /></div></section>;
}

export default function PageSkeleton({ news = false, watchlist = false }: { news?: boolean; watchlist?: boolean }) {
  return <div className="daily-page" aria-busy="true" aria-label="Loading">
    <div className="page-heading"><div className="skeleton-heading"><div className="skeleton-block" /><div className="skeleton-block" /><div className="skeleton-block" /></div></div>
    {news ? <div className="digest-full skeleton-news">{[0, 1, 2].map((item) => <div className="skeleton-story" key={item}><div className="skeleton-block" /><div className="skeleton-block" /><div className="skeleton-block" /><div className="skeleton-block" /></div>)}</div> : watchlist ? <StocksSkeleton count={20} /> : <>
      <div className="today-layout"><StocksSkeleton /><DigestSkeleton /></div>
      <div className="market-section"><div className="section-heading"><div className="skeleton-block w-40 h-6" /></div><div className="chart-placeholder skeleton-block" /></div>
    </>}
  </div>;
}
