import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hacktrack",
  description:
    "SHISTECH hackathon project: a civilization builder from the first fire to the stars, built around the UN Sustainable Development Goals.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">{children}</body>
    </html>
  );
}
