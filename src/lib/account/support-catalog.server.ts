import "server-only";
import fs from "node:fs";
import path from "node:path";
import { getRisultati, type Risultato } from "@/lib/risultati";
import type { Societa } from "@/lib/societa/types";

function parseCsvLine(line: string) {
  return line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((value) => value.replace(/^"|"$/g, "").trim());
}

let trophyCounts: Map<number, number> | null = null;
let trophyHighlights: Map<number, string[]> | null = null;

function loadTrophyCatalog() {
  if (trophyCounts && trophyHighlights) return;
  const rows = fs.readFileSync(path.join(process.cwd(), "data", "sala_trofei.csv"), "utf8").trim().split(/\r?\n/).slice(1);
  trophyCounts = new Map();
  trophyHighlights = new Map();
  const labels = [[3, "il campionato"], [4, "la Champions League"], [5, "l’Europa League"], [6, "la Conference League"], [7, "la Coppa Fanta a 20"]] as const;
  for (const line of rows) {
    const row = parseCsvLine(line);
    const id = Number(row[0]);
    trophyCounts.set(id, Number(row[2]) || 0);
    trophyHighlights.set(id, labels.filter(([index]) => Number(row[index]) > 0).map(([, label]) => label));
  }
}

export function getSocietaTrophyCounts() {
  loadTrophyCatalog();
  return new Map(trophyCounts);
}

export function deriveSupportTeaser(storia: string | null) {
  if (!storia?.trim()) return "Storia non disponibile.";
  const sentence = storia.trim().match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim() ?? storia.trim();
  if (sentence.length <= 150) return sentence;
  const shortened = sentence.slice(0, 147).replace(/\s+\S*$/, "");
  return `${shortened}…`;
}

function ordinal(value: number) {
  return `${value}°`;
}

function notableCupResult(results: Risultato[]) {
  const priorities = ["Vincitore", "Finale", "Semifinale"];
  return results
    .filter((result) => result.competizione !== "Campionato")
    .map((result) => ({ result, priority: priorities.findIndex((label) => result.risultatoTesto.includes(label)) }))
    .filter((item) => item.priority >= 0)
    .sort((a, b) => a.priority - b.priority || b.result.stagioneId - a.result.stagioneId)[0]?.result ?? null;
}

function joinHighlights(items: string[]) {
  if (items.length < 2) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} e ${items.at(-1)}`;
}

function newEntryNarrative(team: Societa) {
  const variants = [
    `Al debutto nella stagione ${team.stagioneIngresso}, parte da una pagina completamente bianca: il primo capitolo della sua storia nel Fanta a 20 deve ancora essere scritto.`,
    `La stagione ${team.stagioneIngresso} segna l’inizio di un percorso tutto nuovo nel Fanta a 20, con una storia ancora interamente da costruire.`,
    `All’esordio nel ${team.stagioneIngresso}, apre un capitolo inedito: ogni traguardo della sua avventura nel Fanta a 20 è ancora davanti a sé.`,
  ];
  return variants[team.id % variants.length];
}

export function getSupportTeamTeasers(teams: Societa[], counts = getSocietaTrophyCounts(), stories = new Map<number, string>()) {
  loadTrophyCatalog();
  const results = getRisultati();
  return new Map(teams.map((team) => {
    if (team.badgeNewEntry) return [team.id, newEntryNarrative(team)];

    const teamResults = results.filter((result) => result.squadraId === team.id);
    const leaguePlacements = teamResults
      .filter((result) => result.competizione === "Campionato" && /^\d+$/.test(result.risultatoTesto))
      .map((result) => ({ ...result, position: Number(result.risultatoTesto) }))
      .sort((a, b) => a.position - b.position || b.stagioneId - a.stagioneId);
    const bestLeague = leaguePlacements[0] ?? null;
    const notableCup = notableCupResult(teamResults);
    const trophies = counts.get(team.id) ?? 0;
    const highlights = trophyHighlights?.get(team.id) ?? [];
    const sourceStory = stories.get(team.id)?.toLocaleLowerCase("it-IT") ?? "";
    const parts: string[] = [];

    if (trophies > 0) {
      const victories = joinHighlights(highlights.slice(0, 3));
      parts.push(`Presente dal ${team.stagioneIngresso}, ha già costruito una bacheca da ${trophies} ${trophies === 1 ? "trofeo" : "trofei"}${victories ? `, conquistando ${victories}` : ""}.`);
    } else if (bestLeague && bestLeague.position <= 5) {
      parts.push(`Nel Fanta a 20 dal ${team.stagioneIngresso}, ha saputo spingersi fino al ${ordinal(bestLeague.position)} posto in campionato, restando in corsa per il primo trofeo della propria storia.`);
    } else if (notableCup) {
      parts.push(`Presente dal ${team.stagioneIngresso}, ha trovato nelle coppe il passaggio più significativo del proprio percorso, arrivando ${notableCup.risultatoTesto.toLocaleLowerCase("it-IT")} in ${notableCup.competizione}.`);
    } else if (sourceStory.includes("promozion")) {
      parts.push(`Entrata nel Fanta a 20 nel ${team.stagioneIngresso}, ha già attraversato il passaggio importante di una promozione e continua a costruire il proprio percorso.`);
    } else if (sourceStory.includes("cresc") || sourceStory.includes("risalit") || sourceStory.includes("continuit")) {
      parts.push(`Presente dal ${team.stagioneIngresso}, sta costruendo il proprio cammino attraverso crescita e continuità, con i traguardi più importanti ancora da inseguire.`);
    } else {
      parts.push(`Entrata nel Fanta a 20 nel ${team.stagioneIngresso}, è ancora alla ricerca del primo grande risultato di un percorso che resta tutto da costruire.`);
    }

    if (trophies > 0 && bestLeague && bestLeague.position <= 3) parts.push(`In campionato ha raggiunto anche il ${ordinal(bestLeague.position)} posto nella stagione ${bestLeague.stagione}.`);
    if (trophies > 0 && notableCup && notableCup.risultatoTesto !== "Vincitore" && parts.length < 2) parts.push(`Tra i percorsi di coppa spicca la ${notableCup.risultatoTesto.toLocaleLowerCase("it-IT")} raggiunta in ${notableCup.competizione}.`);

    return [team.id, parts.join(" ")];
  }));
}
