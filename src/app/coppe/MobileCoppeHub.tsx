import { getActiveSocietaCatalog } from "@/lib/societa/catalog.server";
import CoppaFantaPrototype from "./CoppaFantaPrototype";
import { getDemoSeed, isGlobalFakeDataEnabled } from "@/lib/demo-data/config";

export default async function MobileCoppeHub() {
  const catalog = await getActiveSocietaCatalog();
  const teams = catalog.slice(0, 100).map((team) => ({ id: team.id, name: team.nome, slug: team.slug, logo: team.logo_path ?? "/logos/logo.png" }));
  return <CoppaFantaPrototype teams={teams} demo={isGlobalFakeDataEnabled()} seed={getDemoSeed()} />;
}
