import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/", name: "StockMarket", short_name: "StockMarket",
    description: "Your daily stocks, watchlist and market digest.",
    start_url: "/", scope: "/", display: "standalone",
    background_color: "#101112", theme_color: "#101112",
    icons: [
      { src: "/assets/icons/app-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/assets/icons/app-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/assets/icons/app-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
