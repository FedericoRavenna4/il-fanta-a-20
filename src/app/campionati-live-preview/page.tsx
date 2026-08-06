import type { Metadata } from "next";
import ChampionshipLive from "./live-client";
import { loadChampionshipData } from "./data";

export const metadata: Metadata = { title: "Campionati Live Preview", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CampionatiLivePreviewPage({ searchParams }: { searchParams: Promise<{ stagione?: string }> }) {
  let data = null;
  try {
    const { stagione } = await searchParams;
    data = await loadChampionshipData(stagione);
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("[campionati-live-preview] Errore caricamento Supabase", error);
    return <main className="mx-auto max-w-4xl px-4 py-20"><h1 className="text-3xl font-black text-blue-950">I Campionati</h1><p className="mt-4 rounded-2xl bg-white p-6 font-bold text-slate-500">Non è stato possibile caricare i campionati. Riprova più tardi.</p></main>;
  }
  if (!data) return <main className="mx-auto max-w-4xl px-4 py-20"><h1 className="text-3xl font-black text-blue-950">I Campionati</h1><p className="mt-4 rounded-2xl bg-white p-6 font-bold text-slate-500">Non è disponibile una stagione attiva.</p></main>;
  return <ChampionshipLive data={data} />;
}
