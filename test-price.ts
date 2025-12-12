const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

async function checkPrice(symbol: string) {
  const token =
    process.env.FINNHUB_API_KEY || process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
  const url = `${FINNHUB_BASE_URL}/quote?symbol=${symbol}&token=${token}`;

  console.log(`Fetching price for ${symbol}...`);
  try {
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    console.log("Data:", data);
    console.log(`Current Price (c): ${data.c}`);
    console.log(`Previous Close (pc): ${data.pc}`);
  } catch (e) {
    console.error(e);
  }
}

checkPrice("DOMO inc");
