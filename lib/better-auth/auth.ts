import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { connecttoDatabase } from "@/database/mongoose";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";

let authInstance: ReturnType<typeof betterAuth> | null = null;

export const getAuth = async () => {
  if (authInstance) return authInstance;

  const mongoose = await connecttoDatabase();
  const db = mongoose.connection.db;

  if (!db) throw new Error("Mongodb connection not found");

  authInstance = betterAuth({
    database: mongodbAdapter(db as any),

    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    trustedOrigins: process.env.TRUSTED_ORIGINS
      ? process.env.TRUSTED_ORIGINS.split(",")
      : [],
    emailAndPassword: {
      enabled: true,
      disableSignUp: false,
      requireEmailVerification: true, // Still require verification, but handled via OTP
      minPasswordLength: 8,
      maxPasswordLength: 128,
      autoSignIn: false,
    },
    emailVerification: {
      autoSignInAfterVerification: true,
    },
    plugins: [
      nextCookies(),
      emailOTP({
        async sendVerificationOTP({ email, otp, type }) {
          try {
            console.log("Attempting to send OTP email to:", email);
            const { sendOTPEmail } = await import("@/lib/nodemailer");
            await sendOTPEmail({
              email,
              otp,
            });
            console.log("OTP email sent successfully to:", email);
          } catch (error) {
            console.error("Error sending OTP email:", error);
          }
        },
      }),
    ],
  });

  return authInstance;
};

export const auth = await getAuth();
