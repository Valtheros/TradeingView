"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return <html lang="en"><body style={{ background: "#101112", color: "#f0f1f2", fontFamily: "sans-serif", padding: 32 }}><h1>StockMarket</h1><p>Unable to load. Please try again.</p><p>โหลดไม่สำเร็จ กรุณาลองอีกครั้ง</p><button onClick={reset} style={{ minHeight: 44, padding: "12px 20px" }}>Try again / ลองอีกครั้ง</button></body></html>;
}
