import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import SiteAnalytics from "@/components/SiteAnalytics";
import { getResumeData } from "@/lib/resume-store";
import { THEME_COOKIE, resolveTheme } from "@/lib/theme";
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
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Day/night: a visitor's own pick (cookie, written by ThemeToggle) wins over
  // the default chosen in /admin. Stamped on <html> so the first paint is
  // already the right theme — `suppressHydrationWarning` below covers the
  // toggle mutating this attribute in place. See lib/theme.ts.
  const [cookieStore, data] = await Promise.all([cookies(), getResumeData()]);
  const theme = resolveTheme(
    cookieStore.get(THEME_COOKIE)?.value,
    data.shared.defaultTheme,
  );

  return (
    <html
      lang="en"
      dir="ltr"
      data-scroll-behavior="smooth"
      data-theme={theme}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-full bg-[#f5f5f7] text-[#1d1d1f] dark:bg-[#050505] dark:text-white">
        {children}
        {/* Traffic metrics: Vercel's dashboard plus our own stats in /admin. */}
        <Analytics />
        <SpeedInsights />
        <SiteAnalytics />
      </body>
    </html>
  );
}