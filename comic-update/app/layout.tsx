import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
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
  description: "Discover and read amazing comics in the ShattahsVerse. In an age of knockoffs... Are your heroes safe?",
  keywords: ["comics", "superhero", "shattahs", "multiverse", "manga", "webtoon"],
  authors: [{ name: "ShattahsVerse" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "ShattahsVerse",
    title: "ShattahsVerse - The Multiverse Will Never Be the Same",
    description: "Discover and read amazing comics in the ShattahsVerse",
  },
  twitter: {
    card: "summary_large_image",
    title: "ShattahsVerse",
    description: "Discover and read amazing comics in the ShattahsVerse",
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
        {children}
        <Toaster />
      </body>
    </html>
  );
}
