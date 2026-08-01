import type { Metadata } from "next";

export const SITE_URL = "https://ilfantaa20.it";
export const SITE_NAME = "Il Fanta a 20";
export const SITE_DESCRIPTION = "Il Fantacalcio Classic a 20 squadre: società, competizioni, statistiche, emblemi e Arcade ufficiale.";
export const SITE_IMAGE = "/icon.png";

export function createPageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "it_IT",
      siteName: SITE_NAME,
      url: path,
      title,
      description,
      images: [{ url: SITE_IMAGE, width: 520, height: 520, alt: SITE_NAME }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [SITE_IMAGE],
    },
  };
}
