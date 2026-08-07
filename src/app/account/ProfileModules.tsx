import type { AccountHubModules } from "@/lib/account/hub";
import { visibleAccountModuleKeys } from "@/lib/account/hub";

export default function ProfileModules({ modules }: { modules: AccountHubModules }) {
  const keys = visibleAccountModuleKeys(modules);
  if (!keys.length) return null;
  return <section className="mt-6 grid gap-4 md:grid-cols-2" aria-label="Attività account">{keys.map((key) => {
    if (key === "fantabet" && modules.fantabet) return <article key={key} className="rounded-[1.5rem] border border-slate-200 bg-white p-5"><p className="section-eyebrow">FantaBet</p><h2 className="mt-2 text-xl font-black text-blue-950">{modules.fantabet.points} punti</h2><p className="mt-2 text-sm font-semibold text-slate-500">Posizione #{modules.fantabet.globalPosition} · {modules.fantabet.correctPredictions} pronostici · {modules.fantabet.perfectSlips} schedine perfette</p></article>;
    if (key === "arcade" && modules.arcade) return <article key={key} className="rounded-[1.5rem] border border-slate-200 bg-white p-5"><p className="section-eyebrow">Arcade</p><h2 className="mt-2 text-xl font-black text-blue-950">Record {modules.arcade.personalRecord} m</h2><p className="mt-2 text-sm font-semibold text-slate-500">Livello {modules.arcade.maximumLevel}{modules.arcade.leaderboardPosition ? ` · Posizione #${modules.arcade.leaderboardPosition}` : ""}</p></article>;
    if (key === "emblems" && modules.emblems) return <article key={key} className="rounded-[1.5rem] border border-slate-200 bg-white p-5"><p className="section-eyebrow">Emblemi</p><h2 className="mt-2 text-xl font-black text-blue-950">{modules.emblems.unlocked} sbloccati</h2></article>;
    return null;
  })}</section>;
}
