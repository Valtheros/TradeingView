import "server-only";
import { connecttoDatabase } from "@/database/mongoose";
import { Watchlist } from "@/database/models/watchlist.model";

export async function getWatchlistSymbolsByEmail(email: string): Promise<string[]> {
  if (!email) return [];
  try {
    const mongoose = await connecttoDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB connection not found");
    const user = await db.collection("user").findOne<{ _id?: unknown; id?: string }>({ email });
    if (!user) return [];
    const userId = user.id || String(user._id || "");
    if (!userId) return [];
    const items = await Watchlist.find({ userId }, { symbol: 1 }).lean();
    return items.map((item) => String(item.symbol));
  } catch (error) {
    console.error("getWatchlistSymbolsByEmail error:", error);
    return [];
  }
}
