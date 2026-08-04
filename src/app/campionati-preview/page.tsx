import type { Metadata } from "next";
import { getSocieta } from "@/lib/societa";
import ChampionshipPreview from "./preview-client";
import { createChampionshipMockData } from "./mock-data";

export const metadata: Metadata = {
  title: "Preview Campionati 1.1",
  robots: { index: false, follow: false },
};

export default function CampionatiPreviewPage() {
  return <ChampionshipPreview leagues={createChampionshipMockData(getSocieta())} />;
}
