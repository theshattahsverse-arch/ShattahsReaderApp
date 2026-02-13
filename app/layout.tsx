import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { AuthHashHandler } from "@/components/auth/AuthHashHandler";
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
  title: {
    default: "ShattahsVerse - The Multiverse Will Never Be the Same",
    template: "%s | ShattahsVerse",
  },
  description: "In an age of knockoffs... A New Saga will rise",
  keywords: ["comics", "superhero", "shattahs", "multiverse", "manga", "webtoon","heros","indie","black","creator","fan","epic"],
  authors: [{ name: "ShattahsVerse" }],
  icons: {
    icon: "/shattahs-symbol-6.svg",
    shortcut: "/shattahs-symbol-6.svg",
    apple: "/shattahs-symbol-6.svg",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "ShattahsVerse",
    title: "ShattahsVerse - The Multiverse Will Never Be the Same",
    description: "In an age of knockoffs... A New Saga will rise",
  },
  twitter: {
    card: "summary_large_image",
    title: "ShattahsVerse",
    description: "In an age of knockoffs... A New Saga will rise",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background`}
      >
        <AuthHashHandler />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
