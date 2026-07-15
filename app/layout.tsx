import type { Metadata } from "next";
import { Instrument_Serif } from "next/font/google";
import "./globals.css";
import { AppStoreProvider } from "@/lib/store";
import { AppChrome } from "@/components/chrome/AppChrome";

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Dyuknow",
  description: "Book vetted hospitality talent, or take the pass at rooms worth your name.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={instrumentSerif.variable}>
      <body>
        <AppStoreProvider>
          <AppChrome>{children}</AppChrome>
        </AppStoreProvider>
      </body>
    </html>
  );
}
