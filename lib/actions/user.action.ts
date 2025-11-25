"use server";

import { connecttoDatabase } from "@/database/mongoose";
import { inngest } from "../inngest/client";

export const getAllUserForNews = async () => {
  try {
    const mongoose = await connecttoDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error("Mongodb connection not connected");

    const users = await db
      .collection("user")
      .find(
        { email: { $exists: true, $ne: null } },
        { projection: { _id: 1, id: 1, email: 1, name: 1 } }
      )
      .toArray();

    return users
      .filter((user) => user.email && user.name)
      .map((user) => ({
        id: user.id || user._id?.toString() || "",
        email: user.email,
        name: user.name,
      }));
  } catch (error) {
    console.error("Error fetching users for news", error);
    return [];
  }
};

export const Fetchnews = async (userId?: string) => {
  try {
    await inngest.send({
      name: "app/news.daily.fetched",
      data: { userId },
    });
  } catch (error) {
    console.log("Fetchnews failed", error);
    return { success: false, error: "Fetchnews failed" };
  }
};
