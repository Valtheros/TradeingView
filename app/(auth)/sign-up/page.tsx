"use client";
import ContrySelectfield from "@/components/forms/ContrySelectfield";
import FooterLink from "@/components/forms/FooterLink";
import Inputfield from "@/components/forms/Inputfield";
import Selectfield from "@/components/forms/Selectfield";
import { Button } from "@/components/ui/button";
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
import { useLanguage } from "@/components/LanguageProvider";

const Signup = () => {
  const { dictionary } = useLanguage();
  const copy = dictionary.signUp;
  const router = useRouter();
  const investmentGoalOptions = INVESTMENT_GOALS.map((option) => ({
    ...option,
    label: dictionary.options.investmentGoals[option.value],
  }));
  const riskToleranceOptions = RISK_TOLERANCE_OPTIONS.map((option) => ({
    ...option,
    label: dictionary.options.riskTolerance[option.value],
  }));
  const preferredIndustryOptions = PREFERRED_INDUSTRIES.map((option) => ({
    ...option,
    label: dictionary.options.preferredIndustries[option.value],
  }));
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
        if (result.data?.user.id) {
          await Fetchnews(result.data.user.id);
        }
        // localStorage.setItem("userEmail", data.email); // Removed: Security vulnerability
        // OTP is sent automatically or handled by server
        toast.success(copy.success);
        router.push("/verify-email");
      } else {
        toast.error(copy.failedRetry);
      }
    } catch (error) {
      console.error(error);
      toast.error(copy.failed, {
        description:
          error instanceof Error
            ? error.message
            : copy.failedDescription,
      });
    }
  };

  return (
    <>
      <h1 className="form-title">{copy.title}</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Inputfield
          name="fullName"
          label={copy.fullNameLabel}
          placeholder={copy.fullNamePlaceholder}
          register={register}
          error={errors.fullName}
          validation={{
            required: copy.fullNameRequired,
            minLength: {
              value: 2,
              message: copy.fullNameMin,
            },
          }}
        />

        <Inputfield
          name="email"
          label={copy.emailLabel}
          placeholder={copy.emailPlaceholder}
          register={register}
          error={errors.email}
          validation={{
            required: copy.emailRequired,
            pattern: {
              value: /^\w+@\w+\.\w+$/,
              message: copy.emailInvalid,
            },
          }}
        />

        <Inputfield
          name="password"
          label={copy.passwordLabel}
          placeholder={copy.passwordPlaceholder}
          type="password"
          register={register}
          error={errors.password}
          validation={{
            required: copy.passwordRequired,
            minLength: {
              value: 8,
              message: copy.passwordMin,
            },
          }}
        />

        <ContrySelectfield
          name="country"
          label={copy.countryLabel}
          control={control}
          error={errors.country}
          required
        />

        <Selectfield
          name="investmentGoals"
          label={copy.investmentGoalsLabel}
          placeholder={copy.investmentGoalsPlaceholder}
          options={investmentGoalOptions}
          control={control}
          error={errors.investmentGoals}
          required
        />
        <Selectfield
          name="riskTolerance"
          label={copy.riskToleranceLabel}
          placeholder={copy.riskTolerancePlaceholder}
          options={riskToleranceOptions}
          control={control}
          error={errors.riskTolerance}
          required
        />
        <Selectfield
          name="preferredIndustry"
          label={copy.preferredIndustryLabel}
          placeholder={copy.preferredIndustryPlaceholder}
          options={preferredIndustryOptions}
          control={control}
          error={errors.preferredIndustry}
          required
        />

        <Button
          type="submit"
          disabled={isSubmitting}
          className="yellow-btn w-full mt-5"
        >
          {isSubmitting ? copy.submitting : copy.submit}
        </Button>

        <FooterLink
          text={copy.hasAccount}
          linkText={copy.signIn}
          href="/sign-in"
        />
      </form>
    </>
  );
};

export default Signup;
