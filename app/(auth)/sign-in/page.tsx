"use client";
import FooterLink from "@/components/forms/FooterLink";
import Inputfield from "@/components/forms/Inputfield";
import { Button } from "@/components/ui/button";
import { signInWithEmail } from "@/lib/actions/auth.actions";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useLanguage } from "@/components/LanguageProvider";
import Link from "next/link";

const Signin = () => {
  const { dictionary } = useLanguage();
  const copy = dictionary.signIn;
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormData>({
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onBlur",
  });
  const onSubmit = async (data: SignInFormData) => {
    try {
      const result = await signInWithEmail(data);
      if (result.success) {
        router.push("/");
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error(error);
      toast.error(copy.failed, {
        description:
          error instanceof Error ? error.message : copy.failedDescription,
      });
    }
  };
  return (
    <>
      <h1 className="form-title">{copy.title}</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
            minLength: {value: 8, message: copy.passwordMin},
          }}
        />

        <Link href="/forgot-password" className="footer-link flex min-h-11 items-center justify-end text-sm">
          {copy.forgotPassword}
        </Link>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="yellow-btn w-full mt-5"
        >
          {isSubmitting ? copy.submitting : copy.submit}
        </Button>

        <FooterLink
          text={copy.noAccount}
          linkText={copy.createAccount}
          href="/sign-up"
        />
      </form>
    </>
  );
};

export default Signin;
