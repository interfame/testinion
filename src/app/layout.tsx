// Growthrush SMM Suite — © Growthrush. All rights reserved.

import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { getSeoSettings, SEO_DEFAULTS } from "@/lib/seo";

/* Copyright (c) Growthrush — root layout: fonts, theme provider,
   SEO metadata (admin-configurable) and Google Analytics injection. */

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * SEO metadata resolved at request time so Admin → Settings → SEO & Analytics
 * changes go live instantly (no rebuild). Defaults keep the build safe when
 * the database is unreachable.
 */
export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoSettings();

  const title = seo.seo_title || SEO_DEFAULTS.title;
  const description = seo.seo_description || SEO_DEFAULTS.description;
  const keywords = seo.seo_keywords
    ? seo.seo_keywords.split(",").map((k) => k.trim()).filter(Boolean)
    : SEO_DEFAULTS.keywords;

  const noindex = seo.robots_noindex === "1";

  return {
    title,
    description,
    keywords: keywords.length ? keywords : SEO_DEFAULTS.keywords,
    // Search-console / Bing site verification codes from the admin panel
    verification: {
      ...(seo.gsc_verification ? { google: seo.gsc_verification } : {}),
      ...(seo.bing_verification ? { other: { "msvalidate.01": seo.bing_verification } } : {}),
    },
    robots: noindex ? { index: false, follow: false } : undefined,
    icons: {
      icon: [
        { url: "/brand/favicon.svg", type: "image/svg+xml" },
        { url: "/brand/icon-32.png", sizes: "32x32", type: "image/png" },
        { url: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      ],
      apple: "/brand/apple-touch-icon.png",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const seo = await getSeoSettings();
  const gaId = seo.ga_measurement_id?.trim();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {/* Google Analytics (GA4) — loaded only when the admin saved a measurement ID */}
        {gaId && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`} strategy="afterInteractive" />
            <Script id="gr-ga-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', ${JSON.stringify(gaId)});
              `}
            </Script>
          </>
        )}
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
