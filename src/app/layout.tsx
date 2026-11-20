import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI News Aggregator (No-Clickbait)",
  description:
    "Aggregates news from major RSS feeds, scores headlines for clickbait, rewrites misleading headlines, and surfaces only fact-grounded stories with source reliability ratings and per-topic digests.",
  keywords: [
    "news aggregator",
    "clickbait detection",
    "headline rewriting",
    "media bias",
    "source reliability",
    "Next.js",
    "RSS",
  ],
  authors: [{ name: "AI News Aggregator" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}
