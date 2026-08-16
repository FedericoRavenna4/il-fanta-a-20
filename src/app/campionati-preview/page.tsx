import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getActiveSocietaCatalog } from "@/lib/societa/catalog.server";
import ChampionshipPreview from "./preview-client";
import { createChampionshipMockData } from "./mock-data";

export const metadata: Metadata = {
  title: "Preview Campionati 1.1",
  robots: { index: false, follow: false },
};

export default async function CampionatiPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const societa = await getActiveSocietaCatalog();

  return <ChampionshipPreview leagues={createChampionshipMockData(societa)} />;
}
