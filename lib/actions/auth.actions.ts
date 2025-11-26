"use server";
import { auth } from "@/lib/better-auth/auth";
import { inngest } from "../inngest/client";
import { headers } from "next/headers";


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
