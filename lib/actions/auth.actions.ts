"use server";
import { getAuth } from "@/lib/better-auth/auth";
import { inngest } from "../inngest/client";
import { headers, cookies } from "next/headers";
import { connecttoDatabase } from "@/database/mongoose";
import { checkRateLimit } from "@/database/models/rateLimit.model";

type RequestHeaders = Awaited<ReturnType<typeof headers>>;
type AuthApi = Awaited<ReturnType<typeof getAuth>>["api"];
type EmailOtpApi = AuthApi & {
  sendVerificationOTP: (params: {
    body: { email: string; type: "email-verification" };
    headers: RequestHeaders;
  }) => Promise<unknown>;
  verifyEmailOTP: (params: {
    body: { email: string; otp: string };
    headers: RequestHeaders;
  }) => Promise<unknown>;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unexpected error";

const getEmailOtpApi = async () => {
  const auth = await getAuth();
  return auth.api as EmailOtpApi;
};

export const signUpWithEmail = async ({
  email,
  password,
  fullName,
  country,
  investmentGoals,
  riskTolerance,
  preferredIndustry,
}: SignUpFormData) => {
  try {
    const auth = await getAuth();
    const response = await auth.api.signUpEmail({
      body: { email: email, password: password, name: fullName },
    });

    if (response) {
      (await cookies()).set("email_to_verify", email, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60, // 1 hour
        path: "/",
      });

      // Explicitly send the verification OTP
      try {
        const emailOtpApi = auth.api as EmailOtpApi;
        await emailOtpApi.sendVerificationOTP({
          body: { email, type: "email-verification" },
          headers: await headers(),
        });
      } catch (otpError) {
        console.error("Failed to send initial OTP:", otpError);
        // We don't fail the signup if OTP fails, user can resend later
      }

      await inngest.send({
        name: "app/user.created",
        data: {
          email: email,
          name: fullName,
          country: country,
          investmentGoals: investmentGoals,
          riskTolerance: riskTolerance,
          preferredIndustry: preferredIndustry,
        },
      });
    }
    return { success: true, data: response };
  } catch (error: unknown) {
    console.log("Sign up failed", error);
    return { success: false, error: getErrorMessage(error) };
  }
};

export const signOut = async () => {
  try {
    const auth = await getAuth();
    await auth.api.signOut({
      headers: await headers(),
    });
    return { success: true, data: null };
  } catch (error: unknown) {
    console.log("Sign out failed", error);
    return { success: false, error: getErrorMessage(error) };
  }
};

export const signInWithEmail = async ({ email, password }: SignInFormData) => {
  try {
    const auth = await getAuth();
    const response = await auth.api.signInEmail({
      body: { email: email, password: password },
    });

    return { success: true, data: response };
  } catch (error: unknown) {
    console.error("Sign In failed", error);
    return { success: false, error: getErrorMessage(error) };
  }
};

export const verifyEmailWithOtp = async (otp: string) => {
  const cookieStore = await cookies();
  const email = cookieStore.get("email_to_verify")?.value;

  if (!email) {
    return { success: false, error: "No verification session found" };
  }

  try {
    const emailOtpApi = await getEmailOtpApi();
    const response = await emailOtpApi.verifyEmailOTP({
      body: { email, otp },
      headers: await headers(),
    });

    cookieStore.delete("email_to_verify");
    return { success: true, data: response };
  } catch (error: unknown) {
    console.error("Verification failed", error);
    return { success: false, error: getErrorMessage(error) };
  }
};

export const resendVerificationOtp = async () => {
  const cookieStore = await cookies();
  const email = cookieStore.get("email_to_verify")?.value;

  if (!email) {
    return { success: false, error: "No verification session found" };
  }

  try {
    // Connect to database and check rate limit
    await connecttoDatabase();
    const { allowed, retryAfter } = await checkRateLimit(`otp:${email}`);

    if (!allowed) {
      return {
        success: false,
        error: `Too many attempts. Please wait ${retryAfter} seconds before trying again.`,
        retryAfter,
      };
    }

    const emailOtpApi = await getEmailOtpApi();
    await emailOtpApi.sendVerificationOTP({
      body: { email, type: "email-verification" },
      headers: await headers(),
    });
    return { success: true };
  } catch (error: unknown) {
    console.error("Resend OTP failed", error);
    return { success: false, error: getErrorMessage(error) };
  }
};
