import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";
import { loadFantaBetPageData } from "@/lib/fantabet/server";
import FantaBetClient from "./FantaBetClient";
import { createFantaBetDemoData } from "@/lib/fantabet/demo";
import { isDemoMode } from "@/lib/fantabet/ui";
import { isGlobalFakeDataEnabled } from "@/lib/demo-data/config";
import type { FantaBetPageData } from "@/lib/fantabet/server";

export const metadata: Metadata = createPageMetadata({ title: "FantaBet", description: "Pronostica le cinque giocate ufficiali e scala la classifica FantaBet.", path: "/fantabet" });
export const dynamic = "force-dynamic";

export default async function FantaBetPage({ searchParams }: { searchParams: Promise<{ demo?: string; round?: string }> }) {
  const params = await searchParams;
  const requestedRound = Number(params.round);
  const globalDemo = isGlobalFakeDataEnabled();
  const empty: FantaBetPageData = { serverNow: new Date().toISOString(), viewerId: null, round: null, bets: [], predictions: [], submission: null, leaderboard: [], roundLeaderboard: [], availableRounds: [] };
  const data = globalDemo ? empty : await loadFantaBetPageData(Number.isInteger(requestedRound) && requestedRound > 0 ? requestedRound : undefined);
  const demo = globalDemo || isDemoMode(process.env.NODE_ENV, params.demo);
  const initial = demo ? createFantaBetDemoData(data, requestedRound) : data;
  return <FantaBetClient key={initial.round?.id ?? "fantabet-empty"} initial={initial} demo={demo} demoAvailable={process.env.NODE_ENV !== "production"} />;
}
