"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  verifyEmailWithOtp,
  resendVerificationOtp,
} from "@/lib/actions/auth.actions";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function VerifyEmailForm() {
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const expiry = localStorage.getItem("resendOtpExpiry");
    if (expiry) {
      const remaining = Math.ceil((parseInt(expiry) - Date.now()) / 1000);
      if (remaining > 0) {
        setTimeLeft(remaining);
      } else {
        localStorage.removeItem("resendOtpExpiry");
      }
    }
  }, []);

  useEffect(() => {
    if (timeLeft > 0) {
      const timerId = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timerId);
    } else {
      localStorage.removeItem("resendOtpExpiry");
    }
  }, [timeLeft]);

  const handleVerify = async () => {
    if (!otp) {
      toast.error("Please enter the verification code");
      return;
    }
    setIsLoading(true);
    try {
      const result = await verifyEmailWithOtp(otp);
      if (result.success) {
        toast.success("Email verified successfully!");
        router.push("/");
      } else {
        toast.error(result.error || "Failed to verify email");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to verify email");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    const result = await resendVerificationOtp();
    if (result.success) {
      toast.success("Verification code resent!");
      const expiry = Date.now() + 60 * 1000;
      localStorage.setItem("resendOtpExpiry", expiry.toString());
      setTimeLeft(60);
    } else {
      toast.error(result.error || "Failed to resend code");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4">
      <Card className="w-full max-w-md border-zinc-800 bg-zinc-900 text-zinc-100">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-white">
            Verify Your Email
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Enter the 6-digit code sent to your email address.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="otp" className="text-zinc-300">
                Verification Code
              </Label>
              <Input
                id="otp"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus:border-yellow-500 focus:ring-yellow-500"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button
            className="w-full bg-yellow-500 text-black hover:bg-yellow-600"
            onClick={handleVerify}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify Email"
            )}
          </Button>
          <p className="text-center text-sm text-zinc-500">
            Didn't receive the code?{" "}
            <button
              className={`text-yellow-500 hover:underline ${
                timeLeft > 0 ? "cursor-not-allowed opacity-50" : ""
              }`}
              disabled={timeLeft > 0}
              onClick={handleResend}
            >
              {timeLeft > 0 ? `Resend Code (${timeLeft}s)` : "Resend Code"}
            </button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
