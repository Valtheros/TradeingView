const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

// Mock function to simulate checkFinnhubAccess logic
async function checkFinnhubAccess(symbol: string, token: string) {
  try {
    // 1. Check Quote
    const quoteUrl = `${FINNHUB_BASE_URL}/quote?symbol=${encodeURIComponent(
      symbol
    )}&token=${token}`;

    const quoteRes = await fetch(quoteUrl, { cache: "no-store" });

    if (!quoteRes.ok)
      return { symbol, status: "FAIL_QUOTE_HTTP", code: quoteRes.status };

    const quoteData = await quoteRes.json();

    // Check if 'c' (current price) exists and is not 0
    if (!quoteData || !quoteData.c) {
      return { symbol, status: "FAIL_NO_PRICE", data: quoteData };
    }

    // 2. Check Profile
    const profileUrl = `${FINNHUB_BASE_URL}/stock/profile2?symbol=${encodeURIComponent(
      symbol
    )}&token=${token}`;

    const profileRes = await fetch(profileUrl);

    if (!profileRes.ok)
      return { symbol, status: "FAIL_PROFILE_HTTP", code: profileRes.status };

    const profileData = await profileRes.json();

    if (!profileData || !profileData.name) {
      return { symbol, status: "FAIL_NO_NAME", data: profileData };
    }

    return {
      symbol,
      status: "PASS",
      price: quoteData.c,
      name: profileData.name,
    };
  } catch (error) {
    return { symbol, status: "ERROR", error: error };
  }
}

async function runTest() {
  const token =
    process.env.FINNHUB_API_KEY || process.env.NEXT_PUBLIC_FINNHUB_API_KEY;

  if (!token) {
    console.error("❌ Error: API Key not found in environment variables.");
    return;
  }

  console.log(`Starting Finnhub Access Test (Key: ${token.slice(0, 5)}...)\n`);

  // List of symbols to test
  const symbolsToTest = [
    "AAPL", // Should PASS
    "TSLA", // Should PASS
    "BTC-USD", // Crypto often fails on stock endpoints or has different behavior
    "INVALID123", // Should FAIL (No price/name)
    "7782.TWO", // The problematic one
    "PTT.BK", // Thai stock (might fail if free tier doesn't support it)
    "DIDIY", // Delisted/OTC?
  ];

  for (const sym of symbolsToTest) {
    // Add delay to avoid rate limit (Finnhub free tier is strict: 60 calls/min)
    await new Promise((r) => setTimeout(r, 1000));

    process.stdout.write(`Testing [${sym}] ... `);
    const result = await checkFinnhubAccess(sym, token);

    if (result.status === "PASS") {
      console.log(`✅ PASS (Price: ${result.price}, Name: ${result.name})`);
    } else {
      console.log(`❌ FAIL (${result.status})`);
      // console.log("   Debug:", result); // Uncomment for details
    }
  }
}

runTest();
