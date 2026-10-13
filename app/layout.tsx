import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@fontsource/ibm-plex-sans-thai/400.css";
import "@fontsource/ibm-plex-sans-thai/500.css";
import "@fontsource/ibm-plex-sans-thai/600.css";
import "@fontsource/ibm-plex-sans-thai/700.css";
import "./globals.css";
import "./daily.css";
import { LanguageProvider } from "@/components/LanguageProvider";
import { Toaster } from "@/components/ui/sonner";
import { getServerLocale } from "@/lib/i18n-server";
import { SearchProvider } from "@/components/SearchCommand";
import { PwaProvider } from "@/components/PwaProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "StockMarket | Today", template: "%s | StockMarket" },
  description: "Your daily stocks, watchlist and market digest.",
  applicationName: "StockMarket",
  appleWebApp: {
    capable: true, title: "StockMarket", statusBarStyle: "black-translucent",
    startupImage: [
      { url: "/assets/icons/startup-iphone17-portrait.png", media: "(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/assets/icons/startup-iphone17-landscape.png", media: "(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)" },
    ],
  },
  icons: { apple: "/assets/icons/apple-touch-icon.png", icon: "/assets/icons/app-192.png" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#101112" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <RootLayoutContent>{children}</RootLayoutContent>;
}

async function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const locale = await getServerLocale();

  return (
    <html lang={locale} data-locale={locale} className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LanguageProvider initialLocale={locale}>
          <PwaProvider><SearchProvider>{children}</SearchProvider></PwaProvider>
          <Toaster />
        </LanguageProvider>
      </body>
    </html>
  );
}
