"use server";

import { getCurrentSession } from "@/lib/better-auth/session";
import { summaryPreview } from "@/lib/sanitize";
import { getRecentNewsSummaries } from "./saveusernews.action";
import { inngest } from "@/lib/inngest/client";
import { isLocale, type Locale } from "@/lib/i18n";

export type Digest = { id: string; date: string; html: string; locale: Locale; updatedAt: string | null };
export type DigestState = { summaries: Digest[]; pending: boolean; fallback: boolean };

async function currentUser() {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error("Unauthorized");
  return session.user;
}

export async function getDigestState(locale: Locale, view: "full" | "preview" = "full"): Promise<DigestState> {
  if (!isLocale(locale)) throw new Error("Invalid locale");
  if (view !== "full" && view !== "preview") throw new Error("Invalid digest view");
  const user = await currentUser();
  const limit = view === "preview" ? 1 : 5;
  let summaries = await getRecentNewsSummaries(user.id, limit, locale);
  const pending = summaries.length === 0;
  if (pending && locale === "th") summaries = await getRecentNewsSummaries(user.id, limit, "en");
  return {
    pending, fallback: pending && summaries.length > 0,
    summaries: summaries.map((summary) => ({
      id: summary.id, date: summary.readableDate,
      html: view === "preview" ? summaryPreview(summary.newsContent, summary.locale || "en") : summary.newsContent,
      locale: summary.locale || "en",
      updatedAt: summary.updatedAt?.toISOString() || null,
    })),
  };
}

export async function queueDigest(locale: Locale) {
  if (!isLocale(locale)) throw new Error("Invalid locale");
  const user = await currentUser();
  const existing = await getRecentNewsSummaries(user.id, 1, locale);
  if (existing.length) return;
  // Inngest deduplicates repeated requests across page visits and server instances.
  await inngest.send({
    id: `digest-${user.id}-${locale}-${Math.floor(Date.now() / 900_000)}`,
    name: "app/news.daily.fetched", data: { userId: user.id, locales: [locale] },
  });
}
