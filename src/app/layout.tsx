import type { Metadata } from "next";
import { Pixelify_Sans, VT323 } from "next/font/google";
import { AccessibilitySettings } from "@/components/accessibility-settings";
import "./globals.css";

const pixel = Pixelify_Sans({ subsets: ["latin"], variable: "--font-pixel" });
// Pixelify's 2, 5 and 8 look alike, so numbers use VT323 instead.
const digits = VT323({ weight: "400", subsets: ["latin"], variable: "--font-num" });

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
