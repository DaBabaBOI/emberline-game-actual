import type { Metadata } from "next";
import localFont from "next/font/local";
import { AccessibilitySettings } from "@/components/accessibility-settings";
import "./globals.css";

// The fonts live in the repo (src/app/fonts, SIL Open Font License), so the
// site builds without an internet connection.
const pixel = localFont({ src: "./fonts/PixelifySans-latin.woff2", weight: "400 700", variable: "--font-pixel", display: "swap" });
// Pixelify's 2, 5 and 8 look alike, so numbers use VT323 instead.
const digits = localFont({ src: "./fonts/VT323-latin.woff2", weight: "400", variable: "--font-num", display: "swap" });

export const metadata: Metadata = {
  title: "Emberline",
  description:
    "SHISTECH hackathon project: a civilization builder from the first fire to the stars, built around the UN Sustainable Development Goals.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${pixel.variable} ${digits.variable}`}>
      <body className="flex min-h-screen flex-col">
        {children}
        <AccessibilitySettings />
      </body>
    </html>
  );
}
