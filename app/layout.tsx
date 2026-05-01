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
  metadataBase: new URL("https://resume.vicentegomez.cl"),
  title: {
    default: "Vicente G. Gómez | Resume",
    template: "%s | Vicente G. Gómez",
  },
  description:
    "Economics student at Universidad de Chile. Teaching Assistant, Capital Management Intern, and data-oriented project builder.",
  keywords: [
    "Vicente Gómez",
    "Economics",
    "Universidad de Chile",
    "Banco Santander",
    "Capital Management",
    "Teaching Assistant",
    "Resume",
    "CV",
  ],
  authors: [{ name: "Vicente G. Gómez" }],
  creator: "Vicente G. Gómez",
  openGraph: {
    title: "Vicente G. Gómez | Resume",
    description:
      "Economics student, Teaching Assistant, and Capital Management Intern.",
    url: "https://resume.vicentegomez.cl",
    siteName: "Vicente G. Gómez",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vicente G. Gómez | Resume",
    description:
      "Economics student, Teaching Assistant, and Capital Management Intern.",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-full bg-[#f5f5f7] text-[#1d1d1f] dark:bg-[#050505] dark:text-white">
        {children}
      </body>
    </html>
  );
}