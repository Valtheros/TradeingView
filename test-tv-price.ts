async function getTradingViewPrice(
  market: string,
  exchange: string,
  symbol: string
) {
  // Markets: america, taiwan, thailand, etc.
  const url = `https://scanner.tradingview.com/${market}/scan`;

  // Ticker format: EXCHANGE:SYMBOL
  const ticker = `${exchange}:${symbol}`.toUpperCase();

  const body = {
    symbols: {
      tickers: [ticker],
      query: { types: [] },
    },
    columns: ["close", "change", "volume", "description", "name"],
  };

  try {
    console.log(`\nFetching ${ticker} from [${market}] scanner...`);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error("❌ Error fetching:", response.status, response.statusText);
      const text = await response.text();
      console.error("Response:", text);
      return;
    }

    const data = await response.json();

    if (data.data && data.data.length > 0) {
      const item = data.data[0];
      // Columns map to the order in 'columns' array request
      const [close, change, volume, description, name] = item.d;

      console.log(`✅ Found: ${name} (${description})`);
      console.log(`   Price: ${close}`);
      console.log(`   Change: ${change}`);
      console.log(`   Volume: ${volume}`);
    } else {
      console.log("⚠️ No data found. Check Market, Exchange, and Symbol.");
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

async function run() {
  // Case 1: DOMO (US Market, NASDAQ)
  await getTradingViewPrice("america", "NASDAQ", "DOMO");

  // Case 2: AAPL (US Market, NASDAQ)
  await getTradingViewPrice("america", "NASDAQ", "AAPL");

  // Case 3: PTT (Thailand Market, SET)
  // Note: For Thailand, market is usually 'thailand'
  await getTradingViewPrice("thailand", "SET", "PTT");

  // Case 4: 7782 (Taiwan Market, TWO/TPEX)
  // Market might be 'taiwan'
  await getTradingViewPrice("taiwan", "TWO", "7782");
}

run();
