import type { Metadata, Viewport } from "next";
import { Manrope, Outfit } from "next/font/google";
import Script from "next/script";
import {
  OPEN_GRAPH_SITE_NAME,
  SOCIAL_DESCRIPTION,
  SOCIAL_URL,
  SITE_DESCRIPTION,
  SITE_IMAGE,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_URL,
  STRUCTURED_DATA,
} from "@/lib/seo";

import "./globals.css";

import Header from "./components/Header";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import { getCurrentAccount } from "@/lib/account/server";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const GOOGLE_ANALYTICS_ID = "G-FE9PHKQRBT";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    ...SITE_KEYWORDS,
    "competizioni fantacalcio",
    "ranking fantacalcio",
    "statistiche fantacalcio",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  applicationName: SITE_NAME,
  verification: {
    google: "X4Iw81vQUae10IpB5QkrS2alq3BAO-HGJVY0lSH9lNk",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "it_IT",
    siteName: OPEN_GRAPH_SITE_NAME,
    url: SOCIAL_URL,
    title: SITE_NAME,
    description: SOCIAL_DESCRIPTION,
    images: [{ url: SITE_IMAGE, width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SOCIAL_DESCRIPTION,
    images: [SITE_IMAGE],
  },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  icons: {
    icon: [{ url: "/icon.png", type: "image/png", sizes: "520x520" }],
    shortcut: ["/icon.png"],
    apple: [{ url: "/icon.png", type: "image/png", sizes: "520x520" }],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#071f45",
  colorScheme: "light",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const account = await getCurrentAccount();
  return (
    <html lang="it" className={`${manrope.variable} ${outfit.variable}`}>
      <body className="min-h-screen flex flex-col font-[var(--font-outfit)]">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(STRUCTURED_DATA).replace(/</g, "\\u003c"),
          }}
        />
        <ScrollToTop />
        <Header account={account} />

        <main className="flex-1 pt-[calc(4rem+env(safe-area-inset-top))] lg:pt-0">{children}</main>

        <Footer />
        {process.env.NODE_ENV === "production" && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GOOGLE_ANALYTICS_ID}');
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
