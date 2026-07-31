import { GAME_ASSETS } from "./assets";
import type { PowerUpKind, RafficaType } from "./types";

export type LoadingGuide = {
  image: string;
  title: string;
  text: string;
};

export const POWER_UP_COPY: Record<PowerUpKind, {
  title: string;
  description: string;
}> = {
  "nico-paz": {
    title: "NICO PAZ",
    description: "Attira automaticamente tutti i bonus.",
  },
  lukaku: {
    title: "LUKAKU",
    description: "Diventa gigante e sfonda le barriere.",
  },
  dybala: {
    title: "DYBALA",
    description: "La tua velocità diminuisce.",
  },
  luperto: {
    title: "LUPERTO",
    description: "Sei immune ai malus.",
  },
  gimenez: {
    title: "GIMENEZ",
    description: "I bonus si allontanano da te.",
  },
};

export const SPECIAL_EVENT_COPY: {
  boss: { title: string; description: string };
  raffica: Record<RafficaType, { title: string; description: string }>;
} = {
  boss: {
    title: "BOSS",
    description: "Schiva i malus e resta sopra il 62.",
  },
  raffica: {
    malus: {
      title: "RAFFICA DI MALUS",
      description: "Sopravvivi a 15 secondi di malus.",
    },
    bonus: {
      title: "RAFFICA DI BONUS",
      description: "Approfitta di 10 secondi pieni di bonus.",
    },
  },
};

export const LOADING_GUIDES: readonly LoadingGuide[] = [
  { image: GAME_ASSETS.bonus.goal, title: "GOL FATTO", text: "Raccoglilo per ottenere +3." },
  { image: GAME_ASSETS.bonus.cleanSheet, title: "CLEAN SHEET", text: "Raccoglilo per ottenere +1." },
  { image: GAME_ASSETS.bonus.assist, title: "ASSIST", text: "Raccoglilo per ottenere +1." },
  { image: GAME_ASSETS.bonus.hatTrick, title: "TRIPLETTA", text: "Raccoglila per ottenere +9." },
  { image: GAME_ASSETS.malus.yellowCard, title: "AMMONIZIONE", text: "Evitala: perdi 0,5 punti." },
  { image: GAME_ASSETS.malus.redCard, title: "ESPULSIONE", text: "Evitala: perdi 1 punto." },
  { image: GAME_ASSETS.malus.concededGoal, title: "GOL SUBITO", text: "Evitalo: perdi 1 punto." },
  { image: GAME_ASSETS.malus.ownGoal, title: "AUTOGOL", text: "Evitalo: perdi 2 punti." },
  { image: GAME_ASSETS.malus.missedPenalty, title: "RIGORE SBAGLIATO", text: "Evitalo: perdi 3 punti." },
  { image: GAME_ASSETS.powerups.nicoPaz, title: POWER_UP_COPY["nico-paz"].title, text: POWER_UP_COPY["nico-paz"].description },
  { image: GAME_ASSETS.powerups.lukaku, title: POWER_UP_COPY.lukaku.title, text: POWER_UP_COPY.lukaku.description },
  { image: GAME_ASSETS.powerups.dybala, title: POWER_UP_COPY.dybala.title, text: POWER_UP_COPY.dybala.description },
  { image: GAME_ASSETS.powerups.luperto, title: POWER_UP_COPY.luperto.title, text: POWER_UP_COPY.luperto.description },
  { image: GAME_ASSETS.powerups.gimenez, title: POWER_UP_COPY.gimenez.title, text: POWER_UP_COPY.gimenez.description },
  { image: GAME_ASSETS.events.boss, title: SPECIAL_EVENT_COPY.boss.title, text: SPECIAL_EVENT_COPY.boss.description },
  { image: GAME_ASSETS.events.malusBurst, title: SPECIAL_EVENT_COPY.raffica.malus.title, text: SPECIAL_EVENT_COPY.raffica.malus.description },
  { image: GAME_ASSETS.events.bonusBurst, title: SPECIAL_EVENT_COPY.raffica.bonus.title, text: SPECIAL_EVENT_COPY.raffica.bonus.description },
] as const;

export const GAMEPLAY_TIPS = [
  "Mantieni sempre il punteggio sopra il 62: sotto quella soglia la partita finisce.",
  "Più metri percorri, più ti avvicini alla promozione.",
  "Nel Livello 1 la promozione arriva a 1250 metri.",
  "Se retrocedi... il VAR potrebbe ancora salvarti.",
  "Una tripletta può ribaltare completamente la partita.",
  "Luperto ti rende immune a tutti i malus.",
  "Nico Paz attira tutti i bonus verso di te.",
  "Lukaku ti permette di abbattere le barriere.",
  "Giménez annulla tutti i bonus: attenzione!",
  "Dybala rallenta la tua corsa.",
  "I power-up non sono sempre tuoi amici.",
  "Ogni metro può fare la differenza.",
  "Promuoversi è difficile, restarci lo è ancora di più.",
  "Non abbassare mai la guardia: basta un attimo per scendere sotto il 62.",
  "Evita le bandierine.",
  "L’arbitro non è mai una buona notizia.",
  "La barella può interrompere la tua corsa.",
  "La scivolata è l’unico ostacolo che viene verso di te.",
  "Alcuni ostacoli sono più facili da evitare se li anticipi.",
  "Ogni bonus raccolto può salvarti la partita.",
  "Un’espulsione può mandare in fumo una partita perfetta.",
  "A volte un ostacolo evitato vale più di un bonus raccolto.",
  "Le raffiche possono essere una miniera di bonus... o una pioggia di malus.",
  "Quando inizia una raffica, resta concentrato: ogni scelta conta.",
  "Le raffiche di bonus sono rare, sfruttale fino all’ultimo pallone.",
  "Le raffiche di malus possono ribaltare una partita in pochi secondi.",
  "Quando compare il Boss, preparati: una raffica di malus sta per travolgerti.",
  "Il Boss non concede tregua: schiva i malus e resisti fino alla fine dell’assalto.",
] as const;

let lastGuideIndex = -1;
let lastTipIndex = -1;

export function pickLoadingGuide() {
  lastGuideIndex = pickDifferentIndex(LOADING_GUIDES.length, lastGuideIndex);
  return LOADING_GUIDES[lastGuideIndex];
}

export function pickGameplayTip() {
  lastTipIndex = pickDifferentIndex(GAMEPLAY_TIPS.length, lastTipIndex);
  return GAMEPLAY_TIPS[lastTipIndex];
}

function pickDifferentIndex(length: number, previousIndex: number) {
  if (length <= 1) return 0;
  if (previousIndex < 0 || previousIndex >= length) {
    return Math.floor(Math.random() * length);
  }
  const candidate = Math.floor(Math.random() * (length - 1));
  return candidate >= previousIndex ? candidate + 1 : candidate;
}
