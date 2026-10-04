import { getAuth } from "@/lib/better-auth/auth";
import { handleQuoteRequest } from "@/lib/quote-handler";
import { getQuotes } from "@/lib/quotes-server";

export async function POST(request: Request) {
  return handleQuoteRequest(request, async () => {
    const auth = await getAuth();
    return Boolean((await auth.api.getSession({ headers: request.headers }))?.user);
  }, getQuotes);
}
