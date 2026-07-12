import { getRankingRows } from "@/lib/rankingRows";
import RankingClient from "./RankingClient";

export default function RankingPage() {
  const rows = getRankingRows();

  return <RankingClient rows={rows} />;
}
