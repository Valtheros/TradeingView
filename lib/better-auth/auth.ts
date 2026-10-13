import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { connecttoDatabase } from "@/database/mongoose";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";
import { sendOTPEmail } from "../nodemailer";
import type { Db } from "mongodb";
import { after } from "next/server";

const createAuthInstance = async () => {
  const mongoose = await connecttoDatabase();
  const db = mongoose.connection.db;

  if (!db) throw new Error("Mongodb connection not found");
  const previewOrigin = process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}` : undefined;

  return betterAuth({
    database: mongodbAdapter(db as Db),

    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: previewOrigin || process.env.BETTER_AUTH_URL,
    trustedOrigins: [
      ...(process.env.TRUSTED_ORIGINS?.split(",").map(origin => origin.trim()).filter(Boolean) || []),
      ...(previewOrigin ? [previewOrigin] : []),
    ],
    rateLimit: {
      enabled: true,
      storage: "database",
    },
    advanced: {
      // Keep email delivery alive on Vercel without exposing account existence through SMTP timing.
      backgroundTasks: { handler: (task) => after(() => task) },
    },
    emailAndPassword: {
      enabled: true,
      disableSignUp: false,
      requireEmailVerification: true, // Still require verification, but handled via OTP
      minPasswordLength: 8,
      maxPasswordLength: 128,
      autoSignIn: false,
      revokeSessionsOnPasswordReset: true,
    },
    emailVerification: {
      autoSignInAfterVerification: true,
    },
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 300,
        allowedAttempts: 3,
        storeOTP: "hashed",
        rateLimit: { window: 60, max: 3 },
        async sendVerificationOTP({ email, otp, type }) {
          await sendOTPEmail({ email, otp, purpose: type === "forget-password" ? "password-reset" : "verification" });
        },
      }),
      nextCookies(),
    ],
  });
};

type AuthInstance = Awaited<ReturnType<typeof createAuthInstance>>;

let authInstance: Promise<AuthInstance> | null = null;

export const getAuth = async (): Promise<AuthInstance> => {
  if (!authInstance) {
    authInstance = createAuthInstance().catch((error) => {
      authInstance = null;
      throw error;
    });
  }
  return authInstance;
};
