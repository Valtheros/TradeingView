export default function Loading() {
  return <div className="daily-page" aria-busy="true" aria-label="Loading">
    <span className="skeleton-block h-11 w-32" />
    <div className="stock-detail-heading"><div className="skeleton-heading"><span className="skeleton-block" /><span className="skeleton-block" /></div><span className="skeleton-block h-12 w-24" /></div>
    <div className="stock-detail-actions"><span className="skeleton-block w-40 h-11" /><span className="skeleton-block w-24 h-11" /></div>
    <span className="skeleton-block h-4 w-48" />
    <section><div className="section-heading"><span className="skeleton-block w-16 h-6" /><span className="skeleton-block w-36 h-11" /></div><div className="skeleton-block" style={{ height: 460 }} /></section>
    <div className="detail-tabs">{[0, 1, 2].map(i => <span className="skeleton-block h-11 w-24" key={i} />)}</div>
  </div>;
}
