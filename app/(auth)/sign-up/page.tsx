"use client";
import ContrySelectfield from "@/components/forms/ContrySelectfield";
import FooterLink from "@/components/forms/FooterLink";
import Inputfield from "@/components/forms/Inputfield";
import Selectfield from "@/components/forms/Selectfield";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/better-auth/auth-client";
import { signUpWithEmail } from "@/lib/actions/auth.actions";
import { Fetchnews } from "@/lib/actions/user.action";
import {
  INVESTMENT_GOALS,
  PREFERRED_INDUSTRIES,
  RISK_TOLERANCE_OPTIONS,
} from "@/lib/constants";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

const Signup = () => {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormData>({
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      country: "TH",
      investmentGoals: "Growth",
      riskTolerance: "Medium",
      preferredIndustry: "Technology",
    },
    mode: "onBlur",
  });
  const onSubmit = async (data: SignUpFormData) => {
    try {
      const result = await signUpWithEmail(data);
      if (result.success) {
        if(result.data?.user.id){
          await Fetchnews(result.data.user.id);
        }
        localStorage.setItem("userEmail", data.email);
        await authClient.emailOtp.sendVerificationOtp({
          email: data.email,
          type: "email-verification",
          fetchOptions: {
            onError: (ctx) => {
              console.error("Failed to send OTP:", ctx.error);
              toast.error(
                "Failed to send verification email: " + ctx.error.message
              );
            },
          },
        });
        toast.success("Account created! Please verify your email.");
        router.push("/verify-email");
        
      } else {
        toast.error("Sign up failed. Please try again.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Sign up failed", {
        description:
          error instanceof Error
            ? error.message
            : "Failed to create an account.",
      });
    }
  };

  return (
    <>
      <h1 className="form-title">Sign Up & Personalize</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Inputfield
          name="fullName"
          label="Full Name"
          placeholder="John Doe"
          register={register}
          error={errors.fullName}
          validation={{
            required: "Full name is required",
            minLength: {
              value: 2,
              message: "Full name must be at least 2 characters",
            },
          }}
        />

        <Inputfield
          name="email"
          label="Email"
          placeholder="valthers@gmail.com"
          register={register}
          error={errors.email}
          validation={{
            required: "Email is required",
            patten: /^\w+@\w+\.\w+$/,
            message: "Please enter a valid email address",
          }}
        />

        <Inputfield
          name="password"
          label="Password"
          placeholder="Enter your password"
          type="password"
          register={register}
          error={errors.password}
          validation={{
            required: "Password is required",
            minLength: {
              value: 8,
              message: "Password must be at least 8 characters",
            },
          }}
        />

        <ContrySelectfield
          name="country"
          label="Country"
          control={control}
          error={errors.country}
          required
        />

        <Selectfield
          name="investmentGoals"
          label="Investment Goals"
          placeholder="Select your investment goals"
          options={INVESTMENT_GOALS}
          control={control}
          error={errors.investmentGoals}
          required
        />
        <Selectfield
          name="riskTolerance"
          label="Risk Tolerance"
          placeholder="Select your Risk level"
          options={RISK_TOLERANCE_OPTIONS}
          control={control}
          error={errors.riskTolerance}
          required
        />
        <Selectfield
          name="preferredIndustry"
          label="Preferred Industry"
          placeholder="Select your preferred industry"
          options={PREFERRED_INDUSTRIES}
          control={control}
          error={errors.preferredIndustry}
          required
        />

        <Button
          type="submit"
          disabled={isSubmitting}
          className="yellow-btn w-full mt-5"
        >
          {isSubmitting ? "Creating Account..." : "Start Investing"}
        </Button>

        <FooterLink
          text="Already have an account?"
          linkText="Sign In"
          href="/sign-in"
        />
      </form>
    </>
  );
};

export default Signup;
