import type { MetadataRoute } from "next";
import { getSocieta } from "@/lib/societa";
import { SITE_URL } from "@/lib/seo";

const publicRoutes = [
  { path: "", priority: 1, changeFrequency: "weekly" as const },
  { path: "/societa", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/competizioni", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/statistiche", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/gioca", priority: 0.9, changeFrequency: "daily" as const },
  { path: "/emblemi", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/regolamento", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/lista-attesa", priority: 0.6, changeFrequency: "monthly" as const },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = publicRoutes.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
  const societa = getSocieta().map((team) => ({
    url: `${SITE_URL}/societa/${team.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...pages, ...societa];
}
