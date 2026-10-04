import type { QuoteBatch } from "./quotes";
import { parseSymbols } from "./quotes";

export async function handleQuoteRequest(
  request: Request,
  authenticated: () => Promise<boolean>,
  load: (symbols: string[]) => Promise<QuoteBatch>,
) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!await authenticated()) return Response.json({ error: "Unauthorized" }, { status: 401, headers });
  const body = await request.json().catch(() => null);
  const symbols = parseSymbols(body?.symbols);
  if (!symbols) return Response.json({ error: "Provide between 1 and 20 valid symbols" }, { status: 400, headers });
  return Response.json(await load(symbols), { headers });
}
