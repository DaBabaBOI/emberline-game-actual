import type { Metadata } from "next";
import { Pixelify_Sans } from "next/font/google";
import "./globals.css";

const pixel = Pixelify_Sans({ subsets: ["latin"], variable: "--font-pixel" });

export const metadata: Metadata = {
  title: "Emberline",
  description:
    "SHISTECH hackathon project: a civilization builder from the first fire to the stars, built around the UN Sustainable Development Goals.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={pixel.variable}>
      <body className="flex min-h-screen flex-col">{children}</body>
    </html>
  );
}
