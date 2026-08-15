import type { Metadata } from "next";
import ChampionshipLive from "./live-client";
import { loadChampionshipData } from "./data";
import { getDemoSeed, isGlobalFakeDataEnabled } from "@/lib/demo-data/config";
import { getActiveSocietaCatalog } from "@/lib/societa/catalog.server";
import ChampionshipPreview from "../campionati-preview/preview-client";
import { createChampionshipMockData } from "../campionati-preview/mock-data";

export const metadata: Metadata = { title: "Campionati Live Preview", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CampionatiLivePreviewPage({ searchParams }: { searchParams: Promise<{ stagione?: string; lega?: string; vista?: string }> }) {
  const query = await searchParams;
  const initialLeague = query.lega;
  const initialTab = query.vista === "classifica" ? "table" as const : "results" as const;
  if (isGlobalFakeDataEnabled()) {
    const societa = await getActiveSocietaCatalog();
    return <ChampionshipPreview leagues={createChampionshipMockData(societa, getDemoSeed(), true)} initialLeague={initialLeague} initialTab={initialTab} />;
  }
  let data = null;
  try {
    data = await loadChampionshipData(query.stagione);
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("[campionati-live-preview] Errore caricamento Supabase", error);
    return <main className="mx-auto max-w-4xl px-4 py-20"><h1 className="text-3xl font-black text-blue-950">I Campionati</h1><p className="mt-4 rounded-2xl bg-white p-6 font-bold text-slate-500">Non è stato possibile caricare i campionati. Riprova più tardi.</p></main>;
  }
  if (!data) return <main className="mx-auto max-w-4xl px-4 py-20"><h1 className="text-3xl font-black text-blue-950">I Campionati</h1><p className="mt-4 rounded-2xl bg-white p-6 font-bold text-slate-500">Non è disponibile una stagione attiva.</p></main>;
  return <ChampionshipLive data={data} initialLeague={initialLeague} initialTab={initialTab} />;
}
