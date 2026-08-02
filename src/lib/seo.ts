import type { Metadata } from "next";

export const SITE_URL = "https://ilfantaa20.it";
export const SITE_NAME = "Il Fanta a 20";
export const OPEN_GRAPH_SITE_NAME = "Fanta a 20";
export const SITE_DESCRIPTION = "Il portale ufficiale del Fanta a 20: il fantacalcio classic a 20 squadre con rose uniche. Scopri le 100 società, le competizioni, il ranking storico, gli emblemi collezionabili e tutti i record della competizione.";
export const SOCIAL_DESCRIPTION = "Il Fantacalcio Classic a 20 squadre. Scopri le 100 società, il ranking storico, le competizioni e gli emblemi del Fanta a 20.";
export const SOCIAL_URL = "https://www.ilfantaa20.it";
export const SITE_IMAGE = `${SITE_URL}/og-image.png`;
export const SITE_KEYWORDS = [
  "Il Fanta a 20",
  "fantacalcio",
  "fantacalcio classic",
  "fantacalcio 20 squadre",
];

export const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/icon.png`,
        width: 520,
        height: 520,
      },
      email: "mailto:ilfantaa20@gmail.com",
      sameAs: [
        "https://www.instagram.com/ilfanta_a20/",
        "https://www.tiktok.com/@ilfanta_a20",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: "it-IT",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export function createPageMetadata({
  title,
  description = SITE_DESCRIPTION,
  path,
}: {
  title: string;
  description?: string;
  path: string;
}): Metadata {
  return {
    title,
    description,
    keywords: [title, `${title} ${SITE_NAME}`, ...SITE_KEYWORDS],
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
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "it_IT",
      siteName: OPEN_GRAPH_SITE_NAME,
      url: path,
      title,
      description: SOCIAL_DESCRIPTION,
      images: [{ url: SITE_IMAGE, width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: SOCIAL_DESCRIPTION,
      images: [SITE_IMAGE],
    },
  };
}
