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
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/components/LanguageProvider";

const remainingCooldown = () => Math.max(0, Math.ceil((Number(localStorage.getItem("resendOtpExpiry")) - Date.now()) / 1000)) || 0;
const subscribeCooldown = (callback: () => void) => {
  const timer = setInterval(callback, 1000);
  window.addEventListener("storage", callback);
  window.addEventListener("otp-cooldown", callback);
  return () => { clearInterval(timer); window.removeEventListener("storage", callback); window.removeEventListener("otp-cooldown", callback); };
};

export default function VerifyEmailForm() {
  const { dictionary } = useLanguage();
  const copy = dictionary.verifyEmail;
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const timeLeft = useSyncExternalStore(subscribeCooldown, remainingCooldown, () => 0);

  const handleVerify = async () => {
    if (!otp) {
      toast.error(copy.codeRequired);
      return;
    }
    setIsLoading(true);
    try {
      const result = await verifyEmailWithOtp(otp);
      if (result.success) {
        toast.success(copy.success);
        router.push("/");
      } else {
        toast.error(result.error || copy.failed);
      }
    } catch (error) {
      console.error(error);
      toast.error(copy.failed);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    const result = await resendVerificationOtp();
    if (result.success) {
      toast.success(copy.resendSuccess);
      const cooldown = 10;
      const expiry = Date.now() + cooldown * 1000;
      localStorage.setItem("resendOtpExpiry", expiry.toString());
      window.dispatchEvent(new Event("otp-cooldown"));
    } else {
      // ถ้า server ส่ง retryAfter มา ให้ใช้เวลานั้น
      if (result.retryAfter) {
        const expiry = Date.now() + result.retryAfter * 1000;
        localStorage.setItem("resendOtpExpiry", expiry.toString());
        window.dispatchEvent(new Event("otp-cooldown"));
      }
      toast.error(result.error || copy.resendFailed);
    }
  };

  // Format time display - show mm:ss if > 60 seconds
  const formatTime = (seconds: number) => {
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${String(secs).padStart(2, "0")}`;
    }
    return `${seconds}s`;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4">
      <Card className="w-full max-w-md border-zinc-800 bg-zinc-900 text-zinc-100">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-white">
            {copy.title}
          </CardTitle>
          <CardDescription className="text-zinc-400">
            {copy.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="otp" className="text-zinc-300">
                {copy.codeLabel}
              </Label>
              <Input
                id="otp"
                placeholder={copy.codePlaceholder}
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
                {copy.submitting}
              </>
            ) : (
              copy.submit
            )}
          </Button>
          <p className="text-center text-sm text-zinc-500">
            {copy.noCode}{" "}
            <button
              className={`text-yellow-500 hover:underline ${
                timeLeft > 0 ? "cursor-not-allowed opacity-50" : ""
              }`}
              disabled={timeLeft > 0}
              onClick={handleResend}
            >
              {timeLeft > 0
                ? copy.resendWithTime.replace("{time}", formatTime(timeLeft))
                : copy.resend}
            </button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
