import { getAuth } from "@/lib/better-auth/auth";
import { toNextJsHandler } from "better-auth/next-js";

const getHandlers = async () => toNextJsHandler(await getAuth());

export async function GET(request: Request) {
  const handlers = await getHandlers();
  return handlers.GET(request);
}

export async function POST(request: Request) {
  const handlers = await getHandlers();
  return handlers.POST(request);
}
