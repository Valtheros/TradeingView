import { POPULAR_STOCK_SYMBOLS } from "@/lib/constants";

// Mock function to simulate formatSymbolForTV logic
async function checkSymbolMismatch(symbol: string, companyName: string) {
  const url1 = `https://symbol-search.tradingview.com/symbol_search/?text=${encodeURIComponent(
    symbol
  )}&hl=en`;

  try {
    const response1 = await fetch(url1, {
      headers: { Origin: "https://www.tradingview.com" },
    });

    if (!response1.ok) return { symbol, status: "FETCH_ERROR" };

    const data = await response1.json();

    if (Array.isArray(data) && data.length > 0) {
      const tvSymbol = data[0].symbol;

      // Check for mismatch
      if (tvSymbol.toUpperCase() !== symbol.toUpperCase()) {
        return {
          symbol: symbol,
          tvSymbol: tvSymbol,
          company: companyName,
          status: "MISMATCH",
        };
      }
      return { symbol, status: "MATCH" };
    }

    return { symbol, status: "NOT_FOUND" };
  } catch (error) {
    return { symbol, status: "ERROR" };
  }
}

async function runTest() {
  console.log("Starting Symbol Mismatch Test...\n");

  // List of symbols to test. You can add more here.
  // Including some known tricky ones and popular ones.
  const symbolsToTest = [
// From your constants
    "7782.TWO", // The one you found issues with
    "BRK.B",
    "BF.B",
    "BTC-USD",
    "TSLA",
    "AAPL",
    "PTT.BK",
    "1ON.TG"
  ];

  // For this test, we don't have real company names for all,
  // so we'll just use the symbol as a placeholder for company name
  // (since we are testing the *first* fetch mismatch primarily).

  const results = [];

  for (const sym of symbolsToTest) {
    // Add a small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 200));

    const result = await checkSymbolMismatch(sym, "Unknown Company");

    if (result.status === "MISMATCH") {
      console.log(
        `❌ MISMATCH FOUND: Input [${result.symbol}] != TV [${result.tvSymbol}]`
      );
      results.push(result);
    } else if (result.status === "NOT_FOUND") {
      console.log(`⚠️ NOT FOUND: [${result.symbol}]`);
    } else if (result.status === "MATCH") {
      // console.log(`✅ MATCH: [${result.symbol}]`); // Uncomment to see matches
    }
  }

  console.log("\n--- Summary ---");
  console.log(`Total Tested: ${symbolsToTest.length}`);
  console.log(`Mismatches Found: ${results.length}`);
  if (results.length > 0) {
    console.log("\nList of Mismatches:");
    results.forEach((r) => console.log(`- ${r.symbol} -> ${r.tvSymbol}`));
  }
}

runTest();
