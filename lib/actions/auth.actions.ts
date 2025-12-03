"use server";
import { auth } from "@/lib/better-auth/auth";
import { inngest } from "../inngest/client";
import { headers, cookies } from "next/headers";

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
        await (auth.api as any).sendVerificationOTP({
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
  } catch (error: any) {
    console.log("Sign up failed", error);
    return { success: false, error: error.message };
  }
};

export const signOut = async () => {
  try {
    await auth.api.signOut({
      headers: await headers(),
    });
    return { success: true, data: null };
  } catch (error: any) {
    console.log("Sign out failed", error);
    return { success: false, error: error.message };
  }
};

export const signInWithEmail = async ({ email, password }: SignInFormData) => {
  try {
    const response = await auth.api.signInEmail({
      body: { email: email, password: password },
    });

    return { success: true, data: response };
  } catch (error: any) {
    console.error("Sign In failed", error);
    return { success: false, error: error.message };
  }
};

export const verifyEmailWithOtp = async (otp: string) => {
  const cookieStore = await cookies();
  const email = cookieStore.get("email_to_verify")?.value;

  if (!email) {
    return { success: false, error: "No verification session found" };
  }

  try {
    const response = await (auth.api as any).verifyEmailOTP({
      body: { email, otp },
      headers: await headers(),
    });

    cookieStore.delete("email_to_verify");
    return { success: true, data: response };
  } catch (error: any) {
    console.error("Verification failed", error);
    return { success: false, error: error.message };
  }
};

export const resendVerificationOtp = async () => {
  const cookieStore = await cookies();
  const email = cookieStore.get("email_to_verify")?.value;

  if (!email) {
    return { success: false, error: "No verification session found" };
  }

  try {
    await (auth.api as any).sendVerificationOTP({
      body: { email, type: "email-verification" },
      headers: await headers(),
    });
    return { success: true };
  } catch (error: any) {
    console.error("Resend OTP failed", error);
    return { success: false, error: error.message };
  }
};
