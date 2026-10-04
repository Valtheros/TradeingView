export default function Loading() {
  return <div className="daily-page" aria-busy="true" aria-label="Loading">
    <div className="page-heading"><div className="skeleton-heading"><div className="skeleton-block" /><div className="skeleton-block" /></div></div>
    <section><div className="section-heading"><span className="skeleton-block w-40 h-6" /><span className="skeleton-block w-24 h-11" /></div><div className="quote-toolbar" />
      {Array.from({ length: 6 }, (_, i) => <div className="daily-stock-row" key={i}><div className="skeleton-block h-10 w-full" /><span className="stock-quote-time skeleton-block h-4" /><span className="skeleton-block h-9" /><span className="skeleton-block h-8" /></div>)}
    </section>
  </div>;
}
