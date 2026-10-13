import { getAuth } from "@/lib/better-auth/auth";
import { toNextJsHandler } from "better-auth/next-js";

const getHandlers = async () => toNextJsHandler(await getAuth());

export async function GET(request: Request) {
  const handlers = await getHandlers();
  return handlers.GET(request);
}

export async function POST(request: Request) {
  const path = new URL(request.url).pathname;
  const reset = path === "/api/auth/email-otp/reset-password";
  if (reset || path === "/api/auth/email-otp/request-password-reset" || path === "/api/auth/forget-password/email-otp") {
    const body = await request.clone().json().catch(() => null);
    if (!body || typeof body.email !== "string" || body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)
      || (reset && (typeof body.otp !== "string" || !/^\d{6}$/.test(body.otp) || typeof body.password !== "string" || body.password.length < 8 || body.password.length > 128))) {
      return Response.json({ code: "INVALID_RESET_INPUT", message: "Invalid password reset details" }, { status: 400 });
    }
  }
  const handlers = await getHandlers();
  return handlers.POST(request);
}
