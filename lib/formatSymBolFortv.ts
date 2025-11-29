"use server";
export async function formatSymbolForTV(query: string, company: string) {
  const url1 = `https://symbol-search.tradingview.com/symbol_search/?text=${encodeURIComponent(
    query
  )}&hl=en`;

  const url2 = `https://symbol-search.tradingview.com/symbol_search/?text=${encodeURIComponent(
    company
  )}&hl=en`;

  try {
    const response1 = await fetch(url1, {
      headers: {
        Origin: "https://www.tradingview.com",
      },
    });
    if (!response1.ok) return null;
    const data = await response1.json();
    if (Array.isArray(data) && data.length > 0) {
      if (data[0].symbol.toUpperCase() !== query.toUpperCase()) {
        const response2 = await fetch(url2, {
          headers: {
            Origin: "https://www.tradingview.com",
          },
        });
        if (response2.ok) {
          const data2 = await response2.json();
          if (Array.isArray(data2) && data2.length > 0) {
            return `${data2[0].symbol}`;
          }
          return null;
        }
        return `${data[0].symbol}`;
      }
      return `${data[0].symbol}`;
    }
    return null;
  } catch (error) {
    console.error("Error formating symbol for TV:", error);
    return null;
  }
}
