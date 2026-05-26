import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { getAuth } from '@/lib/better-auth/auth';
import { getRecentNewsSummaries } from '@/lib/actions/saveusernews.action';

const SummaryPage = async () => {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/sign-in');

  const summaries = await getRecentNewsSummaries(session.user.id, 5);
  const latest = summaries[0];
  const previous = summaries.slice(1);

  const lastUpdated =
    latest?.updatedAt?.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) ??
    latest?.readableDate ??
    null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.45em] text-yellow-500">Daily digest</p>
          <h1 className="text-3xl font-semibold text-gray-50">Summary</h1>
          <p className="text-gray-400">AI-crafted recap of the latest news tailored to your watchlist.</p>
        </div>
        <div className="rounded-xl border border-gray-700/70 bg-gray-900/40 px-4 py-3 text-sm text-gray-400">
          <p className="font-medium text-gray-300">{session.user.name || session.user.email}</p>
          <p>{lastUpdated ? `Last updated ${lastUpdated}` : 'No summary yet'}</p>
        </div>
      </div>

      {latest ? (
        <section className="rounded-2xl border border-gray-800 bg-gray-900/40 shadow-2xl shadow-black/30">
          <header className="border-b border-gray-800 px-6 py-4">
            <p className="text-sm text-gray-400">Generated for {latest.readableDate}</p>
          </header>
          <div className="summary-html px-6 py-6" dangerouslySetInnerHTML={{ __html: latest.newsContent }} />
        </section>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-900/40 p-10 text-center text-gray-400">
          We haven&rsquo;t generated a summary for you yet. Check back after the next scheduled digest.
        </div>
      )}

      {previous.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-100">Previous digests</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {previous.map((summary: UserNewsSummary) => (
              <article
                key={summary.id}
                className="rounded-xl border border-gray-800 bg-gray-900/20 p-5 transition hover:border-gray-700"
              >
                <div className="mb-3 flex items-center justify-between text-sm text-gray-500">
                  <span>{summary.readableDate}</span>
                  <span>{summary.updatedAt?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
                <div
                  className="summary-preview line-clamp-4 text-sm leading-relaxed text-gray-300"
                  dangerouslySetInnerHTML={{ __html: summary.newsContent }}
                />
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default SummaryPage;

