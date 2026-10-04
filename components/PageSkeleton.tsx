export default function PageSkeleton({ news = false }: { news?: boolean }) {
  return <div className="daily-page" aria-busy="true" aria-label="Loading">
    <div className="page-heading"><div className="skeleton-heading"><div className="skeleton-block" /><div className="skeleton-block" /><div className="skeleton-block" /></div></div>
    {news ? <div className="digest-full skeleton-news">{[0, 1, 2].map((item) => <div className="skeleton-story" key={item}><div className="skeleton-block" /><div className="skeleton-block" /><div className="skeleton-block" /><div className="skeleton-block" /></div>)}</div> : <>
      <div className="today-layout"><section><div className="section-heading"><div className="skeleton-block w-40 h-6" /></div><div className="quote-toolbar" />{Array.from({ length: 6 }, (_, i) => <div className="daily-stock-row" key={i}><div className="skeleton-block h-10 w-full" /><div className="skeleton-block h-9" /><div className="skeleton-block h-8" /></div>)}</section><section><div className="section-heading"><div className="skeleton-block w-36 h-6" /></div><div className="skeleton-story"><div className="skeleton-block" /><div className="skeleton-block" /><div className="skeleton-block" /><div className="skeleton-block" /></div></section></div>
      <div className="market-section"><div className="section-heading"><div className="skeleton-block w-40 h-6" /></div><div className="chart-placeholder skeleton-block" /></div>
    </>}
  </div>;
}
