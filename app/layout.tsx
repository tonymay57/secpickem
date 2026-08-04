import type { Metadata } from "next";
import { Barlow_Condensed, Inter, Roboto_Slab } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const barlow = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const slab = Roboto_Slab({
  variable: "--font-slab",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "SEC Pick'em 2026",
  description:
    "Pick every SEC regular-season game, compare every ballot, and follow the standings all season.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${barlow.variable} ${slab.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
