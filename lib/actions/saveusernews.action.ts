"use server";

import { connecttoDatabase } from "@/database/mongoose";
import { sanitizeSummaryHtml } from "@/lib/sanitize";
import { DEFAULT_LOCALE, type Locale, isLocale } from "@/lib/i18n";
import type { Filter, ObjectId } from "mongodb";

const COLLECTION_NAME = "news_summaries";

type NewsSummaryDocument = {
  _id?: ObjectId;
  userId: string;
  email: string;
  name?: string;
  locale?: Locale;
  readableDate: string;
  dateISO: string;
  newsContent: string;
  createdAt?: Date;
  updatedAt?: Date;
};

const getSummaryFilter = (
  userId: string,
  locale: Locale
): Filter<NewsSummaryDocument> =>
  locale === DEFAULT_LOCALE
    ? {
        userId,
        $or: [{ locale: DEFAULT_LOCALE }, { locale: { $exists: false } }],
      }
    : { userId, locale };

const mapSummary = (doc: NewsSummaryDocument): UserNewsSummary => ({
  id: doc._id?.toString() ?? `${doc.userId}-${doc.dateISO}`,
  userId: doc.userId,
  email: doc.email,
  name: doc.name,
  locale: isLocale(doc.locale) ? doc.locale : DEFAULT_LOCALE,
  readableDate: doc.readableDate,
  dateISO: doc.dateISO,
  newsContent: sanitizeSummaryHtml(doc.newsContent),
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

export const saveUserNewsSummary = async ({
  userId,
  email,
  name,
  locale = DEFAULT_LOCALE,
  readableDate,
  dateISO,
  newsContent,
}: SaveSummaryParams) => {
  if (!userId || !email || !newsContent) return false;
  const summaryLocale = isLocale(locale) ? locale : DEFAULT_LOCALE;

  try {
    const mongoose = await connecttoDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB connection not found");

    const now = new Date();
    await db.collection<NewsSummaryDocument>(COLLECTION_NAME).updateOne(
      getSummaryFilter(userId, summaryLocale),
      {
        $set: {
          userId,
          email,
          name,
          locale: summaryLocale,
          readableDate,
          dateISO,
          newsContent: sanitizeSummaryHtml(newsContent),
        },
        $setOnInsert: { createdAt: now },
        $currentDate: { updatedAt: true },
      },
      { upsert: true }
    );

    return true;
  } catch (err) {
    console.error("saveUserNewsSummary error:", err);
    return false;
  }
};

export const getRecentNewsSummaries = async (
  userId: string,
  limit = 5,
  locale: Locale = DEFAULT_LOCALE
): Promise<UserNewsSummary[]> => {
  if (!userId) return [];
  const summaryLocale = isLocale(locale) ? locale : DEFAULT_LOCALE;

  try {
    const mongoose = await connecttoDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB connection not found");

    const docs = await db
      .collection<NewsSummaryDocument>(COLLECTION_NAME)
      .find(getSummaryFilter(userId, summaryLocale))
      .sort({ dateISO: -1, updatedAt: -1 })
      .limit(limit)
      .toArray();

    return docs.map(mapSummary);
  } catch (err) {
    console.error("getRecentNewsSummaries error:", err);
    return [];
  }
};

export const getLates_tNewsSummary = async (
  userId: string,
  locale: Locale = DEFAULT_LOCALE
): Promise<UserNewsSummary | null> => {
  const summaries = await getRecentNewsSummaries(userId, 1, locale);
  return summaries[0] ?? null;
};
