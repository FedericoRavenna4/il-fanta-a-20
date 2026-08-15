import { getActiveSocietaCatalog } from "@/lib/societa/catalog.server";
import CoppaFantaPrototype from "./CoppaFantaPrototype";
import { getDemoSeed, isGlobalFakeDataEnabled } from "@/lib/demo-data/config";
import { loadActiveCoppaData } from "./data";

export default async function MobileCoppeHub({ initialTab = "results" }: { initialTab?: "results" | "table" }) {
  if (isGlobalFakeDataEnabled()) {
    const catalog = await getActiveSocietaCatalog();
    const teams = catalog.slice(0, 100).map((team) => ({ id: team.id, name: team.nome, slug: team.slug, logo: team.logo_path ?? "/logos/logo.png" }));
    return <CoppaFantaPrototype teams={teams} demo seed={getDemoSeed()} hasCalendar initialTab={initialTab} />;
  }
  let data;
  let loadError = false;
  try {
    data = await loadActiveCoppaData();
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("[coppe] Errore caricamento calendario reale", error);
    data = { teams: [], matches: [], initialDay: 1, hasCalendar: false };
    loadError = true;
  }
  return <CoppaFantaPrototype {...data} loadError={loadError} initialTab={initialTab} />;
}
