"use server";

import { connecttoDatabase } from "@/database/mongoose";

const COLLECTION_NAME = "news_summaries";

const mapSummary = (doc: any): UserNewsSummary => ({
  id: doc._id?.toString() ?? `${doc.userId}-${doc.dateISO}`,
  userId: doc.userId,
  email: doc.email,
  name: doc.name,
  readableDate: doc.readableDate,
  dateISO: doc.dateISO,
  newsContent: doc.newsContent,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

export const saveUserNewsSummary = async ({
  userId,
  email,
  name,
  readableDate,
  dateISO,
  newsContent,
}: SaveSummaryParams) => {
  if (!userId || !email || !newsContent) return false;

  try {
    const mongoose = await connecttoDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB connection not found");

    const now = new Date();
    await db.collection(COLLECTION_NAME).updateOne(
      { userId },
      {
        $set: {
          userId,
          email,
          name,
          readableDate,
          dateISO,
          newsContent,
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
  limit = 5
): Promise<UserNewsSummary[]> => {
  if (!userId) return [];

  try {
    const mongoose = await connecttoDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB connection not found");

    const docs = await db
      .collection(COLLECTION_NAME)
      .find({ userId })
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
  userId: string
): Promise<UserNewsSummary | null> => {
  const summaries = await getRecentNewsSummaries(userId, 1);
  return summaries[0] ?? null;
};
