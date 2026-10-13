"use server";

import { Watchlist } from "@/database/models/watchlist.model";
import { getCurrentSession } from "../better-auth/session";
import { parseSymbols } from "../quotes";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function currentUser() {
  const session = await getCurrentSession();
  if (!session?.user) redirect("/sign-in");
  return session.user;
}

function stockSymbol(value: unknown) {
  const symbols = parseSymbols([value]);
  if (!symbols) throw new Error("Invalid stock symbol");
  return symbols[0];
}

function refreshWatchlist(symbol: string) {
  revalidatePath("/watchlist");
  revalidatePath("/");
  revalidatePath(`/stocks/${encodeURIComponent(symbol)}`);
}

export const addWatchlistItem = async (symbol: string, company: string) => {
  const user = await currentUser();
  const cleanSymbol = stockSymbol(symbol);
  if (typeof company !== "string" || !company.trim() || company.trim().length > 160) throw new Error("Invalid company name");
  try {

    await Watchlist.updateOne(
      { userId: user.id, symbol: cleanSymbol },
      { $setOnInsert: { company: company.trim(), addedAt: new Date() } },
      { upsert: true, runValidators: true },
    );
  } catch (error) {
    // A concurrent insert of the same unique user/symbol is already a success.
    if ((error as { code?: number })?.code !== 11000) {
      console.error("Error adding to watchlist:", error);
      throw new Error("Failed to add stock to watchlist");
    }
  }
  refreshWatchlist(cleanSymbol);
  return { success: true, message: "Stock added to watchlist" };
};

export const removeFromWatchlist = async (symbol: string) => {
  const user = await currentUser();
  const cleanSymbol = stockSymbol(symbol);
  try {

    // Remove from watchlist
    await Watchlist.deleteOne({
      userId: user.id,
      symbol: cleanSymbol,
    });
    refreshWatchlist(cleanSymbol);

    return { success: true, message: 'Stock removed from watchlist' };
  } catch (error) {
    console.error('Error removing from watchlist:', error);
    throw new Error('Failed to remove stock from watchlist');
  }
};

// Get user's watchlist
export const getUserWatchlist = async (): Promise<{ symbol: string; company: string }[]> => {
  const user = await currentUser();
  try {

    const watchlist = await Watchlist.find({ userId: user.id }, { symbol: 1, company: 1, _id: 0 })
      .sort({ addedAt: -1 })
      .lean();

    return watchlist;
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    throw new Error('Failed to fetch watchlist');
  }
}
