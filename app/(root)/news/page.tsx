import DigestPanel from "@/components/DigestPanel";
import { getDigestState } from "@/lib/actions/digest.actions";
import { getServerLocale } from "@/lib/i18n-server";
import { getDictionary } from "@/lib/i18n";
import { getCurrentSession } from "@/lib/better-auth/session";
import { authHref } from "@/lib/auth-navigation";
import { redirect } from "next/navigation";

export default async function NewsPage() {
  if (!(await getCurrentSession())?.user) redirect(authHref("/sign-in", "/news"));
  const locale = await getServerLocale();
  const dictionary = getDictionary(locale);
  const digest = await getDigestState(locale);
  return <div className="daily-page news-page"><div className="page-heading"><div><p className="section-meta skeleton-text">{dictionary.daily.usMarket}</p><h1 className="skeleton-text">{dictionary.daily.news}</h1><p className="page-subtitle skeleton-text">{dictionary.news.description}</p></div></div><DigestPanel key={`${locale}:${digest.summaries[0]?.updatedAt ?? "pending"}`} initial={digest} /></div>;
}
