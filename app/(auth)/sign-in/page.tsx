'use client';
import ContrySelectfield from "@/components/forms/ContrySelectfield";
import FooterLink from "@/components/forms/FooterLink";
import Inputfield from "@/components/forms/Inputfield";
import Selectfield from "@/components/forms/Selectfield";
import { Button } from "@/components/ui/button";
import { INVESTMENT_GOALS, PREFERRED_INDUSTRIES, RISK_TOLERANCE_OPTIONS } from "@/lib/constants";
import { useForm } from "react-hook-form"

const Signin = () => {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormData>({
    defaultValues: {
      email: '',
      password: '',
    },mode: 'onBlur',
  })
  const onSubmit = async (data: SignInFormData) => {
    try {
      console.log(data);
    } catch (error) {
      console.error(error);
    }
  }
  return (
    <>
      <h1 className="form-title">Sign In</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">


        <Inputfield
          name="email"
          label="Email"
          placeholder="valthers@gmail.com"
          register={register}
          error={errors.email}
          validation={{ required: 'Email is required', patten: /^\w+@\w+\.\w+$/, message: "Please enter a valid email address" }}
        />

        <Inputfield
          name="password"
          label="Password"
          placeholder="Enter your password"
          type="password"
          register={register}
          error={errors.password}
          validation={{ required: 'Password is required', minLength: 8 }}
        />


        <Button type="submit" disabled={isSubmitting} className="yellow-btn w-full mt-5">
          {isSubmitting ? 'Singing In...' : 'Sign In'}
        </Button>

        <FooterLink text="Don't have an account?" linkText="Create an account" href="/sign-up" />
      </form>
    </>
  )
}

export default Signin;