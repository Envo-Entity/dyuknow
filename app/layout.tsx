import type { Metadata } from "next";
import { Instrument_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { AppStoreProvider } from "@/lib/store";
import { AppChrome } from "@/components/chrome/AppChrome";

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Dyuknow",
  description: "Membership by referral only — book vetted hospitality talent, or take the pass at rooms worth your name.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${instrumentSerif.variable} ${instrumentSans.variable}`}>
      <body>
        <AppStoreProvider>
          <AppChrome>{children}</AppChrome>
        </AppStoreProvider>
      </body>
    </html>
  );
}
