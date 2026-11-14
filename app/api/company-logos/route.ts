import { getCurrentSession } from "@/lib/better-auth/session";
import { getStockProfile } from "@/lib/finnhub/data";
import { handleLogoRequest } from "@/lib/company-logos";

export async function POST(request: Request) {
  return handleLogoRequest(request, async () => Boolean((await getCurrentSession())?.user), getStockProfile);
}
