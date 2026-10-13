"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Newspaper, RefreshCw } from "lucide-react";
import { getDigestState, queueDigest, type DigestState } from "@/lib/actions/digest.actions";
import { useLanguage } from "./LanguageProvider";

export default function DigestPanel({ initial, preview = false }: { initial: DigestState; preview?: boolean }) {
  const { locale, dictionary } = useLanguage();
  const copy = dictionary.daily;
  const [state, setState] = useState(initial);
  const [attempt, setAttempt] = useState(0);
  const [stopped, setStopped] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!initial.pending) return;
    let cancelled = false;
    let ticks = 0;
    let busy = false;
    queueDigest(locale).catch(() => { if (!cancelled) setError(true); });
    const timer = setInterval(async () => {
      if (document.hidden || !navigator.onLine || busy) return;
      busy = true;
      ticks++;
      try {
        const next = await getDigestState(locale, preview ? "preview" : "full");
        if (!cancelled) { setState(next); setError(false); }
        if (!next.pending) clearInterval(timer);
      } catch { if (!cancelled) setError(true); }
      finally {
        busy = false;
        if (ticks >= 8) { clearInterval(timer); if (!cancelled) setStopped(true); }
      }
    }, 15_000);
    // A bounded session also stops while the app is hidden or offline.
    const deadline = setTimeout(() => { clearInterval(timer); if (!cancelled) setStopped(true); }, 120_000);
    return () => { cancelled = true; clearInterval(timer); clearTimeout(deadline); };
  }, [initial.pending, locale, attempt, preview]);

  const latest = state.summaries[0];
  return <section className={preview ? "digest-section" : "news-section"}>
    <div className="section-heading"><h2 className="skeleton-text"><Newspaper size={20} />{preview ? copy.latestDigest : copy.news}</h2>
      {preview && latest && <Link className="text-action" href="/news">{copy.readDigest}<ArrowUpRight size={17} /></Link>}
    </div>
    {state.pending && <div className="digest-status" role="status">
      <p>{error ? copy.newsError : state.fallback ? copy.fallback : stopped ? copy.waitingLater : copy.waiting}</p>
      {(error || stopped) && <button className="text-action" onClick={() => { setStopped(false); setError(false); setAttempt((n) => n + 1); }}><RefreshCw size={16} />{copy.checkNews}</button>}
    </div>}
    {latest ? <article className="digest-article">
      <div className="digest-meta skeleton-text"><span>{latest.date}</span><span>{latest.locale.toUpperCase()}</span></div>
      <div className={preview ? "summary-html digest-preview" : "summary-html digest-full"} dangerouslySetInnerHTML={{ __html: latest.html }} />
      {preview && <Link href="/news" className="digest-read-link">{copy.readDigest}<ArrowUpRight size={18} /></Link>}
    </article> : <div className="empty-digest"><Newspaper size={28} /><p>{copy.emptyNews}</p></div>}
    {!preview && state.summaries.length > 1 && <section className="previous-digests"><h2>{dictionary.news.previous}</h2>
      {state.summaries.slice(1).map((digest) => <details key={digest.id} className="previous-digest"><summary>{digest.date}<span>{copy.readPrevious}</span></summary><div className="summary-html digest-full" dangerouslySetInnerHTML={{ __html: digest.html }} /></details>)}
    </section>}
  </section>;
}
