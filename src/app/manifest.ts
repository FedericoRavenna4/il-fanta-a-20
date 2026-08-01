import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: "Fanta a 20",
    description: "Il Fantacalcio Classic a 20 squadre",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#071f45",
    lang: "it",
    icons: [
      {
        src: "/icon.png",
        sizes: "520x520",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
